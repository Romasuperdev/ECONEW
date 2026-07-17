import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

function Kpi({ icon, label, value, tone }) {
  const tones = { teal: 'var(--teal)', gold: 'var(--accent)', navy: 'var(--sidebar)', amber: '#e0912b' }
  const c = tones[tone] || 'var(--teal)'
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="rounded-xl flex items-center justify-center" style={{ width: 46, height: 46, background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-muted truncate">{label}</div>
        <div className="text-2xl font-bold text-heading">{value ?? 0}</div>
      </div>
    </Card>
  )
}

export default function SuperDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/super/dashboard').then(({ data }) => setData(data)).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <EmptyState message="Chargement…" />
  const k = data?.kpis || {}
  const recentes = data?.societes_recentes || []

  return (
    <>
      <PageHeader title="Vue globale" subtitle="Supervision de la plateforme" />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Kpi icon="package" tone="navy" label="Sociétés" value={k.total_societes} />
        <Kpi icon="students" tone="teal" label="Utilisateurs actifs" value={k.total_utilisateurs} />
        <Kpi icon="students" tone="amber" label="Élèves (total)" value={k.total_eleves} />
        <Kpi icon="plans" tone="gold" label="Applications" value={k.total_applications} />
        <Kpi icon="link" tone="teal" label="Affectations" value={k.total_affectations} />
        <Kpi icon="students" tone="navy" label="Comptes (tous)" value={k.total_utilisateurs_all} />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-heading mb-4">Dernières sociétés</h3>
        {recentes.length === 0 ? <EmptyState message="Aucune société." /> : (
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="px-2 py-2">Nom</th><th>Code</th><th>Ville</th><th>Base</th></tr></thead>
            <tbody>
              {recentes.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-2 py-2 font-medium">{s.name}</td>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td>{s.ville || '—'}</td>
                  <td className="text-muted">{s.base || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
