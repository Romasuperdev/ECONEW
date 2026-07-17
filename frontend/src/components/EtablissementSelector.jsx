import { useEffect, useState } from 'react'
import Icon from './Icon'
import api from '../api/client'

export default function EtablissementSelector() {
  const [items, setItems] = useState([])
  const [current, setCurrent] = useState(localStorage.getItem('etablissement') || '')

  useEffect(() => {
    api.get('/etablissements').then(({ data }) => {
      setItems(data || [])
      if ((!current || !data.find((e) => String(e.code) === String(current))) && data[0]) {
        localStorage.setItem('etablissement', data[0].code)
        setCurrent(String(data[0].code))
      }
    }).catch(() => setItems([]))
  }, [])

  if (items.length === 0) return null
  const change = (code) => { localStorage.setItem('etablissement', code); window.location.reload() }
  const label = items.find((e) => String(e.code) === String(current))?.name || items[0]?.name || '—'

  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <Icon name="building" size={16} className="text-muted" />
      <span className="text-xs text-muted hidden md:inline">Établissement</span>
      {items.length > 1 ? (
        <select value={current} onChange={(e) => change(e.target.value)}
          className="bg-transparent text-sm font-semibold outline-none" style={{ color: 'var(--heading)' }}>
          {items.map((e) => <option key={e.id} value={e.code}>{e.name || e.code}</option>)}
        </select>
      ) : (
        <span className="text-sm font-semibold" style={{ color: 'var(--heading)' }}>{label}</span>
      )}
    </div>
  )
}
