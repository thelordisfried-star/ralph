## 2024-05-24 - React Flow Node Re-renders
**Learning:** React Flow internally triggers state updates for panning and zooming. Without `React.memo` on custom node components (`CustomNode`, `NoteNode`), every node re-renders on every interaction, causing unnecessary UI jank as the graph scales.
**Action:** Always wrap custom React Flow node components with `React.memo` at their definition to prevent global re-renders on simple interactions.
