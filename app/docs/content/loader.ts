import type { ComponentType } from 'react';

// Lazy-loaded content components mapped by slug path
const contentMap: Record<string, () => Promise<{ default: ComponentType }>> = {
  'getting-started/installation': () => import('./getting-started/installation'),
  'getting-started/quick-start': () => import('./getting-started/quick-start'),
  'getting-started/first-visualization': () => import('./getting-started/first-visualization'),
  'getting-started/frameworks': () => import('./getting-started/frameworks'),
  'guide/data-sources': () => import('./guide/data-sources'),
  'guide/websocket-streams': () => import('./guide/websocket-streams'),
  'guide/static-data': () => import('./guide/static-data'),
  'guide/custom-providers': () => import('./guide/custom-providers'),
  'guide/built-in-providers': () => import('./guide/built-in-providers'),
  'guide/customization': () => import('./guide/customization'),
  'guide/themes': () => import('./guide/themes'),
  'guide/node-rendering': () => import('./guide/node-rendering'),
  'guide/edge-rendering': () => import('./guide/edge-rendering'),
  'guide/physics-tuning': () => import('./guide/physics-tuning'),
  'guide/camera-control': () => import('./guide/camera-control'),
  'guide/interactivity': () => import('./guide/interactivity'),
  'guide/mouse-interaction': () => import('./guide/mouse-interaction'),
  'guide/click-hover-events': () => import('./guide/click-hover-events'),
  'guide/node-selection': () => import('./guide/node-selection'),
  'guide/keyboard-shortcuts': () => import('./guide/keyboard-shortcuts'),
  'guide/advanced': () => import('./guide/advanced'),
  'guide/performance': () => import('./guide/performance'),
  'guide/headless-mode': () => import('./guide/headless-mode'),
  'guide/ssr': () => import('./guide/ssr'),
  'guide/custom-shaders': () => import('./guide/custom-shaders'),
  'guide/plugin-development': () => import('./guide/plugin-development'),
  'api/swarming-component': () => import('./api/swarming-component'),
  'api/use-swarming-engine': () => import('./api/use-swarming-engine'),
  'api/create-provider': () => import('./api/create-provider'),
  'api/theme-config': () => import('./api/theme-config'),
  'api/physics-config': () => import('./api/physics-config'),
  'api/event-types': () => import('./api/event-types'),
  'examples/live-demos': () => import('./examples/live-demos'),
  'examples/use-cases': () => import('./examples/use-cases'),
  'community/contributing': () => import('./community/contributing'),
  'community/changelog': () => import('./community/changelog'),
  'community/roadmap': () => import('./community/roadmap'),
  'community/showcase': () => import('./community/showcase'),
};

export async function loadContent(slug: string[]): Promise<ComponentType | null> {
  const key = slug.join('/');
  const loader = contentMap[key];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

export function hasContent(slug: string[]): boolean {
  return slug.join('/') in contentMap;
}

export function getAllSlugs(): string[][] {
  return Object.keys(contentMap).map(k => k.split('/'));
}
