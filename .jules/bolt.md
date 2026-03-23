## 2025-02-23 - [React Flow State Update Optimization]
**Learning:** Recreating entire React Flow node and edge arrays on every state change (e.g., using a map over static data to generate completely new objects) breaks React's internal memoization and causes expensive, unnecessary re-renders.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) to selectively update only the properties (like `style` or `opacity`) of existing node and edge objects when their state changes, returning the existing object reference if no changes are needed.
