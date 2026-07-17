import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import Icon from '../../components/Icon'

const empty = { code: '', name: '' }

export default function Applications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoading(true); api.get('/super/applications').then(({ data }) => setItems(Array.isArray(data) ? data : [])).finally(() => setLoading(false)) }
  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (a) => { setForm({ code: a.code, name: a.name || '' }); setEditing(a.code); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/super/applications/${editing}`, { name: form.name })
      else await api.post('/super/applications', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (a) => { if (!confirm(`Supprimer l'application ${a.code} ?`)) return; try { await api.delete(`/super/applications/${a.code}`); load() } catch (err) { alert(err.response?.data?.message || 'Impossible.') } }

  return (
    <>
      <PageHeader title="Applications" subtitle={`${items.length} application(s)`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle application</Button>} />

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="text-left"><tr><th className="px-4 py-3">Code</th><th>Nom</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.code} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{a.code}</td>
                  <td className="font-medium">{a.name || '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(a)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(a)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Modifier l'application" : 'Nouvelle application'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} required />
          <Input label="Nom / libellé" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
