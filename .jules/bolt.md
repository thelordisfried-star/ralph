## 2024-05-24 - [Recreating ReactFlow Arrays]
**Learning:** In ReactFlow, replacing the entire `nodes` array instead of selectively modifying it via functional state updates (e.g., `setNodes(nds => nds.map(...))`) destroys internal state, such as node positions updated by user drag events.
**Action:** Use functional state updates to modify element visibility (e.g. opacity) or style, instead of re-creating the initial element array from static data, which causes unneeded allocations and wipes user-initiated state changes (like drags).
