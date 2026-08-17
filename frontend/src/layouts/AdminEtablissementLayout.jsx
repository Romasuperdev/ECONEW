import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'
import Icon from '../components/Icon'
import ThemeSwitcher from '../components/ThemeSwitcher'

// Association module → entrée de navigation.
const NAV_BY_MODULE = {
  gestion_utilisateurs: { to: '/admin-etablissement/utilisateurs', label: 'Utilisateurs', icon: 'students' },
  parametres_etablissement: { to: '/admin-etablissement/parametres', label: 'Paramètres', icon: 'settings' },
  rapports_transversaux: { to: '/admin-etablissement/rapports', label: 'Rapports', icon: 'reports' },
  abonnement_facturation: { to: '/admin-etablissement/abonnement', label: 'Abonnement', icon: 'package' },
}

const ALL_MODULES = ['gestion_utilisateurs', 'parametres_etablissement', 'rapports_transversaux', 'abonnement_facturation']

export default function AdminEtablissementLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }
  useEffect(() => { setOpen(false) }, [location.pathname])

  const allowed = user?.is_super ? ALL_MODULES : (user?.modules_autorises || [])
  const nav = ALL_MODULES.filter((m) => allowed.includes(m)).map((m) => NAV_BY_MODULE[m])

  return (
    <div className="min-h-screen flex">
      {open && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}

      <aside className={`w-64 flex flex-col fixed h-full z-40 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--sidebar-2)', color: 'var(--sidebar-text)' }}>
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <LogoMark size={38} />
          <div className="leading-tight">
            <div className="text-base font-extrabold text-white tracking-tight">NEXORA <span className="font-semibold opacity-90">ECONOMAT</span></div>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>ADMIN ÉTABLISSEMENT</div>
          </div>
          <button onClick={() => setOpen(false)} className="ml-auto lg:hidden text-white/80 text-2xl leading-none" aria-label="Fermer le menu">&times;</button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? 'font-semibold' : 'hover:bg-white/5'}`}
              style={({ isActive }) => isActive ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--sidebar-text)' }}>
              <Icon name={item.icon} size={19} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <ThemeSwitcher compact />
        </div>
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="text-xs" style={{ color: 'var(--accent)' }}>Admin d'établissement</div>
          <button onClick={handleLogout} className="mt-3 flex items-center gap-2 text-xs opacity-80 hover:opacity-100">
            <Icon name="logout" size={15} /> Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3 lg:hidden"
          style={{ background: 'color-mix(in srgb, var(--bg) 85%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setOpen(true)} className="p-2 rounded-lg" style={{ border: '1px solid var(--border)' }} aria-label="Ouvrir le menu">
            <Icon name="menu" size={20} />
          </button>
          <div className="font-extrabold text-heading truncate">NEXORA <span className="font-semibold opacity-80">ECONOMAT</span></div>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
