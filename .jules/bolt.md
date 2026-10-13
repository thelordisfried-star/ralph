## 2025-02-23 - React Flow Node State Optimization
**Learning:** Replacing O(N) full array recreations (e.g. `setNodes(getNodes(...))`) with React functional state updates (e.g. `setNodes(nds => nds.map(...))`) allows direct modification of node properties while preserving internal state like drag positions, eliminating the need to manually track coordinates via a `useRef`.
**Action:** When updating React Flow elements, prefer functional updates to avoid destroying internal framework state and causing algorithmic regressions.
