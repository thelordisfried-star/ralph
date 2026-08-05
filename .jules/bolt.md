## 2025-01-22 - React Flow Functional State Updates
**Learning:** Re-creating entire node and edge arrays from scratch on every state update forces React Flow to discard internal node state and re-initialize dimensions, requiring brittle workarounds like tracking x/y coordinates via refs.
**Action:** Always use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update properties (like visibility styles) of existing nodes to preserve internal state and positioning natively, and add metadata directly into the `data` object to allow O(1) property access.
