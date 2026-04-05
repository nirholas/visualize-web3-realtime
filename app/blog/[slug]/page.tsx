import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import dynamic from "next/dynamic";
import { posts } from "../posts";

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      images: post.ogImage
        ? [{ url: post.ogImage }]
        : [{ url: "/og-preview.png" }],
    },
  };
}

const contentComponents: Record<
  string,
  ReturnType<typeof dynamic>
> = {
  "swarming-vs-alternatives": dynamic(
    () => import("./content/swarming-vs-alternatives")
  ),
  "websocket-to-3d": dynamic(() => import("./content/websocket-to-3d")),
  "zero-dom-reads": dynamic(() => import("./content/zero-dom-reads")),
  "building-realtime-viz-engine": dynamic(
    () => import("./content/building-realtime-viz-engine")
  ),
  "rendering-5000-particles": dynamic(
    () => import("./content/rendering-5000-particles")
  ),
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPostPage({ params }: PageProps) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  const ContentComponent = contentComponents[post.slug];

  return (
    <main className="min-h-screen bg-[#0a0a12] text-[#d8d8e8] px-6 py-16 font-[family-name:var(--font-ibm-plex-mono)]">
      <article className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-[#6a6a8a] hover:text-[#d8d8e8] transition-colors mb-10"
        >
          <span aria-hidden="true">&larr;</span> Back to blog
        </Link>

        <header className="mb-12">
          <div className="flex items-center gap-3 text-xs text-[#6a6a8a] mb-4">
            <time dateTime={post.date}>{formatDate(post.date)}</time>
            <span aria-hidden="true">&middot;</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight mb-6">
            {post.title}
          </h1>

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
        </header>

        {ContentComponent ? (
          <ContentComponent />
        ) : (
          <p className="text-[#6a6a8a]">Content coming soon.</p>
        )}
      </article>
    </main>
  );
}
