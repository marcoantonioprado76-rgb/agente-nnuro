/**
 * Meta Messenger Platform API client.
 * Sends messages via the Graph API using a Page Access Token.
 */

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

async function graphPost(pageToken: string, recipientId: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${GRAPH_URL}/me/messages?access_token=${pageToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      ...body,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[META] Graph API error ${res.status}: ${err}`)
  }
}

export async function sendMetaText(recipientId: string, text: string, pageToken: string): Promise<void> {
  await graphPost(pageToken, recipientId, {
    message: { text },
  })
}

export async function sendMetaImage(recipientId: string, imageUrl: string, pageToken: string): Promise<void> {
  await graphPost(pageToken, recipientId, {
    message: {
      attachment: {
        type: 'image',
        payload: { url: imageUrl, is_reusable: true },
      },
    },
  })
}

export async function sendMetaVideo(recipientId: string, videoUrl: string, pageToken: string): Promise<void> {
  console.log(`[META] sendMetaVideo → ${recipientId} | url: ${videoUrl}`)
  await graphPost(pageToken, recipientId, {
    message: {
      attachment: {
        type: 'video',
        payload: { url: videoUrl, is_reusable: false },
      },
    },
  })
}

export async function markMetaAsRead(recipientId: string, pageToken: string): Promise<void> {
  try {
    await fetch(`${GRAPH_URL}/me/messages?access_token=${pageToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: 'mark_seen',
      }),
    })
  } catch { /* ignore */ }
}
