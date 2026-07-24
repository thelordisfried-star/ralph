## 2024-05-18 - React Flow Array Recreation Optimization
**Learning:** Re-creating entire node and edge arrays from scratch on every state update in React Flow forces the library to discard internal node state and re-initialize dimensions, leading to performance issues and the need for complex workarounds like manually tracking coordinates.
**Action:** Use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update style/visibility properties of existing nodes instead. This preserves referential stability and internal state.
