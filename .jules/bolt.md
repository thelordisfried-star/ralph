## 2024-10-04 - Optimize React Flow array updates
**Learning:** Replacing the entire nodes array on pagination destroys React Flow's native internal state (like drag positions), leading to unnecessary object allocation (O(N) recreation) and requiring hacky manual DOM position syncing via a useRef.
**Action:** Use functional state updates (.map()) to directly modify existing node/edge properties (e.g. opacity) without full re-creation, preserving native state and eliminating the need for manual tracking.
