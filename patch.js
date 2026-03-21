const fs = require('fs');

let content = fs.readFileSync('flowchart/src/App.tsx', 'utf8');

const getEdgeVisibilityRegex = /const getEdgeVisibility = \(conn: typeof edgeConnections\[0\], visibleStepCount: number\) => {\s+const sourceIndex = stepIndexMap.get\(conn.source\) \?\? -1;\s+const targetIndex = stepIndexMap.get\(conn.target\) \?\? -1;\s+return sourceIndex < visibleStepCount && targetIndex < visibleStepCount;\s+};/;

// Let's modify handleNext, handlePrev, handleReset to use functional state updates.
// We also need to get nodeVisibility to know which nodes to show/hide.
// Wait, for nodes, we can determine visibility based on their ID.
// For step nodes: their index in allSteps < count.
// For note nodes: count >= note.appearsWithStep.

// Let's create helper functions for determining node/edge visibility given an id/source/target and the count.
content = content.replace(getEdgeVisibilityRegex, `const getEdgeVisibility = (conn: typeof edgeConnections[0] | Edge, visibleStepCount: number) => {
  const sourceIndex = stepIndexMap.get(conn.source) ?? -1;
  const targetIndex = stepIndexMap.get(conn.target) ?? -1;
  return sourceIndex < visibleStepCount && targetIndex < visibleStepCount;
};

const isNodeVisible = (id: string, count: number) => {
  const stepIndex = stepIndexMap.get(id);
  if (stepIndex !== undefined) {
    return stepIndex < count;
  }
  const note = notes.find(n => n.id === id);
  if (note) {
    return count >= note.appearsWithStep;
  }
  return false;
};`);

// Replace handleNext
content = content.replace(/const handleNext = useCallback\(\(\) => \{[\s\S]*?\}, \[visibleCount, setNodes, setEdges\]\);/, `const handleNext = useCallback(() => {
    if (visibleCount < allSteps.length) {
      const newCount = visibleCount + 1;
      setVisibleCount(newCount);

      // ⚡ Bolt Optimization: Update existing nodes/edges instead of recreating them
      setNodes((nds) => nds.map((node) => {
        const visible = isNodeVisible(node.id, newCount);
        // Only update if visibility changed to avoid unnecessary re-renders
        if ((node.style?.opacity === 1) === visible) return node;
        return {
          ...node,
          style: {
            ...node.style,
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
          }
        };
      }));

      setEdges((eds) => eds.map((edge) => {
        const visible = getEdgeVisibility(edge, newCount);
        if ((edge.style?.opacity === 1) === visible) return edge;
        return {
          ...edge,
          animated: visible,
          label: visible ? edgeConnections.find(c => c.source === edge.source && c.target === edge.target)?.label : undefined,
          style: {
            ...edge.style,
            opacity: visible ? 1 : 0,
          }
        };
      }));
    }
  }, [visibleCount, setNodes, setEdges]);`);

// Replace handlePrev
content = content.replace(/const handlePrev = useCallback\(\(\) => \{[\s\S]*?\}, \[visibleCount, setNodes, setEdges\]\);/, `const handlePrev = useCallback(() => {
    if (visibleCount > 1) {
      const newCount = visibleCount - 1;
      setVisibleCount(newCount);

      // ⚡ Bolt Optimization: Update existing nodes/edges instead of recreating them
      setNodes((nds) => nds.map((node) => {
        const visible = isNodeVisible(node.id, newCount);
        if ((node.style?.opacity === 1) === visible) return node;
        return {
          ...node,
          style: {
            ...node.style,
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
          }
        };
      }));

      setEdges((eds) => eds.map((edge) => {
        const visible = getEdgeVisibility(edge, newCount);
        if ((edge.style?.opacity === 1) === visible) return edge;
        return {
          ...edge,
          animated: visible,
          label: visible ? edgeConnections.find(c => c.source === edge.source && c.target === edge.target)?.label : undefined,
          style: {
            ...edge.style,
            opacity: visible ? 1 : 0,
          }
        };
      }));
    }
  }, [visibleCount, setNodes, setEdges]);`);

// Replace handleReset
content = content.replace(/const handleReset = useCallback\(\(\) => \{[\s\S]*?\}, \[setNodes, setEdges\]\);/, `const handleReset = useCallback(() => {
    setVisibleCount(1);
    nodePositions.current = { ...positions };

    // ⚡ Bolt Optimization: Update existing nodes/edges instead of recreating them
    setNodes((nds) => nds.map((node) => {
      const visible = isNodeVisible(node.id, 1);
      return {
        ...node,
        position: positions[node.id] || node.position,
        style: {
          ...node.style,
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
        }
      };
    }));

    setEdges((eds) => eds.map((edge, index) => {
      const visible = index < 0; // The original code had index < 0, meaning all edges invisible on reset
      return {
        ...edge,
        animated: visible,
        label: visible ? edgeConnections.find(c => c.source === edge.source && c.target === edge.target)?.label : undefined,
        style: {
          ...edge.style,
          opacity: visible ? 1 : 0,
        }
      };
    }));
  }, [setNodes, setEdges]);`);

fs.writeFileSync('flowchart/src/App.tsx', content);
console.log('Patch applied.');
