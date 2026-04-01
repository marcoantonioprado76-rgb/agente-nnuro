import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

let cachedImage: ArrayBuffer | null = null
let cachedSize = 0

async function getImage(): Promise<ArrayBuffer | null> {
  if (cachedImage) return cachedImage

  const paths = [
    join(process.cwd(), 'public', 'og-image.png'),
    join(process.cwd(), 'src', 'app', 'opengraph-image.png'),
  ]

  for (const p of paths) {
    try {
      const buf = await readFile(p)
      cachedSize = buf.byteLength
      cachedImage = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      return cachedImage
    } catch {
      // try next path
    }
  }
  return null
}

export async function GET() {
  const image = await getImage()

  if (!image) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return new NextResponse(image, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': String(cachedSize),
      'Cache-Control': 'public, max-age=86400, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
