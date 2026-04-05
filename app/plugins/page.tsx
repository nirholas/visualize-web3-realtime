'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Plugin directory data
// ---------------------------------------------------------------------------

interface PluginEntry {
  name: string;
  displayName: string;
  description: string;
  author: string;
  icon: string;
  type: 'source' | 'theme' | 'renderer';
  tags: string[];
  featured?: boolean;
  builtIn?: boolean;
  npmPackage?: string;
}

const PLUGINS: PluginEntry[] = [
  // Built-in data sources
  {
    name: 'swarming-plugin-websocket',
    displayName: 'WebSocket',
    description: 'Generic WebSocket consumer — connect to any WS endpoint and map messages to events.',
    author: 'swarming',
    icon: '🔌',
    type: 'source',
    tags: ['websocket', 'generic', 'streaming'],
    featured: true,
    builtIn: true,
  },
  {
    name: 'swarming-plugin-solana',
    displayName: 'Solana / PumpFun',
    description: 'Real-time Solana token launches and trades via PumpFun WebSocket feed.',
    author: 'swarming',
    icon: '◎',
    type: 'source',
    tags: ['solana', 'pumpfun', 'defi', 'blockchain'],
    featured: true,
    builtIn: true,
  },
  {
    name: 'swarming-plugin-ethereum',
    displayName: 'Ethereum',
    description: 'Ethereum mainnet DEX swaps, transfers, and mints via RPC WebSocket.',
    author: 'swarming',
    icon: '◆',
    type: 'source',
    tags: ['ethereum', 'evm', 'defi', 'blockchain'],
    featured: true,
    builtIn: true,
  },
  {
    name: 'swarming-plugin-mock',
    displayName: 'Mock Data',
    description: 'Synthetic data generator for testing and demos. Configurable rate and token count.',
    author: 'swarming',
    icon: '🧪',
    type: 'source',
    tags: ['mock', 'testing', 'demo'],
    builtIn: true,
  },

  // Built-in themes
  {
    name: 'swarming-theme-dark',
    displayName: 'Dark Theme',
    description: 'Default dark theme with bloom effects and vibrant node colors.',
    author: 'swarming',
    icon: '🌙',
    type: 'theme',
    tags: ['theme', 'dark', 'default'],
    featured: true,
    builtIn: true,
  },
  {
    name: 'swarming-theme-light',
    displayName: 'Light Theme',
    description: 'Clean light theme with reduced bloom for bright environments.',
    author: 'swarming',
    icon: '☀️',
    type: 'theme',
    tags: ['theme', 'light'],
    builtIn: true,
  },

  // Community plugins (examples / planned)
  {
    name: 'swarming-plugin-github',
    displayName: 'GitHub Activity',
    description: 'Visualize GitHub repository activity — commits, PRs, issues as graph nodes.',
    author: 'community',
    icon: '🐙',
    type: 'source',
    tags: ['github', 'git', 'social'],
    featured: true,
    npmPackage: 'swarming-plugin-github',
  },
  {
    name: 'swarming-plugin-kubernetes',
    displayName: 'Kubernetes',
    description: 'Monitor Kubernetes cluster events — pods, deployments, services visualized in real-time.',
    author: 'community',
    icon: '☸️',
    type: 'source',
    tags: ['kubernetes', 'k8s', 'devops', 'infrastructure'],
    featured: true,
    npmPackage: 'swarming-plugin-kubernetes',
  },
  {
    name: 'swarming-plugin-farcaster',
    displayName: 'Farcaster Social',
    description: 'Farcaster social graph — casts, reactions, and follows as streaming events.',
    author: 'community',
    icon: '🟣',
    type: 'source',
    tags: ['farcaster', 'social', 'web3'],
    featured: true,
    npmPackage: 'swarming-plugin-farcaster',
  },
  {
    name: 'swarming-plugin-mqtt',
    displayName: 'MQTT / IoT',
    description: 'Connect to MQTT brokers for IoT device telemetry visualization.',
    author: 'community',
    icon: '📡',
    type: 'source',
    tags: ['mqtt', 'iot', 'telemetry'],
    npmPackage: 'swarming-plugin-mqtt',
  },
  {
    name: 'swarming-plugin-kafka',
    displayName: 'Kafka Consumer',
    description: 'Consume Apache Kafka topics and visualize message flow across partitions.',
    author: 'community',
    icon: '📊',
    type: 'source',
    tags: ['kafka', 'streaming', 'messaging'],
    npmPackage: 'swarming-plugin-kafka',
  },
  {
    name: 'swarming-plugin-graphql',
    displayName: 'GraphQL Subscriptions',
    description: 'Subscribe to any GraphQL endpoint and visualize subscription events.',
    author: 'community',
    icon: '◈',
    type: 'source',
    tags: ['graphql', 'api', 'subscriptions'],
    npmPackage: 'swarming-plugin-graphql',
  },
  {
    name: 'swarming-theme-cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Neon-drenched cyberpunk theme with intense bloom and monospace typography.',
    author: 'community',
    icon: '🌆',
    type: 'theme',
    tags: ['theme', 'cyberpunk', 'neon'],
    npmPackage: 'swarming-theme-cyberpunk',
  },
  {
    name: 'swarming-theme-terminal',
    displayName: 'Terminal Green',
    description: 'Retro terminal aesthetics — green-on-black with phosphor glow effects.',
    author: 'community',
    icon: '💚',
    type: 'theme',
    tags: ['theme', 'terminal', 'retro'],
    npmPackage: 'swarming-theme-terminal',
  },
  {
    name: 'swarming-theme-pastel',
    displayName: 'Pastel',
    description: 'Soft pastel colors for a gentle, approachable visualization style.',
    author: 'community',
    icon: '🎨',
    type: 'theme',
    tags: ['theme', 'pastel', 'soft'],
    npmPackage: 'swarming-theme-pastel',
  },
  {
    name: 'swarming-renderer-voxel',
    displayName: 'Voxel Nodes',
    description: 'Replace sphere nodes with voxelized cubes for a retro 3D pixel-art look.',
    author: 'community',
    icon: '🧊',
    type: 'renderer',
    tags: ['renderer', 'voxel', '3d', 'pixel'],
    npmPackage: 'swarming-renderer-voxel',
  },
  {
    name: 'swarming-renderer-flat',
    displayName: 'Flat 2D Mode',
    description: 'Render the force graph as a flat 2D projection — great for dashboards and embeds.',
    author: 'community',
    icon: '📐',
    type: 'renderer',
    tags: ['renderer', 'flat', '2d'],
    npmPackage: 'swarming-renderer-flat',
  },
];

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

type PluginType = 'all' | 'source' | 'theme' | 'renderer';

const TYPE_LABELS: Record<PluginType, string> = {
  all: 'All',
  source: 'Data Sources',
  theme: 'Themes',
  renderer: 'Renderers',
};

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function PluginCard({ plugin }: { plugin: PluginEntry }) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.06]">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{plugin.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white truncate">{plugin.displayName}</h3>
            {plugin.builtIn && (
              <span className="shrink-0 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 uppercase tracking-wider">
                Built-in
              </span>
            )}
            {plugin.featured && !plugin.builtIn && (
              <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300 uppercase tracking-wider">
                Featured
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-white/50 leading-relaxed">{plugin.description}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/40 uppercase tracking-wider">
              {plugin.type}
            </span>
            {plugin.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[11px] text-white/30">
                #{tag}
              </span>
            ))}
          </div>
          {plugin.npmPackage && (
            <p className="mt-2 text-[11px] text-white/30 font-mono">
              npm i {plugin.npmPackage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PluginsPage() {
  const [typeFilter, setTypeFilter] = useState<PluginType>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = PLUGINS;

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.type === typeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.displayName.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q)),
      );
    }

    // Built-in first, then featured, then alphabetical
    return result.sort((a, b) => {
      if (a.builtIn !== b.builtIn) return a.builtIn ? -1 : 1;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [typeFilter, search]);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/"
              className="text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              swarming
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-sm text-white/60">plugins</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-2">Plugin Directory</h1>
          <p className="mt-2 text-white/50 max-w-2xl">
            Extend swarming with data sources, themes, and renderers. Ship with the built-in
            plugins or install community plugins from npm.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Type filter */}
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {(Object.entries(TYPE_LABELS) as [PluginType, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTypeFilter(key)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  typeFilter === key
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plugins..."
            className="w-full sm:w-64 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
          />

          <span className="ml-auto text-sm text-white/30">
            {filtered.length} plugin{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((plugin) => (
            <PluginCard key={plugin.name} plugin={plugin} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="mt-16 text-center text-white/30">
            <p className="text-lg">No plugins found</p>
            <p className="mt-1 text-sm">Try a different search or filter</p>
          </div>
        )}

        {/* Create your own */}
        <div className="mt-12 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold">Create Your Own Plugin</h2>
          <p className="mt-1 text-sm text-white/50">
            Scaffold a new plugin project with the CLI and publish to npm for the community.
          </p>
          <pre className="mt-4 rounded-lg bg-black/40 px-4 py-3 text-sm text-white/70 font-mono overflow-x-auto">
            npx create-swarming-plugin my-plugin
          </pre>
          <p className="mt-3 text-xs text-white/30">
            Use the <code className="text-white/40">swarming-plugin</code> or{' '}
            <code className="text-white/40">swarming-theme</code> npm keyword so your plugin
            appears in this directory.
          </p>
        </div>
      </div>
    </main>
  );
}
