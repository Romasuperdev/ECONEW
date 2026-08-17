import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

export default function ReinscriptionTransportPage() {
  const [students, setStudents] = useState([])
  const [destinations, setDestinations] = useState([])
  const [buses, setBuses] = useState([])
  const [registered, setRegistered] = useState(() => new Set()) // matricules déjà inscrits cette année
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState({}) // matricule -> true
  const [destination_id, setDest] = useState('')
  const [immatriculation, setBus] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState('')

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/students', { params: { per_page: 1000 } }).then(({ data }) => setStudents(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => setDestinations([])),
      api.get('/transport/buses').then(({ data }) => setBuses(data.data || data)).catch(() => setBuses([])),
      api.get('/transport-eleves').then(({ data }) => setRegistered(new Set((data.data || data).map((a) => String(a.matricule))))).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => `${s.matricule} ${s.full_name || ''} ${s.first_name || ''} ${s.last_name || ''}`.toLowerCase().includes(q))
  }, [students, search])

  const toggle = (mat) => {
    if (registered.has(String(mat))) return // déjà inscrit cette année : non sélectionnable
    setSelected((s) => ({ ...s, [mat]: !s[mat] }))
  }
  const count = Object.values(selected).filter(Boolean).length

  const reinscrire = async () => {
    setDone(''); setLoadError('')
    const mats = Object.keys(selected).filter((m) => selected[m] && !registered.has(String(m)))
    if (mats.length === 0) { setLoadError('Sélectionnez au moins un élève non déjà inscrit.'); return }
    setSaving(true)
    let ok = 0, deja = 0
    const newReg = new Set(registered)
    for (const mat of mats) {
      const s = students.find((x) => String(x.matricule) === String(mat))
      try {
        await api.post('/transport-eleves', {
          matricule: mat, nom: s?.last_name || '', prenom: s?.first_name || '', classe: s?.school_class_id || '',
          destination_id: destination_id || null, immatriculation: immatriculation || null,
        })
        ok++; newReg.add(String(mat))
      } catch (e) {
        if (e.response?.data?.deja_inscrit) { deja++; newReg.add(String(mat)) }
      }
    }
    setSaving(false); setSelected({}); setRegistered(newReg)
    setDone(`${ok} élève(s) réinscrit(s) au transport.` + (deja ? ` ${deja} déjà inscrit(s) cette année, ignoré(s).` : ''))
  }

  return (
    <>
      <PageHeader title="Réinscription transport" subtitle="Sélectionnez les élèves à réinscrire" />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      {done && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{done}</div>}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select label="Destination" value={destination_id} onChange={(e) => setDest(e.target.value)}>
            <option value="">— Choisir —</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </Select>
          <Select label="Car" value={immatriculation} onChange={(e) => setBus(e.target.value)}>
            <option value="">— Choisir —</option>
            {buses.map((b) => <option key={b.immatriculation} value={b.immatriculation}>{b.immatriculation}</option>)}
          </Select>
          <div className="flex items-end">
            <Button onClick={reinscrire} disabled={saving || count === 0}>{saving ? 'Traitement…' : `Réinscrire (${count})`}</Button>
          </div>
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b"><Input placeholder="Rechercher un élève (matricule, nom)…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? <EmptyState message="Aucun élève." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2 w-10"></th><th>Matricule</th><th>Élève</th><th>Classe</th><th>Statut</th></tr></thead>
            <tbody>
              {filtered.map((s) => {
                const isReg = registered.has(String(s.matricule))
                return (
                <tr key={s.matricule} className={`border-t ${isReg ? 'opacity-60' : 'hover:bg-brand-50 cursor-pointer'}`} onClick={() => toggle(s.matricule)}>
                  <td className="px-4 py-2"><input type="checkbox" disabled={isReg} checked={!!selected[s.matricule]} onChange={() => toggle(s.matricule)} className="h-4 w-4" /></td>
                  <td className="font-mono text-xs">{s.matricule}</td>
                  <td className="font-medium">{s.full_name || `${s.first_name} ${s.last_name}`}</td>
                  <td>{s.school_class_id || '—'}</td>
                  <td>{isReg
                    ? <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#fdecec', color: '#b23b28' }}>Déjà inscrit (année en cours)</span>
                    : <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>}</td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
