'use client';

import Link from 'next/link';
import { useState } from 'react';

const demos = [
  {
    slug: 'github',
    name: 'GitHub Activity',
    description: 'Visualize repository events in real-time. Hub nodes are repos, particles are pushes, PRs, issues, stars, and forks.',
    audience: 'Developers',
    category: 'Developer Tools',
    color: '#22c55e',
    icon: '{ }',
  },
  {
    slug: 'kubernetes',
    name: 'Kubernetes Cluster',
    description: 'Monitor pod lifecycle across namespaces. Watch pods appear, scale, and terminate in a beautiful 3D cluster view.',
    audience: 'DevOps Engineers',
    category: 'Infrastructure',
    color: '#3b82f6',
    icon: '[ ]',
  },
  {
    slug: 'social',
    name: 'Social Network',
    description: 'Map social interactions between top accounts. Likes, reposts, follows, and replies flow through the network.',
    audience: 'Data Scientists',
    category: 'Social & Media',
    color: '#a855f7',
    icon: '@ @',
  },
  {
    slug: 'api-traffic',
    name: 'API Traffic Monitor',
    description: 'Watch HTTP requests flow to API endpoints in real-time. Color-coded by status: 2xx, 3xx, 4xx, 5xx.',
    audience: 'Backend Engineers',
    category: 'Infrastructure',
    color: '#f97316',
    icon: '> <',
  },
  {
    slug: 'ai-agents',
    name: 'AI Agent Swarm',
    description: 'Visualize multi-agent task orchestration. See planners, coders, reviewers, and testers communicate in real-time.',
    audience: 'AI Engineers',
    category: 'AI & ML',
    color: '#eab308',
    icon: '* *',
  },
  {
    slug: 'iot',
    name: 'IoT Sensor Network',
    description: 'Monitor distributed sensors sending readings to gateways. Temperature, humidity, motion, pressure, and light.',
    audience: 'IoT Developers',
    category: 'Hardware & IoT',
    color: '#06b6d4',
    icon: '. .',
  },
];

const categories = ['All', ...new Set(demos.map((d) => d.category))];

export default function DemosIndex() {
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? demos : demos.filter((d) => d.category === filter);

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        background: '#0a0a12',
        color: '#e5e5e5',
        fontFamily: "'IBM Plex Mono', monospace",
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '40px 40px 28px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.04em', margin: 0 }}>
              Use-Case Demos
            </h1>
            <p style={{ fontSize: 11, color: '#888', marginTop: 6, letterSpacing: '0.06em' }}>
              Real-time network visualization for every domain &mdash; all running on mock data, no API keys required
            </p>
          </div>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { href: '/world', label: '← World' },
              { href: '/tools', label: 'Tools' },
              { href: '/agents', label: 'Agents' },
              { href: '/docs', label: 'Docs' },
              { href: '/blog', label: 'Blog' },
              { href: '/showcase', label: 'Showcase' },
              { href: '/plugins', label: 'Plugins' },
              { href: '/playground', label: 'Playground' },
              { href: '/benchmarks', label: 'Benchmarks' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: 11,
                  color: '#888',
                  textDecoration: 'none',
                  padding: '6px 14px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                }}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Category filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                fontSize: 10,
                padding: '4px 12px',
                borderRadius: 12,
                border: `1px solid ${filter === cat ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                background: filter === cat ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: filter === cat ? '#e5e5e5' : '#666',
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.06em',
                transition: 'all 150ms',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </header>

      {/* Demo grid */}
      <main
        style={{
          padding: '32px 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 20,
        }}
      >
        {filtered.map((demo) => (
          <Link
            key={demo.slug}
            href={`/demos/${demo.slug}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div
              style={{
                padding: '24px 28px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 10,
                transition: 'all 250ms',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Accent bar */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: `linear-gradient(90deg, ${demo.color}, transparent)`,
                }}
              />

              {/* Top row: icon + category */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: `${demo.color}15`,
                    border: `1px solid ${demo.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: demo.color,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {demo.icon}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: `${demo.color}15`,
                    color: demo.color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {demo.category}
                </span>
              </div>

              {/* Name */}
              <h2 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 8px', letterSpacing: '0.03em' }}>
                {demo.name}
              </h2>

              {/* Description */}
              <p style={{ fontSize: 11, color: '#888', lineHeight: 1.6, margin: '0 0 16px' }}>
                {demo.description}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 9, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {demo.audience}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: demo.color,
                    letterSpacing: '0.04em',
                  }}
                >
                  View Demo &rarr;
                </span>
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
