import { useState } from 'react'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'

export default function SocieteSelector() {
  const { user } = useAuth()
  const canManage = user?.is_super || ['admin', 'directeur', 'super_admin'].includes(user?.role)
  const societes = user?.societes || []
  const [current] = useState(localStorage.getItem('societe') || societes[0]?.code || '')

  if (societes.length === 0) return null
  const label = societes.find((s) => s.code === current)?.name || societes[0]?.name || '—'
  const canSwitch = canManage && societes.length > 1

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Icon name="globe" size={16} className="text-muted" />
      <span className="text-xs text-muted hidden md:inline">Société</span>
      {canSwitch ? (
        <select value={current} onChange={(e) => { localStorage.setItem('societe', e.target.value); window.location.reload() }}
          className="bg-transparent text-sm font-semibold outline-none" style={{ color: 'var(--heading)' }}>
          {societes.map((s) => <option key={s.id} value={s.code}>{s.name || s.code}</option>)}
        </select>
      ) : (
        <span className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{label}</span>
      )}
    </div>
  )
}
