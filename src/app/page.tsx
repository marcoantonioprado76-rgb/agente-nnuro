/**
 * Home pública — sirve la landing estática autocontenida (HTML + assets)
 * desde `public/landing-nuro/` vía iframe a pantalla completa.
 *
 * Por qué iframe y no convertir el HTML a JSX:
 *   - La landing es un único archivo de 41 KB con CSS y JS inline pensado
 *     para abrirse como standalone — convertirla a React es trabajo y
 *     no aporta nada visible al usuario final.
 *   - Iframe garantiza que se comporte EXACTAMENTE igual que cuando se abre
 *     con doble-click en local.
 *   - Los botones de login/register dentro del HTML usan `target="_top"`
 *     para navegar fuera del iframe y entrar al sistema Next.
 *
 * Cuando se decida convertirla a componente React, se reemplaza este
 * archivo por el JSX y se borra `public/landing-nuro/`.
 */
export default function Home() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#050816',
        overflow: 'hidden',
      }}
    >
      <iframe
        src="/landing-nuro/index.html"
        title="NÜRO — Landing"
        style={{
          width: '100%',
          height: '100%',
          border: 0,
          display: 'block',
        }}
        // Permitimos que el HTML interno haga scroll + abra ventanas
        // (Stripe / WhatsApp Business / videos embebidos) si lo requiere
        // más adelante. Sin allow-same-origin, target=_top no funciona;
        // necesario para que los CTAs vayan a /login y /register.
        sandbox="allow-scripts allow-same-origin allow-top-navigation allow-popups allow-popups-to-escape-sandbox allow-forms"
      />
    </div>
  )
}
