import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import EcheancierEditor from '../components/EcheancierEditor'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const empty = { destination_id: '', montant_mois: '', montant_annee: '', nb_versements: '' }

export default function GrilleTransport() {
  const [items, setItems] = useState([])
  const [destinations, setDestinations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [lines, setLines] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/transport-tarifs').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => setDestinations([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const destName = useMemo(() => { const m = {}; destinations.forEach((d) => { m[String(d.id)] = d.libelle }); return m }, [destinations])

  const openCreate = () => { setForm(empty); setLines([]); setEditing(null); setError(''); setModal(true) }
  const openEdit = async (t) => {
    setForm({ destination_id: String(t.destination_id ?? ''), montant_mois: t.montant_mois ?? '', montant_annee: t.montant_annee ?? '', nb_versements: '' })
    setEditing(t.id); setError(''); setModal(true)
    try { const { data } = await api.get('/echeancier', { params: { type: 'TRANSPORT', ref_id: t.id } }); setLines(data); setForm((f) => ({ ...f, nb_versements: String(data.length || '') })) } catch (e) { setLines([]) }
  }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { destination_id: form.destination_id, montant_mois: form.montant_mois || null, montant_annee: form.montant_annee || null }
      const resp = editing ? await api.put(`/transport-tarifs/${editing}`, payload) : await api.post('/transport-tarifs', payload)
      const id = resp.data?.id || editing
      if (id) await api.post('/echeancier', { type: 'TRANSPORT', ref_id: String(id), lignes: lines })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (t) => { if (!confirm('Supprimer ce tarif ?')) return; try { await api.delete(`/transport-tarifs/${t.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Grille tarifaire — Transport" subtitle={`${items.length} tarif(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau tarif</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun tarif. Créez d'abord vos destinations." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Destination</th><th className="text-right">Montant / mois</th><th className="text-right">Montant / année</th><th></th></tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{destName[String(t.destination_id)] || t.destination_id || '—'}</td>
                  <td className="text-right">{formatMoney(t.montant_mois)}</td>
                  <td className="text-right">{formatMoney(t.montant_annee)}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(t)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(t)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le tarif' : 'Nouveau tarif'} size="2xl">
        <form onSubmit={save} className="space-y-4">
          <Select label="Destination" value={form.destination_id} onChange={(e) => set('destination_id', e.target.value)} required>
            <option value="">— Choisir une destination —</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </Select>
          <Input label="Montant / mois" type="number" value={form.montant_mois} onChange={(e) => set('montant_mois', e.target.value)} />
          <Input label="Montant / année" type="number" value={form.montant_annee} onChange={(e) => set('montant_annee', e.target.value)} />
          <Input label="Nombre de versements" type="number" value={form.nb_versements} onChange={(e) => set('nb_versements', e.target.value)} />
          <div className="full-width">
            <div className="text-sm font-bold text-heading mb-1.5">Échéancier</div>
            <EcheancierEditor nb={form.nb_versements} lines={lines} setLines={setLines} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
