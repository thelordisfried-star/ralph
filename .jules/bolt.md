## 2024-05-17 - React Flow Array Recreation Bottleneck
**Learning:** React Flow completely discards internal node state and forces expensive re-initializations (losing X/Y coords without `useRef` tracking) if the entire nodes and edges arrays are re-created from scratch on every state update (e.g., `setNodes(getNodes(newCount))`).
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) and selectively mutate `style` properties (like `opacity`) of existing element references to achieve O(1) visibility toggling while preserving native library state.
