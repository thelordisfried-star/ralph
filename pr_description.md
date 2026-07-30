## 💡 What

Refactored the React Flow state updates in `handleNext` and `handlePrev` to utilize functional state updates (`setNodes(nds => nds.map(...))`) instead of re-creating the entire node and edge arrays from scratch on every step change. Embedded static routing logic (`stepIndex`, `appearsWithStep`, etc.) into the `data` properties of nodes and edges during initialization to enable O(1) state resolution. This change also naturally preserves internal React Flow layout state during pan/zoom operations without needing brittle `useRef` position tracking, which has been removed.

## 🎯 Why

Previously, every click of "Next" or "Prev" destroyed and re-created the entire array of nodes and edges by calling `getNodes()`. This forced React Flow to discard internal node state, required N object allocations per click, and necessitated a manual `nodePositions` ref workaround just to remember where the user had dragged nodes.

## 📊 Impact

- **Reduces re-renders:** Nodes and edges whose visibility hasn't changed preserve referential equality.
- **Layout Preservation:** React Flow now natively handles node positions during pan/zoom since elements aren't being continually destroyed.
- **Memory Optimization:** Eliminates N object allocations per click by mutating styles on existing objects instead of returning new ones when unchanged.

## 🔬 Measurement

- Verified behavior with Playwright visual testing to ensure nodes appear correctly per step.
- Verified `pnpm run lint` and `pnpm run build` pass cleanly with no unused variables.

## Index Log

- **App.tsx: Update Node Initialization:** Embedded `stepIndex` and `appearsWithStep` into the `data` payload of `createNode` and `createNoteNode`.
- **App.tsx: Update Edge Initialization:** Embedded `sourceIndex`, `targetIndex`, and `originalLabel` into the `data` payload of `createEdge`.
- **App.tsx: Remove Legacy Generators:** Deleted `getNodes` and `getEdgeVisibility` since metadata is now static.
- **App.tsx: Remove Ref Tracking:** Deleted the `nodePositions` ref and its associated import.
- **App.tsx: Functional State Updates:** Rewrote `handleNext` and `handlePrev` to use `setNodes` and `setEdges` with `.map()`, returning the original element if target styles match.
