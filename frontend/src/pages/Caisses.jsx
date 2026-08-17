import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'
import { useAuth } from '../context/AuthContext'

const empty = { name: '', code: '', description: '', is_principal: false, statut: 'actif' }

export default function Caisses() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const manage = can('treasury.view')

  const load = () => { setLoadError(''); return api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setItems(data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (c) => { setForm({ name: c.name, code: c.code || '', description: c.description || '', is_principal: !!c.is_principal, statut: c.statut || 'actif' }); setEditing(c.code ?? c.id); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const body = { name: form.name, description: form.description, is_principal: form.is_principal, statut: form.statut }
      if (editing) await api.put(`/cash-accounts/${editing}`, body)
      else await api.post('/cash-accounts', { ...body, code: form.code })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const toggleStatut = async (c) => {
    const next = (c.statut || 'actif') === 'actif' ? 'inactif' : 'actif'
    try { await api.put(`/cash-accounts/${c.code ?? c.id}`, { name: c.name, statut: next }); load() }
    catch (err) { alert(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (c) => { if (!confirm('Supprimer cette caisse ?')) return; try { await api.delete(`/cash-accounts/${c.code ?? c.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Caisses" subtitle={`${items.length} caisse(s)`}
        action={manage && <Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle caisse</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune caisse." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Code</th><th>Libellé</th><th>Description</th><th>Statut</th><th>Type</th><th>Créée le</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => {
                const actif = (a.statut || 'actif') === 'actif'
                return (
                  <tr key={a.id} className="border-t hover:bg-brand-50" style={{ opacity: actif ? 1 : 0.6 }}>
                    <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                    <td className="font-medium">{a.name}</td>
                    <td className="text-ink">{a.description || '—'}</td>
                    <td>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={actif ? { background: '#E5FFF7', color: '#007E58' } : { background: '#fdecec', color: '#b23b28' }}>
                        {actif ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{a.is_principal && <Badge value="Principale" />}</td>
                    <td className="text-ink text-xs">{a.created_at ? String(a.created_at).slice(0, 10) : '—'}</td>
                    <td className="text-right px-4 space-x-3 whitespace-nowrap">
                      {manage && <button onClick={() => openEdit(a)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>}
                      {manage && <button onClick={() => toggleStatut(a)} className="hover:underline" style={{ color: actif ? '#a9761a' : '#007E58' }}>{actif ? 'Désactiver' : 'Activer'}</button>}
                      {manage && <button onClick={() => remove(a)} className="text-red-600 hover:underline">Suppr.</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la caisse' : 'Nouvelle caisse'}>
        <form onSubmit={save} className="space-y-4">
          {!editing && <Input label="Code caisse" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}
          <Input label="Libellé" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label className="block">
            <span className="block text-sm font-bold text-heading mb-1.5">Description</span>
            <textarea className="field" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex : Caisse principale de l'accueil (facultatif)" />
          </label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={!!form.is_principal} onChange={(e) => setForm({ ...form, is_principal: e.target.checked })} className="h-4 w-4" /> Caisse principale
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input type="checkbox" checked={form.statut === 'actif'} onChange={(e) => setForm({ ...form, statut: e.target.checked ? 'actif' : 'inactif' })} className="h-4 w-4" /> Caisse active
            </label>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
