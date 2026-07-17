import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate } from '../utils/format'
import { downloadFile } from '../utils/download'

export default function Invoices() {
  const [items, setItems] = useState([])
  const [students, setStudents] = useState([])
  const [years, setYears] = useState([])
  const [feeTypes, setFeeTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({ student_id: '', academic_year_id: '', issue_date: new Date().toISOString().slice(0, 10), due_date: '', items: [{ fee_type_id: '', amount: '' }] })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/invoices', { params: { status: statusFilter, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/students', { params: { per_page: 500 } }).then(({ data }) => setStudents(data.data || data))
    api.get('/academic-years').then(({ data }) => setYears(data)).catch(() => setYears([]))
    api.get('/fee-types').then(({ data }) => setFeeTypes(data)).catch(() => setFeeTypes([]))
  }, [])
  useEffect(load, [statusFilter])

  const addLine = () => setForm({ ...form, items: [...form.items, { fee_type_id: '', amount: '' }] })
  const setLine = (i, key, val) => {
    const items = [...form.items]; items[i][key] = val; setForm({ ...form, items })
  }
  const removeLine = (i) => setForm({ ...form, items: form.items.filter((_, x) => x !== i) })

  const openCreate = () => {
    setForm({ student_id: '', academic_year_id: years.find((y) => y.is_current)?.id || '', issue_date: new Date().toISOString().slice(0, 10), due_date: '', items: [{ fee_type_id: '', amount: '' }] })
    setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/invoices', { ...form, items: form.items.map((it) => ({ ...it, amount: Number(it.amount) })) })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const openDetail = async (id) => {
    const { data } = await api.get(`/invoices/${id}`); setDetail(data)
  }

  const total = form.items.reduce((s, it) => s + (Number(it.amount) || 0), 0)

  return (
    <>
      <PageHeader title="Paiements" subtitle={`${items.length} paiement(s)`}
        action={<Button onClick={openCreate}>+ Nouveau paiement</Button>} />

      <Card className="p-4 mb-4">
        <Select label="Filtrer par statut" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="max-w-xs">
          <option value="">Toutes</option>
          <option value="impayee">Impayée</option><option value="partielle">Partielle</option>
          <option value="payee">Payée</option><option value="annulee">Annulée</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-4 py-3">N°</th><th>Élève</th><th>Émission</th><th className="text-right">Total</th><th className="text-right">Payé</th><th className="text-right">Solde</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((inv) => (
                <tr key={inv.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.number}</td>
                  <td>{inv.student?.first_name} {inv.student?.last_name}</td>
                  <td>{formatDate(inv.issue_date)}</td>
                  <td className="text-right">{formatMoney(inv.total_amount)}</td>
                  <td className="text-right text-green-600">{formatMoney(inv.paid_amount)}</td>
                  <td className="text-right font-medium text-amber-600">{formatMoney(inv.balance)}</td>
                  <td><Badge value={inv.status} /></td>
                  <td className="text-right px-4"><button onClick={() => openDetail(inv.id)} className="text-brand-600 hover:underline">Détails</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Nouveau paiement">
        <form onSubmit={save} className="space-y-4">
          <Select label="Élève" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.matricule} · {s.first_name} {s.last_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Année scolaire (auto)" value={form.academic_year_id} onChange={(e) => setForm({ ...form, academic_year_id: e.target.value })}>
              <option value="">—</option>
              {years.map((y) => <option key={y.id} value={y.id}>{y.label}</option>)}
            </Select>
            <Input label="Date d'émission" type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} required />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">Lignes de frais</span>
              <button type="button" onClick={addLine} className="text-brand-600 text-sm hover:underline">+ Ajouter</button>
            </div>
            {form.items.map((it, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="flex-1 px-2 py-2 border border-slate-300 rounded-lg text-sm" value={it.fee_type_id}
                  onChange={(e) => {
                    const ft = feeTypes.find((f) => String(f.id) === e.target.value)
                    const items = [...form.items]
                    items[i] = { ...items[i], fee_type_id: e.target.value, amount: (ft && ft.amount != null && !items[i].amount) ? ft.amount : items[i].amount }
                    setForm({ ...form, items })
                  }} required>
                  <option value="">Type de frais</option>
                  {feeTypes.map((f) => <option key={f.id} value={f.id}>{f.name}{f.amount != null ? ` (${Number(f.amount).toLocaleString('fr-FR')})` : ''}</option>)}
                </select>
                <input type="number" placeholder="Montant" className="w-32 px-2 py-2 border border-slate-300 rounded-lg text-sm"
                  value={it.amount} onChange={(e) => setLine(i, 'amount', e.target.value)} required />
                {form.items.length > 1 && <button type="button" onClick={() => removeLine(i)} className="text-red-500 px-1">✕</button>}
              </div>
            ))}
            <div className="text-right font-semibold mt-2">Total : {formatMoney(total)}</div>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer le paiement</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Paiement ${detail?.number || ''}`}>
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Élève</span><span>{detail.student?.first_name} {detail.student?.last_name}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Statut</span><Badge value={detail.status} /></div>
            <table className="w-full border-t pt-2">
              <tbody>
                {detail.items?.map((it) => (
                  <tr key={it.id} className="border-b"><td className="py-2">{it.label}</td><td className="text-right">{formatMoney(it.amount)}</td></tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(detail.total_amount)}</span></div>
            <div className="flex justify-between text-green-600"><span>Payé</span><span>{formatMoney(detail.paid_amount)}</span></div>
            <div className="flex justify-between text-amber-600 font-medium"><span>Solde</span><span>{formatMoney(detail.balance)}</span></div>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="ghost" onClick={() => downloadFile(`/invoices/${detail.id}/pdf`, `Paiement-${detail.number}.pdf`)}>⬇ Télécharger le reçu (PDF)</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
