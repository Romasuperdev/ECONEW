import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Card, Button, Input, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'

const statutLabel = (v) => ({ '1': 'Inactif', '2': 'Actif', '3': 'Diplômé', '4': 'Transféré' }[String(v)] || v || '—')

export default function Students() {
  const nav = useNavigate()
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/students', { params: { search, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  const remove = async (id) => { if (!confirm('Supprimer cet élève ?')) return; await api.delete(`/students/${id}`); load() }

  return (
    <>
      <PageHeader title="Élèves" subtitle={`${items.length} élève(s)`}
        action={<Button onClick={() => nav('/eleves/nouveau')}>+ Nouvel élève</Button>} />

      <Card className="p-4 mb-4">
        <Input placeholder="Rechercher par nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Matricule</th><th>Nom complet</th><th>Classe</th>
                <th>Parent / tuteur</th><th>Téléphone</th><th className="text-right">Scolarité</th><th className="text-right">Reste</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{s.matricule}</td>
                  <td className="font-medium">{s.first_name} {s.last_name}</td>
                  <td>{s.school_class?.name || '—'}</td>
                  <td className="text-slate-500">{s.guardian_name || s.mother_name || '—'}</td>
                  <td className="text-slate-500">{s.father_phone || s.mother_phone || '—'}</td>
                  <td className="text-right">{formatMoney(s.scolarite)}</td>
                  <td className="text-right font-medium text-gold-600">{formatMoney((Number(s.scolarite) || 0) - (Number(s.total_paye) || 0))}</td>
                  <td><Badge value={statutLabel(s.status)} /></td>
                  <td className="text-right px-4 space-x-2 whitespace-nowrap">
                    <button onClick={() => nav(`/eleves/${s.matricule}/modifier`)} className="text-brand-600 hover:underline">Modifier</button>
                    <button onClick={() => remove(s.id)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
