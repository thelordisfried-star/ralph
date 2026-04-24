## 2024-03-21 - Optimize ralph agent loop
**Learning:** Shell script code reviews strictly block PRs containing out-of-scope modifications. Do not include unrelated changes (e.g., fixing existing linter warnings in other directories) in a targeted task PR.
**Action:** When working on an optimization, ensure the final commit contains *only* the specific file explicitly requested, using `git status` and `git checkout` to remove unrelated modifications before submitting.
