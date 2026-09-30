import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'

// Établissements = ECONOMAT.dbo.T_ETABLISSEMENT (identifiant : CODE).
const empty = {
  code: '', name: '', type: '', code_societe: '',
  address: '', phone: '', fax: '', email: '', website: '',
  city: '', circonscription: '',
  nom_resp: '', prenom_resp: '', contact_resp: '', email_directeur: '',
}

export default function Schools() {
  const [items, setItems] = useState([])
  const [societes, setSocietes] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null) // fiche complète T_ETABLISSEMENT

  const load = () => {
    setLoading(true)
    api.get('/super/schools', { params: { search, status } })
      .then(({ data }) => setItems(data.data || data)).finally(() => setLoading(false))
  }

  useEffect(() => { api.get('/super/societes').then(({ data }) => setSocietes(data)).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search, status])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const societeName = (code) => societes.find((s) => String(s.code) === String(code))?.name

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (s) => {
    const f = { ...empty }
    Object.keys(empty).forEach((k) => { f[k] = s[k] ?? '' })
    setForm(f); setEditing(s.id); setError(''); setModal(true)
  }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) {
        const { code, ...payload } = form
        await api.put(`/super/schools/${encodeURIComponent(editing)}`, payload)
      } else {
        await api.post('/super/schools', form)
      }
      setModal(false); load()
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Erreur.'))
    }
  }

  const changeStatus = async (school, newStatus) => {
    await api.patch(`/super/schools/${encodeURIComponent(school.id)}/status`, { status: newStatus })
    load()
  }

  const remove = async (school) => {
    if (!confirm(`Supprimer l'établissement ${school.name} (${school.code}) ?`)) return
    try { await api.delete(`/super/schools/${encodeURIComponent(school.id)}`); load() }
    catch (err) { alert(err.response?.data?.message || 'Suppression impossible.') }
  }

  return (
    <>
      <PageHeader title="Établissements" subtitle={`${items.length} établissement(s)`}
        action={<Button onClick={openCreate}>+ Nouvel établissement</Button>} />

      <Card className="p-4 mb-4 flex gap-3">
        <Input placeholder="Rechercher par nom ou code…" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="max-w-xs">
          <option value="">Tous les statuts</option>
          <option value="active">Actifs</option>
          <option value="suspended">Suspendus</option>
          <option value="inactive">Inactifs</option>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr>
                <th className="px-4 py-3">Établissement</th><th>Code</th><th>Type</th>
                <th>Téléphone</th><th>Email</th><th>Élèves</th>
                <th>Sous-préfecture</th><th>Société</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-ink text-xs">{s.responsable_name || '—'}</div>
                  </td>
                  <td className="font-mono text-xs">{s.code}</td>
                  <td>{s.type || '—'}</td>
                  <td className="whitespace-nowrap">{s.phone || '—'}</td>
                  <td className="text-xs">{s.email || '—'}</td>
                  <td>{s.students_count ?? 0}</td>
                  <td>{s.city || '—'}</td>
                  <td className="text-xs" title={societeName(s.code_societe) || ''}>
                    <span className="font-mono">{s.code_societe || '—'}</span>
                  </td>
                  <td><Badge value={s.status === 'active' ? 'actif' : s.status} /></td>
                  <td className="text-right px-4 space-x-2 whitespace-nowrap">
                    <button onClick={() => setDetail(s)} className="hover:underline" style={{ color: 'var(--teal)' }}>Détails</button>
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
          </div>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier l\'établissement' : 'Nouvel établissement'}>
        <form onSubmit={save} className="space-y-4">
          <div className="text-xs font-semibold text-ink uppercase">Identité</div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Code" value={form.code} onChange={set('code')} maxLength={10} required disabled={!!editing} />
            <div className="col-span-2"><Input label="Raison sociale" value={form.name} onChange={set('name')} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Type" value={form.type} onChange={set('type')} placeholder="PRIVE, PUBLIC…" />
            <Select label="Société" value={form.code_societe} onChange={set('code_societe')}>
              <option value="">— Aucune —</option>
              {societes.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}
            </Select>
          </div>

          <div className="text-xs font-semibold text-ink uppercase pt-2">Coordonnées</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Adresse" value={form.address} onChange={set('address')} />
            <Input label="Téléphone" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Fax" value={form.fax} onChange={set('fax')} />
            <Input label="Email" type="email" value={form.email} onChange={set('email')} />
            <Input label="Site web" value={form.website} onChange={set('website')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Sous-préfecture" value={form.city} onChange={set('city')} />
            <Input label="Circonscription" value={form.circonscription} onChange={set('circonscription')} />
          </div>

          <div className="text-xs font-semibold text-ink uppercase pt-2">Responsable</div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom" value={form.nom_resp} onChange={set('nom_resp')} />
            <Input label="Prénom" value={form.prenom_resp} onChange={set('prenom_resp')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Contact" value={form.contact_resp} onChange={set('contact_resp')} />
            <Input label="Email directeur" type="email" value={form.email_directeur} onChange={set('email_directeur')} />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">{editing ? 'Enregistrer' : 'Créer l\'établissement'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Fiche établissement — ${detail?.name || ''}`} size="lg">
        {detail?.details && (() => {
          const d = detail.details
          const groups = [
            ['Identité', [
              ['Code', d.code], ['Raison sociale', d.raison_sociale], ['Type', d.type],
              ['Statut', d.statut], ['Nombre d\'élèves', d.nbre_eleves], ['Code société', d.code_societe],
            ]],
            ['Coordonnées', [
              ['Adresse', d.adresse], ['Téléphone', d.telephone], ['Fax', d.fax],
              ['Email', d.email], ['Site web', d.site_web],
              ['Sous-préfecture', d.sous_prefecture], ['Circonscription', d.circonscription],
            ]],
            ['Responsable', [
              ['Nom', d.nom_resp], ['Prénom', d.prenom_resp], ['Sexe', d.sexe],
              ['Contact', d.contact_resp], ['Adresse', d.adresse_resp],
              ['Occupation', d.occupation_resp], ['Email directeur', d.email_directeur],
            ]],
            ['Administration (DREN / IEP)', [
              ['Code IEP', d.code_iep], ['Intitulé IEP', d.intitule_iep],
              ['Code DREN', d.code_dren], ['Intitulé DREN', d.intitule_dren],
              ['Direction dép.', d.direction_dep], ['Nom source', d.nom_source],
            ]],
            ['Comptabilité & caisse', [
              ['ID compta', d.id_compta], ['Type base', d.type_base],
              ['Base SAGE', d.nom_base_sage], ['Base BACOU', d.nom_base_bacou],
              ['Compte tréso', d.compte_treso], ['Code journal', d.code_jrnal],
              ['Compte tiers', d.compte_tiers], ['N° compte', d.num_compte],
              ['Compte scolarité', d.compte_sco], ['Compte TP', d.compte_tp],
              ['Compte cantine', d.compte_cant], ['Compte pension', d.compte_pens],
              ['Liaison caisse', d.liaison_caisse], ['Base caisse', d.base_caisse],
              ['Nom caisse', d.nom_caisse], ['Regroupement rub.', d.rub_regroup],
              ['Bool PDT', d.bool_pdt],
            ]],
            ['Montants & niveaux', [
              ['Montant 1er cycle', d.mt_1cycle], ['Montant 2e cycle', d.mt_2cycle],
              ['NIV1', d.niv1], ['NIV2', d.niv2], ['NIV3', d.niv3], ['NIV4', d.niv4],
              ['NIV5', d.niv5], ['NIV6', d.niv6], ['NIV7', d.niv7],
            ]],
          ]
          const val = (v) => (v === null || v === undefined || v === '') ? '—' : String(v)
          return (
            <div className="space-y-5">
              {groups.map(([title, rows]) => (
                <div key={title}>
                  <div className="text-xs font-semibold uppercase text-ink mb-2" style={{ color: 'var(--teal)' }}>{title}</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {rows.map(([label, v]) => (
                      <div key={label} className="flex justify-between gap-3 border-b border-dashed py-1" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-muted text-xs">{label}</span>
                        <span className="text-sm font-medium text-right break-all">{val(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end"><Button onClick={() => setDetail(null)}>Fermer</Button></div>
            </div>
          )
        })()}
      </Modal>
    </>
  )
}
