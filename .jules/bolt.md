## 2024-05-19 - Removed O(N) recreations of React Flow nodes
**Learning:** React Flow functional state updates (`setNodes(nds => nds.map(...))`) preserve internal properties like dragged node coordinates. Re-creating the entire node list (e.g. `getNodes()`) on each step requires tracking positions manually via a `useRef` to avoid losing user state on next/prev click, which degrades performance and complexity.
**Action:** Always prefer functional state mapping over array recreation for performance and to preserve internal component state during interactions.
