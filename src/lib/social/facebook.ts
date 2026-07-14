// Facebook Graph API publisher

const BASE = 'https://graph.facebook.com/v21.0'

async function fbPost(path: string, body: Record<string, any>) {
    const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error?.message || `Facebook error ${res.status}`)
    return data
}

async function fbGet(path: string, params: Record<string, string>) {
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${BASE}${path}?${qs}`)
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error?.message || `Facebook error ${res.status}`)
    return data
}

export async function publishFacebookPost(opts: {
    pageId: string
    accessToken: string
    content: string
    mediaUrl?: string
    mediaType?: string
    scheduledAt?: Date
}): Promise<string> {
    const { pageId, accessToken, content, mediaUrl, mediaType, scheduledAt } = opts

    const scheduleFields = scheduledAt
        ? { published: false, scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000) }
        : { published: true }

    if (mediaType === 'video' && mediaUrl) {
        const res = await fbPost(`/${pageId}/videos`, {
            description: content,
            file_url: mediaUrl,
            access_token: accessToken,
            ...scheduleFields
        })
        return res.id
    }

    if (mediaType === 'image' && mediaUrl) {
        const res = await fbPost(`/${pageId}/photos`, {
            caption: content,
            url: mediaUrl,
            access_token: accessToken,
            ...scheduleFields
        })
        return res.id || res.post_id
    }

    // Text only
    const res = await fbPost(`/${pageId}/feed`, {
        message: content,
        access_token: accessToken,
        ...scheduleFields
    })
    return res.id
}

export async function publishFacebookStory(opts: {
    pageId: string
    accessToken: string
    mediaUrl: string
    mediaType: string
}): Promise<string> {
    const { pageId, accessToken, mediaUrl, mediaType } = opts

    if (mediaType === 'video') {
        // Historia de VIDEO: flujo de 3 fases (start → subir por URL → finish).
        const start = await fbPost(`/${pageId}/video_stories`, {
            upload_phase: 'start',
            access_token: accessToken
        })
        const videoId = start.video_id
        const uploadUrl = start.upload_url
        if (!videoId || !uploadUrl) throw new Error('Facebook no devolvió video_id/upload_url para la historia')

        // Subida "hosted": Facebook descarga el video desde la URL pública.
        const upRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${accessToken}`,
                'file_url': mediaUrl
            }
        })
        const upData = await upRes.json().catch(() => ({}))
        if (!upRes.ok || upData.success === false || upData.error) {
            throw new Error(upData.error?.message || `Facebook story upload error ${upRes.status}`)
        }

        const finish = await fbPost(`/${pageId}/video_stories`, {
            upload_phase: 'finish',
            video_id: videoId,
            access_token: accessToken
        })
        return finish.post_id || finish.id || videoId
    }

    // Historia de FOTO: flujo de 2 pasos.
    // 1) Subir la foto como NO publicada → obtener photo_id.
    const photo = await fbPost(`/${pageId}/photos`, {
        url: mediaUrl,
        published: false,
        access_token: accessToken
    })
    const photoId = photo.id
    if (!photoId) throw new Error('Facebook no devolvió photo_id para la historia')

    // 2) Publicar la historia con ese photo_id.
    const story = await fbPost(`/${pageId}/photo_stories`, {
        photo_id: photoId,
        access_token: accessToken
    })
    return story.post_id || story.id
}

export async function getFacebookMetrics(pageId: string, accessToken: string) {
    // Fetch basic page data (fan count, followers) — no special permissions needed
    const pageData = await fbGet(`/${pageId}`, {
        fields: 'fan_count,followers_count,name',
        access_token: accessToken
    })

    const result: Record<string, any> = {
        Seguidores: pageData.followers_count ?? pageData.fan_count ?? 0,
        'Me gusta': pageData.fan_count ?? 0,
    }

    // Try to get insights (requires read_insights permission — may fail)
    try {
        const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
        const until = Math.floor(Date.now() / 1000)
        const insights = await fbGet(`/${pageId}/insights`, {
            metric: 'page_impressions,page_reach,page_engaged_users',
            period: 'day',
            since: String(since),
            until: String(until),
            access_token: accessToken
        })
        for (const item of insights.data || []) {
            const lastValue = item.values?.[item.values.length - 1]?.value ?? 0
            const label = item.name === 'page_impressions' ? 'Impresiones'
                : item.name === 'page_reach' ? 'Alcance'
                : item.name === 'page_engaged_users' ? 'Usuarios activos'
                : item.name
            result[label] = lastValue
        }
    } catch {
        // read_insights permission not granted — skip insights
    }

    return result
}
