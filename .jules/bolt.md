## 2025-03-01 - [Preserving Reference Equality in React Flow]
**Learning:** In React Flow, dynamically recreating entire node and edge arrays on state updates forces internal state discards and prevents standard React reconciliation, requiring manual position tracking.
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) and embed metadata into the element's `data` property to calculate selective visibility styles without recreating the objects, ensuring smooth rendering and native positional persistence.
