## 2024-05-04 - React Flow Visibility Optimization
**Learning:** In React Flow, dynamically calculating node and edge arrays inside render loops using `getNodes(count)` and triggering `setNodes()`/`setEdges()` with entirely new object collections causes excessive GC pressure and React re-renders.
**Action:** Always use React functional state setters (e.g. `setNodes((prev) => new)`) combined with O(1) Map lookups to mutate specific properties (like opacity) on existing Node/Edge object references rather than fully reconstructing the layout payload.
