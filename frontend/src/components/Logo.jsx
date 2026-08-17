// Icône de marque Nexora (le « N » bleu avec le point vert).
export function LogoMark({ size = 40 }) {
  return (
    <img
      src="/brand/nexora-icon.png"
      width={size}
      height={size}
      alt="Nexora"
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  )
}

/**
 * Logo complet Nexora (icône + « NEXORA » + baseline).
 * variant: 'color' (fond clair), 'white' (fond sombre), 'dark' (monochrome foncé),
 * 'stacked' (version verticale). `height` fixe la hauteur en px, largeur auto.
 */
const LOGO_SRC = {
  color: '/brand/nexora-logo-horizontal.png',
  white: '/brand/nexora-logo-white-full.png',
  dark: '/brand/nexora-logo-dark-full.png',
  stacked: '/brand/nexora-logo-principal.png',
}
export function LogoFull({ variant = 'color', height = 48, className = '' }) {
  return (
    <img
      src={LOGO_SRC[variant] || LOGO_SRC.color}
      alt="NEXORA — Une plateforme. Tous vos métiers."
      className={className}
      style={{ height, width: 'auto', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
    />
  )
}

export default function Logo({ size = 40, showText = true, dark = false }) {
  const titleColor = dark ? 'text-white' : 'text-brand-800'
  const subColor = dark ? 'text-brand-100' : 'text-ink'
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      {showText && (
        <div className="leading-tight">
          <div className={`font-extrabold tracking-tight ${titleColor}`} style={{ fontSize: size * 0.5 }}>
            NEXORA <span style={{ fontWeight: 600 }}>ECONOMAT</span>
          </div>
          <div className={`${subColor}`} style={{ fontSize: size * 0.22 }}>
            Gestion financière scolaire
          </div>
        </div>
      )}
    </div>
  )
}
