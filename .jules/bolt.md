## 2024-05-24 - Preserving React Flow Internal State
**Learning:** In React Flow, replacing the entire `nodes` array instead of selectively modifying it via functional state updates destroys internal state, such as node positions updated by user drag events. This forced the previous implementation to manually track positions with a `useRef`.
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) for visibility toggling to prevent O(N) allocation and preserve drag positions automatically.
