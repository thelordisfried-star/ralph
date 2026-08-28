## 2024-05-18 - React Flow State Array Recreation
**Learning:** Recreating React Flow state arrays (`nodes` and `edges`) on every step change causes unnecessary O(N) rendering overhead and drops internal React Flow state like user-dragged node positions.
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) to selectively update properties (e.g., `opacity`, `pointerEvents`) while returning unmodified elements to preserve referential equality and performance.
