
## 2024-05-18 - [React Flow State Optimization]
**Learning:** In React Flow, re-creating entire node and edge arrays from scratch on every state update (e.g. using `getNodes(newCount)`) forces the library to discard internal node state, re-initialize dimensions, and leads to O(N) object allocations on every UI interaction.
**Action:** Always use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update properties (like visibility styles) of existing nodes/edges to preserve referential stability and internal state natively.
