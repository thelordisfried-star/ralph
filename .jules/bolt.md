## 2024-03-24 - Preserving Internal State in React Flow
**Learning:** Overwriting the entire `nodes` array instead of using functional state updates (`nds.map`) destroys internal React Flow node states (like dragged positions). Always update React Flow nodes via `.map()` when toggling visibility/styles to preserve referential equality and node positions.
**Action:** Use functional state updates for elements with their own internal user states instead of recreating the array entirely. Check if `element.style.opacity === newOpacity` and return `element` unchanged to optimize renders.
