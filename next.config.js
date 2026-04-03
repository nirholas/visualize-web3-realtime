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
};
module.exports = nextConfig;
