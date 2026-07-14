## 2024-07-14 - React Flow Functional State Updates for Visibility Toggling
**Learning:** In React Flow, re-creating entire node and edge arrays from scratch on every state update forces the library to discard internal node state and re-initialize dimensions, leading to a performance bottleneck.
**Action:** Always use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update properties (like visibility styles) of existing nodes to preserve referential stability and internal state.
