const fs = require('fs');
let content = fs.readFileSync('flowchart/src/App.tsx', 'utf8');

// The error is `nodePositions.current` inside useMemo. We can just use the global `positions` object for the initial nodes.
// const initialNodes = useMemo(() => getNodes(1, positions), []);
content = content.replace(
  'const initialNodes = useMemo(() => getNodes(1, nodePositions.current), []);',
  'const initialNodes = useMemo(() => getNodes(1, positions), []);'
);

fs.writeFileSync('flowchart/src/App.tsx', content);
console.log('Fixed lint issue.');
