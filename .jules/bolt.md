
## 2024-06-25 - React Flow State Re-creation vs. Functional Setters
**Learning:** In React Flow, entirely recreating the `nodes` and `edges` arrays on simple attribute changes (like opacity visibility) via `setNodes`/`setEdges` is an O(N) operation that causes unnecessary unmount/remount cycles. This not only degrades performance during transitions but destroys local interaction states (like dynamic dragged node positions) unless explicitly synchronized via refs, which is complex and error-prone.
**Action:** Replace full array recreation with functional state setters (`setNodes(nds => nds.map(...))`) that spread the existing element and only update the required properties (e.g., `style`). This allows React Flow to memoize effectively and preserves dynamic positions.

## 2024-06-25 - React Flow Reset Regression
**Learning:** When optimizing React Flow visibility updates with functional setters, do not inadvertently overwrite reset mechanisms (`handleReset`). Replacing a true reset (`setNodes(initialNodes)`) with an optimization that only updates opacities (`updateVisibility(1)`) fails to revert dynamic coordinate state back to pristine.
**Action:** Always maintain the original `setNodes(initialNodes)` for explicitly resetting a flowchart back to its unmutated initial coordinates.
