## 2024-05-15 - [Refactored React Flow Updates]
**Learning:** Recreating the entire nodes/edges arrays on every state change forces manual tracking of internal state (like drag positions) and causes significant React re-rendering overhead.
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) to selectively update node properties (like opacity), preserving internal state and enabling React to skip unchanged nodes entirely.
