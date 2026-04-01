import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const PRODUCT_COLUMNS = new Set([
  'name', 'description', 'benefits', 'usage_instructions', 'warnings',
  'currency', 'price_unit', 'price_promo_x2', 'price_super_x6',
  'offer_price', 'shipping_info', 'coverage', 'hooks', 'is_active',
  'category', 'sell_zones', 'delivery_zones',
  'updated_at',
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

async function verifyProductAccess(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, userId: string, productId: string) {
  const { data: profile } = await supabase.from('profiles').select('tenant_id, role').eq('id', userId).single();
  if (!profile) return { allowed: false, isAdmin: false };

  if (profile.role === 'admin') return { allowed: true, isAdmin: true };

  const service = await createServiceRoleClient();
  const { data: product } = await service.from('products').select('tenant_id').eq('id', productId).single();
  if (!product || product.tenant_id !== profile.tenant_id) return { allowed: false, isAdmin: false };

  return { allowed: true, isAdmin: false };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { allowed } = await verifyProductAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este producto' }, { status: 403 });
    }

    const service = await createServiceRoleClient();
    const { data: product, error } = await service
      .from('products')
      .select(`*, product_images (*), product_testimonials (*)`)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error en GET /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { allowed } = await verifyProductAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este producto' }, { status: 403 });
    }

    const body = await request.json();
    const service = await createServiceRoleClient();

    // Separate nested data from product fields
    const { product_images, product_testimonials, ...productFields } = body;

    // Update product fields (only known columns)
    const safeFields = pickProductFields(productFields);
    safeFields.updated_at = new Date().toISOString();
    const { data: product, error } = await service
      .from('products')
      .update(safeFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar producto:', error);
      return NextResponse.json({ error: 'Error al actualizar el producto' }, { status: 500 });
    }

    // Sync product images if provided
    if (product_images !== undefined) {
      // Delete existing images and re-insert
      await service.from('product_images').delete().eq('product_id', id);
      if (product_images.length > 0) {
        const imageRows = product_images.map((img: { url: string; sort_order: number; is_primary: boolean; image_type: string }) => ({
          product_id: id,
          url: img.url,
          sort_order: img.sort_order,
          is_primary: img.is_primary || false,
          image_type: img.image_type || 'product',
        }));
        await service.from('product_images').insert(imageRows);
      }
    }

    // Sync testimonials if provided
    if (product_testimonials !== undefined) {
      await service.from('product_testimonials').delete().eq('product_id', id);
      if (product_testimonials.length > 0) {
        const testRows = product_testimonials.map((t: { type: string; url: string; content?: string; description?: string }) => ({
          product_id: id,
          type: t.type || 'image',
          url: t.url,
          content: t.content || '',
          description: t.description || '',
        }));
        await service.from('product_testimonials').insert(testRows);
      }
    }

    // Return full product with relations
    const { data: fullProduct } = await service
      .from('products')
      .select('*, product_images(*), product_testimonials(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(fullProduct || product);
  } catch (error) {
    console.error('Error en PUT /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { allowed } = await verifyProductAccess(supabase, user.id, id);
    if (!allowed) {
      return NextResponse.json({ error: 'No tienes acceso a este producto' }, { status: 403 });
    }

    const service = await createServiceRoleClient();
    const { error } = await service.from('products').delete().eq('id', id);

    if (error) {
      console.error('Error al eliminar producto:', error);
      return NextResponse.json({ error: 'Error al eliminar el producto' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error en DELETE /api/products/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
