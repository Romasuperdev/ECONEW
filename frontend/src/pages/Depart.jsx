import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { downloadFile } from '../utils/download'
import { apiError } from '../utils/apiError'

/* Design system local : vert #00CC8E, DM Sans, radius 20px */
const G = '#00CC8E'
const G_DARK = '#007E58'
const G_SOFT = '#E5FFF7'
const RED = '#dc2626'
const FONT = "'DM Sans','Inter','Segoe UI',sans-serif"
const R = 20

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: R, padding: 18, fontFamily: FONT }
const label = { display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--heading, #14223f)', marginBottom: 5 }
const input = { width: '100%', borderRadius: 12, border: '1.5px solid var(--border)', padding: '.55rem .75rem', fontFamily: FONT, background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5 }
const btnG = { borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.6rem 1.1rem', border: 'none', fontFamily: FONT, cursor: 'pointer' }
const btnO = { borderRadius: 12, background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, padding: '.6rem 1.1rem', border: '1px solid var(--border)', fontFamily: FONT, cursor: 'pointer' }

const TABS = [
  { key: 'definitif', label: 'Définitif' },
  { key: 'cantine', label: 'Cantine' },
  { key: 'pension', label: 'Pension' },
  { key: 'transport', label: 'Transport' },
]

const MOTIFS = {
  definitif: ['Transfert vers un autre établissement', 'Déménagement', 'Raisons financières', 'Exclusion disciplinaire', 'Abandon', 'Décès', 'Autre'],
  cantine: ['Changement de régime', 'Raisons financières', 'Insatisfaction du service', 'Départ définitif', 'Autre'],
  pension: ['Passage en externat', 'Raisons financières', 'Rapprochement familial', 'Départ définitif', 'Autre'],
  transport: ['Changement de circuit', 'Déménagement', 'Raisons financières', 'Départ définitif', 'Autre'],
}

const money = (n) => Number(n || 0).toLocaleString('fr-FR')
const emptyForm = { date_depart: '', motif: '', motif_autre: '', circuit_transport_id: '', observations: '' }

export default function Depart() {
  const [type, setType] = useState('definitif')
  const [annee, setAnnee] = useState('')
  const [years, setYears] = useState([])
  const [destinations, setDestinations] = useState([])

  // Recherche élève
  const [matricule, setMatricule] = useState('')
  const [eleve, setEleve] = useState(null)
  const [lookup, setLookup] = useState('idle') // idle|loading|ok|notfound|error

  // Formulaire
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formErr, setFormErr] = useState({})
  const [toast, setToast] = useState(null)

  // Historique
  const [rows, setRows] = useState([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' })
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState('')

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setFormErr((e) => ({ ...e, [k]: undefined })) }
  const showToast = (t, m) => { setToast({ t, m }); setTimeout(() => setToast(null), 4000) }

  useEffect(() => {
    api.get('/academic-years').then(({ data }) => {
      const list = data.data || data; setYears(list)
      const cur = list.find((y) => y.is_current) || list[0]
      if (cur) setAnnee(cur.code || cur.id)
    }).catch(() => {})
    api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => {})
  }, [])

  // Recherche élève (debounce)
  useEffect(() => {
    const m = matricule.trim()
    if (m.length < 3) { setEleve(null); setLookup('idle'); return }
    setLookup('loading')
    const t = setTimeout(() => {
      api.get(`/eleves/${encodeURIComponent(m)}/infos`)
        .then(({ data }) => { setEleve(data.eleve); setLookup('ok') })
        .catch((e) => { setEleve(null); setLookup(e.response?.status === 404 ? 'notfound' : 'error') })
    }, 450)
    return () => clearTimeout(t)
  }, [matricule])

  // Historique
  const loadList = () => {
    setLoading(true); setListErr('')
    api.get('/departs', { params: { annee_scolaire_id: annee, type_depart: type, search, sort: sort.col, dir: sort.dir, page, per_page: 15 } })
      .then(({ data }) => { setRows(data.data || []); setMeta(data.meta || { current_page: 1, last_page: 1, total: 0 }) })
      .catch((e) => { setRows([]); setListErr(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(loadList, 300); return () => clearTimeout(t) }, [type, annee, search, sort, page])

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setFormErr({}); setMatricule(''); setEleve(null); setLookup('idle') }
  const switchTab = (k) => { setType(k); resetForm(); setPage(1); setSearch('') }

  const validate = () => {
    const e = {}
    if (!editingId && !eleve) e.matricule = 'Sélectionnez un élève valide.'
    if (!form.date_depart) e.date_depart = 'La date de départ est requise.'
    if (!form.motif) e.motif = 'Choisissez un motif.'
    if (form.motif === 'Autre' && !form.motif_autre.trim()) e.motif_autre = 'Précisez le motif.'
    if (type === 'transport' && !editingId && !form.circuit_transport_id) e.circuit_transport_id = 'Indiquez le circuit / la ligne.'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  const payload = () => ({
    eleve_id: eleve?.matricule,
    annee_scolaire_id: annee,
    type_depart: type,
    date_depart: form.date_depart,
    motif: form.motif === 'Autre' ? form.motif_autre.trim() : form.motif,
    circuit_transport_id: type === 'transport' ? (form.circuit_transport_id || null) : null,
    observations: form.observations || null,
  })

  const save = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      if (editingId) await api.put(`/departs/${editingId}`, payload())
      else await api.post('/departs', payload())
      showToast('ok', editingId ? 'Départ mis à jour.' : 'Départ enregistré avec succès.')
      resetForm(); loadList()
    } catch (err) {
      setFormErr({ global: err.response?.data?.message || 'Enregistrement impossible.' })
    } finally { setSaving(false) }
  }

  const editRow = (r) => {
    setEditingId(r.id)
    setEleve({ matricule: r.matricule, nom: r.nom, prenom: r.prenom, niveau: r.niveau, classe: r.classe })
    setMatricule(r.matricule)
    const known = MOTIFS[type].includes(r.motif)
    setForm({ date_depart: r.date_depart || '', motif: known ? r.motif : 'Autre', motif_autre: known ? '' : (r.motif || ''), circuit_transport_id: r.circuit_transport_id || '', observations: r.observations || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelRow = async (r) => {
    const motif = window.prompt('Annuler ce départ ? Indiquez éventuellement un motif :', '')
    if (motif === null) return
    try { await api.delete(`/departs/${r.id}`, { data: { motif } }); showToast('ok', 'Départ annulé, situation restaurée.'); loadList() }
    catch (err) { showToast('ko', err.response?.data?.message || "Annulation impossible.") }
  }

  const exportList = async (format) => {
    const qs = new URLSearchParams({ annee_scolaire_id: annee, type_depart: type, search, format }).toString()
    try { await downloadFile(`/departs/export?${qs}`, `Departs.${format === 'pdf' ? 'pdf' : 'xlsx'}`) }
    catch { showToast('ko', 'Export impossible.') }
  }

  const toggleSort = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))
  const arrow = (c) => sort.col === c ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
  const typeLabel = TABS.find((t) => t.key === type)?.label

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Départ" subtitle={`Gestion des départs — ${typeLabel}`} />

      {toast && (
        <div style={{ position: 'fixed', right: 24, top: 24, zIndex: 50, maxWidth: 360, background: 'var(--surface)', border: `1px solid ${toast.t === 'ok' ? '#bbf7d0' : '#fecaca'}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,.12)' }}>
          <b style={{ color: toast.t === 'ok' ? G_DARK : '#b91c1c' }}>{toast.t === 'ok' ? '✓ ' : '× '}</b>{toast.m}
        </div>
      )}

      {/* Onglets */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => switchTab(t.key)} style={{
            borderRadius: 999, padding: '.5rem 1.1rem', fontWeight: 700, fontFamily: FONT, cursor: 'pointer', fontSize: 13.5,
            border: `1.5px solid ${type === t.key ? G : 'var(--border)'}`,
            background: type === t.key ? G : 'var(--surface)', color: type === t.key ? '#fff' : 'var(--text)',
          }}>Départ {t.label}</button>
        ))}
      </div>

      {/* Saisie */}
      <div style={{ ...card, borderColor: type ? '#9CEBD1' : 'var(--border)', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, color: G_DARK, marginBottom: 12 }}>{editingId ? 'Modifier le départ' : `Nouveau départ — ${typeLabel}`}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={label}>Année scolaire</label>
            <select style={input} value={annee} onChange={(e) => setAnnee(e.target.value)}>
              <option value="">— Choisir —</option>
              {years.map((y) => <option key={y.id || y.code} value={y.code || y.id}>{y.name || y.label || y.code}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Élève (matricule)</label>
            <input style={{ ...input, borderColor: formErr.matricule ? RED : 'var(--border)' }} value={matricule} disabled={!!editingId} onChange={(e) => setMatricule(e.target.value)} placeholder="Recherche automatique…" />
            {formErr.matricule && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.matricule}</div>}
          </div>
        </div>

        {/* Fiche élève */}
        {lookup === 'loading' && <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>Recherche de l'élève…</div>}
        {lookup === 'notfound' && <div style={{ fontSize: 13, color: '#b91c1c', marginBottom: 12 }}>Aucun élève trouvé pour ce matricule.</div>}
        {eleve && (
          <div style={{ background: G_SOFT, border: '1px solid #9CEBD1', borderRadius: 14, padding: 12, marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '4px 16px', fontSize: 13 }}>
            <div><span style={{ color: 'var(--muted)' }}>Élève : </span><b>{eleve.full_name || `${eleve.prenom || ''} ${eleve.nom || ''}`}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Niveau : </span><b>{eleve.niveau || '—'}</b></div>
            <div><span style={{ color: 'var(--muted)' }}>Classe : </span><b>{eleve.classe || '—'}</b></div>
          </div>
        )}

        {/* Champs spécifiques */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
          <div>
            <label style={label}>Date de départ</label>
            <input type="date" style={{ ...input, borderColor: formErr.date_depart ? RED : 'var(--border)' }} value={form.date_depart} onChange={(e) => set('date_depart', e.target.value)} />
            {formErr.date_depart && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.date_depart}</div>}
          </div>
          <div>
            <label style={label}>Motif</label>
            <select style={{ ...input, borderColor: formErr.motif ? RED : 'var(--border)' }} value={form.motif} onChange={(e) => set('motif', e.target.value)}>
              <option value="">— Choisir —</option>
              {MOTIFS[type].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {formErr.motif && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.motif}</div>}
          </div>
          {form.motif === 'Autre' && (
            <div>
              <label style={label}>Préciser le motif</label>
              <input style={{ ...input, borderColor: formErr.motif_autre ? RED : 'var(--border)' }} value={form.motif_autre} onChange={(e) => set('motif_autre', e.target.value)} />
              {formErr.motif_autre && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.motif_autre}</div>}
            </div>
          )}
          {type === 'transport' && (
            <div>
              <label style={label}>Circuit / ligne de transport</label>
              <select style={{ ...input, borderColor: formErr.circuit_transport_id ? RED : 'var(--border)' }} value={form.circuit_transport_id} onChange={(e) => set('circuit_transport_id', e.target.value)}>
                <option value="">— Choisir —</option>
                {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
              </select>
              {formErr.circuit_transport_id && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.circuit_transport_id}</div>}
            </div>
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={label}>Observations</label>
            <textarea rows={2} style={input} value={form.observations} onChange={(e) => set('observations', e.target.value)} placeholder="Notes complémentaires (facultatif)" />
          </div>
        </div>

        {type === 'definitif' && <div style={{ fontSize: 12, color: '#a9761a', marginTop: 10 }}>ℹ Le statut de l'élève passera à « Départ définitif ». L'historique des paiements est conservé.</div>}
        {formErr.global && <div style={{ color: RED, fontSize: 13, marginTop: 10 }}>{formErr.global}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          <button onClick={save} disabled={saving} style={{ ...btnG, opacity: saving ? 0.7 : 1 }}>{saving ? 'Enregistrement…' : (editingId ? 'Modifier' : 'Enregistrer')}</button>
          {editingId && <button onClick={resetForm} style={btnO}>Annuler la modification</button>}
        </div>
      </div>

      {/* Historique */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 800, color: G_DARK }}>Historique des départs — {typeLabel} <span style={{ color: 'var(--muted)', fontWeight: 500 }}>({meta.total})</span></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input style={{ ...input, width: 200 }} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Rechercher (matricule/nom)…" />
            <button onClick={() => exportList('xlsx')} style={btnO}>⬇ Excel</button>
            <button onClick={() => exportList('pdf')} style={btnO}>🖨 PDF</button>
          </div>
        </div>

        {loading ? <div style={{ padding: 34, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
          : listErr ? <div style={{ padding: 24, textAlign: 'center', color: '#b91c1c' }}>{listErr}</div>
          : rows.length === 0 ? <div style={{ padding: 34, textAlign: 'center', color: 'var(--muted)' }}>Aucun départ enregistré.</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                    {[['matricule', 'Matricule'], ['nom', 'Nom'], ['prenom', 'Prénoms'], ['niveau', 'Niveau'], ['classe', 'Classe'], ['date_depart', 'Date'], ['motif', 'Motif']].map(([k, l]) => (
                      <th key={k} onClick={() => toggleSort(k)} style={{ padding: '10px 12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>{l}{arrow(k)}</th>
                    ))}
                    {type === 'transport' && <th style={{ padding: '10px 12px', fontWeight: 700 }}>Circuit</th>}
                    <th style={{ padding: '10px 12px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.matricule}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 600 }}>{r.nom || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{r.prenom || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{r.niveau || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{r.classe || '—'}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>{r.date_depart || '—'}</td>
                      <td style={{ padding: '9px 12px' }}>{r.motif || '—'}</td>
                      {type === 'transport' && <td style={{ padding: '9px 12px' }}>{r.circuit || '—'}</td>}
                      <td style={{ padding: '9px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => editRow(r)} style={{ background: 'none', border: 'none', color: G_DARK, fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Modifier</button>
                        <button onClick={() => cancelRow(r)} style={{ background: 'none', border: 'none', color: RED, fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {meta.current_page} / {meta.last_page}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ ...btnO, opacity: page <= 1 ? 0.5 : 1 }}>Précédent</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} style={{ ...btnO, opacity: page >= meta.last_page ? 0.5 : 1 }}>Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
