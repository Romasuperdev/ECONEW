import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

// Types de permis ivoiriens
const PERMIS = ['A', 'A1', 'B', 'C', 'D', 'E', 'F']
const empty = { code: '', nom: '', prenom: '', telephone: '', num_permis: '', type_permis: '', date_naissance: '', adresse: '', photo: '' }

export default function ChauffeursPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return api.get('/transport/chauffeurs').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (c) => { setForm({ ...empty, ...c }); setEditing(c.id); setError(''); setModal(true) }
  const onPhoto = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => set('photo', r.result); r.readAsDataURL(f) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/transport/chauffeurs/${editing}`, form); else await api.post('/transport/chauffeurs', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (c) => { if (!confirm('Supprimer ce chauffeur ?')) return; try { await api.delete(`/transport/chauffeurs/${c.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Chauffeurs" subtitle={`${items.length} chauffeur(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau chauffeur</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun chauffeur." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Photo</th><th>Matricule</th><th>Nom & prénom</th><th>Téléphone</th><th>Permis</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-1.5">{c.photo ? <img src={c.photo} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="inline-flex w-9 h-9 rounded-full items-center justify-center" style={{ background: 'var(--surface-2)' }}><Icon name="students" size={16} /></span>}</td>
                  <td className="font-mono text-xs">{c.code || '—'}</td>
                  <td className="font-medium">{c.full_name || `${c.prenom || ''} ${c.nom || ''}`}</td>
                  <td>{c.telephone || '—'}</td>
                  <td>{c.num_permis || '—'}</td>
                  <td>{c.type_permis || '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(c)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(c)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le chauffeur' : 'Nouveau chauffeur'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Matricule" value={form.code} onChange={(e) => set('code', e.target.value)} required />
          <Input label="Nom" value={form.nom} onChange={(e) => set('nom', e.target.value)} required />
          <Input label="Prénom" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
          <Input label="Téléphone" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} />
          <Input label="N° permis" value={form.num_permis} onChange={(e) => set('num_permis', e.target.value)} />
          <Select label="Type de permis" value={form.type_permis} onChange={(e) => set('type_permis', e.target.value)}>
            <option value="">— Choisir —</option>
            {PERMIS.map((p) => <option key={p} value={p}>Permis {p}</option>)}
          </Select>
          <Input label="Date de naissance" value={form.date_naissance} onChange={(e) => set('date_naissance', e.target.value)} />
          <Input label="Adresse" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
          <label className="block full-width">
            <span className="block text-sm font-bold text-heading mb-1.5">Photo</span>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-lg border flex items-center justify-center overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Icon name="students" size={22} />}
              </div>
              <input type="file" accept="image/*" onChange={onPhoto} className="text-xs" />
            </div>
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
