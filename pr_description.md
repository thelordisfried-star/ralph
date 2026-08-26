💡 What: Refactored `handleNext` and `handlePrev` to use functional state updates (`setNodes(nds => nds.map(...))`) with referential equality checks and pre-computed Maps for O(1) lookups.
🎯 Why: The previous implementation rebuilt every node and edge object from scratch on every step change, triggering unnecessary O(N) object allocations and causing expensive full-component re-renders in React Flow.
📊 Impact: Eliminates unnecessary object allocations and preserves component reference identities, significantly reducing re-render overhead during step transitions, while keeping lookups O(1) to avoid algorithmic regressions.
🔬 Measurement: Profile the React component tree during next/prev clicks; notice that untouched nodes no longer trigger React re-renders.

- ⚡ Bolt: Add referential equality checks to handleNext and handlePrev using O(1) map lookups
