'use client'

import Image from 'next/image'

/**
 * NÜRO Brand Components
 * Uses the actual brand images provided
 *
 * Images available:
 *   /images/brand/nuro-isotipo.jpg     — Smiley icon (isotipo)
 *   /images/brand/nuro-logo-white.png  — Full wordmark, white (for dark backgrounds)
 *   /images/brand/nuro-logo-color.png  — Full wordmark, navy blue (for light backgrounds)
 *   /images/brand/nuro-logo-black.png  — Full wordmark, black
 */

// Isotipo (smiley face) — uses the actual image
export function NuroSmile({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <Image
      src="/images/brand/nuro-isotipo.jpg"
      alt="Agente de Ventas"
      width={size}
      height={size}
      className={`rounded-lg object-contain ${className}`}
    />
  )
}

// Full wordmark logo — uses the actual PNG images
export function NuroWordmark({
  variant = 'white',
  height = 24,
  className = '',
}: {
  variant?: 'white' | 'color' | 'black'
  height?: number
  className?: string
}) {
  const src = {
    white: '/images/brand/nuro-logo-white.png',
    color: '/images/brand/nuro-logo-color.png',
    black: '/images/brand/nuro-logo-black.png',
  }
  // Original aspect ratio: 1685 x 366 ≈ 4.6:1
  const width = Math.round(height * 4.6)

  return (
    <Image
      src={src[variant]}
      alt="Agente de Ventas"
      width={width}
      height={height}
      className={`object-contain ${className}`}
      priority
    />
  )
}

// Combined logo: isotipo + wordmark (for navbar, sidebar, footer)
export function NuroLogo({
  size = 'md',
  variant = 'white',
  showTagline = false,
  tagline,
}: {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'white' | 'color' | 'black'
  showTagline?: boolean
  tagline?: string
}) {
  const sizes = {
    sm: { wordmarkH: 18, iconSize: 28, tag: 'text-[8px]' },
    md: { wordmarkH: 22, iconSize: 34, tag: 'text-[10px]' },
    lg: { wordmarkH: 28, iconSize: 40, tag: 'text-[11px]' },
  }
  const s = sizes[size]

  return (
    <div className="flex items-center gap-2.5">
      <NuroSmile size={s.iconSize} />
      <div>
        <NuroWordmark variant={variant} height={s.wordmarkH} />
        {showTagline && tagline && (
          <p className={`${s.tag} font-semibold uppercase tracking-[0.15em] text-[#06B6D4] mt-0.5`}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  )
}
