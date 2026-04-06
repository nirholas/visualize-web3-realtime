import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { SiteNav } from "./SiteNav";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600'],
  variable: '--font-ibm-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://swarming.dev'),
  title: {
    default: 'Swarming — Real-time Data Visualization at 60fps',
    template: '%s | Swarming',
  },
  description:
    'GPU-accelerated 3D network visualization for any streaming data source. React component. 5,000+ nodes at 60fps. Open source.',
  keywords: [
    'data visualization',
    'real-time',
    'force graph',
    'react',
    'threejs',
    'webgl',
    'network graph',
    'force directed graph',
    'websocket visualization',
    'd3 force graph',
    '3d graph javascript',
    'graph visualization library',
  ],
  authors: [{ name: 'Swarming Contributors', url: 'https://github.com/nicholasgriffintn/visualize-web3-realtime' }],
  creator: 'Swarming',
  publisher: 'Swarming',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Swarming — Real-time Data Visualization',
    description:
      '5,000+ nodes at 60fps. GPU-accelerated 3D network visualization for any streaming data source.',
    type: 'website',
    siteName: 'Swarming',
    locale: 'en_US',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Swarming — real-time 3D network visualization at 60fps',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Swarming — Real-time Data Visualization',
    description:
      'GPU-accelerated 3D network visualization. 5,000+ nodes at 60fps. Open source React component.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Swarming',
  description:
    'GPU-accelerated real-time 3D network visualization for any streaming data source. React component with 5,000+ nodes at 60fps.',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Web Browser',
  url: 'https://swarming.dev',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  license: 'https://opensource.org/licenses/MIT',
  programmingLanguage: ['TypeScript', 'React', 'Three.js'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
