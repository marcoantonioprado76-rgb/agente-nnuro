import { redirect } from 'next/navigation'

/**
 * La galería clásica se fusionó con la galería principal (que ahora muestra
 * TODAS las páginas: clásicas + constructor visual). /clasico queda como
 * redirect para no romper enlaces viejos.
 */
export default function ClasicoRedirect() {
  redirect('/dashboard/services/landing-pages')
}
