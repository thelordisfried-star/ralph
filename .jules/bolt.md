## 2024-05-18 - React Flow Memoization Optimization
**Learning:** In React Flow, passing inline objects to `data` or `style` props in custom nodes/edges breaks `React.memo`, causing excessive re-renders during pan/zoom operations.
**Action:** Always extract static configuration objects and data mapping logic outside component functions to ensure referential stability and optimize rendering performance.
