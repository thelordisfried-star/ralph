# Collaboration Guide: Jules & Claude

This document explains how to collaborate with Jules (Cloud Agent) using your local Claude Code CLI tool.

## Prerequisites
- **Claude Code CLI**: Installed and authenticated locally.
- **Git**: Configured to push/pull from this repository.

## Workflow

### 1. Jules Completes a Task
When Jules finishes a task, he will:
- Commit the code.
- (Optional) Update `.claude/HANDOFF.md` with specific instructions.

### 2. You (User) Pull Changes
Run the following in your local terminal:
```bash
git pull
```

### 3. Claude Reviews the Work
Ask your local Claude to review Jules' work using the provided prompt:

```bash
claude -p .claude/review_jules.md "Review the latest commit from Jules."
```

Claude will:
- Analyze the diff.
- Run lint and build checks (as configured in `.claude/CLAUDE.md`).
- Provide feedback on correctness and style.

### 4. You Iterate (Optional)
If Claude finds issues:
- You can fix them locally with Claude's help:
  ```bash
  claude "Fix the lint errors found in the review."
  ```
- Or ask Jules to fix them in the next session.

## Configuration
- **.claude/CLAUDE.md**: Defines project-specific commands (build, lint, etc.).
- **.claude/review_jules.md**: The system prompt for the review process.
- **.claude/HANDOFF_TEMPLATE.md**: Template for task handoffs.
