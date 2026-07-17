import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

export default function ClassesPage() {
  const [items, setItems] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', level_id: '' })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/school-classes').then(({ data }) => setItems(data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/levels').then(({ data }) => setLevels(data)).catch(() => setLevels([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ code: '', name: '', level_id: '' }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (c) => { setForm({ code: c.code || '', name: c.name, level_id: c.level_id || '' }); setEditing(c.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/school-classes/${editing}`, form); else await api.post('/school-classes', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (c) => { if (!confirm('Supprimer cette classe ?')) return; try { await api.delete(`/school-classes/${c.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Classes" subtitle={`${items.length} classe(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle classe</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune classe." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Code</th><th>Libellé</th><th>Niveau</th><th>Élèves</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{c.code}</td>
                  <td className="font-medium">{c.name}</td>
                  <td>{c.level?.name || '—'}</td>
                  <td className="text-ink">{c.students_count ?? 0}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(c)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la classe' : 'Nouvelle classe'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Libellé (ex : CP1 A)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Niveau" value={form.level_id} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
            <option value="">— Aucun —</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
