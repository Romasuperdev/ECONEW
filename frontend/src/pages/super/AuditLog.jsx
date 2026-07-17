import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Input, Select, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'

const actionColors = {
  login: 'bg-turquoise-500/15 text-turquoise-600',
  logout: 'bg-slate-100 text-slate-600',
  create: 'bg-green-100 text-green-700',
  update: 'bg-amber-100 text-amber-700',
  delete: 'bg-red-100 text-red-700',
}

export default function AuditLog() {
  const [items, setItems] = useState([])
  const [action, setAction] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    api.get('/super/audit-logs', { params: { action, search, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [action, search])

  return (
    <>
      <PageHeader title="Journal d'audit" subtitle="Historique des actions sur la plateforme" />

      <Card className="p-4 mb-4 flex gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="max-w-xs">
          <option value="">Toutes les actions</option>
          <option value="login">Connexion</option><option value="logout">Déconnexion</option>
          <option value="create">Création</option><option value="update">Modification</option><option value="delete">Suppression</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-3">Date</th><th>Utilisateur</th><th>Action</th><th>Description</th><th>IP</th></tr>
            </thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-4 py-2.5 whitespace-nowrap text-ink text-xs">{new Date(l.created_at).toLocaleString('fr-FR')}</td>
                  <td>{l.user?.name || '—'}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[l.action] || 'bg-slate-100 text-slate-600'}`}>{l.action}</span></td>
                  <td>{l.description}</td>
                  <td className="text-ink text-xs font-mono">{l.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
