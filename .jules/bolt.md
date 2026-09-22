## 2024-05-24 - Preserving Internal State in React Flow

**Learning:** When using external UI state libraries like React Flow, functionally replacing the entire state array (e.g. `setNodes(getNodes(...))`) forces the library to reconcile and recreate DOM elements, which wipes out internal tracked states like dragged node positions.

**Action:** When updating node or edge styles based on user interactions, always map over the existing state (`nds.map(node => ...)`) to mutate only the necessary properties. This preserves internal library state, prevents the need for manual tracking refs (like `nodePositions`), and vastly improves rendering performance.
