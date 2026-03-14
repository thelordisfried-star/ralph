## 2024-05-19 - ReactFlow Node Memoization
**Learning:** Custom nodes (`CustomNode`, `NoteNode`) in ReactFlow re-render on every internal state update (like pan and zoom) if they aren't wrapped in `React.memo`.
**Action:** Always explicitly wrap custom node components in `React.memo` at their definition to prevent unnecessary global re-renders when the internal ReactFlow graph state updates.

## 2024-05-19 - ReactFlow Inline Objects
**Learning:** Passing inline objects and arrays like `fitViewOptions={{ padding: 0.2 }}` to `<ReactFlow>` causes unnecessary prop changes and re-renders because their references change on every render cycle.
**Action:** Always extract configuration objects and arrays to module-level constants (e.g., `FIT_VIEW_OPTIONS`, `DELETE_KEY_CODE`) to ensure referential stability.

## 2024-05-19 - React Refs During Render
**Learning:** Passing `ref.current` to functions during component render or inside `useMemo` initializers throws a strict ESLint `Cannot access refs during render` error.
**Action:** Avoid accessing React refs (`nodePositions.current`) during render. Use module-level constants (like `positions`) or local variables instead to prevent render errors and maintain referential stability.
