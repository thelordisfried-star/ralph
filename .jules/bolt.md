## 2025-02-14 - React Flow Node Style Unification
**Learning:** Attempting to unify styles for different React Flow node types caused a regression. `Step` nodes require fixed dimensions, while `Note` nodes rely on content-based sizing. Unifying them into a single `visibleStyle` constrained `Note` nodes incorrectly.
**Action:** When optimizing styles for multiple component types, verify if they share the same layout constraints (fixed vs fluid) before merging them into a single constant. Split constants by component type if constraints differ.
