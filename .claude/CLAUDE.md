# Claude Code Configuration

This file provides context and commands for the Claude Code CLI tool.

## Project Context
- **Project Name**: Flowchart (Ralph)
- **Architecture**: React + Vite + TypeScript
- **State Management**: React Hooks (local state), React Flow (graph state)
- **Styling**: CSS Modules / Standard CSS
- **Package Manager**: npm

## Commands
Run these commands from the project root:

- **Build**: `cd flowchart && npm install && npm run build`
- **Lint**: `cd flowchart && npm run lint`
- **Typecheck**: `cd flowchart && npx tsc --noEmit`
- **Test**: `echo "No automated tests configured. Please run manual verification."`

## Style Guidelines
- Use functional components with hooks.
- Prefer `const` over `let`.
- Use TypeScript interfaces for props.
- Keep components small and focused.
