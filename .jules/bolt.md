## 2025-05-23 - React Flow Performance
**Learning:** React Flow nodes often re-render unnecessarily because `data` and `style` props are recreated on every render of the parent component.
**Action:** Pre-calculate static `data` and `style` objects outside the component or use `useMemo` to ensure referential stability, enabling `React.memo` to work effectively.
