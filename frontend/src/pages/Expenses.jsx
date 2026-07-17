import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate } from '../utils/format'

export default function Expenses() {
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ label: '', amount: '', spent_at: new Date().toISOString().slice(0, 10), method: 'especes', expense_category_id: '', supplier_id: '', status: 'validee' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/expenses', { params: { per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get('/expense-categories').then(({ data }) => setCategories(data))
    api.get('/suppliers').then(({ data }) => setSuppliers(data))
  }, [])

  const openCreate = () => {
    setForm({ label: '', amount: '', spent_at: new Date().toISOString().slice(0, 10), method: 'especes', expense_category_id: '', supplier_id: '', status: 'validee' })
    setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/expenses', {
        ...form, amount: Number(form.amount),
        expense_category_id: form.expense_category_id || null,
        supplier_id: form.supplier_id || null,
      })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await api.delete(`/expenses/${id}`); load()
  }

  const total = items.reduce((s, e) => s + Number(e.amount || 0), 0)

  return (
    <>
      <PageHeader title="Dépenses" subtitle={`Total : ${formatMoney(total)}`}
        action={<Button onClick={openCreate}>+ Nouvelle dépense</Button>} />

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-4 py-3">Réf.</th><th>Libellé</th><th>Catégorie</th><th>Fournisseur</th><th>Date</th><th>Statut</th><th className="text-right">Montant</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((ex) => (
                <tr key={ex.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{ex.reference}</td>
                  <td className="font-medium">{ex.label}</td>
                  <td>{ex.category?.name || '—'}</td>
                  <td className="text-slate-500">{ex.supplier?.name || '—'}</td>
                  <td>{formatDate(ex.spent_at)}</td>
                  <td><Badge value={ex.status} /></td>
                  <td className="text-right font-medium text-red-600">{formatMoney(ex.amount)}</td>
                  <td className="text-right px-4"><button onClick={() => remove(ex.id)} className="text-red-600 hover:underline">Suppr.</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouvelle dépense">
        <form onSubmit={save} className="space-y-4">
          <Input label="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            <Input label="Date" type="date" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Catégorie" value={form.expense_category_id} onChange={(e) => setForm({ ...form, expense_category_id: e.target.value })}>
              <option value="">— Aucune —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Fournisseur" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
              <option value="">— Aucun —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Mode" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option>
              <option value="virement">Virement</option><option value="cheque">Chèque</option><option value="carte">Carte</option>
            </Select>
            <Select label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="validee">Validée</option><option value="en_attente">En attente</option><option value="rejetee">Rejetée</option>
            </Select>
          </div>
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
