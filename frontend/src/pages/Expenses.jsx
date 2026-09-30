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

  const methodLabel = (m) => ({
    especes: 'Espèces', mobile_money: 'Mobile Money', virement: 'Virement',
    cheque: 'Chèque', carte: 'Carte',
  }[m] || m || '—')

  // Impression : fiche d'une dépense OU liste complète.
  const printHtml = (title, body) => {
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
      <style>
        *{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}
        body{margin:0;padding:32px;color:#0c2c21}
        .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #00A876;padding-bottom:12px;margin-bottom:20px}
        .brand{font-size:20px;font-weight:800;color:#0f2f57}
        .brand span{color:#00A876}
        .sub{color:#64748b;font-size:12px;margin-top:2px}
        h1{font-size:18px;margin:0 0 4px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border:1px solid #d9e2ec;padding:8px 10px;text-align:left}
        th{background:#eafaf3;color:#065f46}
        .r{text-align:right}
        .kv{width:100%;font-size:14px;margin-top:8px}
        .kv td{border:0;border-bottom:1px dashed #d9e2ec;padding:9px 4px}
        .kv td:first-child{color:#64748b;width:40%}
        .kv td:last-child{font-weight:600}
        .tot{margin-top:16px;font-size:16px;font-weight:800;text-align:right;color:#b91c1c}
        .foot{margin-top:40px;display:flex;justify-content:space-between;font-size:12px;color:#64748b}
        .sign{margin-top:48px;border-top:1px solid #94a3b8;width:200px;text-align:center;padding-top:4px}
        @media print{body{padding:0}}
      </style></head><body>
      <div class="head">
        <div><div class="brand">NEXORA <span>ECONOMAT</span></div><div class="sub">Gestion financière scolaire</div></div>
        <div style="text-align:right"><div class="sub">Édité le</div><div style="font-weight:700">${new Date().toLocaleDateString('fr-FR')}</div></div>
      </div>
      ${body}
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`)
    w.document.close()
  }

  const printFiche = (ex) => {
    const body = `
      <h1>Fiche de dépense</h1>
      <div class="sub" style="margin-bottom:16px">Référence : <b>${ex.reference || '—'}</b></div>
      <table class="kv">
        <tr><td>Libellé</td><td>${ex.label || '—'}</td></tr>
        <tr><td>Date</td><td>${formatDate(ex.spent_at)}</td></tr>
        <tr><td>Mode de paiement</td><td>${methodLabel(ex.method)}</td></tr>
        <tr><td>Statut</td><td>${ex.status || '—'}</td></tr>
        <tr><td>Montant</td><td>${formatMoney(ex.amount)}</td></tr>
      </table>
      <div class="tot">Montant : ${formatMoney(ex.amount)}</div>
      <div class="foot">
        <div class="sign">Établi par</div>
        <div class="sign">Approuvé par</div>
      </div>`
    printHtml(`Fiche dépense ${ex.reference || ''}`, body)
  }

  const printList = () => {
    const rows = items.map((ex) => `
      <tr>
        <td>${ex.reference || '—'}</td>
        <td>${ex.label || '—'}</td>
        <td>${formatDate(ex.spent_at)}</td>
        <td>${methodLabel(ex.method)}</td>
        <td>${ex.status || '—'}</td>
        <td class="r">${formatMoney(ex.amount)}</td>
      </tr>`).join('')
    const body = `
      <h1>Journal des dépenses</h1>
      <div class="sub" style="margin-bottom:16px">${items.length} dépense(s)</div>
      <table>
        <thead><tr><th>Réf.</th><th>Libellé</th><th>Date</th><th>Mode</th><th>Statut</th><th class="r">Montant</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th colspan="5" class="r">TOTAL</th><th class="r">${formatMoney(total)}</th></tr></tfoot>
      </table>`
    printHtml('Journal des dépenses', body)
  }

  return (
    <>
      <PageHeader title="Dépenses" subtitle={`Total : ${formatMoney(total)}`}
        action={<div className="flex gap-2">
          <Button variant="ghost" onClick={printList} disabled={!items.length}>Imprimer la liste</Button>
          <Button onClick={openCreate}>+ Nouvelle dépense</Button>
        </div>} />

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-4 py-3">Réf.</th><th>Libellé</th><th>Date</th><th>Statut</th><th className="text-right">Montant</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((ex) => (
                <tr key={ex.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{ex.reference}</td>
                  <td className="font-medium">{ex.label}</td>
                  <td>{formatDate(ex.spent_at)}</td>
                  <td><Badge value={ex.status} /></td>
                  <td className="text-right font-medium text-red-600">{formatMoney(ex.amount)}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => printFiche(ex)} className="hover:underline" style={{ color: 'var(--accent)' }}>Fiche</button>
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
