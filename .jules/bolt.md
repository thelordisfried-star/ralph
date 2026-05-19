## 2024-05-16 - Memoization Ref-Stability Learnings
**Learning:** React Flow heavily relies on `React.memo` for nodes and edges (during pan/zoom/scroll). Inline `style` or `data` objects break this memoization by allocating new objects on every render.
**Action:** Use static maps (`STEP_DATA_BY_ID`, `NOTE_DATA_BY_ID`) and constant objects (`VISIBLE_STEP_STYLE`, `HIDDEN_STEP_STYLE`) instead of inline creation for `data` and `style` props to preserve referential stability.
