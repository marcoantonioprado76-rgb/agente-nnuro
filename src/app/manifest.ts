import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'NÜRO',
        short_name: 'NÜRO',
        description: 'Plataforma Oficial - NÜRO',
        start_url: '/',
        display: 'standalone',
        background_color: '#07102e',
        theme_color: '#00E5D0',
        icons: [
            {
                src: '/logo-oficial-nuro.png',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    }
}
