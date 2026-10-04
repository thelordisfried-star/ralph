## 2024-05-24 - React Flow Internal State Preservation
**Learning:** Replacing full array recreations with functional updates (`setNodes(nds => nds.map(...))`) in React Flow preserves internal node states (like drag positions), eliminating the need for `useRef` tracking and manual synchronization.
**Action:** Always prefer functional updates to selectively modify node properties (like `opacity`) instead of recreating node arrays when handling dynamic visibility.
