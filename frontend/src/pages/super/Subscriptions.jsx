import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatMoney, formatDate } from '../../utils/format'

export default function Subscriptions() {
  const [items, setItems] = useState([])
  const [schools, setSchools] = useState([])
  const [plans, setPlans] = useState([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ school_id: '', subscription_plan_id: '', starts_at: new Date().toISOString().slice(0, 10), duration_months: 12, auto_renew: false, mark_paid: true, method: 'mobile_money' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/super/subscriptions', { params: { status, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }

  useEffect(() => {
    api.get('/super/schools', { params: { per_page: 500 } }).then(({ data }) => setSchools(data.data || data))
    api.get('/super/plans').then(({ data }) => setPlans(data))
  }, [])
  useEffect(load, [status])

  const openCreate = () => {
    setForm({ school_id: '', subscription_plan_id: '', starts_at: new Date().toISOString().slice(0, 10), duration_months: 12, auto_renew: false, mark_paid: true, method: 'mobile_money' })
    setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/super/subscriptions', { ...form, duration_months: Number(form.duration_months) })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const statusLabel = (s) => ({ active: 'actif', trial: 'en_attente', expired: 'annulee', cancelled: 'annulee' }[s] || s)

  return (
    <>
      <PageHeader title="Abonnements & Licences" subtitle={`${items.length} abonnement(s)`}
        action={<Button onClick={openCreate}>+ Attribuer / Renouveler</Button>} />

      <Card className="p-4 mb-4">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Tous</option>
          <option value="active">Actifs</option>
          <option value="trial">Essai</option>
          <option value="expired">Expirés</option>
          <option value="cancelled">Annulés</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-3">École</th><th>Formule</th><th>Début</th><th>Expiration</th><th>Restant</th><th className="text-right">Montant</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-3 font-medium">{s.school?.name}</td>
                  <td>{s.plan?.name}</td>
                  <td>{formatDate(s.starts_at)}</td>
                  <td>{formatDate(s.ends_at)}</td>
                  <td className={s.days_left < 15 ? 'text-red-600 font-medium' : ''}>
                    {s.days_left > 0 ? `${s.days_left} j` : 'expiré'}
                  </td>
                  <td className="text-right">{formatMoney(s.amount)}</td>
                  <td><Badge value={statusLabel(s.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Attribuer / Renouveler un abonnement">
        <form onSubmit={save} className="space-y-4">
          <Select label="École" value={form.school_id} onChange={(e) => setForm({ ...form, school_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Formule" value={form.subscription_plan_id} onChange={(e) => setForm({ ...form, subscription_plan_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatMoney(p.price)}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date de début" type="date" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} required />
            <Input label="Durée (mois)" type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.auto_renew} onChange={(e) => setForm({ ...form, auto_renew: e.target.checked })} />
              Renouvellement auto
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.mark_paid} onChange={(e) => setForm({ ...form, mark_paid: e.target.checked })} />
              Marquer comme payé
            </label>
          </div>
          {form.mark_paid && (
            <Select label="Mode de paiement" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option value="mobile_money">Mobile Money</option><option value="carte">Carte</option>
              <option value="virement">Virement</option><option value="especes">Espèces</option>
            </Select>
          )}
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
