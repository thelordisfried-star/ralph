## 2025-02-12 - Prevent Re-creating Graph Arrays in React Flow

**Learning:** Re-creating entire node and edge arrays from scratch on every state update (e.g. \`setNodes(getNodes(...))\`) forces React Flow to discard internal node state and causes significant performance bottlenecks during interactive steps. O(1) graph state updates using node and edge maps should be prioritized.

**Action:** Refactor state updates to use \`updateVisibility\` type functional setters, checking if styles matched their desired state to prevent useless modifications to objects, preserving referential stability.
