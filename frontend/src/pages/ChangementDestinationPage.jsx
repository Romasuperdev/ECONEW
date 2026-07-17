import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Select, Modal, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

export default function ChangementDestinationPage() {
  const [items, setItems] = useState([])
  const [destinations, setDestinations] = useState([])
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // affectation en cours
  const [dest, setDest] = useState('')
  const [bus, setBus] = useState('')
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/transport-eleves').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => setDestinations([])),
    api.get('/transport/buses').then(({ data }) => setBuses(data.data || data)).catch(() => setBuses([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const destName = useMemo(() => { const m = {}; destinations.forEach((d) => { m[String(d.id)] = d.libelle }); return m }, [destinations])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((a) => `${a.matricule} ${a.nom || ''} ${a.prenom || ''}`.toLowerCase().includes(q))
  }, [items, search])

  const open = (a) => { setModal(a); setDest(String(a.destination_id ?? '')); setBus(a.immatriculation || ''); setError('') }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.put(`/transport-eleves/${modal.id}`, {
        matricule: modal.matricule, nom: modal.nom, prenom: modal.prenom, classe: modal.classe,
        destination_id: dest || null, immatriculation: bus || null,
      })
      setModal(null); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  return (
    <>
      <PageHeader title="Changement de destination" subtitle="Modifier la destination (et le car) d'un élève" />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b"><Input placeholder="Rechercher (matricule, nom)…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? <EmptyState message="Aucune affectation transport." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Matricule</th><th>Élève</th><th>Classe</th><th>Destination actuelle</th><th>Car</th><th></th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{a.matricule}</td>
                  <td className="font-medium">{a.prenom} {a.nom}</td>
                  <td>{a.classe || '—'}</td>
                  <td>{destName[String(a.destination_id)] || a.destination_id || '—'}</td>
                  <td>{a.immatriculation || '—'}</td>
                  <td className="text-right px-4"><button onClick={() => open(a)} className="hover:underline" style={{ color: 'var(--teal)' }}>Changer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={!!modal} onClose={() => setModal(null)} title={`Changer la destination — ${modal ? modal.prenom + ' ' + modal.nom : ''}`}>
        {modal && (
          <form onSubmit={save} className="space-y-4">
            <Select label="Nouvelle destination" value={dest} onChange={(e) => setDest(e.target.value)}>
              <option value="">— Choisir —</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
            </Select>
            <Select label="Car" value={bus} onChange={(e) => setBus(e.target.value)}>
              <option value="">— Choisir —</option>
              {buses.map((b) => <option key={b.immatriculation} value={b.immatriculation}>{b.immatriculation}</option>)}
            </Select>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
          </form>
        )}
      </Modal>
    </>
  )
}
