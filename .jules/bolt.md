## 2024-04-05 - React Flow Component Re-renders
**Learning:** Custom components rendered by React Flow (`CustomNode`, `NoteNode`) trigger continuous global re-renders during zoom/pan graph state updates if they are not explicitly memoized. React Flow passes referentially changing internal states unless boundaries are set.
**Action:** Always wrap `CustomNode` and `NoteNode` type definitions in `React.memo()` in `App.tsx` (or whenever defining nodeTypes for React Flow) to preserve graph performance during interactions.
