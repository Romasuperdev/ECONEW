import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

const empty = { immatriculation: '', marque: '', modele: '', conducteur: '', itineraire: '', destination: '', nb_places: '', couleur: '', carburant: '', num_serie: '' }

export default function BusPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return api.get('/transport/buses').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setEditing(null); setError(''); setModal(true) }
  const openEdit = (b) => { setForm({ ...empty, ...b, nb_places: b.nb_places ?? '' }); setEditing(b.immatriculation); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { ...form, nb_places: form.nb_places || null }
      if (editing) await api.put(`/transport/buses/${editing}`, payload); else await api.post('/transport/buses', payload)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (b) => { if (!confirm('Supprimer ce car ?')) return; try { await api.delete(`/transport/buses/${b.immatriculation}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Cars de transport" subtitle={`${items.length} car(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau car</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun car." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Immatriculation</th><th>Marque</th><th>Itinéraire</th><th>Destination</th><th>Places</th><th></th></tr></thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id ?? b.immatriculation} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{b.immatriculation}</td>
                  <td className="font-medium">{b.marque} {b.modele}</td>
                  <td>{b.itineraire || '—'}</td>
                  <td>{b.destination || '—'}</td>
                  <td className="text-ink">{b.nb_places ?? '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(b)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(b)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le car' : 'Nouveau car'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Immatriculation" value={form.immatriculation} onChange={(e) => set('immatriculation', e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Marque" value={form.marque} onChange={(e) => set('marque', e.target.value)} />
            <Input label="Modèle" value={form.modele} onChange={(e) => set('modele', e.target.value)} />
          </div>
          <Input label="Conducteur" value={form.conducteur} onChange={(e) => set('conducteur', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Itinéraire" value={form.itineraire} onChange={(e) => set('itineraire', e.target.value)} />
            <Input label="Destination" value={form.destination} onChange={(e) => set('destination', e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Nb places" type="number" value={form.nb_places} onChange={(e) => set('nb_places', e.target.value)} />
            <Input label="Couleur" value={form.couleur} onChange={(e) => set('couleur', e.target.value)} />
            <Input label="Carburant" value={form.carburant} onChange={(e) => set('carburant', e.target.value)} />
          </div>
          <Input label="N° de série" value={form.num_serie} onChange={(e) => set('num_serie', e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
