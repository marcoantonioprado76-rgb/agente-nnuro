import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getActiveChallenge } from './challengeService'

// ═══════════════════════════════════════════════════════════════════════════
// Reto 90D — Servicio de miembros (ChallengeMember). ADMIN-ONLY, sin UI.
// Lógica de servidor pura sobre el modelo `reto90d_members`.
// ═══════════════════════════════════════════════════════════════════════════

export type MemberStatus = 'ACTIVE' | 'PAUSED' | 'REMOVED'

export interface EnrollMemberInput {
  fullName: string
  phone: string
  userId?: string | null
  email?: string | null
  country?: string | null
  city?: string | null
  /**
   * Marca el alta como proveniente del REGISTRO PÚBLICO. En ese caso el upsert
   * SOLO crea si el miembro no existe: NO sobrescribe fullName/email ni reactiva
   * a un miembro dado de baja (REMOVED). El alta admin (sin este flag) mantiene
   * el comportamiento clásico (actualiza datos y reactiva).
   */
  fromPublic?: boolean
}

/** Normaliza un teléfono a solo dígitos y asegura código de país en móviles bolivianos. */
export function normalizePhone(phone: string): string {
  let d = (phone ?? '').replace(/\D/g, '')
  // Móvil boliviano local (8 dígitos, empieza en 6 o 7) → anteponer 591 para WhatsApp.
  if (d.length === 8 && /^[67]/.test(d)) d = '591' + d
  return d
}

/**
 * Inscribe (o re-activa) un miembro en un reto. Normaliza el teléfono y evita
 * duplicados por (challengeId, phone) mediante upsert sobre el índice único.
 */
export async function enrollMember(challengeId: string, data: EnrollMemberInput) {
  const phone = normalizePhone(data.phone)
  try {
    // Registro público: NO pisar datos ni reactivar bajas. Solo crear si no existe.
    if (data.fromPublic) {
      const existing = await prisma.challengeMember.findUnique({
        where: { challengeId_phone: { challengeId, phone } },
      })
      if (existing) return existing // ya inscrito (o dado de baja) → se respeta tal cual
      try {
        return await prisma.challengeMember.create({
          data: {
            challengeId,
            phone,
            fullName: data.fullName,
            userId: data.userId ?? null,
            email: data.email ?? null,
            country: data.country ?? null,
            city: data.city ?? null,
            status: 'ACTIVE',
          },
        })
      } catch (err) {
        // Carrera: otro registro concurrente insertó el mismo (challengeId, phone).
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const again = await prisma.challengeMember.findUnique({
            where: { challengeId_phone: { challengeId, phone } },
          })
          if (again) return again
        }
        throw err
      }
    }

    return await prisma.challengeMember.upsert({
      where: { challengeId_phone: { challengeId, phone } },
      update: {
        fullName: data.fullName,
        userId: data.userId ?? undefined,
        email: data.email ?? undefined,
        country: data.country ?? undefined,
        city: data.city ?? undefined,
        status: 'ACTIVE',
      },
      create: {
        challengeId,
        phone,
        fullName: data.fullName,
        userId: data.userId ?? null,
        email: data.email ?? null,
        country: data.country ?? null,
        city: data.city ?? null,
        status: 'ACTIVE',
      },
    })
  } catch (err) {
    console.error(`[reto90d/memberService] enrollMember failed (challengeId=${challengeId}):`, err)
    throw new Error('No se pudo inscribir al miembro')
  }
}

/** Marca un miembro como REMOVED (no se borra el registro). */
export async function removeMember(id: string) {
  return setMemberStatus(id, 'REMOVED')
}

/** Actualiza los datos de un miembro (nombre, celular, correo, país, ciudad). */
export async function updateMember(
  id: string,
  data: { fullName?: string; phone?: string; email?: string | null; country?: string | null; city?: string | null },
) {
  try {
    return await prisma.challengeMember.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.phone !== undefined ? { phone: normalizePhone(data.phone) } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.country !== undefined ? { country: data.country } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
      },
    })
  } catch (err) {
    console.error(`[reto90d/memberService] updateMember failed (id=${id}):`, err)
    throw new Error('No se pudo actualizar al miembro')
  }
}

/** Elimina definitivamente a un miembro del reto. */
export async function deleteMember(id: string) {
  try {
    await prisma.challengeMember.delete({ where: { id } })
    return true
  } catch (err) {
    console.error(`[reto90d/memberService] deleteMember failed (id=${id}):`, err)
    throw new Error('No se pudo eliminar al miembro')
  }
}

/** Cambia el estado de un miembro. */
export async function setMemberStatus(id: string, status: MemberStatus) {
  try {
    return await prisma.challengeMember.update({
      where: { id },
      data: { status },
    })
  } catch (err) {
    console.error(`[reto90d/memberService] setMemberStatus failed (id=${id}):`, err)
    throw new Error('No se pudo cambiar el estado del miembro')
  }
}

/**
 * Busca un miembro ACTIVE por teléfono normalizado. Si no se pasa challengeId,
 * usa el reto activo. Devuelve null si no hay reto activo o no se encuentra.
 */
export async function getMemberByPhone(phone: string, challengeId?: string) {
  const normalized = normalizePhone(phone)
  try {
    let targetChallengeId = challengeId
    if (!targetChallengeId) {
      const active = await getActiveChallenge()
      if (!active) return null
      targetChallengeId = active.id
    }
    return await prisma.challengeMember.findFirst({
      where: {
        challengeId: targetChallengeId,
        phone: normalized,
        status: 'ACTIVE',
      },
    })
  } catch (err) {
    console.error('[reto90d/memberService] getMemberByPhone failed:', err)
    throw new Error('No se pudo obtener el miembro por teléfono')
  }
}

/**
 * Busca un miembro por teléfono SIN filtrar por estado (para el inbound: así podemos
 * reactivar a un ABANDONED que vuelve a escribir, o avisar a un PAUSED). Excluye solo
 * a los REMOVED (baja definitiva). Devuelve null si no hay reto activo o no existe.
 */
export async function getMemberForInbound(phone: string, challengeId?: string) {
  const normalized = normalizePhone(phone)
  try {
    let targetChallengeId = challengeId
    if (!targetChallengeId) {
      const active = await getActiveChallenge()
      if (!active) return null
      targetChallengeId = active.id
    }
    const m = await prisma.challengeMember.findFirst({
      where: { challengeId: targetChallengeId, phone: normalized },
    })
    if (!m || m.status === 'REMOVED') return null
    return m
  } catch (err) {
    console.error('[reto90d/memberService] getMemberForInbound failed:', err)
    return null
  }
}

/** Lista los miembros de un reto; opcionalmente filtra por estado. */
export async function listMembers(challengeId: string, opts?: { status?: MemberStatus }) {
  try {
    return await prisma.challengeMember.findMany({
      where: {
        challengeId,
        ...(opts?.status ? { status: opts.status } : {}),
      },
      orderBy: [{ joinedAt: 'asc' }],
    })
  } catch (err) {
    console.error(`[reto90d/memberService] listMembers failed (challengeId=${challengeId}):`, err)
    throw new Error('No se pudieron listar los miembros')
  }
}
