## 2024-05-24 - React Flow State Updates
**Learning:** In React Flow, when updating node or edge properties like visibility on a button click, recreating the entire array using helper functions causes React Flow to tear down and rebuild internal structures, leading to unneeded re-renders.
**Action:** Use functional state setters (`setNodes(nds => nds.map(...))`) to map over existing items and only mutate the specific properties that changed (`style`, `animated`, etc.), maintaining references for unchanged items.
