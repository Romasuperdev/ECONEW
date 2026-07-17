import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

const empty = { code_chauffeur: '', immatriculation: '', date_debut: new Date().toISOString().slice(0, 10), date_fin: '' }

export default function ChauffeurCarPage() {
  const [items, setItems] = useState([])
  const [chauffeurs, setChauffeurs] = useState([])
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/transport/affectations').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/transport/chauffeurs').then(({ data }) => setChauffeurs(data.data || data)).catch(() => setChauffeurs([])),
    api.get('/transport/buses').then(({ data }) => setBuses(data.data || data)).catch(() => setBuses([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const chName = useMemo(() => { const m = {}; chauffeurs.forEach((c) => { m[String(c.code)] = c.full_name || `${c.prenom || ''} ${c.nom || ''}` }); return m }, [chauffeurs])

  const openCreate = () => { setForm(empty); setError(''); setModal(true) }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      await api.post('/transport/affectations', { ...form, date_fin: form.date_fin || null })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (a) => { if (!confirm('Supprimer cette affectation ?')) return; try { await api.delete(`/transport/affectations/${a.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Chauffeur / Car" subtitle={`${items.length} affectation(s)`} action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle affectation</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune affectation." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Chauffeur</th><th>Car</th><th>Début</th><th>Fin</th><th></th></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{chName[String(a.code_chauffeur)] || a.code_chauffeur}</td>
                  <td className="font-mono text-xs">{a.immatriculation}</td>
                  <td>{a.date_debut || '—'}</td>
                  <td>{a.date_fin || '—'}</td>
                  <td className="text-right px-4"><button onClick={() => remove(a)} className="text-red-600 hover:underline">Suppr.</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title="Affecter un chauffeur à un car">
        <form onSubmit={save} className="space-y-4">
          <Select label="Chauffeur" value={form.code_chauffeur} onChange={(e) => set('code_chauffeur', e.target.value)} required>
            <option value="">— Choisir —</option>
            {chauffeurs.map((c) => <option key={c.id ?? c.code} value={c.code}>{c.full_name || `${c.prenom || ''} ${c.nom || ''}`}</option>)}
          </Select>
          <Select label="Car" value={form.immatriculation} onChange={(e) => set('immatriculation', e.target.value)} required>
            <option value="">— Choisir —</option>
            {buses.map((b) => <option key={b.immatriculation} value={b.immatriculation}>{b.immatriculation}{b.marque ? ` (${b.marque})` : ''}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date début" type="date" value={form.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
            <Input label="Date fin" type="date" value={form.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
