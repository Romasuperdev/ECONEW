export default function LoginArt() {
  return (
    <svg viewBox="0 0 520 520" className="w-full h-full" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustration Economat">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1f3a63"/><stop offset="1" stopColor="#12233f"/>
        </linearGradient>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0c069"/><stop offset="1" stopColor="#d9a441"/>
        </linearGradient>
      </defs>
      <circle cx="260" cy="250" r="240" fill="url(#sky)"/>
      <circle cx="390" cy="120" r="46" fill="#f0c069" opacity=".9"/>
      {/* barres de croissance */}
      <g opacity=".95">
        <rect x="120" y="330" width="36" height="70" rx="6" fill="#2e9c9c"/>
        <rect x="170" y="295" width="36" height="105" rx="6" fill="#3fb6b6"/>
        <rect x="220" y="255" width="36" height="145" rx="6" fill="url(#gold)"/>
      </g>
      <path d="M120 300 L175 265 L235 225 L320 190" fill="none" stroke="#eaf1f8" strokeWidth="5" strokeLinecap="round" opacity=".85"/>
      <circle cx="320" cy="190" r="8" fill="#eaf1f8"/>
      {/* école */}
      <g transform="translate(300,250)">
        <rect x="0" y="60" width="150" height="95" rx="8" fill="#eaf1f8"/>
        <polygon points="75,20 165,72 -15,72" fill="#d9a441"/>
        <rect x="66" y="30" width="18" height="26" fill="#eaf1f8"/>
        <rect x="20" y="95" width="26" height="60" rx="3" fill="#1f3a63"/>
        <rect x="62" y="95" width="26" height="34" rx="3" fill="#2e9c9c"/>
        <rect x="104" y="95" width="26" height="34" rx="3" fill="#2e9c9c"/>
      </g>
      {/* pièce */}
      <g transform="translate(150,150)">
        <circle r="42" fill="url(#gold)" stroke="#c28c2c" strokeWidth="4"/>
        <text x="0" y="14" textAnchor="middle" fontSize="40" fontWeight="700" fill="#1f3a63" fontFamily="Inter, sans-serif">₣</text>
      </g>
    </svg>
  )
}
