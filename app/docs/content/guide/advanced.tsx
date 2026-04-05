export default function AdvancedPage() {
  return (
    <>
      <h1>Advanced</h1>
      <p className="docs-lead">
        Deep dives into performance, headless mode, server-side rendering,
        custom shaders, and building plugins.
      </p>

      <div className="docs-grid">
        <a href="/docs/guide/performance" className="docs-card">
          <h3>Performance Optimization</h3>
          <p>Handle 10,000+ nodes at 60fps with instanced rendering and spatial hashing</p>
        </a>
        <a href="/docs/guide/headless-mode" className="docs-card">
          <h3>Headless Mode</h3>
          <p>Run simulations server-side for pre-computation and API endpoints</p>
        </a>
        <a href="/docs/guide/ssr" className="docs-card">
          <h3>Server-Side Rendering</h3>
          <p>SSR strategies for Three.js-based components in Next.js and Remix</p>
        </a>
        <a href="/docs/guide/custom-shaders" className="docs-card">
          <h3>Custom Shaders</h3>
          <p>Write GLSL shaders for unique visual effects like glow and particle trails</p>
        </a>
        <a href="/docs/guide/plugin-development" className="docs-card">
          <h3>Plugin Development</h3>
          <p>Extend swarming with lifecycle hooks and custom middleware</p>
        </a>
      </div>
    </>
  );
}
