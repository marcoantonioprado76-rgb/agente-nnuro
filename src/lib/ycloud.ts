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
  caption: string = '',
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'image',
      image: { link: imageUrl, ...(caption ? { caption } : {}) },
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

/**
 * Sends a voice note (audio) using a public HTTPS URL (OGG/Opus).
 * WhatsApp renderiza el OGG/Opus como nota de voz automáticamente.
 */
export async function sendAudio(
  from: string,
  to: string,
  audioUrl: string,
  apiKey: string,
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'audio',
      audio: { link: audioUrl },
    },
    apiKey,
  )
}

/**
 * Sends a DOCUMENT (PDF u otro archivo) usando una URL pública.
 * Llega como archivo adjunto real en WhatsApp (no como link de texto).
 */
export async function sendDocument(
  from: string,
  to: string,
  documentUrl: string,
  filename: string,
  caption: string,
  apiKey: string,
): Promise<void> {
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'document',
      document: {
        link: documentUrl,
        ...(filename ? { filename } : {}),
        ...(caption ? { caption } : {}),
      },
    },
    apiKey,
  )
}

/**
 * Envía una PLANTILLA aprobada de WhatsApp (HSM). Es la ÚNICA forma de escribirle
 * a alguien FUERA de la ventana de 24h (o de iniciar una conversación).
 * `bodyParams` rellena las variables del cuerpo. Si la variable es NOMBRADA
 * (ej. {{__1___}}), pasar `name`; si es posicional ({{1}}), omitir `name`.
 */
/**
 * Envía una PLANTILLA aprobada con una IMAGEN en el ENCABEZADO.
 *
 * Es la ÚNICA forma OFICIAL (sin riesgo de baneo) de mandarle una imagen a alguien
 * que NO nos escribió en las últimas 24h — se usa para entregar el QR de la entrada.
 * La plantilla debe estar aprobada con `HEADER format = IMAGE`.
 */
export async function sendTemplateWithImage(
  from: string,
  to: string,
  apiKey: string,
  templateName: string,
  languageCode: string,
  imageUrl: string,
  bodyParams: Array<{ name?: string; text: string }> = [],
): Promise<void> {
  const components: unknown[] = [
    { type: 'header', parameters: [{ type: 'image', image: { link: imageUrl } }] },
  ]
  if (bodyParams.length) {
    components.push({
      type: 'body',
      parameters: bodyParams.map((p) => ({
        type: 'text',
        ...(p.name ? { parameter_name: p.name } : {}),
        text: p.text,
      })),
    })
  }

  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'template',
      template: { name: templateName, language: { code: languageCode }, components },
    },
    apiKey,
  )
}

export async function sendTemplate(
  from: string,
  to: string,
  apiKey: string,
  templateName: string,
  languageCode: string,
  bodyParams: Array<{ name?: string; text: string }> = [],
): Promise<void> {
  const components = bodyParams.length
    ? [{
        type: 'body',
        parameters: bodyParams.map((p) => ({
          type: 'text',
          ...(p.name ? { parameter_name: p.name } : {}),
          text: p.text,
        })),
      }]
    : []
  await ycloudRequest(
    '/whatsapp/messages',
    {
      from,
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components.length ? { components } : {}),
      },
    },
    apiKey,
  )
}
