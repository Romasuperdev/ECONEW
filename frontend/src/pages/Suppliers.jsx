import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'

const empty = { name: '', contact_name: '', phone: '', email: '', address: '' }

export default function Suppliers() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/suppliers').then(({ data }) => setItems(data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (s) => { setForm(s); setEditing(s.id); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/suppliers/${editing}`, form)
      else await api.post('/suppliers', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce fournisseur ?')) return
    await api.delete(`/suppliers/${id}`); load()
  }

  return (
    <>
      <PageHeader title="Fournisseurs" subtitle={`${items.length} fournisseur(s)`}
        action={<Button onClick={openCreate}>+ Nouveau fournisseur</Button>} />

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-4 py-3">Nom</th><th>Contact</th><th>Téléphone</th><th>Email</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td>{s.contact_name || '—'}</td>
                  <td>{s.phone || '—'}</td>
                  <td className="text-slate-500">{s.email || '—'}</td>
                  <td className="text-right px-4 space-x-2">
                    <button onClick={() => openEdit(s)} className="text-brand-600 hover:underline">Modifier</button>
                    <button onClick={() => remove(s.id)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact" value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
            <Input label="Téléphone" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Adresse" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
