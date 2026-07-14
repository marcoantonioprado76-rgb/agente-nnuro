/**
 * Metadata de las plantillas del Constructor Visual (solo id/nombre/emoji/descripción).
 * El HTML completo vive en el editor (builder/[id]/page.tsx). Este archivo lo comparte el
 * índice para mostrar el selector al crear una página. Los ids DEBEN coincidir con los del editor.
 */
export type TemplateMeta = { id: string; name: string; emoji: string; desc: string }

export const TEMPLATE_META: TemplateMeta[] = [
  { id: 'spectrum', name: 'Página Personal', emoji: '🟣', desc: 'Marca personal / creador — video, galería y CTA.' },
  { id: 'spectrum-blue', name: 'Página Personal (Azul)', emoji: '🔵', desc: 'La misma, en azul.' },
  { id: 'spectrum-green', name: 'Página Personal (Verde)', emoji: '🟢', desc: 'La misma, en verde lima.' },
  { id: 'vsl', name: 'Video de Ventas (VSL)', emoji: '🎥', desc: 'Video + oferta. Ideal para un curso o método.' },
  { id: 'ventas', name: 'Ventas / Producto', emoji: '🛒', desc: 'Producto con imagen, beneficios y precio.' },
  { id: 'servicio', name: 'Servicio / Agencia', emoji: '💼', desc: 'Servicios, métricas, proceso y contacto.' },
  { id: 'evento', name: 'Evento / Webinar', emoji: '🎤', desc: 'Registro a un evento en vivo o webinar.' },
  { id: 'restaurante', name: 'Restaurante / Delivery', emoji: '🍽️', desc: 'Menú con fotos y pedidos por WhatsApp.' },
  { id: 'barberia', name: 'Barbería / Salón', emoji: '💈', desc: 'Servicios, precios y reserva de turno.' },
  { id: 'gym', name: 'Gimnasio / Fitness', emoji: '💪', desc: 'Planes, beneficios y clase de prueba gratis.' },
  { id: 'linkbio', name: 'Link-in-bio (enlaces)', emoji: '🔗', desc: 'Tus enlaces y redes en un solo lugar.' },
  { id: 'ofcpro', name: 'Curso Pro (Fotografía)', emoji: '📸', desc: 'Curso/mentoría larga: video, bônus, módulos, testimonios, garantía y FAQ.' },
  { id: 'reality', name: 'Reality / Concurso (Premio)', emoji: '🏆', desc: 'Concurso/reality: video, pasos, mentores, beneficios y medios. Look premium.' },
  { id: 'designer10k', name: 'Masterclass / Webinar Pro', emoji: '🚀', desc: 'Clase en vivo (Zoom): hero galáctico, alumnos, mentores. Morado premium con animaciones.' },
  { id: 'fuzinato', name: 'Apostas / Grupo VIP (Live)', emoji: '🎰', desc: 'Grupo de lives/roleta: hero con ruleta girando, dados flotando, marquee, lives, bio y FAQ. Naranja/dorado.' },
]
