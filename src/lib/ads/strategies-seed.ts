import { AdPlatform } from '@prisma/client'

export interface StrategySeedData {
    name: string
    description: string
    platform: AdPlatform
    objective: string
    destination: string
    mediaType: string
    mediaCount: number
    minBudgetUSD: number
    advantageType: string
    sortOrder: number
}

export const STRATEGIES_SEED: StrategySeedData[] = [
    // ── META · Instagram ────────────────────────────────────────────
    {
        name: 'Élite Advantage — Instagram',
        description: 'Máximo alcance en Instagram con Advantage+ de Meta. 20 imágenes para prueba A/B masiva.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'image',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 1
    },
    {
        name: 'Legión Advantage — Instagram',
        description: 'Campaña de conversiones en Instagram con audiencia Advantage+ y alto volumen de creativos.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'image',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 2
    },
    {
        name: 'Versátil Advantage — Instagram',
        description: 'Videos cortos en Instagram con Advantage+. Estrategia de alto engagement y conversión.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 3
    },
    {
        name: 'Gladiador Advantage — Instagram',
        description: 'Videos masivos en Instagram. La estrategia más potente para ventas directas.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 4
    },
    {
        name: 'Espartana Advantage — Instagram',
        description: 'Estrategia compacta de videos en Instagram. Ideal para empezar con bajo presupuesto.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 5
    },
    {
        name: 'Dominante Smart — Instagram',
        description: 'Segmentación inteligente por intereses en Instagram. 5 imágenes de alto impacto.',
        platform: 'META',
        objective: 'conversions',
        destination: 'instagram',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 6
    },

    // ── META · WhatsApp ──────────────────────────────────────────────
    {
        name: 'Blindada Advantage — WhatsApp',
        description: 'Máximo volumen de mensajes a WhatsApp con Advantage+. 20 imágenes para escalar.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'image',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 7
    },
    {
        name: 'Selección Smart — WhatsApp',
        description: 'Segmentación inteligente dirigida a WhatsApp. 10 imágenes y audiencia precisa.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 8
    },
    {
        name: 'Escudo Advantage — WhatsApp',
        description: 'Estrategia defensiva con imágenes y Advantage+. Costo por mensaje optimizado.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 9
    },
    {
        name: 'Vanguardia Advantage — WhatsApp',
        description: 'Videos de alto impacto que dirigen a WhatsApp. 20 videos para máxima cobertura.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 10
    },
    {
        name: 'Magnética Smart — WhatsApp',
        description: 'Videos con segmentación inteligente por intereses. 10 videos hipersegmentados.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 11
    },
    {
        name: 'Flujo Advantage — WhatsApp',
        description: 'Flujo continuo de mensajes a WhatsApp con videos y Advantage+.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 12
    },
    {
        name: 'Imperial Smart — WhatsApp',
        description: 'Estrategia premium de 5 videos con segmentación de audiencia precisa.',
        platform: 'META',
        objective: 'conversions',
        destination: 'whatsapp',
        mediaType: 'video',
        mediaCount: 5,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 13
    },

    // ── META · Sitio Web ─────────────────────────────────────────────
    {
        name: 'Élite Web Advantage',
        description: 'Máximas conversiones en sitio web con Advantage+. 20 imágenes para escala masiva.',
        platform: 'META',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 14
    },
    {
        name: 'Relámpago Advantage — Web',
        description: 'Conversiones rápidas al sitio web con imágenes y Advantage+. Rápido encendido.',
        platform: 'META',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 15
    },
    {
        name: 'Radar Smart — Web',
        description: 'Segmentación inteligente hacia sitio web. Audiencias de alto valor de compra.',
        platform: 'META',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 16
    },
    {
        name: 'Leonidas Advantage — Web',
        description: 'Videos masivos hacia sitio web. La estrategia definitiva para e-commerce.',
        platform: 'META',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 17
    },
    {
        name: 'Asalto Smart — Web',
        description: 'Ataque preciso con 5 videos y segmentación inteligente hacia tu tienda online.',
        platform: 'META',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 5,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 18
    },

    // ── META · Leads ─────────────────────────────────────────────────
    {
        name: 'Captación Élite — Formulario',
        description: 'Generación de leads con formulario nativo de Meta. Alta tasa de conversión.',
        platform: 'META',
        objective: 'leads',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 19
    },
    {
        name: 'Formulario Pro Smart',
        description: 'Leads de calidad con segmentación por intereses y formulario nativo.',
        platform: 'META',
        objective: 'leads',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 20
    },

    // ── META · Messenger ─────────────────────────────────────────────
    {
        name: 'Mensajero Advantage',
        description: 'Conversaciones directas vía Messenger con Advantage+. Cierra ventas en el chat.',
        platform: 'META',
        objective: 'leads',
        destination: 'messenger',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'advantage',
        sortOrder: 21
    },
    {
        name: 'Diálogo Smart — Messenger',
        description: 'Videos que generan conversaciones en Messenger. Segmentación de alto potencial.',
        platform: 'META',
        objective: 'leads',
        destination: 'messenger',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 4,
        advantageType: 'smart_segmentation',
        sortOrder: 22
    },

    // ── TIKTOK · In-Feed → Sitio Web ────────────────────────────────
    {
        name: 'TopFeed Masivo — Conversiones',
        description: '20 videos In-Feed en TikTok con placement automático. Máxima escala para ventas directas al sitio web.',
        platform: 'TIKTOK',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 23
    },
    {
        name: 'TopFeed Estándar — Conversiones',
        description: '10 videos optimizados para conversiones en TikTok. Placement automático con IA de TikTok.',
        platform: 'TIKTOK',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 24
    },
    {
        name: 'TopFeed Compacto — Conversiones',
        description: '5 videos de alto impacto para conversiones. Ideal para presupuestos ajustados.',
        platform: 'TIKTOK',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 5,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 25
    },
    {
        name: 'Smart Interest — Conversiones',
        description: '10 videos con segmentación por intereses y comportamiento. Audiencia precisa y cualificada.',
        platform: 'TIKTOK',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 5,
        advantageType: 'smart_segmentation',
        sortOrder: 26
    },
    {
        name: 'eCommerce Élite — TikTok',
        description: '20 videos enfocados en producto con CTA directa a tienda. Optimizado para compras online.',
        platform: 'TIKTOK',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 8,
        advantageType: 'smart_segmentation',
        sortOrder: 27
    },

    // ── TIKTOK · In-Feed → Tráfico ───────────────────────────────────
    {
        name: 'Tráfico Masivo — TikTok',
        description: '20 videos para llevar tráfico de calidad a tu sitio web. Placement automático en todo TikTok.',
        platform: 'TIKTOK',
        objective: 'traffic',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 28
    },
    {
        name: 'Tráfico Smart — TikTok',
        description: '10 videos con segmentación inteligente. Lleva tráfico cualificado a tu página de destino.',
        platform: 'TIKTOK',
        objective: 'traffic',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 5,
        advantageType: 'smart_segmentation',
        sortOrder: 29
    },

    // ── TIKTOK · Leads ───────────────────────────────────────────────
    {
        name: 'Leads Élite — TikTok',
        description: '10 videos diseñados para captar contactos y llevarlos a tu formulario de registro.',
        platform: 'TIKTOK',
        objective: 'leads',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 30
    },
    {
        name: 'Leads Compacto — TikTok',
        description: '5 videos de captura de leads. Mínimo presupuesto, máximo impacto para generación de prospectos.',
        platform: 'TIKTOK',
        objective: 'leads',
        destination: 'website',
        mediaType: 'video',
        mediaCount: 5,
        minBudgetUSD: 5,
        advantageType: 'smart_segmentation',
        sortOrder: 31
    },

    // ── TIKTOK · Spark Ads / Reconocimiento ─────────────────────────
    {
        name: 'Spark Ads Élite — Viral',
        description: 'Impulsa contenido orgánico como anuncio. 10 videos con máxima autenticidad y alcance viral.',
        platform: 'TIKTOK',
        objective: 'awareness',
        destination: 'tiktok',
        mediaType: 'video',
        mediaCount: 10,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 32
    },
    {
        name: 'Spark Ads Pro — Branding',
        description: '5 videos de Spark Ads para construir marca. Perfectos para creadores de contenido y negocios.',
        platform: 'TIKTOK',
        objective: 'awareness',
        destination: 'tiktok',
        mediaType: 'video',
        mediaCount: 5,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 33
    },
    {
        name: 'Reconocimiento Masivo — TikTok',
        description: '20 videos para máximo reconocimiento de marca. Alcanza millones de usuarios únicos.',
        platform: 'TIKTOK',
        objective: 'awareness',
        destination: 'tiktok',
        mediaType: 'video',
        mediaCount: 20,
        minBudgetUSD: 5,
        advantageType: 'advantage',
        sortOrder: 34
    },

    // ── GOOGLE ADS · Search (Custom) ─────────────────────────────────
    {
        name: 'Search Élite — Conversiones',
        description: 'Anuncios de búsqueda en Google. Captura usuarios con intención activa de compra. 5 variaciones de anuncios RSA.',
        platform: 'GOOGLE_ADS',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 10,
        advantageType: 'custom',
        sortOrder: 35
    },
    {
        name: 'Search Masivo — Conversiones',
        description: '10 anuncios de texto responsivos (RSA) para máxima cobertura de búsquedas. Google elige la mejor combinación.',
        platform: 'GOOGLE_ADS',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 10,
        advantageType: 'custom',
        sortOrder: 36
    },
    {
        name: 'Search Tráfico — Google',
        description: 'Anuncios de búsqueda optimizados para generar tráfico de calidad hacia tu sitio web.',
        platform: 'GOOGLE_ADS',
        objective: 'traffic',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 8,
        advantageType: 'custom',
        sortOrder: 37
    },
    {
        name: 'Search Leads — Google',
        description: 'Captura leads desde búsquedas de Google. 5 anuncios RSA enfocados en generación de prospectos.',
        platform: 'GOOGLE_ADS',
        objective: 'leads',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 8,
        advantageType: 'custom',
        sortOrder: 38
    },

    // ── GOOGLE ADS · Display (Smart Segmentation) ────────────────────
    {
        name: 'Display Remarketing Élite',
        description: 'Reconecta con visitantes de tu sitio. Anuncios display con imágenes en toda la red de Google. Alto ROAS.',
        platform: 'GOOGLE_ADS',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 8,
        advantageType: 'smart_segmentation',
        sortOrder: 39
    },
    {
        name: 'Display Awareness Masivo',
        description: 'Alcanza millones de sitios web con anuncios display. Reconocimiento de marca a gran escala.',
        platform: 'GOOGLE_ADS',
        objective: 'awareness',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 15,
        minBudgetUSD: 8,
        advantageType: 'smart_segmentation',
        sortOrder: 40
    },
    {
        name: 'Display Leads Smart',
        description: 'Captura leads con anuncios display segmentados por intereses y comportamiento de compra.',
        platform: 'GOOGLE_ADS',
        objective: 'leads',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 5,
        minBudgetUSD: 8,
        advantageType: 'smart_segmentation',
        sortOrder: 41
    },

    // ── GOOGLE ADS · Performance Max (Advantage) ─────────────────────
    {
        name: 'Performance Max — Conversiones',
        description: 'Máxima cobertura en Search, Display, YouTube, Gmail y Maps. Google IA optimiza automáticamente.',
        platform: 'GOOGLE_ADS',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 15,
        advantageType: 'advantage',
        sortOrder: 42
    },
    {
        name: 'Performance Max — Leads',
        description: 'PMax optimizado para generación de leads. Cubre todos los inventarios de Google con IA.',
        platform: 'GOOGLE_ADS',
        objective: 'leads',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 10,
        minBudgetUSD: 15,
        advantageType: 'advantage',
        sortOrder: 43
    },
    {
        name: 'Performance Max — eCommerce',
        description: 'PMax para tiendas online. Maximiza ventas en todos los canales de Google con Smart Bidding.',
        platform: 'GOOGLE_ADS',
        objective: 'conversions',
        destination: 'website',
        mediaType: 'image',
        mediaCount: 15,
        minBudgetUSD: 20,
        advantageType: 'advantage',
        sortOrder: 44
    }
]
