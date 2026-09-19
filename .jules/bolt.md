## 2024-09-19 - Initial Learnings
**Learning:** React Flow rendering optimization. CustomNode and NoteNode are already memoized to prevent re-renders on pan/zoom, which is great.
**Action:** Look for other state bottlenecks or array recreations.

## 2024-09-19 - React Flow Re-render Optimization
**Learning:** In React Flow, entirely replacing the `nodes` and `edges` arrays using a generator function (e.g., `getNodes()`) inside Next/Prev handlers forces React to reconcile the entire graph and destroys user-driven drag state (positions).
**Action:** Replace full array recreation with functional state updates (`setNodes(nds => nds.map(...))`) to selectively toggle `opacity` and `pointerEvents` properties, avoiding O(N) object allocations and preserving internal React Flow state.
