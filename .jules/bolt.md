
## 2024-06-15 - React Flow Optimization: Style Updates instead of Recreations
**Learning:** In React Flow, when conditionally showing/hiding large numbers of nodes and edges, recreating them in state via mapping (e.g. `setNodes(getNodes(...))`) destroys their referential identity. This triggers O(N) full re-renders inside React Flow, drastically dropping transition FPS.
**Action:** Replace node/edge state recreations with functional state updates that map over existing nodes/edges and only update their `style` (e.g. `opacity`, `pointerEvents`) for visibility toggling. This preserves referential equality and React.memo boundaries, improving visual transition performance significantly.
