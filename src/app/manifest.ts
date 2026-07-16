import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'MY DIAMOND',
        short_name: 'MY DIAMOND',
        description: 'Plataforma Oficial - MY DIAMOND',
        start_url: '/',
        display: 'standalone',
        background_color: '#07102e',
        theme_color: '#00E5D0',
        icons: [
            {
                src: '/logo-oficial-mydiamond.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
