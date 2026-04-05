import type { NavSection } from './types';

export const docsNavigation: NavSection[] = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    items: [
      { title: 'Installation', slug: ['getting-started', 'installation'], href: '/docs/getting-started/installation' },
      { title: 'Quick Start', slug: ['getting-started', 'quick-start'], href: '/docs/getting-started/quick-start' },
      { title: 'Your First Visualization', slug: ['getting-started', 'first-visualization'], href: '/docs/getting-started/first-visualization' },
      { title: 'Frameworks', slug: ['getting-started', 'frameworks'], href: '/docs/getting-started/frameworks' },
    ],
  },
  {
    title: 'Guide',
    slug: 'guide',
    items: [
      {
        title: 'Data Sources',
        slug: ['guide', 'data-sources'],
        href: '/docs/guide/data-sources',
        items: [
          { title: 'WebSocket Streams', slug: ['guide', 'websocket-streams'], href: '/docs/guide/websocket-streams' },
          { title: 'Static Data', slug: ['guide', 'static-data'], href: '/docs/guide/static-data' },
          { title: 'Custom Providers', slug: ['guide', 'custom-providers'], href: '/docs/guide/custom-providers' },
          { title: 'Built-in Providers', slug: ['guide', 'built-in-providers'], href: '/docs/guide/built-in-providers' },
        ],
      },
      {
        title: 'Customization',
        slug: ['guide', 'customization'],
        href: '/docs/guide/customization',
        items: [
          { title: 'Themes', slug: ['guide', 'themes'], href: '/docs/guide/themes' },
          { title: 'Node Rendering', slug: ['guide', 'node-rendering'], href: '/docs/guide/node-rendering' },
          { title: 'Edge Rendering', slug: ['guide', 'edge-rendering'], href: '/docs/guide/edge-rendering' },
          { title: 'Physics Tuning', slug: ['guide', 'physics-tuning'], href: '/docs/guide/physics-tuning' },
          { title: 'Camera Control', slug: ['guide', 'camera-control'], href: '/docs/guide/camera-control' },
        ],
      },
      {
        title: 'Interactivity',
        slug: ['guide', 'interactivity'],
        href: '/docs/guide/interactivity',
        items: [
          { title: 'Mouse Interaction', slug: ['guide', 'mouse-interaction'], href: '/docs/guide/mouse-interaction' },
          { title: 'Click & Hover Events', slug: ['guide', 'click-hover-events'], href: '/docs/guide/click-hover-events' },
          { title: 'Node Selection', slug: ['guide', 'node-selection'], href: '/docs/guide/node-selection' },
          { title: 'Keyboard Shortcuts', slug: ['guide', 'keyboard-shortcuts'], href: '/docs/guide/keyboard-shortcuts' },
        ],
      },
      {
        title: 'Advanced',
        slug: ['guide', 'advanced'],
        href: '/docs/guide/advanced',
        items: [
          { title: 'Performance Optimization', slug: ['guide', 'performance'], href: '/docs/guide/performance' },
          { title: 'Headless Mode', slug: ['guide', 'headless-mode'], href: '/docs/guide/headless-mode' },
          { title: 'Server-Side Rendering', slug: ['guide', 'ssr'], href: '/docs/guide/ssr' },
          { title: 'Custom Shaders', slug: ['guide', 'custom-shaders'], href: '/docs/guide/custom-shaders' },
          { title: 'Plugin Development', slug: ['guide', 'plugin-development'], href: '/docs/guide/plugin-development' },
        ],
      },
    ],
  },
  {
    title: 'API Reference',
    slug: 'api',
    items: [
      { title: '<Swarming /> Component', slug: ['api', 'swarming-component'], href: '/docs/api/swarming-component' },
      { title: 'useSwarmingEngine() Hook', slug: ['api', 'use-swarming-engine'], href: '/docs/api/use-swarming-engine' },
      { title: 'createProvider() Factory', slug: ['api', 'create-provider'], href: '/docs/api/create-provider' },
      { title: 'Theme Configuration', slug: ['api', 'theme-config'], href: '/docs/api/theme-config' },
      { title: 'Physics Configuration', slug: ['api', 'physics-config'], href: '/docs/api/physics-config' },
      { title: 'Event Types', slug: ['api', 'event-types'], href: '/docs/api/event-types' },
    ],
  },
  {
    title: 'Examples',
    slug: 'examples',
    items: [
      { title: 'Live Demos', slug: ['examples', 'live-demos'], href: '/docs/examples/live-demos' },
      { title: 'Use Case Gallery', slug: ['examples', 'use-cases'], href: '/docs/examples/use-cases' },
    ],
  },
  {
    title: 'Community',
    slug: 'community',
    items: [
      { title: 'Contributing', slug: ['community', 'contributing'], href: '/docs/community/contributing' },
      { title: 'Changelog', slug: ['community', 'changelog'], href: '/docs/community/changelog' },
      { title: 'Roadmap', slug: ['community', 'roadmap'], href: '/docs/community/roadmap' },
      { title: 'Showcase', slug: ['community', 'showcase'], href: '/docs/community/showcase' },
    ],
  },
];

export function flattenNavItems(sections: NavSection[]): { title: string; slug: string[]; href: string }[] {
  const items: { title: string; slug: string[]; href: string }[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      items.push({ title: item.title, slug: item.slug, href: item.href });
      if (item.items) {
        for (const sub of item.items) {
          items.push({ title: sub.title, slug: sub.slug, href: sub.href });
        }
      }
    }
  }
  return items;
}
