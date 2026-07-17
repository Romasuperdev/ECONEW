import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'

/** Structure académique : Cycles → Niveaux → Classes */
export default function Structure() {
  const [cycles, setCycles] = useState([])
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [selCycle, setSelCycle] = useState(null)
  const [selLevel, setSelLevel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // 'cycle' | 'level' | 'class'
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const loadCycles = () => api.get('/cycles').then(({ data }) => setCycles(data))
  const loadLevels = () => api.get('/levels').then(({ data }) => setLevels(data))
  const loadClasses = () => api.get('/school-classes').then(({ data }) => setClasses(data))

  useEffect(() => { Promise.all([loadCycles(), loadLevels(), loadClasses()]).finally(() => setLoading(false)) }, [])

  const levelsOfCycle = selCycle ? levels.filter((l) => String(l.cycle_id) === String(selCycle)) : levels
  const classesOfLevel = selLevel ? classes.filter((c) => String(c.level_id) === String(selLevel)) : classes

  const open = (type, initial = {}, edit = null) => { setModal(type); setForm(initial); setEditing(edit); setError('') }

  const save = async (e) => {
    e.preventDefault(); setError('')
    const map = {
      cycle: { url: '/cycles', reload: loadCycles },
      level: { url: '/levels', reload: loadLevels },
      class: { url: '/school-classes', reload: loadClasses },
    }
    const { url, reload } = map[modal]
    try {
      if (editing) await api.put(`${url}/${editing}`, form)
      else await api.post(url, form)
      setModal(null); reload()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (url, id, reload) => {
    if (!confirm('Supprimer cet élément ?')) return
    await api.delete(`${url}/${id}`); reload()
  }

  const Column = ({ title, count, onAdd, children }) => (
    <Card className="p-0 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-brand-800">{title} <span className="text-ink font-normal">({count})</span></h3>
        <button onClick={onAdd} className="text-brand-600 text-sm font-medium hover:underline">+ Ajouter</button>
      </div>
      <div className="p-2 flex-1 space-y-1 min-h-[200px]">{children}</div>
    </Card>
  )

  const Row = ({ active, onClick, children, onEdit, onDelete }) => (
    <div onClick={onClick}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${active ? 'bg-gold-500/15 border border-gold-500/40' : 'hover:bg-slate-50'}`}>
      <span>{children}</span>
      <span className="opacity-0 group-hover:opacity-100 flex gap-2">
        <button onClick={(e) => { e.stopPropagation(); onEdit() }} className="text-brand-600">✎</button>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-red-500">✕</button>
      </span>
    </div>
  )

  if (loading) return <EmptyState message="Chargement…" />

  return (
    <>
      <PageHeader title="Structure académique" subtitle="Cycles, niveaux et classes de l'établissement" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Column title="Cycles" count={cycles.length} onAdd={() => open('cycle', { name: '', position: 0 })}>
          {cycles.length === 0 ? <EmptyState message="Aucun cycle" /> : cycles.map((c) => (
            <Row key={c.id} active={String(selCycle) === String(c.id)}
              onClick={() => { setSelCycle(String(selCycle) === String(c.id) ? null : String(c.id)); setSelLevel(null) }}
              onEdit={() => open('cycle', { name: c.name, position: c.position }, c.id)}
              onDelete={() => remove('/cycles', c.id, loadCycles)}>
              {c.name} <span className="text-ink text-xs">· {c.levels_count ?? 0} niveaux</span>
            </Row>
          ))}
        </Column>

        <Column title={selCycle ? 'Niveaux du cycle' : 'Niveaux'} count={levelsOfCycle.length}
          onAdd={() => open('level', { name: '', cycle_id: selCycle || '', position: 0 })}>
          {levelsOfCycle.length === 0 ? <EmptyState message="Aucun niveau" /> : levelsOfCycle.map((l) => (
            <Row key={l.id} active={String(selLevel) === String(l.id)}
              onClick={() => setSelLevel(String(selLevel) === String(l.id) ? null : String(l.id))}
              onEdit={() => open('level', { name: l.name, cycle_id: l.cycle_id || '', position: l.position }, l.id)}
              onDelete={() => remove('/levels', l.id, loadLevels)}>
              {l.name} <span className="text-ink text-xs">· {l.classes_count ?? 0} classes{l.cycle ? ` · ${l.cycle.name}` : ''}</span>
            </Row>
          ))}
        </Column>

        <Column title={selLevel ? 'Classes du niveau' : 'Classes'} count={classesOfLevel.length}
          onAdd={() => open('class', { name: '', section: '', level_id: selLevel || '', capacity: '', is_exam: false })}>
          {classesOfLevel.length === 0 ? <EmptyState message="Aucune classe" /> : classesOfLevel.map((c) => (
            <Row key={c.id} active={false} onClick={() => {}}
              onEdit={() => open('class', { name: c.name, section: c.section || '', level_id: c.level_id || '', capacity: c.capacity || '', is_exam: c.is_exam }, c.id)}
              onDelete={() => remove('/school-classes', c.id, loadClasses)}>
              {c.name}{c.section ? ` ${c.section}` : ''} <span className="text-ink text-xs">· {c.students_count ?? 0} élèves</span>{c.is_exam && <span className="ml-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }}>Examen</span>}
            </Row>
          ))}
        </Column>
      </div>

      <Modal open={modal === 'cycle'} onClose={() => setModal(null)} title={editing ? 'Modifier le cycle' : 'Nouveau cycle'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom (ex: Primaire, Collège)" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Ordre d'affichage" type="number" value={form.position ?? 0} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      <Modal open={modal === 'level'} onClose={() => setModal(null)} title={editing ? 'Modifier le niveau' : 'Nouveau niveau'}>
        <form onSubmit={save} className="space-y-4">
          <Input label="Nom (ex: CP1, 6ème)" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label="Cycle" value={form.cycle_id || ''} onChange={(e) => setForm({ ...form, cycle_id: e.target.value })}>
            <option value="">— Aucun —</option>
            {cycles.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input label="Ordre d'affichage" type="number" value={form.position ?? 0} onChange={(e) => setForm({ ...form, position: Number(e.target.value) })} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>

      <Modal open={modal === 'class'} onClose={() => setModal(null)} title={editing ? 'Modifier la classe' : 'Nouvelle classe'}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nom (ex: CP1)" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Section (ex: A)" value={form.section || ''} onChange={(e) => setForm({ ...form, section: e.target.value })} />
          </div>
          <Select label="Niveau" value={form.level_id || ''} onChange={(e) => setForm({ ...form, level_id: e.target.value })}>
            <option value="">— Aucun —</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}{l.cycle ? ` (${l.cycle.name})` : ''}</option>)}
          </Select>
          <Input label="Capacité" type="number" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : '' })} />
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input type="checkbox" checked={!!form.is_exam} onChange={(e) => setForm({ ...form, is_exam: e.target.checked })} className="h-4 w-4" />
            Classe d'examen
          </label>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setModal(null)}>Annuler</Button><Button type="submit">Enregistrer</Button></div>
        </form>
      </Modal>
    </>
  )
}
