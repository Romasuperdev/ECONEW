import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

/* Design system local : vert #00CC8E, DM Sans, radius 20px */
const G = '#00CC8E'
const G_DARK = '#007E58'
const G_SOFT = '#E5FFF7'
const RED = '#dc2626'
const FONT = "'DM Sans','Inter','Segoe UI',sans-serif"
const R = 20

const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: R, padding: 18, fontFamily: FONT }
const input = { width: '100%', borderRadius: 12, border: '1.5px solid var(--border)', padding: '.55rem .75rem', fontFamily: FONT, background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5 }
const label = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--heading, #0c2c21)', marginBottom: 5 }
const btnG = { borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.6rem 1.1rem', border: 'none', fontFamily: FONT, cursor: 'pointer' }
const btnO = { borderRadius: 12, background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, padding: '.6rem 1.1rem', border: '1px solid var(--border)', fontFamily: FONT, cursor: 'pointer' }

const TYPES = ['Frais de dossier', 'Frais annexe']
const emptyForm = { libelle: '', type: 'Frais de dossier', montant: '', quantite: '1', niveau_code: '' }

export default function ConfigDossiersFraisAnnexes() {
  const [filters, setFilters] = useState({ niveau_id: '' })
  const [levels, setLevels] = useState([])
  const [rows, setRows] = useState([])
  const [detected, setDetected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState({})
  const [toast, setToast] = useState(null)

  const setF = (k, v) => setFilters((x) => ({ ...x, [k]: v }))
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setFormErr((e) => ({ ...e, [k]: undefined })) }
  const showToast = (t, m) => { setToast({ t, m }); setTimeout(() => setToast(null), 4500) }

  useEffect(() => {
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setErr('')
    api.get('/parametrage/dossiers-frais-annexes', { params: filters })
      .then(({ data }) => { setRows(data.data || []); setDetected(data._meta?.colonnes_detectees || null) })
      .catch((e) => { setRows([]); setErr(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [filters])

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormErr({}) }

  const validate = () => {
    const e = {}
    if (!form.libelle.trim()) e.libelle = 'Libellé requis.'
    if (form.montant === '' || isNaN(Number(form.montant)) || Number(form.montant) < 0) e.montant = 'Montant invalide.'
    if (form.quantite === '' || isNaN(Number(form.quantite)) || Number(form.quantite) < 1) e.quantite = 'Quantité invalide (min. 1).'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    const body = { libelle: form.libelle, type: form.type, montant: Number(form.montant), quantite: Number(form.quantite) || 1, niveau_code: form.niveau_code || null, classe_code: null, annee: null }
    try {
      if (editingId) await api.put(`/parametrage/dossiers-frais-annexes/${editingId}`, body)
      else await api.post('/parametrage/dossiers-frais-annexes', body)
      showToast('ok', editingId ? 'Grille mise à jour.' : 'Frais ajouté à la grille.')
      resetForm(); load()
    } catch (e) {
      setFormErr({ global: e.response?.data?.message || 'Enregistrement impossible.' })
    } finally { setSaving(false) }
  }

  const edit = (r) => {
    setEditingId(r.id)
    setForm({ libelle: r.libelle || '', type: r.est_dossier ? 'Frais de dossier' : (r.type || 'Frais annexe'), montant: String(r.montant_unitaire ?? r.montant ?? ''), quantite: String(r.quantite ?? 1), niveau_code: r.niveau_code || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const remove = async (r) => {
    if (!window.confirm('Supprimer cette ligne de grille ?')) return
    try { await api.delete(`/parametrage/dossiers-frais-annexes/${r.id}`); showToast('ok', 'Ligne supprimée.'); load() }
    catch (e) { showToast('ko', e.response?.data?.message || 'Suppression impossible.') }
  }

  const niveauName = (code) => levels.find((l) => (l.code || l.code_niveau || l.id) == code)?.name || code || '—'

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Dossiers & Frais annexes" subtitle="Configuration des frais de dossier et frais annexes (T_PREREQUIS)" />

      {toast && (
        <div style={{ position: 'fixed', right: 24, top: 24, zIndex: 50, maxWidth: 380, background: 'var(--surface)', border: `1px solid ${toast.t === 'ok' ? '#9CEBD1' : '#fecaca'}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
          <b style={{ color: toast.t === 'ok' ? G_DARK : '#b91c1c' }}>{toast.t === 'ok' ? '✓ ' : '× '}</b>{toast.m}
        </div>
      )}

      {/* Formulaire */}
      <div style={{ ...card, borderColor: '#9CEBD1', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: G_DARK, marginBottom: 12 }}>{editingId ? 'Modifier une ligne' : 'Ajouter un frais à la grille'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div>
            <label style={label}>Libellé</label>
            <input style={{ ...input, borderColor: formErr.libelle ? RED : 'var(--border)' }} value={form.libelle} onChange={(e) => set('libelle', e.target.value)} placeholder="Ex : Frais de dossier, Assurance…" />
            {formErr.libelle && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.libelle}</div>}
          </div>
          <div>
            <label style={label}>Type</label>
            <select style={input} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Montant unitaire (XOF)</label>
            <input type="number" min={0} style={{ ...input, borderColor: formErr.montant ? RED : 'var(--border)' }} value={form.montant} onChange={(e) => set('montant', e.target.value)} />
            {formErr.montant && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.montant}</div>}
          </div>
          <div>
            <label style={label}>Quantité</label>
            <input type="number" min={1} step={1} style={{ ...input, borderColor: formErr.quantite ? RED : 'var(--border)' }} value={form.quantite} onChange={(e) => set('quantite', e.target.value)} />
            {formErr.quantite && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.quantite}</div>}
          </div>
          <div>
            <label style={label}>Montant total</label>
            <input readOnly value={money((Number(form.montant) || 0) * (Number(form.quantite) || 0))} style={{ ...input, background: 'var(--surface-2)', fontWeight: 700, color: G_DARK }} />
          </div>
          <div>
            <label style={label}>Niveau</label>
            <select style={input} value={form.niveau_code} onChange={(e) => set('niveau_code', e.target.value)}>
              <option value="">Tous</option>
              {levels.map((l) => <option key={l.id || l.code} value={l.code || l.code_niveau || l.id}>{l.name || l.code}</option>)}
            </select>
          </div>
        </div>
        {formErr.global && <div style={{ color: RED, fontSize: 13, marginTop: 10 }}>{formErr.global}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button onClick={save} disabled={saving} style={{ ...btnG, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : (editingId ? 'Modifier' : 'Ajouter')}</button>
          {editingId && <button onClick={resetForm} style={btnO}>Annuler</button>}
        </div>
      </div>

      {/* Filtres */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          <div><label style={label}>Niveau</label>
            <select style={input} value={filters.niveau_id} onChange={(e) => setF('niveau_id', e.target.value)}>
              <option value="">Tous</option>
              {levels.map((l) => <option key={l.id || l.code} value={l.code || l.code_niveau || l.id}>{l.name || l.code}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
          : err ? <div style={{ padding: 24, textAlign: 'center', color: '#b91c1c' }}>{err}</div>
          : rows.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--muted)' }}>Aucune grille configurée pour ces critères.</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                    {['Libellé', 'Type', 'Niveau', 'Qté', 'Montant unitaire', 'Montant total', ''].map((h) => <th key={h} style={{ padding: '11px 12px', fontWeight: 700 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.libelle || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: r.est_dossier ? G_SOFT : '#f4f7fb', color: r.est_dossier ? G_DARK : '#5c6b82', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{r.est_dossier ? 'Frais de dossier' : (r.type || 'Frais annexe')}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{niveauName(r.niveau_code)}</td>
                      <td style={{ padding: '10px 12px' }}>{r.quantite ?? 1}</td>
                      <td style={{ padding: '10px 12px' }}>{money(r.montant_unitaire ?? r.montant)}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 700, color: G_DARK }}>{money(r.montant_total ?? r.montant)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => edit(r)} style={{ background: 'none', border: 'none', color: G_DARK, fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Modifier</button>
                        <button onClick={() => remove(r)} style={{ background: 'none', border: 'none', color: RED, fontWeight: 700, cursor: 'pointer' }}>Suppr.</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {detected && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 10 }}>
          Colonnes T_PREREQUIS détectées : {Object.entries(detected).filter(([, v]) => v).map(([k, v]) => `${k}→${v}`).join(' · ') || 'aucune'}
        </div>
      )}
    </div>
  )
}
