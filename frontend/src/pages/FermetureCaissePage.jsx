import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const isToday = (d) => d && new Date(d).toDateString() === new Date().toDateString()

export default function FermetureCaissePage() {
  const [state, setState] = useState(null)     // session de la caisse sélectionnée
  const [caisses, setCaisses] = useState([])
  const [selected, setSelected] = useState('') // caisse à fermer
  const [versements, setVersements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [pwd, setPwd] = useState('')

  const init = () => { setLoading(true); return Promise.all([
    api.get('/caisse-session/current').then(({ data }) => { setState(data); if (data.open && data.caisse_code) setSelected(data.caisse_code) }).catch((e) => setError(apiError(e))),
    api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data.data || data)).catch(() => setCaisses([])),
    api.get('/versements', { params: { per_page: 1000 } }).then(({ data }) => setVersements(data.data || data)).catch(() => setVersements([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { init() }, [])

  // État d'ouverture de la caisse choisie.
  const refreshSession = (caisse) => {
    if (!caisse) { setState(null); return }
    api.get('/caisse-session/current', { params: { caisse_code: caisse } }).then(({ data }) => setState(data)).catch(() => {})
  }
  const pickCaisse = (c) => { setSelected(c); refreshSession(c) }

  const jour = useMemo(() => versements.filter((v) => String(v.caisse) === String(selected) && isToday(v.paid_at)), [versements, selected])
  const total = useMemo(() => jour.reduce((s, v) => s + Number(v.amount || 0), 0), [jour])

  const fermer = async () => {
    setError(''); setMsg('')
    if (!selected) { setError('Sélectionnez la caisse à fermer.'); return }
    if (!pwd) { setError('Saisissez le mot de passe du caissier.'); return }
    try { const { data } = await api.post('/caisse-session/close', { caisse_code: selected, password: pwd }); setMsg(data.message || 'Caisse fermée.'); setPwd(''); init() }
    catch (e) { setError(e.response?.data?.message || 'Erreur.') }
  }

  const open = state?.open

  return (
    <>
      <PageHeader title="Fermeture de caisse" subtitle="Clôturer la session de caisse" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {msg && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{msg}</div>}
      <Card className="p-6 max-w-lg space-y-4">
        {loading ? <EmptyState message="Chargement…" /> : (
          <>
            <Select label="Caisse à fermer" value={selected} onChange={(e) => pickCaisse(e.target.value)}>
              <option value="">— Choisir une caisse —</option>
              {caisses.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code})</option>)}
            </Select>

            {!selected ? <EmptyState message="Sélectionnez une caisse." /> : !open ? (
              <EmptyState message="Cette caisse n'est pas ouverte." />
            ) : (
              <>
                <Input label="Caissier" value={state.session?.user || state.user || ''} readOnly className="bg-gray-50" />
                <Input label="Ouverte depuis" value={state.session?.date_ouverture ? new Date(state.session.date_ouverture).toLocaleString('fr-FR') : ''} readOnly className="bg-gray-50" />
                <div className="rounded-lg px-4 py-3" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div className="text-sm text-ink">Encaissé aujourd'hui</div>
                  <div className="text-2xl font-bold" style={{ color: 'var(--teal)' }}>{formatMoney(total)}</div>
                  <div className="text-xs text-ink">{jour.length} versement(s)</div>
                </div>
                <Input label={state.session?.user ? `Mot de passe de ${state.session.user}` : 'Mot de passe'} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <Button onClick={fermer}>Fermer la caisse</Button>
              </>
            )}
          </>
        )}
      </Card>
    </>
  )
}
