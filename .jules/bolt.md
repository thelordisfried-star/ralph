
## 2024-05-24 - React Flow Graph Recreation Anti-Pattern
**Learning:** Recreating all nodes and edges via `getNodes()` and `createEdge()` on every state change forces React Flow to re-evaluate the entire graph topology, triggering full unmounts/remounts of custom components.
**Action:** Use functional state setters (`setNodes(nds => nds.map(...))`) and selectively mutate only the `style` properties (opacity/pointerEvents) of nodes/edges whose visibility logically changes, preserving object references for unchanged elements.
