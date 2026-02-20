## 2024-05-22 - React Flow Re-render Trap
**Learning:** `React.memo` on custom nodes is ineffective if `data` or `style` props are new objects every render.
**Action:** Always extract static data to maps and style objects to constants outside the component.
