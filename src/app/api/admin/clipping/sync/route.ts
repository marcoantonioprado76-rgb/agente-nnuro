export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { decrypt } from '@/lib/crypto'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

function getAuth() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  return verifyToken(token)
}

async function requireAdmin(auth: ReturnType<typeof getAuth>) {
  if (!auth) return false
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { isAdmin: true } })
  return user?.isAdmin === true
}

async function fetchYouTubeViews(videoId: string): Promise<number | null> {
  try {
    if (!YOUTUBE_API_KEY) return null
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${YOUTUBE_API_KEY}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return parseInt(data.items?.[0]?.statistics?.viewCount || '0', 10)
  } catch {
    return null
  }
}

async function fetchTikTokViews(videoId: string, accessToken: string): Promise<number | null> {
  try {
    const res = await fetch('https://open.tiktokapis.com/v2/video/query/?fields=view_count', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filters: { video_ids: [videoId] } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.data?.videos?.[0]?.view_count ?? null
  } catch {
    return null
  }
}

async function fetchFacebookViews(videoId: string, accessToken: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${videoId}?fields=views&access_token=${accessToken}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.views ?? null
  } catch {
    return null
  }
}

/**
 * POST /api/admin/clipping/sync
 * Syncs view counts for all active submissions and credits earnings.
 * Can be triggered manually from admin panel or via a cron job.
 */
export async function POST(request: NextRequest) {
  try {
    // Allow cron secret or admin auth
    const cronSecret = request.headers.get('x-cron-secret')
    const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET

    if (!isValidCron) {
      const auth = getAuth()
      if (!await requireAdmin(auth)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    // Get all submissions that are not yet approved/rejected
    const submissions = await prisma.clippingSubmission.findMany({
      where: { status: 'HOLD' },
      include: {
        campaign: true,
        account: true,
      },
    })

    const now = new Date()
    let synced = 0
    let approved = 0
    let errors = 0

    for (const sub of submissions) {
      try {
        let currentViews: number | null = null
        if (sub.platform === 'YOUTUBE') {
          // YouTube uses server API key — no user account needed
          currentViews = await fetchYouTubeViews(sub.videoId)
        } else if (sub.account) {
          const accessToken = decrypt(sub.account.accessTokenEnc)
          if (sub.platform === 'TIKTOK') {
            currentViews = await fetchTikTokViews(sub.videoId, accessToken)
          } else if (sub.platform === 'FACEBOOK') {
            currentViews = await fetchFacebookViews(sub.videoId, accessToken)
          }
        }

        if (currentViews === null) {
          errors++
          continue
        }

        const deltaViews = Math.max(0, currentViews - sub.baseViews)
        const earningsUSD = (deltaViews / 1000) * Number(sub.campaign.cpmUSD)

        // Save snapshot
        await prisma.clippingSnapshot.create({
          data: { submissionId: sub.id, views: currentViews },
        })

        // Check if hold period is over → approve and credit earnings
        const holdExpired = now >= sub.holdUntil

        if (holdExpired) {
          // CRÍTICO: updateMany con filtro status='HOLD' como lock optimista.
          // Si el admin ya aprobó manualmente, count=0 y no se crea ninguna comisión.
          const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.clippingSubmission.updateMany({
              where: { id: sub.id, status: 'HOLD' }, // solo si AÚN está en HOLD
              data: {
                currentViews,
                deltaViews,
                earningsUSD,
                status: 'APPROVED',
                approvedAt: now,
                lastSyncAt: now,
              },
            })
            if (result.count === 0) return 0 // Ya fue aprobado por otro proceso

            await tx.clippingPayout.create({
              data: {
                userId: sub.userId,
                submissionId: sub.id,
                amountUSD: earningsUSD,
                description: `${deltaViews.toLocaleString()} vistas × $${sub.campaign.cpmUSD}/1000`,
              },
            })
            return 1
          })

          if (updated === 1) approved++
        } else {
          // Still in hold — update counts only
          await prisma.clippingSubmission.update({
            where: { id: sub.id },
            data: {
              currentViews,
              deltaViews,
              earningsUSD,
              lastSyncAt: now,
            },
          })
        }

        synced++
      } catch (subErr) {
        console.error(`[sync] Error processing submission ${sub.id}:`, subErr)
        errors++
      }
    }

    return NextResponse.json({
      ok: true,
      total: submissions.length,
      synced,
      approved,
      errors,
    })
  } catch (err) {
    console.error('[POST /api/admin/clipping/sync]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
