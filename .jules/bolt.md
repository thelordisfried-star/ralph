
## 2024-09-12 - React Flow Functional State Updates Optimization
**Learning:** In React Flow, blindly reconstructing array objects via O(N) map and recreations can lead to performance problems, particularly if array find/lookup functions inside those map iterations push complexity to O(N^2). We removed `useRef` based O(N) positions lookup and instead used Maps `noteVisibilityMap`, `edgeLabelMap` initialized outside the component for O(1) lookups during functional state updates (e.g. `setNodes((nds) => nds.map(...))`). By preserving referential equality (`if (node.style?.opacity === opacity) return node;`), we avoid unnecessary re-renders when stepping through the flowchart.
**Action:** Always favor functional state updates that preserve existing element identities rather than recomputing entire node/edge arrays for dynamic styling or visibility changes.

## 2026-09-12 - React Flow Code Quality and Optimization
**Learning:** During optimization of functional state updates in React Flow, avoiding code duplication across related event handlers (e.g. handleNext, handlePrev) by extracting state mapping logic into a shared `updateVisibility` helper reduces code footprint and simplifies maintenance significantly.
**Action:** Extract reusable O(1) state array mappers into helper functions inside the component when multiple handlers perform similar bulk state updates.
