// Librería de CATEGORÍAS de negocio para anuncios. Cada categoría define:
// - concepts: ideas visuales (escenas) que funcionan para ese rubro → guían el prompt de imagen.
// - extraFields: campos propios del rubro que la IA llena en `categoryData` del brief.
// El usuario elige la categoría arriba de todo; la IA genera el brief acorde.

export interface AdCategory {
    id: string
    label: string
    emoji: string
    /** Conceptos visuales (escenas) típicos del rubro. */
    concepts: string[]
    /** Campos propios del rubro que la IA debe completar (clave: descripción). */
    extraFields: { key: string; label: string }[]
    /** Plantilla de prompt de imagen tuneada para el rubro (con slots {producto} {beneficios} {enfoque} {estilo}). Si está, se usa directo (sin IA). */
    promptTemplate?: string
}

export const AD_CATEGORIES: AdCategory[] = [
    {
        id: 'producto_fisico', label: 'Producto físico / E-commerce', emoji: '🛍️',
        concepts: ['Hero del producto en fondo limpio', 'Persona usándolo/disfrutándolo', 'Antes/después', 'Flat-lay cenital con props', 'Lifestyle real', 'Detalle macro de calidad', 'Producto + empaque premium'],
        extraFields: [{ key: 'productName', label: 'nombre del producto' }, { key: 'materials', label: 'materiales/aspecto' }, { key: 'variants', label: 'variantes/colores' }, { key: 'usage', label: 'modo de uso' }],
    },
    {
        id: 'salud_belleza', label: 'Salud y Belleza / Skincare', emoji: '💆',
        concepts: ['Antes/después de la piel', 'Persona aplicando el producto', 'Resultado de cerca (piel radiante)', 'Textura/swatch del producto', 'Rutina paso a paso', 'Ingredientes naturales alrededor'],
        extraFields: [{ key: 'productKind', label: 'tipo (crema/serum/etc.)' }, { key: 'keyIngredients', label: 'ingredientes clave' }, { key: 'result', label: 'resultado + tiempo' }, { key: 'skinType', label: 'tipo de piel' }],
    },
    {
        id: 'estetica_spa', label: 'Estética / Spa / Tratamientos', emoji: '🧖',
        concepts: ['Cliente relajado en sesión', 'Antes/después del tratamiento', 'Ambiente del spa', 'Primer plano del resultado', 'Manos del profesional trabajando'],
        extraFields: [{ key: 'treatment', label: 'tratamiento' }, { key: 'result', label: 'resultado' }, { key: 'duration', label: 'duración/sesiones' }],
    },
    {
        id: 'comida', label: 'Comida / Restaurante / Delivery', emoji: '🍔',
        concepts: ['Plato apetitoso (food styling)', 'Gente disfrutando en la mesa', 'Ambiente del local', 'Ingredientes frescos', 'El "chorreado/queso" en acción', 'Combo/promo armado', 'Delivery llegando'],
        extraFields: [{ key: 'starDishes', label: 'platos estrella' }, { key: 'cuisine', label: 'tipo de cocina' }, { key: 'ambience', label: 'ambiente' }, { key: 'delivery', label: 'delivery/local' }],
    },
    {
        id: 'inmuebles', label: 'Inmuebles / Terrenos', emoji: '🏞️',
        concepts: ['Aérea/drone del lote y entorno', 'Familia parada en el terreno soñando', 'Render de la casa futura', 'Plano de ubicación/accesos', 'Interior modelo aspiracional', 'Atardecer sobre el lote'],
        extraFields: [{ key: 'propertyType', label: 'tipo (lote/casa/depto/local)' }, { key: 'location', label: 'zona/ubicación' }, { key: 'size', label: 'm²' }, { key: 'financing', label: 'precio/financiación' }, { key: 'amenities', label: 'servicios/plusvalía' }, { key: 'status', label: 'estado (pozo/a estrenar)' }],
    },
    {
        id: 'construccion', label: 'Construcción / Remodelación', emoji: '🏗️',
        concepts: ['Antes/después de la obra', 'Obra terminada iluminada de noche', 'Equipo trabajando', 'Detalle de materiales/calidad', 'Render 3D del proyecto'],
        extraFields: [{ key: 'service', label: 'servicio (obra/remodelación)' }, { key: 'specialty', label: 'especialidad' }, { key: 'result', label: 'resultado típico' }],
    },
    {
        id: 'software', label: 'Software / App / SaaS', emoji: '💻',
        concepts: ['Mockup en celular/laptop', 'Persona usando la app feliz', 'Dashboard con resultados', 'Antes caótico / después ordenado', 'Pantalla flotante 3D', 'Equipo colaborando'],
        extraFields: [{ key: 'platform', label: 'plataforma (web/móvil)' }, { key: 'problemSolved', label: 'problema que automatiza' }, { key: 'userType', label: 'tipo de usuario' }, { key: 'model', label: 'modelo (suscripción/único)' }],
    },
    {
        id: 'cursos', label: 'Cursos / Infoproductos', emoji: '🎓',
        concepts: ['Transformación del alumno (antes/después de vida)', 'Instructor enseñando', 'Lifestyle "estudiá desde casa"', 'Laptop con el curso', 'Alumno celebrando un logro', 'Resultado tangible'],
        extraFields: [{ key: 'topic', label: 'tema' }, { key: 'format', label: 'formato (online/presencial)' }, { key: 'duration', label: 'duración' }, { key: 'promise', label: 'promesa/resultado' }, { key: 'level', label: 'nivel' }],
    },
    {
        id: 'educacion', label: 'Educación / Academias / Colegios', emoji: '🏫',
        concepts: ['Estudiantes en clase', 'Ambiente de aprendizaje moderno', 'Graduación/logro', 'Profesor con alumnos', 'Instalaciones/campus'],
        extraFields: [{ key: 'level', label: 'nivel (inicial/secundaria/universitario)' }, { key: 'programs', label: 'programas/carreras' }, { key: 'modality', label: 'modalidad' }],
    },
    {
        id: 'moda', label: 'Moda / Indumentaria / Calzado', emoji: '👗',
        concepts: ['Modelo con la prenda', 'Outfit completo armado', 'Flat-lay de la colección', 'Lifestyle urbano', 'Detalle de tela/costura', 'Editorial/pasarela'],
        extraFields: [{ key: 'garmentType', label: 'tipo de prenda' }, { key: 'season', label: 'temporada' }, { key: 'style', label: 'estilo' }, { key: 'material', label: 'material' }],
    },
    {
        id: 'joyeria', label: 'Joyería / Accesorios / Relojes', emoji: '💍',
        concepts: ['Macro del producto con brillo', 'Puesto en la persona (muñeca/cuello)', 'Sobre fondo de lujo', 'Caja/empaque premium', 'Momento especial (regalo/propuesta)'],
        extraFields: [{ key: 'productKind', label: 'tipo (anillo/reloj/etc.)' }, { key: 'material', label: 'material (oro/plata)' }, { key: 'occasion', label: 'ocasión' }],
    },
    {
        id: 'fitness', label: 'Fitness / Gym / Entrenamiento', emoji: '🏋️',
        concepts: ['Transformación corporal antes/después', 'Persona entrenando en acción', 'Energía/intensidad', 'Comunidad/clase grupal', 'Instalaciones del gym', 'Meta alcanzada'],
        extraFields: [{ key: 'modality', label: 'modalidad (gym/online/clases)' }, { key: 'goal', label: 'objetivo (bajar/tonificar)' }, { key: 'level', label: 'nivel' }, { key: 'plan', label: 'plan/duración' }],
    },
    {
        id: 'nutricion', label: 'Nutrición / Suplementos', emoji: '💊',
        concepts: ['Producto + estilo de vida saludable', 'Persona activa y enérgica', 'Antes/después físico', 'Ingredientes/beneficios alrededor', 'Batido/preparación en acción'],
        extraFields: [{ key: 'productKind', label: 'tipo (proteína/vitamina)' }, { key: 'benefitFocus', label: 'beneficio principal' }, { key: 'usage', label: 'modo de uso' }],
        promptTemplate: 'Imagen para un anuncio de Meta Ads, atractivo y llamativo, de {producto}. Escena: {concepto}. Resaltá visualmente estos beneficios: {beneficios}. Enfoque: {enfoque}. Estilo {estilo}, fresco, natural y saludable, iluminación luminosa, fotorrealista. Imagen limpia y de alta conversión, sin texto, sin marcas de agua.',
    },
    {
        id: 'automotriz', label: 'Automotriz / Autos / Taller', emoji: '🚗',
        concepts: ['Vehículo en escena dramática', 'Detalle de diseño', 'Familia/ruta/aventura', 'Interior premium', 'Antes/después (taller/detailing)', 'Auto de noche con luces'],
        extraFields: [{ key: 'businessKind', label: 'tipo (venta/taller/repuestos)' }, { key: 'brandModel', label: 'marca/modelo' }, { key: 'service', label: 'servicio' }],
    },
    {
        id: 'turismo', label: 'Turismo / Viajes / Hotelería', emoji: '✈️',
        concepts: ['El destino soñado', 'Gente disfrutando la experiencia', 'Paisajes impactantes', 'Habitación/hotel aspiracional', 'Momento pareja/familia', 'Actividad (tour/playa)'],
        extraFields: [{ key: 'destination', label: 'destino' }, { key: 'packageType', label: 'tipo (tour/hotel/paquete)' }, { key: 'duration', label: 'duración' }, { key: 'includes', label: 'qué incluye' }],
    },
    {
        id: 'mascotas', label: 'Mascotas / Petshop / Veterinaria', emoji: '🐶',
        concepts: ['Mascota feliz/adorable', 'Producto en uso', 'Dueño + mascota juntos', 'Antes/después (grooming/salud)', 'Mascota jugando'],
        extraFields: [{ key: 'species', label: 'especie' }, { key: 'businessKind', label: 'tipo (producto/servicio)' }, { key: 'benefitFocus', label: 'beneficio' }],
    },
    {
        id: 'hogar_deco', label: 'Hogar / Decoración / Muebles', emoji: '🏠',
        concepts: ['Espacio decorado aspiracional', 'Antes/después del ambiente', 'Detalle del mueble en contexto', 'Ambiente cálido iluminado', 'Producto resaltado en la sala'],
        extraFields: [{ key: 'productKind', label: 'tipo de producto' }, { key: 'room', label: 'ambiente' }, { key: 'style', label: 'estilo' }, { key: 'material', label: 'material' }],
    },
    {
        id: 'tecnologia', label: 'Electrodomésticos / Tecnología / Gadgets', emoji: '📱',
        concepts: ['Producto hero con luz dramática', 'En uso en el hogar', 'Detalle de funciones', 'Antes/después (vida más fácil)', 'Familia disfrutando'],
        extraFields: [{ key: 'productName', label: 'producto' }, { key: 'keyFeatures', label: 'funciones clave' }, { key: 'benefitFocus', label: 'beneficio' }],
    },
    {
        id: 'servicios_prof', label: 'Servicios profesionales (legal/contable/consultoría)', emoji: '⚖️',
        concepts: ['Profesional confiable en acción', 'Cliente satisfecho/aliviado', 'Resultado o dato de éxito', 'Oficina premium', 'Reunión/asesoría'],
        extraFields: [{ key: 'specialty', label: 'especialidad' }, { key: 'modality', label: 'modalidad' }, { key: 'result', label: 'resultado típico' }],
    },
    {
        id: 'salud_clinica', label: 'Salud / Clínicas / Dental / Médico', emoji: '🩺',
        concepts: ['Antes/después (sonrisa/tratamiento)', 'Paciente feliz', 'Profesional atendiendo', 'Instalaciones modernas y limpias', 'Tecnología/equipo'],
        extraFields: [{ key: 'specialty', label: 'especialidad' }, { key: 'treatment', label: 'tratamiento' }, { key: 'result', label: 'resultado' }],
    },
    {
        id: 'peluqueria', label: 'Peluquería / Barbería / Capilar', emoji: '💇',
        concepts: ['Antes/después del corte/color', 'Cliente con el resultado', 'Profesional trabajando', 'Ambiente del salón', 'Producto capilar en uso'],
        extraFields: [{ key: 'service', label: 'servicio' }, { key: 'result', label: 'resultado' }],
    },
    {
        id: 'bebes', label: 'Bebés / Maternidad / Infantil', emoji: '👶',
        concepts: ['Bebé feliz y tierno', 'Momento mamá/papá + bebé', 'Producto en uso seguro', 'Ambiente suave y cálido', 'Detalle de calidad/seguridad'],
        extraFields: [{ key: 'productKind', label: 'tipo de producto' }, { key: 'ageRange', label: 'edad del bebé' }, { key: 'safety', label: 'seguridad/material' }],
    },
    {
        id: 'eventos', label: 'Eventos / Bodas / Catering', emoji: '🎉',
        concepts: ['Ambiente del evento montado', 'Gente celebrando', 'Mesa/decoración', 'Momento emotivo', 'Catering presentado'],
        extraFields: [{ key: 'eventType', label: 'tipo de evento' }, { key: 'service', label: 'servicio (salón/catering/deco)' }, { key: 'style', label: 'estilo' }],
    },
    {
        id: 'finanzas', label: 'Finanzas / Seguros / Inversiones / Créditos', emoji: '💰',
        concepts: ['Tranquilidad/seguridad familiar', 'Persona logrando su meta (casa/auto)', 'Protección/respaldo', 'Momento de alivio', 'Futuro asegurado'],
        extraFields: [{ key: 'productKind', label: 'tipo (crédito/seguro/inversión)' }, { key: 'terms', label: 'monto/tasa/plazo' }, { key: 'requirements', label: 'requisitos' }, { key: 'benefitFocus', label: 'beneficio' }],
    },
    {
        id: 'bienestar', label: 'Bienestar / Coaching / Psicología', emoji: '🧘',
        concepts: ['Persona en paz/transformada', 'Momento de claridad', 'Sesión/acompañamiento', 'Lifestyle equilibrado', 'Naturaleza/calma'],
        extraFields: [{ key: 'service', label: 'servicio' }, { key: 'focus', label: 'enfoque' }, { key: 'modality', label: 'modalidad' }],
    },
    {
        id: 'ferreteria', label: 'Ferretería / Industria / Herramientas', emoji: '🛠️',
        concepts: ['Herramienta en uso/acción', 'Detalle de potencia/calidad', 'Profesional trabajando', 'Resultado del trabajo', 'Variedad/stock'],
        extraFields: [{ key: 'productKind', label: 'tipo de producto' }, { key: 'useCase', label: 'uso/aplicación' }, { key: 'quality', label: 'calidad/resistencia' }],
    },
    {
        id: 'agro', label: 'Agro / Agropecuario / Insumos', emoji: '🌱',
        concepts: ['Campo/cultivo próspero', 'Producto aplicado y su resultado', 'Maquinaria en acción', 'Productor satisfecho', 'Antes/después de la cosecha'],
        extraFields: [{ key: 'productKind', label: 'tipo (insumo/maquinaria/animal)' }, { key: 'cropOrUse', label: 'cultivo/uso' }, { key: 'benefitFocus', label: 'beneficio' }],
    },
    {
        id: 'bebidas', label: 'Bebidas / Café / Bar / Licores', emoji: '☕',
        concepts: ['Bebida servida con estilo', 'Momento de disfrute', 'Ambiente del local', 'Detalle/frescura (gotas/hielo)', 'Ritual de preparación', 'Brindis/social'],
        extraFields: [{ key: 'drinkType', label: 'tipo de bebida' }, { key: 'ambience', label: 'ambiente' }, { key: 'occasion', label: 'ocasión' }],
    },
    {
        id: 'servicios_hogar', label: 'Servicios para el hogar (limpieza/plomería/etc.)', emoji: '🧹',
        concepts: ['Antes/después del trabajo', 'Profesional en acción', 'Resultado impecable', 'Hogar feliz/limpio', 'Problema resuelto rápido'],
        extraFields: [{ key: 'service', label: 'servicio' }, { key: 'result', label: 'resultado' }, { key: 'coverage', label: 'zona de cobertura' }],
    },
    {
        id: 'artesanias', label: 'Artesanías / Hecho a mano', emoji: '🎨',
        concepts: ['Detalle del producto artesanal', 'Proceso de creación (manos)', 'Producto en su uso/contexto', 'Historia/autenticidad', 'Variedad de la colección'],
        extraFields: [{ key: 'productKind', label: 'tipo de producto' }, { key: 'material', label: 'material/técnica' }, { key: 'story', label: 'historia/autenticidad' }],
    },
    {
        id: 'otro', label: 'Otro / General', emoji: '⚙️',
        concepts: ['Hero del producto/servicio', 'Lifestyle aspiracional', 'Enfoque en el beneficio principal', 'Persona feliz con el resultado', 'Escena de marca premium'],
        extraFields: [{ key: 'offer', label: 'qué ofrece' }, { key: 'benefitFocus', label: 'beneficio principal' }],
    },
]

export function getCategory(id?: string | null): AdCategory {
    return AD_CATEGORIES.find(c => c.id === id) || AD_CATEGORIES[AD_CATEGORIES.length - 1]
}

/**
 * Envoltorio UNIVERSAL del prompt de imagen (sirve para las 31 categorías). La escena
 * sale de un adConcept del brief (ya adaptado al rubro + negocio), así que no hace falta
 * IA ni plantillas por categoría. Corto, enfocado en el beneficio, producto por la foto.
 */
export function buildUniversalImagePrompt(vars: {
    producto?: string
    escena?: string        // un adConcept del brief (la escena / arquetipo)
    beneficio?: string
    enfoque?: string       // el ángulo de la ESTRATEGIA elegida
    estilo?: string
    awareness?: string     // ángulo P.D.A. (problema / solución / producto) → diversidad Andromeda
}): string {
    const producto = vars.producto?.trim() || 'el producto'
    const escena = vars.escena?.trim() || 'el producto protagonista en una escena atractiva y aspiracional'
    const beneficio = vars.beneficio?.trim()
    const enfoque = vars.enfoque?.trim()
    const estilo = vars.estilo?.trim()
    const awareness = vars.awareness?.trim()
    return [
        `Foto publicitaria profesional para un anuncio de Meta Ads de ${producto}, atractiva y llamativa.`,
        `Escena: ${escena}.`,
        awareness ? `Ángulo: ${awareness}.` : '',
        'Producto protagonista, según la foto subida.',
        beneficio ? `Resaltá el beneficio: ${beneficio}.` : '',
        enfoque ? `Enfoque de la campaña: ${enfoque}.` : '',
        estilo ? `Estilo: ${estilo}.` : '',
        'Incluí un titular publicitario CORTO, atractivo y llamativo que resalte el beneficio, con tipografía clara y bien integrada en el diseño.',
        'Diseño profesional de alta conversión, fotorrealista, sin marcas de agua.',
    ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
}

/**
 * MOTOR DE DIVERSIDAD CREATIVA (Andromeda): arma N prompts GENUINAMENTE distintos
 * rotando una matriz P.D.A. + arquetipo, para que cada anuncio sea un "Entity ID"
 * distinto (Meta agrupa los parecidos y compiten como uno solo).
 *  - Escena / arquetipo: rota los adConcepts del brief.
 *  - Beneficio (Desire): rota los beneficios (desfasado para no correlacionar).
 *  - Awareness: problema → solución → producto.
 */
export const CREATIVE_AWARENESS = [
    'mostrá el PROBLEMA/dolor del cliente antes de la solución, de forma realista y empática',
    'mostrá el RESULTADO y la transformación (el después), aspiracional y positivo',
    'mostrá el PRODUCTO como protagonista con su beneficio, estilo hero premium',
    'estilo LIFESTYLE: una persona real usando/disfrutando el producto en su día a día',
] as const

export function buildCreativeMatrix(params: {
    producto?: string
    concepts: string[]     // adConcepts del brief (escenas)
    benefits: string[]     // beneficios del brief
    enfoque?: string
    estilo?: string
    count: number
}): string[] {
    const { producto, enfoque, estilo } = params
    const concepts = params.concepts.length ? params.concepts : ['el producto protagonista en una escena atractiva']
    const benefits = params.benefits.length ? params.benefits : ['']
    const n = Math.max(1, Math.min(30, Math.floor(params.count) || 1)) // || 1 evita NaN → array vacío
    return Array.from({ length: n }, (_, i) => buildUniversalImagePrompt({
        producto,
        escena: concepts[i % concepts.length],
        beneficio: benefits[(i + Math.floor(i / concepts.length)) % benefits.length], // desfasa para diversificar
        awareness: CREATIVE_AWARENESS[i % CREATIVE_AWARENESS.length],
        enfoque,
        estilo,
    }))
}

/**
 * Si la categoría tiene una plantilla de prompt, la rellena con los datos del brief +
 * estrategia y devuelve el prompt CORTO listo para gpt-image-2 (sin IA). Devuelve null
 * si la categoría no tiene plantilla (entonces el caller usa el generador con gpt-5.1).
 */
export function fillImagePromptTemplate(
    categoryId: string | null | undefined,
    vars: { producto?: string; beneficios?: string; enfoque?: string; estilo?: string; concepto?: string },
): string | null {
    const cat = getCategory(categoryId)
    if (!cat.promptTemplate) return null
    return cat.promptTemplate
        .replaceAll('{producto}', vars.producto?.trim() || 'el producto')
        .replaceAll('{concepto}', vars.concepto?.trim() || cat.concepts[0] || 'producto protagonista en una escena atractiva')
        .replaceAll('{beneficios}', vars.beneficios?.trim() || 'sus beneficios principales')
        .replaceAll('{enfoque}', vars.enfoque?.trim() || 'vender el producto')
        .replaceAll('{estilo}', vars.estilo?.trim() || 'limpio y profesional')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Arma el PROMPT que el usuario copia y pega en SU ChatGPT. ChatGPT lo entrevista
 * (preguntas comunes + las propias de su categoría) y al final devuelve una
 * descripción completa que el usuario pega en nuestro cuadro para generar el brief.
 */
export function buildBriefInterviewPrompt(): string {
    const common = [
        '¿Cómo se llama tu negocio?',
        '¿Qué vendés exactamente?',
        '¿Quién es tu cliente ideal? (edad, género, zona)',
        '¿Qué problema le resolvés?',
        '¿Qué beneficio o resultado obtiene el cliente?',
        '¿Cuál es tu diferencial (por qué te eligen)?',
        '¿Tu producto/servicio es premium, medio o económico?',
        '¿Qué tono de marca querés transmitir? (ej: cercano, profesional, divertido)',
        '¿Cuál es tu objetivo? (vender, conseguir mensajes, leads)',
        '¿En qué país vendés? ¿Y en qué ciudades o departamentos? (ej: Bolivia — Cochabamba, Santa Cruz, Tarija)',
        '¿Colores o estilo de tu marca? (si tenés)',
    ]
    const numbered = common.map((q, i) => `${i + 1}. ${q}`).join('\n')

    return `Sos un experto en marketing y publicidad. Vas a ayudarme a armar la descripción de mi negocio para generar anuncios profesionales.

Primero, IDENTIFICÁ el rubro de mi negocio según lo que te cuente. Después hacéme estas preguntas UNA POR UNA (esperá mi respuesta antes de pasar a la siguiente), de forma simple y clara:

${numbered}

Y AGREGÁ las preguntas propias de mi rubro (por ejemplo: inmobiliaria → ubicación, m², financiación; comida → platos estrella, ambiente, delivery; cursos → temario, duración, resultado; etc.).

Cuando termine de responder TODO, armá un ÚNICO texto claro y completo (en español, en párrafos naturales, SIN listas ni encabezados) que describa mi negocio con todos esos datos. Tiene que ser completo y específico porque lo voy a pegar en una herramienta que genera anuncios.`
}
