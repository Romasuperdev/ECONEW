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
  const [editing, setEditing] = useState(null)
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
    setEditing(null); setError(''); setModal(true)
  }

  const openEdit = (ex) => {
    setForm({
      label: ex.label || '', amount: ex.amount ?? '',
      spent_at: (ex.spent_at || '').slice(0, 10) || new Date().toISOString().slice(0, 10),
      method: ex.method || 'especes',
      expense_category_id: ex.category?.id ?? ex.expense_category_id ?? '',
      supplier_id: ex.supplier?.id ?? ex.supplier_id ?? '',
      status: ex.status || 'validee',
    })
    setEditing(ex.id); setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = {
        ...form, amount: Number(form.amount),
        expense_category_id: form.expense_category_id || null,
        supplier_id: form.supplier_id || null,
      }
      if (editing) await api.put(`/expenses/${editing}`, payload); else await api.post('/expenses', payload)
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
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(ex)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(ex.id)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la dépense' : 'Nouvelle dépense'}>
        <form onSubmit={save} className="space-y-5">
          {/* Détails de la dépense */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink mb-2" style={{ letterSpacing: '.04em' }}>Détails</div>
            <div className="space-y-3">
              <Input label="Libellé" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Ex : Achat fournitures de bureau" required />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Montant (XOF)" type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                <Input label="Date" type="date" value={form.spent_at} onChange={(e) => setForm({ ...form, spent_at: e.target.value })} required />
              </div>
            </div>
          </div>

          {/* Règlement */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-ink mb-2" style={{ letterSpacing: '.04em' }}>Règlement</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select label="Mode de paiement" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option>
                <option value="virement">Virement</option><option value="cheque">Chèque</option><option value="carte">Carte</option>
              </Select>
              <Select label="Statut" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="validee">Validée</option><option value="en_attente">En attente</option><option value="rejetee">Rejetée</option>
              </Select>
            </div>
          </div>

          {error && <div className="rounded-lg px-3 py-2 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

          <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
