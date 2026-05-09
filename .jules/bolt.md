
## 2024-05-09 - React Flow Memoization & Component Stability
**Learning:** React Flow completely discards edge/node references if they are fully recreated on every state update, leading to major performance penalties even if components are memoized. Additionally, refactoring initial state creation functions (`getNodes`) must ensure baseline properties like layout coordinates (`positions`) are still injected so the layout doesn't collapse on reset or initialization.
**Action:** Always use functional setters (`setNodes(nds => nds.map(...))`) to preserve unmodified node/edge object references. When refactoring parameter lists of initialization functions, rigorously verify that required base configuration (like positions) remains intact.
