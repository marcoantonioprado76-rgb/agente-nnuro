/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    // Next.js 14: prevent webpack from bundling these packages so native
    // addons (ws mask function, etc.) are preserved at runtime.
    // This fixes "t.mask is not a function" in Baileys WebSocket connections.
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'ws',
      'bufferutil',
      'utf-8-validate',
      'pino',
      'pino-pretty',
      'qrcode',
      '@hapi/boom',
    ],
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

module.exports = nextConfig;
