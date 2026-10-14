## 2023-10-24 - React Flow Internal State Thrashing

**Learning:** When updating arrays passed to `setNodes` or `setEdges` in `react-flow`, completely re-creating the nodes (e.g. `setNodes(getNodes(...))`) destroys internal tracking state like node positions modified by user dragging. This forces workarounds like manually syncing `nodePositions.current` via `onNodesChange` and injecting it back during recreations.

**Action:** Prefer functional state updates (`setNodes(nds => nds.map(...))`) when just changing styles (like opacity or pointer events) or data payloads. This mutates properties on the existing node instances, allowing `react-flow` to preserve native state such as drag positions and eliminates O(N) recreations on state changes.
