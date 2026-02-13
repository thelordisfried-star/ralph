
## 2025-01-28 - [React Flow Node Memoization]
**Learning:** Custom nodes in React Flow can re-render frequently due to internal state changes in the library. Memoizing them with `React.memo` is crucial for performance, especially as the number of nodes grows.
**Action:** Always wrap custom node components in `React.memo` when using React Flow.
