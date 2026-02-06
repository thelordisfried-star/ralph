## 2024-05-22 - [React Flow Performance]
**Learning:** Custom Nodes in React Flow re-render whenever the `data` prop reference changes. Creating `data` objects inline inside `getNodes` or `onNodesChange` breaks `React.memo` optimization, causing all nodes to re-render even if only one changed.
**Action:** Pre-compute stable `data` objects for static content or use `useMemo` to ensure referential stability before passing to Node components.
