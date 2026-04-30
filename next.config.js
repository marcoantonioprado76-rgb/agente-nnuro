/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js/webpack from bundling these packages — they must be
  // required at runtime from node_modules so native addons (ws mask, etc.) work.
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'ws',
    'bufferutil',
    'utf-8-validate',
    'pino',
    'pino-pretty',
    '@hapi/boom',
  ],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
