import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

export default function OuvertureCaissePage() {
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); return api.get('/caisse-session/current').then(({ data }) => setState(data)).catch((e) => setError(apiError(e))).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const ouvrir = async () => {
    setError(''); setMsg('')
    try { const { data } = await api.post('/caisse-session/open'); setMsg(data.message || 'Caisse ouverte.'); load() }
    catch (e) { setError(e.response?.data?.message || 'Erreur.') }
  }

  return (
    <>
      <PageHeader title="Ouverture de caisse" subtitle="Ouvrir votre caisse pour encaisser" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {msg && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{msg}</div>}
      <Card className="p-6 max-w-lg space-y-4">
        {loading ? <EmptyState message="Chargement…" /> : (
          <>
            <Input label="Date" value={new Date().toLocaleString('fr-FR')} readOnly className="bg-gray-50" />
            <Input label="Caisse (affectée à votre compte)" value={state?.caisse_code || '— aucune —'} readOnly className="font-mono bg-gray-50" />
            {state?.open ? (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                Caisse déjà ouverte depuis le {state.session?.date_ouverture ? new Date(state.session.date_ouverture).toLocaleString('fr-FR') : '—'}. Vous pouvez encaisser.
              </div>
            ) : !state?.caisse_code ? (
              <div className="text-sm text-red-600">Aucune caisse n'est affectée à votre compte. Voir Configuration → Affectation Caisse.</div>
            ) : (
              <Button onClick={ouvrir}>Ouvrir la caisse</Button>
            )}
          </>
        )}
      </Card>
    </>
  )
}
