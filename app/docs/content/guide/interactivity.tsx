export default function InteractivityPage() {
  return (
    <>
      <h1>Interactivity</h1>
      <p className="docs-lead">
        swarming provides rich interaction out of the box — mouse repulsion, click handlers,
        node selection, and keyboard shortcuts.
      </p>

      <div className="docs-grid">
        <a href="/docs/guide/mouse-interaction" className="docs-card">
          <h3>Mouse Interaction</h3>
          <p>Repulsion force, drag behavior, pointer events</p>
        </a>
        <a href="/docs/guide/click-hover-events" className="docs-card">
          <h3>Click &amp; Hover Events</h3>
          <p>onNodeClick, onNodeHover, onEdgeClick callbacks</p>
        </a>
        <a href="/docs/guide/node-selection" className="docs-card">
          <h3>Node Selection</h3>
          <p>Select, highlight, and filter nodes programmatically</p>
        </a>
        <a href="/docs/guide/keyboard-shortcuts" className="docs-card">
          <h3>Keyboard Shortcuts</h3>
          <p>Built-in hotkeys and custom key bindings</p>
        </a>
      </div>
    </>
  );
}
