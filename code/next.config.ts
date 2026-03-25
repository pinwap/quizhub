import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove X-Powered-By header
  poweredByHeader: false,

  // Enable gzip/brotli compression for responses
  compress: true,

  // Tree-shake large icon/component libraries — reduces JS bundle significantly
  experimental: {
    optimizePackageImports: ["react-icons"],
  },
};

export default nextConfig;
