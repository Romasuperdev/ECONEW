import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'
import { downloadFile } from '../utils/download'

const MODES = ['Espèces', 'Mobile Money', 'Virement', 'Chèque', 'Carte']
const MOTIFS_STD = ['Inscription', 'Réinscription', 'Scolarité', '1er versement', '2e versement', '3e versement', 'Cantine', 'Transport', 'Pension', 'Uniforme', 'Autre'].map((m) => ({ id: m, name: m }))
const isToday = (d) => { if (!d) return false; const x = new Date(d), n = new Date(); return x.getFullYear() === n.getFullYear() && x.getMonth() === n.getMonth() && x.getDate() === n.getDate() }

export default function Payments() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [motifs, setMotifs] = useState([])
  const [modes, setModes] = useState([])
  const [form, setForm] = useState({ matricule: '', montant: '', mode: 'Espèces', date: new Date().toISOString().slice(0, 10), libelle: '', caisse: '' })
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/versements', { params: { search, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/students', { params: { search: studentSearch, per_page: 50 } })
        .then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([]))
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch])
  useEffect(() => {
    api.get('/fee-types').then(({ data }) => setMotifs(data || [])).catch(() => setMotifs([]))
    api.get('/payment-modes').then(({ data }) => setModes((data || []).map((m) => m.name))).catch(() => setModes([]))
  }, [])

  const selected = students.find((s) => s.matricule === form.matricule)

  const openCreate = () => {
    setForm({ matricule: '', montant: '', mode: 'Espèces', date: new Date().toISOString().slice(0, 10), libelle: '', caisse: '' })
    setStudentSearch(''); setError(''); setModal(true)
  }
  const save = async (e) => {
    e.preventDefault(); setError('')
    if (!form.matricule) { setError('Sélectionnez un élève.'); return }
    try {
      await api.post('/versements', { ...form, montant: Number(form.montant) })
      setModal(false); load()
    } catch (err) {
      const d = err.response?.data
      const msg = d?.message || (d?.errors ? Object.values(d.errors)[0]?.[0] : null) || 'Erreur lors de l\'encaissement.'
      setError(msg); alert(msg)
    }
  }
  const remove = async (v) => {
    if (!confirm('Annuler ce versement ?')) return
    try { await api.delete(`/versements/${v.id}`); load() }
    catch (err) { alert(err.response?.data?.message || "Annulation impossible.") }
  }
  const sendEmail = async (v) => {
    const email = prompt('Adresse email du destinataire du reçu :')
    if (!email) return
    try { await api.post(`/versements/${v.id}/email`, { email }); alert('Reçu envoyé à ' + email + '.') }
    catch (err) { alert(err.response?.data?.message || "Envoi impossible.") }
  }

  const total = items.reduce((s, v) => s + (Number(v.amount) || 0), 0)

  return (
    <>
      <PageHeader title="Versements" subtitle={`${items.length} versement(s) · total ${formatMoney(total)}`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Encaisser un versement</Button>} />

      <Card className="p-4 mb-4">
        <Input placeholder="Rechercher par matricule ou n° de reçu…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun versement." /> : (
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="px-4 py-3">Reçu</th><th>Élève</th><th>Matricule</th><th>Date</th><th>Mode</th><th className="text-right">Montant</th><th></th></tr></thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{v.receipt_number || v.id}</td>
                  <td>{v.student?.full_name || '—'}</td>
                  <td className="font-mono text-xs">{v.matricule}</td>
                  <td>{formatDate(v.paid_at)}</td>
                  <td>{v.method ? <Badge value={String(v.method)} /> : '—'}</td>
                  <td className="text-right font-medium text-turquoise-600">{formatMoney(v.amount)}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => downloadFile(`/versements/${v.id}/pdf`, `Recu-${v.receipt_number || v.id}.pdf`)} className="hover:underline" style={{ color: 'var(--teal)' }}>Reçu</button>
                    <button onClick={() => sendEmail(v)} className="hover:underline" style={{ color: 'var(--accent)' }}>Email</button>
                    {(can('versements.cancel') || isToday(v.paid_at)) && <button onClick={() => remove(v)} className="text-red-600 hover:underline">Annuler</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Encaisser un versement">
        <form onSubmit={save} className="space-y-4">
          <Input label="Rechercher l'élève" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="nom ou matricule" />
          <Select label="Élève" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} · {s.first_name} {s.last_name}</option>)}
          </Select>
          {selected && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--surface-2)' }}>
              Scolarité : <strong>{formatMoney(selected.scolarite)}</strong> · Payé : <strong className="text-turquoise-600">{formatMoney(selected.total_paye)}</strong> · Reste : <strong className="text-gold-600">{formatMoney((Number(selected.scolarite) || 0) - (Number(selected.total_paye) || 0))}</strong>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant" type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} required />
            <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <Select label="Mode de paiement" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
            {(modes.length ? modes : MODES).map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select label="Motif (option)" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })}>
            <option value="">— Aucun —</option>
            {(motifs.length ? motifs : MOTIFS_STD).map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
          </Select>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Valider l'encaissement</Button></div>
        </form>
      </Modal>
    </>
  )
}
