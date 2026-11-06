#!/bin/sh
# Starts Roll & Hero. Uses Chrome's sandbox when this system supports it,
# otherwise starts without it (the app only shows its own page and your videos).
DIR="$(dirname "$(readlink -f "$0")")"
if [ -u "$DIR/chrome-sandbox" ] && [ "$(stat -c %U "$DIR/chrome-sandbox")" = "root" ]; then
  exec "$DIR/roll-and-hero" "$@"
else
  exec "$DIR/roll-and-hero" --no-sandbox "$@"
fi
