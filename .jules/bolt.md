## 2024-05-20 - React Flow Visibility Optimization
**Learning:** React Flow arrays (nodes and edges) shouldn't be recreated on every step update in a timeline/flowchart, as it triggers `O(N)` internal graph rendering updates and object allocations, even for simple visibility changes.
**Action:** Use functional state setters (`setNodes(nds => ...)`) to selectively mutate only the target elements' `style` (e.g., opacity, pointerEvents) and maintain referential stability for unchanged elements to improve frontend performance.
