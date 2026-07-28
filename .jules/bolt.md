## 2025-02-14 - Functional State Updates in React Flow
**Learning:** Completely recreating the `nodes` and `edges` arrays on every step/visibility change forces React Flow to do a massive amount of internal reconciliation, which degrades performance.
**Action:** By embedding static metadata (`stepIndex`, `originalLabel`, etc.) into `data` during initialization, we can use functional updates (e.g. `setNodes(nds => nds.map(...))`) to selectively toggle `opacity` and `pointerEvents`. This maintains referential equality for unmodified elements, significantly reducing re-renders.
