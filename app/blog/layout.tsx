import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog \u2014 Swarming",
  description:
    "Technical deep-dives on real-time data visualization, WebGL performance, and building developer tools.",
  openGraph: {
    title: "Blog \u2014 Swarming",
    description:
      "Technical deep-dives on real-time data visualization, WebGL performance, and building developer tools.",
    images: [{ url: "/og-preview.png", width: 1200, height: 630 }],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
