## 2024-03-17 - React Flow Node Re-render Bottleneck
**Learning:** In React Flow, custom nodes will re-render on every pan/zoom interaction because the internal graph state updates. Wrapping components in `React.memo` isn't enough if inline objects are passed to `data` or `style` props, as these defeat memoization.
**Action:** Always wrap `React Flow` custom node definitions in `React.memo` and extract `data` and `style` objects to static module-level maps or constants to ensure referential stability and prevent unnecessary re-renders.
