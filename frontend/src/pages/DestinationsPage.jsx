import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

export default function DestinationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ code: '', libelle: '' })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return api.get('/destinations').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ code: '', libelle: '' }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (d) => { setForm({ code: d.code || '', libelle: d.libelle || '' }); setEditing(d.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/destinations/${editing}`, form); else await api.post('/destinations', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (d) => { if (!confirm('Supprimer cette destination ?')) return; try { await api.delete(`/destinations/${d.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Destinations" subtitle={`${items.length} destination(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle destination</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune destination." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Code</th><th>Libellé</th><th></th></tr></thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{d.code || '—'}</td>
                  <td className="font-medium">{d.libelle}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(d)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(d)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la destination' : 'Nouvelle destination'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Code (facultatif)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Libellé" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} required />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
