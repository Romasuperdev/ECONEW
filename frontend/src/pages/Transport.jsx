import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'

const TABS = [
  { key: 'inscriptions', label: 'Inscriptions & paiements' },
  { key: 'grille', label: 'Grille tarifaire' },
  { key: 'bus', label: 'Bus' },
  { key: 'chauffeurs', label: 'Chauffeurs' },
  { key: 'affectations', label: 'Affectations' },
]

export default function Transport() {
  const { can } = useAuth()
  const [tab, setTab] = useState('inscriptions')
  const [rows, setRows] = useState([])
  const [grille, setGrille] = useState([])
  const [buses, setBuses] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [affs, setAffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')

  const [modal, setModal] = useState(null) // 'ins' | 'enc' | 'grille' | 'bus' | 'chauffeur' | 'aff'
  const [students, setStudents] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [current, setCurrent] = useState(null)
  const [insForm, setInsForm] = useState({ matricule: '', code_niveau: '', immatriculation: '', mode: '', nbr_mois: '', montant_annee: '', date_debut: new Date().toISOString().slice(0, 10) })
  const [encForm, setEncForm] = useState({ montant: '' })
  const [gForm, setGForm] = useState({ code_niveau: '', mode: '', montant: '', nbr_mois: '', immatriculation: '' })
  const [busForm, setBusForm] = useState({ immatriculation: '', marque: '', modele: '', itineraire: '', destination: '', nb_places: '', conducteur: '', couleur: '', carburant: '', num_serie: '' })
  const [chForm, setChForm] = useState({ nom: '', prenom: '', telephone: '', code: '', num_permis: '', adresse: '', date_naissance: '' })
  const [affForm, setAffForm] = useState({ code_chauffeur: '', immatriculation: '', date_debut: new Date().toISOString().slice(0, 10), date_fin: '' })

  const loadRows = () => api.get('/transport', { params: { search } }).then(({ data }) => setRows(data.data || data))
  const loadAll = () => Promise.all([
    loadRows(),
    api.get('/transport/grille').then(({ data }) => setGrille(data)),
    api.get('/transport/buses').then(({ data }) => setBuses(data)),
    api.get('/transport/chauffeurs').then(({ data }) => setChauffeurs(data)),
    api.get('/transport/affectations').then(({ data }) => setAffs(data)),
  ])

  useEffect(() => { loadAll().finally(() => setLoading(false)) }, [])
  useEffect(() => { const t = setTimeout(loadRows, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    if (modal !== 'ins') return
    const t = setTimeout(() => {
      api.get('/students', { params: { search: studentSearch, per_page: 50 } })
        .then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([]))
    }, 300)
    return () => clearTimeout(t)
  }, [studentSearch, modal])

  const close = () => { setModal(null); setError('') }
  const wrap = (fn) => async (e) => { e.preventDefault(); setError(''); try { await fn(); close() } catch (err) { setError(err.response?.data?.message || 'Erreur.') } }

  const inscrire = wrap(async () => { await api.post('/transport', { ...insForm, nbr_mois: insForm.nbr_mois || null, montant_annee: insForm.montant_annee || null }); loadRows() })
  const encaisser = wrap(async () => { await api.post(`/transport/${current.id}/encaisser`, { montant: Number(encForm.montant) }); loadRows() })
  const saveGrille = wrap(async () => { await api.post('/transport/grille', { ...gForm, montant: Number(gForm.montant), nbr_mois: gForm.nbr_mois || null }); setGrille((await api.get('/transport/grille')).data) })
  const saveBus = wrap(async () => { await api.post('/transport/buses', { ...busForm, nb_places: busForm.nb_places || null }); setBuses((await api.get('/transport/buses')).data) })
  const saveChauffeur = wrap(async () => { await api.post('/transport/chauffeurs', chForm); setChauffeurs((await api.get('/transport/chauffeurs')).data) })
  const saveAff = wrap(async () => { await api.post('/transport/affectations', { ...affForm, date_fin: affForm.date_fin || null }); setAffs((await api.get('/transport/affectations')).data) })

  const delGrille = async (g) => { if (!confirm('Supprimer ce tarif ?')) return; await api.delete(`/transport/grille/${g.id}`); setGrille((await api.get('/transport/grille')).data) }
  const delBus = async (b) => { if (!confirm('Supprimer ce bus ?')) return; await api.delete(`/transport/buses/${b.id}`); setBuses((await api.get('/transport/buses')).data) }
  const delCh = async (c) => { if (!confirm('Supprimer ce chauffeur ?')) return; await api.delete(`/transport/chauffeurs/${c.id}`); setChauffeurs((await api.get('/transport/chauffeurs')).data) }
  const delAff = async (a) => { if (!confirm('Supprimer cette affectation ?')) return; await api.delete(`/transport/affectations/${a.id}`); setAffs((await api.get('/transport/affectations')).data) }

  const chauffeurName = (code) => { const c = chauffeurs.find((x) => String(x.code) === String(code)); return c ? c.full_name : code }

  const headerAction = () => {
    if (tab === 'inscriptions' && can('versements.create')) return <Button onClick={() => { setInsForm({ matricule: '', code_niveau: '', immatriculation: '', mode: '', nbr_mois: '', montant_annee: '', date_debut: new Date().toISOString().slice(0, 10) }); setStudentSearch(''); setError(''); setModal('ins') }}><Icon name="plus" size={16} /> Inscrire au transport</Button>
    if (tab === 'grille' && can('config.manage')) return <Button onClick={() => { setGForm({ code_niveau: '', mode: '', montant: '', nbr_mois: '', immatriculation: '' }); setError(''); setModal('grille') }}><Icon name="plus" size={16} /> Ajouter un tarif</Button>
    if (tab === 'bus' && can('config.manage')) return <Button onClick={() => { setBusForm({ immatriculation: '', marque: '', modele: '', itineraire: '', destination: '', nb_places: '', conducteur: '', couleur: '', carburant: '', num_serie: '' }); setError(''); setModal('bus') }}><Icon name="plus" size={16} /> Ajouter un bus</Button>
    if (tab === 'chauffeurs' && can('config.manage')) return <Button onClick={() => { setChForm({ nom: '', prenom: '', telephone: '', code: '', num_permis: '', adresse: '', date_naissance: '' }); setError(''); setModal('chauffeur') }}><Icon name="plus" size={16} /> Ajouter un chauffeur</Button>
    if (tab === 'affectations' && can('config.manage')) return <Button onClick={() => { setAffForm({ code_chauffeur: '', immatriculation: '', date_debut: new Date().toISOString().slice(0, 10), date_fin: '' }); setError(''); setModal('aff') }}><Icon name="plus" size={16} /> Affecter chauffeur au bus</Button>
    return null
  }

  return (
    <>
      <PageHeader title="Transport" subtitle="Frais, bus, chauffeurs et circuits" action={headerAction()} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((t) => <Button key={t.key} variant={tab === t.key ? 'primary' : 'ghost'} onClick={() => setTab(t.key)}>{t.label}</Button>)}
      </div>

      {tab === 'inscriptions' && (
        <>
          <Card className="p-4 mb-4"><Input placeholder="Rechercher par matricule…" value={search} onChange={(e) => setSearch(e.target.value)} /></Card>
          <Card className="overflow-hidden">
            {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucune inscription transport." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Élève</th><th>Matricule</th><th>Bus</th><th className="text-right">Dû</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th></th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-brand-50">
                      <td className="px-4 py-2">{r.student?.full_name || '—'}</td>
                      <td className="font-mono text-xs">{r.matricule}</td>
                      <td>{r.immatriculation || '—'}</td>
                      <td className="text-right">{formatMoney(r.montant_annee)}</td>
                      <td className="text-right text-turquoise-600">{formatMoney(r.paye)}</td>
                      <td className="text-right font-medium text-gold-600">{formatMoney(r.reste)}</td>
                      <td className="text-right px-4">{can('versements.create') && r.reste > 0 && <button onClick={() => { setCurrent(r); setEncForm({ montant: '' }); setError(''); setModal('enc') }} className="hover:underline" style={{ color: 'var(--teal)' }}>Encaisser</button>}</td>
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
          {grille.length === 0 ? <EmptyState message="Aucun tarif." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Niveau</th><th>Mode</th><th>Nb mois</th><th>Bus</th><th className="text-right">Montant</th><th></th></tr></thead>
              <tbody>{grille.map((g) => (
                <tr key={g.id} className="border-t hover:bg-brand-50"><td className="px-4 py-2">{g.code_niveau}</td><td>{g.mode || '—'}</td><td>{g.nbr_mois || '—'}</td><td>{g.immatriculation || '—'}</td><td className="text-right font-medium">{formatMoney(g.montant)}</td><td className="text-right px-4">{can('config.manage') && <button onClick={() => delGrille(g)} className="text-red-600 hover:underline">Suppr.</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'bus' && (
        <Card className="overflow-hidden">
          {buses.length === 0 ? <EmptyState message="Aucun bus." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Immatriculation</th><th>Marque / Modèle</th><th>Itinéraire</th><th>Destination</th><th className="text-center">Places</th><th></th></tr></thead>
              <tbody>{buses.map((b) => (
                <tr key={b.id} className="border-t hover:bg-brand-50"><td className="px-4 py-2 font-medium">{b.immatriculation}</td><td>{[b.marque, b.modele].filter(Boolean).join(' ') || '—'}</td><td>{b.itineraire || '—'}</td><td>{b.destination || '—'}</td><td className="text-center">{b.nb_places_occupees ?? 0}/{b.nb_places ?? '—'}</td><td className="text-right px-4">{can('config.manage') && <button onClick={() => delBus(b)} className="text-red-600 hover:underline">Suppr.</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'chauffeurs' && (
        <Card className="overflow-hidden">
          {chauffeurs.length === 0 ? <EmptyState message="Aucun chauffeur." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Nom</th><th>Téléphone</th><th>Code</th><th>N° permis</th><th></th></tr></thead>
              <tbody>{chauffeurs.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50"><td className="px-4 py-2 font-medium">{c.full_name}</td><td>{c.telephone || '—'}</td><td>{c.code || '—'}</td><td>{c.num_permis || '—'}</td><td className="text-right px-4">{can('config.manage') && <button onClick={() => delCh(c)} className="text-red-600 hover:underline">Suppr.</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'affectations' && (
        <Card className="overflow-hidden">
          {affs.length === 0 ? <EmptyState message="Aucune affectation." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Chauffeur</th><th>Bus</th><th>Début</th><th>Fin</th><th></th></tr></thead>
              <tbody>{affs.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50"><td className="px-4 py-2">{chauffeurName(a.code_chauffeur)}</td><td>{a.immatriculation}</td><td>{formatDate(a.date_debut)}</td><td>{a.date_fin ? formatDate(a.date_fin) : '—'}</td><td className="text-right px-4">{can('config.manage') && <button onClick={() => delAff(a)} className="text-red-600 hover:underline">Suppr.</button>}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {/* Modale inscription */}
      <Modal open={modal === 'ins'} onClose={close} title="Inscrire un élève au transport">
        <form onSubmit={inscrire} className="space-y-4">
          <Input label="Rechercher l'élève" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="nom ou matricule" />
          <select className="w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={insForm.matricule} onChange={(e) => { const s = students.find((x) => x.matricule === e.target.value); setInsForm({ ...insForm, matricule: e.target.value, code_niveau: s?.code_niveau || insForm.code_niveau }) }} required>
            <option value="">— Sélectionner l'élève —</option>
            {students.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} · {s.first_name} {s.last_name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Niveau" value={insForm.code_niveau} onChange={(e) => setInsForm({ ...insForm, code_niveau: e.target.value })} />
            <select className="w-full rounded-xl border px-3 py-2 text-sm mt-6" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={insForm.immatriculation} onChange={(e) => setInsForm({ ...insForm, immatriculation: e.target.value })}>
              <option value="">— Bus / circuit —</option>
              {buses.map((b) => <option key={b.id} value={b.immatriculation}>{b.immatriculation} · {b.itineraire || b.destination || ''}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nb mois (option)" type="number" value={insForm.nbr_mois} onChange={(e) => setInsForm({ ...insForm, nbr_mois: e.target.value })} />
            <Input label="Montant (sinon grille)" type="number" value={insForm.montant_annee} onChange={(e) => setInsForm({ ...insForm, montant_annee: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Inscrire</Button></div>
        </form>
      </Modal>

      {/* Modale encaissement */}
      <Modal open={modal === 'enc'} onClose={close} title="Encaisser un versement transport">
        <form onSubmit={encaisser} className="space-y-4">
          {current && <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--surface-2)' }}>{current.student?.full_name} · Reste : <strong className="text-gold-600">{formatMoney(current.reste)}</strong></div>}
          <Input label="Montant" type="number" value={encForm.montant} onChange={(e) => setEncForm({ montant: e.target.value })} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Valider</Button></div>
        </form>
      </Modal>

      {/* Modale grille */}
      <Modal open={modal === 'grille'} onClose={close} title="Nouveau tarif transport">
        <form onSubmit={saveGrille} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Niveau" value={gForm.code_niveau} onChange={(e) => setGForm({ ...gForm, code_niveau: e.target.value })} required />
            <Input label="Mode (option)" value={gForm.mode} onChange={(e) => setGForm({ ...gForm, mode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Montant" type="number" value={gForm.montant} onChange={(e) => setGForm({ ...gForm, montant: e.target.value })} required />
            <Input label="Nb mois (option)" type="number" value={gForm.nbr_mois} onChange={(e) => setGForm({ ...gForm, nbr_mois: e.target.value })} />
          </div>
          <select className="w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={gForm.immatriculation} onChange={(e) => setGForm({ ...gForm, immatriculation: e.target.value })}>
            <option value="">— Bus (option) —</option>
            {buses.map((b) => <option key={b.id} value={b.immatriculation}>{b.immatriculation}</option>)}
          </select>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      {/* Modale bus */}
      <Modal open={modal === 'bus'} onClose={close} title="Nouveau bus">
        <form onSubmit={saveBus} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Immatriculation" value={busForm.immatriculation} onChange={(e) => setBusForm({ ...busForm, immatriculation: e.target.value })} required />
            <Input label="Marque" value={busForm.marque} onChange={(e) => setBusForm({ ...busForm, marque: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Modèle" value={busForm.modele} onChange={(e) => setBusForm({ ...busForm, modele: e.target.value })} />
            <Input label="Nb places" type="number" value={busForm.nb_places} onChange={(e) => setBusForm({ ...busForm, nb_places: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Itinéraire" value={busForm.itineraire} onChange={(e) => setBusForm({ ...busForm, itineraire: e.target.value })} />
            <Input label="Destination" value={busForm.destination} onChange={(e) => setBusForm({ ...busForm, destination: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      {/* Modale chauffeur */}
      <Modal open={modal === 'chauffeur'} onClose={close} title="Nouveau chauffeur">
        <form onSubmit={saveChauffeur} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={chForm.nom} onChange={(e) => setChForm({ ...chForm, nom: e.target.value })} required />
            <Input label="Prénom" value={chForm.prenom} onChange={(e) => setChForm({ ...chForm, prenom: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Téléphone" value={chForm.telephone} onChange={(e) => setChForm({ ...chForm, telephone: e.target.value })} />
            <Input label="Code chauffeur" value={chForm.code} onChange={(e) => setChForm({ ...chForm, code: e.target.value })} />
          </div>
          <Input label="N° permis" value={chForm.num_permis} onChange={(e) => setChForm({ ...chForm, num_permis: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      {/* Modale affectation */}
      <Modal open={modal === 'aff'} onClose={close} title="Affecter un chauffeur à un bus">
        <form onSubmit={saveAff} className="space-y-4">
          <select className="w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={affForm.code_chauffeur} onChange={(e) => setAffForm({ ...affForm, code_chauffeur: e.target.value })} required>
            <option value="">— Chauffeur —</option>
            {chauffeurs.map((c) => <option key={c.id} value={c.code || c.id}>{c.full_name}</option>)}
          </select>
          <select className="w-full rounded-xl border px-3 py-2 text-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }} value={affForm.immatriculation} onChange={(e) => setAffForm({ ...affForm, immatriculation: e.target.value })} required>
            <option value="">— Bus —</option>
            {buses.map((b) => <option key={b.id} value={b.immatriculation}>{b.immatriculation} · {b.itineraire || ''}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Début" type="date" value={affForm.date_debut} onChange={(e) => setAffForm({ ...affForm, date_debut: e.target.value })} />
            <Input label="Fin (option)" type="date" value={affForm.date_fin} onChange={(e) => setAffForm({ ...affForm, date_fin: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={close}>Annuler</Button><Button type="submit">Affecter</Button></div>
        </form>
      </Modal>
    </>
  )
}
