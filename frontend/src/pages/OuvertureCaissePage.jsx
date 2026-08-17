import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

export default function OuvertureCaissePage() {
  const [state, setState] = useState(null)
  const [caisses, setCaisses] = useState([])
  const [caissiers, setCaissiers] = useState([])
  const [userId, setUserId] = useState('')          // caissier sélectionné (vide = moi)
  const [selected, setSelected] = useState('')
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => { setLoading(true); return Promise.all([
    api.get('/caisse-session/current').then(({ data }) => { setState(data); if (data.caisse_code) setSelected((s) => s || data.caisse_code) }).catch((e) => setError(apiError(e))),
    api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data.data || data)).catch(() => setCaisses([])),
    api.get('/establishment-users').then(({ data }) => setCaissiers((data || []).filter((u) => u.role === 'caissier'))).catch(() => setCaissiers([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const caissesActives = useMemo(() => caisses.filter((c) => (c.statut || 'actif') !== 'inactif'), [caisses])

  // Quand on choisit un caissier, présélectionne sa caisse affectée.
  const pickCaissier = (id) => {
    setUserId(id)
    const c = caissiers.find((u) => String(u.id) === String(id))
    if (c?.caisse_code) setSelected(c.caisse_code)
  }

  const ouvrir = async () => {
    setError(''); setMsg('')
    if (!selected) { setError('Sélectionnez une caisse.'); return }
    if (!pwd) { setError('Saisissez le mot de passe du caissier.'); return }
    try {
      const { data } = await api.post('/caisse-session/open', { caisse_code: selected, password: pwd, user_id: userId || undefined })
      setMsg(data.message || 'Caisse ouverte.'); setPwd(''); load()
    } catch (e) { setError(e.response?.data?.message || 'Erreur.') }
  }

  const caissierNom = useMemo(() => caissiers.find((u) => String(u.id) === String(userId))?.name, [caissiers, userId])

  return (
    <>
      <PageHeader title="Ouverture de caisse" subtitle="Le caissier ouvre sa caisse avec son mot de passe" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {msg && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{msg}</div>}
      <Card className="p-6 max-w-lg space-y-4">
        {loading ? <EmptyState message="Chargement…" /> : (
          <>
            <Input label="Date" value={new Date().toLocaleString('fr-FR')} readOnly className="bg-gray-50" />
            {state?.open ? (
              <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                Caisse <strong>{state.session?.caisse_code}</strong> déjà ouverte{state.session?.user ? ` par ${state.session.user}` : ''} depuis le {state.session?.date_ouverture ? new Date(state.session.date_ouverture).toLocaleString('fr-FR') : '—'}. Vous pouvez encaisser.
              </div>
            ) : (
              <>
                <Select label="Caissier" value={userId} onChange={(e) => pickCaissier(e.target.value)}>
                  <option value="">— Moi-même —</option>
                  {caissiers.map((u) => <option key={u.id} value={u.id}>{u.name || u.login}{u.caisse_code ? ` (caisse ${u.caisse_code})` : ''}</option>)}
                </Select>
                <Select label="Caisse" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">— Choisir une caisse —</option>
                  {caissesActives.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code}){c.is_principal ? ' — principale' : ''}</option>)}
                </Select>
                {caisses.length === 0 && <div className="text-sm text-red-600">Aucune caisse active. Voir Configuration → Caisses.</div>}
                <Input label={caissierNom ? `Mot de passe de ${caissierNom}` : 'Votre mot de passe'} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <div className="text-xs text-ink">Le mot de passe attendu est celui du caissier sélectionné{userId ? '' : ' (vous-même)'}.</div>
                <Button onClick={ouvrir} disabled={!selected}>Ouvrir la caisse</Button>
              </>
            )}
          </>
        )}
      </Card>
    </>
  )
}
