'use client'

import { createAppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-adapter-ethers'
import { bsc } from '@reown/appkit/networks'
import { ReactNode } from 'react'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mydiamond.com'

// Reown/WalletConnect inyecta un <link rel="preload"> para su fuente KHTeka.
// En las páginas sin pago no se usa y el navegador avisa "preloaded but not
// used within a few seconds". Interceptamos la inyección en <head> ANTES de
// inicializar Reown para que ese link nunca se agregue (la fuente se carga
// igual cuando se abre el modal de wallet). Sólo se filtra ese preset; el
// resto de <link> pasa sin cambios.
if (typeof document !== 'undefined') {
  const isReownFontPreload = (node: any) => {
    try {
      if (!node || node.tagName !== 'LINK') return false
      if ((node.getAttribute?.('rel') || node.rel) !== 'preload') return false
      const href = node.href || node.getAttribute?.('href') || ''
      return href.includes('fonts.reown.com') || href.includes('KHTeka')
    } catch {
      return false
    }
  }
  const head: any = document.head
  const origAppend = head.appendChild.bind(head)
  head.appendChild = (node: any) => (isReownFontPreload(node) ? node : origAppend(node))
  const origInsert = head.insertBefore.bind(head)
  head.insertBefore = (node: any, ref: any) => (isReownFontPreload(node) ? node : origInsert(node, ref))
}

const ethersAdapter = new EthersAdapter()

createAppKit({
  adapters: [ethersAdapter],
  networks: [bsc],
  metadata: {
    name: 'MY DIAMOND',
    description: 'Pagos con USDT BEP-20',
    url: appUrl,
    icons: [`${appUrl}/logo-oficial-mydiamond.png`],
  },
  projectId,
  features: { analytics: false },
})

export function WalletProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
