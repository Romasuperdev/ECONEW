import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'

export default function Affectations() {
  const [tab, setTab] = useState('users')
  const [affectations, setAffectations] = useState([])
  const [societes, setSocietes] = useState([])
  const [users, setUsers] = useState([])
  const [applications, setApplications] = useState([])
  const [societeApps, setSocieteApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ user_id: '', societe_id: '' })
  const [userSearch, setUserSearch] = useState('')
  const [error, setError] = useState('')
  // affectation application
  const [appForm, setAppForm] = useState({ societe_id: '', code_app: '' })
  const [appErr, setAppErr] = useState('')

  const loadAff = () => api.get('/super/affectations').then(({ data }) => setAffectations(data))
  const loadSoc = () => api.get('/super/societes').then(({ data }) => setSocietes(data))
  const loadUsers = (s = '') => api.get('/super/rh-users', { params: { search: s } }).then(({ data }) => setUsers(data))
  const loadApps = () => {
    api.get('/super/applications').then(({ data }) => setApplications(Array.isArray(data) ? data : []))
    api.get('/super/societe-applications').then(({ data }) => setSocieteApps(Array.isArray(data) ? data : []))
  }

  useEffect(() => { Promise.all([loadAff(), loadSoc(), loadUsers(), loadApps()]).finally(() => setLoading(false)) }, [])
  useEffect(() => { const t = setTimeout(() => loadUsers(userSearch), 300); return () => clearTimeout(t) }, [userSearch])

  const assign = async (e) => {
    e.preventDefault(); setError('')
    try { await api.post('/super/affectations', form); setModal(false); loadAff() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (id) => { if (!confirm('Retirer cette affectation ?')) return; await api.delete(`/super/affectations/${id}`); loadAff() }

  const assignApp = async (e) => {
    e.preventDefault(); setAppErr('')
    const soc = societes.find((s) => String(s.id) === String(appForm.societe_id))
    try {
      await api.post('/super/societe-applications', { societe_id: appForm.societe_id, societe_code: soc?.code, code_app: appForm.code_app })
      setAppForm({ societe_id: '', code_app: '' }); loadApps()
    } catch (err) { setAppErr(err.response?.data?.message || 'Erreur.') }
  }
  const removeApp = async (row) => {
    if (!confirm('Retirer cette affectation application ?')) return
    const societe_code = row.CODESOCIETE ?? row.CodeSociete
    const societe_id = row.societe_id ?? row.NUMAUTO
    const code_app = row.CodeApp ?? row.CODEAPP ?? row.code_app
    try { await api.delete('/super/societe-applications', { data: { societe_code, societe_id, code_app } }); loadApps() }
    catch (err) { alert(err.response?.data?.message || 'Impossible.') }
  }

  const cols = (rows) => (rows && rows.length ? Object.keys(rows[0]) : [])

  return (
    <>
      <PageHeader title="Affectations" subtitle="Utilisateurs, sociétés et applications" />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('users')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={tab === 'users' ? { background: 'var(--sidebar)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>Utilisateurs ↔ Sociétés</button>
        <button onClick={() => setTab('apps')} className="px-4 py-2 rounded-lg text-sm font-semibold" style={tab === 'apps' ? { background: 'var(--sidebar)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--muted)' }}>Sociétés ↔ Applications</button>
      </div>

      {tab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm text-muted">{affectations.length} affectation(s) · {societes.length} société(s)</div>
            <Button onClick={() => { setForm({ user_id: '', societe_id: '' }); setError(''); setModal(true) }}>+ Affecter un utilisateur</Button>
          </div>
          <Card className="overflow-hidden">
            {loading ? <EmptyState message="Chargement…" /> : affectations.length === 0 ? <EmptyState message="Aucune affectation." /> : (
              <table className="w-full text-sm">
                <thead className="text-left"><tr><th className="px-4 py-3">Utilisateur</th><th>Login / Email</th><th>Société</th><th></th></tr></thead>
                <tbody>
                  {affectations.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-4 py-2 font-medium">{a.user?.name || `#${a.user_id}`}</td>
                      <td className="text-muted">{a.user?.login || a.user?.email || '—'}</td>
                      <td>{a.societe?.name || `#${a.societe_id}`}</td>
                      <td className="text-right px-4"><button onClick={() => remove(a.id)} className="text-red-600 hover:underline">Retirer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </>
      )}

      {tab === 'apps' && (
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="font-semibold text-heading mb-3">Affecter une application à une société</h3>
            <form onSubmit={assignApp} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px]">
                <Select label="Société" value={appForm.societe_id} onChange={(e) => setAppForm({ ...appForm, societe_id: e.target.value })} required>
                  <option value="">— Sélectionner —</option>
                  {societes.map((s) => <option key={s.id} value={s.id}>{s.name || s.code}</option>)}
                </Select>
              </div>
              <div className="min-w-[220px]">
                <Select label="Application" value={appForm.code_app} onChange={(e) => setAppForm({ ...appForm, code_app: e.target.value })} required>
                  <option value="">— Sélectionner —</option>
                  {applications.map((a) => <option key={a.code} value={a.code}>{a.name || a.code}</option>)}
                </Select>
              </div>
              <Button type="submit">Affecter</Button>
              {appErr && <span className="text-sm text-red-600">{appErr}</span>}
            </form>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-heading mb-3">Affectations société ↔ application ({societeApps.length})</h3>
            {societeApps.length === 0 ? <EmptyState message="Aucune affectation." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left"><tr>{cols(societeApps).map((c) => <th key={c} className="px-3 py-2">{c}</th>)}<th></th></tr></thead>
                  <tbody>
                    {societeApps.map((r, i) => (
                      <tr key={i} className="border-t">
                        {cols(societeApps).map((c) => <td key={c} className="px-3 py-2">{String(r[c] ?? '')}</td>)}
                        <td className="text-right px-3"><button onClick={() => removeApp(r)} className="text-red-600 hover:underline">Retirer</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Affecter un utilisateur à une société">
        <form onSubmit={assign} className="space-y-4">
          <Input label="Rechercher un utilisateur" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="nom, login ou email" />
          <Select label="Utilisateur" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} · {u.login || u.email}</option>)}
          </Select>
          <Select label="Société" value={form.societe_id} onChange={(e) => setForm({ ...form, societe_id: e.target.value })} required>
            <option value="">— Sélectionner —</option>
            {societes.map((s) => <option key={s.id} value={s.id}>{s.name || s.code}</option>)}
          </Select>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Affecter</Button></div>
        </form>
      </Modal>
    </>
  )
}
