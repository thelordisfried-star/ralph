## 2025-05-12 - React Flow In-Place State Mapping
**Learning:** Recreating node/edge objects entirely (even with identical properties) on every state change forces React Flow to unmount and remount elements, destroying pan/zoom/drag interactions and causing layout thrashing.
**Action:** When updating visibility or styles, map over the *existing* node/edge arrays and only return a new spread object if the properties *actually* need to change. This preserves object references for unmodified elements and allows React Flow to batch updates efficiently.
