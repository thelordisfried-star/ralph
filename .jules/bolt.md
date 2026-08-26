## 2025-02-18 - Replacing functional updates to state without full file parsing
**Learning:** React flow components use generic N^2 object recreation logic in state setters. When refactoring into functional state updates, TypeScript can throw obscure syntax errors if patches are done using greedy string replacements across multiple function closures.
**Action:** Use targeted regex matching or python scripts to prevent unconstrained replacements during patch modifications, ensuring referential equality holds across map callbacks.
