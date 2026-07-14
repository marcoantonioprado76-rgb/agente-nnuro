'use client'

import { useState, useEffect } from 'react'

interface Org { id: string; name: string }

/**
 * Selector de empresa para asignar la visibilidad de un contenido
 * (Pack Empresarial Fase 3). "" / null = global (lo ven los usuarios de
 * plataforma); un uuid = privado de esa empresa.
 *
 * Usar en los forms del admin de contenido:
 *   <OrgSelector value={data.organizationId} onChange={v => set({ organizationId: v })} />
 * y mandar `organizationId` en el body del POST/PATCH.
 */
export default function OrgSelector({
  value,
  onChange,
  label = 'Visibilidad',
}: {
  value: string | null | undefined
  onChange: (v: string | null) => void
  label?: string
}) {
  const [orgs, setOrgs] = useState<Org[]>([])
  useEffect(() => {
    fetch('/api/admin/organizations')
      .then(r => r.json())
      .then(d => setOrgs(d.organizations ?? []))
      .catch(() => {})
  }, [])

  return (
    <div>
      <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 5 }}>{label}</label>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        style={{ width: '100%', padding: '10px 11px', borderRadius: 8, border: '1px solid #E4E9F0', background: '#fff', fontSize: 13, color: '#111827' }}
      >
        <option value="">🌐 Global — todos los usuarios de plataforma</option>
        {orgs.map(o => (
          <option key={o.id} value={o.id}>🏢 {o.name} — solo esa empresa</option>
        ))}
      </select>
      <p style={{ fontSize: 11, color: '#9AA3B2', marginTop: 4 }}>
        Global = lo ven los usuarios normales de MY DIAMOND. Una empresa = privado, solo esa empresa lo ve.
      </p>
    </div>
  )
}
