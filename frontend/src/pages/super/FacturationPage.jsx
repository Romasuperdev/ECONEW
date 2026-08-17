import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Select, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatMoney } from '../../utils/format'
import { apiError } from '../../utils/apiError'

const badge = (s) => {
  const map = {
    paye: ['#e6f6ec', '#1b7a37', 'Payé'],
    impaye: ['#fdecec', '#b23b28', 'Impayé'],
    en_retard: ['#fef6e6', '#a9761a', 'En retard'],
  }
  const [bg, c, t] = map[s] || ['#eef2f7', '#5c6b82', s || '—']
  return <span style={{ background: bg, color: c, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{t}</span>
}

export default function FacturationPage() {
  const [rows, setRows] = useState([])
  const [totalReste, setTotalReste] = useState(0)
  const [statut, setStatut] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/super/facturation/impayes', { params: statut ? { statut } : {} })
      .then(({ data }) => { setRows(data.data || []); setTotalReste(data.total_reste || 0) })
      .catch((e) => { setRows([]); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [statut])

  const compteurs = useMemo(() => {
    const c = { impaye: 0, en_retard: 0 }
    rows.forEach((r) => { c[r.statut_paiement] = (c[r.statut_paiement] || 0) + 1 })
    return c
  }, [rows])

  return (
    <>
      <PageHeader title="Facturation — Impayés" subtitle={`${rows.length} abonnement(s) non soldé(s) · Reste ${formatMoney(totalReste)}`} />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-4"><div className="text-xs text-ink">Impayés</div><div className="text-2xl font-bold" style={{ color: '#b23b28' }}>{compteurs.impaye || 0}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink">En retard</div><div className="text-2xl font-bold" style={{ color: '#a9761a' }}>{compteurs.en_retard || 0}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink">Total reste à recouvrer</div><div className="text-2xl font-bold" style={{ color: 'var(--teal)' }}>{formatMoney(totalReste)}</div></Card>
      </div>

      <Card className="p-4 mb-4">
        <div className="max-w-xs">
          <Select label="Filtrer par statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
            <option value="">Tous les non soldés</option>
            <option value="impaye">Impayé</option>
            <option value="en_retard">En retard</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun abonnement impayé. 🎉" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Établissement</th><th>Formule</th><th className="text-right">Montant</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th>Échéance</th><th>Statut</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-medium">{r.etablissement || '—'}</td>
                    <td>{r.plan || '—'}</td>
                    <td className="text-right">{formatMoney(r.montant)}</td>
                    <td className="text-right" style={{ color: 'var(--teal)' }}>{formatMoney(r.paye)}</td>
                    <td className="text-right font-semibold text-red-600">{formatMoney(r.reste)}</td>
                    <td>{r.date_fin || '—'}</td>
                    <td>{badge(r.statut_paiement)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
