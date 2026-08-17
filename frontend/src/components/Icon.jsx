// Jeu d'icônes SVG (stroke) — aucune dépendance, remplace les emojis.
const P = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>,
  structure: <><rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="15" width="6" height="5" rx="1"/><rect x="15" y="15" width="6" height="5" rx="1"/><path d="M12 8v3M6 15v-2h12v2M12 11v4"/></>,
  students: <><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v4c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-4"/></>,
  invoices: <><path d="M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></>,
  payments: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></>,
  expenses: <><path d="M3 6h18v12H3z"/><path d="M3 10h18M7 15l3-3 2 2 4-4"/></>,
  suppliers: <><path d="M3 9h13v8H3z"/><path d="M16 12h3l2 2v3h-5"/><circle cx="7" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/></>,
  treasury: <><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M16 14h2"/><path d="M6 6 12 3l6 3"/></>,
  salaries: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><circle cx="12" cy="13" r="2.2"/></>,
  reports: <><path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 15H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 9l-.1-.1A2 2 0 1 1 7.3 6l.1.1A1.6 1.6 0 0 0 9 4.6V4a2 2 0 0 1 4 0v.1A1.6 1.6 0 0 0 15 4.6l.1-.1A2 2 0 1 1 18 7.3l-.1.1A1.6 1.6 0 0 0 19.4 9H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></>,
  globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></>,
  package: <><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="M3 7l9 5 9-5M12 12v10"/></>,
  plans: <><rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="12" width="18" height="8" rx="1.5"/></>,
  link: <><path d="M9 15 15 9"/><path d="M11 6.5 13 4.5a4 4 0 0 1 6 6l-2 2"/><path d="M13 17.5 11 19.5a4 4 0 0 1-6-6l2-2"/></>,
  audit: <><path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z"/><path d="m9.5 12 2 2 3.5-4"/></>,
  logout: <><path d="M15 12H4M9 8l-4 4 4 4"/><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 4 4M20 20l-1-1M5 19l-1 1M20 4l-1 1"/></>,
  moon: <><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 6.5 6.5 0 0 0 21 12.5Z"/></>,
  sunny: <><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
  cantine: <><path d="M4 11h16a8 8 0 0 1-16 0Z"/><path d="M12 3v4M9 5h6"/></>,
  pension: <><path d="M3 7v11M3 12h13a4 4 0 0 1 4 4v2"/><path d="M3 18h18"/><circle cx="7.5" cy="10" r="1.5"/></>,
  transport: <><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M3 11h18M7 5v6"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/></>,
  download: <><path d="M12 3v12M8 11l4 4 4-4"/><path d="M4 21h16"/></>,
}

export default function Icon({ name, size = 20, className = '', strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true">
      {P[name] || null}
    </svg>
  )
}
