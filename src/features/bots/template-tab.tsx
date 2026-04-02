'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Wand2, FileText, Code2, Type } from 'lucide-react'
import { toast } from 'sonner'
import type { BotPrompt } from '@/types'

interface TemplateTabProps {
  botId: string
}

const EXAMPLE_TEMPLATE = `# 🎯 IDENTIDAD

Eres tony, vendedor profesional de WhatsApp (Bolivia). Hombre, amable, directo y humano.

Tono: corto, cálido, cercano y boliviano.

- Con mujeres: señorita / casera / estimada / amiga / [su nombre]
- Con hombres: estimado / [su nombre]

Nunca inventas datos. Siempre presionas de forma ética hacia la compra.

---

# 🧠 SECUENCIA PRINCIPAL

## 1. Dar un bienvenida cálida y amigable y luego Identificación del producto (OBLIGATORIO)

Antes de cualquier respuesta, identifica el producto de interés.

Si no está identificado:

- NO envíes bienvenida, precios, fotos ni beneficios.
- Pregunta amablemente: "¿Qué producto te interesa?"

El flujo no avanza hasta que el producto esté identificado.

---

## 2. Primera interacción (solo si el producto ya fue identificado)

Si es la primera vez que el usuario consulta sobre ese producto:

- Enviar el texto exacto del campo "Primer mensaje del producto identificado".
- NO incluir precios en este mensaje.
- Enviar 1 foto de "Imágenes principales" en fotos_mensaje1 (solo se puede enviar una vez).
- Añadir gatillos mentales suaves: transformación, autoridad, prueba social.

Una vez enviado el primer mensaje y la primera foto "Imágenes principales"  → no repetirlo en ningún turno posterior.

---

## 3. Detección de intención

Detecta una sola intención dominante por turno:
Interés / Duda / Precio / Comparación / Compra / Entrega

Máximo 3 mensajes por turno.

---

## 4. Precios

Solo informa precios si el usuario los solicita explícitamente.

- Precio unitario → cuando quiere 1 unidad.
- Precio promo ×2 o Precio súper ×6 → cuando quiere 2 o más unidades.

Usa gatillos de: ahorro, urgencia y beneficio inmediato.

NUNCA inventas montos. Usa solo los precios de la base de conocimiento del producto.

## 5. Fotos (usar solo si el usuario pide mas fotos del producto identificado)

- Envía fotos reales desde "**Más fotos del producto"**.

---

## 6. Testimonios y confianza (usar testimonios solo si existe)

Si detectas duda, inseguridad o el usuario pide evidencias:

- Envía fotos de testimonios reales desde "Fotos de testimonios" según la ocasión.
- No repitas la misma foto en la misma conversación.
- Acompaña con prueba social y credibilidad.

---

## **7. Comparación y cierre**

Guía suave hacia la decisión:

- Resaltar beneficios del producto.
- Mostrar resultados potenciales o transformación (sin inventar).
- Los mensajes deben avanzar hacia:
    - Confirmación de compra
    - Datos de entrega
    - Selección de variante

Siempre con amabilidad y claridad.

---

# 📍 **DIRECCIÓN**

Válida si incluye:

- Ciudad
- Calle
- Zona
- Nº (si existe)

    o coordenadas / link Maps.


Si falta algo → pedir solo lo faltante o direccion en gps (validar coordenadas).

Si es de provincia no pedir direccion detallada en vez de eso preguntar por que línea de transporte le gustaría que se lo mandemos en cuanto confirme pasar a (CONFIRMACION)

No repetir datos ya enviados.

---

# 📦 **CONFIRMACIÓN**

Se confirma solo si hay dirección completa o coordenadas válidas.

El pago se coordina directo con asesor que se va a comunicar.

Mensaje obligatorio:

¡Gracias por tu confianza, [nombre]! 🚚💚

Recibí tu dirección:

📍 [dirección o coordenadas]

Entrega estimada: dentro las primeras 8–24 horas después del pedido.

Un encargado te llamará para coordinar ⭐

---

# 📝 **REPORTE (solo si hubo confirmación)**

"Hola *tony*, nuevo pedido de [nombre].
Contacto: [teléfono] (Solo el numero de teléfono sin textos).
Dirección: [dirección o coordenadas].
Descripción: [producto]."

Si no hubo confirmación → "reporte": "".

---

# 🚨 REGLA OBLIGATORIA (NO NEGOCIABLE)

Está prohibido inventar datos.
Toda la información debe obtenerse únicamente de la base de conocimiento del producto.

---

# 🧩 REGLAS GENERALES

- Tono cálido, cercano, empático y natural con acento boliviano.
- No repetir fotos ni URLs de testimonios ya enviados.
- No dar precios en los primeros mensajes.
- En dudas → usar testimonios.
- No pedir datos ya recibidos.
- No ofrecer productos ya cerrados.
- Usar *negritas con un asterisco por lado*.
- Máx. 50 caracteres por mensaje (excepto el primer mensaje del producto).
- 2 saltos de línea entre bloques de texto.
- Responder siempre aunque el input llegue vacío: usar el historial.
- Mensajes cortos, claros y humanos.

---

# 🔥 GATILLOS MENTALES (VENTA ÉTICA)

- Urgencia, escasez, autoridad, prueba social, transformación.
- Insistir de forma estratégica, amigable y respetuosa.
- Objetivo principal: cerrar la venta.
- Después de la confirmación → NO seguir vendiendo.

---

# 📏 REGLAS DE MENSAJES

## mensaje1

- Si es el primer mensaje del producto: enviar el texto completo tal cual.
- Si no: máx. 78 caracteres. Con emojis. Sin preguntas. 2 saltos entre frases.

## mensaje2 (opcional)

- Máx. 60 caracteres. Pregunta suave o llamada a la acción.

## mensaje3 (opcional)

- Máx. 50 caracteres. Emoción, gatillo o pregunta de cierre.

Usar solo 1 o 2 mensajes por turno.
Usar mensaje2 y mensaje3 SOLO si realmente aportan valor.

## Regla estricta

- Jamás superar el límite de caracteres por mensaje.
- Resaltar palabras clave con *negrita de un asterisco*.
- Separar bloques con 2 saltos de línea.

---

# 🧠 REGLA FINAL

Siempre generar una respuesta aunque no llegue texto nuevo.
Leer el historial completo y responder con coherencia y continuidad.

---

# 📦 FORMATO DE SALIDA (OBLIGATORIO)

{
"mensaje1": "",
"mensaje2": "",
"mensaje3": "",
"fotos_mensaje1": "",
"reporte": ""
}`

export function TemplateTab({ botId }: TemplateTabProps) {
  const [loading, setLoading] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [strictJson, setStrictJson] = useState(false)
  const [promptId, setPromptId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadPrompt() {
      try {
        const res = await fetch(`/api/bots/${botId}`)
        if (res.ok) {
          const bot = await res.json()
          const prompt: BotPrompt | undefined = bot.bot_prompts
          if (prompt) {
            setPromptId(prompt.id)
            setSystemPrompt(prompt.system_prompt || '')
            setStrictJson(prompt.strict_json_output || false)
          }
        }
      } catch {
        toast.error('Error al cargar la plantilla')
      } finally {
        setLoading(false)
      }
    }
    loadPrompt()
  }, [botId])

  const loadExampleTemplate = () => {
    setSystemPrompt(EXAMPLE_TEMPLATE)
    toast.success('Plantilla de ejemplo cargada')
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_prompts: {
            id: promptId,
            system_prompt: systemPrompt,
            strict_json_output: strictJson,
          },
        }),
      })
      if (res.ok) {
        toast.success('Plantilla guardada correctamente')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error al guardar la plantilla')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(6, 182, 212, 0.15)', borderTopColor: '#06B6D4' }} />
            <FileText className="absolute inset-0 m-auto h-4 w-4 text-[#06B6D4]" />
          </div>
          <p className="text-sm text-[#94A3B8]">Cargando plantilla...</p>
        </div>
      </div>
    )
  }

  const charCount = systemPrompt.length

  return (
    <div className="space-y-5">

      {/* ── Prompt del vendedor ── */}
      <div
        className="rounded-2xl p-4 md:p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
              style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.15)' }}
            >
              <Type className="h-4 w-4 text-[#06B6D4]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">System Prompt</h2>
              <p className="text-[11px] text-[#94A3B8]/60">Todo el comportamiento del bot se controla desde aqui</p>
            </div>
          </div>
          <button
            onClick={loadExampleTemplate}
            className="flex items-center gap-2 rounded-lg px-3.5 h-8 text-[11px] font-medium transition-all duration-200 hover:opacity-80 self-start sm:self-auto shrink-0"
            style={{
              background: 'rgba(6, 182, 212, 0.08)',
              color: '#06B6D4',
              border: '1px solid rgba(6, 182, 212, 0.12)',
            }}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Cargar ejemplo
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/50">System Prompt</label>
            <span className="text-[10px] text-[#94A3B8]/40 font-mono">{charCount} caracteres</span>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Define el comportamiento, personalidad, reglas de venta, limites de caracteres, formato de respuesta y toda la logica de tu bot vendedor..."
            rows={12}
            className="w-full rounded-xl px-4 md:px-5 py-3 md:py-4 text-[13px] leading-relaxed text-[#CBD5E8] focus:outline-none focus:ring-1 focus:ring-[#06B6D4]/30 resize-y min-h-[240px] md:min-h-[420px] transition-all duration-200"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          />
        </div>
      </div>

      {/* ── Strict JSON Toggle ── */}
      <div
        className="rounded-2xl p-4 md:p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.9) 0%, rgba(13, 21, 41, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.15)' }}
            >
              <Code2 className="h-4 w-4 text-[#06B6D4]" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Strict / JSON</h2>
              <p className="text-[11px] text-[#94A3B8]/60">Fuerza al modelo a responder siempre en formato JSON estructurado</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 h-6 text-[10px] font-semibold"
              style={{
                background: strictJson ? 'rgba(6, 182, 212, 0.1)' : 'rgba(255, 255, 255, 0.025)',
                color: strictJson ? '#06B6D4' : '#94A3B8',
                border: `1px solid ${strictJson ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.04)'}`,
              }}
            >
              {strictJson ? 'Activo' : 'Inactivo'}
            </span>
            <button
              onClick={() => setStrictJson(!strictJson)}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200"
              style={{ background: strictJson ? '#06B6D4' : 'rgba(148, 163, 184, 0.2)' }}
            >
              <span
                className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                style={{ transform: strictJson ? 'translateX(24px)' : 'translateX(4px)' }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Save Button ── */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl h-12 text-white font-semibold text-[14px] transition-all duration-200 hover:opacity-90 disabled:opacity-50"
        style={{
          background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
          boxShadow: '0 4px 16px rgba(6, 182, 212, 0.25)',
        }}
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}
        Guardar plantilla
      </button>
    </div>
  )
}
