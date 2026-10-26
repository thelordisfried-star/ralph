## 2023-10-26 - React Flow State Updates
**Learning:** Re-creating full node arrays dynamically on every state change destroys internal node state (like dragged positions), forcing workarounds like caching coordinates in a `useRef`.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) to selectively mutate visible properties (like opacity or pointerEvents) on existing objects. This preserves native state and eliminates O(N^2) recreation bottlenecks.
