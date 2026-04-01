import type { NextConfig } from "next";

// Build version: 2026-03-25-v2 (force cache invalidation)
const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/favicon.ico',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
      {
        source: '/:path*.(png|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600, must-revalidate' },
        ],
      },
    ];
  },
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'sharp',
    'pino',
    'qrcode',
  ],
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
