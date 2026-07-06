## 2024-05-24 - Optimize React Flow state updates
**Learning:** Re-creating entire node and edge arrays from scratch on every state update forces React Flow to discard internal node state and re-initialize dimensions.
**Action:** Use functional state updates (e.g., setNodes(nds => nds.map(...))) to selectively update properties (like visibility styles) of existing nodes to preserve internal state and positioning natively.
