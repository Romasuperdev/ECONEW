import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

const LABELS = {
  super_admin: 'Super Admin (tous droits)',
  directeur: 'Directeur', comptable: 'Comptable', caissier: 'Caissier',
  econome: 'Économe', secretaire: 'Secrétaire', auditeur: 'Auditeur',
}

export default function RoleSwitcher() {
  const { user } = useAuth()
  if (!user?.is_super) return null
  const options = ['super_admin', ...(user.assignable_roles || [])]
  const current = localStorage.getItem('role') || 'super_admin'

  const change = (v) => {
    if (v === 'super_admin') localStorage.removeItem('role')
    else localStorage.setItem('role', v)
    window.location.reload()
  }

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Icon name="students" size={16} className="text-muted" />
      <span className="text-xs text-muted hidden md:inline">Rôle</span>
      <select value={current} onChange={(e) => change(e.target.value)}
        className="bg-transparent text-sm font-semibold outline-none" style={{ color: 'var(--heading)' }}>
        {options.map((r) => <option key={r} value={r}>{LABELS[r] || r}</option>)}
      </select>
    </div>
  )
}
