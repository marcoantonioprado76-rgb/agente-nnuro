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

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /shorts\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

function extractTikTokId(url: string): string | null {
  const match = url.match(/video\/(\d+)/)
  return match ? match[1] : null
}

function extractFacebookVideoId(url: string): string | null {
  // https://www.facebook.com/username/videos/1234567890/
  // https://www.facebook.com/watch/?v=1234567890
  // https://fb.watch/abc123/ — not parseable directly, reject
  const patterns = [
    /videos\/(\d+)/,
    /[?&]v=(\d+)/,
    /story_fbid=(\d+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

/** GET /api/clipping/submissions — list my submissions */
export async function GET() {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const submissions = await prisma.clippingSubmission.findMany({
      where: { userId: auth.userId },
      include: {
        campaign: { select: { title: true, cpmUSD: true, platform: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ submissions })
  } catch (err) {
    console.error('[GET /api/clipping/submissions]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

/** POST /api/clipping/submissions — submit a video */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuth()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { campaignId, videoUrl } = body

    if (!campaignId || !videoUrl) {
      return NextResponse.json({ error: 'campaignId y videoUrl son requeridos' }, { status: 400 })
    }

    // Get campaign
    const campaign = await prisma.clippingCampaign.findUnique({ where: { id: campaignId } })
    if (!campaign || !campaign.isActive) {
      return NextResponse.json({ error: 'Campaña no encontrada o inactiva' }, { status: 404 })
    }

    if (campaign.endsAt && campaign.endsAt < new Date()) {
      return NextResponse.json({ error: 'La campaña ya terminó' }, { status: 400 })
    }

    // For TikTok and Facebook, user must have a connected account
    // YouTube uses server API key — no user OAuth needed
    let account: Awaited<ReturnType<typeof prisma.clippingAccount.findUnique>> = null
    if (campaign.platform !== 'YOUTUBE') {
      account = await prisma.clippingAccount.findUnique({
        where: { userId_platform: { userId: auth.userId, platform: campaign.platform } },
      })
      if (!account || account.status !== 'ACTIVE') {
        return NextResponse.json({
          error: `Necesitás conectar tu cuenta de ${campaign.platform} primero`,
        }, { status: 400 })
      }
    }

    // Extract video ID
    let videoId: string | null = null
    if (campaign.platform === 'YOUTUBE') {
      videoId = extractYouTubeId(videoUrl)
    } else if (campaign.platform === 'TIKTOK') {
      videoId = extractTikTokId(videoUrl)
    } else if (campaign.platform === 'FACEBOOK') {
      videoId = extractFacebookVideoId(videoUrl)
    }

    if (!videoId) {
      return NextResponse.json({ error: 'URL de video inválida' }, { status: 400 })
    }

    // Check not already submitted
    const existing = await prisma.clippingSubmission.findUnique({
      where: { campaignId_videoId: { campaignId, videoId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Este video ya fue enviado a esta campaña' }, { status: 409 })
    }

    // Fetch current views from platform API
    let baseViews = 0
    let videoTitle = ''
    let likes = 0
    let comments = 0

    if (campaign.platform === 'YOUTUBE') {
      if (!YOUTUBE_API_KEY) {
        return NextResponse.json({ error: 'YouTube API key no configurada' }, { status: 500 })
      }
      const ytRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`
      )
      if (!ytRes.ok) {
        return NextResponse.json({ error: 'No se pudo verificar el video en YouTube. Intenta de nuevo.' }, { status: 502 })
      }
      const ytData = await ytRes.json()
      const item = ytData.items?.[0]
      if (!item) {
        return NextResponse.json({ error: 'Video de YouTube no encontrado o privado' }, { status: 400 })
      }
      baseViews = parseInt(item?.statistics?.viewCount || '0', 10)
      likes = parseInt(item?.statistics?.likeCount || '0', 10)
      comments = parseInt(item?.statistics?.commentCount || '0', 10)
      videoTitle = item?.snippet?.title || ''
    } else if (campaign.platform === 'TIKTOK' && account) {
      const accessToken = decrypt(account.accessTokenEnc)
      const ttRes = await fetch('https://open.tiktokapis.com/v2/video/query/?fields=view_count,like_count,comment_count,title', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters: { video_ids: [videoId] } }),
      })
      if (!ttRes.ok) {
        return NextResponse.json({ error: 'No se pudo verificar el video en TikTok. Intenta de nuevo.' }, { status: 502 })
      }
      const ttData = await ttRes.json()
      const video = ttData.data?.videos?.[0]
      if (!video) {
        return NextResponse.json({ error: 'Video de TikTok no encontrado o privado' }, { status: 400 })
      }
      baseViews = video?.view_count || 0
      likes = video?.like_count || 0
      comments = video?.comment_count || 0
      videoTitle = video?.title || ''
    } else if (campaign.platform === 'FACEBOOK' && account) {
      const accessToken = decrypt(account.accessTokenEnc)
      const fbRes = await fetch(
        `https://graph.facebook.com/v19.0/${videoId}?fields=views,title,likes.summary(true),comments.summary(true)&access_token=${accessToken}`
      )
      if (!fbRes.ok) {
        return NextResponse.json({ error: 'No se pudo verificar el video en Facebook. Intenta de nuevo.' }, { status: 502 })
      }
      const fbData = await fbRes.json()
      if (fbData.error) {
        return NextResponse.json({ error: 'Video de Facebook no encontrado o sin acceso' }, { status: 400 })
      }
      baseViews = fbData.views || 0
      likes = fbData.likes?.summary?.total_count || 0
      comments = fbData.comments?.summary?.total_count || 0
      videoTitle = fbData.title || ''
    }

    if (baseViews < campaign.minViews) {
      return NextResponse.json({
        error: `El video necesita al menos ${campaign.minViews.toLocaleString()} vistas para participar en esta campaña`,
      }, { status: 400 })
    }

    const holdUntil = new Date(Date.now() + campaign.holdHours * 60 * 60 * 1000)

    const submission = await prisma.clippingSubmission.create({
      data: {
        userId: auth.userId,
        campaignId,
        accountId: account?.id ?? null,
        platform: campaign.platform,
        videoId,
        videoUrl,
        videoTitle,
        baseViews,
        currentViews: baseViews,
        deltaViews: 0,
        likes,
        comments,
        holdUntil,
        status: 'HOLD',
      } as any,
    })

    // Save initial snapshot
    await prisma.clippingSnapshot.create({
      data: { submissionId: submission.id, views: baseViews },
    })

    return NextResponse.json({ submission }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/clipping/submissions]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
