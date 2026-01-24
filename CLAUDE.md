# CLAUDE.md - Ralph Codebase Guide

## Project Overview

Ralph is an autonomous AI agent loop that runs [Amp](https://ampcode.com) repeatedly until all Product Requirements Document (PRD) items are complete. Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/), it provides a framework for autonomous code generation where each iteration spawns a fresh Amp instance with clean context.

**Key Concept**: Memory persists across stateless iterations through:
- **Git history** - Commits from previous iterations
- **`progress.txt`** - Append-only learnings log
- **`prd.json`** - Story status tracking with pass/fail states

## Quick Start

```bash
# Run Ralph (from your project that has prd.json)
./ralph.sh [max_iterations]  # default: 10 iterations

# Run the interactive flowchart visualization
cd flowchart && npm install && npm run dev
```

## Repository Structure

```
ralph/
├── ralph.sh              # Main bash loop orchestrating Amp instances
├── prompt.md             # System prompt for each Amp iteration
├── prd.json.example      # Example PRD format (copy to prd.json)
├── AGENTS.md             # High-level agent instructions
├── CLAUDE.md             # This file
├── .gitignore            # Ignores runtime files (prd.json, progress.txt)
│
├── skills/               # Amp skills for PRD workflow
│   ├── prd/SKILL.md      # PRD generation from feature descriptions
│   └── ralph/SKILL.md    # Markdown PRD to JSON conversion
│
├── flowchart/            # Interactive visualization (React + TypeScript)
│   ├── src/
│   │   ├── App.tsx       # Main React Flow component
│   │   ├── App.css       # Styling
│   │   └── main.tsx      # Entry point
│   ├── package.json      # Dependencies (React 19, XYFlow, Vite)
│   ├── tsconfig.json     # TypeScript config (composite)
│   └── vite.config.ts    # Vite build config
│
├── archive/              # Auto-archived previous runs (created at runtime)
└── .github/workflows/
    └── deploy.yml        # GitHub Pages deployment for flowchart
```

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | Main orchestration loop - spawns fresh Amp per iteration, checks completion |
| `prompt.md` | Instructions given to each Amp instance (workflow, quality gates, stop condition) |
| `prd.json` | Runtime task list with user stories and pass/fail status (gitignored) |
| `progress.txt` | Append-only log of learnings from iterations (gitignored) |
| `skills/prd/SKILL.md` | Amp skill for generating structured PRDs |
| `skills/ralph/SKILL.md` | Amp skill for converting PRD markdown to JSON |

## How Ralph Works

1. **Check for branch changes** - Archives previous run if switching branches
2. **Initialize** - Creates `progress.txt` if needed
3. **Loop** (up to MAX_ITERATIONS):
   - Run `amp` with `prompt.md` as system prompt
   - Check for completion signal: `<promise>COMPLETE</promise>`
   - Exit on completion or continue to next iteration
4. **Track state** - Branch name stored in `.last-branch` for archiving logic

## Development Commands

### Flowchart Visualization

```bash
cd flowchart
npm install          # Install dependencies
npm run dev          # Start dev server with HMR
npm run build        # TypeScript check + production build
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Running Ralph

```bash
./ralph.sh           # Run with default 10 iterations
./ralph.sh 20        # Run with 20 max iterations
```

## PRD Format

User stories in `prd.json` follow this structure:

```json
{
  "project": "MyApp",
  "branchName": "ralph/feature-name",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a user, I want...",
      "acceptanceCriteria": [
        "Specific, verifiable criterion",
        "Typecheck passes",
        "Verify in browser using dev-browser skill"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Code Conventions

### TypeScript/React (flowchart)

- Functional components with React hooks (`useState`, `useCallback`, `useRef`)
- Custom node types for React Flow (`CustomNode`, `NoteNode`)
- Explicit position management with refs
- Strict TypeScript configuration
- ESLint with React hooks and refresh plugins

### CSS

- CSS Grid and Flexbox for layout
- System font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI'...`
- Monospace for code: `'SF Mono', 'Monaco', 'Inconsolata'`
- Smooth transitions (0.2s-0.5s)
- Border-based UI with 2px solid/dashed patterns

### Bash Scripts

- `set -e` for fail-fast behavior
- Script-relative paths using `$(dirname "${BASH_SOURCE[0]}")`
- jq for JSON parsing
- Clear exit codes (0 = success, 1 = incomplete)

## Quality Requirements

When working within the Ralph loop:

1. **ALL commits must pass quality checks** (typecheck, lint, test)
2. **Never commit broken code** - Keep CI green
3. **One story per iteration** - Keep changes focused and minimal
4. **Browser verification required** for frontend stories (use dev-browser skill)
5. **Update AGENTS.md** with discovered patterns (not story-specific details)
6. **Append to progress.txt** - Never replace, always append learnings

## Commit Format

```
feat: [Story ID] - [Story Title]
```

Example: `feat: US-001 - Add priority field to database`

## Progress Report Format

Append to `progress.txt`:

```markdown
## [Date/Time] - [Story ID]
Thread: https://ampcode.com/threads/$AMP_CURRENT_THREAD_ID
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## Technology Stack

| Component | Technology |
|-----------|------------|
| Orchestration | Bash |
| AI Agent | Amp (Anthropic) |
| Visualization | React 19.2.0, React Flow (XYFlow) 12.10.0 |
| Build Tool | Vite 7.2.4 |
| Language | TypeScript 5.9 |
| Linting | ESLint 9 with TypeScript/React plugins |
| Package Manager | npm |
| Hosting | GitHub Pages |
| CI/CD | GitHub Actions |

## Important Patterns

### Context Window Awareness
- Each story should be completable in one context window
- Stories are sized to be small and focused
- Dependencies ordered: Schema > Backend > UI > Aggregations

### Memory Persistence
- Git history provides code evolution context
- `progress.txt` consolidates learnings at the top under "Codebase Patterns"
- `prd.json` tracks which stories are complete
- Thread URLs enable referencing previous work via `read_thread` tool

### Archiving Strategy
- When branch name changes, previous run is auto-archived
- Archives stored in `archive/YYYY-MM-DD-feature-name/`
- Contains both `prd.json` and `progress.txt` from previous run

### Stop Condition
When all stories have `passes: true`, respond with:
```
<promise>COMPLETE</promise>
```

## CI/CD

GitHub Actions workflow (`.github/workflows/deploy.yml`):
- Triggers on push to `main` or manual dispatch
- Uses Node 20
- Builds flowchart with `npm ci && npm run build`
- Deploys `flowchart/dist` to GitHub Pages at `/ralph/`

## Common Tasks

### Adding a New User Story
1. Edit `prd.json` to add the story with `passes: false`
2. Set appropriate `priority` (lower = higher priority)
3. Include verifiable acceptance criteria
4. Run `./ralph.sh` to start processing

### Creating a PRD from Scratch
1. Use the Amp skill in `skills/prd/SKILL.md` to generate PRD markdown
2. Use the Amp skill in `skills/ralph/SKILL.md` to convert to JSON
3. Save as `prd.json` in the Ralph directory

### Viewing the Interactive Flowchart
- Live demo: GitHub Pages deployment
- Local: `cd flowchart && npm run dev`
- Click through steps to reveal animations

## Files Ignored in Git

- `prd.json` - Runtime task tracking (use `prd.json.example` as template)
- `progress.txt` - Runtime learnings log
- `.last-branch` - Branch tracking for archiving
- `archive/` - Archived previous runs (optional to commit)

## Related Resources

- [Amp Documentation](https://ampcode.com)
- [Ralph Pattern by Geoffrey Huntley](https://ghuntley.com/ralph/)
- [Live Flowchart Demo](https://thelordisfried.github.io/ralph/)
