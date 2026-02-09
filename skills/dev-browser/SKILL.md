---
name: dev-browser
description: "Browser testing via Chrome DevTools Protocol. Use to verify UI changes, take screenshots, and interact with web pages. Requires Ralph's --chrome flag or a running Chrome instance with remote debugging. Triggers on: verify in browser, check in chrome, browser test, take screenshot, dev-browser."
---

# Dev Browser Skill

Verify UI changes in a real Chrome browser using the Chrome DevTools Protocol (CDP).

---

## Prerequisites

Chrome must be running with remote debugging enabled. Ralph handles this automatically when started with `--chrome`:

```bash
./ralph.sh --chrome http://localhost:3000
```

If running manually, launch Chrome with:

```bash
./chrome.sh launch http://localhost:3000
```

The debug port defaults to `9222` (override with `RALPH_CHROME_PORT` or `--chrome-port`).

---

## How to Verify UI Changes

### 1. Navigate to the page

Use the `chrome.sh` helper:

```bash
./chrome.sh navigate http://localhost:3000/your-page
```

Or use curl with the CDP endpoint directly:

```bash
# List open tabs
curl -s http://localhost:9222/json

# Open a URL in a new tab
curl -s http://localhost:9222/json/new?http://localhost:3000/your-page
```

### 2. Take a screenshot

```bash
./chrome.sh screenshot screenshot.png
```

This captures the current page as a PNG file.

### 3. Inspect the page via CDP

Use the Chrome DevTools Protocol to query the DOM:

```bash
# Get browser info
curl -s http://localhost:9222/json/version

# List all tabs with their URLs
curl -s http://localhost:9222/json
```

For advanced interactions (clicking, typing, waiting for elements), use the CDP WebSocket API with python3:

```python
import asyncio, json, websockets

async def check_element():
    tabs = json.loads(__import__('urllib.request').urlopen('http://localhost:9222/json').read())
    async with websockets.connect(tabs[0]['webSocketDebuggerUrl']) as ws:
        # Evaluate JavaScript in the page
        await ws.send(json.dumps({
            'id': 1,
            'method': 'Runtime.evaluate',
            'params': {'expression': 'document.querySelector(".my-element")?.textContent'}
        }))
        result = json.loads(await ws.recv())
        print(result['result']['result']['value'])

asyncio.run(check_element())
```

---

## Verification Checklist

When verifying a UI story, confirm:

1. **Page loads** - Navigate to the relevant URL, no console errors
2. **Element exists** - The new UI element is present in the DOM
3. **Visual check** - Take a screenshot and verify it looks correct
4. **Interaction works** - If the story involves interaction (click, type), test it via CDP

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RALPH_CHROME` | Set to `true` when Chrome is available | - |
| `RALPH_CHROME_PORT` | CDP debug port | `9222` |

Check if Chrome is available before attempting browser tests:

```bash
if [ "$RALPH_CHROME" = "true" ]; then
  # Browser testing available
  ./chrome.sh navigate http://localhost:3000
  ./chrome.sh screenshot verify.png
fi
```

---

## Troubleshooting

- **"Chrome not found"** - Install Chrome or Chromium
- **"Connection refused on port 9222"** - Chrome isn't running or wrong port. Run `./chrome.sh status`
- **"Screenshot failed"** - Ensure `python3` and `websockets` package are available (`pip install websockets`)
- **Page not loading** - Make sure your dev server is running before navigating to it
