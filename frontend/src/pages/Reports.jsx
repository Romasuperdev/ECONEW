import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate } from '../utils/format'
import { downloadFile } from '../utils/download'

const COLORS = ['#1B2A4A', '#D9A441', '#2E9C9C', '#5A6B7B', '#7f9fc6', '#c28c2c']

export default function Reports() {
  const firstOfMonth = new Date(); firstOfMonth.setDate(1)
  const [from, setFrom] = useState(firstOfMonth.toISOString().slice(0, 10))
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState(null)
  const [debtors, setDebtors] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/reports/summary', { params: { from, to } }).then(({ data }) => setSummary(data)),
      api.get('/reports/debtors').then(({ data }) => setDebtors(data)).catch(() => setDebtors([])),
    ]).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const kpi = (label, value, accent) => (
    <Card className="p-5"><div className="text-sm text-ink">{label}</div><div className={`text-2xl font-bold mt-1 ${accent}`}>{value}</div></Card>
  )

  const totalDebt = debtors.reduce((s, d) => s + Number(d.solde_du || 0), 0)
  const q = `from=${from}&to=${to}`

  return (
    <>
      <PageHeader title="Rapports financiers" subtitle="Analyse et exports" />

      <Card className="p-4 mb-6 flex flex-wrap items-end gap-3">
        <Input label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Button onClick={load}>Appliquer</Button>
        <div className="flex-1" />
        <Button variant="ghost" onClick={() => downloadFile(`/reports/export/summary-pdf?${q}`, 'rapport.pdf')}>⬇ Rapport PDF</Button>
        <Button variant="ghost" onClick={() => downloadFile(`/reports/export/summary-xlsx?${q}`, 'rapport.xls')}>⬇ Rapport Excel</Button>
        <Button variant="ghost" onClick={() => downloadFile(`/reports/export/payments?${q}`, 'paiements.csv')}>⬇ Recettes CSV</Button>
        <Button variant="ghost" onClick={() => downloadFile(`/reports/export/expenses?${q}`, 'depenses.csv')}>⬇ Dépenses CSV</Button>
      </Card>

      {loading || !summary ? <EmptyState message="Chargement…" /> : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {kpi('Recettes', formatMoney(summary.recettes), 'text-turquoise-600')}
            {kpi('Dépenses', formatMoney(summary.depenses), 'text-red-600')}
            {kpi('Solde net', formatMoney(summary.solde), 'text-brand-800')}
            {kpi('Total impayés', formatMoney(totalDebt), 'text-gold-600')}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Recettes par mode de paiement</h3>
              {summary.recettes_par_mode?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={summary.recettes_par_mode} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={90} label={(e) => e.method}>
                      {summary.recettes_par_mode.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => formatMoney(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Dépenses par catégorie</h3>
              {summary.depenses_par_categorie?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={summary.depenses_par_categorie} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                    <YAxis type="category" dataKey="category" fontSize={10} width={110} />
                    <Tooltip formatter={(v) => formatMoney(v)} />
                    <Bar dataKey="total" fill="#D9A441" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState message="Aucune dépense sur la période." />}
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">Recettes par jour</h3>
              {summary.recettes_par_jour?.length ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={summary.recettes_par_jour}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="jour" fontSize={10} tickFormatter={(d) => formatDate(d)} />
                    <YAxis fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v) => formatMoney(v)} labelFormatter={(d) => formatDate(d)} />
                    <Bar dataKey="total" fill="#2E9C9C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyState />}
            </Card>
            <Card className="p-5 flex flex-col justify-center">
              <h3 className="font-semibold mb-4">Équilibre recettes / dépenses</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[{ name: 'Période', Recettes: summary.recettes, Dépenses: summary.depenses }]}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} />
                  <YAxis fontSize={10} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatMoney(v)} />
                  <Bar dataKey="Recettes" fill="#2E9C9C" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dépenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Élèves débiteurs ({debtors.length})</div>
            {debtors.length === 0 ? <EmptyState message="Aucun impayé." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Élève</th><th>Matricule</th><th className="text-center">Impayés</th><th className="text-right">Solde dû</th></tr></thead>
                <tbody>
                  {debtors.map((d) => (
                    <tr key={d.student_id} className="border-t">
                      <td className="px-4 py-2">{d.student?.first_name} {d.student?.last_name}</td>
                      <td className="text-ink">{d.student?.matricule}</td>
                      <td className="text-center">{d.nb_factures}</td>
                      <td className="text-right font-medium text-gold-600">{formatMoney(d.solde_du)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}
    </>
  )
}
