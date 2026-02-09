# Ralph Agent Instructions

## Overview

Ralph is an autonomous AI agent loop that runs Amp repeatedly until all PRD items are complete. Each iteration is a fresh Amp instance with clean context.

## Commands

```bash
# Run the flowchart dev server
cd flowchart && npm run dev

# Build the flowchart
cd flowchart && npm run build

# Run Ralph (from your project that has prd.json)
./ralph.sh [max_iterations]
```

## Key Files

- `ralph.sh` - The bash loop that spawns fresh Amp instances
- `prompt.md` - Instructions given to each Amp instance
- `prd.json.example` - Example PRD format
- `flowchart/` - Interactive React Flow diagram explaining how Ralph works

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

To run locally:
```bash
cd flowchart
npm install
npm run dev
```

## Patterns

- Each iteration spawns a fresh Amp instance with clean context
- Memory persists via git history, `progress.txt`, and `prd.json`
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns for future iterations

## Chrome Integration

- `--chrome [url]` flag on `ralph.sh` launches Chrome with remote debugging via CDP
- `chrome.sh` manages Chrome lifecycle: `launch`, `stop`, `navigate`, `screenshot`, `status`, `info`
- When Chrome is active, `RALPH_CHROME=true` and `RALPH_CHROME_PORT` are set as environment variables
- Chrome is automatically cleaned up when Ralph exits (via bash trap)
- The `skills/dev-browser/` skill documents how to use Chrome for browser verification
- Screenshots can be taken via `./chrome.sh screenshot <file.png>` and referenced in progress logs
- CDP endpoint at `http://localhost:${RALPH_CHROME_PORT:-9222}` supports direct DevTools Protocol access
