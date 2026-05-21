## 2024-05-21 - [React Flow Selective Updates]
**Learning:** React Flow node and edge recreation causes heavy O(N) garbage collection and breaks UI referential stability during simple visibility toggling.
**Action:** Instead of recreating elements via `getNodes` and map functions on every next/prev step, use functional setters (`setNodes(nds => nds.map(...))`) to selectively mutate only the `style.opacity` and `style.pointerEvents` of existing elements. This pattern dramatically improves React Flow rendering performance.
