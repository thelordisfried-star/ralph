import { useCallback, useState, useRef, useMemo, memo } from 'react';
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

// Setup phase - horizontal at top
// Loop phase - circular arrangement below
// Exit - at bottom center

type Phase = 'setup' | 'loop' | 'decision' | 'done';

const phaseColors: Record<Phase, { bg: string; border: string }> = {
  setup: { bg: '#ffffff', border: '#000000' },
  loop: { bg: '#ffffff', border: '#000000' },
  decision: { bg: '#ffffff', border: '#000000' },
  done: { bg: '#ffffff', border: '#000000' },
};
const allSteps: { id: string; label: string; description: string; phase: Phase }[] = [
  // Setup phase (vertical)
  { id: '1', label: 'You write a PRD', description: 'Define what you want to build', phase: 'setup' },
  { id: '2', label: 'Convert to prd.json', description: 'Break into small user stories', phase: 'setup' },
  { id: '3', label: 'Run ralph.sh', description: 'Starts the autonomous loop', phase: 'setup' },
  // Loop phase
  { id: '4', label: 'Amp picks a story', description: 'Finds next passes: false', phase: 'loop' },
  { id: '5', label: 'Implements it', description: 'Writes code, runs tests', phase: 'loop' },
  { id: '6', label: 'Commits changes', description: 'If tests pass', phase: 'loop' },
  { id: '7', label: 'Updates prd.json', description: 'Sets passes: true', phase: 'loop' },
  { id: '8', label: 'Logs to progress.txt', description: 'Saves learnings', phase: 'loop' },
  { id: '9', label: 'More stories?', description: '', phase: 'decision' },
  // Exit
  { id: '10', label: 'Done!', description: 'All stories complete', phase: 'done' },
];

const notes = [
  {
    id: 'note-1',
    appearsWithStep: 2,
    position: { x: 340, y: 100 },
    color: { bg: '#ffffff', border: '#000000' },
    content: `{
  "id": "US-001",
  "title": "Add priority field to database",
  "acceptanceCriteria": [
    "Add priority column to tasks table",
    "Generate and run migration",
    "Typecheck passes"
  ],
  "passes": false
}`,
  },
  {
    id: 'note-2',
    appearsWithStep: 8,
    position: { x: 480, y: 620 },
    color: { bg: '#ffffff', border: '#000000' },
    content: `Also updates AGENTS.md with
patterns discovered, so future
iterations learn from this one.`,
  },
];

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

const stepIndexMap = new Map(allSteps.map((s, i) => [s.id, i]));

const positions: { [key: string]: { x: number; y: number } } = {
  // Vertical setup flow on the left
  '1': { x: 20, y: 20 },
  '2': { x: 80, y: 130 },
  '3': { x: 60, y: 250 },
  // Loop
  '4': { x: 40, y: 420 },
  '5': { x: 450, y: 300 },
  '6': { x: 750, y: 450 },
  '7': { x: 470, y: 520 },
  '8': { x: 200, y: 620 },
  '9': { x: 40, y: 720 },
  // Exit
  '10': { x: 350, y: 880 },
  // Notes
  ...Object.fromEntries(notes.map(n => [n.id, n.position])),
};

const edgeConnections: { source: string; target: string; sourceHandle?: string; targetHandle?: string; label?: string }[] = [
  // Setup phase (vertical) - bottom to top connections
  { source: '1', target: '2', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '2', target: '3', sourceHandle: 'bottom', targetHandle: 'top' },
  { source: '3', target: '4', sourceHandle: 'bottom', targetHandle: 'top' },
  // Loop phase
  { source: '4', target: '5', sourceHandle: 'right', targetHandle: 'left' },
  { source: '5', target: '6', sourceHandle: 'right', targetHandle: 'top' },
  { source: '6', target: '7', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '7', target: '8', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '8', target: '9', sourceHandle: 'left-source', targetHandle: 'right-target' },
  { source: '9', target: '4', sourceHandle: 'top-source', targetHandle: 'bottom-target', label: 'Yes' },
  // Exit
  { source: '9', target: '10', sourceHandle: 'bottom', targetHandle: 'top', label: 'No' },
];

function createNode(step: typeof allSteps[0], visible: boolean, position?: { x: number; y: number }): Node {
  return {
    id: step.id,
    type: 'custom',
    position: position || positions[step.id],
    data: {
      title: step.label,
      description: step.description,
      phase: step.phase,
      stepIndex: stepIndexMap.get(step.id) ?? -1,
    },
    style: {
      width: nodeWidth,
      height: nodeHeight,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
    },
  };
}

function createEdge(conn: typeof edgeConnections[0], visible: boolean): Edge {
  return {
    id: `e${conn.source}-${conn.target}`,
    source: conn.source,
    target: conn.target,
    sourceHandle: conn.sourceHandle,
    targetHandle: conn.targetHandle,
    label: visible ? conn.label : undefined,
    animated: visible,
    style: {
      stroke: '#222',
      strokeWidth: 2,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    },
    data: {
      sourceIndex: stepIndexMap.get(conn.source) ?? -1,
      targetIndex: stepIndexMap.get(conn.target) ?? -1,
      originalLabel: conn.label,
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
}

function createNoteNode(note: typeof notes[0], visible: boolean, position?: { x: number; y: number }): Node {
  return {
    id: note.id,
    type: 'note',
    position: position || positions[note.id],
    data: {
      content: note.content,
      color: note.color,
      appearsWithStep: note.appearsWithStep,
    },
    style: {
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
      pointerEvents: visible ? 'auto' : 'none',
    },
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

function App() {
  const [visibleCount, setVisibleCount] = useState(1);
  const nodePositions = useRef<{ [key: string]: { x: number; y: number } }>({ ...positions });

  // Use the initial positions object directly to avoid accessing ref during render
  const initialNodes = useMemo(() => getNodes(1, { ...positions }), []);
  const initialEdges = useMemo(() => edgeConnections.map((conn, index) =>
    createEdge(conn, index < 0)
  ), []);

  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          nodePositions.current[change.id] = change.position;
        }
      });
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

  const updateVisibility = useCallback((newCount: number) => {
    setNodes(nds => nds.map(node => {
      let isVisible = false;
      if (node.type === 'custom') {
        isVisible = (node.data.stepIndex as number) < newCount;
      } else if (node.type === 'note') {
        isVisible = newCount >= (node.data.appearsWithStep as number);
      }

      const expectedOpacity = isVisible ? 1 : 0;
      const expectedPointerEvents: 'auto' | 'none' = isVisible ? 'auto' : 'none';

      if (node.style?.opacity === expectedOpacity && node.style?.pointerEvents === expectedPointerEvents) {
        return node;
      }

      return {
        ...node,
        style: {
          ...node.style,
          opacity: expectedOpacity,
          pointerEvents: expectedPointerEvents,
        }
      };
    }));

    setEdges(eds => eds.map(edge => {
      const isVisible = (edge.data?.sourceIndex as number) < newCount && (edge.data?.targetIndex as number) < newCount;
      const expectedOpacity = isVisible ? 1 : 0;
      const expectedLabel = isVisible ? (edge.data?.originalLabel as string | undefined) : undefined;

      if (edge.style?.opacity === expectedOpacity && edge.label === expectedLabel) {
        return edge;
      }

      return {
        ...edge,
        label: expectedLabel,
        animated: isVisible,
        style: {
          ...edge.style,
          opacity: expectedOpacity,
        }
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
  }, [visibleCount, updateVisibility]);

  // ⚡ Bolt Optimization: Reuse memoized initialNodes and initialEdges in reset to prevent O(N) recreations and object allocations.
  const handleReset = useCallback(() => {
    setVisibleCount(1);
    nodePositions.current = { ...positions };
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [setNodes, setEdges, initialNodes, initialEdges]);

  return (
    <div className="notepad-window">
      {/* Title Bar */}
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

      {/* Menu Bar */}
      <div className="menu-bar">
        <div className="menu-item">File</div>
        <div className="menu-item">Edit</div>
        <div className="menu-item">Format</div>
        <div className="menu-item">View</div>
        <div className="menu-item">Help</div>
      </div>

      {/* Main Text Area (Flow) */}
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
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={true}
          nodesConnectable={true}
          edgesReconnectable={true}
          elementsSelectable={true}
          deleteKeyCode={['Backspace', 'Delete']}
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

        {/* Overlay Controls (Styled as bottom toolbar) */}
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

      {/* Status Bar */}
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
