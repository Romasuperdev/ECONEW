import { useEffect, useState } from 'react'
import api from '../api/client'
import Icon from './Icon'
import { useAuth } from '../context/AuthContext'

export default function YearSelector() {
  const { user } = useAuth()
  const canManage = ['admin', 'directeur', 'super_admin'].includes(user?.role)
  const [years, setYears] = useState([])
  const [current, setCurrent] = useState(localStorage.getItem('annee') || '')

  useEffect(() => {
    api.get('/academic-years')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.data || [])
        setYears(list)
        if (!localStorage.getItem('annee') && list.length) {
          const active = list.find((y) => y.is_current) || list[0]
          if (active) { localStorage.setItem('annee', active.code); setCurrent(active.code) }
        }
      })
      .catch(() => setYears([]))
  }, [])

  const label = years.find((y) => y.code === current)?.label
    || years.find((y) => y.is_current)?.label
    || (years[0]?.label)

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Icon name="calendar" size={16} className="text-muted" />
      <span className="text-xs text-muted hidden md:inline">Exercice</span>
      {years.length === 0 ? (
        <span className="text-sm font-semibold text-muted">Aucun</span>
      ) : canManage ? (
        <select value={current} onChange={(e) => { localStorage.setItem('annee', e.target.value); window.location.reload() }}
          className="bg-transparent text-sm font-semibold outline-none" style={{ color: 'var(--heading)' }}>
          {years.map((y) => <option key={y.id} value={y.code}>{y.label}{y.is_current ? ' (active)' : ''}</option>)}
        </select>
      ) : (
        <span className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{label || '—'}</span>
      )}
    </div>
  )
}
