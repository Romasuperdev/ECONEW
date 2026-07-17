import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'

// Réinscription groupée d'élèves à un service (cantine / pension).
export default function ReinscriptionServicePage({ base = '/cantine', label = 'Cantine' }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/students', { params: { per_page: 1000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => `${s.matricule} ${s.full_name || ''} ${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q))
  }, [students, search])

  const toggle = (mat) => setSelected((s) => ({ ...s, [mat]: !s[mat] }))
  const count = Object.values(selected).filter(Boolean).length

  const reinscrire = async () => {
    setDone(''); setError('')
    const mats = Object.keys(selected).filter((m) => selected[m])
    if (mats.length === 0) { setError('Sélectionnez au moins un élève.'); return }
    setSaving(true); let ok = 0
    for (const mat of mats) {
      try { await api.post(base, { matricule: mat }); ok++ } catch (e) { /* continue */ }
    }
    setSaving(false); setSelected({}); setDone(`${ok} élève(s) réinscrit(s) à la ${label.toLowerCase()}.`)
  }

  return (
    <>
      <PageHeader title={`Réinscription ${label}`} subtitle="Sélectionnez les élèves à réinscrire" />
      {done && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{done}</div>}
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      <Card className="p-4 mb-4 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]"><Input placeholder="Rechercher (matricule, nom)…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Button onClick={reinscrire} disabled={saving || count === 0}>{saving ? 'Traitement…' : `Réinscrire (${count})`}</Button>
      </Card>
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? <EmptyState message="Aucun élève." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2 w-10"></th><th>Matricule</th><th>Élève</th><th>Classe</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.matricule} className="border-t hover:bg-brand-50 cursor-pointer" onClick={() => toggle(s.matricule)}>
                  <td className="px-4 py-2"><input type="checkbox" checked={!!selected[s.matricule]} onChange={() => toggle(s.matricule)} className="h-4 w-4" /></td>
                  <td className="font-mono text-xs">{s.matricule}</td>
                  <td className="font-medium">{s.full_name || `${s.first_name} ${s.last_name}`}</td>
                  <td>{s.school_class_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
