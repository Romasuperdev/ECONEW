import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate } from '../utils/format'

const POSTES = [
  'Directeur', 'Directeur des études', 'Directeur adjoint', 'Censeur', 'Éducateur',
  'Surveillant général', 'Surveillant', 'Enseignant', 'Professeur', 'Instituteur',
  'Comptable', 'Économe', 'Caissier', 'Secrétaire', 'Gestionnaire',
  'Bibliothécaire', 'Infirmier(ère)', 'Cuisinier(ère)', 'Chauffeur',
  "Agent d'entretien", 'Gardien', 'Magasinier', 'Informaticien', 'Autre',
]

const emptyEmp = { first_name: '', last_name: '', position: '', base_salary: '', phone: '', is_active: true }

export default function Salaries() {
  const [tab, setTab] = useState('employees')
  const [employees, setEmployees] = useState([])
  const [payslips, setPayslips] = useState([])
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [empModal, setEmpModal] = useState(false)
  const [empForm, setEmpForm] = useState(emptyEmp)
  const [slipModal, setSlipModal] = useState(false)
  const [slipForm, setSlipForm] = useState({ employee_id: '', period: new Date().toISOString().slice(0, 7), base_salary: '', lines: [] })
  const [payModal, setPayModal] = useState(null)
  const [payForm, setPayForm] = useState({ cash_account_id: '', paid_at: new Date().toISOString().slice(0, 10) })
  const [error, setError] = useState('')

  const loadEmp = () => api.get('/employees').then(({ data }) => setEmployees(data))
  const loadSlips = () => api.get('/payslips', { params: { per_page: 100 } }).then(({ data }) => setPayslips(data.data || data))

  useEffect(() => {
    Promise.all([loadEmp(), loadSlips(), api.get('/cash-accounts').then(({ data }) => setAccounts(data))]).finally(() => setLoading(false))
  }, [])

  const saveEmp = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/employees', { ...empForm, base_salary: Number(empForm.base_salary) }); setEmpModal(false); loadEmp() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const addLine = () => setSlipForm({ ...slipForm, lines: [...slipForm.lines, { type: 'prime', label: '', amount: '' }] })
  const setLine = (i, k, v) => { const l = [...slipForm.lines]; l[i][k] = v; setSlipForm({ ...slipForm, lines: l }) }
  const rmLine = (i) => setSlipForm({ ...slipForm, lines: slipForm.lines.filter((_, x) => x !== i) })

  const openSlip = () => {
    setSlipForm({ employee_id: employees[0]?.id || '', period: new Date().toISOString().slice(0, 7), base_salary: '', lines: [] })
    setError(''); setSlipModal(true)
  }
  const saveSlip = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/payslips', {
        ...slipForm,
        base_salary: slipForm.base_salary === '' ? undefined : Number(slipForm.base_salary),
        lines: slipForm.lines.map((l) => ({ ...l, amount: Number(l.amount) })),
      })
      setSlipModal(false); loadSlips()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const doPay = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post(`/payslips/${payModal.id}/pay`, { ...payForm, cash_account_id: payForm.cash_account_id || null }); setPayModal(null); loadSlips() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const statusBadge = (s) => ({ brouillon: 'inactif', valide: 'partielle', paye: 'payee' }[s] || s)

  return (
    <>
      <PageHeader title="Salaires" subtitle="Employés et bulletins de paie"
        action={tab === 'employees'
          ? <Button onClick={() => { setEmpForm(emptyEmp); setError(''); setEmpModal(true) }}>+ Employé</Button>
          : <Button onClick={openSlip}>+ Bulletin</Button>} />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('employees')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'employees' ? 'bg-brand-800 text-white' : 'bg-slate-100'}`}>Employés ({employees.length})</button>
        <button onClick={() => setTab('payslips')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'payslips' ? 'bg-brand-800 text-white' : 'bg-slate-100'}`}>Bulletins ({payslips.length})</button>
      </div>

      {tab === 'employees' && (
        <Card className="overflow-hidden">
          {loading ? <EmptyState message="Chargement…" /> : employees.length === 0 ? <EmptyState /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Nom</th><th>Fonction</th><th>Téléphone</th><th className="text-right">Salaire de base</th><th>Statut</th></tr></thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-medium">{e.first_name} {e.last_name}</td>
                    <td>{e.position || '—'}</td>
                    <td>{e.phone || '—'}</td>
                    <td className="text-right">{formatMoney(e.base_salary)}</td>
                    <td><Badge value={e.is_active ? 'actif' : 'inactif'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'payslips' && (
        <Card className="overflow-hidden">
          {loading ? <EmptyState message="Chargement…" /> : payslips.length === 0 ? <EmptyState /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">N°</th><th>Employé</th><th>Période</th><th className="text-right">Net</th><th>Statut</th><th></th></tr></thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-mono text-xs">{p.number}</td>
                    <td>{p.employee?.first_name} {p.employee?.last_name}</td>
                    <td>{p.period}</td>
                    <td className="text-right font-medium">{formatMoney(p.net_amount)}</td>
                    <td><Badge value={statusBadge(p.status)} /></td>
                    <td className="text-right px-4">
                      {p.status !== 'paye' && <button onClick={() => { setPayForm({ cash_account_id: '', paid_at: new Date().toISOString().slice(0, 10) }); setError(''); setPayModal(p) }} className="text-turquoise-600 hover:underline">Payer</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={empModal} onClose={() => setEmpModal(false)} title="Nouvel employé">
        <form onSubmit={saveEmp} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" value={empForm.first_name} onChange={(e) => setEmpForm({ ...empForm, first_name: e.target.value })} required />
            <Input label="Nom" value={empForm.last_name} onChange={(e) => setEmpForm({ ...empForm, last_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Fonction" value={empForm.position} onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}>
              <option value="">— Sélectionner —</option>
              {POSTES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Input label="Salaire de base" type="number" value={empForm.base_salary} onChange={(e) => setEmpForm({ ...empForm, base_salary: e.target.value })} required />
          </div>
          <Input label="Téléphone" value={empForm.phone} onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEmpModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      <Modal open={slipModal} onClose={() => setSlipModal(false)} title="Nouveau bulletin">
        <form onSubmit={saveSlip} className="space-y-4">
          <Select label="Employé" value={slipForm.employee_id} onChange={(e) => setSlipForm({ ...slipForm, employee_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Période (AAAA-MM)" value={slipForm.period} onChange={(e) => setSlipForm({ ...slipForm, period: e.target.value })} required />
            <Input label="Salaire de base (option)" type="number" value={slipForm.base_salary} onChange={(e) => setSlipForm({ ...slipForm, base_salary: e.target.value })} placeholder="défaut employé" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-ink">Primes / retenues / avances</span>
              <button type="button" onClick={addLine} className="text-brand-600 text-sm hover:underline">+ Ligne</button>
            </div>
            {slipForm.lines.map((l, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select className="px-2 py-2 border border-slate-300 rounded-lg text-sm" value={l.type} onChange={(e) => setLine(i, 'type', e.target.value)}>
                  <option value="prime">Prime</option><option value="retenue">Retenue</option><option value="avance">Avance</option>
                </select>
                <input className="flex-1 px-2 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Libellé" value={l.label} onChange={(e) => setLine(i, 'label', e.target.value)} required />
                <input type="number" className="w-28 px-2 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Montant" value={l.amount} onChange={(e) => setLine(i, 'amount', e.target.value)} required />
                <button type="button" onClick={() => rmLine(i)} className="text-red-500 px-1">✕</button>
              </div>
            ))}
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setSlipModal(false)}>Annuler</Button><Button type="submit">Créer le bulletin</Button></div>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={`Payer le bulletin ${payModal?.number || ''}`}>
        <form onSubmit={doPay} className="space-y-4">
          <div className="text-sm">Net à payer : <strong>{formatMoney(payModal?.net_amount)}</strong></div>
          <Select label="Caisse à débiter (option)" value={payForm.cash_account_id} onChange={(e) => setPayForm({ ...payForm, cash_account_id: e.target.value })}>
            <option value="">— Aucune (juste marquer payé) —</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>)}
          </Select>
          <Input label="Date de paiement" type="date" value={payForm.paid_at} onChange={(e) => setPayForm({ ...payForm, paid_at: e.target.value })} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setPayModal(null)}>Annuler</Button><Button type="submit">Valider le paiement</Button></div>
        </form>
      </Modal>
    </>
  )
}
