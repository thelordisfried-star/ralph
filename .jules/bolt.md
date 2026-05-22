## 2024-05-22 - [App.tsx Functional Setters for Array Objects]
**Learning:** React Flow visibility toggles that recreate large arrays of nodes/edges using `.map()` without preserving referential equality destroy memoization and cause heavy GC spikes due to continuous deep cloning on simple opacity changes.
**Action:** Use functional state setters (e.g. `setNodes(nds => nds.map(...))`) containing deep equality checks (`node.style?.opacity === expectedOpacity`) and return the exact same referential object to `ReactFlow` if nothing actually needs mutating.
