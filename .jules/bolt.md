## 2024-05-08 - React Flow State Optimization
**Learning:** Recreating node and edge arrays on every step change forces complete O(N) object allocations and breaks internal React Flow positional state unless manually tracked.
**Action:** Use functional state setters (e.g., `setNodes(nds => nds.map(...))`) to selectively update only the properties (like visibility/style) that change, preserving referential stability and delegating positional state tracking naturally to React Flow.
