## 2025-05-23 - React Flow Array Replacements
**Learning:** Replacing entire React Flow `nodes` and `edges` arrays on timeline step changes causes heavy O(N) DOM churn and resets internal Node states (like drag positions), as React Flow must re-parse and remount the entities.
**Action:** Always use functional state updates (`setNodes(nds => nds.map(...))`) inside a shared helper to selectively update properties like `style.opacity` while preserving node identity and internal interaction states.
