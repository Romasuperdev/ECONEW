import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import EcheancierEditor from '../components/EcheancierEditor'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const empty = { code_grille: '', inscription: '', scolarite: '', frais_annexes: '', nb_versements: '', statut: true }

export default function GrilleScolarite() {
  const { can } = useAuth()
  const [items, setItems] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [lines, setLines] = useState([])
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')
  const manage = can('config.manage')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const total = useMemo(() => Number(form.inscription || 0) + Number(form.scolarite || 0) + Number(form.frais_annexes || 0), [form.inscription, form.scolarite, form.frais_annexes])

  const load = () => { setLoadError(''); return Promise.all([
    api.get('/grille-scolarite').then(({ data }) => setItems(data.data || data)).catch((e) => { setItems([]); setLoadError(apiError(e)) }),
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
  ]).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const nameByCode = useMemo(() => { const m = {}; levels.forEach((l) => { m[String(l.code)] = l.name }); return m }, [levels])

  const openCreate = () => { setForm(empty); setLines([]); setEditing(null); setError(''); setModal(true) }
  const openEdit = async (g) => {
    setForm({ code_grille: g.code_grille || '', inscription: g.inscription ?? '', scolarite: g.scolarite ?? '', frais_annexes: g.frais_annexes ?? '', nb_versements: g.nb_versements ?? '', statut: !!g.affecte })
    setEditing(g.id); setError(''); setModal(true)
    try { const { data } = await api.get('/echeancier', { params: { type: 'SCOLARITE', ref_id: g.id } }); if (data.length) { setLines(data); setForm((f) => ({ ...f, nb_versements: String(data.length) })) } else setLines([]) } catch (e) { setLines([]) }
  }
  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      const payload = {
        code_grille: form.code_grille,
        scolarite: Number(form.scolarite || 0),
        inscription: Number(form.inscription || 0),
        frais_annexes: Number(form.frais_annexes || 0),
        nb_versements: form.nb_versements || null,
        statut: form.statut,
      }
      const resp = editing ? await api.put(`/grille-scolarite/${editing}`, payload) : await api.post('/grille-scolarite', payload)
      const id = resp.data?.id ?? editing
      if (id) await api.post('/echeancier', { type: 'SCOLARITE', ref_id: String(id), lignes: lines })
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }
  const remove = async (g) => { if (!confirm('Supprimer cette grille ?')) return; try { await api.delete(`/grille-scolarite/${g.id}`); load() } catch (err) { alert(err.response?.data?.message || 'Erreur.') } }

  return (
    <>
      <PageHeader title="Grille tarifaire — Scolarité" subtitle={`${items.length} grille(s)`}
        action={manage && <Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle grille</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune grille." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-2">Niveau</th><th className="text-right">Inscription</th><th className="text-right">Scolarité</th><th className="text-right">Frais annexes</th><th className="text-right">Total</th><th>Modalités</th><th>Statut</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((g) => (
                <tr key={g.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{nameByCode[String(g.code_grille)] || g.code_grille || '—'}</td>
                  <td className="text-right">{formatMoney(g.inscription)}</td>
                  <td className="text-right">{formatMoney(g.scolarite)}</td>
                  <td className="text-right">{formatMoney(g.frais_annexes)}</td>
                  <td className="text-right font-semibold">{formatMoney(g.total)}</td>
                  <td className="text-ink">{g.nb_versements ?? '—'}</td>
                  <td>{g.affecte ? <Badge value="Affecté" /> : <span className="text-ink text-xs">Non affecté</span>}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    {manage && <button onClick={() => openEdit(g)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>}
                    {manage && <button onClick={() => remove(g)} className="text-red-600 hover:underline">Suppr.</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la grille' : 'Nouvelle grille'} size="2xl">
        <form onSubmit={save} className="space-y-4">
          <div className="flex items-center justify-between full-width">
            <span className="text-sm font-bold text-heading">Statut</span>
            <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <button type="button" onClick={() => set('statut', true)} className="px-3 py-1.5 text-sm" style={{ background: form.statut ? 'var(--teal)' : 'transparent', color: form.statut ? '#fff' : 'var(--ink)' }}>Affecté</button>
              <button type="button" onClick={() => set('statut', false)} className="px-3 py-1.5 text-sm" style={{ background: !form.statut ? 'var(--accent)' : 'transparent', color: !form.statut ? 'var(--accent-ink)' : 'var(--ink)' }}>Non affecté</button>
            </div>
          </div>
          <Select label="Niveau" value={form.code_grille} onChange={(e) => set('code_grille', e.target.value)} required>
            <option value="">— Choisir un niveau —</option>
            {levels.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}
          </Select>
          <Input label="Inscription" type="number" value={form.inscription} onChange={(e) => set('inscription', e.target.value)} />
          <Input label="Scolarité" type="number" value={form.scolarite} onChange={(e) => set('scolarite', e.target.value)} required />
          <Input label="Frais annexes" type="number" value={form.frais_annexes} onChange={(e) => set('frais_annexes', e.target.value)} />
          <Input label="Total à payer (auto)" value={formatMoney(total)} readOnly className="font-semibold" />
          <Input label="Nombre de modalités" type="number" value={form.nb_versements} onChange={(e) => set('nb_versements', e.target.value)} />
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
