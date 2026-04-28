import { useCallback, useState, useMemo, memo } from 'react';
import type { CSSProperties } from 'react';
import type { Node, Edge, NodeChange, EdgeChange, Connection } from '@xyflow/react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  reconnectEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

const nodeWidth = 240;
const nodeHeight = 70;

type Phase = 'setup' | 'loop' | 'decision' | 'done';

const phaseColors: Record<Phase, { bg: string; border: string }> = {
  setup: { bg: '#ffffff', border: '#000000' },
  loop: { bg: '#ffffff', border: '#000000' },
  decision: { bg: '#ffffff', border: '#000000' },
  done: { bg: '#ffffff', border: '#000000' },
};

// ⚡ Bolt Optimization: Extracted style constants to prevent object recreation on every render, maximizing React.memo benefits.
const visibleStepStyle: CSSProperties = { width: nodeWidth, height: nodeHeight, opacity: 1, transition: 'opacity 0.5s ease-in-out', pointerEvents: 'auto' };
const hiddenStepStyle: CSSProperties = { width: nodeWidth, height: nodeHeight, opacity: 0, transition: 'opacity 0.5s ease-in-out', pointerEvents: 'none' };

const visibleNoteStyle: CSSProperties = { opacity: 1, transition: 'opacity 0.5s ease-in-out', pointerEvents: 'auto' };
const hiddenNoteStyle: CSSProperties = { opacity: 0, transition: 'opacity 0.5s ease-in-out', pointerEvents: 'none' };

const visibleEdgeStyle: CSSProperties = { stroke: '#222', strokeWidth: 2, opacity: 1, transition: 'opacity 0.5s ease-in-out' };
const hiddenEdgeStyle: CSSProperties = { stroke: '#222', strokeWidth: 2, opacity: 0, transition: 'opacity 0.5s ease-in-out' };

const edgeLabelStyle: CSSProperties = { fill: '#222', fontWeight: 600, fontSize: 14 };
const edgeLabelBgStyle: CSSProperties = { fill: '#fff', stroke: '#222', strokeWidth: 1 };
const edgeLabelBgPadding: [number, number] = [8, 4];
const edgeMarkerEnd = { type: MarkerType.ArrowClosed, color: '#222' };

// ⚡ Bolt Optimization: Extracted fitViewOptions and deleteKeyCode to maintain referential stability for ReactFlow props.
const fitViewOptions = { padding: 0.2 };
const deleteKeyCode = ['Backspace', 'Delete'];

const allSteps: { id: string; label: string; description: string; phase: Phase }[] = [
  { id: '1', label: 'You write a PRD', description: 'Define what you want to build', phase: 'setup' },
  { id: '2', label: 'Convert to prd.json', description: 'Break into small user stories', phase: 'setup' },
  { id: '3', label: 'Run ralph.sh', description: 'Starts the autonomous loop', phase: 'setup' },
  { id: '4', label: 'Amp picks a story', description: 'Finds next passes: false', phase: 'loop' },
  { id: '5', label: 'Implements it', description: 'Writes code, runs tests', phase: 'loop' },
  { id: '6', label: 'Commits changes', description: 'If tests pass', phase: 'loop' },
  { id: '7', label: 'Updates prd.json', description: 'Sets passes: true', phase: 'loop' },
  { id: '8', label: 'Logs to progress.txt', description: 'Saves learnings', phase: 'loop' },
  { id: '9', label: 'More stories?', description: '', phase: 'decision' },
  { id: '10', label: 'Done!', description: 'All stories complete', phase: 'done' },
];

const notes = [
  {
    id: 'note-1',
    appearsWithStep: 2,
    position: { x: 340, y: 100 },
    color: { bg: '#ffffff', border: '#000000' },
    content: `{\n  "id": "US-001",\n  "title": "Add priority field to database",\n  "acceptanceCriteria": [\n    "Add priority column to tasks table",\n    "Generate and run migration",\n    "Typecheck passes"\n  ],\n  "passes": false\n}`,
  },
  {
    id: 'note-2',
    appearsWithStep: 8,
    position: { x: 480, y: 620 },
    color: { bg: '#ffffff', border: '#000000' },
    content: `Also updates AGENTS.md with\npatterns discovered, so future\niterations learn from this one.`,
  },
];

// ⚡ Bolt Optimization: Static data maps to ensure referential stability for node 'data' props.
const stepDataMap = new Map(allSteps.map(step => [step.id, { title: step.label, description: step.description, phase: step.phase }]));
const noteDataMap = new Map(notes.map(note => [note.id, { content: note.content, color: note.color }]));
const noteAppearsMap = new Map(notes.map(note => [note.id, note.appearsWithStep]));
const stepIndexMap = new Map(allSteps.map((s, i) => [s.id, i]));

const positions: { [key: string]: { x: number; y: number } } = {
  '1': { x: 20, y: 20 },
  '2': { x: 80, y: 130 },
  '3': { x: 60, y: 250 },
  '4': { x: 40, y: 420 },
  '5': { x: 450, y: 300 },
  '6': { x: 750, y: 450 },
  '7': { x: 470, y: 520 },
  '8': { x: 200, y: 620 },
  '9': { x: 40, y: 720 },
  '10': { x: 350, y: 880 },
  ...Object.fromEntries(notes.map(n => [n.id, n.position])),
};

const edgeConnections: { source: string; target: string; sourceHandle?: string; targetHandle?: string; label?: string }[] = [
  { source: '1', target: '2', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '2', target: '3', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '3', target: '4', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '4', target: '5', sourceHandle: 'right', targetHandle: 'left' },
  { source: '5', target: '6', sourceHandle: 'right', targetHandle: 'top' },
  { source: '6', target: '7', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '7', target: '8', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '8', target: '9', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '9', target: '4', sourceHandle: 'top-source', targetHandle: 'bottom-target', label: 'Yes' },
  { source: '9', target: '10', sourceHandle: 'bottom', targetHandle: 'top', label: 'No' },
];

// ⚡ Bolt Optimization: Maps for edge visibility logic.
const edgeSourceIndexMap = new Map(edgeConnections.map(conn => [`e${conn.source}-${conn.target}`, stepIndexMap.get(conn.source) ?? -1]));
const edgeTargetIndexMap = new Map(edgeConnections.map(conn => [`e${conn.source}-${conn.target}`, stepIndexMap.get(conn.target) ?? -1]));
const edgeLabelMap = new Map(edgeConnections.map(conn => [`e${conn.source}-${conn.target}`, conn.label]));

// ⚡ Bolt Optimization: Wrapped CustomNode in React.memo to prevent unnecessary re-renders during pan/zoom operations.
const CustomNode = memo(function CustomNode({ data }: { data: { title: string; description: string; phase: Phase } }) {
  const colors = phaseColors[data.phase];
  return (
    <div
      className="custom-node"
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border
      }}
    >
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Right} id="right-target" style={{ right: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ bottom: 0 }} />
      <Handle type="source" position={Position.Top} id="top-source" />
      <Handle type="source" position={Position.Left} id="left-source" />
      <div className="node-content">
        <div className="node-title">{data.title}</div>
        {data.description && <div className="node-description">{data.description}</div>}
      </div>
    </div>
  );
});

// ⚡ Bolt Optimization: Wrapped NoteNode in React.memo to prevent unnecessary re-renders during pan/zoom operations.
const NoteNode = memo(function NoteNode({ data }: { data: { content: string; color: { bg: string; border: string } } }) {
  return (
    <div
      className="note-node"
      style={{
        backgroundColor: data.color.bg,
        borderColor: data.color.border,
      }}
    >
      <pre>{data.content}</pre>
    </div>
  );
});

const nodeTypes = { custom: CustomNode, note: NoteNode };

function createNode(step: typeof allSteps[0], visible: boolean, position?: { x: number; y: number }): Node {
  return {
    id: step.id,
    type: 'custom',
    position: position || positions[step.id],
    data: stepDataMap.get(step.id)!,
    style: visible ? visibleStepStyle : hiddenStepStyle,
  };
}

function createEdge(conn: typeof edgeConnections[0], visible: boolean): Edge {
  const edgeId = `e${conn.source}-${conn.target}`;
  return {
    id: edgeId,
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    label: visible ? edgeLabelMap.get(edgeId) : undefined,
    animated: visible,
    style: visible ? visibleEdgeStyle : hiddenEdgeStyle,
    labelStyle: edgeLabelStyle,
    labelShowBg: true,
    labelBgPadding: edgeLabelBgPadding,
    labelBgStyle: edgeLabelBgStyle,
    markerEnd: edgeMarkerEnd,
  };
}

function createNoteNode(note: typeof notes[0], visible: boolean, position?: { x: number; y: number }): Node {
  return {
    id: note.id,
    type: 'note',
    position: position || positions[note.id],
    data: noteDataMap.get(note.id)!,
    style: visible ? visibleNoteStyle : hiddenNoteStyle,
    draggable: true,
    selectable: false,
    connectable: false,
  };
}

const getNodes = (count: number, currentPositions: { [key: string]: { x: number; y: number } }) => {
  const stepNodes = allSteps.map((step, index) =>
    createNode(step, index < count, currentPositions[step.id])
  );
  const noteNodes = notes.map(note => {
    const noteVisible = count >= note.appearsWithStep;
    return createNoteNode(note, noteVisible, currentPositions[note.id]);
  });
  return [...stepNodes, ...noteNodes];
};

const getEdgeVisibility = (conn: typeof edgeConnections[0], visibleStepCount: number) => {
  const edgeId = `e${conn.source}-${conn.target}`;
  const sourceIndex = edgeSourceIndexMap.get(edgeId) ?? -1;
  const targetIndex = edgeTargetIndexMap.get(edgeId) ?? -1;
  return sourceIndex < visibleStepCount && targetIndex < visibleStepCount;
};

// ⚡ Bolt Optimization: Selective visibility updater for nodes to preserve referential stability and prevent full array reconstruction.
const updateNodesVisibility = (count: number) => (nds: Node[]) => {
  let changed = false;
  const newNodes = nds.map((node) => {
    let shouldBeVisible = false;
    if (node.type === 'custom') {
      const stepIndex = stepIndexMap.get(node.id) ?? -1;
      shouldBeVisible = stepIndex < count;
    } else if (node.type === 'note') {
      const appearsWithStep = noteAppearsMap.get(node.id) ?? 999;
      shouldBeVisible = count >= appearsWithStep;
    }

    // We infer current visibility by checking pointerEvents, which uniquely determines state.
    const isCurrentlyVisible = node.style?.pointerEvents === 'auto';

    if (isCurrentlyVisible !== shouldBeVisible) {
      changed = true;
      let newStyle;
      if (node.type === 'custom') {
        newStyle = shouldBeVisible ? visibleStepStyle : hiddenStepStyle;
      } else {
        newStyle = shouldBeVisible ? visibleNoteStyle : hiddenNoteStyle;
      }
      return { ...node, style: newStyle };
    }
    return node;
  });
  return changed ? newNodes : nds;
};

// ⚡ Bolt Optimization: Selective visibility updater for edges to preserve referential stability and prevent full array reconstruction.
const updateEdgesVisibility = (count: number) => (eds: Edge[]) => {
  let changed = false;
  const newEdges = eds.map((edge) => {
    const sourceIndex = edgeSourceIndexMap.get(edge.id) ?? -1;
    const targetIndex = edgeTargetIndexMap.get(edge.id) ?? -1;
    const shouldBeVisible = sourceIndex < count && targetIndex < count;

    const isCurrentlyVisible = edge.style?.opacity === 1;

    if (isCurrentlyVisible !== shouldBeVisible) {
      changed = true;
      return {
        ...edge,
        style: shouldBeVisible ? visibleEdgeStyle : hiddenEdgeStyle,
        label: shouldBeVisible ? edgeLabelMap.get(edge.id) : undefined,
        animated: shouldBeVisible,
      };
    }
    return edge;
  });
  return changed ? newEdges : eds;
};

function App() {
  const [visibleCount, setVisibleCount] = useState(1);

  // ⚡ Bolt Optimization: Rely on functional state setters for node modifications rather than refs.
  const initialNodes = useMemo(() => getNodes(1, positions), []);
  const initialEdges = useMemo(() => edgeConnections.map((conn) =>
    createEdge(conn, getEdgeVisibility(conn, 1))
  ), []);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: '#222', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#222' } }, eds));
    },
    [setEdges]
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges]
  );

  const handleNext = useCallback(() => {
    if (visibleCount < allSteps.length) {
      const newCount = visibleCount + 1;
      setVisibleCount(newCount);
      setNodes(updateNodesVisibility(newCount));
      setEdges(updateEdgesVisibility(newCount));
    }
  }, [visibleCount, setNodes, setEdges]);

  const handlePrev = useCallback(() => {
    if (visibleCount > 1) {
      const newCount = visibleCount - 1;
      setVisibleCount(newCount);
      setNodes(updateNodesVisibility(newCount));
      setEdges(updateEdgesVisibility(newCount));
    }
  }, [visibleCount, setNodes, setEdges]);

  // ⚡ Bolt Optimization: Reuse memoized initialNodes and initialEdges in reset to prevent O(N) recreations and object allocations.
  const handleReset = useCallback(() => {
    setVisibleCount(1);
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges, initialNodes, initialEdges]);

  return (
    <div className="notepad-window">
      <div className="title-bar">
        <div className="title-text">
          <img src="/vite.svg" alt="" style={{ height: 12, marginRight: 4, verticalAlign: 'middle' }} />
          Untitled - Notepad
        </div>
        <div className="title-controls">
          <div className="title-btn" onClick={() => { }}>_</div>
          <div className="title-btn" onClick={() => { }}>□</div>
          <div className="title-btn" onClick={() => { }}>X</div>
        </div>
      </div>

      <div className="menu-bar">
        <div className="menu-item">File</div>
        <div className="menu-item">Edit</div>
        <div className="menu-item">Format</div>
        <div className="menu-item">View</div>
        <div className="menu-item">Help</div>
      </div>

      <div className="text-area-container">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          fitView
          fitViewOptions={fitViewOptions}
          nodesDraggable={true}
          nodesConnectable={true}
          edgesReconnectable={true}
          elementsSelectable={true}
          deleteKeyCode={deleteKeyCode}
          panOnDrag={true}
          panOnScroll={true}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={true}
          selectNodesOnDrag={false}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#ddd" />
          <Controls showInteractive={false} />
        </ReactFlow>

        <div className="controls" style={{ position: 'absolute', bottom: 10, right: 20, background: '#c0c0c0', padding: 4, border: '2px outset white', display: 'flex' }}>
          <button onClick={handlePrev} disabled={visibleCount <= 1}>
            &lt; Prev
          </button>
          <span className="step-counter" style={{ padding: '0 8px', display: 'flex', alignItems: 'center' }}>
            Step {visibleCount}/{allSteps.length}
          </span>
          <button onClick={handleNext} disabled={visibleCount >= allSteps.length}>
            Next &gt;
          </button>
          <button onClick={handleReset} className="reset-btn">
            Reset
          </button>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-main"></div>
        <div className="status-item" style={{ minWidth: 100 }}>Ln 1, Col 1</div>
        <div className="status-item">100%</div>
        <div className="status-item">Windows (CRLF)</div>
        <div className="status-item">UTF-8</div>
      </div>
    </div>
  );
}

export default App;
