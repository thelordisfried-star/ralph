## 2025-02-18 - Replacing Unnecessary Re-creation with Functional State Updates
**Learning:** Re-creating entire node and edge arrays from scratch on every state update (`getNodes`, `getEdgeVisibility`) forces React Flow to discard internal states, re-initialize dimensions, and leads to O(N) recreations and object allocations.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) to selectively update properties (like visibility styles) of existing nodes/edges, preserving internal state and referential equality while avoiding unnecessary object creations.
