## 2024-05-23 - React Flow Initial State Calculation
**Learning:** React Flow's `useNodesState` and `useEdgesState` only use the initial value once, but passing an expression like `getNodes(1)` inside the component body causes that expression to be evaluated on *every* render, wasting cycles creating objects that are immediately discarded.
**Action:** Always move `initialNodes` / `initialEdges` calculation outside the component or use lazy initialization `useState(() => getNodes(1))` if they are expensive.
