import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

const ROLES = [
  { value: 'caissier', label: 'Caissier' },
  { value: 'comptable', label: 'Comptable' },
  { value: 'directeur', label: 'Directeur' },
  { value: 'super_admin', label: 'Super Administrateur' },
]
const roleToFlags = (r) => ({
  super_admin: r === 'super_admin',
  validateur: r === 'directeur',
  superviseur: r === 'comptable',
})
const flagsToRole = (u) => u.super_admin ? 'super_admin' : u.validateur ? 'directeur' : u.superviseur ? 'comptable' : 'caissier'
const empty = { login: '', password: '', nom: '', prenom: '', email: '', contact: '', role: 'caissier' }

export default function Users() {
  const [items, setItems] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoading(true); api.get('/super/rh-users', { params: { search } }).then(({ data }) => setItems(data)).finally(() => setLoading(false)) }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (u) => { setForm({ ...empty, ...u, password: '', role: flagsToRole(u) }); setEditing(u.id); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { ...form, ...roleToFlags(form.role) }
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

  const roleOf = (u) => u.super_admin ? 'Super Admin' : u.validateur ? 'Directeur' : u.superviseur ? 'Comptable' : 'Caissier'

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
    </>
  )
}
