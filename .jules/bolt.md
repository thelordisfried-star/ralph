
## 2024-08-06 - Replacing Full Array Recreation with Functional State Updates in React Flow
**Learning:** Re-creating entire node and edge arrays on every state update forces React Flow to discard internal node state, which necessitates brittle workarounds like tracking x/y coordinates via refs.
**Action:** Always use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update properties (like visibility) of existing nodes, preserving internal state and positioning natively while avoiding O(N) allocations.
