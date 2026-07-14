// Motor de temas de la tienda virtual.
//
// El dueño elige (en themeConfig.theme) un preset + opciones (color, tipografía).
// resolveStoreTheme() devuelve las variables CSS que la vitrina aplica en su raíz,
// y los componentes usan var(--st-*) en vez de colores fijos.
//
// Aditivo y retrocompatible: si una tienda no tiene tema, cae al preset por defecto
// ('neon-dark'), que es la versión pulida del look actual → las tiendas existentes
// se ven igual o mejor, nunca rotas.

export type FontKey = 'modern' | 'elegant' | 'rounded' | 'tech'

export const STORE_FONTS: Record<FontKey, { label: string; family: string; href: string }> = {
  modern: {
    label: 'Moderna',
    family: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap',
  },
  elegant: {
    label: 'Elegante',
    family: "'Playfair Display', Georgia, serif",
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap',
  },
  rounded: {
    label: 'Redonda',
    family: "'Poppins', system-ui, sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  },
  tech: {
    label: 'Tech',
    family: "'Space Grotesk', system-ui, sans-serif",
    href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap',
  },
}

type Preset = {
  label: string
  dark: boolean
  font: FontKey
  vars: Record<string, string>
}

// Cada preset define: fondo, superficie (header), tarjeta, textos, color principal
// (hex + rgb para transparencias), color de precio, bordes, sombra y radio.
export const STORE_THEMES: Record<string, Preset> = {
  'neon-dark': {
    label: 'Neón Oscuro',
    dark: true,
    font: 'modern',
    vars: {
      '--st-bg': '#0a0f23',
      '--st-surface': 'rgba(10,12,24,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(210,3,221,0.20)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.35)',
      '--st-text': '#ffffff',
      '--st-muted': 'rgba(255,255,255,0.5)',
      '--st-primary': '#D203DD',
      '--st-primary-rgb': '210,3,221',
      '--st-on-primary': '#ffffff',
      '--st-price': '#00FF88',
      '--st-border': 'rgba(210,3,221,0.14)',
      '--st-radius': '18px',
    },
  },
  'minimal-light': {
    label: 'Minimal Claro',
    dark: false,
    font: 'modern',
    vars: {
      '--st-bg': '#f4f5f7',
      '--st-surface': 'rgba(255,255,255,0.85)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(0,0,0,0.06)',
      '--st-card-shadow': '0 8px 24px rgba(15,23,42,0.08)',
      '--st-text': '#0f172a',
      '--st-muted': 'rgba(15,23,42,0.55)',
      '--st-primary': '#111827',
      '--st-primary-rgb': '17,24,39',
      '--st-on-primary': '#ffffff',
      '--st-price': '#059669',
      '--st-border': 'rgba(0,0,0,0.08)',
      '--st-radius': '20px',
    },
  },
  'luxe-gold': {
    label: 'Lujo Oro',
    dark: true,
    font: 'elegant',
    vars: {
      '--st-bg': '#0c0b09',
      '--st-surface': 'rgba(18,16,12,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(212,175,55,0.10), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(212,175,55,0.30)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.5)',
      '--st-text': '#f5efe0',
      '--st-muted': 'rgba(245,239,224,0.5)',
      '--st-primary': '#d4af37',
      '--st-primary-rgb': '212,175,55',
      '--st-on-primary': '#1a1407',
      '--st-price': '#e8c766',
      '--st-border': 'rgba(212,175,55,0.18)',
      '--st-radius': '14px',
    },
  },
  'natural': {
    label: 'Salud Natural',
    dark: false,
    font: 'rounded',
    vars: {
      '--st-bg': '#f2f6ef',
      '--st-surface': 'rgba(255,255,255,0.88)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(34,120,60,0.16)',
      '--st-card-shadow': '0 8px 24px rgba(34,120,60,0.10)',
      '--st-text': '#1c2b1f',
      '--st-muted': 'rgba(28,43,31,0.55)',
      '--st-primary': '#2e9e4f',
      '--st-primary-rgb': '46,158,79',
      '--st-on-primary': '#ffffff',
      '--st-price': '#1f7a3a',
      '--st-border': 'rgba(34,120,60,0.14)',
      '--st-radius': '22px',
    },
  },
  'tech-blue': {
    label: 'Tech Azul',
    dark: true,
    font: 'tech',
    vars: {
      '--st-bg': '#071226',
      '--st-surface': 'rgba(8,18,38,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(34,211,238,0.08), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(34,211,238,0.24)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.4)',
      '--st-text': '#eaf6ff',
      '--st-muted': 'rgba(234,246,255,0.5)',
      '--st-primary': '#22d3ee',
      '--st-primary-rgb': '34,211,238',
      '--st-on-primary': '#04222b',
      '--st-price': '#5eead4',
      '--st-border': 'rgba(34,211,238,0.16)',
      '--st-radius': '14px',
    },
  },
  'vibrant': {
    label: 'Vibrante',
    dark: false,
    font: 'rounded',
    vars: {
      '--st-bg': '#fff6fb',
      '--st-surface': 'rgba(255,255,255,0.88)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(217,70,239,0.18)',
      '--st-card-shadow': '0 8px 26px rgba(217,70,239,0.12)',
      '--st-text': '#2a0f33',
      '--st-muted': 'rgba(42,15,51,0.55)',
      '--st-primary': '#d946ef',
      '--st-primary-rgb': '217,70,239',
      '--st-on-primary': '#ffffff',
      '--st-price': '#db2777',
      '--st-border': 'rgba(217,70,239,0.16)',
      '--st-radius': '22px',
    },
  },
  'rose-glam': {
    label: 'Rosa Glam',
    dark: false,
    font: 'elegant',
    vars: {
      '--st-bg': '#fdf2f6',
      '--st-surface': 'rgba(255,255,255,0.88)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(225,29,110,0.16)',
      '--st-card-shadow': '0 8px 26px rgba(225,29,110,0.10)',
      '--st-text': '#3d0a24',
      '--st-muted': 'rgba(61,10,36,0.55)',
      '--st-primary': '#e11d6e',
      '--st-primary-rgb': '225,29,110',
      '--st-on-primary': '#ffffff',
      '--st-price': '#be123c',
      '--st-border': 'rgba(225,29,110,0.14)',
      '--st-radius': '22px',
    },
  },
  'ocean': {
    label: 'Océano',
    dark: true,
    font: 'modern',
    vars: {
      '--st-bg': '#04181f',
      '--st-surface': 'rgba(5,24,31,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(20,184,166,0.08), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(20,184,166,0.24)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.4)',
      '--st-text': '#e6fbf6',
      '--st-muted': 'rgba(230,251,246,0.5)',
      '--st-primary': '#14b8a6',
      '--st-primary-rgb': '20,184,166',
      '--st-on-primary': '#02201c',
      '--st-price': '#5eead4',
      '--st-border': 'rgba(20,184,166,0.16)',
      '--st-radius': '16px',
    },
  },
  'earth': {
    label: 'Tierra',
    dark: false,
    font: 'rounded',
    vars: {
      '--st-bg': '#f5efe6',
      '--st-surface': 'rgba(255,255,255,0.88)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(176,106,58,0.20)',
      '--st-card-shadow': '0 8px 24px rgba(120,86,52,0.12)',
      '--st-text': '#2e2014',
      '--st-muted': 'rgba(46,32,20,0.55)',
      '--st-primary': '#b06a3a',
      '--st-primary-rgb': '176,106,58',
      '--st-on-primary': '#ffffff',
      '--st-price': '#7a5230',
      '--st-border': 'rgba(176,106,58,0.16)',
      '--st-radius': '18px',
    },
  },
  'cyber': {
    label: 'Cyber',
    dark: true,
    font: 'tech',
    vars: {
      '--st-bg': '#060a06',
      '--st-surface': 'rgba(6,12,6,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(57,255,20,0.07), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(57,255,20,0.24)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.5)',
      '--st-text': '#e9ffe9',
      '--st-muted': 'rgba(233,255,233,0.5)',
      '--st-primary': '#39ff14',
      '--st-primary-rgb': '57,255,20',
      '--st-on-primary': '#04210a',
      '--st-price': '#34e7e4',
      '--st-border': 'rgba(57,255,20,0.16)',
      '--st-radius': '12px',
    },
  },
  'sunset': {
    label: 'Atardecer',
    dark: false,
    font: 'rounded',
    vars: {
      '--st-bg': '#fff5ee',
      '--st-surface': 'rgba(255,255,255,0.88)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(249,115,22,0.18)',
      '--st-card-shadow': '0 8px 26px rgba(249,115,22,0.12)',
      '--st-text': '#3a1a08',
      '--st-muted': 'rgba(58,26,8,0.55)',
      '--st-primary': '#f97316',
      '--st-primary-rgb': '249,115,22',
      '--st-on-primary': '#ffffff',
      '--st-price': '#ea580c',
      '--st-border': 'rgba(249,115,22,0.14)',
      '--st-radius': '20px',
    },
  },
  'mono': {
    label: 'Monocromo',
    dark: false,
    font: 'modern',
    vars: {
      '--st-bg': '#ffffff',
      '--st-surface': 'rgba(255,255,255,0.9)',
      '--st-card': '#ffffff',
      '--st-card-border': 'rgba(0,0,0,0.10)',
      '--st-card-shadow': '0 6px 20px rgba(0,0,0,0.07)',
      '--st-text': '#0a0a0a',
      '--st-muted': 'rgba(10,10,10,0.5)',
      '--st-primary': '#0a0a0a',
      '--st-primary-rgb': '10,10,10',
      '--st-on-primary': '#ffffff',
      '--st-price': '#0a0a0a',
      '--st-border': 'rgba(0,0,0,0.10)',
      '--st-radius': '10px',
    },
  },
  'royal': {
    label: 'Púrpura Real',
    dark: true,
    font: 'elegant',
    vars: {
      '--st-bg': '#0e0a1a',
      '--st-surface': 'rgba(14,10,26,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(139,92,246,0.10), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(139,92,246,0.26)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.45)',
      '--st-text': '#f0ebff',
      '--st-muted': 'rgba(240,235,255,0.5)',
      '--st-primary': '#8b5cf6',
      '--st-primary-rgb': '139,92,246',
      '--st-on-primary': '#ffffff',
      '--st-price': '#fbbf24',
      '--st-border': 'rgba(139,92,246,0.16)',
      '--st-radius': '16px',
    },
  },
  'coffee': {
    label: 'Café',
    dark: true,
    font: 'elegant',
    vars: {
      '--st-bg': '#1a1410',
      '--st-surface': 'rgba(26,20,16,0.92)',
      '--st-card': 'linear-gradient(160deg, rgba(193,154,107,0.09), rgba(255,255,255,0.015))',
      '--st-card-border': 'rgba(193,154,107,0.24)',
      '--st-card-shadow': '0 10px 30px rgba(0,0,0,0.5)',
      '--st-text': '#f3e9dc',
      '--st-muted': 'rgba(243,233,220,0.5)',
      '--st-primary': '#c19a6b',
      '--st-primary-rgb': '193,154,107',
      '--st-on-primary': '#221810',
      '--st-price': '#e0b878',
      '--st-border': 'rgba(193,154,107,0.16)',
      '--st-radius': '16px',
    },
  },
}

export const DEFAULT_THEME_ID = 'neon-dark'

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function hexToRgb(hex: string): string | null {
  if (!HEX_RE.test(hex)) return null
  let h = hex.slice(1)
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const n = parseInt(h, 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

export type ResolvedTheme = {
  presetId: string
  dark: boolean
  vars: Record<string, string>
  fontHref: string
}

/**
 * Resuelve el tema de una tienda a partir de themeConfig.
 * themeConfig.theme = { preset?, font?, primary?, price? }
 * Siempre devuelve un tema válido (default si falta o es inválido).
 */
export function resolveStoreTheme(themeConfig: any): ResolvedTheme {
  const t = (themeConfig && typeof themeConfig === 'object' && themeConfig.theme) || {}
  const presetId = STORE_THEMES[t.preset] ? t.preset : DEFAULT_THEME_ID
  const preset = STORE_THEMES[presetId]
  const fontKey: FontKey = STORE_FONTS[t.font as FontKey] ? t.font : preset.font
  const font = STORE_FONTS[fontKey]

  const vars: Record<string, string> = { ...preset.vars, '--st-font': font.family }

  // Overrides opcionales (color principal / precio personalizados)
  if (typeof t.primary === 'string' && HEX_RE.test(t.primary)) {
    vars['--st-primary'] = t.primary
    const rgb = hexToRgb(t.primary)
    if (rgb) vars['--st-primary-rgb'] = rgb
  }
  if (typeof t.price === 'string' && HEX_RE.test(t.price)) {
    vars['--st-price'] = t.price
  }

  return { presetId, dark: preset.dark, vars, fontHref: font.href }
}
