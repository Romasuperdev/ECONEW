import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatDate } from '../../utils/format'

const empty = {
  name: '', sigle: '', responsable_name: '', address: '', city: '', country: '',
  phone: '', email: '', website: '', timezone: 'Africa/Abidjan', rccm: '', tax_number: '',
  currency: 'XOF', language: 'fr',
  admin_name: '', admin_email: '', admin_password: '',
  subscription_plan_id: '', trial_days: 30,
}

export default function Schools() {
  const [items, setItems] = useState([])
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/super/schools', { params: { search, status, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }

  useEffect(() => { api.get('/super/plans').then(({ data }) => setPlans(data)) }, [])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search, status])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setCreated(null); setModal(true) }
  const openEdit = (s) => {
    setForm({
      ...empty,
      name: s.name || '', sigle: s.sigle || '', responsable_name: s.responsable_name || '',
      address: s.address || '', city: s.city || '', country: s.country || '',
      phone: s.phone || '', email: s.email || '', website: s.website || '',
      timezone: s.timezone || 'Africa/Abidjan', rccm: s.rccm || '', tax_number: s.tax_number || '',
      currency: s.currency || 'XOF', language: s.language || 'fr',
    })
    setEditing(s.id); setError(''); setCreated(null); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) {
        await api.put(`/super/schools/${editing}`, {
          name: form.name, sigle: form.sigle, responsable_name: form.responsable_name,
          address: form.address, city: form.city, country: form.country,
          language: form.language, phone: form.phone, email: form.email, website: form.website,
          timezone: form.timezone, rccm: form.rccm, tax_number: form.tax_number, currency: form.currency,
        })
        setModal(false); load()
        return
      }
      const { data } = await api.post('/super/schools', {
        ...form,
        subscription_plan_id: form.subscription_plan_id || null,
        trial_days: Number(form.trial_days) || 0,
      })
      setCreated(data); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const changeStatus = async (school, newStatus) => {
    await api.patch(`/super/schools/${school.id}/status`, { status: newStatus })
    load()
  }

  const remove = async (school) => {
    if (!confirm(`Supprimer définitivement ${school.name} et toutes ses données ?`)) return
    await api.delete(`/super/schools/${school.id}`); load()
  }

  return (
    <>
      <PageHeader title="Établissements" subtitle={`${items.length} école(s)`}
        action={<Button onClick={openCreate}>+ Nouvel établissement</Button>} />

      <Card className="p-4 mb-4 flex gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Tous les statuts</option>
          <option value="active">Actives</option>
          <option value="suspended">Suspendues</option>
          <option value="inactive">Inactives</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-3">Établissement</th><th>Code</th><th>Formule</th><th>Élèves</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-ink text-xs">{s.country || '—'} · {s.responsable_name || '—'}</div>
                  </td>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td>{s.current_subscription?.plan?.name || '—'}</td>
                  <td>{s.students_count ?? 0}</td>
                  <td><Badge value={s.status === 'active' ? 'actif' : s.status} /></td>
                  <td className="text-right px-4 space-x-2 whitespace-nowrap">
                    {s.status === 'active'
                      ? <button onClick={() => changeStatus(s, 'suspended')} className="text-amber-600 hover:underline">Suspendre</button>
                      : <button onClick={() => changeStatus(s, 'active')} className="text-turquoise-600 hover:underline">Activer</button>}
                    <button onClick={() => openEdit(s)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(s)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier l\'établissement' : 'Nouvel établissement'}>
        {created ? (
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-turquoise-500/10 text-turquoise-600 rounded">
              ✅ Établissement <strong>{created.name}</strong> créé avec succès.
            </div>
            <p>Compte administrateur : <strong>{form.admin_email}</strong></p>
            <p className="text-ink">Communiquez ses identifiants au responsable de l'école.</p>
            <div className="flex justify-end"><Button onClick={() => setModal(false)}>Fermer</Button></div>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div className="text-xs font-semibold text-ink uppercase">Établissement</div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Input label="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
              <Input label="Sigle" value={form.sigle} onChange={(e) => setForm({ ...form, sigle: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Responsable" value={form.responsable_name} onChange={(e) => setForm({ ...form, responsable_name: e.target.value })} />
              <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Site internet" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Adresse" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Input label="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <Input label="Pays" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Devise" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              <Input label="RCCM" value={form.rccm} onChange={(e) => setForm({ ...form, rccm: e.target.value })} />
              <Input label="N° fiscal" value={form.tax_number} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
            </div>

            {!editing && (
              <>
                <div className="text-xs font-semibold text-ink uppercase pt-2">Compte administrateur</div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Nom" value={form.admin_name} onChange={(e) => setForm({ ...form, admin_name: e.target.value })} required />
                  <Input label="Email" type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} required />
                </div>
                <Input label="Mot de passe" type="password" value={form.admin_password} onChange={(e) => setForm({ ...form, admin_password: e.target.value })} required />

                <div className="text-xs font-semibold text-ink uppercase pt-2">Abonnement initial</div>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Formule" value={form.subscription_plan_id} onChange={(e) => setForm({ ...form, subscription_plan_id: e.target.value })}>
                    <option value="">— Aucune —</option>
                    {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                  <Input label="Durée (jours)" type="number" value={form.trial_days} onChange={(e) => setForm({ ...form, trial_days: e.target.value })} />
                </div>
              </>
            )}

            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
              <Button type="submit">{editing ? 'Enregistrer' : 'Créer l\'établissement'}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
