import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

export default function Cycles() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', position: 0 })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return api.get('/cycles').then(({ data }) => setItems(data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ name: '', position: 0 }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (c) => { setForm({ name: c.name, position: c.position ?? 0 }); setEditing(c.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/cycles/${editing}`, form); else await api.post('/cycles', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (c) => { if (!confirm('Supprimer ce cycle ?')) return; await api.delete(`/cycles/${c.id}`); load() }

  return (
    <>
      <PageHeader title="Cycles" subtitle={`${items.length} cycle(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau cycle</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun cycle." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Nom</th><th>Niveaux</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="text-ink">{c.levels_count ?? 0}</td>
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
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le cycle' : 'Nouveau cycle'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom (ex : Primaire, Collège)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Ordre d'affichage" type="number" value={form.position} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}