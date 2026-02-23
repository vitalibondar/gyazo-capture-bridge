#!/usr/bin/env bash
set -euo pipefail

TARGET_PLIST="$HOME/Library/LaunchAgents/com.vb.gyazo-capture-bridge.plist"
launch_domain="gui/$(id -u)"

if [[ -f "$TARGET_PLIST" ]]; then
  launchctl bootout "$launch_domain" "$TARGET_PLIST" >/dev/null 2>&1 || true
  rm -f "$TARGET_PLIST"
  echo "Removed launch agent: $TARGET_PLIST"
else
  echo "Launch agent is not installed."
fi
