
## 2025-06-26 - React Flow Node Referential Stability
**Learning:** Fully recreating `nodes` and `edges` arrays on every state change causes React Flow to completely drop node positions/internal dimensions and re-initialize from scratch, requiring expensive state updates and `useRef` position tracking hacks.
**Action:** Always use functional setters (`setNodes(nds => nds.map(...))`) to selectively update inline styling (e.g., `opacity`, `pointerEvents`) when hiding/showing graph elements instead of filtering or regenerating the array, inherently preserving all state natively in React Flow without O(N) array recreation overhead.
