import { useEffect, useMemo, useRef, useState } from 'react'
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
const btnG = { borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.6rem 1.1rem', border: 'none', fontFamily: FONT, cursor: 'pointer' }
const btnO = { borderRadius: 12, background: 'var(--surface-2)', color: 'var(--text)', fontWeight: 700, padding: '.6rem 1.1rem', border: '1px solid var(--border)', fontFamily: FONT, cursor: 'pointer' }

export default function Importation() {
  const [tab, setTab] = useState('import')       // import | historique
  const [types, setTypes] = useState([])
  const [active, setActive] = useState(null)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [ignoreErr, setIgnoreErr] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const [history, setHistory] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/import/types').then(({ data }) => { setTypes(data); if (data[0]) setActive(data[0].type) }).catch((e) => setErr(apiError(e)))
  }, [])
  useEffect(() => { if (tab === 'historique') loadHistory() }, [tab])

  const loadHistory = () => api.get('/import/historique').then(({ data }) => setHistory(data)).catch(() => setHistory([]))

  const activeDef = useMemo(() => types.find((t) => t.type === active), [types, active])
  const resetType = () => { setFile(null); setPreview(null); setResult(null); setErr(''); setIgnoreErr(false) }
  const chooseType = (t) => { setActive(t); resetType() }

  const dlModele = async () => {
    try { await downloadFile(`/import/modele/${active}`, `modele_${active}.xlsx`) }
    catch { setErr('Téléchargement du modèle impossible.') }
  }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f); setResult(null); setErr(''); setPreview(null); setPreviewing(true)
    try {
      const fd = new FormData(); fd.append('file', f)
      const { data } = await api.post(`/import/${active}/previsualiser`, fd)
      setPreview(data)
    } catch (e) { setErr(apiError(e)) } finally { setPreviewing(false) }
  }
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }

  const confirmer = async () => {
    if (!file) return
    setImporting(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('ignorer_erreurs', ignoreErr ? '1' : '0')
      const { data } = await api.post(`/import/${active}/confirmer`, fd)
      setResult(data); setPreview(null); setFile(null)
    } catch (e) { setErr(e.response?.data?.message || apiError(e)) } finally { setImporting(false) }
  }

  const dlErreurs = () => {
    if (!preview) return
    const lines = [['Ligne', 'Erreurs'].join(';')]
    preview.apercu.filter((r) => !r.valide).forEach((r) => lines.push([r.ligne, '"' + r.errors.join(' | ').replace(/"/g, "'") + '"'].join(';')))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `erreurs_${active}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  const cols = activeDef?.colonnes || []

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Importation de données" subtitle="Onboarding : importez vos données existantes depuis des fichiers Excel"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setTab('import')} style={tab === 'import' ? btnG : btnO}>Importer</button>
            <button onClick={() => setTab('historique')} style={tab === 'historique' ? btnG : btnO}>Historique</button>
          </div>
        } />

      {err && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c', marginBottom: 16 }}>{err}</div>}

      {tab === 'import' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }} className="imp-grid">
          {/* Types (ordre de dépendance) */}
          <div style={{ ...card, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8, padding: '0 6px' }}>Types de données</div>
            {types.map((t, i) => {
              const on = t.type === active
              return (
                <button key={t.type} onClick={() => chooseType(t.type)} style={{
                  display: 'block', width: '100%', textAlign: 'left', borderRadius: 12, padding: '10px 12px', marginBottom: 4,
                  border: 'none', cursor: 'pointer', fontFamily: FONT,
                  background: on ? G_SOFT : 'transparent', color: on ? G_DARK : 'var(--text)', fontWeight: on ? 800 : 500,
                }}>
                  <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 999, background: on ? G : 'var(--surface-2)', color: on ? '#fff' : 'var(--muted)', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, marginRight: 8 }}>{i + 1}</span>
                  {t.label}
                  {t.depends?.length > 0 && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginLeft: 30 }}>prérequis : {t.depends.join(', ')}</div>}
                </button>
              )
            })}
          </div>

          {/* Panneau du type sélectionné */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {activeDef && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: G_DARK, fontSize: 16 }}>{activeDef.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Colonnes attendues : {cols.join(', ')}</div>
                    {activeDef.depends?.length > 0 && <div style={{ fontSize: 12, color: '#a9761a', marginTop: 4 }}>⚠ Importez d'abord : {activeDef.depends.join(', ')}</div>}
                  </div>
                  <button onClick={dlModele} style={btnO}>⬇ Télécharger le modèle Excel</button>
                </div>

                {/* Upload */}
                <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}
                  onClick={() => fileRef.current?.click()}
                  style={{ marginTop: 16, borderRadius: 16, border: `2px dashed ${dragOver ? G : 'var(--border)'}`, background: dragOver ? G_SOFT : 'transparent', padding: 26, textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 700, color: 'var(--heading, #0c2c21)' }}>Glissez-déposez le fichier Excel rempli</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>ou cliquez pour le sélectionner · .xlsx · 10 Mo max</div>
                  {file && <div style={{ fontSize: 12.5, color: G_DARK, marginTop: 8, fontWeight: 700 }}>📄 {file.name}</div>}
                  <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
                </div>
              </div>
            )}

            {previewing && <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>Analyse du fichier…</div>}

            {/* Prévisualisation */}
            {preview && (
              <div style={card}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  <span style={{ background: 'var(--surface-2)', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>Total : {preview.counts.total}</span>
                  <span style={{ background: G_SOFT, color: G_DARK, borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>Valides : {preview.counts.valides}</span>
                  <span style={{ background: '#fdecec', color: '#b23b28', borderRadius: 999, padding: '4px 12px', fontSize: 12.5, fontWeight: 700 }}>Erreurs : {preview.counts.erreurs}</span>
                </div>

                <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead style={{ position: 'sticky', top: 0 }}>
                      <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px' }}>Ligne</th>
                        {cols.map((c) => <th key={c} style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{c}</th>)}
                        <th style={{ padding: '8px 10px' }}>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.apercu.map((r) => (
                        <tr key={r.ligne} style={{ borderTop: '1px solid var(--border)', background: r.valide ? 'transparent' : '#fef2f2' }}>
                          <td style={{ padding: '7px 10px', color: 'var(--muted)' }}>{r.ligne}</td>
                          {Object.keys(r.data).map((k) => <td key={k} style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>{r.data[k] || '—'}</td>)}
                          <td style={{ padding: '7px 10px' }} title={r.errors.join(' • ')}>
                            {r.valide
                              ? <span style={{ color: G_DARK, fontWeight: 700 }}>✓ Valide</span>
                              : <span style={{ color: RED, fontWeight: 700 }}>✗ {r.errors[0]}{r.errors.length > 1 ? ` (+${r.errors.length - 1})` : ''}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.tronque && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>Aperçu limité aux 300 premières lignes ; l'import traitera tout le fichier.</div>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
                  {preview.counts.erreurs > 0 && (
                    <>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input type="checkbox" checked={ignoreErr} onChange={(e) => setIgnoreErr(e.target.checked)} /> Ignorer les {preview.counts.erreurs} ligne(s) en erreur
                      </label>
                      <button onClick={dlErreurs} style={{ ...btnO, padding: '.45rem .9rem' }}>⬇ Rapport d'erreurs (CSV)</button>
                    </>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={confirmer} disabled={importing || preview.counts.valides === 0 || (preview.counts.erreurs > 0 && !ignoreErr)}
                    style={{ ...btnG, opacity: (importing || preview.counts.valides === 0 || (preview.counts.erreurs > 0 && !ignoreErr)) ? 0.5 : 1 }}>
                    {importing ? 'Import en cours…' : `Confirmer l'import (${preview.counts.valides})`}
                  </button>
                </div>
                {importing && (
                  <div style={{ height: 6, borderRadius: 999, background: G_SOFT, marginTop: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '40%', background: G, borderRadius: 999, animation: 'impProg 1.1s ease-in-out infinite' }} />
                    <style>{'@keyframes impProg{0%{margin-left:-40%}100%{margin-left:100%}}'}</style>
                  </div>
                )}
              </div>
            )}

            {/* Résumé */}
            {result && (
              <div style={{ ...card, borderColor: '#9CEBD1', background: G_SOFT }}>
                <div style={{ fontWeight: 800, color: G_DARK, fontSize: 16 }}>✓ Import terminé</div>
                <div style={{ marginTop: 6, fontSize: 14 }}>
                  <b style={{ color: G_DARK }}>{result.importes}</b> ligne(s) importée(s)
                  {result.ignores > 0 && <> · <b style={{ color: '#b23b28' }}>{result.ignores}</b> ignorée(s)</>}
                  {' '}· {result.total} au total.
                </div>
                <button onClick={() => { setTab('historique') }} style={{ ...btnO, marginTop: 12 }}>Voir l'historique</button>
              </div>
            )}
          </div>
          <style>{'@media (max-width: 820px){ .imp-grid{ grid-template-columns: 1fr !important; } }'}</style>
        </div>
      ) : (
        /* Historique */
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          {history.length === 0 ? <div style={{ padding: 36, textAlign: 'center', color: 'var(--muted)' }}>Aucun import effectué.</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: G_SOFT, color: G_DARK, textAlign: 'left' }}>
                    {['Type', 'Lignes', 'Importées', 'Erreurs', 'Utilisateur', 'Date', ''].map((h) => <th key={h} style={{ padding: '11px 12px' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{h.type}</td>
                      <td style={{ padding: '10px 12px' }}>{h.nb_lignes}</td>
                      <td style={{ padding: '10px 12px', color: G_DARK, fontWeight: 700 }}>{h.nb_ok}</td>
                      <td style={{ padding: '10px 12px', color: h.nb_err ? '#b23b28' : 'var(--muted)' }}>{h.nb_err}</td>
                      <td style={{ padding: '10px 12px' }}>{h.user || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{h.date ? String(h.date).slice(0, 16) : '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {h.fichier && <button onClick={() => downloadFile(`/import/historique/${h.id}/fichier`, `import_${h.type}_${h.id}.xlsx`)} style={{ background: 'none', border: 'none', color: G_DARK, fontWeight: 700, cursor: 'pointer' }}>⬇ Fichier</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
