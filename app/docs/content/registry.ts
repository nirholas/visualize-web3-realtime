// Content registry — maps slugs to metadata for search indexing
// Actual content is rendered by React components in each content file

export interface DocEntry {
  title: string;
  description: string;
  keywords: string[];
  searchText: string;
}

export const docsContent: Record<string, DocEntry> = {
  'getting-started/installation': {
    title: 'Installation',
    description: 'Install swarming and its dependencies in your project.',
    keywords: ['install', 'npm', 'setup', 'dependencies', 'getting started'],
    searchText: 'Install swarming npm install @swarming/react @swarming/core react three.js react-three-fiber d3-force peer dependencies setup yarn pnpm prerequisites Node.js 18+ React 18+ package manager',
  },
  'getting-started/quick-start': {
    title: 'Quick Start',
    description: 'Get a live visualization running in 30 seconds.',
    keywords: ['quick start', 'tutorial', 'beginner', 'hello world', '30 seconds'],
    searchText: 'Quick start 30 seconds tutorial first visualization basic setup import Swarming component render nodes edges provider MockProvider minimal example hello world beginner friendly',
  },
  'getting-started/first-visualization': {
    title: 'Your First Visualization',
    description: 'Build a complete real-time network visualization step by step.',
    keywords: ['tutorial', 'first visualization', 'step by step', 'walkthrough'],
    searchText: 'First visualization step by step walkthrough tutorial connect data source render graph customize appearance add interactivity build complete network visualization real-time streaming',
  },
  'getting-started/frameworks': {
    title: 'Frameworks',
    description: 'Integration guides for Next.js, Vite, Remix, and vanilla JS.',
    keywords: ['next.js', 'vite', 'remix', 'vanilla', 'framework', 'integration'],
    searchText: 'Frameworks Next.js Vite Remix vanilla JavaScript integration guide setup configuration SSR server-side rendering dynamic import client component bundler webpack rollup esbuild',
  },
  'guide/data-sources': {
    title: 'Data Sources',
    description: 'Overview of data source options for feeding your visualization.',
    keywords: ['data sources', 'providers', 'websocket', 'streaming', 'real-time'],
    searchText: 'Data sources overview providers WebSocket streaming real-time static data custom providers built-in providers architecture data flow pipeline',
  },
  'guide/websocket-streams': {
    title: 'WebSocket Streams',
    description: 'Connect to live WebSocket data streams for real-time visualization.',
    keywords: ['websocket', 'real-time', 'streaming', 'live data', 'ws'],
    searchText: 'WebSocket streams real-time live data streaming connection reconnection exponential backoff WebSocketManager message parsing binary JSON protocol data pipeline visualization library',
  },
  'guide/static-data': {
    title: 'Static Data',
    description: 'Visualize static datasets and snapshots.',
    keywords: ['static data', 'json', 'snapshot', 'offline', 'dataset'],
    searchText: 'Static data visualization JSON dataset snapshot offline graph nodes edges import file load parse array object configuration static provider',
  },
  'guide/custom-providers': {
    title: 'Custom Providers',
    description: 'Create your own data provider to connect any data source.',
    keywords: ['custom provider', 'data provider', 'createProvider', 'api'],
    searchText: 'Custom providers createProvider factory data provider interface connect emit disconnect WebSocket REST API polling custom data source integration plugin',
  },
  'guide/built-in-providers': {
    title: 'Built-in Providers',
    description: 'Pre-built providers for Solana, Ethereum, and Kubernetes.',
    keywords: ['solana', 'ethereum', 'kubernetes', 'built-in', 'blockchain'],
    searchText: 'Built-in providers Solana PumpFun Ethereum Kubernetes K8s blockchain token trade claim provider pre-built out-of-the-box data source',
  },
  'guide/customization': {
    title: 'Customization',
    description: 'Overview of customization options for themes, nodes, edges, physics, and camera.',
    keywords: ['customization', 'themes', 'nodes', 'edges', 'styling'],
    searchText: 'Customization overview themes dark light node rendering edge rendering physics tuning camera control styling appearance configuration options',
  },
  'guide/themes': {
    title: 'Themes',
    description: 'Configure dark and light themes with CSS custom properties.',
    keywords: ['themes', 'dark mode', 'light mode', 'css variables', 'design tokens'],
    searchText: 'Themes dark mode light mode ThemeProvider createTheme CSS custom properties design tokens color palette background surface border text accent w3v variables runtime theming',
  },
  'guide/node-rendering': {
    title: 'Node Rendering',
    description: 'Customize how nodes appear in the visualization.',
    keywords: ['node rendering', 'node style', 'instanced mesh', 'appearance'],
    searchText: 'Node rendering customization appearance style color size shape InstancedMesh Three.js geometry material instanced rendering performance custom node component',
  },
  'guide/edge-rendering': {
    title: 'Edge Rendering',
    description: 'Customize edge styles, colors, and animations.',
    keywords: ['edge rendering', 'edge style', 'lines', 'connections'],
    searchText: 'Edge rendering customization lines connections style color width opacity animation directional arrows curve bezier LineSegments custom edge component',
  },
  'guide/physics-tuning': {
    title: 'Physics Tuning',
    description: 'Fine-tune the force simulation for your data.',
    keywords: ['physics', 'force simulation', 'd3-force', 'tuning', '3d force graph'],
    searchText: 'Physics tuning force simulation d3-force configuration alpha decay velocity friction charge strength link distance center force collision detection spatial hash 3d force graph javascript d3 force graph alternative',
  },
  'guide/camera-control': {
    title: 'Camera Control',
    description: 'Control camera position, rotation, and animation.',
    keywords: ['camera', 'orbit controls', 'zoom', 'pan', 'rotation'],
    searchText: 'Camera control orbit controls zoom pan rotation position animation fly-to focus node auto-rotate damping three.js perspective camera controls',
  },
  'guide/interactivity': {
    title: 'Interactivity',
    description: 'Overview of interactive features: mouse, click, hover, selection, keyboard.',
    keywords: ['interactivity', 'mouse', 'click', 'hover', 'selection'],
    searchText: 'Interactivity overview mouse interaction click hover events node selection keyboard shortcuts interactive features user input event handling',
  },
  'guide/mouse-interaction': {
    title: 'Mouse Interaction',
    description: 'Configure mouse repulsion, drag behavior, and pointer events.',
    keywords: ['mouse', 'repulsion', 'drag', 'pointer events', 'interaction'],
    searchText: 'Mouse interaction repulsion drag pointer events cursor grab raycasting Three.js hover effect proximity force push pull attract interaction radius',
  },
  'guide/click-hover-events': {
    title: 'Click & Hover Events',
    description: 'Handle click and hover events on nodes and edges.',
    keywords: ['click', 'hover', 'events', 'callbacks', 'handlers'],
    searchText: 'Click hover events callbacks handlers onNodeClick onNodeHover onEdgeClick event data node edge information tooltip popup detail panel interaction',
  },
  'guide/node-selection': {
    title: 'Node Selection',
    description: 'Select, highlight, and filter nodes programmatically.',
    keywords: ['selection', 'highlight', 'filter', 'focus', 'programmatic'],
    searchText: 'Node selection highlight filter focus programmatic select nodes multi-selection selection state highlight connected neighbors filter by category search find',
  },
  'guide/keyboard-shortcuts': {
    title: 'Keyboard Shortcuts',
    description: 'Built-in keyboard shortcuts and custom keybindings.',
    keywords: ['keyboard', 'shortcuts', 'keybindings', 'accessibility'],
    searchText: 'Keyboard shortcuts keybindings accessibility hotkeys space pause R reset F fullscreen Escape deselect tab navigation focus management custom key bindings',
  },
  'guide/advanced': {
    title: 'Advanced',
    description: 'Advanced topics: performance, headless mode, SSR, shaders, plugins.',
    keywords: ['advanced', 'performance', 'headless', 'ssr', 'shaders', 'plugins'],
    searchText: 'Advanced topics performance optimization headless mode server-side rendering custom shaders plugin development architecture internals',
  },
  'guide/performance': {
    title: 'Performance Optimization',
    description: 'Techniques for handling large datasets at 60fps.',
    keywords: ['performance', 'optimization', '60fps', 'large datasets', 'real-time data visualization react'],
    searchText: 'Performance optimization 60fps large datasets instanced rendering BoundedMap BoundedSet LRU eviction spatial hashing batched updates requestAnimationFrame Web Workers OffscreenCanvas GPU real-time data visualization react',
  },
  'guide/headless-mode': {
    title: 'Headless Mode',
    description: 'Run the simulation without rendering for server-side computation.',
    keywords: ['headless', 'server', 'computation', 'no rendering'],
    searchText: 'Headless mode server-side computation no rendering simulation engine ForceGraphSimulation Node.js backend data processing graph layout pre-computation',
  },
  'guide/ssr': {
    title: 'Server-Side Rendering',
    description: 'SSR strategies for Three.js-based components.',
    keywords: ['ssr', 'server-side rendering', 'next.js', 'dynamic import'],
    searchText: 'Server-side rendering SSR Next.js dynamic import use client directive hydration Three.js canvas WebGL server component client component loading state fallback',
  },
  'guide/custom-shaders': {
    title: 'Custom Shaders',
    description: 'Write custom GLSL shaders for unique visual effects.',
    keywords: ['shaders', 'glsl', 'webgl', 'custom effects', 'three.js network graph'],
    searchText: 'Custom shaders GLSL WebGL Three.js ShaderMaterial vertex fragment post-processing effects bloom glow halo particle custom visual effects three.js network graph',
  },
  'guide/plugin-development': {
    title: 'Plugin Development',
    description: 'Extend swarming with custom plugins.',
    keywords: ['plugin', 'extension', 'api', 'development'],
    searchText: 'Plugin development extension API custom plugins hooks middleware event system lifecycle pre-render post-render data transform filter provider plugin architecture',
  },
  'api/swarming-component': {
    title: '<Swarming /> Component',
    description: 'Main component API reference.',
    keywords: ['swarming', 'component', 'api', 'props', 'reference'],
    searchText: 'Swarming component API reference props ForceGraph React Three Fiber background showLabels showGround simulationConfig provider theme camera events callbacks ref GraphHandle',
  },
  'api/use-swarming-engine': {
    title: 'useSwarmingEngine() Hook',
    description: 'Core hook for accessing the simulation engine.',
    keywords: ['hook', 'engine', 'simulation', 'api'],
    searchText: 'useSwarmingEngine hook simulation engine API nodes edges stats addNode removeNode updateNode focusNode resetCamera getCanvas simulation state control imperative',
  },
  'api/create-provider': {
    title: 'createProvider() Factory',
    description: 'Factory function for creating custom data providers.',
    keywords: ['createProvider', 'factory', 'provider', 'data source'],
    searchText: 'createProvider factory function custom data provider DataProvider interface id label connect emit disconnect options configuration provider registration registry websocket visualization library',
  },
  'api/theme-config': {
    title: 'Theme Configuration',
    description: 'Complete theme configuration API reference.',
    keywords: ['theme', 'configuration', 'colors', 'design tokens'],
    searchText: 'Theme configuration API reference ThemeProvider createTheme darkTheme lightTheme colors background surface border text muted accent CSS custom properties design tokens',
  },
  'api/physics-config': {
    title: 'Physics Configuration',
    description: 'Force simulation configuration API reference.',
    keywords: ['physics', 'simulation', 'configuration', 'd3-force'],
    searchText: 'Physics configuration API reference ForceGraphSimulation d3-force alphaDecay velocityDecay chargeStrength linkDistance centerStrength collisionRadius simulation parameters tuning',
  },
  'api/event-types': {
    title: 'Event Types',
    description: 'TypeScript types for all events and callbacks.',
    keywords: ['events', 'types', 'typescript', 'callbacks'],
    searchText: 'Event types TypeScript Token Trade Claim TopToken TraderEdge GraphNode GraphEdge Vec3 callbacks onNodeClick onNodeHover ShareColors GraphHandle type definitions interfaces',
  },
  'examples/live-demos': {
    title: 'Live Demos',
    description: 'Interactive live demos of swarming visualizations.',
    keywords: ['demos', 'live', 'interactive', 'examples'],
    searchText: 'Live demos interactive examples visualization Solana PumpFun tokens blockchain network graph real-time streaming embedded CodeSandbox playground',
  },
  'examples/use-cases': {
    title: 'Use Case Gallery',
    description: 'Real-world use cases and inspiration gallery.',
    keywords: ['use cases', 'gallery', 'examples', 'showcase'],
    searchText: 'Use case gallery examples showcase blockchain DeFi AI agents Kubernetes DevOps social networks IoT supply chain real-world applications inspiration',
  },
  'community/contributing': {
    title: 'Contributing',
    description: 'How to contribute to the swarming project.',
    keywords: ['contributing', 'open source', 'github', 'pull request'],
    searchText: 'Contributing open source GitHub pull request issues fork clone development setup testing code style guidelines community contribution',
  },
  'community/changelog': {
    title: 'Changelog',
    description: 'Version history and release notes.',
    keywords: ['changelog', 'releases', 'versions', 'history'],
    searchText: 'Changelog version history release notes breaking changes new features bug fixes updates patches semver semantic versioning',
  },
  'community/roadmap': {
    title: 'Roadmap',
    description: 'Planned features and future direction.',
    keywords: ['roadmap', 'planned', 'future', 'upcoming'],
    searchText: 'Roadmap planned features future direction upcoming releases milestones goals priorities community input feedback planned improvements',
  },
  'community/showcase': {
    title: 'Showcase',
    description: 'Projects built with swarming.',
    keywords: ['showcase', 'projects', 'built with', 'examples'],
    searchText: 'Showcase projects built with swarming community creations examples implementations real-world usage gallery featured projects',
  },
};
