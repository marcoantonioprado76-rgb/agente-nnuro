'use client'

import dynamic from 'next/dynamic'

// Fabric.js es client-only → cargamos el editor sin SSR, SOLO en esta ruta.
const UserEditor = dynamic(() => import('./UserEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32 text-[#111827]/40">
      <i className="fa-solid fa-spinner fa-spin text-2xl"></i>
    </div>
  ),
})

export default function RecursoEditorPage({ params }: { params: { id: string } }) {
  return <UserEditor templateId={params.id} />
}
