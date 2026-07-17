import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatDate } from '../utils/format'

const actionLabel = {
  login: 'Connexion', logout: 'Déconnexion', create: 'Création',
  update: 'Modification', delete: 'Suppression', cancel: 'Annulation',
}

export default function Activity() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/my-activity').then(({ data }) => setItems(data || [])).catch(() => setItems([])).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader title="Mon activité" subtitle="Historique de vos actions" />
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune activité enregistrée." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Action</th><th>Détail</th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDate(a.date)}</td>
                  <td><Badge value={actionLabel[a.action] || a.action} /></td>
                  <td>{a.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
