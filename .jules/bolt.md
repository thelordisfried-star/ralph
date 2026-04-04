## 2024-05-24 - React Ref Access During Render Error

**Learning:** Accessing a ref (`nodePositions.current`) inside a `useMemo` factory function during render causes a React strict mode or ESLint error (`react-hooks/refs`). React Flow requires stable objects/initial states, but reading refs synchronously during render violates React concurrency rules.

**Action:** Replace `nodePositions.current` with the static module-level `positions` constant when initializing `initialNodes` in `useMemo` to ensure referential stability and comply with React rendering rules.
