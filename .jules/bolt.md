## 2025-02-28 - React Flow State Mutability
**Learning:** Re-creating entire Node and Edge arrays (`setNodes(getNodes())`) in React Flow instead of selectively mapping over them (`setNodes(nds => nds.map(...))`) destroys internal node state like dragged coordinates, forcing the use of manual `useRef` coordinate syncing hacks.
**Action:** Always prefer functional state updates that map over existing elements and modify specific properties to preserve internal flow state and reduce garbage collection.
