## 2025-03-15 - React Refs Accessed During Render Anti-Pattern
**Learning:** In React components like `flowchart/src/App.tsx`, accessing `ref.current` during rendering, such as inside the initialization closure of a `useMemo` (`useMemo(() => getNodes(1, nodePositions.current), [])`), can result in strict ESLint `react-hooks/refs` errors indicating "Cannot access refs during render." This disrupts component updating because refs aren't reactive to render updates, unlike state variables.

**Action:** Whenever initializing a `useMemo` or running synchronous logic at the top-level of a render body, do not access `ref.current`. Instead, rely on static global variables or component props/state that define the initial value. E.g., replace `nodePositions.current` inside `useMemo` initialization with a module-scoped, static default value like `positions`.

## 2025-03-15 - React.memo for Custom Nodes in React Flow
**Learning:** React Flow (from `@xyflow/react`) relies on memoization of custom node types to prevent unnecessary renders when graph state (pan, zoom) changes. If custom nodes like `CustomNode` and `NoteNode` are not wrapped in `React.memo`, they will re-render needlessly, causing performance drops, especially in diagrams with many nodes.
**Action:** Always wrap custom node components in React Flow (e.g., `CustomNode`, `NoteNode`) with `React.memo` to optimize performance.
