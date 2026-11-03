## 2024-05-15 - React Flow State Destruction
**Learning:** Completely replacing the nodes array (`setNodes([...newNodes])`) on every step change destroys React Flow's internal state (e.g., node drag positions). This necessitates manual coordinate tracking via a `useRef` and intercepting `onNodesChange`, which adds unnecessary re-renders, O(N) object recreations, and code complexity.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) for React Flow node updates to preserve internal properties and avoid tracking coordinates manually.
