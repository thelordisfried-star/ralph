import re

file_path = 'flowchart/src/App.tsx'

with open(file_path, 'r') as f:
    content = f.read()

# Define the maps
maps_code = """
const stepDataMap = Object.fromEntries(
  allSteps.map(step => [
    step.id,
    {
      title: step.label,
      description: step.description,
      phase: step.phase,
    },
  ])
);

const noteDataMap = Object.fromEntries(
  notes.map(note => [
    note.id,
    { content: note.content, color: note.color },
  ])
);
"""

# Insert maps before CustomNode definition
if 'const stepDataMap' not in content:
    content = content.replace('function CustomNode', maps_code + '\nfunction CustomNode')

# Update createNode
create_node_pattern = r'data: \{\s*title: step\.label,\s*description: step\.description,\s*phase: step\.phase,\s*\},'
replacement_node = 'data: stepDataMap[step.id],'
content = re.sub(create_node_pattern, replacement_node, content, flags=re.DOTALL)

# Update createNoteNode
create_note_node_pattern = r'data: \{ content: note\.content, color: note\.color \},'
replacement_note_node = 'data: noteDataMap[note.id],'
content = re.sub(create_note_node_pattern, replacement_note_node, content)

# Wrap CustomNode and NoteNode in React.memo
if 'const CustomNode = React.memo(' not in content:
    # We need to change the function definition to a const with React.memo
    # But wait, createNode uses 'type: custom', which refers to nodeTypes.
    # nodeTypes = { custom: CustomNode, note: NoteNode };
    # So we can just wrap the component definitions or wrap them in nodeTypes.

    # Replacing function definitions with const definitions is cleaner but might break hoisting if used before definition.
    # Luckily they are defined before usage in nodeTypes.

    # Let's import memo first.
    if 'import { useCallback, useState, useRef }' in content:
        content = content.replace('import { useCallback, useState, useRef }', 'import { useCallback, useState, useRef, memo }')

    # Wrap CustomNode
    content = re.sub(r'function CustomNode\(\{ data \}: \{ data: \{ title: string; description: string; phase: Phase \} \}\) \{',
                     'const CustomNode = memo(({ data }: { data: { title: string; description: string; phase: Phase } }) => {', content)

    # Wrap NoteNode
    content = re.sub(r'function NoteNode\(\{ data \}: \{ data: \{ content: string; color: \{ bg: string; border: string \} \} \}\) \{',
                     'const NoteNode = memo(({ data }: { data: { content: string; color: { bg: string; border: string } } }) => {', content)

    # Note: Using regex to replace function signature with arrow function inside memo.
    # The closing brace for function needs to be closed with .
    # This is tricky with regex because we need to find the matching closing brace.

    # Alternative: Keep functions as is, and wrap them in nodeTypes.
    # const nodeTypes = { custom: memo(CustomNode), note: memo(NoteNode) };
    pass

# Let's use the simpler approach for memoization: wrap in nodeTypes.
# But  needs to be imported.

with open(file_path, 'w') as f:
    f.write(content)
