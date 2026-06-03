
## 2024-06-03 - [Optimize React Flow State Updates]
**Learning:** React Flow functional setters for \`nodes\` and \`edges\` can completely eliminate the need for full O(N) recreations and `getNodes()`/`getEdgeVisibility()` calculations on every step change.
**Action:** Replace full array recreation with targeted mutations of \`style.opacity\` and \`style.pointerEvents\` inside functional setters, preserving object referential equality and avoiding re-rendering nodes that did not change visibility.
