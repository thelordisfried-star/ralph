## 2024-04-20 - React Flow Array Mapping Performance
**Learning:** In React Flow, blindly recreating the node and edge arrays on state updates breaks referential integrity, causing massive rendering overhead during interactions.
**Action:** Always use functional state setters (`setNodes(nds => nds.map(...))`) coupled with memoized static properties to selectively mutate only the objects requiring changes.
