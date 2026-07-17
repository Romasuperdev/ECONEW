import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString()

export default function FermetureCaissePage() {
  const [state, setState] = useState(null)
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); return Promise.all([
    api.get('/caisse-session/current').then(({ data }) => setState(data)).catch((e) => setError(apiError(e))),
    api.get('/versements', { params: { per_page: 1000 } }).then(({ data }) => setVersements(data.data || data)).catch(() => setVersements([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const jour = useMemo(() => versements.filter((v) => String(v.caisse) === String(state?.caisse_code) && isToday(v.paid_at)), [versements, state])
  const total = useMemo(() => jour.reduce((s, v) => s + Number(v.amount || 0), 0), [jour])

  const fermer = async () => {
    setError(''); setMsg('')
    try { const { data } = await api.post('/caisse-session/close'); setMsg(data.message || 'Caisse fermée.'); load() }
    catch (e) { setError(e.response?.data?.message || 'Erreur.') }
  }

  return (
    <>
      <PageHeader title="Fermeture de caisse" subtitle="Clôturer la session de caisse" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {msg && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{msg}</div>}
      <Card className="p-6 max-w-lg space-y-4">
        {loading ? <EmptyState message="Chargement…" /> : !state?.open ? (
          <EmptyState message="Aucune caisse ouverte." />
        ) : (
          <>
            <Input label="Caisse" value={state.caisse_code || ''} readOnly className="font-mono bg-gray-50" />
            <Input label="Ouverte depuis" value={state.session?.date_ouverture ? new Date(state.session.date_ouverture).toLocaleString('fr-FR') : ''} readOnly className="bg-gray-50" />
            <div className="rounded-lg px-4 py-3" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <div className="text-sm text-ink">Encaissé aujourd'hui</div>
              <div className="text-2xl font-bold text-turquoise-600">{formatMoney(total)}</div>
              <div className="text-xs text-ink">{jour.length} versement(s)</div>
            </div>
            <Button onClick={fermer}>Fermer la caisse</Button>
          </>
        )}
      </Card>
    </>
  )
}
