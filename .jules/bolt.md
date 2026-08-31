## 2024-08-31 - [Optimize React Flow array recreation]
**Learning:** [Replacing entire arrays of React Flow nodes and edges causes massive layout thrashing, forces expensive graph re-parsing, and destroys internal node states like drag positions.]
**Action:** [Instead of replacing entire state arrays to toggle elements, use selective functional state updates (`.map()`) to toggle individual properties (like opacity, pointerEvents, and animated) while returning unmodified objects verbatim to preserve referential equality and O(1) performance.]

## 2024-08-31 - [Playwright and node_modules pollution]
**Learning:** [Installing Playwright locally to run UI visual verification tests pollutes `package.json`, `package-lock.json`, and the `node_modules` folder. This directly violates persona boundary rules against modifying dependencies without permission.]
**Action:** [Avoid running `npm install playwright` or any similar commands that alter project dependencies. If required for verification, ensure all generated artifacts and changes are completely reverted (`git checkout`, `rm -rf node_modules`) before the final code review or submission.]

## 2024-08-31 - [Static map initializations and Hooks]
**Learning:** [Creating mapping dictionaries (e.g., `new Map(...)`) inside a React component body—even if wrapped in `useMemo`—can trigger exhaustive-deps linting rules or require unnecessary hook dependencies when used inside a `useCallback`.]
**Action:** [If the source data for a dictionary is completely static and defined outside the component, define the `Map` outside the component as well. This guarantees it will never change, avoids linting warnings, and removes the need to include it in dependency arrays.]
