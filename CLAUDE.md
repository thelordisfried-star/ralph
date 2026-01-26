# Claude Code Instructions

## Project Overview

Ralph is an autonomous AI agent loop that runs coding agents (originally Amp) repeatedly until all PRD items are complete. Each iteration spawns a fresh agent instance with clean context. Memory persists via git history, `progress.txt`, and `prd.json`.

Based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/).

## Quick Start

```bash
# Run Ralph (requires prd.json in your project)
./ralph.sh [max_iterations]

# Run the flowchart dev server
cd flowchart && npm run dev

# Build the flowchart
cd flowchart && npm run build
```

## Key Files

| File | Purpose |
|------|---------|
| `ralph.sh` | Bash loop spawning fresh agent instances |
| `prompt.md` | Instructions given to each agent iteration |
| `prd.json` | User stories with `passes` status |
| `prd.json.example` | Example PRD format reference |
| `progress.txt` | Append-only learnings for future iterations |
| `skills/prd/` | Skill for generating PRDs |
| `skills/ralph/` | Skill for converting PRDs to JSON |
| `flowchart/` | Interactive React Flow visualization |

## Skills

### `/prd` - PRD Generator
Generate Product Requirements Documents for features. Triggers on: "create a prd", "write prd for", "plan this feature".

Usage: Describe a feature and answer clarifying questions. Output saved to `tasks/prd-[feature-name].md`.

### `/ralph` - PRD to JSON Converter
Convert markdown PRDs to `prd.json` format. Triggers on: "convert this prd", "turn this into ralph format", "create prd.json".

## Architecture Patterns

### Each Iteration = Fresh Context
- Each iteration spawns a new agent with clean context
- Memory persists only via:
  - Git history (commits)
  - `progress.txt` (learnings)
  - `prd.json` (story status)

### Story Sizing (Critical)
Each story must be completable in ONE context window.

**Right-sized:**
- Add a database column and migration
- Add a UI component to an existing page
- Update a server action with new logic

**Too big (split these):**
- "Build the entire dashboard"
- "Add authentication"
- "Refactor the API"

**Rule of thumb:** If you can't describe it in 2-3 sentences, split it.

### Story Ordering
Stories execute in priority order. Dependencies must come first:
1. Schema/database changes
2. Server actions/backend logic
3. UI components using the backend
4. Dashboard/summary views

### Acceptance Criteria
Must be verifiable, not vague:
- Good: "Filter dropdown has options: All, Active, Completed"
- Bad: "Works correctly"

Always include:
- "Typecheck passes" (all stories)
- "Verify in browser using dev-browser skill" (UI stories)

## Workflow

1. **Create PRD:** Use `/prd` skill to generate requirements
2. **Convert to JSON:** Use `/ralph` skill to create `prd.json`
3. **Run Ralph:** `./ralph.sh [max_iterations]`

Ralph will:
1. Create feature branch from `prd.json` branchName
2. Pick highest priority story where `passes: false`
3. Implement that single story
4. Run quality checks
5. Commit if checks pass
6. Update `prd.json` to mark `passes: true`
7. Append learnings to `progress.txt`
8. Repeat until complete

## Progress Tracking

Append to `progress.txt` after each story:
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

## AGENTS.md Updates

After implementing a story, update relevant `AGENTS.md` files with:
- API patterns specific to that module
- Gotchas or non-obvious requirements
- Dependencies between files
- Testing approaches

Do NOT add story-specific details or temporary notes.

## Debugging

```bash
# See story status
cat prd.json | jq '.userStories[] | {id, title, passes}'

# See learnings
cat progress.txt

# Check git history
git log --oneline -10
```

## Flowchart

Interactive visualization at [snarktank.github.io/ralph](https://snarktank.github.io/ralph/).

Local development:
```bash
cd flowchart
npm install
npm run dev
```

## References

- [Geoffrey Huntley's Ralph article](https://ghuntley.com/ralph/)
- [Amp documentation](https://ampcode.com/manual)
- [Author's article on using Ralph](https://x.com/ryancarson/status/2008548371712135632)
