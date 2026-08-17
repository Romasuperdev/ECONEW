import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Select, Button, Badge, EmptyState, Modal, Input } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

const roleLabel = {
  admin_etablissement: "Admin d'établissement", directeur: 'Directeur', comptable: 'Comptable',
  caissier: 'Caissier', econome: 'Économe', secretaire: 'Secrétaire', auditeur: 'Auditeur',
  super_admin: 'Super Admin',
}

export default function EstablishmentUsers() {
  const [users, setUsers] = useState([])
  const [caisses, setCaisses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [draft, setDraft] = useState({})   // { userId: caisse_code }
  const [savingId, setSavingId] = useState(null)
  const [okId, setOkId] = useState(null)
  const [roleFilter, setRoleFilter] = useState('caissier')  // par défaut : les caissiers
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', password: '', role: '', caisse_code: '' })
  const [formError, setFormError] = useState('')
  // Attribution de modules (uniquement pour les Admin d'établissement)
  const [modModal, setModModal] = useState(false)
  const [modUser, setModUser] = useState(null)
  const [catalogue, setCatalogue] = useState([])
  const [checked, setChecked] = useState({})   // { cle: bool }
  const [modLoading, setModLoading] = useState(false)
  const [modSaving, setModSaving] = useState(false)
  const [modError, setModError] = useState('')

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

  // Caisses proposables : uniquement les caisses actives.
  const caissesActives = useMemo(() => caisses.filter((c) => (c.statut || 'actif') !== 'inactif'), [caisses])

  // Liste filtrée par rôle (par défaut : caissiers).
  const filtered = useMemo(() => (roleFilter ? users.filter((u) => (u.role || '') === roleFilter) : users), [users, roleFilter])
  const nbCaissiers = useMemo(() => users.filter((u) => u.role === 'caissier').length, [users])

  const affecter = async (u) => {
    setSavingId(u.id); setOkId(null); setLoadError('')
    try {
      await api.put(`/establishment-users/${u.id}/caisse`, { caisse_code: draft[u.id] || null })
      setUsers((list) => list.map((x) => x.id === u.id ? { ...x, caisse_code: draft[u.id] || '' } : x))
      setOkId(u.id); setTimeout(() => setOkId(null), 2000)
    } catch (e) { setLoadError(apiError(e)) } finally { setSavingId(null) }
  }

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
      await api.put(`/establishment-users/${editing.id}`, payload)
      setEditModal(false); load()
    } catch (err) { setFormError(apiError(err)) }
  }
  const remove = async (u) => {
    if (!confirm(`Désactiver l'utilisateur ${u.name || u.login} ?`)) return
    try { await api.delete(`/establishment-users/${u.id}`); load() }
    catch (err) { setLoadError(apiError(err)) }
  }

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
    } catch (err) { setModError(apiError(err)) } finally { setModLoading(false) }
  }
  const saveModules = async () => {
    setModSaving(true); setModError('')
    try {
      const modules = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
      await api.put(`/admin-etablissement/utilisateurs/${modUser.id}/permissions-modules`, { modules })
      setModModal(false)
    } catch (err) { setModError(apiError(err)) } finally { setModSaving(false) }
  }

  return (
    <>
      <PageHeader title="Affectation Caisse — Utilisateurs" subtitle={`${nbCaissiers} caissier(s) · ${users.length} utilisateur(s) au total`}
        action={
          <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="caissier">Caissiers</option>
            <option value="">Tous les rôles</option>
            <option value="econome">Économes</option>
            <option value="comptable">Comptables</option>
            <option value="secretaire">Secrétaires</option>
          </Select>
        } />

      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : filtered.length === 0 ? (
          <EmptyState message={roleFilter === 'caissier'
            ? "Aucun agent avec le rôle « Caissier ». Créez-le dans la Console, affectez-le à cet établissement, et donnez-lui le rôle Caissier."
            : "Aucun utilisateur affecté à cet établissement. Créez/affectez-les dans la Console."} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-2">Nom</th><th>Login</th><th>Rôle</th><th>Caisse affectée</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{u.name || '—'}{!u.active && <span className="ml-2"><Badge value="inactif" /></span>}</td>
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
                    {u.role === 'admin_etablissement' && (
                      <button onClick={() => openModules(u)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modules</button>
                    )}
                    <button onClick={() => remove(u)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Modifier l'utilisateur">
        <form onSubmit={saveEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            <Input label="Prénom" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Rôle" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="">— Inchangé —</option>
              {Object.entries(roleLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Select label="Caisse affectée" value={form.caisse_code} onChange={(e) => setForm({ ...form, caisse_code: e.target.value })}>
              <option value="">— Aucune —</option>
              {caissesActives.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code}){c.is_principal ? ' ★' : ''}</option>)}
            </Select>
          </div>
          <Input label="Nouveau mot de passe (laisser vide pour ne pas changer)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {formError && <div className="text-sm text-red-600">{formError}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={modModal} onClose={() => setModModal(false)} title={`Modules — ${modUser?.name || modUser?.login || ''}`} size="md" cols={1}>
        {modError && <div className="mb-3 text-sm text-red-600">{modError}</div>}
        {modLoading ? <EmptyState message="Chargement…" /> : catalogue.length === 0 ? <EmptyState message="Aucun module au catalogue." /> : (
          <div className="space-y-2">
            {catalogue.map((m) => (
              <label key={m.cle} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer hover:bg-brand-50" style={{ border: '1px solid var(--border)' }}>
                <input type="checkbox" checked={!!checked[m.cle]} onChange={(e) => setChecked((c) => ({ ...c, [m.cle]: e.target.checked }))} className="mt-1" />
                <span>
                  <span className="block text-sm font-semibold text-heading">{m.libelle || m.cle}</span>
                  {m.description && <span className="block text-xs text-ink mt-0.5">{m.description}</span>}
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

      <p className="text-xs text-ink mt-4">
        Cette page liste les agents de l'établissement connecté (issus de la Console / RH_USER). Par défaut, elle affiche ceux dont le rôle est <b>Caissier</b>. Affectez à chacun une caisse <b>active</b> ; il pourra alors l'ouvrir depuis Traitement → Ouverture de caisse et encaisser. Un agent n'apparaît ici que s'il a été créé dans la Console et affecté à cet établissement.
      </p>
    </>
  )
}
