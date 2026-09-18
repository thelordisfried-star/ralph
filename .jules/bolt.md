## 2024-11-20 - [Optimize node updates in React Flow]
**Learning:** Replacing the entire `nodes` array causes O(N) recreations and drops internal node state like user drag positions. Moving the Maps outside avoids unnecessary initializations.
**Action:** Use functional state updates instead of replacing the entire nodes array. Move Maps outside the component body. Make sure not to introduce extraneous files to commits.
