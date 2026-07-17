import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

// Cycles fixes (non paramétrables)
const CYCLES = [
  { value: '', label: 'Aucun' },
  { value: 'PREMIER', label: 'Premier cycle' },
  { value: 'SECOND', label: 'Second cycle' },
]
const cycleLabel = (v) => (CYCLES.find((c) => c.value === (v || ''))?.label) || 'Aucun'

export default function Niveaux() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', cycle: '', is_exam: false })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoadError(''); return api.get('/levels')
    .then(({ data }) => setItems(data))
    .catch((e) => { setItems([]); setLoadError(apiError(e)) })
    .finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ code: '', name: '', cycle: '', is_exam: false }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (l) => { setForm({ code: l.code || '', name: l.name, cycle: l.cycle_code || '', is_exam: !!l.is_exam }); setEditing(l.id); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/levels/${editing}`, form); else await api.post('/levels', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (l) => { if (!confirm('Supprimer ce niveau ?')) return; try { await api.delete(`/levels/${l.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Niveaux" subtitle={`${items.length} niveau(x)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau niveau</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun niveau." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Code</th><th>Libellé</th><th>Cycle</th><th>Examen</th><th></th></tr></thead>
            <tbody>
              {items.map((l) => (
                <tr key={l.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{l.code}</td>
                  <td className="font-medium">{l.name}</td>
                  <td>{cycleLabel(l.cycle_code)}</td>
                  <td>{l.is_exam && <Badge value="Examen" />}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(l)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(l)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le niveau' : 'Nouveau niveau'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Input label="Libellé (ex : CP1, 6ème)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Cycle" value={form.cycle} onChange={(e) => setForm({ ...form, cycle: e.target.value })}>
            {CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={!!form.is_exam} onChange={(e) => setForm({ ...form, is_exam: e.target.checked })} className="h-4 w-4" /> Niveau d'examen
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
