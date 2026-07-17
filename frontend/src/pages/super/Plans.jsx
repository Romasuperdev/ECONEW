import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatMoney } from '../../utils/format'

const empty = { name: '', price: 0, billing_period: 'mensuel', max_students: '', max_users: '', storage_mb: '', is_active: true }

export default function Plans() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/super/plans').then(({ data }) => setItems(data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (p) => {
    setForm({ ...p, max_students: p.max_students ?? '', max_users: p.max_users ?? '', storage_mb: p.storage_mb ?? '' })
    setEditing(p.id); setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    const payload = {
      ...form, price: Number(form.price),
      max_students: form.max_students === '' ? null : Number(form.max_students),
      max_users: form.max_users === '' ? null : Number(form.max_users),
      storage_mb: form.storage_mb === '' ? null : Number(form.storage_mb),
    }
    try {
      if (editing) await api.put(`/super/plans/${editing}`, payload)
      else await api.post('/super/plans', payload)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette formule ?')) return
    await api.delete(`/super/plans/${id}`); load()
  }

  return (
    <>
      <PageHeader title="Formules d'abonnement" subtitle={`${items.length} formule(s)`}
        action={<Button onClick={openCreate}>+ Nouvelle formule</Button>} />

      {loading ? <EmptyState message="Chargement…" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-brand-800">{p.name}</h3>
                {!p.is_active && <Badge value="inactif" />}
              </div>
              <div className="text-2xl font-extrabold text-gold-600 mt-2">
                {p.price > 0 ? formatMoney(p.price) : 'Gratuit'}
              </div>
              <div className="text-xs text-ink mb-3">/ {p.billing_period}</div>
              <ul className="text-sm text-slate-600 space-y-1 flex-1">
                <li>👥 {p.max_students ?? '∞'} élèves</li>
                <li>🧑‍💼 {p.max_users ?? '∞'} utilisateurs</li>
                <li>💾 {p.storage_mb ? `${p.storage_mb} Mo` : 'Illimité'}</li>
                <li className="text-xs text-ink">{p.subscriptions_count ?? 0} école(s) abonnée(s)</li>
              </ul>
              <div className="flex gap-2 mt-4">
                <Button variant="ghost" className="flex-1" onClick={() => openEdit(p)}>Modifier</Button>
                <Button variant="danger" onClick={() => remove(p.id)}>✕</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la formule' : 'Nouvelle formule'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prix" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Select label="Facturation" value={form.billing_period} onChange={(e) => setForm({ ...form, billing_period: e.target.value })}>
              <option value="mensuel">Mensuel</option><option value="annuel">Annuel</option>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Max élèves" type="number" value={form.max_students} onChange={(e) => setForm({ ...form, max_students: e.target.value })} placeholder="∞" />
            <Input label="Max users" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: e.target.value })} placeholder="∞" />
            <Input label="Stockage Mo" type="number" value={form.storage_mb} onChange={(e) => setForm({ ...form, storage_mb: e.target.value })} placeholder="∞" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Formule active
          </label>
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
