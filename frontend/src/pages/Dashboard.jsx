import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import api from '../api/client'
import { Card, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'
import { formatMoney, formatDate } from '../utils/format'

const COLORS = ['#1B2A4A', '#D9A441', '#2E9C9C', '#5A6B7B', '#7f9fc6', '#c28c2c']

function Kpi({ icon, label, value, tone }) {
  const tones = { teal: 'var(--teal)', gold: 'var(--accent)', navy: 'var(--sidebar)', red: '#dc2626', amber: '#e0912b' }
  const c = tones[tone] || 'var(--teal)'
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="rounded-xl flex items-center justify-center" style={{ width: 46, height: 46, background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
        <Icon name={icon} size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-sm text-muted truncate">{label}</div>
        <div className="text-xl font-bold text-heading truncate">{value}</div>
      </div>
    </Card>
  )
}

export default function Dashboard() {
  const { user, can } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard').then(({ data }) => setData(data)).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <EmptyState message="Chargement du tableau de bord…" />
  if (!data) return <EmptyState message="Impossible de charger les données." />

  const { kpis, evolution, recettes_par_type, derniers_paiements } = data
  const recouvrement = kpis.recettes + kpis.impayes > 0 ? Math.round((kpis.recettes / (kpis.recettes + kpis.impayes)) * 100) : 0
  const axis = 'var(--muted)'

  // Visibilite adaptee au role
  const seeRecettes = can('versements.create') || can('treasury.view') || can('reports.view')
  const seeDepenses = can('expenses.manage') || can('reports.view')
  const seeSolde = can('treasury.view') || can('reports.view')
  const seeImpayes = can('reports.view') || can('invoices.manage')
  const seeEleves = can('students.manage') || can('config.manage') || can('reports.view')
  const seeReports = can('reports.view')
  const seeDerniers = can('versements.create') || can('reports.view')

  const kpiCards = [
    seeRecettes && <Kpi key="r" icon="treasury" tone="teal" label="Recettes encaissées" value={formatMoney(kpis.recettes)} />,
    seeDepenses && <Kpi key="d" icon="expenses" tone="red" label="Dépenses" value={formatMoney(kpis.depenses)} />,
    seeSolde && <Kpi key="s" icon="payments" tone="navy" label="Solde de trésorerie" value={formatMoney(kpis.solde)} />,
    seeImpayes && <Kpi key="i" icon="invoices" tone="amber" label="Impayés" value={formatMoney(kpis.impayes)} />,
    seeEleves && <Kpi key="e" icon="students" tone="teal" label="Élèves" value={kpis.nb_eleves} />,
    seeReports && <Kpi key="t" icon="reports" tone="gold" label="Taux de recouvrement" value={`${recouvrement}%`} />,
  ].filter(Boolean)

  return (
    <>
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble adaptée à votre rôle" />

      {kpiCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{kpiCards}</div>
      )}

      {seeReports && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-semibold text-heading mb-4">Recettes vs Dépenses (6 mois)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="mois" fontSize={12} stroke={axis} />
                <YAxis fontSize={11} stroke={axis} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} />
                <Legend />
                <Bar dataKey="recettes" name="Recettes" fill="#2E9C9C" radius={[4, 4, 0, 0]} />
                <Bar dataKey="depenses" name="Dépenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-heading mb-4">Recettes par type</h3>
            {recettes_par_type?.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={recettes_par_type} dataKey="montant" nameKey="type" cx="50%" cy="50%" outerRadius={90} label>
                    {recettes_par_type.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatMoney(v)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState />}
          </Card>
        </div>
      )}

      {seeDerniers && (
        <Card className="p-5">
          <h3 className="font-semibold text-heading mb-4">Derniers paiements</h3>
          {derniers_paiements?.length ? (
            <table className="w-full text-sm">
              <thead className="text-left"><tr><th className="py-2 px-2">Élève</th><th>Matricule</th><th>Date</th><th className="text-right px-2">Montant</th></tr></thead>
              <tbody>
                {derniers_paiements.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 px-2">{p.student?.first_name} {p.student?.last_name}</td>
                    <td className="text-muted">{p.student?.matricule}</td>
                    <td>{formatDate(p.paid_at)}</td>
                    <td className="text-right px-2 font-medium">{formatMoney(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyState message="Aucun paiement enregistré." />}
        </Card>
      )}

      {kpiCards.length === 0 && !seeReports && !seeDerniers && (
        <EmptyState message={`Bienvenue ${user?.name || ''}. Utilisez le menu pour accéder à votre espace.`} />
      )}
    </>
  )
}
