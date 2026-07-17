// Décor animé de la page de connexion : école + finances (SVG + animations CSS).
export default function LoginBackground() {
  return (
    <div className="login-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lbSky" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--sidebar)" />
            <stop offset="1" stopColor="color-mix(in srgb, var(--sidebar) 65%, #0b1f3a)" />
          </linearGradient>
          <linearGradient id="lbGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" />
            <stop offset="1" stopColor="#b8860b" />
          </linearGradient>
        </defs>

        <rect width="1440" height="900" fill="url(#lbSky)" />

        {/* halos flottants */}
        <circle className="lb-float" cx="230" cy="220" r="180" fill="var(--accent)" opacity="0.10" />
        <circle className="lb-float2" cx="1230" cy="640" r="220" fill="var(--teal)" opacity="0.10" />
        <circle className="lb-float" cx="1180" cy="180" r="120" fill="#fff" opacity="0.05" />

        {/* graphique en barres qui monte */}
        <g transform="translate(120 560)" opacity="0.9">
          <rect className="lb-bar b1" x="0"   y="0" width="46" height="120" rx="8" fill="url(#lbGold)" />
          <rect className="lb-bar b2" x="66"  y="0" width="46" height="120" rx="8" fill="var(--teal)" />
          <rect className="lb-bar b3" x="132" y="0" width="46" height="120" rx="8" fill="url(#lbGold)" />
          <rect className="lb-bar b4" x="198" y="0" width="46" height="120" rx="8" fill="var(--teal)" />
        </g>

        {/* bâtiment école */}
        <g className="lb-float2" transform="translate(1060 470)" opacity="0.85">
          <polygon points="90,0 180,55 0,55" fill="url(#lbGold)" />
          <rect x="10" y="55" width="160" height="150" rx="8" fill="#fff" opacity="0.9" />
          <rect x="34" y="85" width="34" height="34" rx="4" fill="var(--sidebar)" opacity="0.5" />
          <rect x="112" y="85" width="34" height="34" rx="4" fill="var(--sidebar)" opacity="0.5" />
          <rect x="72" y="140" width="36" height="65" rx="4" fill="var(--sidebar)" opacity="0.6" />
        </g>

        {/* pièces de monnaie (F) */}
        <g className="lb-coin c1"><circle cx="560" cy="230" r="34" fill="url(#lbGold)"/><text x="560" y="242" textAnchor="middle" fontSize="30" fontWeight="700" fill="#5b3d00">F</text></g>
        <g className="lb-coin c2"><circle cx="840" cy="330" r="26" fill="url(#lbGold)"/><text x="840" y="340" textAnchor="middle" fontSize="24" fontWeight="700" fill="#5b3d00">F</text></g>
        <g className="lb-coin c3"><circle cx="690" cy="640" r="30" fill="url(#lbGold)"/><text x="690" y="651" textAnchor="middle" fontSize="26" fontWeight="700" fill="#5b3d00">F</text></g>

        {/* chapeau de diplômé */}
        <g className="lb-float" transform="translate(430 380)" opacity="0.9">
          <polygon points="70,0 140,32 70,64 0,32" fill="#fff" opacity="0.92" />
          <path d="M30 44 v34 q40 26 80 0 v-34" fill="none" stroke="#fff" strokeWidth="6" opacity="0.8" />
          <line x1="140" y1="32" x2="140" y2="86" stroke="var(--accent)" strokeWidth="5" />
          <circle cx="140" cy="90" r="7" fill="var(--accent)" />
        </g>
      </svg>
    </div>
  )
}
