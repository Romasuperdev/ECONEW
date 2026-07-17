import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogoMark } from '../components/Logo'
import Icon from '../components/Icon'
import ThemeSwitcher from '../components/ThemeSwitcher'
import YearSelector from '../components/YearSelector'
import SocieteSelector from '../components/SocieteSelector'
import EtablissementSelector from '../components/EtablissementSelector'
import RoleSwitcher from '../components/RoleSwitcher'

const nav = [
  { to: '/', label: 'Tableau de bord', icon: 'dashboard', end: true },
  {
    group: 'Configuration', icon: 'structure',
    children: [
      { to: '/configuration/annees', label: 'Années scolaires', ability: 'config.manage' },
      { to: '/configuration/niveaux', label: 'Niveaux', ability: 'config.manage' },
      { to: '/configuration/classes', label: 'Classes', ability: 'config.manage' },
      { to: '/configuration/caisses', label: 'Caisses', ability: 'treasury.view' },
      { to: '/configuration/utilisateurs', label: 'Affectation Caisse - Utilisateurs', ability: 'users.manage' },
      { to: '/configuration/sms', label: 'SMS', ability: 'config.manage' },
      { to: '/configuration/mail', label: 'Mail', ability: 'config.manage' },
    ],
  },
  {
    group: 'Fichier de base', icon: 'package',
    children: [
      { to: '/fichier-base/bus', label: 'Cars de transport', ability: 'services.manage' },
      { to: '/fichier-base/chauffeurs', label: 'Chauffeurs', ability: 'services.manage' },
      { to: '/fichier-base/destinations', label: 'Destinations', ability: 'services.manage' },
      {
        group: 'Grilles',
        children: [
          { to: '/fichier-base/grille-scolarite', label: 'Grille scolarité', ability: 'config.manage' },
          { to: '/fichier-base/grille-transport', label: 'Grille transport', ability: 'services.manage' },
          { to: '/fichier-base/grille-cantine', label: 'Grille cantine', ability: 'services.manage' },
          { to: '/fichier-base/grille-pension', label: 'Grille pension', ability: 'services.manage' },
        ],
      },
    ],
  },
  {
    group: 'Traitement', icon: 'invoices',
    children: [
      { to: '/traitement/inscription', label: 'Inscription', ability: 'students.manage' },
      { to: '/traitement/remise', label: 'Remise', ability: 'students.manage' },
      {
        group: 'Transport',
        children: [
          { to: '/traitement/transport', label: 'Affectation transport', ability: 'services.manage' },
          { to: '/traitement/chauffeur-car', label: 'Chauffeur / Car', ability: 'services.manage' },
          { to: '/traitement/reinscription-transport', label: 'Réinscription transport', ability: 'services.manage' },
          { to: '/traitement/changement-destination', label: 'Changement de destination', ability: 'services.manage' },
          { to: '/traitement/historique-transport', label: 'Historique paiements', ability: 'services.manage' },
          { to: '/traitement/eleves-destination', label: 'Élèves par destination', ability: 'services.manage' },
          { to: '/traitement/eleves-car', label: 'Élèves par car', ability: 'services.manage' },
        ],
      },
      {
        group: 'Cantine',
        children: [
          { to: '/traitement/inscription-cantine', label: 'Inscription cantine', ability: 'services.manage' },
          { to: '/traitement/reinscription-cantine', label: 'Réinscription cantine', ability: 'services.manage' },
        ],
      },
      {
        group: 'Pension',
        children: [
          { to: '/traitement/inscription-pension', label: 'Inscription pension', ability: 'services.manage' },
          { to: '/traitement/reinscription-pension', label: 'Réinscription pension', ability: 'services.manage' },
        ],
      },
      {
        group: 'Paiement',
        children: [
          { to: '/traitement/ouverture-caisse', label: 'Ouverture de caisse', ability: 'versements.create' },
          { to: '/traitement/nouveau-paiement', label: 'Nouveau paiement', ability: 'versements.create' },
          { to: '/traitement/fermeture-caisse', label: 'Fermeture de caisse', ability: 'versements.create' },
          { to: '/traitement/point-caisse', label: 'Point de caisse', ability: 'versements.create' },
          { to: '/traitement/etat-paiements', label: 'État des paiements', ability: 'reports.view' },
          { to: '/traitement/etat-paiements-periodiques', label: 'État périodiques détaillés', ability: 'reports.view' },
          { to: '/traitement/etat-paiements-cumules', label: 'État des paiements cumulés', ability: 'reports.view' },
        ],
      },
    ],
  },
  { to: '/factures', label: 'Paiements', icon: 'invoices', ability: 'invoices.manage' },
  { to: '/paiements', label: 'Versements', icon: 'payments', ability: 'versements.create' },
  { to: '/depenses', label: 'Dépenses', icon: 'expenses', ability: 'expenses.manage' },
  { to: '/fournisseurs', label: 'Fournisseurs', icon: 'suppliers', ability: 'expenses.manage' },
  { to: '/tresorerie', label: 'Trésorerie', icon: 'treasury', ability: 'treasury.view' },
  { to: '/salaires', label: 'Salaires', icon: 'salaries', ability: 'users.manage' },
  { to: '/rapports', label: 'Rapports', icon: 'reports', ability: 'reports.view' },
  { to: '/activite', label: 'Mon activité', icon: 'audit' },
  { to: '/parametres', label: 'Paramètres', icon: 'settings' },
]

// Un élément (feuille ou sous-groupe) est-il visible selon les permissions ?
function itemVisible(item, can) {
  if (item.group) return item.children.some((c) => itemVisible(c, can))
  return !item.ability || can(item.ability)
}

function NavItem({ item }) {
  return (
    <NavLink to={item.to} end={item.end}
      className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive ? 'font-semibold' : 'hover:bg-white/5'}`}
      style={({ isActive }) => isActive ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--sidebar-text)' }}>
      {item.icon && <Icon name={item.icon} size={19} />} {item.label}
    </NavLink>
  )
}

function NavGroup({ item, can, depth = 0 }) {
  const location = useLocation()
  const children = item.children.filter((c) => itemVisible(c, can))
  const leafTos = []
  const collect = (arr) => arr.forEach((c) => c.group ? collect(c.children) : leafTos.push(c.to))
  collect(children)
  const activeInside = leafTos.some((t) => location.pathname.startsWith(t))
  const [open, setOpen] = useState(activeInside)
  if (children.length === 0) return null

  return (
    <div>
      <button onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${activeInside ? 'font-semibold' : 'hover:bg-white/5'}`}
        style={{ color: 'var(--sidebar-text)' }}>
        {item.icon ? <Icon name={item.icon} size={19} /> : <span style={{ width: 6 }} />}
        <span className="flex-1 text-left">{item.group}</span>
        <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▸</span>
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-3" style={{ borderColor: 'rgba(255,255,255,.12)' }}>
          {children.map((c, i) => (
            c.group
              ? <NavGroup key={`sg-${i}`} item={c} can={can} depth={depth + 1} />
              : (
                <NavLink key={c.to} to={c.to}
                  className={({ isActive }) => `block px-3 py-2 rounded-lg text-[13px] transition ${isActive ? 'font-semibold' : 'hover:bg-white/5'}`}
                  style={({ isActive }) => isActive ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--sidebar-text)' }}>
                  {c.label}
                </NavLink>
              )
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardLayout() {
  const { user, logout, can } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }) }
  const societe = user?.societes?.[0]?.name
  const roleLabel = { super_admin: 'Super Admin', directeur: 'Directeur', comptable: 'Comptable', caissier: 'Caissier', econome: 'Économe', secretaire: 'Secrétaire', auditeur: 'Auditeur' }

  const visible = (i) => {
    if (i.group) return itemVisible(i, can)
    if (i.anyAbility) return i.anyAbility.some((a) => can(a))
    if (i.ability) return can(i.ability)
    return true
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 flex flex-col fixed h-full" style={{ background: 'var(--sidebar)', color: 'var(--sidebar-text)' }}>
        <div className="px-5 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <LogoMark size={38} />
          <div className="leading-tight">
            <div className="text-lg font-extrabold text-white">Economat</div>
            <div className="text-[10px] opacity-70 truncate max-w-[150px]">{societe || 'Établissement'}</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {nav.filter(visible).map((item, idx) => (
            item.group ? <NavGroup key={`g-${idx}`} item={item} can={can} /> : <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="px-4 py-4" style={{ borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="text-xs capitalize" style={{ color: 'var(--accent)' }}>{roleLabel[user?.role] || user?.role}</div>
          <button onClick={handleLogout} className="mt-3 flex items-center gap-2 text-xs opacity-80 hover:opacity-100">
            <Icon name="logout" size={15} /> Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 ml-64">
        <div className="sticky top-0 z-20 flex items-center justify-end gap-3 px-8 py-3 flex-wrap"
          style={{ background: 'color-mix(in srgb, var(--bg) 80%, transparent)', backdropFilter: 'blur(8px)', borderBottom: '1px solid var(--border)' }}>
          <RoleSwitcher />
          <YearSelector />
          <SocieteSelector />
          <EtablissementSelector />
          <ThemeSwitcher compact />
        </div>
        <div className="p-8 pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
