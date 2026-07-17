import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'

export default function AffectationClasses() {
  const [classes, setClasses] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => Promise.all([
    api.get('/school-classes').then(({ data }) => setClasses(data)),
    api.get('/levels').then(({ data }) => setLevels(data)).catch(() => setLevels([])),
  ]).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const assign = async (c, levelId) => {
    setSaving(c.id); setMsg('')
    try {
      await api.put(`/school-classes/${c.id}`, { name: c.name, section: c.section || '', level_id: levelId || null })
      setClasses((list) => list.map((x) => x.id === c.id ? { ...x, level_id: levelId, level: levels.find((l) => String(l.id) === String(levelId)) || null } : x))
      setMsg('Affectation enregistrée.')
    } catch (e) { setMsg(e.response?.data?.message || 'Erreur.') }
    finally { setSaving('') }
  }

  return (
    <>
      <PageHeader title="Affectation Niveau ↔ Classe" subtitle="Rattacher chaque classe à un niveau" />
      {msg && <div className="mb-3 text-sm" style={{ color: 'var(--teal)' }}>{msg}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : classes.length === 0 ? <EmptyState message="Aucune classe." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Classe</th><th>Niveau actuel</th><th>Affecter à…</th></tr></thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{c.name}{c.section ? ` ${c.section}` : ''}</td>
                  <td>{c.level?.name || '—'}</td>
                  <td>
                    <select className="rounded-lg border px-2 py-1.5 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                      value={c.level_id || ''} disabled={saving === c.id}
                      onChange={(e) => assign(c, e.target.value)}>
                      <option value="">— Aucun —</option>
                      {levels.map((l) => <option key={l.id} value={l.id}>{l.name}{l.cycle ? ` (${l.cycle.name})` : ''}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
