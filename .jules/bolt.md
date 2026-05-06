## 2024-05-06 - [ReactFlow Re-render Prevention via Static Props]
**Learning:** Extracting inline prop objects/arrays like `fitViewOptions={{ padding: 0.2 }}` and `deleteKeyCode={['Backspace', 'Delete']}` in `<ReactFlow>` to module-level constants prevents massive unnecessary re-evaluation/re-rendering of the entire flowchart tree whenever a parent state (like `visibleCount`) updates, because it maintains prop referential stability.
**Action:** Always extract configuration props that are structurally static to module-level constants before passing them to heavy components like `ReactFlow`.
