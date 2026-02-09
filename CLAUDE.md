# CLAUDE.md

## Project Overview

Ralph is an autonomous AI agent loop that runs [Amp](https://ampcode.com) repeatedly until all PRD (Product Requirements Document) items are complete. Each iteration spawns a fresh Amp instance with clean context. Memory persists between iterations via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Repository Structure

```
ralph/
├── ralph.sh                 # Main bash loop script (entry point)
├── prompt.md                # Instructions given to each Amp iteration
├── prd.json.example         # Example PRD format for reference
├── AGENTS.md                # Agent instructions for Amp
├── README.md                # Project documentation
├── .gitignore               # Ignores prd.json, progress.txt, .last-branch
├── flowchart/               # Interactive React Flow visualization
│   ├── src/
│   │   ├── main.tsx         # React entry point
│   │   ├── App.tsx          # Main flowchart component (React Flow)
│   │   ├── App.css          # Windows 95-style retro UI theme
│   │   └── index.css        # Global styles
│   ├── package.json         # Node dependencies and scripts
│   ├── vite.config.ts       # Vite config (base: '/ralph/')
│   ├── tsconfig.json        # TypeScript project references
│   ├── tsconfig.app.json    # App TypeScript config (strict mode)
│   ├── tsconfig.node.json   # Node TypeScript config
│   ├── eslint.config.js     # ESLint flat config
│   └── index.html           # HTML entry
├── skills/                  # Amp skills for the Ralph workflow
│   ├── prd/SKILL.md         # Skill: generate PRDs from feature descriptions
│   └── ralph/SKILL.md       # Skill: convert PRDs to prd.json format
├── .github/workflows/
│   └── deploy.yml           # GitHub Pages deployment for flowchart
├── ralph-flowchart.png      # Flowchart screenshot
└── ralph.webp               # Project mascot image
```

### Runtime Files (gitignored)

These are generated during Ralph runs and not committed:

- `prd.json` - Active user stories with `passes` status
- `progress.txt` - Append-only learnings log for future iterations
- `.last-branch` - Tracks the current branch for archive detection
- `archive/` - Archived previous runs (optional to commit)

## Commands

### Flowchart (React app)

```bash
# Development server with HMR
cd flowchart && npm run dev

# Type-check and build for production
cd flowchart && npm run build

# Lint with ESLint
cd flowchart && npm run lint

# Preview production build
cd flowchart && npm run preview
```

### Ralph Loop

```bash
# Run Ralph with default 10 iterations
./ralph.sh

# Run with custom max iterations
./ralph.sh 20
```

**Prerequisites:** Amp CLI installed, `jq` installed, a git repository.

## Architecture

### How Ralph Works (10-step loop)

1. User writes a PRD using the `prd` skill
2. PRD is converted to `prd.json` using the `ralph` skill
3. `ralph.sh` starts the autonomous loop
4. Each iteration: Amp picks the highest-priority story where `passes: false`
5. Amp implements that single story
6. Quality checks run (typecheck, lint, tests)
7. If checks pass, Amp commits with message `feat: [Story ID] - [Story Title]`
8. Amp updates `prd.json` (sets `passes: true`)
9. Amp appends learnings to `progress.txt`
10. Loop repeats until all stories pass or max iterations reached

**Stop condition:** When all stories have `passes: true`, Amp outputs `<promise>COMPLETE</promise>` and the loop exits.

### Key Design Principles

- **Fresh context per iteration** - Each iteration is a new Amp instance. No in-memory state carries over.
- **Small stories** - Each story must fit in one context window. If it's too big, the LLM runs out of context and produces broken code.
- **Dependency ordering** - Stories execute by priority number. Earlier stories must not depend on later ones (schema -> backend -> UI).
- **Feedback loops** - Typecheck, tests, and CI must stay green. Broken code compounds across iterations.
- **Persistent learning** - `progress.txt` and `AGENTS.md` files carry knowledge forward.

### prd.json Format

```json
{
  "project": "ProjectName",
  "branchName": "ralph/feature-name",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": ["Criterion 1", "Typecheck passes"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

## Flowchart Component

The `flowchart/` directory contains an interactive step-through visualization built with:

- **React 19** + **React Flow** (@xyflow/react) for the node/edge diagram
- **Vite 7** as the build tool
- **TypeScript 5.9** with strict mode enabled
- **Windows 95-style retro UI** (notepad window chrome, beveled borders, teal desktop background)

Key components in `flowchart/src/App.tsx`:
- `CustomNode` - Styled boxes with connection handles and descriptions
- `NoteNode` - Post-it yellow note nodes with code examples
- Step-through navigation (Previous/Next/Reset) with animated opacity transitions

### TypeScript Configuration

- `tsconfig.app.json`: Target ES2022, strict mode, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- All `.ts` and `.tsx` files are linted via ESLint flat config with `typescript-eslint`, `react-hooks`, and `react-refresh` plugins

## CI/CD

**GitHub Actions** (`.github/workflows/deploy.yml`):
- Triggers on push to `main` or manual dispatch
- Builds the flowchart with Node 20
- Deploys to GitHub Pages at `/ralph/` path
- Steps: checkout -> setup Node (cached npm) -> `npm ci` -> `npm run build` -> deploy Pages

## Coding Conventions

- **Commit messages:** `feat: [Story ID] - [Story Title]` (when running as Ralph)
- **Branch naming:** `ralph/feature-name-kebab-case` for Ralph runs
- **Story IDs:** Sequential `US-001`, `US-002`, etc.
- **Acceptance criteria:** Must be verifiable, not vague. Always include "Typecheck passes". UI stories add "Verify in browser using dev-browser skill".
- **AGENTS.md updates:** Add reusable patterns discovered during implementation (not story-specific details)
- **progress.txt:** Append-only. Never replace content. Include thread URLs for future reference.

## Skills

### `prd` Skill (`skills/prd/SKILL.md`)
Generates structured PRDs from feature descriptions. Asks 3-5 clarifying questions with lettered options, then outputs a markdown PRD to `tasks/prd-[feature-name].md`.

### `ralph` Skill (`skills/ralph/SKILL.md`)
Converts markdown PRDs to `prd.json` format. Enforces story sizing (one context window per story), dependency ordering, and verifiable acceptance criteria. Archives previous runs if the branch name changes.

## Common Patterns

- Stories are ordered: database/schema first, then backend logic, then UI components, then aggregate views
- `ralph.sh` auto-archives previous runs when `branchName` in `prd.json` changes (saves to `archive/YYYY-MM-DD-feature-name/`)
- The `Codebase Patterns` section at the top of `progress.txt` consolidates the most important reusable learnings from all iterations
- The flowchart is deployed at `https://snarktank.github.io/ralph/` via GitHub Pages
