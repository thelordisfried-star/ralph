# CLAUDE.md

## Project Overview

Ralph is an autonomous AI agent loop that runs [Amp CLI](https://ampcode.com) repeatedly until all PRD (Product Requirements Document) items are complete. Each iteration spawns a fresh Amp instance with clean context. Memory persists across iterations via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Repository Structure

```
ralph/
├── ralph.sh                 # Main bash loop - spawns Amp instances iteratively
├── prompt.md                # Instructions piped to each Amp instance
├── prd.json.example         # Reference PRD JSON format
├── AGENTS.md                # Agent instructions for Amp CLI
├── README.md                # Project documentation
├── .gitignore               # Excludes prd.json, progress.txt, .last-branch
│
├── skills/                  # Amp CLI skill modules
│   ├── prd/SKILL.md         # PRD Generator - creates requirements docs
│   └── ralph/SKILL.md       # PRD Converter - markdown PRD to prd.json
│
├── flowchart/               # Interactive React visualization (deployed to GitHub Pages)
│   ├── src/
│   │   ├── App.tsx          # Main component - React Flow diagram with step animations
│   │   ├── App.css          # Windows 95-style retro UI styling
│   │   ├── index.css        # Global desktop theme styles
│   │   └── main.tsx         # Entry point
│   ├── package.json         # npm dependencies (React 19, @xyflow/react, Vite 7)
│   ├── vite.config.ts       # Base path: /ralph/ (GitHub Pages)
│   ├── tsconfig.app.json    # Strict TypeScript config (ES2022)
│   └── eslint.config.js     # ESLint with TypeScript + React hooks rules
│
└── .github/workflows/
    └── deploy.yml           # GitHub Actions: build flowchart + deploy to Pages
```

### Working Files (gitignored, generated at runtime)

- `prd.json` - Active user stories with pass/fail status
- `progress.txt` - Append-only learnings log for cross-iteration memory
- `.last-branch` - Tracks previous branch for archiving
- `archive/` - Snapshots of previous runs

## Tech Stack

### Core Tool (ralph.sh)
- **Language**: Bash
- **Prerequisites**: [Amp CLI](https://ampcode.com), `jq` (JSON parsing), git
- **No build step** - run directly with `./ralph.sh [max_iterations]`

### Flowchart Visualization (flowchart/)
- **Framework**: React 19.2 with TypeScript ~5.9
- **Build Tool**: Vite 7.2
- **Graph Library**: @xyflow/react 12.10 (React Flow)
- **Node Version**: 20 (per CI config)
- **Package Manager**: npm (lock file committed)

## Common Commands

### Flowchart Development
```bash
cd flowchart && npm install    # Install dependencies
cd flowchart && npm run dev    # Start local dev server
cd flowchart && npm run build  # TypeScript check + Vite production build
cd flowchart && npm run lint   # ESLint
cd flowchart && npm run preview # Preview production build locally
```

### Running Ralph (from a target project)
```bash
./ralph.sh           # Run with default 10 iterations
./ralph.sh 20        # Run with 20 iterations
```

### Checking Ralph State
```bash
cat prd.json | jq '.userStories[] | {id, title, passes}'  # Story status
cat progress.txt                                            # Iteration learnings
git log --oneline -10                                       # Recent commits
```

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`):
- **Trigger**: Push to `main` or manual dispatch
- **Steps**: Checkout -> Node 20 setup -> `npm ci` -> `npm run build` -> Deploy to GitHub Pages
- **Live site**: https://snarktank.github.io/ralph/

## Code Conventions

### Flowchart (TypeScript/React)
- **Strict TypeScript** with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **ESLint** with `@eslint/js` recommended + `typescript-eslint` recommended + React hooks + React Refresh rules
- **Target**: ES2022, JSX via `react-jsx`
- **Module system**: ESNext with bundler resolution
- **Styling**: CSS files with Windows 95 retro theme (teal desktop, 3D inset/outset borders, Consolas monospace font)
- **Base path**: Vite configured with `base: '/ralph/'` for GitHub Pages subdirectory hosting

### Ralph Scripts
- `ralph.sh` uses `set -e` (exit on error)
- Commit messages follow: `feat: [Story ID] - [Story Title]`
- Progress entries are append-only (never replace `progress.txt`)
- Branch names follow: `ralph/[feature-name-kebab-case]`

### PRD Format (prd.json)
- User stories use sequential IDs: `US-001`, `US-002`, etc.
- Priority is numeric (1 = highest, determines execution order)
- Every story must include `"Typecheck passes"` in acceptance criteria
- UI stories must also include `"Verify in browser using dev-browser skill"`
- Stories must be small enough for one context window (one iteration)
- Stories ordered by dependency: schema -> backend -> UI -> aggregation views

## Architecture: How Ralph Works

1. User creates a PRD using the `prd` skill, then converts it with the `ralph` skill to `prd.json`
2. `ralph.sh` reads `prd.json` and pipes `prompt.md` to a fresh `amp` instance
3. Each Amp instance: reads PRD -> picks highest priority unfinished story -> implements it -> runs quality checks -> commits -> updates `prd.json` -> appends learnings to `progress.txt`
4. Loop continues until all stories pass or max iterations reached
5. Completion signal: `<promise>COMPLETE</promise>` in Amp output exits the loop
6. Branch archiving happens automatically when `branchName` changes between runs

### Key Design Principles
- **Fresh context per iteration**: Each Amp instance starts clean with no memory of prior code
- **Memory through artifacts**: Git commits, `progress.txt`, `prd.json`, and `AGENTS.md` files bridge iterations
- **Small stories**: Each must complete in one context window; oversized stories produce broken code
- **Feedback loops required**: Typecheck, tests, and linting must catch errors immediately
- **AGENTS.md updates are critical**: Future iterations (and developers) read these for patterns and gotchas

## Key Files to Understand

| File | What It Does |
|------|-------------|
| `ralph.sh` | Bash loop: archives old runs, tracks branches, spawns Amp with `prompt.md`, checks for `<promise>COMPLETE</promise>` |
| `prompt.md` | Full agent instructions: read PRD, pick story, implement, quality check, commit, update status, log progress |
| `skills/prd/SKILL.md` | Skill for generating PRDs: asks clarifying questions, outputs structured markdown to `tasks/` |
| `skills/ralph/SKILL.md` | Skill for converting PRD markdown to `prd.json`: enforces story sizing, dependency ordering, verifiable criteria |
| `flowchart/src/App.tsx` | Main visualization: 10 sequential animated steps showing the Ralph workflow, custom React Flow nodes |

## Things to Watch Out For

- `prd.json`, `progress.txt`, and `.last-branch` are gitignored - they are runtime files, not committed
- The flowchart Vite config uses `base: '/ralph/'` - local dev works fine but production builds assume the `/ralph/` path prefix
- `ralph.sh` requires `jq` to be installed for JSON parsing
- The `--dangerously-allow-all` flag is passed to `amp` in `ralph.sh` (line 63) to allow unrestricted tool access
- TypeScript config has `erasableSyntaxOnly: true` - type-only syntax must use explicit `type` keyword on imports/exports
