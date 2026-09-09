## 2024-09-09 - React Flow Node Position State Destruction
**Learning:** In React Flow, replacing the entire \`nodes\` array instead of selectively modifying it via functional state updates destroys internal state, such as node positions updated by user drag events. This forced the previous implementation to track positions manually using a \`useRef\`.
**Action:** Use functional state updates (e.g., \`setNodes(nds => nds.map(...))\`) with referential equality checks to toggle visibility properties without destroying internal React Flow state or re-allocating untouched objects.
