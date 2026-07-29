const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const createNodeRe = /function createNode\([\s\S]*?return {[\s\S]*?data: {[\s\S]*?phase: step\.phase,[\s\S]*?},[\s\S]*?};[\s\n]*}/;
if (!createNodeRe.test(code)) throw new Error('createNode not found');
code = code.replace(
  createNodeRe,
  `function createNode(step: typeof allSteps[0], visible: boolean, position: { x: number; y: number }, stepIndex: number): Node {
  return {
    id: step.id,
    type: 'custom',
    position: position,
    data: {
      title: step.label,
      description: step.description,
      phase: step.phase,
      stepIndex,
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
    },
  };
}`
);

const createEdgeRe = /function createEdge\([\s\S]*?return {[\s\S]*?markerEnd: {[\s\S]*?color: '#222',[\s\S]*?},[\s\S]*?};[\s\n]*}/;
if (!createEdgeRe.test(code)) throw new Error('createEdge not found');
code = code.replace(
  createEdgeRe,
  `function createEdge(conn: typeof edgeConnections[0], visible: boolean): Edge {
  const sourceIndex = stepIndexMap.get(conn.source) ?? -1;
  const targetIndex = stepIndexMap.get(conn.target) ?? -1;
  return {
    id: \`e\${conn.source}-\${conn.target}\`,
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    label: visible ? conn.label : undefined,
    animated: visible,
    data: {
      sourceIndex,
      targetIndex,
      originalLabel: conn.label,
    },
    style: {
      stroke: '#222',
      strokeWidth: 2,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    },
    labelStyle: {
      fill: '#222',
      fontWeight: 600,
      fontSize: 14,
    },
    labelShowBg: true,
    labelBgPadding: [8, 4] as [number, number],
    labelBgStyle: {
      fill: '#fff',
      stroke: '#222',
      strokeWidth: 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#222',
    },
  };
}`
);

const createNoteNodeRe = /function createNoteNode\([\s\S]*?return {[\s\S]*?data: { content: note\.content, color: note\.color },[\s\S]*?connectable: false,[\s\S]*?};[\s\n]*}/;
if (!createNoteNodeRe.test(code)) throw new Error('createNoteNode not found');
code = code.replace(
  createNoteNodeRe,
  `function createNoteNode(note: typeof notes[0], visible: boolean, position: { x: number; y: number }): Node {
  return {
    id: note.id,
    type: 'note',
    position: position,
    data: { content: note.content, color: note.color, appearsWithStep: note.appearsWithStep },
    style: {
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
    },
    draggable: true,
    selectable: false,
    connectable: false,
  };
}`
);

const getNodesRe = /const getNodes = [\s\S]*?return \[\.\.\.stepNodes, \.\.\.noteNodes\];\n\};\n\n/;
if (!getNodesRe.test(code)) throw new Error('getNodes not found');
code = code.replace(getNodesRe, '');

const getEdgeVisibilityRe = /const getEdgeVisibility = [\s\S]*?return sourceIndex < visibleStepCount && targetIndex < visibleStepCount;\n\};\n\n/;
if (!getEdgeVisibilityRe.test(code)) throw new Error('getEdgeVisibility not found');
code = code.replace(getEdgeVisibilityRe, '');

const initialNodesRe = /  const nodePositions = useRef<\{ \[key: string\]: \{ x: number; y: number \} \}>\(\{ \.\.\.positions \}\);\n\n  \/\/ Use the initial positions object directly to avoid accessing ref during render\n  const initialNodes = useMemo\(\(\) => getNodes\(1, \{ \.\.\.positions \}\), \[\]\);\n  const initialEdges = useMemo\(\(\) => edgeConnections\.map\(\(conn, index\) =>\n    createEdge\(conn, index < 0\)\n  \), \[\]\);/;
if (!initialNodesRe.test(code)) throw new Error('initialNodes not found');
code = code.replace(
  initialNodesRe,
  `  const initialNodes = useMemo<Node[]>(() => {
    const stepNodes = allSteps.map((step, index) =>
      createNode(step, index < 1, positions[step.id], index)
    );
    const noteNodes = notes.map((note) =>
      createNoteNode(note, 1 >= note.appearsWithStep, positions[note.id])
    );
    return [...stepNodes, ...noteNodes];
  }, []);
  const initialEdges = useMemo<Edge[]>(() => edgeConnections.map((conn) => {
    const sourceIndex = stepIndexMap.get(conn.source) ?? -1;
    const targetIndex = stepIndexMap.get(conn.target) ?? -1;
    return createEdge(conn, sourceIndex < 1 && targetIndex < 1);
  }), []);`
);

const onNodesChangeRe = /  const onNodesChange = useCallback\(\n    \(changes: NodeChange\[\]\) => {\n      changes\.forEach\(\(change\) => {\n        if \(change\.type === 'position' && change\.position\) {\n          nodePositions\.current\[change\.id\] = change\.position;\n        }\n      }\);\n      setNodes\(\(nds\) => applyNodeChanges\(changes, nds\)\);\n    },\n    \[setNodes\]\n  \);/;
if (!onNodesChangeRe.test(code)) throw new Error('onNodesChange not found');
code = code.replace(
  onNodesChangeRe,
  `  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );`
);

const handleNextRe = /  const handleNext = useCallback\(\(\) => \{[\s\S]*?\}, \[visibleCount, setNodes, setEdges\]\);\n\n  const handlePrev = useCallback\(\(\) => \{[\s\S]*?\}, \[visibleCount, setNodes, setEdges\]\);/;
if (!handleNextRe.test(code)) throw new Error('handleNext not found');
code = code.replace(
  handleNextRe,
  `  // ⚡ Bolt Optimization: Use functional state updates to preserve internal React Flow node state and avoid O(N) array recreations on every step change.
  const updateVisibility = useCallback((newCount: number) => {
    setNodes((nds) => nds.map((node) => {
      if (!node.data) return node;
      let visible = false;
      if (node.type === 'custom') {
        visible = (node.data.stepIndex as number) < newCount;
      } else if (node.type === 'note') {
        visible = (node.data.appearsWithStep as number) <= newCount;
      }

      const newOpacity = visible ? 1 : 0;
      if (node.style?.opacity === newOpacity) return node;

      return {
        ...node,
        style: {
          ...node.style,
          opacity: newOpacity,
          pointerEvents: (visible ? 'auto' : 'none') as 'auto' | 'none',
        },
      };
    }));

    setEdges((eds) => eds.map((edge) => {
      if (!edge.data) return edge;
      const visible = (edge.data.sourceIndex as number) < newCount && (edge.data.targetIndex as number) < newCount;
      const newOpacity = visible ? 1 : 0;
      if (edge.style?.opacity === newOpacity) return edge;

      return {
        ...edge,
        label: visible ? (edge.data.originalLabel as string | undefined) : undefined,
        animated: visible,
        style: {
          ...edge.style,
          opacity: newOpacity,
        },
      };
    }));
  }, [setNodes, setEdges]);

  const handleNext = useCallback(() => {
    if (visibleCount < allSteps.length) {
      const newCount = visibleCount + 1;
      setVisibleCount(newCount);
      updateVisibility(newCount);
    }
  }, [visibleCount, updateVisibility]);

  const handlePrev = useCallback(() => {
    if (visibleCount > 1) {
      const newCount = visibleCount - 1;
      setVisibleCount(newCount);
      updateVisibility(newCount);
    }
  }, [visibleCount, updateVisibility]);`
);

const handleResetRe = /  const handleReset = useCallback\(\(\) => \{\n    setVisibleCount\(1\);\n    nodePositions\.current = \{ \.\.\.positions \};\n    setNodes\(initialNodes\);\n    setEdges\(initialEdges\);\n  \}, \[setNodes, setEdges, initialNodes, initialEdges\]\);/;
if (!handleResetRe.test(code)) throw new Error('handleReset not found');
code = code.replace(
  handleResetRe,
  `  const handleReset = useCallback(() => {
    setVisibleCount(1);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges, initialNodes, initialEdges]);`
);

fs.writeFileSync('src/App.tsx', code);
console.log('Patched App.tsx');
