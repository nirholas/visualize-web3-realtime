"use client";

export function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={[
        "max-w-3xl mx-auto text-[#d8d8e8]",
        "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:tracking-tight",
        "[&_h3]:text-xl [&_h3]:font-medium [&_h3]:mt-8 [&_h3]:mb-3",
        "[&_p]:text-[#b0b0c8] [&_p]:leading-relaxed [&_p]:mb-4",
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-[#b0b0c8] [&_ul]:leading-relaxed",
        "[&_li]:mb-1",
        "[&_pre]:bg-[#0e0e1a] [&_pre]:border [&_pre]:border-[#1e1e2e] [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:mb-4 [&_pre]:text-sm",
        "[&_code]:font-[family-name:var(--font-ibm-plex-mono)] [&_code]:text-[#a0a0d0]",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-[#3a3a5a] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[#8888a8] [&_blockquote]:my-6",
        "[&_a]:text-[#6b8aff] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-[#8ba8ff]",
        "[&_strong]:text-[#d8d8e8] [&_strong]:font-semibold",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
