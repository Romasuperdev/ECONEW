export function LogoMark({ size = 40, rounded = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Economat">
      <rect width="1024" height="1024" rx={rounded * (1024 / 40)} fill="#1B2A4A" />
      {/* Pièce dorée */}
      <ellipse cx="512" cy="590" rx="235" ry="250" fill="#c28c2c" />
      <ellipse cx="512" cy="575" rx="235" ry="250" fill="#D9A441" />
      {/* Fente / minus */}
      <rect x="372" y="548" width="280" height="54" rx="27" fill="#1B2A4A" />
      {/* Toque de graduation */}
      <polygon points="512,300 792,392 512,484 232,392" fill="#EAF1F8" />
      <polygon points="512,300 792,392 512,484 232,392" fill="#EAF1F8" stroke="#d6e3f0" strokeWidth="4" />
      {/* Tassel */}
      <path d="M792 392 L792 560" stroke="#EAF1F8" strokeWidth="14" fill="none" strokeLinecap="round" />
      <circle cx="792" cy="576" r="22" fill="#EAF1F8" />
    </svg>
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
          <div className={`font-extrabold tracking-tight ${titleColor}`} style={{ fontSize: size * 0.55 }}>
            Economat
          </div>
          <div className={`${subColor}`} style={{ fontSize: size * 0.24 }}>
            Gestion financière scolaire
          </div>
        </div>
      )}
    </div>
  )
}
