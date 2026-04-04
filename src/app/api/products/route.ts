import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// Only allow known product columns to prevent Supabase errors from unknown fields
const PRODUCT_COLUMNS = new Set([
  'name', 'description', 'benefits', 'usage_instructions', 'warnings',
  'currency', 'price_unit', 'price_promo_x2', 'price_super_x6',
  'offer_price', 'shipping_info', 'coverage', 'hooks', 'is_active',
  'category', 'sell_zones', 'delivery_zones', 'first_message',
]);

function pickProductFields(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (PRODUCT_COLUMNS.has(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get user profile for tenant isolation
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      );
    }

    const botId = request.nextUrl.searchParams.get('botId');

    let query = supabase
      .from('products')
      .select('*, bots(name), product_images(*), product_testimonials(*)')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false });

    // If botId provided, also filter by bot (within tenant)
    if (botId) {
      query = query.eq('bot_id', botId);
    }

    const { data: products, error } = await query;

    if (error) {
      console.error('Error al obtener productos:', error);
      return NextResponse.json(
        { error: 'Error al obtener los productos' },
        { status: 500 }
      );
    }

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error en GET /api/products:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { botId, product_images, product_testimonials, ...productFields } = body;

    if (!botId) {
      return NextResponse.json(
        { error: 'El botId es requerido' },
        { status: 400 }
      );
    }

    // Verify bot belongs to user's tenant
    const { data: bot } = await supabase
      .from('bots')
      .select('id')
      .eq('id', botId)
      .eq('tenant_id', profile.tenant_id)
      .single();

    if (!bot) {
      return NextResponse.json(
        { error: 'Bot no encontrado o no autorizado' },
        { status: 403 }
      );
    }

    if (!productFields.name) {
      return NextResponse.json(
        { error: 'El nombre del producto es requerido' },
        { status: 400 }
      );
    }

    // Verificar límite del plan
    const service = await createServiceRoleClient()
    const { data: subscription } = await service
      .from('subscriptions')
      .select('plan_id, plan:plan_id(max_products)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (subscription) {
      const maxProducts = (subscription.plan as unknown as { max_products: number })?.max_products ?? 999
      const { count: currentProducts } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      if ((currentProducts || 0) >= maxProducts) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${maxProducts} producto(s) de tu plan. Actualiza tu plan para crear más.` },
          { status: 403 }
        )
      }
    }

    const safeFields = pickProductFields(productFields);
    const { data: product, error } = await service
      .from('products')
      .insert({
        ...safeFields,
        bot_id: botId,
        tenant_id: profile.tenant_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear producto:', error);
      return NextResponse.json(
        { error: 'Error al crear el producto' },
        { status: 500 }
      );
    }

    // Insert product images if provided
    if (product_images && product_images.length > 0) {
      const imageRows = product_images.map((img: { url: string; sort_order: number; is_primary: boolean; image_type: string }) => ({
        product_id: product.id,
        url: img.url,
        sort_order: img.sort_order,
        is_primary: img.is_primary || false,
        image_type: img.image_type || 'product',
      }));
      await service.from('product_images').insert(imageRows);
    }

    // Insert testimonials if provided
    if (product_testimonials && product_testimonials.length > 0) {
      const testRows = product_testimonials.map((t: { type: string; url: string; content?: string; description?: string }) => ({
        product_id: product.id,
        type: t.type || 'image',
        url: t.url,
        content: t.content || '',
        description: t.description || '',
      }));
      await service.from('product_testimonials').insert(testRows);
    }

    // Return full product with relations
    const { data: fullProduct } = await service
      .from('products')
      .select('*, product_images(*), product_testimonials(*)')
      .eq('id', product.id)
      .single();

    return NextResponse.json(fullProduct || product, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/products:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
