import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const TYPES = ['Inscription', 'Scolarité', 'Transport', 'Cantine', 'Pension']
const empty = { matricule: '', nom: '', prenom: '', niveau: '', type: '', montant: '', taux: '' }

export default function RemisePage() {
  const [items, setItems] = useState([])
  const [students, setStudents] = useState([])
  const [gSco, setGSco] = useState([])
  const [tCantine, setTCantine] = useState([])
  const [gPension, setGPension] = useState([])
  const [tTransport, setTTransport] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const annee = localStorage.getItem('annee') || '—'

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/remises').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
    api.get('/grille-scolarite').then(({ data }) => setGSco(data.data || data)).catch(() => setGSco([])),
    api.get('/cantine-tarifs').then(({ data }) => setTCantine(data.data || data)).catch(() => setTCantine([])),
    api.get('/pension/grille').then(({ data }) => setGPension(data.data || data)).catch(() => setGPension([])),
    api.get('/transport-tarifs').then(({ data }) => setTTransport(data.data || data)).catch(() => setTTransport([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const studByMat = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s }); return m }, [students])

  // Montant de base tiré de la grille correspondant au type + niveau
  const baseFor = (type, niveau) => {
    if (type === 'Scolarité' || type === 'Inscription') {
      const g = gSco.find((x) => String(x.code_grille) === String(niveau))
      if (!g) return ''
      return type === 'Scolarité' ? (g.scolarite ?? '') : (g.inscription ?? '')
    }
    if (type === 'Cantine') return tCantine[0]?.montant_annee ?? ''
    if (type === 'Pension') return gPension[0]?.montant_total ?? ''
    if (type === 'Transport') return tTransport[0]?.montant_annee ?? ''
    return ''
  }

  const pickStudent = (mat) => {
    const s = studByMat[String(mat)]
    const niveau = s?.code_niveau || ''
    setForm((f) => ({ ...f, matricule: mat, nom: s?.last_name || '', prenom: s?.first_name || '', niveau, montant: f.type ? String(baseFor(f.type, niveau) || '') : f.montant }))
  }
  const pickType = (type) => setForm((f) => ({ ...f, type, montant: String(baseFor(type, f.niveau) || '') }))

  const montantRemise = useMemo(() => Math.round(Number(form.montant || 0) * Number(form.taux || 0)) / 100, [form.montant, form.taux])
  const montantAvec = useMemo(() => Number(form.montant || 0) - montantRemise, [form.montant, montantRemise])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (r) => { setForm({ matricule: r.matricule || '', nom: r.nom || '', prenom: r.prenom || '', niveau: r.niveau || '', type: r.type || '', montant: r.montant ?? '', taux: r.taux ?? '' }); setEditing(r.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { ...form, montant: Number(form.montant || 0), taux: Number(form.taux || 0) }
      if (editing) await api.put(`/remises/${editing}`, payload); else await api.post('/remises', payload)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (r) => { if (!confirm('Supprimer cette remise ?')) return; try { await api.delete(`/remises/${r.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Remises" subtitle={`Année ${annee} · ${items.length} remise(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle remise</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune remise." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Matricule</th><th>Élève</th><th>Niveau</th><th>Type</th><th className="text-right">Montant</th><th>Taux</th><th className="text-right">Remise</th><th className="text-right">Net</th><th></th></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2">{r.date || '—'}</td>
                  <td className="font-mono text-xs">{r.matricule}</td>
                  <td className="font-medium">{r.prenom} {r.nom}</td>
                  <td>{r.niveau || '—'}</td>
                  <td>{r.type || '—'}</td>
                  <td className="text-right">{formatMoney(r.montant)}</td>
                  <td>{r.taux != null ? `${r.taux}%` : '—'}</td>
                  <td className="text-right text-red-600">{formatMoney(r.montant_remise)}</td>
                  <td className="text-right font-semibold">{formatMoney(r.montant_avec_remise)}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(r)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la remise' : 'Nouvelle remise'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Année scolaire" value={annee} readOnly className="bg-gray-50" />
            <Input label="Date" value={new Date().toLocaleDateString('fr-FR')} readOnly className="bg-gray-50" />
          </div>
          <Select label="Matricule (élève)" value={form.matricule} onChange={(e) => pickStudent(e.target.value)} required>
            <option value="">— Choisir un élève —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} — {s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Nom" value={form.nom} readOnly className="bg-gray-50" />
            <Input label="Prénom" value={form.prenom} readOnly className="bg-gray-50" />
            <Input label="Niveau" value={form.niveau} readOnly className="bg-gray-50" />
          </div>
          <Select label="Type de remise (rubrique)" value={form.type} onChange={(e) => pickType(e.target.value)} required>
            <option value="">— Choisir —</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant (depuis la grille)" type="number" value={form.montant} onChange={(e) => set('montant', e.target.value)} required />
            <Input label="Taux de remise (%)" type="number" value={form.taux} onChange={(e) => set('taux', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant remise (auto)" value={formatMoney(montantRemise)} readOnly className="bg-gray-50" />
            <Input label="Montant avec remise (auto)" value={formatMoney(montantAvec)} readOnly className="font-semibold bg-gray-50" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
