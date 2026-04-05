# Task 39: Visual Graph Editor Mode

## Goal
Add a drag-and-drop graph editor mode where users can manually create, connect, and arrange nodes. This transforms swarming from read-only visualization into an interactive tool — dramatically broadening the use case.

## Context
Tools like Excalidraw (95k stars) and tldraw (40k stars) prove that editable canvas tools get massive adoption. Adding editing capabilities means swarming can be used for: architecture diagrams, system design, brainstorming, presentations, documentation, and more.

## Requirements

### 1. Editor Mode
```tsx
<Swarming
  mode="editor"
  data={initialData}
  onChange={(graph) => {
    // Save graph state
    saveToDatabase(graph)
  }}
/>
```

### 2. Editor Features

#### Node Operations
- **Add node**: Double-click empty space or toolbar button
- **Delete node**: Select + Delete key or right-click menu
- **Edit label**: Double-click node → inline text editing
- **Change color/group**: Right-click → color picker
- **Resize**: Drag handles on selected node

#### Edge Operations
- **Create edge**: Drag from one node to another
- **Delete edge**: Select edge + Delete key
- **Edit label**: Double-click edge → inline text editing
- **Change style**: Dashed, dotted, directional arrow

#### Canvas Operations
- **Zoom**: Scroll wheel or pinch
- **Pan**: Middle-click drag or spacebar + drag
- **Select multiple**: Shift-click or marquee selection
- **Undo/Redo**: Ctrl+Z / Ctrl+Shift+Z
- **Copy/Paste**: Ctrl+C / Ctrl+V (nodes + edges)
- **Group**: Select multiple → group as cluster

### 3. Toolbar
```
┌──────────────────────────────────────────────┐
│ [Select] [Add Node] [Add Edge] [Text] [Group]│
│ [Undo] [Redo] | [Zoom In] [Zoom Out] [Fit]  │
│ [Export] [Import] | [Physics On/Off] [Layout] │
└──────────────────────────────────────────────┘
```

### 4. Layout Algorithms
Auto-arrange buttons:
- **Force-directed** (current physics simulation)
- **Hierarchical** (top-to-bottom tree)
- **Circular** (nodes in a circle)
- **Grid** (aligned to grid)
- **Radial** (concentric circles from center)

### 5. Import/Export
```ts
// Export
const json = editor.exportJSON()    // Full graph state
const svg = editor.exportSVG()      // Vector image
const png = editor.exportPNG()      // Raster image
const mermaid = editor.exportMermaid() // Mermaid syntax

// Import
editor.importJSON(data)
editor.importMermaid('graph TD; A-->B; B-->C')
editor.importCSV(csvString)         // Adjacency list
```

### 6. Collaboration (with Task 27)
- Multiple users editing simultaneously
- Conflict resolution via CRDT
- Cursor positions visible
- Change attribution (who added what)

### 7. Persistence
```tsx
<Swarming
  mode="editor"
  persistence={{
    type: 'localStorage',  // or 'url', 'callback'
    key: 'my-graph',
  }}
/>
```

Options:
- **localStorage**: Auto-save to browser storage
- **URL**: Encode graph in URL hash (shareable)
- **callback**: `onSave(graph)` / `onLoad() => graph`

## Implementation Notes
- Editor mode disables physics by default (manual positioning)
- "Physics" toggle re-enables force simulation
- All editor state managed by a finite state machine (select, drag, connect, edit)
- Use pointer events for cross-device support (mouse + touch + pen)

## Files to Create
```
packages/swarming/src/editor/
├── EditorMode.tsx          # Main editor wrapper
├── Toolbar.tsx             # Editor toolbar
├── NodeEditor.tsx          # Node create/edit/delete
├── EdgeEditor.tsx          # Edge create/edit/delete
├── SelectionManager.ts     # Multi-select, marquee
├── UndoManager.ts          # Undo/redo stack
├── LayoutAlgorithms.ts     # Auto-layout functions
├── ImportExport.ts         # JSON, SVG, Mermaid, CSV
├── Persistence.ts          # Save/load strategies
└── types.ts
```
