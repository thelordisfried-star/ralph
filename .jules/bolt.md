## 2026-02-03 - React Flow Optimization
**Learning:** In React Flow, dragging a single node can trigger re-renders of ALL nodes if custom node components are not memoized. This is because the parent `ReactFlow` component re-renders. By wrapping custom nodes in `React.memo`, we reduced re-renders during a drag operation from N (total nodes) to 1 (dragged node).
**Action:** Always wrap `CustomNode` components in `React.memo` when working with React Flow.
