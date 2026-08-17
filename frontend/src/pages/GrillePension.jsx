import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import EcheancierEditor from '../components/EcheancierEditor'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const empty = { libelle: '', montant_total: '', nb_versements: '' }

export default function GrillePension() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [lines, setLines] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const load = () => { setLoadError(''); return api.get('/pension/grille').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(empty); setLines([]); setEditing(null); setError(''); setModal(true) }
  const openEdit = async (g) => {
    setForm({ libelle: g.libelle || '', montant_total: g.montant_total ?? '', nb_versements: g.nb_versements ?? '' })
    setEditing(g.id); setError(''); setModal(true)
    try { const { data } = await api.get('/echeancier', { params: { type: 'PENSION', ref_id: g.id } }); if (data.length) { setLines(data); setForm((f) => ({ ...f, nb_versements: String(data.length) })) } else setLines([]) } catch (e) { setLines([]) }
  }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = { libelle: form.libelle || null, montant_total: Number(form.montant_total || 0), nb_versements: form.nb_versements || null }
      const resp = editing ? await api.put(`/pension/grille/${editing}`, payload) : await api.post('/pension/grille', payload)
      const id = resp.data?.id ?? resp.data?.data?.id ?? editing
      if (id) await api.post('/echeancier', { type: 'PENSION', ref_id: String(id), lignes: lines })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (g) => { if (!confirm('Supprimer cette ligne ?')) return; try { await api.delete(`/pension/grille/${g.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Grille tarifaire — Pension" subtitle="Frais de pension" action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau tarif</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun tarif." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Libellé</th><th className="text-right">Montant / année</th><th>Versements</th><th></th></tr></thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{g.libelle || '—'}</td>
                  <td className="text-right font-semibold">{formatMoney(g.montant_total)}</td>
                  <td className="text-ink">{g.nb_versements ?? '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    {g.id
                      ? <button onClick={() => openEdit(g)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                      : <span className="text-xs text-gray-400" title="Ligne héritée sans identifiant : non modifiable">Modifier</span>}
                    <button onClick={() => remove(g)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le tarif' : 'Frais de pension'} size="2xl">
        <form onSubmit={save} className="space-y-4">
          <Input label="Libellé" value={form.libelle} onChange={(e) => set('libelle', e.target.value)} />
          <Input label="Montant / année" type="number" value={form.montant_total} onChange={(e) => set('montant_total', e.target.value)} required />
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
