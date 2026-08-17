import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
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

const ETATS = [['', 'Tous les états'], ['paye', 'Payé'], ['partiel', 'Partiel'], ['non_paye', 'Non payé']]
const badge = (s) => {
  const map = { paye: ['#e6f6ec', '#1b7a37', 'Payé'], partiel: ['#fef6e6', '#a9761a', 'Partiel'], non_paye: ['#fdecec', '#b23b28', 'Non payé'] }
  const [bg, c, t] = map[s] || ['#eef2f7', '#5c6b82', s || '—']
  return <span style={{ background: bg, color: c, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700 }}>{t}</span>
}

export default function ConsultationPaiementsDossiers() {
  const [f, setF] = useState({ etat_paiement: '', niveau_id: '', classe_id: '', search: '', date_debut: '', date_fin: '' })
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [rows, setRows] = useState([])
  const [totaux, setTotaux] = useState({ montant_du: 0, montant_paye: 0, reste_a_payer: 0 })
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState(null)
  const [eform, setEform] = useState({ montant_paye: '', quantite: '', mode_paiement: '', reference_paiement: '' })
  const [eerr, setEerr] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => { setF((x) => ({ ...x, [k]: v })); setPage(1) }

  useEffect(() => {
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => {})
    api.get('/school-classes').then(({ data }) => setClasses(data.data || data)).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setErr('')
    api.get('/paiements-dossiers', { params: { ...f, page, per_page: 20 } })
      .then(({ data }) => {
        setRows(data.data || [])
        setTotaux(data.totaux || { montant_du: 0, montant_paye: 0, reste_a_payer: 0 })
        setMeta(data.meta || { current_page: 1, last_page: 1, total: (data.data || []).length })
      })
      .catch((e) => { setRows([]); setErr(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t) }, [f, page])

  const openEdit = (r) => {
    setEditing(r)
    setEform({ montant_paye: r.montant_paye ?? '', quantite: r.quantite ?? 1, mode_paiement: r.mode_paiement || '', reference_paiement: r.reference_paiement || '' })
    setEerr('')
  }
  const saveEdit = async (e) => {
    e.preventDefault(); setEerr(''); setSaving(true)
    try {
      await api.put(`/paiements-dossiers/${editing.id}`, {
        montant_paye: Number(eform.montant_paye || 0),
        quantite: Number(eform.quantite || 1),
        mode_paiement: eform.mode_paiement || null,
        reference_paiement: eform.reference_paiement || null,
      })
      setEditing(null); load()
    } catch (e2) { setEerr(apiError(e2)) } finally { setSaving(false) }
  }
  const removeRow = async (r) => {
    if (r.verrouille) return
    const motif = window.prompt('Annuler ce paiement ? Indiquez éventuellement un motif :', '')
    if (motif === null) return
    try { await api.delete(`/paiements-dossiers/${r.id}`, { data: { motif } }); load() }
    catch (e2) { setErr(apiError(e2)) }
  }

  const exportPdf = () => {
    const esc = (s) => String(s ?? '—').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
    const trs = rows.map((r) => `<tr>
      <td>${esc(r.numero_recu)}</td><td>${esc(r.matricule)}</td><td>${esc(r.eleve)}</td>
      <td style="text-align:right">${esc(r.quantite ?? 1)}</td>
      <td style="text-align:right">${money(r.montant_paye)}</td>
      <td>${esc(r.statut)}</td><td>${esc(r.created_at)}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Paiements dossiers</title>
    <style>*{font-family:'DM Sans',Arial,sans-serif;-webkit-print-color-adjust:exact}
    body{color:#173a24;padding:16px}h1{color:#00CC8E;font-size:20px;margin:0 0 4px}
    .s{color:#5c6b82;font-size:12px;margin-bottom:14px}
    table{width:100%;border-collapse:collapse;font-size:11.5px}
    th{background:#00CC8E;color:#fff;text-align:left;padding:8px}
    td{padding:7px 8px;border-bottom:1px solid #eef3ee}
    .tot{margin-top:14px;font-size:12.5px}.tot b{color:#007E58}</style></head><body>
    <h1>Réception des dossiers &amp; frais annexes</h1>
    <div class="s">Édité le ${new Date().toLocaleString('fr-FR')} — ${rows.length} ligne(s)</div>
    <table><thead><tr><th>Reçu</th><th>Matricule</th><th>Élève</th><th>Quantité</th><th>Montant payé</th><th>Statut</th><th>Date</th></tr></thead><tbody>${trs}</tbody></table>
    <div class="tot">Total payé : <b>${money(totaux.montant_paye)}</b> &nbsp;·&nbsp; ${rows.length} transaction(s)</div>
    <script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=800')
    if (w) { w.document.write(html); w.document.close() }
  }

  const Totaux = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Montant payé</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: G_DARK, marginTop: 4 }}>{money(totaux.montant_paye)}</div>
      </div>
      <div style={{ ...card, padding: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Transactions</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#14223f', marginTop: 4 }}>{meta.total}</div>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Consultation des paiements de dossiers" subtitle={`${meta.total} transaction(s)`}
        action={<button onClick={exportPdf} style={{ borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.55rem 1rem', border: 'none', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>🖨 Exporter / Imprimer</button>} />

      {/* Filtres */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
          <div><label style={label}>État</label>
            <select style={input} value={f.etat_paiement} onChange={(e) => set('etat_paiement', e.target.value)}>
              {ETATS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </div>
          <div><label style={label}>Niveau</label>
            <select style={input} value={f.niveau_id} onChange={(e) => set('niveau_id', e.target.value)}>
              <option value="">Tous</option>
              {levels.map((l) => <option key={l.id || l.code} value={l.code || l.code_niveau || l.id}>{l.name || l.code}</option>)}
            </select>
          </div>
          <div><label style={label}>Matricule / Nom</label>
            <input style={input} value={f.search} onChange={(e) => set('search', e.target.value)} placeholder="Rechercher…" />
          </div>
          <div><label style={label}>Du</label>
            <input type="date" style={input} value={f.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
          </div>
          <div><label style={label}>Au</label>
            <input type="date" style={input} value={f.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          </div>
        </div>
      </div>

      <Totaux />

      {/* Tableau */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Chargement…</div>
        ) : err ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#b91c1c' }}>{err}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Aucune transaction pour ces critères.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                  {['Reçu', 'Matricule', 'Élève', 'Quantité', 'Montant payé', 'Mode', 'Statut', 'Date', ''].map((h, i) => <th key={h || `a${i}`} style={{ padding: '11px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12 }}>{r.numero_recu}{r.verrouille && <span title="Verrouillée (> 2 jours)" style={{ marginLeft: 6 }}>🔒</span>}</td>
                    <td style={{ padding: '10px 12px' }}>{r.matricule}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{r.eleve || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>{r.quantite ?? 1}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: G_DARK }}>{money(r.montant_paye)}</td>
                    <td style={{ padding: '10px 12px' }}>{r.mode_paiement || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{badge(r.statut)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{r.created_at}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {r.verrouille ? (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)' }} title="Verrouillée (> 2 jours)">🔒 Verrouillée</span>
                      ) : (
                        <>
                          <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', color: G_DARK, fontWeight: 700, cursor: 'pointer', marginRight: 12 }}>Modifier</button>
                          <button onClick={() => removeRow(r)} style={{ background: 'none', border: 'none', color: '#b23b28', fontWeight: 700, cursor: 'pointer' }}>Suppr.</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {meta.last_page > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Page {meta.current_page} / {meta.last_page}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '.4rem .9rem', background: 'var(--surface-2)', fontFamily: FONT, opacity: page <= 1 ? 0.5 : 1 }}>Précédent</button>
              <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '.4rem .9rem', background: 'var(--surface-2)', fontFamily: FONT, opacity: page >= meta.last_page ? 0.5 : 1 }}>Suivant</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <div onClick={() => setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: '100%', maxWidth: 460 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#14223f', marginBottom: 4 }}>Modifier le paiement</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Reçu {editing.numero_recu} — {editing.eleve || editing.matricule}</div>
            <form onSubmit={saveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={label}>Montant payé</label>
                  <input type="number" min="0" step="0.01" style={input} value={eform.montant_paye} onChange={(e) => setEform((x) => ({ ...x, montant_paye: e.target.value }))} required />
                </div>
                <div><label style={label}>Quantité</label>
                  <input type="number" min="1" style={input} value={eform.quantite} onChange={(e) => setEform((x) => ({ ...x, quantite: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 12 }}><label style={label}>Mode de paiement</label>
                <input style={input} value={eform.mode_paiement} onChange={(e) => setEform((x) => ({ ...x, mode_paiement: e.target.value }))} placeholder="Espèces, Mobile Money…" />
              </div>
              <div style={{ marginTop: 12 }}><label style={label}>Référence</label>
                <input style={input} value={eform.reference_paiement} onChange={(e) => setEform((x) => ({ ...x, reference_paiement: e.target.value }))} />
              </div>
              {eerr && <div style={{ color: '#b23b28', fontSize: 12.5, marginTop: 12 }}>{eerr}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
                <button type="button" onClick={() => setEditing(null)} style={{ borderRadius: 10, border: '1px solid var(--border)', padding: '.5rem 1rem', background: 'var(--surface-2)', fontFamily: FONT, fontWeight: 700 }}>Annuler</button>
                <button type="submit" disabled={saving} style={{ borderRadius: 10, border: 'none', padding: '.5rem 1.1rem', background: G, color: '#fff', fontFamily: FONT, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
