## 2024-05-16 - [React Flow State Update Bottleneck]
**Learning:** In React Flow, creating new arrays of nodes/edges instead of using functional setters causes O(N) allocation and destroys component internal state (forcing tracking of coords via refs).
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) for visibility/styling toggles to preserve referential stability and React Flow internal physics.
