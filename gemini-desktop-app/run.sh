#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       GEMINI DESKTOP — LAUNCHER      ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "  Installing dependencies..."
  npm install
  echo ""
fi

# Run setup if no config exists
HOME_DIR="${HOME:-$USERPROFILE}"
case "$(uname)" in
  Darwin*) CONFIG_DIR="$HOME_DIR/Library/Application Support/gemini-desktop/gemini-desktop" ;;
  MINGW*|MSYS*|CYGWIN*) CONFIG_DIR="$APPDATA/gemini-desktop/gemini-desktop" ;;
  *) CONFIG_DIR="$HOME_DIR/.config/gemini-desktop/gemini-desktop" ;;
esac

if [ ! -f "$CONFIG_DIR/config.json" ]; then
  echo "  First time? Let's set up your API key."
  echo ""
  node setup.js
fi

echo "  Launching Gemini Desktop..."
npx electron .
