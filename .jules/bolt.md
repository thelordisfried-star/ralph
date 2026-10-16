## 2024-10-16 - Prevent layout coordinate loss on state update
**Learning:** Fully replacing state arrays (`setNodes(getNodes(...))`) destroys internal component state managed by React Flow, completely dropping node positions captured by drag events because React Flow sees brand new objects.
**Action:** Always prefer functional state updates using immutable array modifications (e.g., `setNodes(nds => nds.map(...))`) when working with complex component libraries holding internal state, to preserve node data while allowing isolated property updates without full re-mounting.
