import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Select, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

export default function AffectationsEtab() {
  const [societes, setSocietes] = useState([])
  const [etabs, setEtabs] = useState([])
  const [users, setUsers] = useState([])
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // Société -> Établissement
  const [socSel, setSocSel] = useState('')
  const [etabToAssign, setEtabToAssign] = useState('')

  // Établissement -> Utilisateur
  const [etabSel, setEtabSel] = useState('')
  const [etabUsers, setEtabUsers] = useState([])
  const [userToAssign, setUserToAssign] = useState('')

  const loadEtabs = () => api.get('/super/etablissements').then(({ data }) => setEtabs(Array.isArray(data) ? data : [])).catch(() => setEtabs([]))
  useEffect(() => {
    api.get('/super/societes').then(({ data }) => setSocietes(Array.isArray(data) ? data : [])).catch(() => setSocietes([]))
    api.get('/super/rh-users').then(({ data }) => setUsers(Array.isArray(data) ? data : [])).catch(() => setUsers([]))
    loadEtabs()
  }, [])

  const etabsOfSoc = useMemo(() => socSel ? etabs.filter((e) => String(e.code_societe) === String(socSel)) : [], [etabs, socSel])
  const socName = useMemo(() => { const m = {}; societes.forEach((s) => { m[String(s.code)] = s.name }); return m }, [societes])

  const loadEtabUsers = (code) => api.get('/super/etab-users', { params: { code_etablissement: code } }).then(({ data }) => setEtabUsers(Array.isArray(data) ? data : [])).catch(() => setEtabUsers([]))
  useEffect(() => { if (etabSel) loadEtabUsers(etabSel); else setEtabUsers([]) }, [etabSel])

  const affecterEtabSoc = async () => {
    setMsg(''); setErr('')
    if (!etabToAssign || !socSel) { setErr('Choisissez une société et un établissement.'); return }
    try { await api.post('/super/etablissements/affecter-societe', { code: etabToAssign, code_societe: socSel }); setMsg('Établissement affecté.'); setEtabToAssign(''); loadEtabs() }
    catch (e) { setErr(e.response?.data?.message || 'Erreur.') }
  }
  const affecterUser = async () => {
    setMsg(''); setErr('')
    if (!userToAssign || !etabSel) { setErr('Choisissez un établissement et un utilisateur.'); return }
    try { await api.post('/super/etab-users', { user_id: userToAssign, code_etablissement: etabSel }); setMsg('Utilisateur affecté.'); setUserToAssign(''); loadEtabUsers(etabSel) }
    catch (e) { setErr(e.response?.data?.message || 'Erreur.') }
  }
  const removeUser = async (id) => { if (!confirm('Retirer cette affectation ?')) return; try { await api.delete(`/super/etab-users/${id}`); loadEtabUsers(etabSel) } catch (e) { setErr('Erreur.') } }

  return (
    <>
      <PageHeader title="Affectations établissement" subtitle="Société ↔ Établissement · Établissement ↔ Utilisateur" />
      {msg && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{msg}</div>}
      {err && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{err}</div>}

      <Card className="p-5 mb-6">
        <h3 className="font-semibold text-heading mb-3">Société → Établissements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Select label="Société" value={socSel} onChange={(e) => setSocSel(e.target.value)}>
            <option value="">— Choisir —</option>
            {societes.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
          </Select>
          <Select label="Affecter un établissement" value={etabToAssign} onChange={(e) => setEtabToAssign(e.target.value)}>
            <option value="">— Choisir un établissement —</option>
            {etabs.map((e) => <option key={e.code} value={e.code}>{e.name} ({e.code}){e.code_societe ? ` — actuellement ${socName[String(e.code_societe)] || e.code_societe}` : ''}</option>)}
          </Select>
          <Button onClick={affecterEtabSoc}><Icon name="link" size={15} /> Affecter à la société</Button>
        </div>
        <div className="mt-4">
          <div className="text-sm text-ink mb-1">Établissements de la société sélectionnée :</div>
          {!socSel ? <EmptyState message="Choisissez une société." /> : etabsOfSoc.length === 0 ? <EmptyState message="Aucun établissement." /> : (
            <ul className="text-sm space-y-1">
              {etabsOfSoc.map((e) => <li key={e.code} className="flex items-center gap-2"><Icon name="building" size={14} /> <span className="font-medium">{e.name}</span> <span className="font-mono text-xs text-ink">({e.code})</span></li>)}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-heading mb-3">Établissement → Utilisateurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Select label="Établissement" value={etabSel} onChange={(e) => setEtabSel(e.target.value)}>
            <option value="">— Choisir —</option>
            {etabs.map((e) => <option key={e.code} value={e.code}>{e.name} ({e.code})</option>)}
          </Select>
          <Select label="Utilisateur" value={userToAssign} onChange={(e) => setUserToAssign(e.target.value)}>
            <option value="">— Choisir —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.login} {u.login ? `(${u.login})` : ''}</option>)}
          </Select>
          <Button onClick={affecterUser}><Icon name="link" size={15} /> Affecter l'utilisateur</Button>
        </div>
        <div className="mt-4">
          {!etabSel ? <EmptyState message="Choisissez un établissement." /> : etabUsers.length === 0 ? <EmptyState message="Aucun utilisateur affecté." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-3 py-2">Nom</th><th>Login</th><th>Email</th><th></th></tr></thead>
              <tbody>
                {etabUsers.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.name || '—'}</td>
                    <td className="font-mono text-xs">{r.login}</td>
                    <td>{r.email || '—'}</td>
                    <td className="text-right px-3"><button onClick={() => removeUser(r.id)} className="text-red-600 hover:underline">Retirer</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </>
  )
}
