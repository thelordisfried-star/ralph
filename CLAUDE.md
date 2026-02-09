# CLAUDE.md

## Project Overview

Ralph is an autonomous AI agent loop that orchestrates the [Amp CLI](https://ampcode.com) to implement features iteratively. It takes Product Requirements Documents (PRDs), breaks them into user stories, and runs repeated fresh Amp instances until all stories are complete. Memory persists between iterations via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Repository Structure

```
ralph/
├── ralph.sh                 # Main bash loop that spawns fresh Amp instances
├── prompt.md                # Instructions given to each Amp iteration
├── prd.json.example         # Example PRD JSON format
├── AGENTS.md                # Agent operating instructions and patterns
├── README.md                # Project documentation
├── skills/                  # Amp framework skills
│   ├── prd/SKILL.md         # PRD generator skill (markdown PRD creation)
│   └── ralph/SKILL.md       # PRD-to-JSON converter skill
├── flowchart/               # Interactive React Flow visualization
│   ├── src/
│   │   ├── App.tsx          # Main React Flow component
│   │   ├── App.css          # Retro Windows 95 styling
│   │   └── main.tsx         # Entry point
│   ├── package.json         # Dependencies and scripts
│   ├── vite.config.ts       # Vite config (base: /ralph/)
│   ├── eslint.config.js     # ESLint flat config
│   └── tsconfig*.json       # TypeScript configs (strict mode)
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages deployment for flowchart
└── .gitignore               # Ignores prd.json, progress.txt, .last-branch
```

### Runtime Files (gitignored, generated during runs)

- `prd.json` — Active user stories with `passes` status
- `progress.txt` — Append-only learnings from each iteration
- `.last-branch` — Tracks the current branch for archiving
- `archive/` — Archived previous runs (date-stamped)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Core loop | Bash (`ralph.sh`) |
| Agent orchestration | Amp CLI (external dependency) |
| JSON processing | `jq` (external dependency) |
| Flowchart UI | React 19, TypeScript 5.9, Vite 7 |
| Flow visualization | @xyflow/react 12 |
| Linting | ESLint 9 (flat config), typescript-eslint |
| Deployment | GitHub Pages via GitHub Actions |

## Development Commands

### Flowchart (the only buildable component)

```bash
# Install dependencies
cd flowchart && npm install

# Start dev server with HMR
cd flowchart && npm run dev

# Type-check and build for production
cd flowchart && npm run build

# Run ESLint
cd flowchart && npm run lint

# Preview production build
cd flowchart && npm run preview
```

### Running Ralph (from a target project)

```bash
# Run with default 10 iterations
./ralph.sh

# Run with custom max iterations
./ralph.sh 25
```

### Debugging a Ralph run

```bash
# Check story status
cat prd.json | jq '.userStories[] | {id, title, passes}'

# View learnings from previous iterations
cat progress.txt

# Recent git history
git log --oneline -10
```

## Key Conventions

### Code Style (Flowchart)

- TypeScript strict mode is enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- ESLint 9 flat config with react-hooks and react-refresh plugins
- No Prettier configured — use ESLint only
- React 19 with functional components

### Commit Messages

When Ralph runs autonomously, commits follow this format:
```
feat: [Story ID] - [Story Title]
```
Example: `feat: US-002 - Display priority indicator on task cards`

### PRD/Story Conventions

- Story IDs are sequential: `US-001`, `US-002`, etc.
- Branch names use prefix `ralph/` with kebab-case: `ralph/feature-name`
- Every story must include `"Typecheck passes"` in acceptance criteria
- UI stories must include `"Verify in browser using dev-browser skill"`
- Stories should be small enough to complete in one context window
- Stories are ordered by dependency (schema → backend → UI)

### Progress Tracking

- `progress.txt` is append-only — never replace, always append
- Each entry includes: what was done, files changed, and learnings
- Reusable patterns go in the `## Codebase Patterns` section at the top of `progress.txt`
- AGENTS.md files should be updated with discovered patterns

## Architecture Concepts

### Fresh Context Per Iteration

Each Ralph iteration spawns a **new Amp instance** with zero memory of previous work. The only persistence mechanisms are:
1. Git history (committed code)
2. `progress.txt` (learnings and context)
3. `prd.json` (which stories are complete)

### Stop Condition

When all stories have `passes: true`, the agent outputs `<promise>COMPLETE</promise>` and `ralph.sh` exits successfully.

### Archiving

Ralph automatically archives `prd.json` and `progress.txt` when a new feature branch is detected (different `branchName`). Archives go to `archive/YYYY-MM-DD-feature-name/`.

## CI/CD

- **GitHub Pages deployment** triggers on push to `main` or manual dispatch
- Builds the flowchart (`flowchart/dist/`) and deploys to GitHub Pages
- Live at: `https://snarktank.github.io/ralph/`
- Uses Node 20, `npm ci`, then `npm run build`

## Testing

There is no test framework configured in this repository. Ralph is a workflow tool — the projects it automates are expected to have their own test suites. Ralph enforces testing via acceptance criteria (`"Tests pass"`, `"Typecheck passes"`).

## Important Notes

- `ralph.sh` requires `amp` CLI and `jq` to be installed
- The `--dangerously-allow-all` flag is passed to Amp (allows all tool access)
- `prd.json`, `progress.txt`, and `.last-branch` are gitignored — they are runtime artifacts
- The flowchart's Vite config uses `base: '/ralph/'` for GitHub Pages subpath deployment
- Skills in `skills/` are designed for the Amp framework skill system, not standalone scripts
