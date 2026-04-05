import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { DocsShell } from '../components/DocsShell';
import { loadContent, getAllSlugs, hasContent } from '../content/loader';
import { docsContent } from '../content/registry';
import { flattenNavItems, docsNavigation } from '../navigation';

interface PageProps {
  params: { slug?: string[] };
}

export async function generateStaticParams() {
  return [
    { slug: [] }, // /docs index
    ...getAllSlugs().map(slug => ({ slug })),
  ];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = params.slug;
  if (!slug || slug.length === 0) {
    return {
      title: 'Documentation',
      description: 'swarming SDK documentation — real-time 3D visualization of streaming data.',
    };
  }
  const key = slug.join('/');
  const entry = docsContent[key];
  if (!entry) return {};

  return {
    title: entry.title,
    description: entry.description,
    keywords: entry.keywords,
  };
}

function getPrevNext(slug: string[]) {
  const allItems = flattenNavItems(docsNavigation);
  const currentHref = '/docs/' + slug.join('/');
  const idx = allItems.findIndex(item => item.href === currentHref);

  return {
    prev: idx > 0 ? allItems[idx - 1] : null,
    next: idx < allItems.length - 1 ? allItems[idx + 1] : null,
  };
}

function DocsHomePage() {
  return (
    <DocsShell>
      <div style={{ padding: '20px 0' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 600,
          color: '#e2e2f0',
          marginBottom: '12px',
          letterSpacing: '-0.03em',
        }}>
          <span style={{ color: '#a78bfa' }}>swarming</span> documentation
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#8888aa',
          lineHeight: 1.6,
          maxWidth: 560,
          marginBottom: '40px',
        }}>
          Build real-time, interactive 3D visualizations of streaming data —
          blockchain transactions, AI agents, infrastructure monitoring, and beyond.
        </p>

        <div className="docs-grid" style={{ marginBottom: '40px' }}>
          <Link href="/docs/getting-started/installation" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px', color: '#6b7280' }}>01</div>
            <h3>Installation</h3>
            <p>Install the SDK and set up your project in under a minute.</p>
          </Link>
          <Link href="/docs/getting-started/quick-start" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px', color: '#6b7280' }}>02</div>
            <h3>Quick Start</h3>
            <p>Get a live 3D visualization running in 30 seconds.</p>
          </Link>
          <Link href="/docs/getting-started/first-visualization" className="docs-card docs-card-highlight">
            <div style={{ fontSize: '20px', marginBottom: '8px', color: '#6b7280' }}>03</div>
            <h3>Your First Visualization</h3>
            <p>Build a complete real-time graph from scratch.</p>
          </Link>
        </div>

        <h2 style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#d8d8e8',
          marginBottom: '16px',
          marginTop: '48px',
        }}>
          Explore
        </h2>

        <div className="docs-grid">
          <Link href="/docs/guide/data-sources" className="docs-card">
            <h3>Data Sources</h3>
            <p>WebSocket streams, static data, custom providers</p>
          </Link>
          <Link href="/docs/guide/customization" className="docs-card">
            <h3>Customization</h3>
            <p>Themes, nodes, edges, physics, camera</p>
          </Link>
          <Link href="/docs/api/swarming-component" className="docs-card">
            <h3>API Reference</h3>
            <p>Complete props, hooks, and type documentation</p>
          </Link>
          <Link href="/docs/guide/performance" className="docs-card">
            <h3>Performance</h3>
            <p>Handle 10K+ nodes at 60fps</p>
          </Link>
          <Link href="/docs/examples/live-demos" className="docs-card">
            <h3>Examples</h3>
            <p>Live demos, CodeSandbox templates, use cases</p>
          </Link>
          <Link href="/docs/community/contributing" className="docs-card">
            <h3>Community</h3>
            <p>Contributing, changelog, roadmap, showcase</p>
          </Link>
        </div>
      </div>
    </DocsShell>
  );
}

export default async function DocPage({ params }: PageProps) {
  const slug = params.slug;

  // Index page
  if (!slug || slug.length === 0) {
    return <DocsHomePage />;
  }

  if (!hasContent(slug)) {
    notFound();
  }

  const Content = await loadContent(slug);
  if (!Content) {
    notFound();
  }

  const { prev, next } = getPrevNext(slug);
  const editPath = `app/docs/content/${slug.join('/')}.tsx`;

  return (
    <DocsShell>
      <article className="docs-article">
        <Content />
      </article>

      {/* Edit on GitHub link */}
      <div style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(140,140,200,0.08)',
      }}>
        <a
          href={`https://github.com/swarming-world/visualize-web3-realtime/edit/main/${editPath}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#6b7280',
            fontSize: '12px',
            fontFamily: 'var(--font-ibm-plex-mono), monospace',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Edit this page on GitHub &rarr;
        </a>
      </div>

      {/* Prev / Next navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '24px',
        paddingTop: '24px',
        borderTop: '1px solid rgba(140,140,200,0.08)',
        gap: '16px',
      }}>
        {prev ? (
          <Link
            href={prev.href}
            style={{
              display: 'block',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(140,140,200,0.1)',
              textDecoration: 'none',
              flex: 1,
            }}
          >
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Previous</div>
            <div style={{ color: '#a78bfa', fontSize: '13px' }}>&larr; {prev.title}</div>
          </Link>
        ) : <div />}
        {next ? (
          <Link
            href={next.href}
            style={{
              display: 'block',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(140,140,200,0.1)',
              textDecoration: 'none',
              flex: 1,
              textAlign: 'right',
            }}
          >
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>Next</div>
            <div style={{ color: '#a78bfa', fontSize: '13px' }}>{next.title} &rarr;</div>
          </Link>
        ) : <div />}
      </nav>
    </DocsShell>
  );
}
