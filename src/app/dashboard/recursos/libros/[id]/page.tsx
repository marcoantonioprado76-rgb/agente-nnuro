'use client'

import dynamic from 'next/dynamic'

// react-pageflip + react-pdf son client-only → sin SSR, solo en esta ruta.
const FlipbookViewer = dynamic(() => import('./FlipbookViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32 text-[#111827]/40">
      <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
    </div>
  ),
})

export default function LibroPage({ params }: { params: { id: string } }) {
  return <FlipbookViewer resourceId={params.id} />
}
