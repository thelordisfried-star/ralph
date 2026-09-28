## 2024-10-24 - Optimizing React Flow State Updates
**Learning:** Replacing entire arrays via \`setNodes(getNodes(...))\` in React Flow destroys internal state (like user-dragged coordinates) and triggers full re-renders (O(N) recreation).
**Action:** Use functional state updates (\`setNodes(nds => nds.map(...))\`) to directly mutate specific properties (like opacity/pointerEvents) on existing objects. This preserves internal state and eliminates the need for manual \`useRef\` coordinate tracking.
