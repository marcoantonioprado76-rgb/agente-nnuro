'use client'

import dynamic from 'next/dynamic'

// react-pdf es client-only → sin SSR, solo en esta ruta.
const PdfViewer = dynamic(() => import('./PdfViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32 text-[#111827]/40">
      <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
    </div>
  ),
})

export default function PresentacionPage({ params }: { params: { id: string } }) {
  return <PdfViewer resourceId={params.id} />
}
