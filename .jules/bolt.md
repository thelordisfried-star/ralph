## 2025-02-19 - React Flow Node Optimization
**Learning:** React Flow re-renders all nodes when the parent updates unless custom node components are memoized AND receive referentially stable props. Even with `React.memo`, passing new inline style or data objects on every render breaks memoization.
**Action:** Always wrap custom node components in `React.memo`. Define static style constants and pre-compute data maps outside the component to ensure prop stability, especially for properties like `style` and `data` that are often recreated inline.
