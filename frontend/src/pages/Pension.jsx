import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'

export default function Pension() {
  const { can } = useAuth()
  const [tab, setTab] = useState('inscriptions')
  const [rows, setRows] = useState([])
  const [grille, setGrille] = useState([])
  const [dueRef, setDueRef] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [insModal, setInsModal] = useState(false)
  const [encModal, setEncModal] = useState(false)
  const [grilleModal, setGrilleModal] = useState(false)
  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [insForm, setInsForm] = useState({ matricule: '', date_debut: new Date().toISOString().slice(0, 10) })
  const [current, setCurrent] = useState(null)
  const [encForm, setEncForm] = useState({ montant: '' })
  const [gForm, setGForm] = useState({ libelle: '', montant: '', montant_total: '', nb_versements: '', date: new Date().toISOString().slice(0, 10) })

  const loadRows = () => api.get('/pension', { params: { search } }).then(({ data }) => { setRows(data.data || data); setDueRef(data.due_reference || 0) })
  const loadGrille = () => api.get('/pension/grille').then(({ data }) => setGrille(data))

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

  const totalPaye = rows.reduce((s, r) => s + Number(r.paye || 0), 0)

  const inscrire = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/pension', insForm); setInsModal(false); loadRows() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const openEnc = (r) => { setCurrent(r); setEncForm({ montant: '' }); setError(''); setEncModal(true) }
  const encaisser = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post(`/pension/${current.id}/encaisser`, { montant: Number(encForm.montant) }); setEncModal(false); loadRows() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const saveGrille = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/pension/grille', { ...gForm, montant: gForm.montant || null, montant_total: Number(gForm.montant_total), nb_versements: gForm.nb_versements || null }); setGrilleModal(false); loadGrille() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const delGrille = async (g) => { if (!confirm('Supprimer cette ligne ?')) return; await api.delete(`/pension/grille/${g.id}`); loadGrille() }

  return (
    <>
      <PageHeader title="Pension" subtitle={`Total annuel de référence : ${formatMoney(dueRef)} · Payé cumulé ${formatMoney(totalPaye)}`}
        action={tab === 'inscriptions'
          ? (can('versements.create') && <Button onClick={() => { setInsForm({ matricule: '', date_debut: new Date().toISOString().slice(0, 10) }); setStudentSearch(''); setError(''); setInsModal(true) }}><Icon name="plus" size={16} /> Inscrire à la pension</Button>)
          : (can('config.manage') && <Button onClick={() => { setGForm({ libelle: '', montant: '', montant_total: '', nb_versements: '', date: new Date().toISOString().slice(0, 10) }); setError(''); setGrilleModal(true) }}><Icon name="plus" size={16} /> Ajouter une ligne</Button>)
        } />

      <div className="flex gap-2 mb-4">
        <Button variant={tab === 'inscriptions' ? 'primary' : 'ghost'} onClick={() => setTab('inscriptions')}>Inscriptions & paiements</Button>
        <Button variant={tab === 'grille' ? 'primary' : 'ghost'} onClick={() => setTab('grille')}>Grille / échéancier</Button>
      </div>

      {tab === 'inscriptions' && (
        <>
          <Card className="p-4 mb-4">
            <Input placeholder="Rechercher par matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Card>
          <Card className="overflow-hidden">
            {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucune inscription pension." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Élève</th><th>Matricule</th><th>Début</th><th className="text-right">Dû</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-brand-50">
                      <td className="px-4 py-2">{r.student?.full_name || '—'}</td>
                      <td className="font-mono text-xs">{r.matricule}</td>
                      <td>{formatDate(r.date_debut)}</td>
                      <td className="text-right">{r.montant_annee ? formatMoney(r.montant_annee) : '—'}</td>
                      <td className="text-right text-turquoise-600">{formatMoney(r.paye)}</td>
                      <td className="text-right font-medium text-gold-600">{r.reste != null ? formatMoney(r.reste) : '—'}</td>
                      <td className="text-right px-4">
                        {can('versements.create') && (r.reste == null || r.reste > 0) && <button onClick={() => openEnc(r)} className="hover:underline" style={{ color: 'var(--teal)' }}>Encaisser</button>}
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
          {grille.length === 0 ? <EmptyState message="Aucune ligne définie." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Libellé</th><th className="text-right">Montant</th><th className="text-right">Total annuel</th><th>Nb vers.</th><th></th></tr></thead>
              <tbody>
                {grille.map((g) => (
                  <tr key={g.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2">{formatDate(g.date)}</td>
                    <td>{g.libelle || '—'}</td>
                    <td className="text-right">{g.montant ? formatMoney(g.montant) : '—'}</td>
                    <td className="text-right font-medium">{formatMoney(g.montant_total)}</td>
                    <td>{g.nb_versements || '—'}</td>
                    <td className="text-right px-4">{can('config.manage') && <button onClick={() => delGrille(g)} className="text-red-600 hover:underline">Suppr.</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <Modal open={insModal} onClose={() => setInsModal(false)} title="Inscrire un élève à la pension">
        <form onSubmit={inscrire} className="space-y-4">
          <Input label="Rechercher l'élève" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="nom ou matricule" />
          <select className="w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            value={insForm.matricule} onChange={(e) => setInsForm({ ...insForm, matricule: e.target.value })} required>
            <option value="">— Sélectionner l'élève —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} · {s.first_name} {s.last_name}</option>)}
          </select>
          <Input label="Date de début" type="date" value={insForm.date_debut} onChange={(e) => setInsForm({ ...insForm, date_debut: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setInsModal(false)}>Annuler</Button><Button type="submit">Inscrire</Button></div>
        </form>
      </Modal>

      <Modal open={encModal} onClose={() => setEncModal(false)} title="Encaisser un versement pension">
        <form onSubmit={encaisser} className="space-y-4">
          {current && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--surface-2)' }}>
              {current.student?.full_name} · {current.reste != null ? <>Reste : <strong className="text-gold-600">{formatMoney(current.reste)}</strong></> : <>Payé : <strong>{formatMoney(current.paye)}</strong></>}
            </div>
          )}
          <Input label="Montant" type="number" value={encForm.montant} onChange={(e) => setEncForm({ montant: e.target.value })} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEncModal(false)}>Annuler</Button><Button type="submit">Valider</Button></div>
        </form>
      </Modal>

      <Modal open={grilleModal} onClose={() => setGrilleModal(false)} title="Nouvelle ligne de grille pension">
        <form onSubmit={saveGrille} className="space-y-4">
          <Input label="Libellé (option)" value={gForm.libelle} onChange={(e) => setGForm({ ...gForm, libelle: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant (échéance)" type="number" value={gForm.montant} onChange={(e) => setGForm({ ...gForm, montant: e.target.value })} />
            <Input label="Total annuel" type="number" value={gForm.montant_total} onChange={(e) => setGForm({ ...gForm, montant_total: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nb versements (option)" type="number" value={gForm.nb_versements} onChange={(e) => setGForm({ ...gForm, nb_versements: e.target.value })} />
            <Input label="Date" type="date" value={gForm.date} onChange={(e) => setGForm({ ...gForm, date: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setGrilleModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
