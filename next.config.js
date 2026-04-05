/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@web3viz/core',
    '@web3viz/providers',
    '@web3viz/react-graph',
    '@web3viz/ui',
    '@web3viz/utils',
  ],
  async headers() {
    return [
      {
        source: '/.well-known/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Content-Type', value: 'application/json' },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
