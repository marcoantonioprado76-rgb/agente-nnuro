import { prisma } from '@/lib/prisma'
import { publishToNetworks } from '@/lib/social/publisher'
import { getValidToken } from '@/lib/social/tokens'
import { supabaseAdmin } from '@/lib/supabase'
import { createNotification } from '@/lib/notifications'

const BUCKET = 'social-media'

async function deleteMedia(mediaUrl: string | null) {
    if (!mediaUrl) return
    const marker = `/object/public/${BUCKET}/`
    const idx = mediaUrl.indexOf(marker)
    if (idx === -1) return
    const path = mediaUrl.slice(idx + marker.length).split('?')[0]
    try { await supabaseAdmin.storage.from(BUCKET).remove([path]) } catch {}
}

/**
 * Procesa los posts programados cuyo scheduledAt ya pasó.
 * Reclama atómicamente cada post (UPDATE con CTE) para evitar
 * doble procesamiento si el worker corre solapado.
 *
 * Llamado por:
 *  - GET /api/cron/social-scheduler  (cron externo opcional)
 *  - setInterval en instrumentation.ts (cron interno cada 60s)
 */
export async function processScheduledSocialPosts(): Promise<number> {
    const now = new Date()
    const claimed = await prisma.$queryRaw<{ id: string }[]>`
        WITH c AS (
            UPDATE social_posts
            SET    status = 'PUBLISHING'
            WHERE  status = 'SCHEDULED' AND scheduled_at <= ${now}
            RETURNING id
        ) SELECT id FROM c
    `
    if (!claimed.length) return 0

    const due = await (prisma as any).socialPost.findMany({
        where: { id: { in: claimed.map((r: any) => r.id) } },
        include: { networks: { include: { connection: true } } }
    })

    let processed = 0
    for (const post of due) {
        try {
            const targets = await Promise.all(
                post.networks
                    .filter((n: any) => n.connection)
                    .map(async (n: any) => ({
                        network: n.network,
                        connectionId: n.connectionId,
                        accountId: n.connection.accountId,
                        accessToken: await getValidToken(n.connection),
                        pageId: n.connection.pageId || undefined,
                        postType: post.postType
                    }))
            )

            const results = await publishToNetworks({
                content: post.content,
                mediaUrl: post.mediaUrl,
                mediaType: post.mediaType,
                targets
            })

            for (const result of results) {
                await (prisma as any).socialPostNetwork.updateMany({
                    where: { postId: post.id, connectionId: result.connectionId },
                    data: {
                        status: result.success ? 'PUBLISHED' : 'FAILED',
                        providerPostId: result.providerPostId || null,
                        error: result.error || null,
                        publishedAt: result.success ? new Date() : null
                    }
                })
            }

            const anySuccess = results.some(r => r.success)
            const allFailed = results.every(r => !r.success)

            await (prisma as any).socialPost.update({
                where: { id: post.id },
                data: {
                    status: allFailed ? 'FAILED' : anySuccess ? 'PUBLISHED' : 'PARTIAL',
                    publishedAt: anySuccess ? new Date() : null,
                    mediaUrl: null
                }
            })
            await deleteMedia(post.mediaUrl)

            const successNets = results.filter((r: any) => r.success).map((r: any) => r.network).join(', ')
            const failNets = results.filter((r: any) => !r.success).map((r: any) => r.network).join(', ')
            if (anySuccess) {
                await createNotification(
                    post.userId,
                    '✅ Post programado publicado',
                    failNets
                        ? `Publicado en ${successNets}. Falló en: ${failNets}.`
                        : `Tu publicación programada fue publicada en ${successNets}.`,
                    '/dashboard/services/social'
                )
            } else {
                await createNotification(
                    post.userId,
                    '❌ Post programado falló',
                    `No se pudo publicar el post programado en ninguna red (${failNets}). Revisa tus conexiones.`,
                    '/dashboard/services/social'
                )
            }
            processed++
        } catch (err: any) {
            console.error(`[SocialScheduler] Post ${post.id} failed:`, err)
            await (prisma as any).socialPost.update({
                where: { id: post.id },
                data: { status: 'FAILED' }
            })
        }
    }
    return processed
}
