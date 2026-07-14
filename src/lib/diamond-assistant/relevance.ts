/**
 * Selección de CONOCIMIENTO y BIBLIOTECA relevantes a cada mensaje.
 *
 * En vez de mandarle a la IA TODO el conocimiento (catálogo + precios de 3 países
 * + rangos + bonos + app) y los 17 recursos en CADA mensaje (quema tokens), acá
 * elegimos únicamente lo que el mensaje pide, por categoría/etiquetas.
 *
 * Compartido por los dos handlers del Diamond Assistant (Baileys y YCloud).
 */

// Palabras clave por categoría de conocimiento.
export const KNOWLEDGE_KEYWORDS: Record<string, string[]> = {
  productos: ['producto', 'catalogo', 'catálogo', 'beneficio', 'sirve', 'ingrediente',
    'detox', 'energy', 'women', 'flex', 'capuccino', 'cappuccino', 'black', 'slim', 'citralife',
    'vitalshield', 'brain', 'slepp', 'sblt', 'vsn', 'calcit', 'kids', 'cosmetic', 'crema', 'serum',
    'jabon', 'jabón', 'mocha', 'amalaki', 'probiovital', 'sculpt'],
  'precios-bolivia': ['bolivia', 'boliviano'],
  'precios-peru': ['perú', 'peru', 'soles'],
  'precios-mexico': ['méxico', 'mexico', 'mxn'],
  rangos: ['rango', 'director', 'platino', 'zafiro', 'esmeralda', 'diamante', 'embajador', 'binario', 'calificaci', 'activaci'],
  bonos: ['bono', 'comisi', 'pool', 'igualador', 'residual', 'compensaci'],
  app: ['my diamond', 'mydiamond', 'herramienta', 'plataforma', 'landing', 'automatiz', 'academia', 'referido', 'broadcast', 'tienda virtual'],
}

// Palabras clave por etiqueta de la biblioteca (recursos). Reutiliza las de
// conocimiento y agrega 'negocio' y 'acceso'.
export const MEDIA_TAG_KEYWORDS: Record<string, string[]> = {
  ...KNOWLEDGE_KEYWORDS,
  negocio: ['negocio', 'oportunidad', 'emprender', 'emprendimiento', 'plan', 'presentacion', 'presentación',
    'empresa', 'como empezar', 'cómo empezar', 'unir', 'unirme', 'afiliar', 'registr', 'ganar', 'ingreso'],
  acceso: ['oficina', 'registr', 'acceso', 'ingresar', 'ingreso', 'enlace', 'link', 'plataforma', 'sistema', 'my diamond', 'mydiamond'],
}

/** Devuelve solo los items de conocimiento relevantes al mensaje. */
export function pickRelevantKnowledge<T extends { category: string | null; content: string }>(
  items: T[],
  userMessage: string,
): T[] {
  const msg = (userMessage || '').toLowerCase()
  const picked = items.filter(it => {
    const cat = (it.category || '').toLowerCase()
    if (cat === 'core' || cat === 'empresa' || cat === '') return true // contexto base siempre
    const kw = KNOWLEDGE_KEYWORDS[cat]
    if (!kw) return true // categoría desconocida → incluir por seguridad
    return kw.some(w => msg.includes(w))
  })
  // Salvavidas: si NADA matcheó, mandamos los items cortos para no dejar al agente sin contexto.
  if (picked.length === 0) return items.filter(it => it.content.length <= 1600)
  return picked
}

/** Devuelve solo los recursos de la biblioteca relevantes al mensaje. */
export function pickRelevantMedia<T extends { tags: unknown }>(media: T[], userMessage: string): T[] {
  const msg = (userMessage || '').toLowerCase()
  return media.filter(m => {
    const tags = Array.isArray(m.tags) ? (m.tags as unknown[]).map(t => String(t).toLowerCase()) : []
    if (tags.length === 0) return true       // sin etiqueta → disponible siempre (compat)
    if (tags.includes('core')) return true    // recursos base (catálogo, presentación)
    return tags.some(t => (MEDIA_TAG_KEYWORDS[t] || []).some(w => msg.includes(w)))
  })
}
