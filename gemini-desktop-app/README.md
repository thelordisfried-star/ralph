# Gemini Desktop

A cross-platform desktop application for Google Gemini AI — bringing the power of Gemini directly to your desktop with features inspired by the Claude Chrome extension.

## Features

- **Chat with Gemini** — Full conversational AI with streaming responses
- **Multiple Models** — Switch between Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash, 1.5 Pro, and more
- **Screenshot Analysis** — Capture your screen and ask Gemini to analyze it
- **Image Understanding** — Upload images or paste from clipboard for multimodal analysis
- **Clipboard Integration** — Quickly paste text or images from your clipboard
- **System Prompts** — Customize Gemini's behavior with preset or custom system prompts
- **Conversation History** — All chats are saved locally and persist across sessions
- **Global Shortcut** — Toggle the window from anywhere with `Ctrl+Shift+G` (configurable)
- **System Tray** — Runs in the background, accessible from your system tray
- **Dark/Light Themes** — Choose your preferred visual style
- **Always-on-Top** — Pin the window above other applications
- **Drag & Drop** — Drop images directly into the chat
- **Frameless Window** — Clean, modern UI with custom title bar

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

## Setup

```bash
# Navigate to the app directory
cd gemini-desktop-app

# Install dependencies
npm install

# Run the app
npm start
```

On first launch, you'll be prompted to enter your Gemini API key in Settings.

## Getting Your API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API Key" in the sidebar
4. Create a new API key or use an existing one
5. Paste the key into Gemini Desktop's Settings panel

## Building for Distribution

```bash
# Build for your current platform
npm run build

# Build for specific platforms
npm run build:win     # Windows (.exe installer + portable)
npm run build:mac     # macOS (.dmg + .zip)
npm run build:linux   # Linux (.AppImage + .deb)
```

Built packages will appear in the `dist/` directory.

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+G` | Toggle window (global, configurable) |
| `Enter` | Send message |
| `Shift+Enter` | New line in message |

## Configuration

All settings are stored in your user data directory:

- **Windows:** `%APPDATA%/gemini-desktop/`
- **macOS:** `~/Library/Application Support/gemini-desktop/`
- **Linux:** `~/.config/gemini-desktop/`

Settings include:
- API key (stored locally, never transmitted except to Google's API)
- Preferred model
- Theme preference
- Global shortcut binding
- Window behavior (always-on-top, start minimized)

## Architecture

```
gemini-desktop-app/
├── main.js          # Electron main process (window, tray, IPC, Gemini SDK)
├── preload.js       # Secure bridge between main and renderer
├── index.html       # UI markup and styles
├── renderer.js      # Frontend logic (chat, settings, conversations)
├── package.json     # Dependencies and build config
└── assets/
    └── icon.svg     # App icon
```

- **main.js** — Manages the Electron window, system tray, global shortcuts, and communicates with the Gemini API via `@google/generative-ai` SDK
- **preload.js** — Exposes a secure API (`window.geminiAPI`) to the renderer using `contextBridge`
- **renderer.js** — Handles all UI interactions, message rendering, streaming display, and conversation management
- **index.html** — Single-file UI with embedded CSS, dark/light theme support

## Security

- Context isolation is enabled — the renderer has no direct access to Node.js APIs
- API keys are stored locally on your machine and only sent to Google's Gemini API endpoints
- No telemetry or data collection

## License

MIT
