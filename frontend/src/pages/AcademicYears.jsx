import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { formatDate } from '../utils/format'

const statutBadge = {
  ouverte: { label: 'Ouverte', bg: 'var(--teal)' },
  cloture_partielle: { label: 'Clôture partielle', bg: 'var(--accent)' },
  cloturee: { label: 'Clôturée', bg: '#dc2626' },
  inactive: { label: 'Inactive', bg: 'var(--muted)' },
}

export default function AcademicYears() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ code: '', label: '', start_date: '', end_date: '' })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => { setLoading(true); api.get('/academic-years').then(({ data }) => setItems(data)).finally(() => setLoading(false)) }
  useEffect(load, [])

  const openCreate = () => { setForm({ code: '', label: '', start_date: '', end_date: '' }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (y) => { setForm({ code: y.code || '', label: y.label || '', start_date: y.start_date || '', end_date: y.end_date || '' }); setEditing(y.id); setError(''); setModal(true) }
  const create = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/academic-years/${editing}`, form); else await api.post('/academic-years', form)
      setModal(false); load()
    }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const action = async (y, path, confirmMsg) => {
    if (confirmMsg && !confirm(confirmMsg)) return
    try { await api.post(`/academic-years/${y.id}/${path}`); load() }
    catch (err) { alert(err.response?.data?.message || 'Action impossible.') }
  }
  const remove = async (y) => {
    if (!confirm(`Supprimer l'année ${y.label} ?`)) return
    try { await api.delete(`/academic-years/${y.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Impossible.') }
  }

  return (
    <>
      <PageHeader title="Années scolaires" subtitle="Créer, ouvrir et clôturer les années académiques"
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle année</Button>} />

      {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune année. Créez-en une." /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((y) => {
            const b = statutBadge[y.statut] || statutBadge.inactive
            return (
              <Card key={y.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
                      <Icon name="calendar" size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-heading">{y.label}</div>
                      <div className="text-xs text-muted">{formatDate(y.start_date)} → {formatDate(y.end_date)}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white" style={{ background: b.bg }}>{b.label}</span>
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {!y.cloture_definitive && (
                    <Button variant="ghost" onClick={() => openEdit(y)}>Modifier</Button>
                  )}
                  {!y.is_current && !y.cloture_definitive && (
                    <Button variant="gold" onClick={() => action(y, 'activate')}>Ouvrir</Button>
                  )}
                  {!y.cloture_partielle && !y.cloture_definitive && (
                    <Button variant="ghost" onClick={() => action(y, 'close-partial', 'Clôturer partiellement cette année ?')}>Clôture partielle</Button>
                  )}
                  {!y.cloture_definitive && (
                    <Button variant="danger" onClick={() => action(y, 'close-definitive', 'Clôture DÉFINITIVE : irréversible. Continuer ?')}>Clôture définitive</Button>
                  )}
                  {!y.is_current && (
                    <button onClick={() => remove(y)} className="text-red-600 text-sm hover:underline ml-auto self-center">Supprimer</button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier l\'année scolaire' : 'Nouvelle année scolaire'}>
        <form onSubmit={create} className="space-y-4">
          <Input label="Code (auto si vide)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          <Input label="Libellé (ex. 2025-2026)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Début" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="Fin" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button><Button type="submit">{editing ? 'Enregistrer' : 'Créer'}</Button></div>
        </form>
      </Modal>
    </>
  )
}
