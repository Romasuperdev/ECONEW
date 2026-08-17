import { useEffect, useRef, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import SearchableSelect from '../components/SearchableSelect'
import { apiError } from '../utils/apiError'

/* Catégories de permis : simples + combinées + « Toute catégorie » */
const PERMIS = [
  'A', 'A1', 'A2', 'B', 'BE', 'C', 'CE', 'D', 'DE', 'E', 'F', 'G',
  'AB', 'AC', 'AD', 'ABC', 'ACD', 'ABD', 'ABCD', 'BCE', 'CDE', 'BCDE',
  'Toute catégorie',
]
const SEXES = ['Masculin', 'Féminin']
const STATUTS = ['Actif', 'Inactif', 'Suspendu']

const MAX_PHOTO = 5 * 1024 * 1024 // 5 Mo
const PHOTO_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

const empty = {
  code: '', nom: '', prenom: '', sexe: '', telephone: '', num_permis: '', type_permis: '',
  date_naissance: '', date_delivrance: '', date_expiration: '', adresse: '', statut: 'Actif', photo: '',
}

export default function ChauffeursPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(empty)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const load = () => {
    setLoadError('')
    return api.get('/transport/chauffeurs')
      .then(({ data }) => setItems(data.data || data))
      .catch((e) => { setItems([]); setLoadError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const showToast = (type, title, msg, record) => { setToast({ type, title, msg, record }); setTimeout(() => setToast(null), 6000) }

  const openCreate = () => { setForm(empty); setEditing(null); setErrors({}); setModal(true) }
  const openEdit = (c) => { setForm({ ...empty, ...c }); setEditing(c.id); setErrors({}); setModal(true) }

  /* ---------- Photo : import / drag&drop / validation ---------- */
  const handleFile = (file) => {
    if (!file) return
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const okExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext)
    if (!PHOTO_TYPES.includes(file.type) && !okExt) {
      setErrors((e) => ({ ...e, photo: 'Format non accepté. Utilisez JPG, JPEG, PNG ou WEBP.' })); return
    }
    if (file.size > MAX_PHOTO) {
      setErrors((e) => ({ ...e, photo: 'Image trop lourde (5 Mo maximum).' })); return
    }
    const r = new FileReader()
    r.onload = () => set('photo', r.result)
    r.readAsDataURL(file)
  }
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }

  /* ---------- Validation ---------- */
  const validate = () => {
    const e = {}
    if (!form.code.trim()) e.code = 'Le matricule est requis.'
    if (!form.nom.trim()) e.nom = 'Le nom est requis.'
    if (form.date_delivrance && form.date_expiration && form.date_expiration < form.date_delivrance) {
      e.date_expiration = "La date d'expiration doit suivre la date de délivrance."
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const persist = async () => {
    if (editing) { const { data } = await api.put(`/transport/chauffeurs/${editing}`, form); return data }
    const { data } = await api.post('/transport/chauffeurs', form); return data
  }

  const save = async (mode) => {
    if (!validate()) return
    setSaving(true)
    try {
      const saved = await persist()
      await load()
      const record = { ...form, ...saved }
      if (mode === 'another') {
        setForm(empty); setEditing(null); setErrors({})
        showToast('ok', 'Chauffeur enregistré', 'Vous pouvez saisir un nouveau chauffeur.', record)
      } else {
        setModal(false)
        showToast('ok', 'Chauffeur enregistré', 'La fiche a été enregistrée avec succès.', record)
      }
    } catch (err) {
      showToast('ko', 'Enregistrement impossible', err.response?.data?.message || 'Vérifiez les champs puis réessayez.')
    } finally { setSaving(false) }
  }

  const remove = async (c) => {
    if (!confirm('Supprimer ce chauffeur ?')) return
    try { await api.delete(`/transport/chauffeurs/${c.id}`); load() }
    catch (err) { showToast('ko', 'Suppression impossible', err.response?.data?.message || 'Erreur.') }
  }

  /* ---------- Fiche imprimable A4 (PDF via navigateur) ---------- */
  const printFiche = (c) => {
    const esc = (s) => String(s ?? '—').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
    const created = c.created_at ? String(c.created_at).slice(0, 10) : new Date().toISOString().slice(0, 10)
    const row = (k, v) => `<tr><td class="k">${k}</td><td class="v">${esc(v)}</td></tr>`
    const photo = c.photo
      ? `<img src="${c.photo}" alt="photo"/>`
      : `<div class="ph">Photo</div>`
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Fiche chauffeur — ${esc(c.nom)} ${esc(c.prenom)}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;font-family:"Segoe UI",Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  @page{size:A4;margin:14mm}
  body{color:#1d2637}
  .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #14223f;padding-bottom:12px}
  .head .t{font-size:22px;font-weight:800;color:#14223f}
  .head .s{font-size:11px;color:#5c6b82;margin-top:2px}
  .badge{background:#d9a441;color:#2a1e05;font-weight:800;font-size:11px;padding:6px 12px;border-radius:8px}
  .body{display:flex;gap:22px;margin-top:22px}
  .photo{width:120px;flex:none}
  .photo img,.photo .ph{width:120px;height:150px;border-radius:10px;object-fit:cover;border:1px solid #dce3ee}
  .photo .ph{display:flex;align-items:center;justify-content:center;color:#9aa7bd;background:#f4f7fb;font-size:12px}
  .sig{margin-top:16px;border:1px dashed #c3ccdb;border-radius:8px;height:80px;display:flex;align-items:flex-end;justify-content:center;padding:6px;color:#8a95a8;font-size:10px}
  table{width:100%;border-collapse:collapse}
  td{padding:8px 10px;border-bottom:1px solid #eef2f7;font-size:12.5px;vertical-align:top}
  td.k{color:#5c6b82;width:42%;font-weight:600}
  td.v{color:#1d2637;font-weight:700}
  .foot{margin-top:26px;font-size:10px;color:#8a95a8;text-align:center;border-top:1px solid #eef2f7;padding-top:8px}
</style></head><body>
  <div class="head">
    <div><div class="t">Fiche du chauffeur</div><div class="s">Nexora Economat · Gestion du transport scolaire</div></div>
    <div class="badge">${esc(c.statut || 'Actif')}</div>
  </div>
  <div class="body">
    <div class="photo">
      ${photo}
      <div class="sig">Signature</div>
    </div>
    <table>
      ${row('Nom', c.nom)}
      ${row('Prénoms', c.prenom)}
      ${row('Sexe', c.sexe)}
      ${row('Date de naissance', c.date_naissance)}
      ${row('Téléphone', c.telephone)}
      ${row('Adresse', c.adresse)}
      ${row('Matricule', c.code)}
      ${row('Numéro du permis', c.num_permis)}
      ${row('Catégorie(s) du permis', c.type_permis)}
      ${row('Date de délivrance', c.date_delivrance)}
      ${row("Date d'expiration", c.date_expiration)}
      ${row('Statut', c.statut)}
      ${row('Date de création', created)}
    </table>
  </div>
  <div class="foot">Document généré le ${new Date().toLocaleDateString('fr-FR')} — Nexora Economat</div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`
    const w = window.open('', '_blank', 'width=900,height=1000')
    if (!w) { showToast('ko', 'Impression bloquée', "Autorisez les fenêtres pop-up pour imprimer la fiche."); return }
    w.document.write(html); w.document.close()
  }

  const fullName = (c) => c.full_name || `${c.prenom || ''} ${c.nom || ''}`.trim()

  return (
    <>
      <PageHeader title="Chauffeurs" subtitle={`${items.length} chauffeur(s)`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouveau chauffeur</Button>} />

      {/* Toast */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-fade-up"
          style={{ background: 'var(--surface)', borderColor: toast.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: toast.type === 'ok' ? '#16a34a' : '#dc2626' }}>{toast.type === 'ok' ? '✓' : '×'}</span>
            <div>
              <div className="text-sm font-bold text-heading">{toast.title}</div>
              <div className="text-xs text-muted mt-0.5">{toast.msg}</div>
              {toast.record && (
                <button onClick={() => printFiche(toast.record)} className="mt-2 text-xs font-semibold inline-flex items-center gap-1" style={{ color: 'var(--teal)' }}>
                  🖨 Imprimer la fiche
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucun chauffeur." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Photo</th><th>Matricule</th><th>Nom &amp; prénom</th><th>Téléphone</th><th>Permis</th><th>Catégorie</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-1.5">{c.photo ? <img src={c.photo} alt="" className="w-9 h-9 rounded-full object-cover" /> : <span className="inline-flex w-9 h-9 rounded-full items-center justify-center" style={{ background: 'var(--surface-2)' }}><Icon name="students" size={16} /></span>}</td>
                  <td className="font-mono text-xs">{c.code || '—'}</td>
                  <td className="font-medium">{fullName(c)}</td>
                  <td>{c.telephone || '—'}</td>
                  <td>{c.num_permis || '—'}</td>
                  <td>{c.type_permis || '—'}</td>
                  <td>{c.statut || '—'}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => printFiche(c)} className="hover:underline" style={{ color: 'var(--accent)' }}>Imprimer</button>
                    <button onClick={() => openEdit(c)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(c)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier le chauffeur' : 'Nouveau chauffeur'} size="2xl" cols={1}>
        <div className="space-y-5">
          {/* Photo — premier élément */}
          <div>
            <span className="block text-sm font-bold text-heading mb-1.5">Photo du chauffeur</span>
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-28 h-36 rounded-xl border overflow-hidden flex items-center justify-center shrink-0" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                {form.photo ? <img src={form.photo} alt="" className="w-full h-full object-cover" /> : <Icon name="students" size={30} />}
              </div>
              <div className="flex-1 w-full">
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition"
                  style={{ borderColor: dragOver ? 'var(--teal)' : (errors.photo ? '#dc2626' : 'var(--border)'), background: dragOver ? 'color-mix(in srgb, var(--teal) 8%, transparent)' : 'transparent' }}>
                  <div className="text-sm font-semibold text-heading">Glissez-déposez une image ici</div>
                  <div className="text-xs text-muted mt-1">ou cliquez pour sélectionner depuis votre appareil</div>
                  <div className="text-[11px] text-muted mt-2">JPG, JPEG, PNG, WEBP · 5 Mo maximum</div>
                  <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
                {errors.photo && <span className="block text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{errors.photo}</span>}
                {form.photo && (
                  <div className="flex gap-3 mt-2">
                    <button type="button" onClick={() => fileRef.current?.click()} className="text-xs font-semibold" style={{ color: 'var(--teal)' }}>Remplacer</button>
                    <button type="button" onClick={() => set('photo', '')} className="text-xs font-semibold text-red-600">Supprimer</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identité */}
          <div>
          <div className="text-sm font-bold text-heading mb-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>Identité</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-bold text-heading mb-1">Matricule <span style={{ color: '#dc2626' }}>*</span></span>
              <input className="field" style={errors.code ? { borderColor: '#dc2626' } : undefined} value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="CH-001" />
              {errors.code && <span className="block text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{errors.code}</span>}
            </label>
            <SearchableSelect label="Catégorie(s) du permis" options={PERMIS} value={form.type_permis} onChange={(v) => set('type_permis', v)} help="Recherchez une catégorie (ex : B, ABCD, Toute catégorie)" placeholder="Rechercher une catégorie…" />
            <label className="block">
              <span className="block text-sm font-bold text-heading mb-1">Nom <span style={{ color: '#dc2626' }}>*</span></span>
              <input className="field" style={errors.nom ? { borderColor: '#dc2626' } : undefined} value={form.nom} onChange={(e) => set('nom', e.target.value)} />
              {errors.nom && <span className="block text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{errors.nom}</span>}
            </label>
            <Input label="Prénoms" value={form.prenom} onChange={(e) => set('prenom', e.target.value)} />
            <Select label="Sexe" value={form.sexe} onChange={(e) => set('sexe', e.target.value)}>
              <option value="">— Choisir —</option>
              {SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input label="Date de naissance" type="date" value={form.date_naissance || ''} onChange={(e) => set('date_naissance', e.target.value)} />
            <Input label="Téléphone" value={form.telephone} onChange={(e) => set('telephone', e.target.value)} placeholder="+225 07 00 00 00 00" />
            <Input label="Adresse" value={form.adresse} onChange={(e) => set('adresse', e.target.value)} />
          </div>
          </div>

          {/* Permis */}
          <div>
            <div className="text-sm font-bold text-heading mb-3 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>Permis de conduire</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Numéro du permis" value={form.num_permis} onChange={(e) => set('num_permis', e.target.value)} />
              <Select label="Statut" value={form.statut} onChange={(e) => set('statut', e.target.value)}>
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input label="Date de délivrance" type="date" value={form.date_delivrance || ''} onChange={(e) => set('date_delivrance', e.target.value)} />
              <label className="block">
                <span className="block text-sm font-bold text-heading mb-1">Date d'expiration</span>
                <input className="field" type="date" style={errors.date_expiration ? { borderColor: '#dc2626' } : undefined} value={form.date_expiration || ''} onChange={(e) => set('date_expiration', e.target.value)} />
                {errors.date_expiration && <span className="block text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{errors.date_expiration}</span>}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="button" variant="outline" onClick={() => save('another')} disabled={saving}>
              <Icon name="plus" size={15} /> Enregistrer et créer un autre
            </Button>
            <Button type="button" onClick={() => save('save')} disabled={saving}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
