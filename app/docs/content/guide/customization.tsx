export default function CustomizationPage() {
  return (
    <>
      <h1>Customization</h1>
      <p className="docs-lead">
        Overview of customization options for themes, nodes, edges, physics, and camera.
      </p>

      <div className="docs-grid">
        <a href="/docs/guide/themes" className="docs-card">
          <h3>Themes</h3>
          <p>Dark and light themes with CSS custom properties</p>
        </a>
        <a href="/docs/guide/node-rendering" className="docs-card">
          <h3>Node Rendering</h3>
          <p>Customize node appearance, color, size, and shape</p>
        </a>
        <a href="/docs/guide/edge-rendering" className="docs-card">
          <h3>Edge Rendering</h3>
          <p>Style edges with colors, widths, and animations</p>
        </a>
        <a href="/docs/guide/physics-tuning" className="docs-card">
          <h3>Physics Tuning</h3>
          <p>Fine-tune the force simulation for your data</p>
        </a>
        <a href="/docs/guide/camera-control" className="docs-card">
          <h3>Camera Control</h3>
          <p>Control camera position, rotation, and animation</p>
        </a>
      </div>
    </>
  );
}
