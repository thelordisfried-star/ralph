## 2025-03-08 - Recreating Array States In React Flow Disrupts Node Interactions
**Learning:** Attempting to update a React Flow diagram by generating and passing a brand-new nodes/edges array per step destroys internal element state (such as coordinates assigned by user dragging) causing drag resets and unnecessary large-scale DOM recalculations.
**Action:** Always prefer updating elements efficiently using functional state mappers (`setNodes(nds => nds.map(...))`), while retaining unmodified array references when updates are not required (O(1) optimization).
