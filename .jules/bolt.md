## 2025-02-18 - React Flow State Optimization
**Learning:** Recreating React Flow node and edge arrays from scratch on state updates causes loss of internal node state and forces expensive re-renders.
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) to selectively update style properties on existing node and edge objects, preserving referential stability.
