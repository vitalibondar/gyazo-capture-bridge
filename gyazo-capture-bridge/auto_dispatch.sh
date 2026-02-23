#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/config.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  exit 0
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

CAPTURE_DIR="${CAPTURE_DIR:-$HOME/Pictures/Captures}"
ENABLE_AUTO_UPLOAD="${ENABLE_AUTO_UPLOAD:-true}"
AUTO_UPLOAD_DELAY_SEC="${AUTO_UPLOAD_DELAY_SEC:-1}"
AUTO_STATE_FILE="${AUTO_STATE_FILE:-$HOME/Library/Application Support/gyazo-capture-bridge/auto.state}"

to_lower() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

is_true() {
  case "$(to_lower "${1:-}")" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

capture_front_context() {
  local app_name="unknown"
  local win_name=""
  local browser_url=""
  local browser_tab_title=""
  local front_info=""
  local sep=$'\034'

  front_info="$(
    osascript <<'APPINFO' 2>/dev/null || true
tell application "System Events"
  set p to first application process whose frontmost is true
  set app_name to name of p
  set win_name to ""
  try
    set win_name to name of front window of p
  end try
  return app_name & tab & win_name
end tell
APPINFO
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
      browser_url="$(osascript -e 'tell application "Safari" to get URL of front document' 2>/dev/null || true)"
      browser_tab_title="$(osascript -e 'tell application "Safari" to get name of front document' 2>/dev/null || true)"
      ;;
    "Google Chrome"|"Brave Browser"|"Microsoft Edge"|"Arc")
      browser_url="$(osascript -e "tell application \"$app_name\" to get URL of active tab of front window" 2>/dev/null || true)"
      browser_tab_title="$(osascript -e "tell application \"$app_name\" to get title of active tab of front window" 2>/dev/null || true)"
      ;;
    "Firefox")
      browser_url="$(osascript -e 'tell application "Firefox" to get URL of active tab of front window' 2>/dev/null || true)"
      browser_tab_title="$(osascript -e 'tell application "Firefox" to get title of active tab of front window' 2>/dev/null || true)"
      ;;
  esac

  printf '%s%s%s%s%s%s%s\n' "$app_name" "$sep" "$win_name" "$sep" "$browser_url" "$sep" "$browser_tab_title"
}

find_latest_file() {
  local latest=""
  local latest_mtime=0
  local candidate=""
  local mtime=0

  while IFS= read -r -d '' candidate; do
    mtime="$(stat -f '%m' "$candidate" 2>/dev/null || echo 0)"
    if (( mtime > latest_mtime )); then
      latest="$candidate"
      latest_mtime="$mtime"
    fi
  done < <(
    find "$CAPTURE_DIR" -maxdepth 1 -type f \
      \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \) \
      -print0 2>/dev/null
  )

  printf '%s' "$latest"
}

if ! is_true "$ENABLE_AUTO_UPLOAD"; then
  exit 0
fi

latest_file="$(find_latest_file)"
if [[ -z "$latest_file" || ! -f "$latest_file" ]]; then
  exit 0
fi

mkdir -p "$(dirname "$AUTO_STATE_FILE")"
fingerprint="$(stat -f '%m:%z:%N' "$latest_file" 2>/dev/null || printf '')"
last_fingerprint=""
if [[ -f "$AUTO_STATE_FILE" ]]; then
  last_fingerprint="$(cat "$AUTO_STATE_FILE" 2>/dev/null || printf '')"
fi

if [[ -n "$fingerprint" && "$fingerprint" == "$last_fingerprint" ]]; then
  exit 0
fi

context_line="$(capture_front_context)"
IFS=$'\034' read -r captured_app captured_window captured_url captured_tab_title <<< "$context_line"

sleep "$AUTO_UPLOAD_DELAY_SEC"

if FRONTMOST_APP_OVERRIDE="${captured_app:-}" \
  FRONT_WINDOW_TITLE_OVERRIDE="${captured_window:-}" \
  BROWSER_URL_OVERRIDE="${captured_url:-}" \
  BROWSER_TAB_TITLE_OVERRIDE="${captured_tab_title:-}" \
  "$SCRIPT_DIR/upload_gyazo.sh" "$latest_file" >/dev/null; then
  printf '%s\n' "$fingerprint" > "$AUTO_STATE_FILE"
fi
