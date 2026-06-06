## 2024-06-06 - Test Verification Artifacts Must Be Removed
**Learning:** Adding a dependency like playwright locally just to run a test script can accidentally pollute the repository with node_modules, package-lock.json changes, and test video artifacts.
**Action:** Always verify the `git status` diff before completing pre-commit steps to ensure no temporary artifacts (like test videos or temporary package additions) are accidentally committed.
