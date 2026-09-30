/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["maplibre-gl"],
  experimental: {
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
  // better-sqlite3 is a native module used only by the Node-runtime auth route
  // handlers. Keeping it external stops Webpack from trying to bundle its
  // native binding (which pulls `node:crypto`/`node:path`) into any client or
  // Edge bundle.
};
export default nextConfig;
