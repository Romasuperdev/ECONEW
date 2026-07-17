import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'
import Icon from '../components/Icon'
import ThemeSwitcher from '../components/ThemeSwitcher'

const nav = [
  { to: '/super', label: 'Vue globale', icon: 'globe', end: true },
  { to: '/super/ecoles', label: 'Établissements', icon: 'building' },
  { to: '/super/societes', label: 'Sociétés', icon: 'package' },
  { to: '/super/utilisateurs', label: 'Utilisateurs', icon: 'students' },
  { to: '/super/applications', label: 'Applications', icon: 'plans' },
  { to: '/super/abonnements', label: 'Abonnements', icon: 'package' },
  { to: '/super/formules', label: 'Formules', icon: 'plans' },
  { to: '/super/affectations', label: 'Affectations', icon: 'link' },
  { to: '/super/audit', label: "Journal d'audit", icon: 'audit' },
]

export default function SuperAdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 flex flex-col fixed h-full" style={{ background: 'var(--sidebar-2)', color: 'var(--sidebar-text)' }}>
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <LogoMark size={38} />
          <div className="leading-tight">
            <div className="text-lg font-extrabold text-white">Economat</div>
            <div className="text-[10px] font-semibold" style={{ color: 'var(--accent)' }}>CONSOLE PLATEFORME</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}
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
          <div className="text-xs" style={{ color: 'var(--accent)' }}>Super Administrateur</div>
          <button onClick={handleLogout} className="mt-3 flex items-center gap-2 text-xs opacity-80 hover:opacity-100">
            <Icon name="logout" size={15} /> Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  )
}
