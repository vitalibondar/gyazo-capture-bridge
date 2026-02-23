#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMPLATE_FILE="$SCRIPT_DIR/com.vb.gyazo-capture-bridge.plist.template"
TARGET_PLIST="$HOME/Library/LaunchAgents/com.vb.gyazo-capture-bridge.plist"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
  echo "Template not found: $TEMPLATE_FILE"
  exit 1
fi

watch_path="${1:-$HOME/Pictures/Captures}"
script_path="$SCRIPT_DIR/auto_dispatch.sh"

mkdir -p "$(dirname "$TARGET_PLIST")"

escape_sed_replacement() {
  printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

escaped_script_path="$(escape_sed_replacement "$script_path")"
escaped_watch_path="$(escape_sed_replacement "$watch_path")"

sed \
  -e "s|__SCRIPT_PATH__|$escaped_script_path|g" \
  -e "s|__WATCH_PATH__|$escaped_watch_path|g" \
  "$TEMPLATE_FILE" > "$TARGET_PLIST"

launch_domain="gui/$(id -u)"
launchctl bootout "$launch_domain" "$TARGET_PLIST" >/dev/null 2>&1 || true
launchctl bootstrap "$launch_domain" "$TARGET_PLIST"
launchctl enable "$launch_domain/com.vb.gyazo-capture-bridge" >/dev/null 2>&1 || true

echo "Installed launch agent: $TARGET_PLIST"
echo "Watching folder: $watch_path"
