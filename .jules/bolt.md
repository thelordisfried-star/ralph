## 2024-10-31 - React Flow Internal State Preservation
**Learning:** In React Flow, replacing the entire \`nodes\` array instead of selectively modifying it via functional state updates (e.g., \`setNodes(nds => nds.map(...))\`) destroys internal state, such as node positions updated by user drag events.
**Action:** Shift from full re-creations (\`setNodes(getNodes(...))\`) to functional updates to allow direct modification of existing node properties without replacing the entire object, preserving internal state and eliminating the need for a manual \`useRef\`.
