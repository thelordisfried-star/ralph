## 2024-04-29 - [Optimizing React Flow Updates]
**Learning:** Using functional state updates (`setNodes(nds => ...)`) to modify only CSS style visibility properties turns an O(N) re-render operation into an O(1) React component update for unmodified nodes by preserving exact object referential equality for items that didn't change visibility.
**Action:** When updating a subset of items in an array for a visualization library like React Flow, map over the existing state and return the exact same object reference if its properties don't need to change to preserve `React.memo` boundaries.
