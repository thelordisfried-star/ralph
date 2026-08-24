import subprocess
import json
import sys

def submit_pr():
    title = "⚡ Bolt: Optimize node updates to O(1) referentially by removing object recreation"
    description = """💡 What: Refactored `handleNext` and `handlePrev` to use functional state updates with strict referential equality checks, avoiding O(N) object map recreations on every step. Also eliminated the `nodePositions` ref cache, pulling directly from functional state.
🎯 Why: React Flow was recreating every single node and edge object from scratch whenever the step counter changed. This caused a heavy performance bottleneck and broke memoization because referential equality was lost, triggering unnecessary full re-renders of the canvas.
📊 Impact: Modifying steps is now an algorithmic O(1) operation regarding DOM elements updated. Unchanged elements preserve referential equality and skip re-renders. Reduces memory allocations heavily.
🔬 Measurement: Test step navigation in dev tools profiler; unchanged nodes no longer emit render ticks.

Changes:
* Refactored State Updates: Replaced `getNodes` with an inline map in `setNodes`/`setEdges` that returns original elements if visibility hasn't changed.
* Removed Ref caching: Deleted `nodePositions` since structural nodes now hold their true position state directly in their references.
* Mapped Array Lookups: Replaced `.find` and inner iterations with `Map` for constant time lookups of `appearsWithStep`."""

    with open("pr_data.json", "w") as f:
        json.dump({
            "title": title,
            "description": description,
            "commit_message": title + "\n\n" + description,
            "branch_name": "bolt-optimize-o1-updates"
        }, f)

if __name__ == "__main__":
    submit_pr()
