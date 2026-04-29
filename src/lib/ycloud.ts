/**
 * YCloud WhatsApp API integration.
 * Docs: https://docs.ycloud.com/reference/whatsapp-messages-send
 */

const YCLOUD_BASE = 'https://api.ycloud.com/v2'

async function ycloudRequest(path: string, body: unknown, apiKey: string): Promise<void> {
  const res = await fetch(`${YCLOUD_BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YCloud ${path} → ${res.status}: ${err}`)
  }
}

/** Marks an inbound message as read. */
export async function markAsRead(messageId: string, apiKey: string): Promise<void> {
  await ycloudRequest(
    `/whatsapp/inboundMessages/${encodeURIComponent(messageId)}/markAsRead`,
    {},
    apiKey,
  )
}

/**
 * Sends a plain text message.
 * @param from  WhatsApp Business phone number (sender)
 * @param to    Recipient phone number (E.164 format, e.g. "15551234567")
 */
export async function sendText(
  from: string,
  to: string,
  text: string,
  apiKey: string,
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'text',
      text: { body: text },
    },
    apiKey,
  )
}

/**
 * Sends an image message using a public HTTPS URL.
 * WhatsApp/YCloud servers must be able to fetch the URL directly.
 */
export async function sendImage(
  from: string,
  to: string,
  imageUrl: string,
  apiKey: string,
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'image',
      image: { link: imageUrl },
    },
    apiKey,
  )
}

/**
 * Sends a video message using a public HTTPS URL (MP4).
 * WhatsApp/YCloud servers must be able to fetch the URL directly.
 * Supported formats: MP4, 3GPP. Max 16MB.
 */
export async function sendVideo(
  from: string,
  to: string,
  videoUrl: string,
  caption: string = '',
  apiKey: string,
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'video',
      video: { link: videoUrl, ...(caption ? { caption } : {}) },
    },
    apiKey,
  )
}
