## 2024-02-12 - Functional State Updates for React Flow
**Learning:** Re-creating React Flow node and edge arrays from scratch on every visible state update creates N object allocations per click, forcing the use of ugly `nodePositions` refs to keep track of pan/zoom layout.
**Action:** Always embed static metadata into the `data` properties of nodes and edges when initializing. This allows updating layout dynamically via `setNodes(nds => nds.map(...))` to return original objects or minimal modifications to preserve referential equality and optimize re-renders.
