import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Select, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'

const MODE = 'car'  // 'destination' | 'car'

export default function ElevesParCarPage() {
  const [items, setItems] = useState([])
  const [destinations, setDestinations] = useState([])
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/transport-eleves').then(({ data }) => setItems(data.data || data)).catch(() => setItems([])),
      api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => setDestinations([])),
      api.get('/transport/buses').then(({ data }) => setBuses(data.data || data)).catch(() => setBuses([])),
    ]).finally(() => setLoading(false))
  }, [])

  const destName = useMemo(() => { const m = {}; destinations.forEach((d) => { m[String(d.id)] = d.libelle }); return m }, [destinations])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((a) => {
      const keyOk = !filter || String(MODE === 'destination' ? a.destination_id : a.immatriculation) === String(filter)
      const searchOk = !q || `${a.matricule} ${a.nom || ''} ${a.prenom || ''}`.toLowerCase().includes(q)
      return keyOk && searchOk
    })
  }, [items, filter, search])

  return (
    <>
      <PageHeader title={MODE === 'destination' ? 'Élèves par destination' : 'Élèves par car'} subtitle={`${filtered.length} élève(s)`} />
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MODE === 'destination' ? (
            <Select label="Destination" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">— Toutes —</option>
              {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
            </Select>
          ) : (
            <Select label="Car" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">— Tous —</option>
              {buses.map((b) => <option key={b.immatriculation} value={b.immatriculation}>{b.immatriculation}</option>)}
            </Select>
          )}
          <Input label="Rechercher un élève (matricule, nom)" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? <EmptyState message="Aucun élève." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Matricule</th><th>Élève</th><th>Classe</th><th>Destination</th><th>Car</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{a.matricule}</td>
                  <td className="font-medium">{a.prenom} {a.nom}</td>
                  <td>{a.classe || '—'}</td>
                  <td>{destName[String(a.destination_id)] || a.destination_id || '—'}</td>
                  <td className="font-mono text-xs">{a.immatriculation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
