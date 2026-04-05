export default function KeyboardShortcutsPage() {
  return (
    <>
      <h1>Keyboard Shortcuts</h1>
      <p className="docs-lead">
        Built-in keyboard shortcuts for common actions.
      </p>

      <h2 id="default-shortcuts">Default shortcuts</h2>
      <table className="docs-table">
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Space', 'Pause/resume the simulation'],
            ['R', 'Reset camera to default position'],
            ['F', 'Toggle fullscreen'],
            ['Escape', 'Deselect current node'],
            ['Tab', 'Cycle through nodes (accessibility)'],
            ['+/-', 'Zoom in/out'],
            ['Arrow keys', 'Pan camera'],
          ].map(([key, action]) => (
            <tr key={key}>
              <td>
                <kbd style={{
                  padding: '2px 8px',
                  background: 'rgba(140,140,200,0.1)',
                  border: '1px solid rgba(140,140,200,0.2)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-ibm-plex-mono), monospace',
                }}>
                  {key}
                </kbd>
              </td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 id="accessibility">Accessibility</h2>
      <p>
        swarming supports keyboard navigation for all interactive elements.
        The <code>Tab</code> key cycles through nodes, <code>Enter</code> selects,
        and <code>Escape</code> deselects. Screen reader announcements are provided
        for node focus changes.
      </p>
    </>
  );
}
