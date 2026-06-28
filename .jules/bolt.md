## 2024-06-28 - Optimize React Flow Visibility Toggling
**Learning:** In React Flow, re-creating the entire node and edge arrays on every state update to toggle visibility forces the library to discard internal node state, causing performance overhead and potentially breaking features (like position tracking).
**Action:** Always use functional state updates (e.g., \`setNodes(nds => nds.map(...))\`) to selectively mutate properties (like CSS \`opacity\`) of existing objects. For edges, to preserve data like labels, save them in the \`data\` object and toggle visibility via style.
