
## 2024-06-19 - React Flow Visibility Toggle Bottleneck
**Learning:** In React Flow, toggling visibility of nodes and edges by entirely rebuilding the arrays (e.g., calling `getNodes()` and `edgeConnections.map(...)` on every step change) forces the library to discard internal node dimensions and re-initialize state, creating an O(N) object allocation bottleneck and causing unnecessary complete re-renders.
**Action:** Always implement graph updates using functional state setters (`setNodes(nds => nds.map(...))`) to selectively mutate only the specific `style` properties (like `opacity`) of the existing elements that require changing. This prevents full re-evaluations and smoothly preserves internal React Flow instance state.

## 2024-06-19 - Preserving Edge Fade Animations
**Learning:** When dynamically hiding React Flow edges using functional style updates, changing the `stroke` property (e.g., to `'transparent'`) alongside `opacity: 0` will instantly override the CSS fade transition, causing the edge to disappear immediately and abruptly without animation.
**Action:** To correctly hide edges while preserving smooth animations, keep the base `stroke` color intact (e.g., `#222`) and rely solely on transitioning the `opacity` property between `1` and `0`.
