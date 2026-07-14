import { z } from 'zod'

// Categorías (áreas) predefinidas de los flyers. El admin elige de acá al crear,
// y el usuario filtra por estas mismas en la galería.
export const CATEGORIAS_RECURSOS = [
  'Bienvenidos',
  'Café y negocios',
  'Club Elite',
  'Club Influencer',
  'Convención Internacional',
  'Cumpleaños',
  'Distribuidores',
  'Presentación de negocios',
  'Lista de precios',
  'Rangos',
  'Retiro de liderazgo',
  'Únete a mi equipo',
  'Vital Party',
  'Varios',
  'Otros',
] as const

// ── Esquema de "zonas" (hueco de foto + cajas de texto) ──────────────
const photoZoneSchema = z.object({
  x: z.number(), y: z.number(), w: z.number(), h: z.number(),
})

const textZoneSchema = z.object({
  id: z.string().min(1),
  x: z.number(), y: z.number(), w: z.number(),
  text: z.string().default(''),
  fontSize: z.number().positive().default(48),
  fontFamily: z.string().default('Archivo'),
  fill: z.string().default('#ffffff'),
  align: z.enum(['left', 'center', 'right']).default('left'),
  fontWeight: z.union([z.string(), z.number()]).default('700'),
})

export const zonasSchema = z.object({
  photo: photoZoneSchema.nullable().optional(),
  texts: z.array(textZoneSchema).default([]),
})

// ── Quién puede GESTIONAR plantillas (admin de Recursos) ──────────────
// Por defecto: cualquier usuario con is_admin.
// Si se define RECURSOS_ADMIN_EMAILS (lista separada por comas), SOLO esos
// correos (que además sean is_admin) pueden gestionar. Esto permite, por
// ejemplo, dejar fuera a cuentas admin que se usan como demo.
export function isRecursosAdmin(user: any): boolean {
  if (!user || (user as any).isAdmin !== true) return false
  const allow = (process.env.RECURSOS_ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  if (allow.length === 0) return true
  return allow.includes(String((user as any).email || '').toLowerCase())
}
