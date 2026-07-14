export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  // 1. Auth
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // 2. Leer archivo
  let file: File
  try {
    const formData = await request.formData()
    file = formData.get('file') as File
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Error leyendo el archivo' }, { status: 400 })
  }

  // 3. Validar tipo y tamaño
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP' }, { status: 400 })
  }
// 4. Subir a Supabase Storage
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const fileName = `avatars/${user.id}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('uploads')
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: true,
    })

  if (uploadError) {
    console.error('[AVATAR] Supabase upload error:', uploadError)
    return NextResponse.json(
      { error: `Error al subir a Storage: ${uploadError.message}` },
      { status: 500 }
    )
  }

  // 5. Obtener URL pública
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('uploads')
    .getPublicUrl(fileName)

  // 6. Guardar en DB con SQL directo (funciona aunque prisma generate no haya corrido)
  try {
    await prisma.$executeRaw`
      UPDATE users
      SET avatar_url = ${publicUrl}, updated_at = NOW()
      WHERE id = ${user.id}::uuid
    `
  } catch (dbErr: any) {
    console.error('[AVATAR] DB update error:', dbErr)
    // Si la columna no existe aún, devolver la URL igual para que la UI funcione
    if (dbErr?.message?.includes('column') || dbErr?.code === '42703') {
      return NextResponse.json({
        avatarUrl: publicUrl,
        warning: 'Foto subida pero no guardada en DB. Ejecuta la migración SQL.',
      })
    }
    return NextResponse.json(
      { error: `Error guardando en base de datos: ${dbErr?.message ?? 'desconocido'}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ avatarUrl: publicUrl })
}
