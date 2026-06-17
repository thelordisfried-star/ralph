## 2024-03-24 - [React Flow State Re-initialization Overhead]
**Learning:** [Re-creating node and edge arrays completely forces ReactFlow to dump internal node state, causing massive re-initializations and requiring anti-patterns like tracking positions via React refs during pans/drags.]
**Action:** [Use functional state updates (`nds.map`) to selectively mutate node/edge properties (like styles) instead of generating new element trees to preserve underlying React Flow engine states and avoid O(N) allocation overheads.]
