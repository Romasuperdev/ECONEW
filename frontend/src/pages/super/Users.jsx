import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

const ROLES = [
  { value: 'super_admin', label: 'Super Administrateur' },
  { value: 'admin_etablissement', label: "Admin d'établissement" },
  { value: 'directeur', label: 'Directeur' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'econome', label: 'Économe' },
  { value: 'secretaire', label: 'Secrétaire' },
  { value: 'auditeur', label: 'Auditeur' },
  { value: 'caissier', label: 'Caissier' },
]
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))
// Flags RH_USER dérivés du rôle (super_admin/directeur/comptable) ; les autres
// rôles étendus sont enregistrés côté serveur dans ECO_USER_ROLE via `role`.
const roleToFlags = (r) => ({
  super_admin: r === 'super_admin',
  validateur: r === 'directeur',
  superviseur: r === 'comptable',
})
const currentRole = (u) => u.role || (u.super_admin ? 'super_admin' : u.validateur ? 'directeur' : u.superviseur ? 'comptable' : 'caissier')
const empty = { login: '', password: '', nom: '', prenom: '', email: '', contact: '', role: 'caissier' }

export default function Users() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  // Modal d'attribution des modules (comptes admin_etablissement)
  const [modModal, setModModal] = useState(false)
  const [modUser, setModUser] = useState(null)
  const [catalogue, setCatalogue] = useState([])
  const [checked, setChecked] = useState({})
  const [modLoading, setModLoading] = useState(false)
  const [modSaving, setModSaving] = useState(false)
  const [modError, setModError] = useState('')

  const load = () => { setLoading(true); api.get('/super/rh-users', { params: { search } }).then(({ data }) => setItems(data)).finally(() => setLoading(false)) }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (u) => { setForm({ ...empty, ...u, password: '', role: currentRole(u) }); setEditing(u.id); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { ...form, ...roleToFlags(form.role), role: form.role }
      if (editing) await api.put(`/super/rh-users/${editing}`, payload)
      else await api.post('/super/rh-users', payload)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (u) => { if (!confirm(`Désactiver ${u.login} ?`)) return; await api.delete(`/super/rh-users/${u.id}`); load() }
  const reset = async (u) => {
    if (!confirm(`Réinitialiser le mot de passe de ${u.login} ?`)) return
    const { data } = await api.post(`/super/rh-users/${u.id}/reset-password`)
    alert(`Nouveau mot de passe : ${data.password}`)
  }

  const roleOf = (u) => ROLE_LABEL[currentRole(u)] || currentRole(u)

  const openModules = async (u) => {
    setModUser(u); setModError(''); setCatalogue([]); setChecked({}); setModModal(true); setModLoading(true)
    try {
      const [cat, perms] = await Promise.all([
        api.get('/admin-etablissement/modules-catalogue'),
        api.get(`/admin-etablissement/utilisateurs/${u.id}/permissions-modules`),
      ])
      const list = cat.data?.data || perms.data?.catalogue || []
      const accordes = perms.data?.accordes || []
      setCatalogue(list)
      const c = {}; list.forEach((m) => { c[m.cle] = accordes.includes(m.cle) })
      setChecked(c)
    } catch (err) { setModError(err.response?.data?.message || 'Erreur de chargement.') } finally { setModLoading(false) }
  }
  const saveModules = async () => {
    setModSaving(true); setModError('')
    try {
      const modules = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
      await api.put(`/admin-etablissement/utilisateurs/${modUser.id}/permissions-modules`, { modules })
      setModModal(false)
    } catch (err) { setModError(err.response?.data?.message || 'Erreur.') } finally { setModSaving(false) }
  }

  return (
    <>
      <PageHeader title="Utilisateurs" subtitle={`${items.length} compte(s)`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvel utilisateur</Button>} />

      <Card className="p-4 mb-4"><Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} /></Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="px-4 py-3">Nom</th><th>Login</th><th>Email</th><th>Rôle</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="font-mono text-xs">{u.login}</td>
                  <td className="text-muted">{u.email || '—'}</td>
                  <td>{roleOf(u)}</td>
                  <td>{u.supprime ? <Badge value="inactif" /> : <Badge value="actif" />}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(u)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    {currentRole(u) === 'admin_etablissement' && (
                      <button onClick={() => openModules(u)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modules</button>
                    )}
                    <button onClick={() => reset(u)} className="hover:underline" style={{ color: 'var(--accent)' }}>Réinit. MDP</button>
                    <button onClick={() => remove(u)} className="text-red-600 hover:underline">Désactiver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Login" value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} disabled={!!editing} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <Input label={editing ? 'Nouveau mot de passe (laisser vide pour garder)' : 'Mot de passe'} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} />
          <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          <p className="text-xs text-muted -mt-2">Caissier : encaissements uniquement · Comptable : + dépenses & rapports · Directeur : accès complet établissement · Super Admin : console plateforme.</p>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      <Modal open={modModal} onClose={() => setModModal(false)} title={`Modules — ${modUser?.name || modUser?.login || ''}`}>
        <p className="text-xs text-muted mb-3">Sélectionnez les sections de la console « Admin d'établissement » accessibles à ce compte.</p>
        {modError && <div className="mb-3 text-sm text-red-600">{modError}</div>}
        {modLoading ? <EmptyState message="Chargement…" /> : catalogue.length === 0 ? <EmptyState message="Aucun module au catalogue." /> : (
          <div className="space-y-2">
            {catalogue.map((m) => (
              <label key={m.cle} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-brand-50" style={{ border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={!!checked[m.cle]} onChange={(e) => setChecked((c) => ({ ...c, [m.cle]: e.target.checked }))} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-heading">{m.libelle || m.cle}</span>
                  {m.description && <span className="block text-xs text-muted mt-0.5">{m.description}</span>}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="ghost" onClick={() => setModModal(false)}>Annuler</Button>
          <Button type="button" onClick={saveModules} disabled={modSaving || modLoading}>{modSaving ? 'Enregistrement…' : 'Enregistrer'}</Button>
        </div>
      </Modal>
    </>
  )
}
