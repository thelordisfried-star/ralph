## 2024-03-27 - React Flow Render Opt
**Learning:** React Flow triggers a re-render/re-evaluation when arrays/objects passed to its props are recreated inline on every render (e.g. `fitViewOptions={{ padding: 0.2 }}`, `deleteKeyCode={["Backspace", "Delete"]}`). These need referential stability.
**Action:** Extract these to module-level constants to prevent unnecessary graph re-evaluations.
