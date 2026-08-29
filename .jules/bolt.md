## 2023-10-18 - React Flow State Optimization
**Learning:** Fully replacing `nodes` and `edges` arrays on every state change causes React Flow to reconcile and re-render all elements, destroying local state (like user-dragged node positions).
**Action:** Use functional state updates (`setNodes(nds => nds.map(...))`) and referential equality checks to return exact unmodified object references, avoiding O(N) re-renders.
