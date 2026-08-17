import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { downloadFile } from '../utils/download'
import { apiError } from '../utils/apiError'

/* Design system local : vert #00CC8E, DM Sans, radius 20px */
const G = '#00CC8E'
const G_DARK = '#007E58'
const G_SOFT = '#E5FFF7'
const FONT = "'DM Sans','Inter','Segoe UI',sans-serif"
const R = 20

const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`
const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: R, padding: 18, fontFamily: FONT }
const input = { width: '100%', borderRadius: 12, border: '1.5px solid var(--border)', padding: '.55rem .75rem', fontFamily: FONT, background: 'var(--surface)', color: 'var(--text)', fontSize: 13.5 }
const label = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--heading, #14223f)', marginBottom: 5 }

const STATUTS = ['Affecté', 'Non affecté', 'En attente']
const COLS = [
  ['matricule', 'Matricule'], ['nom', 'Nom'], ['prenom', 'Prénoms'],
  ['niveau', 'Niveau'], ['classe', 'Classe'], ['type_affectation', "Type d'affectation"],
  ['montant_previsionnel', 'Montant prévisionnel'],
]

export default function PaiementsPrevisionnelsEtat() {
  const [f, setF] = useState({ annee_scolaire_id: '', niveau_id: '', classe_id: '', cycle: '', filiere: '', statut_affectation: '', search: '' })
  const [sort, setSort] = useState({ col: 'nom', dir: 'asc' })
  const [years, setYears] = useState([])
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [cycles, setCycles] = useState([])
  const [rows, setRows] = useState([])
  const [totaux, setTotaux] = useState({ nombre_eleves: 0, montant_total_previsionnel: 0 })
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1) }

  useEffect(() => {
    api.get('/academic-years').then(({ data }) => {
      const list = data.data || data
      setYears(list)
      const cur = list.find((y) => y.is_current) || list[0]
      if (cur) setF((x) => ({ ...x, annee_scolaire_id: cur.code || cur.id }))
    }).catch(() => {})
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => {})
    api.get('/school-classes').then(({ data }) => setClasses(data.data || data)).catch(() => {})
    api.get('/cycles').then(({ data }) => setCycles(data.data || data)).catch(() => {})
  }, [])

  const params = () => ({ ...f, sort: sort.col, dir: sort.dir, page, per_page: 25 })

  const load = () => {
    if (!f.annee_scolaire_id) { setRows([]); setTotaux({ nombre_eleves: 0, montant_total_previsionnel: 0 }); return }
    setLoading(true); setErr('')
    api.get('/paiements-previsionnels-etat', { params: params() })
      .then(({ data }) => {
        setRows(data.data || [])
        setTotaux(data.totaux || { nombre_eleves: 0, montant_total_previsionnel: 0 })
        setMeta(data.meta || { current_page: 1, last_page: 1, total: (data.data || []).length })
      })
      .catch((e) => { setRows([]); setErr(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t) }, [f, sort, page])

  const toggleSort = (col) => setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }))

  const exportXlsx = async () => {
    if (!f.annee_scolaire_id) return
    const qs = new URLSearchParams({ ...f, sort: sort.col, dir: sort.dir }).toString()
    try { await downloadFile(`/paiements-previsionnels-etat/export?${qs}`, 'Paiements-previsionnels-etat.xlsx') }
    catch { setErr("Export Excel impossible.") }
  }

  const arrow = (col) => sort.col === col ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Paiements prévisionnels de l'État" subtitle="Élèves affectés par l'État et montants prévisionnels"
        action={<button onClick={exportXlsx} disabled={!f.annee_scolaire_id} style={{ borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.55rem 1rem', border: 'none', fontFamily: FONT, opacity: f.annee_scolaire_id ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>⬇ Exporter Excel (.xlsx)</button>} />

      {/* Filtres */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <div>
            <label style={label}>Année scolaire <span style={{ color: '#dc2626' }}>*</span></label>
            <select style={{ ...input, borderColor: f.annee_scolaire_id ? 'var(--border)' : '#dc2626' }} value={f.annee_scolaire_id} onChange={(e) => set('annee_scolaire_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {years.map((y) => <option key={y.id || y.code} value={y.code || y.id}>{y.name || y.label || y.code}</option>)}
            </select>
          </div>
          <div><label style={label}>Niveau</label>
            <select style={input} value={f.niveau_id} onChange={(e) => set('niveau_id', e.target.value)}>
              <option value="">Tous</option>
              {levels.map((l) => <option key={l.id || l.code} value={l.code || l.code_niveau || l.id}>{l.name || l.code}</option>)}
            </select>
          </div>
          <div><label style={label}>Classe</label>
            <select style={input} value={f.classe_id} onChange={(e) => set('classe_id', e.target.value)}>
              <option value="">Toutes</option>
              {classes.map((c) => <option key={c.id || c.code} value={c.code || c.id}>{c.name || c.code}</option>)}
            </select>
          </div>
          <div><label style={label}>Cycle</label>
            <select style={input} value={f.cycle} onChange={(e) => set('cycle', e.target.value)}>
              <option value="">Tous</option>
              {cycles.map((c) => <option key={c.id || c.code} value={c.code || c.name || c.id}>{c.name || c.code}</option>)}
            </select>
          </div>
          <div><label style={label}>Filière</label>
            <input style={input} value={f.filiere} onChange={(e) => set('filiere', e.target.value)} placeholder="Toutes" />
          </div>
          <div><label style={label}>Statut d'affectation</label>
            <select style={input} value={f.statut_affectation} onChange={(e) => set('statut_affectation', e.target.value)}>
              <option value="">Tous</option>
              {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}><label style={label}>Recherche rapide (matricule, nom, prénom)</label>
            <input style={input} value={f.search} onChange={(e) => set('search', e.target.value)} placeholder="Rechercher…" />
          </div>
        </div>
      </div>

      {/* Totaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Élèves / étudiants affectés</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#14223f', marginTop: 4 }}>{totaux.nombre_eleves}</div>
        </div>
        <div style={{ ...card, padding: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Montant total prévisionnel</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: G_DARK, marginTop: 4 }}>{money(totaux.montant_total_previsionnel)}</div>
        </div>
      </div>

      {/* Tableau */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {!f.annee_scolaire_id ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Sélectionnez une année scolaire pour afficher le rapport.</div>
        ) : loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
        ) : err ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#b91c1c' }}>{err}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucun élève affecté pour ces critères.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                  {COLS.map(([key, lbl]) => (
                    <th key={key} onClick={() => toggleSort(key)} style={{ padding: '11px 12px', fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: key === 'montant_previsionnel' ? 'right' : 'left' }}>
                      {lbl}{arrow(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.matricule + i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.matricule}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.nom || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{r.prenom || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{r.niveau || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{r.classe || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{r.type_affectation || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: G_DARK }}>{money(r.montant_previsionnel)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${G}`, background: G_SOFT }}>
                  <td colSpan={5} style={{ padding: '11px 12px', fontWeight: 800, color: '#14223f' }}>TOTAL — {totaux.nombre_eleves} élève(s)/étudiant(s)</td>
                  <td style={{ padding: '11px 12px', fontWeight: 700, textAlign: 'right', color: 'var(--muted)' }}>Montant total</td>
                  <td style={{ padding: '11px 12px', fontWeight: 800, textAlign: 'right', color: G_DARK }}>{money(totaux.montant_total_previsionnel)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        {/* Pagination */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {meta.current_page} / {meta.last_page} · {meta.total} ligne(s)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '.4rem .9rem', background: 'var(--surface-2)', fontFamily: FONT, opacity: page <= 1 ? 0.5 : 1 }}>Précédent</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '.4rem .9rem', background: 'var(--surface-2)', fontFamily: FONT, opacity: page >= meta.last_page ? 0.5 : 1 }}>Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
