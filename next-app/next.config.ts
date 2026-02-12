import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Turbopack root - absolute path to parent directory for resolving imports from ../src/
  turbopack: {
    root: path.resolve(__dirname, '..'),
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_NAME: 'ClaudeHydra',
  },

  // CORS headers for API routes (needed for cross-origin SSE connections)
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },

  // Experimental features
  experimental: {
    // Enable React compiler when stable
    // reactCompiler: true,
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Server-side packages that should not be bundled
  // node-llama-cpp uses native modules that can't be bundled
  serverExternalPackages: ['node-llama-cpp'],
};

export default nextConfig;
