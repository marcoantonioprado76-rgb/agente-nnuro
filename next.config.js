/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Todos los paquetes que Baileys usa con código nativo de Node.js
    experimental: {
        instrumentationHook: true,
        serverComponentsExternalPackages: [
            '@whiskeysockets/baileys',
            // `canvas` es NATIVO: se usa para dibujar la ENTRADA (ticket con su diseño
            // metálico + el QR adentro) como PNG. No debe empaquetarse con webpack.
            'canvas',
            'pino',
            'pino-pretty',
            'ws',
            'bufferutil',
            'utf-8-validate',
            '@hapi/boom',
            'noise-handshake',
            'libsignal',
            'get-port',
            // Sanitizador HTML del render público de landings: usa jsdom, que NO debe bundlearse
            // (si no, el build falla buscando default-stylesheet.css). Se carga desde node_modules.
            'isomorphic-dompurify',
            'jsdom',
        ],
    },

    async headers() {
        const securityHeaders = [
            // SAMEORIGIN (no DENY) para que el panel pueda previsualizar sus propias
            // landings (/lp/*) en un iframe. Sigue bloqueando el framing de otros orígenes.
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            // camera=(self): NUESTRAS páginas pueden usar la cámara — la necesita el
            // escáner de QR del check-in de Entradas (/admin/entradas/scan). Sigue
            // bloqueada para orígenes de terceros (iframes), así que no se afloja nada más.
            { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=()' },
            {
                key: 'Content-Security-Policy',
                value: [
                    "default-src 'self'",
                    // Solo el mismo origen puede enmarcar estas páginas (coherente con SAMEORIGIN).
                    "frame-ancestors 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://player.vimeo.com",
                    // style-src: incluir cdnjs (FA), fonts (Google), Reown/WalletConnect, y secure.walletconnect.org
                    "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://secure.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                    "img-src 'self' data: blob: https:",
                    "media-src 'self' https:",
                    // connect-src: 'self' + https: + wss: para WalletConnect WebSocket relay
                    "connect-src 'self' https: wss: data:",
                    // frame-src: iframes de Reown/WalletConnect (verify) + Cloudflare/YouTube/Vimeo existentes
                    "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://verify.walletconnect.org https://verify.walletconnect.com https://secure.walletconnect.org https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                    // font-src: data + cdnjs + fonts (Google) + Reown/WalletConnect
                    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://*.walletconnect.com https://*.walletconnect.org https://*.reown.com",
                ].join('; '),
            },
        ]
        return [
            // Headers en todas las páginas (sin X-Robots-Tag para que la landing sea indexable)
            { source: '/:path*', headers: securityHeaders },
            // X-Robots-Tag solo en rutas privadas — bots no deben indexar dashboard/admin/api
            { source: '/dashboard/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/admin/:path*',     headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
            { source: '/api/:path*',       headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
        ]
    },

    webpack: (config, { isServer }) => {
        config.resolve = config.resolve || {}

        if (isServer) {
            // Forzar que estos módulos sean tratados como externos aunque webpack los vea.
            // `canvas` es NATIVO y SÍ lo usamos en el servidor: dibuja la ENTRADA (ticket
            // metálico con el QR adentro). Tiene que resolverse de verdad, NO anularse.
            const nativeModules = [
                'bufferutil',
                'utf-8-validate',
                'ws',
                '@whiskeysockets/baileys',
                'pino',
                'canvas',
            ]
            config.externals = [
                ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
                ...nativeModules,
            ]
        } else {
            // Solo en el CLIENTE: react-pdf / pdfjs-dist referencian "canvas" como
            // dependencia OPCIONAL de Node. En el navegador no existe → se anula.
            config.resolve.alias = { ...(config.resolve.alias || {}), canvas: false }
        }
        return config
    },
}

module.exports = nextConfig
