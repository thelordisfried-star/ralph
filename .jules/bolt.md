## 2024-05-16 - React Flow Performance Optimization
**Learning:** In React Flow, custom nodes re-render on any internal graph state update (like panning or zooming). `React.memo` is critical for `nodeTypes` components to prevent massive performance degradation during interaction.
**Action:** Always wrap custom node components (`CustomNode`, `NoteNode`) in `memo()` at their definition.
