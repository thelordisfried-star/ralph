
## 2024-05-07 - [Strict unused variables linting error]
**Learning:** In the `flowchart` repository, `@typescript-eslint/no-unused-vars` is strictly enforced as an error. Removing variable usages will cause lint errors.
**Action:** After performing a refactor, always verify and explicitly remove newly orphaned imports (e.g., `useRef`) or helper functions to ensure `npm run lint` successfully passes.
