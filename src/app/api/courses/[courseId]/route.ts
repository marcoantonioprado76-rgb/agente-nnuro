export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase'
import { viewerOrgId } from '@/lib/org-content'

const VIDEO_BUCKET = 'course-videos'
const SIGN_EXPIRY = 60 * 60 * 6 // 6 horas — dura la sesión de visualización

/** GET /api/courses/[courseId] — detalle del curso; incluye videos solo si APPROVED */
export async function GET(
  _req: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        videos: { orderBy: { order: 'asc' }, include: { recursos: { orderBy: { orden: 'asc' } } } },
        enrollments: { where: { userId: user.id } },
      },
    })

    if (!course || !course.active) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    // Aislamiento por empresa: el curso debe pertenecer a la empresa del que mira
    const oid = await viewerOrgId(user.id)
    if (((course as any).organizationId ?? null) !== oid) {
      return NextResponse.json({ error: 'Curso no encontrado' }, { status: 404 })
    }

    const hasPlan = user.plan !== 'NONE'
    const enrollment = course.enrollments[0] ?? null
    const approved = enrollment?.status === 'APPROVED'

    // Obtener progreso del usuario (porcentaje + posición en segundos)
    const progressMap: Record<string, { percent: number; pos: number }> = {}
    if (approved && course.videos.length > 0) {
      const progressRows = await (prisma as any).videoProgress.findMany({
        where: { userId: user.id, courseId: params.courseId },
        select: { videoId: true, percent: true, posicionSegundos: true },
      })
      for (const row of progressRows) {
        progressMap[row.videoId] = { percent: row.percent, pos: row.posicionSegundos ?? 0 }
      }
    }

    // Desbloqueo: inscrito → secuencial (video 1 siempre; N si el N-1 está al 95%+).
    //            sin inscribir → solo las lecciones marcadas como "preview" (gratis).
    // Para los desbloqueados genera la URL de reproducción (firmada Supabase o Vimeo).
    const videosWithUnlock = await Promise.all(course.videos.map(async (v: any, idx: number) => {
      let unlocked: boolean
      if (approved) {
        const prevVideo = idx === 0 ? null : course.videos[idx - 1]
        unlocked = idx === 0 || (prevVideo ? (progressMap[prevVideo.id]?.percent ?? 0) >= 95 : false)
      } else {
        unlocked = v.preview === true
      }
      const pct = progressMap[v.id]?.percent ?? 0
      const selfHosted = !!v.videoUrl

      let playUrl: string | null = null
      if (unlocked) {
        if (selfHosted) {
          const { data } = await supabaseAdmin.storage.from(VIDEO_BUCKET).createSignedUrl(v.videoUrl, SIGN_EXPIRY)
          playUrl = data?.signedUrl ?? null
        } else {
          playUrl = v.youtubeUrl || null
        }
      }

      return {
        id: v.id,
        title: v.title,
        kind: selfHosted ? 'supabase' : 'vimeo',
        playUrl,
        youtubeUrl: v.youtubeUrl,
        order: v.order,
        unlocked,
        isPreview: v.preview === true,
        moduloTitulo: v.moduloTitulo ?? null,
        descripcion: v.descripcion ?? null,
        duracionSegundos: v.duracionSegundos ?? null,
        recursos: unlocked ? (v.recursos ?? []).map((r: any) => ({ id: r.id, titulo: r.titulo, archivoUrl: r.archivoUrl })) : [],
        percent: pct,
        completed: pct >= 95,
        posicionSegundos: progressMap[v.id]?.pos ?? 0,
      }
    }))

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        coverUrl: course.coverUrl,
        price: Number(course.price),
        freeForPlan: course.freeForPlan,
        createdAt: course.createdAt,
        videos: videosWithUnlock,
        videosCount: course.videos.length,
        locked: !hasPlan,
        enrollment,
        viewerName: user.fullName || user.username || 'Alumno',
      },
    })
  } catch (err) {
    console.error('[GET /api/courses/[courseId]]', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
