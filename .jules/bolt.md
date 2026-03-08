## 2026-03-08 - ReactFlow Referential Stability Re-Renders
**Learning:** ReactFlow components are incredibly sensitive to inline objects. Passing inline arrays or objects to configurations (like `fitViewOptions` or `deleteKeyCode`) or to node props (like `data` or `style`) breaks memoization and causes cascading re-renders during state changes.
**Action:** Always extract configuration options, node styles, and data payloads into stable module-level constants or Map collections (e.g. `stepDataMap`) before passing them to ReactFlow components or Custom Nodes wrapped in `React.memo`.
