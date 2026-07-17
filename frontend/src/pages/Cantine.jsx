import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'

export default function Cantine() {
  const { can } = useAuth()
  const [tab, setTab] = useState('inscriptions')
  const [rows, setRows] = useState([])
  const [grille, setGrille] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  // modales
  const [insModal, setInsModal] = useState(false)
  const [encModal, setEncModal] = useState(false)
  const [grilleModal, setGrilleModal] = useState(false)
  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [insForm, setInsForm] = useState({ matricule: '', code_niveau: '', mode: '', nbr_mois: '', montant_annee: '', montant_inscription: '', date_debut: new Date().toISOString().slice(0, 10) })
  const [current, setCurrent] = useState(null)
  const [encForm, setEncForm] = useState({ montant: '' })
  const [gForm, setGForm] = useState({ code_niveau: '', mode: '', montant: '', nbr_mois: '' })

  const loadRows = () => api.get('/cantine', { params: { search } }).then(({ data }) => setRows(data.data || data))
  const loadGrille = () => api.get('/cantine/grille').then(({ data }) => setGrille(data))

  useEffect(() => { Promise.all([loadRows(), loadGrille()]).finally(() => setLoading(false)) }, [])
  useEffect(() => { const t = setTimeout(loadRows, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    if (!insModal) return
    const t = setTimeout(() => {
      api.get('/students', { params: { search: studentSearch, per_page: 50 } })
        .then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([]))
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch, insModal])

  const totalDu = rows.reduce((s, r) => s + Number(r.montant_annee || 0), 0)
  const totalPaye = rows.reduce((s, r) => s + Number(r.paye || 0), 0)

  const inscrire = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/cantine', { ...insForm, nbr_mois: insForm.nbr_mois || null, montant_annee: insForm.montant_annee || null, montant_inscription: insForm.montant_inscription || null })
      setInsModal(false); loadRows()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const openEnc = (r) => { setCurrent(r); setEncForm({ montant: '' }); setError(''); setEncModal(true) }
  const encaisser = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post(`/cantine/${current.id}/encaisser`, { montant: Number(encForm.montant) }); setEncModal(false); loadRows() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const saveGrille = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/cantine/grille', { ...gForm, montant: Number(gForm.montant), nbr_mois: gForm.nbr_mois || null }); setGrilleModal(false); loadGrille() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const delGrille = async (g) => { if (!confirm('Supprimer ce tarif ?')) return; await api.delete(`/cantine/grille/${g.id}`); loadGrille() }

  return (
    <>
      <PageHeader title="Cantine" subtitle={`Dû ${formatMoney(totalDu)} · Payé ${formatMoney(totalPaye)} · Reste ${formatMoney(totalDu - totalPaye)}`}
        action={tab === 'inscriptions'
          ? (can('versements.create') && <Button onClick={() => { setInsForm({ matricule: '', code_niveau: '', mode: '', nbr_mois: '', montant_annee: '', montant_inscription: '', date_debut: new Date().toISOString().slice(0, 10) }); setStudentSearch(''); setError(''); setInsModal(true) }}><Icon name="plus" size={16} /> Inscrire à la cantine</Button>)
          : (can('config.manage') && <Button onClick={() => { setGForm({ code_niveau: '', mode: '', montant: '', nbr_mois: '' }); setError(''); setGrilleModal(true) }}><Icon name="plus" size={16} /> Ajouter un tarif</Button>)
        } />

      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'inscriptions' ? 'primary' : 'ghost'} onClick={() => setTab('inscriptions')}>Inscriptions & paiements</Button>
        <Button variant={tab === 'grille' ? 'primary' : 'ghost'} onClick={() => setTab('grille')}>Grille tarifaire</Button>
      </div>

      {tab === 'inscriptions' && (
        <>
          <Card className="p-4 mb-4">
            <Input placeholder="Rechercher par matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>
          <Card className="overflow-hidden">
            {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucune inscription cantine." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Élève</th><th>Matricule</th><th>Niveau</th><th className="text-right">Dû</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-brand-50">
                      <td className="px-4 py-2">{r.student?.full_name || '—'}</td>
                      <td className="font-mono text-xs">{r.matricule}</td>
                      <td>{r.code_niveau}</td>
                      <td className="text-right">{formatMoney(r.montant_annee)}</td>
                      <td className="text-right text-turquoise-600">{formatMoney(r.paye)}</td>
                      <td className="text-right font-medium text-gold-600">{formatMoney(r.reste)}</td>
                      <td className="text-right px-4">
                        {can('versements.create') && r.reste > 0 && <button onClick={() => openEnc(r)} className="hover:underline" style={{ color: 'var(--teal)' }}>Encaisser</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {tab === 'grille' && (
        <Card className="overflow-hidden">
          {grille.length === 0 ? <EmptyState message="Aucun tarif défini." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Niveau</th><th>Mode</th><th>Nb mois</th><th className="text-right">Montant</th><th></th></tr></thead>
              <tbody>
                {grille.map((g) => (
                  <tr key={g.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2">{g.code_niveau}</td>
                    <td>{g.mode || '—'}</td>
                    <td>{g.nbr_mois || '—'}</td>
                    <td className="text-right font-medium">{formatMoney(g.montant)}</td>
                    <td className="text-right px-4">{can('config.manage') && <button onClick={() => delGrille(g)} className="text-red-600 hover:underline">Suppr.</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={insModal} onClose={() => setInsModal(false)} title="Inscrire un élève à la cantine">
        <form onSubmit={inscrire} className="space-y-4">
          <Input label="Rechercher l'élève" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="nom ou matricule" />
          <Select label="Élève" value={insForm.matricule} onChange={(e) => { const s = students.find((x) => x.matricule === e.target.value); setInsForm({ ...insForm, matricule: e.target.value, code_niveau: s?.code_niveau || s?.school_class_id || insForm.code_niveau }) }} required>
            <option value="">— Sélectionner —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} · {s.first_name} {s.last_name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Niveau" value={insForm.code_niveau} onChange={(e) => setInsForm({ ...insForm, code_niveau: e.target.value })} />
            <Input label="Mode (option)" value={insForm.mode} onChange={(e) => setInsForm({ ...insForm, mode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nb mois (option)" type="number" value={insForm.nbr_mois} onChange={(e) => setInsForm({ ...insForm, nbr_mois: e.target.value })} />
            <Input label="Montant annuel (sinon grille)" type="number" value={insForm.montant_annee} onChange={(e) => setInsForm({ ...insForm, montant_annee: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Frais d'inscription (option)" type="number" value={insForm.montant_inscription} onChange={(e) => setInsForm({ ...insForm, montant_inscription: e.target.value })} />
            <Input label="Date de début" type="date" value={insForm.date_debut} onChange={(e) => setInsForm({ ...insForm, date_debut: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setInsModal(false)}>Annuler</Button><Button type="submit">Inscrire</Button></div>
        </form>
      </Modal>

      <Modal open={encModal} onClose={() => setEncModal(false)} title="Encaisser un versement cantine">
        <form onSubmit={encaisser} className="space-y-4">
          {current && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--surface-2)' }}>
              {current.student?.full_name} · Reste : <strong className="text-gold-600">{formatMoney(current.reste)}</strong>
            </div>
          )}
          <Input label="Montant" type="number" value={encForm.montant} onChange={(e) => setEncForm({ montant: e.target.value })} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEncModal(false)}>Annuler</Button><Button type="submit">Valider</Button></div>
        </form>
      </Modal>

      <Modal open={grilleModal} onClose={() => setGrilleModal(false)} title="Nouveau tarif cantine">
        <form onSubmit={saveGrille} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Niveau" value={gForm.code_niveau} onChange={(e) => setGForm({ ...gForm, code_niveau: e.target.value })} required />
            <Input label="Mode (option)" value={gForm.mode} onChange={(e) => setGForm({ ...gForm, mode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant" type="number" value={gForm.montant} onChange={(e) => setGForm({ ...gForm, montant: e.target.value })} required />
            <Input label="Nb mois (option)" type="number" value={gForm.nbr_mois} onChange={(e) => setGForm({ ...gForm, nbr_mois: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setGrilleModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
