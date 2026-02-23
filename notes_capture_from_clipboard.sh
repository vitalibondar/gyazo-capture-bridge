#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/config.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing config: $CONFIG_FILE"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

NOTES_INBOX_DIR="${NOTES_INBOX_DIR:-$HOME/Pictures/GyazoNotes/inbox}"
NOTES_PROCESS_AFTER_CAPTURE="${NOTES_PROCESS_AFTER_CAPTURE:-false}"
NOTES_OSASCRIPT_TIMEOUT_SEC="${NOTES_OSASCRIPT_TIMEOUT_SEC:-2}"

input_text=""
input_mode="clipboard"
if [[ "$#" -gt 0 ]]; then
  input_text="$*"
  input_mode="args"
elif [[ ! -t 0 ]]; then
  input_text="$(cat)"
  if [[ -n "${input_text//[$'\t\r\n ']}" ]]; then
    input_mode="stdin"
  else
    input_text="$(pbpaste 2>/dev/null || true)"
    input_mode="clipboard"
  fi
else
  input_text="$(pbpaste 2>/dev/null || true)"
fi

clipboard_text="$(printf '%s' "$input_text" | sed -e 's/\r$//')"
if [[ -z "${clipboard_text//[$'\t\r\n ']}" ]]; then
  echo "No text input found (args/stdin/clipboard)."
  exit 1
fi

to_lower() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

is_true() {
  case "$(to_lower "${1:-}")" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

run_osascript() {
  local timeout_sec="$NOTES_OSASCRIPT_TIMEOUT_SEC"
  /usr/bin/perl -e 'alarm shift; exec @ARGV' "$timeout_sec" "$@" 2>/dev/null || true
}

capture_front_context() {
  local app_name="manual"
  local win_name=""
  local browser_url=""
  local browser_tab_title=""
  local front_info=""
  local sep=$'\034'

  front_info="$(
    run_osascript osascript \
      -e 'tell application "System Events"' \
      -e 'set p to first application process whose frontmost is true' \
      -e 'set app_name to name of p' \
      -e 'set win_name to ""' \
      -e 'try' \
      -e 'set win_name to name of front window of p' \
      -e 'end try' \
      -e 'return app_name & tab & win_name' \
      -e 'end tell'
  )"

  if [[ -n "$front_info" ]]; then
    app_name="${front_info%%$'\t'*}"
    win_name="${front_info#*$'\t'}"
    if [[ "$win_name" == "$front_info" ]]; then
      win_name=""
    fi
  fi

  case "$app_name" in
    "Safari")
      browser_url="$(run_osascript osascript -e 'tell application "Safari" to get URL of front document')"
      browser_tab_title="$(run_osascript osascript -e 'tell application "Safari" to get name of front document')"
      ;;
    "Google Chrome"|"Brave Browser"|"Microsoft Edge"|"Arc")
      browser_url="$(run_osascript osascript -e "tell application \"$app_name\" to get URL of active tab of front window")"
      browser_tab_title="$(run_osascript osascript -e "tell application \"$app_name\" to get title of active tab of front window")"
      ;;
    "Firefox")
      browser_url="$(run_osascript osascript -e 'tell application "Firefox" to get URL of active tab of front window')"
      browser_tab_title="$(run_osascript osascript -e 'tell application "Firefox" to get title of active tab of front window')"
      ;;
  esac

  printf '%s%s%s%s%s%s%s\n' "$app_name" "$sep" "$win_name" "$sep" "$browser_url" "$sep" "$browser_tab_title"
}

mkdir -p "$NOTES_INBOX_DIR"

random_suffix="$(LC_ALL=C hexdump -n 2 -e '/1 "%02x"' /dev/urandom 2>/dev/null || true)"
if [[ -z "$random_suffix" ]]; then
  random_suffix="0000"
fi
note_id="$(date +%Y%m%d-%H%M%S)-$random_suffix"
note_path="$NOTES_INBOX_DIR/$note_id.md"
meta_path="$NOTES_INBOX_DIR/$note_id.meta.json"

printf '%s\n' "$clipboard_text" > "$note_path"

source_app="manual"
source_window=""
source_url=""
source_title=""
if [[ "$input_mode" == "clipboard" ]]; then
  context_line="$(capture_front_context)"
  IFS=$'\034' read -r source_app source_window source_url source_title <<< "$context_line"
fi
captured_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

NOTE_META_PATH="$meta_path" \
NOTE_ID="$note_id" \
CAPTURED_AT="$captured_at" \
SOURCE_APP="${source_app:-manual}" \
SOURCE_WINDOW="${source_window:-}" \
SOURCE_URL="${source_url:-}" \
SOURCE_TITLE="${source_title:-}" \
node <<'NODE'
const fs = require("fs");

const output = process.env.NOTE_META_PATH;
const payload = {
  id: process.env.NOTE_ID,
  captured_at: process.env.CAPTURED_AT,
  source_app: process.env.SOURCE_APP,
  source_window: process.env.SOURCE_WINDOW,
  source_url: process.env.SOURCE_URL,
  source_title: process.env.SOURCE_TITLE,
};
fs.writeFileSync(output, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
NODE

echo "Captured note: $note_path"

if is_true "$NOTES_PROCESS_AFTER_CAPTURE"; then
  "$SCRIPT_DIR/notes_process_inbox.sh"
fi
