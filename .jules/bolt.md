## 2024-03-04 - React.memo Referential Stability in App.tsx
**Learning:** Passing inline objects to `style` and `data` props in ReactFlow nodes negates the benefits of React.memo, causing all nodes to re-render when ANY state changes.
**Action:** Extract inline styles into external CSSProperties constants and use static maps (like `stepDataMap`) for static node data to preserve referential stability.
