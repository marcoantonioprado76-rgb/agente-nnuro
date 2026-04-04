import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { product_ids, recipient_email } = await request.json()
    if (!product_ids?.length || !recipient_email) {
      return NextResponse.json({ error: 'product_ids y recipient_email son requeridos' }, { status: 400 })
    }

    const service = await createServiceRoleClient()

    // Verify sender owns the products
    const { data: senderProfile } = await service.from('profiles').select('tenant_id, full_name').eq('id', user.id).single()
    if (!senderProfile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const { data: products } = await service
      .from('products')
      .select('*, product_images(*), product_testimonials(*)')
      .in('id', product_ids)
      .eq('tenant_id', senderProfile.tenant_id)

    if (!products || products.length === 0) {
      return NextResponse.json({ error: 'No se encontraron productos' }, { status: 404 })
    }

    // Find recipient
    const { data: recipient } = await service
      .from('profiles')
      .select('id, tenant_id, full_name, email')
      .eq('email', recipient_email)
      .single()

    if (!recipient) {
      return NextResponse.json({ error: 'El usuario con ese correo no existe en la plataforma' }, { status: 404 })
    }

    if (recipient.tenant_id === senderProfile.tenant_id) {
      return NextResponse.json({ error: 'No puedes compartir productos contigo mismo' }, { status: 400 })
    }

    // Get recipient's first bot
    const { data: recipientBot } = await service
      .from('bots')
      .select('id')
      .eq('tenant_id', recipient.tenant_id)
      .limit(1)
      .single()

    if (!recipientBot) {
      return NextResponse.json({ error: 'El usuario destino no tiene bots creados' }, { status: 400 })
    }

    // Clone products as copies for recipient
    let cloned = 0
    for (const product of products) {
      const { data: newProduct, error: insertError } = await service
        .from('products')
        .insert({
          bot_id: recipientBot.id,
          tenant_id: recipient.tenant_id,
          name: product.name,
          description: product.description,
          benefits: product.benefits,
          usage_instructions: product.usage_instructions,
          warnings: product.warnings,
          currency: product.currency,
          price_unit: product.price_unit,
          offer_price: product.offer_price,
          price_promo_x2: product.price_promo_x2,
          price_super_x6: product.price_super_x6,
          shipping_info: product.shipping_info,
          coverage: product.coverage,
          sell_zones: product.sell_zones,
          delivery_zones: product.delivery_zones,
          hooks: product.hooks,
          first_message: product.first_message,
          category: product.category,
          is_active: true,
        })
        .select()
        .single()

      if (insertError || !newProduct) continue

      // Clone images
      if (product.product_images?.length) {
        await service.from('product_images').insert(
          product.product_images.map((img: Record<string, unknown>) => ({
            product_id: newProduct.id,
            url: img.url,
            sort_order: img.sort_order,
            is_primary: img.is_primary,
            image_type: img.image_type,
          }))
        )
      }

      // Clone testimonials
      if (product.product_testimonials?.length) {
        await service.from('product_testimonials').insert(
          product.product_testimonials.map((t: Record<string, unknown>) => ({
            product_id: newProduct.id,
            type: t.type,
            url: t.url,
            content: t.content,
            description: t.description,
          }))
        )
      }

      cloned++
    }

    // Send notification email
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })

      const productNames = products.map(p => p.name).join(', ')
      await transporter.sendMail({
        from: `"Ventas AI" <${process.env.GMAIL_USER}>`,
        to: recipient_email,
        subject: `${senderProfile.full_name} te compartió productos — Ventas AI`,
        html: `
          <div style="background:#000;padding:40px;font-family:Arial,sans-serif">
            <div style="background:#0A0A0F;border-radius:16px;padding:32px;max-width:500px;margin:0 auto;border:1px solid rgba(139,92,246,0.1)">
              <h2 style="color:#fff;margin:0 0 12px">Productos compartidos</h2>
              <p style="color:#94A3B8;margin:0 0 20px;font-size:14px">
                <strong style="color:#fff">${senderProfile.full_name}</strong> te compartió ${cloned} producto(s):
              </p>
              <p style="color:#8B5CF6;font-size:14px;margin:0 0 20px">${productNames}</p>
              <p style="color:#94A3B8;font-size:13px;margin:0 0 20px">
                Los productos fueron copiados a tu bot. Puedes editarlos libremente sin afectar los originales.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/bots" style="display:inline-block;background:#8B5CF6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px">
                Ver mis productos
              </a>
            </div>
          </div>
        `,
      })
    } catch { /* email is non-critical */ }

    // Notify recipient in-app
    await service.from('user_notifications').insert({
      user_id: recipient.id,
      type: 'productos_compartidos',
      title: `${senderProfile.full_name} te compartió productos`,
      message: `Recibiste ${cloned} producto(s) copiados a tu bot. Puedes editarlos libremente.`,
      link: '/bots',
    })

    return NextResponse.json({
      success: true,
      message: `${cloned} producto(s) compartidos con ${recipient_email}`,
      cloned,
    })
  } catch (error) {
    console.error('Error sharing products:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
