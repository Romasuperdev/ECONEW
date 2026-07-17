import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'
import { useAuth } from '../context/AuthContext'

export default function Caisses() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', is_principal: false })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const manage = can('treasury.view')

  const load = () => { setLoadError(''); return api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setItems(data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ name: '', code: '', is_principal: false }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (c) => { setForm({ name: c.name, code: c.code || '', is_principal: !!c.is_principal }); setEditing(c.code ?? c.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/cash-accounts/${editing}`, { name: form.name, is_principal: form.is_principal })
      else await api.post('/cash-accounts', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
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
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Code</th><th>Libellé</th><th>Type</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                  <td className="font-medium">{a.name}</td>
                  <td>{a.is_principal && <Badge value="Principale" />}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    {manage && <button onClick={() => openEdit(a)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>}
                    {manage && <button onClick={() => remove(a)} className="text-red-600 hover:underline">Suppr.</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la caisse' : 'Nouvelle caisse'}>
        <form onSubmit={save} className="space-y-4">
          {!editing && <Input label="Code caisse" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}
          <Input label="Libellé" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={!!form.is_principal} onChange={(e) => setForm({ ...form, is_principal: e.target.checked })} className="h-4 w-4" /> Caisse principale
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
