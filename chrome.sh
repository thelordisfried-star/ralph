#!/bin/bash
# Chrome browser management for Ralph
# Handles detection, launching, screenshots, and cleanup

set -e

CHROME_PID_FILE="/tmp/ralph-chrome.pid"
CHROME_DEBUG_PORT="${RALPH_CHROME_PORT:-9222}"
CHROME_USER_DATA="/tmp/ralph-chrome-profile"

# Detect Chrome/Chromium binary
detect_chrome() {
  local candidates=(
    "google-chrome"
    "google-chrome-stable"
    "chromium-browser"
    "chromium"
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/usr/bin/google-chrome"
    "/usr/bin/chromium-browser"
    "/usr/bin/chromium"
    "/snap/bin/chromium"
  )

  for candidate in "${candidates[@]}"; do
    if command -v "$candidate" &>/dev/null || [ -x "$candidate" ]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

# Launch Chrome with remote debugging
launch_chrome() {
  local url="${1:-about:blank}"
  local chrome_bin

  chrome_bin=$(detect_chrome) || {
    echo "Error: Chrome/Chromium not found. Install Chrome or Chromium to use --chrome." >&2
    return 1
  }

  # Kill any existing Ralph Chrome instance
  stop_chrome 2>/dev/null || true

  # Clean up old profile
  rm -rf "$CHROME_USER_DATA"
  mkdir -p "$CHROME_USER_DATA"

  echo "Launching Chrome (debug port: $CHROME_DEBUG_PORT)..."

  "$chrome_bin" \
    --remote-debugging-port="$CHROME_DEBUG_PORT" \
    --user-data-dir="$CHROME_USER_DATA" \
    --no-first-run \
    --no-default-browser-check \
    --disable-background-networking \
    --disable-extensions \
    --disable-sync \
    --disable-translate \
    --metrics-recording-only \
    --no-sandbox \
    "$url" &>/dev/null &

  local pid=$!
  echo "$pid" > "$CHROME_PID_FILE"

  # Wait for Chrome to be ready
  local retries=0
  while [ $retries -lt 30 ]; do
    if curl -s "http://localhost:$CHROME_DEBUG_PORT/json/version" &>/dev/null; then
      echo "Chrome ready (PID: $pid, port: $CHROME_DEBUG_PORT)"
      return 0
    fi
    sleep 0.5
    retries=$((retries + 1))
  done

  echo "Error: Chrome failed to start within 15 seconds" >&2
  stop_chrome 2>/dev/null || true
  return 1
}

# Stop Chrome instance
stop_chrome() {
  if [ -f "$CHROME_PID_FILE" ]; then
    local pid
    pid=$(cat "$CHROME_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      # Wait for graceful shutdown
      local retries=0
      while kill -0 "$pid" 2>/dev/null && [ $retries -lt 10 ]; do
        sleep 0.5
        retries=$((retries + 1))
      done
      # Force kill if still running
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$CHROME_PID_FILE"
  fi

  rm -rf "$CHROME_USER_DATA"
}

# Check if Chrome is running
is_running() {
  if [ -f "$CHROME_PID_FILE" ]; then
    local pid
    pid=$(cat "$CHROME_PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
  fi
  return 1
}

# Navigate to a URL
navigate() {
  local url="$1"
  if [ -z "$url" ]; then
    echo "Usage: chrome.sh navigate <url>" >&2
    return 1
  fi

  # Get the first tab's websocket URL
  local tab_id
  tab_id=$(curl -s "http://localhost:$CHROME_DEBUG_PORT/json" | \
    python3 -c "import sys,json; tabs=json.load(sys.stdin); print(tabs[0]['id'])" 2>/dev/null) || {
    echo "Error: Could not get tab info. Is Chrome running?" >&2
    return 1
  }

  # Navigate via CDP
  curl -s "http://localhost:$CHROME_DEBUG_PORT/json/navigate?url=$url&id=$tab_id" &>/dev/null || {
    # Fallback: open new tab
    curl -s "http://localhost:$CHROME_DEBUG_PORT/json/new?$url" &>/dev/null
  }

  echo "Navigated to: $url"
}

# Take a screenshot (saves as PNG)
screenshot() {
  local output="${1:-screenshot.png}"

  # Use CDP to capture screenshot
  local ws_url
  ws_url=$(curl -s "http://localhost:$CHROME_DEBUG_PORT/json" | \
    python3 -c "import sys,json; tabs=json.load(sys.stdin); print(tabs[0]['webSocketDebuggerUrl'])" 2>/dev/null) || {
    echo "Error: Could not get WebSocket URL. Is Chrome running?" >&2
    return 1
  }

  # Use python to take screenshot via CDP WebSocket
  python3 -c "
import asyncio
import base64
import json
import websockets

async def take_screenshot():
    async with websockets.connect('$ws_url') as ws:
        await ws.send(json.dumps({'id': 1, 'method': 'Page.captureScreenshot', 'params': {'format': 'png'}}))
        response = json.loads(await ws.recv())
        if 'result' in response:
            img_data = base64.b64decode(response['result']['data'])
            with open('$output', 'wb') as f:
                f.write(img_data)
            print('Screenshot saved: $output')
        else:
            print('Error: ' + json.dumps(response), file=__import__('sys').stderr)

asyncio.run(take_screenshot())
" 2>/dev/null || {
    echo "Error: Screenshot failed. Ensure python3 and websockets are available." >&2
    echo "Install with: pip install websockets" >&2
    return 1
  }
}

# Print Chrome DevTools Protocol info
info() {
  if ! is_running; then
    echo "Chrome is not running"
    return 1
  fi

  echo "Chrome DevTools Protocol endpoint: http://localhost:$CHROME_DEBUG_PORT"
  echo ""
  echo "Browser info:"
  curl -s "http://localhost:$CHROME_DEBUG_PORT/json/version" | python3 -m json.tool 2>/dev/null || \
    curl -s "http://localhost:$CHROME_DEBUG_PORT/json/version"
  echo ""
  echo "Open tabs:"
  curl -s "http://localhost:$CHROME_DEBUG_PORT/json" | \
    python3 -c "import sys,json; [print(f'  {t[\"id\"]}: {t.get(\"url\",\"\")}') for t in json.load(sys.stdin)]" 2>/dev/null || \
    curl -s "http://localhost:$CHROME_DEBUG_PORT/json"
}

# Main dispatcher
case "${1:-help}" in
  detect)
    chrome_bin=$(detect_chrome) && echo "$chrome_bin" || {
      echo "Chrome/Chromium not found" >&2
      exit 1
    }
    ;;
  launch)
    launch_chrome "${2:-about:blank}"
    ;;
  stop)
    stop_chrome
    echo "Chrome stopped"
    ;;
  status)
    if is_running; then
      echo "Chrome is running (PID: $(cat "$CHROME_PID_FILE"))"
    else
      echo "Chrome is not running"
    fi
    ;;
  navigate)
    navigate "$2"
    ;;
  screenshot)
    screenshot "$2"
    ;;
  info)
    info
    ;;
  help|*)
    echo "Usage: chrome.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  detect       Detect Chrome/Chromium binary"
    echo "  launch [url] Launch Chrome with remote debugging"
    echo "  stop         Stop Chrome instance"
    echo "  status       Check if Chrome is running"
    echo "  navigate url Navigate to a URL"
    echo "  screenshot   Take a screenshot (PNG)"
    echo "  info         Show Chrome DevTools Protocol info"
    echo ""
    echo "Environment:"
    echo "  RALPH_CHROME_PORT  Debug port (default: 9222)"
    ;;
esac
