import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney, formatDate } from '../utils/format'
import { apiError } from '../utils/apiError'

export default function PointCaissePage() {
  const [state, setState] = useState(null)
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/caisse-session/current').then(({ data }) => setState(data)).catch(() => {}),
      api.get('/versements', { params: { per_page: 1000 } }).then(({ data }) => setVersements(data.data || data)).catch((e) => setLoadError(apiError(e))),
    ]).finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => versements.filter((v) =>
    String(v.caisse) === String(state?.caisse_code) &&
    v.paid_at && String(v.paid_at).slice(0, 10) === date
  ), [versements, state, date])
  const total = useMemo(() => rows.reduce((s, v) => s + Number(v.amount || 0), 0), [rows])

  const byMode = useMemo(() => {
    const m = {}; rows.forEach((v) => { const k = v.method || 'Autre'; m[k] = (m[k] || 0) + Number(v.amount || 0) }); return m
  }, [rows])

  return (
    <>
      <PageHeader title="Point de caisse" subtitle={`Caisse ${state?.caisse_code || '—'}`} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-4"><Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Card>
        <Card className="p-5"><div className="text-sm text-ink">Total encaissé</div><div className="text-2xl font-bold text-turquoise-600">{formatMoney(total)}</div></Card>
        <Card className="p-5"><div className="text-sm text-ink">Nombre de versements</div><div className="text-2xl font-bold text-heading">{rows.length}</div></Card>
      </div>
      {Object.keys(byMode).length > 0 && (
        <Card className="p-4 mb-4">
          <div className="font-semibold text-sm mb-2">Par mode de règlement</div>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(byMode).map(([k, v]) => <div key={k}>{k} : <strong>{formatMoney(v)}</strong></div>)}
          </div>
        </Card>
      )}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun encaissement pour cette date." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Reçu</th><th>Élève</th><th>Motif</th><th>Mode</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{v.receipt_number || v.id}</td>
                  <td className="font-medium">{v.full_name || v.matricule}</td>
                  <td>{v.libelle || '—'}</td>
                  <td>{v.method || '—'}</td>
                  <td className="text-right font-medium text-turquoise-600">{formatMoney(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
