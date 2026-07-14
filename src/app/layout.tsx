import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/context/WalletProvider'
import { ConfirmHost } from '@/components/ConfirmDialog'

export const metadata: Metadata = {
  title: 'MY DIAMOND',
  description: 'Plataforma Oficial - MY DIAMOND',
  // El favicon/apple-icon los maneja Next.js automáticamente desde
  // src/app/icon.png y src/app/apple-icon.png (generados del logo oficial).
  other: {
    'tiktok-developers-site-verification': 'z09wedDq9xCOj3EGusafCQHO8EtDU10L',
    'facebook-domain-verification': '4ig9scnmgsrs3tgzm120c0budjwwk4',
    // Evita que Chrome/Google Translate modifique el DOM y crashee React con
    // 'NotFoundError: Failed to execute insertBefore on Node'.
    // https://github.com/facebook/react/issues/11538
    google: 'notranslate',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // translate="no" complementa el meta google=notranslate y evita que
    // extensiones de traducción del navegador (Google Translate, DeepL, etc.)
    // muten el DOM y rompan el reconciler de React.
    <html lang="es" translate="no">
      <head>
        <meta name="google" content="notranslate" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&family=JetBrains+Mono:wght@500;700&family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </head>
      <body className="min-h-screen notranslate" style={{ fontFamily: "'Archivo', sans-serif" }}>
        <WalletProvider>{children}</WalletProvider>
        <ConfirmHost />
      </body>
    </html>
  )
}
