import Link from "next/link";
import { posts } from "./posts";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndex() {
  return (
    <main className="min-h-screen bg-[#0a0a12] text-[#d8d8e8] px-6 py-16 font-[family-name:var(--font-ibm-plex-mono)]">
      <div className="max-w-4xl mx-auto">
        <header className="mb-16">
          <nav className="flex flex-wrap gap-3 mb-8 text-xs">
            {[
              { href: '/', label: '← Home' },
              { href: '/world', label: 'World' },
              { href: '/agents', label: 'Agents' },
              { href: '/demos', label: 'Demos' },
              { href: '/tools', label: 'Tools' },
              { href: '/docs', label: 'Docs' },
              { href: '/showcase', label: 'Showcase' },
              { href: '/plugins', label: 'Plugins' },
              { href: '/playground', label: 'Playground' },
              { href: '/benchmarks', label: 'Benchmarks' },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-[#6a6a8a] hover:text-white border border-[#1e1e2e] rounded px-3 py-1.5 transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">Blog</h1>
          <p className="text-[#8888a8] text-lg leading-relaxed max-w-2xl">
            Technical deep-dives on real-time data visualization, WebGL
            performance, and building developer tools.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block rounded-lg border border-[#1e1e2e] bg-[#0e0e1a] p-6 transition-all duration-200 hover:border-[#3a3a5a] hover:bg-[#12121f]"
            >
              <div className="flex items-center gap-3 text-xs text-[#6a6a8a] mb-3">
                <time dateTime={post.date}>{formatDate(post.date)}</time>
                <span aria-hidden="true">&middot;</span>
                <span>{post.readingTime}</span>
              </div>

              <h2 className="text-lg font-medium leading-snug mb-3 group-hover:text-white transition-colors">
                {post.title}
              </h2>

              <p className="text-sm text-[#8888a8] leading-relaxed mb-4">
                {post.description}
              </p>

              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full border border-[#2a2a3a] text-[#7a7a9a]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
