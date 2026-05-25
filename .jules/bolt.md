## 2024-05-25 - React Flow State Optimization
**Learning:** In React Flow, entirely recreating the `nodes` and `edges` arrays on every state change forces O(N) object allocations and potential graph re-renders.
**Action:** When updating edge or node properties dynamically (e.g., visibility), use functional state setters (`setNodes(nds => nds.map(...))`) and selectively mutate `style` objects. Ensure custom data properties (like `originalLabel`) are explicitly typed when retrieved from `edge.data` to prevent TypeScript generic inference failures.
