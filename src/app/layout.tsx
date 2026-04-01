import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Agente de Ventas - Automatiza tus ventas con IA',
  description: 'Agente de Ventas: automatiza tus ventas por WhatsApp con inteligencia artificial. Responde clientes 24/7 y cierra ventas en automatico.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://agentenuro.com'),
  openGraph: {
    title: 'Agente de Ventas',
    description: 'Automatiza tus ventas por WhatsApp con inteligencia artificial',
    url: 'https://agentenuro.com',
    siteName: 'Agente de Ventas',
    images: [
      {
        url: 'https://agentenuro.com/api/og-image',
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'Agente de Ventas',
      },
    ],
    type: 'website',
    locale: 'es_ES',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agente de Ventas',
    description: 'Automatiza tus ventas por WhatsApp con inteligencia artificial',
    images: [
      {
        url: 'https://agentenuro.com/api/og-image',
        width: 1200,
        height: 630,
        alt: 'Agente de Ventas',
      },
    ],
  },
  applicationName: 'Agente de Ventas',
  appleWebApp: {
    capable: true,
    title: 'Agente de Ventas',
    statusBarStyle: 'black-translucent',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js')})}`,
          }}
        />
      </body>
    </html>
  );
}
