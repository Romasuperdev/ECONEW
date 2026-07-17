import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

const empty = { code: '', name: '', ville: '', pays: '', telephone: '', email: '', adresse: '', activite: '', base: '', representant: '' }

export default function Societes() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoading(true); api.get('/super/societes', { params: { search } }).then(({ data }) => setItems(data)).finally(() => setLoading(false)) }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (s) => { setForm({ ...empty, ...s }); setEditing(s.id); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/super/societes/${editing}`, form)
      else await api.post('/super/societes', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (s) => { if (!confirm(`Supprimer ${s.name} ?`)) return; await api.delete(`/super/societes/${s.id}`); load() }

  return (
    <>
      <PageHeader title="Sociétés" subtitle={`${items.length} société(s)`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle société</Button>} />

      <Card className="p-4 mb-4"><Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="px-4 py-3">Société</th><th>Code</th><th>Ville</th><th>Base</th><th></th></tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{s.name}</td>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td>{s.ville || '—'}</td>
                  <td className="text-muted">{s.base || '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(s)} className="text-brand-600 hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(s)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la société' : 'Nouvelle société'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} required />
            <div className="col-span-2"><Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ville" value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} />
            <Input label="Pays" value={form.pays} onChange={(e) => setForm({ ...form, pays: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Téléphone" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label="Adresse" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Activité" value={form.activite} onChange={(e) => setForm({ ...form, activite: e.target.value })} />
            <Input label="Base de données" value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} />
          </div>
          <Input label="Représentant" value={form.representant} onChange={(e) => setForm({ ...form, representant: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
