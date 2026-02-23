#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/config.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing config: $CONFIG_FILE"
  echo "Create it from: $SCRIPT_DIR/config.env.example"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

GYAZO_ACCESS_TOKEN="${UPLOAD_GYAZO_ACCESS_TOKEN:-${GYAZO_ACCESS_TOKEN:-}}"
CAPTURE_DIR="${UPLOAD_CAPTURE_DIR:-${CAPTURE_DIR:-$HOME/Pictures/Captures}}"
LINK_TYPE="${UPLOAD_LINK_TYPE:-${LINK_TYPE:-page}}"
COPY_TO_CLIPBOARD="${UPLOAD_COPY_TO_CLIPBOARD:-${COPY_TO_CLIPBOARD:-true}}"
OPEN_IN_BROWSER="${UPLOAD_OPEN_IN_BROWSER:-${OPEN_IN_BROWSER:-false}}"
DELETE_AFTER_UPLOAD="${UPLOAD_DELETE_AFTER_UPLOAD:-${DELETE_AFTER_UPLOAD:-false}}"
LOG_FILE="${UPLOAD_LOG_FILE:-${LOG_FILE:-$CAPTURE_DIR/gyazo-upload.log}}"
INCLUDE_FRONTMOST_APP="${UPLOAD_INCLUDE_FRONTMOST_APP:-${INCLUDE_FRONTMOST_APP:-true}}"
GYAZO_ACCESS_POLICY="${UPLOAD_GYAZO_ACCESS_POLICY:-${GYAZO_ACCESS_POLICY:-only_me}}"
GYAZO_METADATA_IS_PUBLIC="${UPLOAD_GYAZO_METADATA_IS_PUBLIC:-${GYAZO_METADATA_IS_PUBLIC:-false}}"
GYAZO_COLLECTION_ID="${UPLOAD_GYAZO_COLLECTION_ID:-${GYAZO_COLLECTION_ID:-}}"
GYAZO_SEND_APP_METADATA="${UPLOAD_GYAZO_SEND_APP_METADATA:-${GYAZO_SEND_APP_METADATA:-true}}"
GYAZO_SEND_TITLE_METADATA="${UPLOAD_GYAZO_SEND_TITLE_METADATA:-${GYAZO_SEND_TITLE_METADATA:-true}}"
GYAZO_SEND_DESC_METADATA="${UPLOAD_GYAZO_SEND_DESC_METADATA:-${GYAZO_SEND_DESC_METADATA:-true}}"
GYAZO_SEND_CREATED_AT="${UPLOAD_GYAZO_SEND_CREATED_AT:-${GYAZO_SEND_CREATED_AT:-true}}"
GYAZO_TITLE_BROWSER_MODE="${UPLOAD_GYAZO_TITLE_BROWSER_MODE:-${GYAZO_TITLE_BROWSER_MODE:-tab}}"
GYAZO_DESC_TAG="${UPLOAD_GYAZO_DESC_TAG:-${GYAZO_DESC_TAG:-#capture}}"
GYAZO_CONTEXT_NOTE="${UPLOAD_GYAZO_CONTEXT_NOTE:-${GYAZO_CONTEXT_NOTE:-}}"
GYAZO_DESC_TAG_APP="${UPLOAD_GYAZO_DESC_TAG_APP:-${GYAZO_DESC_TAG_APP:-true}}"
GYAZO_DESC_TAG_WINDOW="${UPLOAD_GYAZO_DESC_TAG_WINDOW:-${GYAZO_DESC_TAG_WINDOW:-false}}"
GYAZO_DESC_TAG_URL="${UPLOAD_GYAZO_DESC_TAG_URL:-${GYAZO_DESC_TAG_URL:-false}}"
GYAZO_DESC_STYLE="${UPLOAD_GYAZO_DESC_STYLE:-${GYAZO_DESC_STYLE:-compact}}"
INCLUDE_APP_IN_DESC="${UPLOAD_INCLUDE_APP_IN_DESC:-${INCLUDE_APP_IN_DESC:-true}}"
CURL_CONNECT_TIMEOUT_SEC="${UPLOAD_CURL_CONNECT_TIMEOUT_SEC:-${CURL_CONNECT_TIMEOUT_SEC:-10}}"
CURL_MAX_TIME_SEC="${UPLOAD_CURL_MAX_TIME_SEC:-${CURL_MAX_TIME_SEC:-60}}"

to_lower() {
  printf '%s' "${1:-}" | tr '[:upper:]' '[:lower:]'
}

is_true() {
  case "$(to_lower "${1:-}")" in
    1|true|yes|on) return 0 ;;
    *) return 1 ;;
  esac
}

to_hashtag() {
  local raw="${1:-}"
  raw="$(printf '%s' "$raw" | tr '[:space:]-./:' '_')"
  raw="$(printf '%s' "$raw" | sed -E 's/[^[:alnum:]_]+/_/g; s/_+/_/g; s/^_+//; s/_+$//')"
  if [[ -z "$raw" ]]; then
    raw="Tag"
  fi
  printf '#%s' "$raw"
}

url_to_tag_source() {
  local raw_url="${1:-}"
  local host=""
  host="$(printf '%s' "$raw_url" | sed -E 's#^[a-zA-Z]+://([^/]+).*$#\1#')"
  host="${host#www.}"
  if [[ -n "$host" && "$host" != "$raw_url" ]]; then
    printf '%s' "$host"
    return
  fi
  printf '%s' "$raw_url"
}

timestamp() {
  date "+%Y-%m-%d %H:%M:%S%z"
}

log_line() {
  local line="$1"
  mkdir -p "$(dirname "$LOG_FILE")"
  printf '%s\t%s\n' "$(timestamp)" "$line" >> "$LOG_FILE"
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

if [[ -z "$GYAZO_ACCESS_TOKEN" || "$GYAZO_ACCESS_TOKEN" == "PASTE_GYAZO_ACCESS_TOKEN_HERE" ]]; then
  echo "Set GYAZO_ACCESS_TOKEN in $CONFIG_FILE"
  exit 1
fi

target="${1:-latest}"
if [[ "$target" == "latest" ]]; then
  file_path="$(find_latest_file)"
else
  file_path="$target"
fi

if [[ -z "${file_path:-}" || ! -f "$file_path" ]]; then
  echo "Capture file not found: ${file_path:-<empty>}"
  exit 1
fi

frontmost_app="unknown"
front_window_title=""
browser_url=""
browser_tab_title=""
frontmost_app_override="${FRONTMOST_APP_OVERRIDE:-}"
front_window_title_override="${FRONT_WINDOW_TITLE_OVERRIDE:-}"
browser_url_override="${BROWSER_URL_OVERRIDE:-}"
browser_tab_title_override="${BROWSER_TAB_TITLE_OVERRIDE:-}"

if [[ -n "$frontmost_app_override" || -n "$front_window_title_override" || -n "$browser_url_override" || -n "$browser_tab_title_override" ]]; then
  frontmost_app="${frontmost_app_override:-unknown}"
  front_window_title="${front_window_title_override:-}"
  browser_url="${browser_url_override:-}"
  browser_tab_title="${browser_tab_title_override:-}"
elif is_true "$INCLUDE_FRONTMOST_APP"; then
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
    frontmost_app="${front_info%%$'\t'*}"
    front_window_title="${front_info#*$'\t'}"
    if [[ "$front_window_title" == "$front_info" ]]; then
      front_window_title=""
    fi
  fi
  case "$frontmost_app" in
    "Safari")
      browser_url="$(osascript -e 'tell application "Safari" to get URL of front document' 2>/dev/null || true)"
      browser_tab_title="$(osascript -e 'tell application "Safari" to get name of front document' 2>/dev/null || true)"
      ;;
    "Google Chrome"|"Brave Browser"|"Microsoft Edge"|"Arc")
      browser_url="$(osascript -e "tell application \"$frontmost_app\" to get URL of active tab of front window" 2>/dev/null || true)"
      browser_tab_title="$(osascript -e "tell application \"$frontmost_app\" to get title of active tab of front window" 2>/dev/null || true)"
      ;;
    "Firefox")
      browser_url="$(osascript -e 'tell application "Firefox" to get URL of active tab of front window' 2>/dev/null || true)"
      browser_tab_title="$(osascript -e 'tell application "Firefox" to get title of active tab of front window' 2>/dev/null || true)"
      ;;
  esac
fi

file_mtime_unix="$(stat -f '%m' "$file_path" 2>/dev/null || date +%s)"
title_value="$frontmost_app"
if [[ -n "$front_window_title" ]]; then
  title_value="$front_window_title"
fi
if [[ -n "$browser_tab_title" ]]; then
  title_value="$browser_tab_title"
fi
if [[ -n "$browser_url" && "$(to_lower "$GYAZO_TITLE_BROWSER_MODE")" == "url" ]]; then
  title_value="$browser_url"
fi

desc_value=""
desc_style="$(to_lower "$GYAZO_DESC_STYLE")"

append_desc_line() {
  local line="${1:-}"
  if [[ -z "$line" ]]; then
    return
  fi
  if [[ -z "$desc_value" ]]; then
    desc_value="$line"
  else
    desc_value="$desc_value
$line"
  fi
}

app_desc_value="$frontmost_app"
if is_true "$GYAZO_DESC_TAG_APP"; then
  app_desc_value="$(to_hashtag "$frontmost_app")"
fi

window_desc_value="$front_window_title"
if is_true "$GYAZO_DESC_TAG_WINDOW" && [[ -n "$window_desc_value" ]]; then
  window_desc_value="$(to_hashtag "$window_desc_value")"
fi

url_desc_value="$browser_url"
if is_true "$GYAZO_DESC_TAG_URL" && [[ -n "$url_desc_value" ]]; then
  url_desc_value="$(to_hashtag "$(url_to_tag_source "$url_desc_value")")"
fi

if is_true "$INCLUDE_APP_IN_DESC"; then
  if [[ "$desc_style" == "labeled" ]]; then
    append_desc_line "App: $app_desc_value"
  else
    append_desc_line "$app_desc_value"
  fi
fi

if [[ -n "$front_window_title" && "$front_window_title" != "$frontmost_app" ]]; then
  if [[ "$desc_style" == "labeled" ]]; then
    append_desc_line "Window: $window_desc_value"
  else
    append_desc_line "$window_desc_value"
  fi
fi
if [[ -n "$browser_url" ]]; then
  if [[ "$desc_style" == "labeled" ]]; then
    append_desc_line "URL: $url_desc_value"
  else
    append_desc_line "$url_desc_value"
  fi
fi
if [[ -n "$GYAZO_CONTEXT_NOTE" ]]; then
  if [[ "$desc_style" == "labeled" ]]; then
    append_desc_line "Context: $GYAZO_CONTEXT_NOTE"
  else
    append_desc_line "$GYAZO_CONTEXT_NOTE"
  fi
fi
if [[ -n "$GYAZO_DESC_TAG" ]]; then
  append_desc_line "$GYAZO_DESC_TAG"
fi

curl_args=(
  -sS
  --connect-timeout "$CURL_CONNECT_TIMEOUT_SEC"
  --max-time "$CURL_MAX_TIME_SEC"
  -X POST
  "https://upload.gyazo.com/api/upload"
  -H "Authorization: Bearer $GYAZO_ACCESS_TOKEN"
  -F "imagedata=@$file_path"
  -F "access_policy=$GYAZO_ACCESS_POLICY"
  -F "metadata_is_public=$GYAZO_METADATA_IS_PUBLIC"
)

if [[ -n "$GYAZO_COLLECTION_ID" ]]; then
  curl_args+=( -F "collection_id=$GYAZO_COLLECTION_ID" )
fi

if is_true "$GYAZO_SEND_APP_METADATA"; then
  curl_args+=( -F "app=$frontmost_app" )
fi

if is_true "$GYAZO_SEND_TITLE_METADATA"; then
  curl_args+=( -F "title=$title_value" )
fi

if is_true "$GYAZO_SEND_DESC_METADATA"; then
  curl_args+=( -F "desc=$desc_value" )
fi

if is_true "$GYAZO_SEND_CREATED_AT"; then
  curl_args+=( -F "created_at=$file_mtime_unix" )
fi

curl_output="$(curl "${curl_args[@]}" -w $'\n%{http_code}')"

http_code="${curl_output##*$'\n'}"
response="${curl_output%$'\n'*}"

json_file="$(mktemp)"
trap 'rm -f "$json_file"' EXIT
printf '%s' "$response" > "$json_file"

if [[ "$http_code" != "200" ]]; then
  error_msg="$(plutil -extract error raw -o - "$json_file" 2>/dev/null || printf 'upload_failed')"
  log_line "ERROR\tstatus=$http_code\tfile=$file_path\terror=$error_msg\tapp=$frontmost_app"
  echo "Gyazo upload failed (HTTP $http_code): $error_msg"
  exit 1
fi

page_url="$(plutil -extract permalink_url raw -o - "$json_file" 2>/dev/null || true)"
image_url="$(plutil -extract url raw -o - "$json_file" 2>/dev/null || true)"
thumb_url="$(plutil -extract thumb_url raw -o - "$json_file" 2>/dev/null || true)"
image_id="$(plutil -extract image_id raw -o - "$json_file" 2>/dev/null || true)"

selected_url=""
case "$(to_lower "$LINK_TYPE")" in
  image) selected_url="${image_url:-$thumb_url}" ;;
  *) selected_url="${page_url:-$image_url}" ;;
esac

if [[ -z "$selected_url" ]]; then
  log_line "ERROR\tstatus=200\tfile=$file_path\terror=missing_url\tapp=$frontmost_app"
  echo "Upload returned no URL."
  exit 1
fi

if is_true "$COPY_TO_CLIPBOARD"; then
  if ! printf '%s' "$selected_url" | pbcopy; then
    log_line "WARN\tclipboard_copy_failed\tfile=$file_path\tapp=$frontmost_app"
  fi
fi

if is_true "$OPEN_IN_BROWSER"; then
  open "$selected_url" >/dev/null 2>&1 || true
fi

log_line "OK\tfile=$file_path\tlink=$selected_url\tpage=${page_url:-na}\timage=${image_url:-na}\tid=${image_id:-na}\tapp=$frontmost_app\tpolicy=$GYAZO_ACCESS_POLICY\tmeta_public=$GYAZO_METADATA_IS_PUBLIC"

if is_true "$DELETE_AFTER_UPLOAD"; then
  rm -f "$file_path"
fi

printf '%s\n' "$selected_url"
