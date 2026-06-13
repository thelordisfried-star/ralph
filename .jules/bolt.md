## 2025-06-13 - [ReactFlow Re-render Optimization]
**Learning:** In the flowchart UI, using functional state updates (`setNodes(nds => nds.map(...))`) instead of re-instantiating new component arrays significantly improves rendering performance and intrinsically preserves untracked ReactFlow state (like viewport drag).
**Action:** When updating visible items in a canvas/ReactFlow library, always prefer mutating CSS `opacity` and `pointerEvents` on existing objects via functional setters instead of re-running the array creation pipeline.
