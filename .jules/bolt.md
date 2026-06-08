## 2024-06-08 - [React Flow Referential Stability]
**Learning:** Overwriting arrays passed to `useNodesState` and `useEdgesState` (e.g. `setNodes(getNodes(...))`) destroys component referential stability and causes React Flow to tear down and recreate DOM elements unneccessarily, breaking dragging offsets and CSS transitions.
**Action:** Always use functional setters (`setNodes(nds => nds.map(...))`) and selectively mutate only the specifically changed properties like `style` or `animated` on existing element objects to optimize large React Flow application performance.
