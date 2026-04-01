import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

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

    const body = await request.json();
    const { botId, contactPhone, message, conversationHistory } = body;

    if (!botId || !message) {
      return NextResponse.json(
        { error: 'botId y message son requeridos' },
        { status: 400 }
      );
    }

    // Verify bot belongs to user's tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    // Obtener bot con prompt settings (scoped to tenant)
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select(`
        *,
        bot_prompts (*)
      `)
      .eq('id', botId)
      .eq('tenant_id', profile?.tenant_id || '')
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot no encontrado' },
        { status: 404 }
      );
    }

    // Obtener productos del bot con imagenes y testimonios
    const { data: products } = await supabase
      .from('products')
      .select('*, product_images(*), product_testimonials(*)')
      .eq('bot_id', botId)
      .eq('is_active', true);

    const botPrompt = bot.bot_prompts;

    // Construir contexto de productos enriquecido
    const productsContext = products && products.length > 0
      ? products.map((p: Record<string, unknown>) => {
          const imgs = (p.product_images as Array<{ url: string; image_type: string; is_primary: boolean }>) || [];
          const productImgs = imgs.filter(i => i.image_type === 'product');
          const offerImgs = imgs.filter(i => i.image_type === 'offer');
          const testimonials = (p.product_testimonials as Array<{ type: string; url: string; content: string; description: string }>) || [];

          let ctx = `- ${p.name} [${p.category || 'Sin categoria'}]: ${p.description}`;
          ctx += `\n  Precio: ${p.currency} ${p.price_unit}`;
          if (p.offer_price) ctx += ` | Precio oferta: ${p.currency} ${p.offer_price}`;
          ctx += `\n  Beneficios: ${p.benefits}`;
          ctx += `\n  Modo de uso: ${p.usage_instructions || 'No especificado'}`;
          if (p.warnings) ctx += `\n  Advertencias: ${p.warnings}`;
          ctx += `\n  Envio: ${p.shipping_info}. Cobertura: ${p.coverage}`;
          if (p.sell_zones) ctx += `\n  Zonas de venta: ${p.sell_zones}`;
          if (p.delivery_zones) ctx += `\n  Zonas de entrega: ${p.delivery_zones}`;
          if (productImgs.length > 0) ctx += `\n  Fotos producto: ${productImgs.map(i => i.url).join(', ')}`;
          if (offerImgs.length > 0) ctx += `\n  Fotos oferta: ${offerImgs.map(i => i.url).join(', ')}`;
          if (testimonials.length > 0) {
            ctx += `\n  Testimonios: ${testimonials.map(t => t.type === 'text' ? `"${t.content}"` : t.url).join(', ')}`;
          }
          return ctx;
        }).join('\n\n')
      : 'No hay productos configurados.';

    // Construir system prompt — el System Prompt es la unica fuente de verdad
    const systemPrompt = `${botPrompt?.system_prompt || 'Eres un asistente de ventas profesional.'}

PRODUCTOS DISPONIBLES:
${productsContext}

Telefono del contacto: ${contactPhone || 'desconocido'}`;

    // Construir historial de mensajes para OpenAI
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Agregar historial de conversación
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({
          role: msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message });

    // Llamar a OpenAI con el modelo seleccionado del bot
    const VALID_MODELS = new Set(['gpt-5.1', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini']);
    const openai = new OpenAI({
      apiKey: bot.openai_api_key || process.env.OPENAI_API_KEY,
    });

    const rawModel = bot.gpt_model || 'gpt-5.1';
    const selectedModel = VALID_MODELS.has(rawModel) ? rawModel : 'gpt-5.1';

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      return NextResponse.json(
        { error: 'No se recibió respuesta de la IA' },
        { status: 500 }
      );
    }

    // Parsear la respuesta JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch {
      // Si no se puede parsear como JSON, devolver como message1
      parsedResponse = {
        message1: responseContent,
        message2: null,
        message3: null,
        photos_message1: null,
        report: null,
      };
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error('Error en POST /api/ai:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al procesar la IA' },
      { status: 500 }
    );
  }
}
