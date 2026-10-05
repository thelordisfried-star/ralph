## 2024-05-24 - Preserving React Flow Internal State
**Learning:** Full array replacement in React Flow (e.g., `setNodes(getNodes(...))`) destroys internal state such as user-dragged node coordinates, forcing manual and costly tracking via `useRef` on every drag event.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) when modifying node properties (like `opacity` or `pointerEvents`) to preserve the internal tracking and eliminate the need for manual `useRef` coordinate syncing.
