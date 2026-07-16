/**
 * Entradas — QR de una entrada.
 *
 * GET /api/entradas/qr/[code] → PNG con el QR del `ticketCode`.
 *
 * Se genera AL VUELO (no se guarda nada): así el mismo QR se puede usar en el
 * email, en WhatsApp (WhatsApp descarga la URL) y en la página de la entrada.
 * Es público a propósito: el QR solo contiene el código, y validarlo/consumirlo
 * requiere el panel de admin autenticado.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  // Se acepta con o sin extensión (".png"): WhatsApp EXIGE que la URL de la imagen
  // de una plantilla termine en .png/.jpg, así que la entrada llega como "1234.png".
  const code = (params.code ?? '').trim().replace(/\.(png|jpe?g)$/i, '')

  // El código es alfanumérico (con guiones). Filtramos cualquier otra cosa.
  if (!code || code.length > 64 || !/^[A-Za-z0-9-]+$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  try {
    const png = await QRCode.toBuffer(code, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#12303a', light: '#FFFFFF' }, // azul de marca sobre blanco
    })

    return new NextResponse(png as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        // El QR de un código nunca cambia → se puede cachear fuerte.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('[GET /api/entradas/qr]', err)
    return NextResponse.json({ error: 'No se pudo generar el QR' }, { status: 500 })
  }
}
