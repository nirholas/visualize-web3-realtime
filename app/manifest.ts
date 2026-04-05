import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'swarming',
    short_name: 'swarming',
    description: 'GPU-accelerated real-time network visualization engine. See your data swarm.',
    start_url: '/world',
    display: 'standalone',
    background_color: '#0a0a12',
    theme_color: '#0a0a12',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
