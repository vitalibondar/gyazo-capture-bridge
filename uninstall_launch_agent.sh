#!/usr/bin/env bash
set -euo pipefail

launch_domain="gui/$(id -u)"
AGENT_LABEL="com.gyazo-capture-bridge"
LEGACY_AGENT_LABEL="com.vb.gyazo-capture-bridge"
TARGET_PLIST="$HOME/Library/LaunchAgents/$AGENT_LABEL.plist"
LEGACY_TARGET_PLIST="$HOME/Library/LaunchAgents/$LEGACY_AGENT_LABEL.plist"

removed_any="false"

if [[ -f "$TARGET_PLIST" ]]; then
  launchctl bootout "$launch_domain/$AGENT_LABEL" >/dev/null 2>&1 || true
  launchctl bootout "$launch_domain" "$TARGET_PLIST" >/dev/null 2>&1 || true
  rm -f "$TARGET_PLIST"
  echo "Removed launch agent: $TARGET_PLIST"
  removed_any="true"
fi

if [[ -f "$LEGACY_TARGET_PLIST" ]]; then
  launchctl bootout "$launch_domain/$LEGACY_AGENT_LABEL" >/dev/null 2>&1 || true
  launchctl bootout "$launch_domain" "$LEGACY_TARGET_PLIST" >/dev/null 2>&1 || true
  rm -f "$LEGACY_TARGET_PLIST"
  echo "Removed legacy launch agent: $LEGACY_TARGET_PLIST"
  removed_any="true"
fi

if [[ "$removed_any" != "true" ]]; then
  echo "Launch agent is not installed."
fi
