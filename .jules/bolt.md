
## 2024-05-24 - [React Flow State Update Optimization]
**Learning:** Re-creating entire node and edge arrays from scratch on every state update (e.g. `setNodes(getNodes(...))`) forces React Flow to discard internal node state, re-initialize dimensions, and requires brittle workarounds like tracking x/y coordinates via refs.
**Action:** When updating React Flow state (like node/edge visibility), always use functional state updates (e.g., `setNodes(nds => nds.map(...))`) to selectively update style properties of existing elements, preserving referential stability and internal library state natively. Embedding lookup data (like indexes) into the element's `.data` property allows for fast O(1) checks during the map iteration.
