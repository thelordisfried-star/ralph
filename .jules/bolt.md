## 2024-03-24 - React Flow Functional State Updates Override User Interactions

**Learning:** Replacing the entire `nodes` array using `getNodes(...)` instead of selectively modifying it via functional state updates (e.g., `setNodes(nds => nds.map(...))`) destroys internal state, such as node positions updated by user drag events, because the newly generated array defaults to the original static layout.

**Action:** When updating node/edge visibility or styles, use functional state updates to map over the existing state, preserving all internal properties (like position) and mutating only the necessary visual properties.
