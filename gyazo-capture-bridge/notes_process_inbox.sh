#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="${CONFIG_FILE:-$SCRIPT_DIR/config.env}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing config: $CONFIG_FILE"
  exit 1
fi

# shellcheck disable=SC1090
# Export all config variables for child process (node notes_pipeline.js).
set -a
source "$CONFIG_FILE"
set +a

export CONFIG_FILE
"$SCRIPT_DIR/notes_pipeline.js"
