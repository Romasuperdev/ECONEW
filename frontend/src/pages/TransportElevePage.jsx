import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

const empty = { matricule: '', nom: '', prenom: '', classe: '', destination_id: '' }

export default function TransportElevePage() {
  const [items, setItems] = useState([])
  const [students, setStudents] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/transport-eleves').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/students', { params: { per_page: 1000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
    api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => setDestinations([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const studByMat = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s }); return m }, [students])
  const destName = useMemo(() => { const m = {}; destinations.forEach((d) => { m[String(d.id)] = d.libelle }); return m }, [destinations])

  const pickStudent = (mat) => {
    const s = studByMat[String(mat)]
    setForm((f) => ({ ...f, matricule: mat, nom: s?.last_name || '', prenom: s?.first_name || '', classe: s?.school_class_id || '' }))
  }

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (a) => { setForm({ matricule: a.matricule || '', nom: a.nom || '', prenom: a.prenom || '', classe: a.classe || '', destination_id: String(a.destination_id ?? '') }); setEditing(a.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/transport-eleves/${editing}`, form); else await api.post('/transport-eleves', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (a) => { if (!confirm('Supprimer cette affectation ?')) return; try { await api.delete(`/transport-eleves/${a.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Transport — Affectation élèves" subtitle={`${items.length} affectation(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle affectation</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune affectation." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Matricule</th><th>Élève</th><th>Classe</th><th>Destination</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2">{a.date || '—'}</td>
                  <td className="font-mono text-xs">{a.matricule}</td>
                  <td className="font-medium">{a.prenom} {a.nom}</td>
                  <td>{a.classe || '—'}</td>
                  <td>{destName[String(a.destination_id)] || a.destination_id || '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(a)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifier l'affectation" : 'Nouvelle affectation'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Date" value={new Date().toLocaleDateString('fr-FR')} readOnly className="bg-gray-50" />
          <Select label="Matricule (élève)" value={form.matricule} onChange={(e) => pickStudent(e.target.value)} required>
            <option value="">— Choisir un élève —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} — {s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} readOnly className="bg-gray-50" />
            <Input label="Prénom" value={form.prenom} readOnly className="bg-gray-50" />
          </div>
          <Input label="Classe" value={form.classe} readOnly className="bg-gray-50" />
          <Select label="Destination" value={form.destination_id} onChange={(e) => set('destination_id', e.target.value)}>
            <option value="">— Choisir —</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </Select>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
