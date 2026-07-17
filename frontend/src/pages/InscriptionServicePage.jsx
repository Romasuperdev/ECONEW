import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

// Inscription simple d'un élève à un service (cantine / pension).
export default function InscriptionServicePage({ base = '/cantine', label = 'Cantine' }) {
  const [students, setStudents] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ matricule: '', nom: '', prenom: '' })
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/students', { params: { per_page: 1000 } }).then(({ data }) => setStudents(data.data || data)).catch((e) => setLoadError(apiError(e))),
    api.get(base).then(({ data }) => setRows(data.data || data)).catch(() => setRows([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [base])

  const studByMat = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s }); return m }, [students])
  const pick = (mat) => { const s = studByMat[String(mat)]; setForm({ matricule: mat, nom: s?.last_name || '', prenom: s?.first_name || '' }) }

  const submit = async (e) => {
    e.preventDefault(); setError(''); setDone('')
    if (!form.matricule) { setError('Sélectionnez un élève.'); return }
    setSaving(true)
    try {
      await api.post(base, { matricule: form.matricule })
      setDone(`${form.prenom} ${form.nom} inscrit(e) à la ${label.toLowerCase()}.`)
      setForm({ matricule: '', nom: '', prenom: '' }); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader title={`Inscription ${label}`} subtitle={`Inscrire un élève à la ${label.toLowerCase()}`} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      {done && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{done}</div>}
      <Card className="p-5 mb-6 max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Date" value={new Date().toLocaleDateString('fr-FR')} readOnly className="bg-gray-50" />
          <Select label="Matricule (élève)" value={form.matricule} onChange={(e) => pick(e.target.value)} required>
            <option value="">— Choisir un élève —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} — {s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} readOnly className="bg-gray-50" />
            <Input label="Prénom" value={form.prenom} readOnly className="bg-gray-50" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? 'Inscription…' : 'Inscrire'}</Button></div>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Inscrits ({rows.length})</div>
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun inscrit." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Matricule</th><th>Élève</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id ?? i} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{r.matricule}</td>
                  <td className="font-medium">{r.full_name || r.student || `${r.matricule}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
