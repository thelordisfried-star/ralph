## 2024-05-11 - React Flow Node Regeneration
**Learning:** In `@xyflow/react`, explicitly recreating nodes/edges arrays on every state change breaks internal memoization and forces expensive re-renders and layout resets.
**Action:** Use functional state updates (`setNodes(prev => prev.map(...))`) and modify only necessary properties (like `style.opacity`) instead of recreating the whole elements.
