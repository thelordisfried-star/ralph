## 2024-10-08 - React Flow State Updates
**Learning:** Replacing entire arrays for state updates in React Flow discards internal visual states, like user-dragged node coordinates.
**Action:** Always use functional updates (`setNodes(nds => nds.map(...))`) to selectively modify existing Node properties (e.g., opacity, styling). This inherently preserves internal node data, removing the need to track position logic manually via `useRef`.
