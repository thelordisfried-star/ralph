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
- `automate.sh` - Build automation agent (see below)
- `Makefile` - Shortcut targets that call automate.sh

## Flowchart

The `flowchart/` directory contains an interactive visualization built with React Flow. It's designed for presentations - click through to reveal each step with animations.

To run locally:
```bash
cd flowchart
npm install
npm run dev
```

## Build Automation Agent

`automate.sh` is a single entry point for all development automation tasks.

### Quick Start

```bash
./automate.sh help          # See all commands
./automate.sh status        # Check PRD progress + project health
./automate.sh preflight     # Run all checks before a ralph run
./automate.sh ci            # Full CI: install + lint + typecheck + build
```

### Available Commands

| Command | Description |
|---------|-------------|
| `status` | Show PRD progress, branch info, project health |
| `validate` | Validate prd.json format and story structure |
| `lint` | Run shellcheck on .sh files + eslint on flowchart |
| `typecheck` | Run TypeScript type checking |
| `build` | Build flowchart for production |
| `install` | Install project dependencies |
| `preflight` | Run all checks before a ralph run |
| `ci` | Full CI pipeline (install + lint + typecheck + build) |
| `clean` | Remove build artifacts and node_modules |
| `archive` | Archive current prd.json + progress.txt |
| `setup-hooks` | Install git pre-commit hook |

### Makefile Shortcuts

All commands are also available via `make`:

```bash
make status
make preflight
make ci
make ralph       # Run ralph.sh
```

### CI Pipeline

The `.github/workflows/ci.yml` workflow runs on every PR and push to main:
1. shellcheck on all bash scripts
2. eslint on flowchart TypeScript
3. TypeScript type checking
4. Production build

## Patterns

- Each iteration spawns a fresh Amp instance with clean context
- Memory persists via git history, `progress.txt`, and `prd.json`
- Stories should be small enough to complete in one context window
- Always update AGENTS.md with discovered patterns for future iterations
- Run `./automate.sh preflight` before starting a ralph run to catch issues early
- Run `./automate.sh setup-hooks` once to install pre-commit checks
