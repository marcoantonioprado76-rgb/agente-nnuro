import { redirect } from 'next/navigation'

/**
 * Link de invitación de empresa: mydiamondapp.com/registro/<slug>
 * Redirige al registro normal pasando la empresa, para que quien se registre
 * quede automáticamente dentro de esa empresa (Pack Empresarial).
 */
export default function RegistroEmpresa({ params }: { params: { slug: string } }) {
  redirect(`/register?empresa=${encodeURIComponent(params.slug)}`)
}
