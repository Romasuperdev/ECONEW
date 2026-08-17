import { useEffect, useMemo, useState } from 'react'
import api from '../../api/client'
import { Card, Select, Button, Badge, EmptyState, Modal, Input } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { apiError } from '../../utils/apiError'

const roleLabel = {
  super_admin: 'Super Admin', admin_etablissement: "Admin d'établissement", directeur: 'Directeur',
  comptable: 'Comptable', caissier: 'Caissier', econome: 'Économe', secretaire: 'Secrétaire', auditeur: 'Auditeur',
}

const EMPTY_FORM = { nom: '', prenom: '', email: '', password: '', role: '', caisse_code: '' }

export default function UtilisateursPage() {
  const [users, setUsers] = useState([])
  const [caisses, setCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState({})   // { userId: caisse_code }
  const [savingId, setSavingId] = useState(null)
  const [okId, setOkId] = useState(null)
  const [roleFilter, setRoleFilter] = useState('')
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState(null)   // null => création
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const load = () => {
    setLoadError('')
    return Promise.all([
      api.get('/admin-etablissement/utilisateurs').then(({ data }) => {
        setUsers(data)
        const d = {}; data.forEach((u) => { d[u.id] = u.caisse_code || '' })
        setDraft(d)
      }).catch((e) => { setUsers([]); setLoadError(apiError(e)) }),
      api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data)).catch(() => setCaisses([])),
    ]).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const caissesActives = useMemo(() => caisses.filter((c) => (c.statut || 'actif') !== 'inactif'), [caisses])
  const filtered = useMemo(() => (roleFilter ? users.filter((u) => (u.role || '') === roleFilter) : users), [users, roleFilter])

  const affecter = async (u) => {
    setSavingId(u.id); setOkId(null); setLoadError('')
    try {
      await api.put(`/admin-etablissement/utilisateurs/${u.id}/caisse`, { caisse_code: draft[u.id] || null })
      setUsers((list) => list.map((x) => x.id === u.id ? { ...x, caisse_code: draft[u.id] || '' } : x))
      setOkId(u.id); setTimeout(() => setOkId(null), 2000)
    } catch (e) { setLoadError(apiError(e)) } finally { setSavingId(null) }
  }

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setFormError(''); setEditModal(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ nom: u.name || '', prenom: '', email: u.email || '', password: '', role: u.role || '', caisse_code: u.caisse_code || '' })
    setFormError('')
    setEditModal(true)
  }
  const saveEdit = async (e) => {
    e.preventDefault(); setFormError('')
    try {
      const payload = { nom: form.nom, prenom: form.prenom, email: form.email, role: form.role, caisse_code: form.caisse_code || null }
      if (form.password) payload.password = form.password
      if (editing) await api.put(`/admin-etablissement/utilisateurs/${editing.id}`, payload)
      else await api.post('/admin-etablissement/utilisateurs', payload)
      setEditModal(false); load()
    } catch (err) { setFormError(apiError(err)) }
  }
  const remove = async (u) => {
    if (!confirm(`Désactiver l'utilisateur ${u.name || u.login} ?`)) return
    try { await api.delete(`/admin-etablissement/utilisateurs/${u.id}`); load() }
    catch (err) { setLoadError(apiError(err)) }
  }
  const resetPassword = async (u) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.name || u.login} ?`)) return
    try {
      const { data } = await api.post(`/admin-etablissement/utilisateurs/${u.id}/reset-password`)
      alert(data?.message || (data?.password ? `Nouveau mot de passe : ${data.password}` : 'Mot de passe réinitialisé.'))
    } catch (err) { setLoadError(apiError(err)) }
  }

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle={`${users.length} utilisateur(s) de l'établissement`}
        action={
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tous les rôles</option>
              {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Button onClick={openCreate}>+ Nouvel utilisateur</Button>
          </div>
        } />

      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? (
          <EmptyState message="Aucun utilisateur." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-2">Nom</th><th>Login</th><th>Rôle</th><th>Caisse affectée</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{u.name || '—'}{u.active === false && <span className="ml-2"><Badge value="inactif" /></span>}</td>
                  <td className="font-mono text-xs">{u.login}</td>
                  <td>{roleLabel[u.role] || u.role || '—'}</td>
                  <td>
                    <Select value={draft[u.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [u.id]: e.target.value }))}>
                      <option value="">— Aucune —</option>
                      {caissesActives.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code}){c.is_principal ? ' ★' : ''}</option>)}
                    </Select>
                  </td>
                  <td className="text-right px-4 whitespace-nowrap space-x-3">
                    <Button variant="ghost" onClick={() => affecter(u)} disabled={savingId === u.id}>
                      {savingId === u.id ? 'Enregistrement…' : okId === u.id ? '✓ Affecté' : 'Affecter'}
                    </Button>
                    <button onClick={() => openEdit(u)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => resetPassword(u)} className="hover:underline" style={{ color: 'var(--teal)' }}>Réinit. MDP</button>
                    <button onClick={() => remove(u)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={editModal} onClose={() => setEditModal(false)} title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}>
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">— {editing ? 'Inchangé' : 'Choisir'} —</option>
              {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select label="Caisse affectée" value={form.caisse_code} onChange={(e) => setForm({ ...form, caisse_code: e.target.value })}>
              <option value="">— Aucune —</option>
              {caissesActives.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code}){c.is_principal ? ' ★' : ''}</option>)}
            </Select>
          </div>
          <Input label={editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          {formError && <div className="text-sm text-red-600">{formError}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
