import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Select, Button, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

const roleLabel = {
  super_admin: 'Super Admin', directeur: 'Directeur', comptable: 'Comptable',
  caissier: 'Caissier', econome: 'Économe', secretaire: 'Secrétaire', auditeur: 'Auditeur',
}

export default function EstablishmentUsers() {
  const [users, setUsers] = useState([])
  const [caisses, setCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState({})   // { userId: caisse_code }
  const [savingId, setSavingId] = useState(null)
  const [okId, setOkId] = useState(null)

  const load = () => {
    setLoadError('')
    return Promise.all([
      api.get('/establishment-users').then(({ data }) => {
        setUsers(data)
        const d = {}; data.forEach((u) => { d[u.id] = u.caisse_code || '' })
        setDraft(d)
      }).catch((e) => { setUsers([]); setLoadError(apiError(e)) }),
      api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data)).catch(() => setCaisses([])),
    ]).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const affecter = async (u) => {
    setSavingId(u.id); setOkId(null); setLoadError('')
    try {
      await api.put(`/establishment-users/${u.id}/caisse`, { caisse_code: draft[u.id] || null })
      setUsers((list) => list.map((x) => x.id === u.id ? { ...x, caisse_code: draft[u.id] || '' } : x))
      setOkId(u.id); setTimeout(() => setOkId(null), 2000)
    } catch (e) { setLoadError(apiError(e)) } finally { setSavingId(null) }
  }

  return (
    <>
      <PageHeader title="Affectation Caisse — Utilisateurs" subtitle="Affectez une caisse aux utilisateurs de l'établissement" />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : users.length === 0 ? (
          <EmptyState message="Aucun utilisateur affecté à cet établissement. Créez/affectez-les dans la console." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-2">Nom</th><th>Login</th><th>Rôle</th><th>Caisse affectée</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{u.name || '—'}{!u.active && <span className="ml-2"><Badge value="inactif" /></span>}</td>
                  <td className="font-mono text-xs">{u.login}</td>
                  <td>{roleLabel[u.role] || u.role || '—'}</td>
                  <td>
                    <Select value={draft[u.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [u.id]: e.target.value }))}>
                      <option value="">— Aucune —</option>
                      {caisses.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code})</option>)}
                    </Select>
                  </td>
                  <td className="text-right px-4 whitespace-nowrap">
                    <Button variant="ghost" onClick={() => affecter(u)} disabled={savingId === u.id}>
                      {savingId === u.id ? 'Enregistrement…' : okId === u.id ? '✓ Affecté' : 'Affecter'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="text-xs text-ink mt-4">
        Les utilisateurs proviennent de la console (RH_USER) et sont affectés à la société de l'établissement connecté. Ici, vous leur affectez une caisse existante (utile notamment pour les caissiers).
      </p>
    </>
  )
}
