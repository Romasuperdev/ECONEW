import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { downloadFile } from '../utils/download'
import { apiError } from '../utils/apiError'

const statutLabel = (v) => ({ '1': 'Inactif', '2': 'Actif', '3': 'Diplômé', '4': 'Transféré' }[String(v)] || v || '')

export default function OutilEleves() {
  const [tab, setTab] = useState('export')      // export | import
  return (
    <>
      <PageHeader title="Outil — Élèves" subtitle="Importer et exporter la liste des élèves"
        action={<div className="flex gap-2">
          <Button variant={tab === 'export' ? undefined : 'ghost'} onClick={() => setTab('export')}>Exporter</Button>
          <Button variant={tab === 'import' ? undefined : 'ghost'} onClick={() => setTab('import')}>Importer</Button>
        </div>} />
      {tab === 'export' ? <ExportEleves /> : <ImportEleves />}
    </>
  )
}

/* ---------------- EXPORT ---------------- */
function ExportEleves() {
  const [students, setStudents] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/students', { params: { per_page: 5000 } }).then(({ data }) => setStudents(data.data || data)).catch((e) => setErr(apiError(e))),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const levelName = (code) => levels.find((l) => String(l.code) === String(code))?.name || code || ''
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase()
    const base = s ? students.filter((x) => `${x.full_name || ''} ${x.first_name || ''} ${x.last_name || ''} ${x.matricule || ''}`.toLowerCase().includes(s)) : students
    return base
  }, [students, search])

  const COLS = [
    ['Matricule', (s) => s.matricule],
    ['Nom', (s) => s.last_name],
    ['Prénoms', (s) => s.first_name],
    ['Sexe', (s) => s.gender === 'F' ? 'Féminin' : s.gender === 'M' ? 'Masculin' : (s.gender || '')],
    ['Date de naissance', (s) => s.birth_date || ''],
    ['Nationalité', (s) => s.nationality || ''],
    ['Niveau', (s) => levelName(s.code_niveau)],
    ['Classe', (s) => s.school_class?.name || s.school_class_id || ''],
    ['Statut', (s) => statutLabel(s.status)],
    ['Parent / tuteur', (s) => `${s.father_first_name || ''} ${s.father_name || s.guardian_name || ''}`.trim()],
    ['Contact parent', (s) => s.father_phone || s.guardian_phone || s.mother_phone || ''],
    ['Scolarité', (s) => Number(s.scolarite || 0)],
    ['Payé', (s) => Number(s.total_paye || 0)],
    ['Reste', (s) => Math.max(0, Number(s.scolarite || 0) - Number(s.total_paye || 0))],
  ]
  const NUM = [11, 12, 13]
  const esc = (v) => String(v ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))

  const exportExcel = () => {
    const head = COLS.map((c) => `<th style="background:#00A876;color:#fff">${esc(c[0])}</th>`).join('')
    const body = rows.map((s) => `<tr>${COLS.map((c, i) => {
      const v = c[1](s)
      return NUM.includes(i) ? `<td>${Number(v || 0)}</td>` : `<td>${esc(v)}</td>`
    }).join('')}</tr>`).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>
    <table border="1"><tr><th colspan="${COLS.length}" style="background:#00A876;color:#fff;font-size:14px">Liste des élèves (${rows.length})</th></tr>
    <tr>${head}</tr>${body}</table></body></html>`
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Eleves_${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const exportCsv = () => {
    const sep = ';'
    const lines = [COLS.map((c) => c[0]).join(sep)]
    rows.forEach((s) => lines.push(COLS.map((c) => `"${String(c[1](s) ?? '').replace(/"/g, '""')}"`).join(sep)))
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Eleves_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <>
      {err && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{err}</div>}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]"><Input label="Rechercher" placeholder="Nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <Button variant="ghost" onClick={exportCsv} disabled={!rows.length}>⬇ CSV</Button>
          <Button onClick={exportExcel} disabled={!rows.length}>⬇ Excel</Button>
        </div>
        <div className="text-xs text-ink mt-2">{rows.length} élève(s) prêt(s) à l'export.</div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun élève." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="bg-brand-50 text-left text-ink"><tr>
                <th className="px-3 py-2">Matricule</th><th>Nom complet</th><th>Niveau</th><th>Classe</th><th>Statut</th><th className="text-right">Scolarité</th><th className="text-right">Reste</th>
              </tr></thead>
              <tbody>
                {rows.slice(0, 200).map((s) => (
                  <tr key={s.id} className="border-t hover:bg-brand-50">
                    <td className="px-3 py-2 font-mono text-xs">{s.matricule}</td>
                    <td className="font-medium">{s.first_name} {s.last_name}</td>
                    <td>{levelName(s.code_niveau)}</td>
                    <td>{s.school_class?.name || '—'}</td>
                    <td>{statutLabel(s.status) || '—'}</td>
                    <td className="text-right">{Number(s.scolarite || 0).toLocaleString('fr-FR')}</td>
                    <td className="text-right">{Math.max(0, Number(s.scolarite || 0) - Number(s.total_paye || 0)).toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 200 && <div className="px-3 py-2 text-xs text-ink">Aperçu limité à 200 lignes — l'export contient les {rows.length} élèves.</div>}
          </div>
        )}
      </Card>
    </>
  )
}

/* ---------------- IMPORT ---------------- */
function ImportEleves() {
  const TYPE = 'eleves'
  const [def, setDef] = useState(null)
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [ignoreErr, setIgnoreErr] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')
  const fileRef = useRef(null)

  useEffect(() => {
    api.get('/import/types').then(({ data }) => setDef((data || []).find((t) => t.type === TYPE) || { type: TYPE, label: 'Élèves', colonnes: [] })).catch((e) => setErr(apiError(e)))
  }, [])

  const cols = def?.colonnes || []
  const dlModele = async () => { try { await downloadFile(`/import/modele/${TYPE}`, `modele_eleves.xlsx`) } catch { setErr('Téléchargement du modèle impossible.') } }

  const handleFile = async (f) => {
    if (!f) return
    setFile(f); setResult(null); setErr(''); setPreview(null); setPreviewing(true)
    try { const fd = new FormData(); fd.append('file', f); const { data } = await api.post(`/import/${TYPE}/previsualiser`, fd); setPreview(data) }
    catch (e) { setErr(apiError(e)) } finally { setPreviewing(false) }
  }
  const confirmer = async () => {
    if (!file) return
    setImporting(true); setErr('')
    try { const fd = new FormData(); fd.append('file', file); fd.append('ignorer_erreurs', ignoreErr ? '1' : '0'); const { data } = await api.post(`/import/${TYPE}/confirmer`, fd); setResult(data); setPreview(null); setFile(null) }
    catch (e) { setErr(e.response?.data?.message || apiError(e)) } finally { setImporting(false) }
  }

  return (
    <>
      {err && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{err}</div>}
      <Card className="p-5 mb-4">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <div className="font-bold text-heading">Importer des élèves</div>
            <div className="text-xs text-ink mt-1">Colonnes attendues : {cols.length ? cols.join(', ') : 'Matricule, Nom, Prénoms, Date de naissance, Sexe, Nationalité, Niveau, Classe, Statut, Nom du parent/tuteur, Contact parent'}</div>
          </div>
          <Button variant="ghost" onClick={dlModele}>⬇ Modèle Excel</Button>
        </div>
        <div onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]) }}
          onClick={() => fileRef.current?.click()}
          className="mt-4 rounded-2xl text-center cursor-pointer" style={{ border: `2px dashed ${dragOver ? 'var(--teal)' : 'var(--border)'}`, background: dragOver ? '#E5FFF7' : 'transparent', padding: 26 }}>
          <div className="font-bold text-heading">Glissez-déposez le fichier Excel rempli</div>
          <div className="text-xs text-ink mt-1">ou cliquez pour le sélectionner · .xlsx · 10 Mo max</div>
          {file && <div className="text-xs font-bold mt-2" style={{ color: 'var(--teal)' }}>📄 {file.name}</div>}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files?.[0])} />
        </div>
      </Card>

      {previewing && <Card className="p-5 text-center text-ink">Analyse du fichier…</Card>}

      {preview && (
        <Card className="p-5">
          <div className="flex gap-3 flex-wrap mb-3">
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--surface-2)' }}>Total : {preview.counts.total}</span>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: '#E5FFF7', color: '#007E58' }}>Valides : {preview.counts.valides}</span>
            <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: '#fdecec', color: '#b23b28' }}>Erreurs : {preview.counts.erreurs}</span>
          </div>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)', maxHeight: 360 }}>
            <table className="w-full text-xs">
              <thead className="sticky top-0"><tr className="text-left" style={{ background: '#E5FFF7', color: '#007E58' }}>
                <th className="px-2 py-2">Ligne</th>{cols.map((c) => <th key={c} className="px-2 py-2 whitespace-nowrap">{c}</th>)}<th className="px-2 py-2">Statut</th>
              </tr></thead>
              <tbody>
                {preview.apercu.map((r) => (
                  <tr key={r.ligne} style={{ borderTop: '1px solid var(--border)', background: r.valide ? 'transparent' : '#fef2f2' }}>
                    <td className="px-2 py-1.5 text-ink">{r.ligne}</td>
                    {Object.keys(r.data).map((k) => <td key={k} className="px-2 py-1.5 whitespace-nowrap">{r.data[k] || '—'}</td>)}
                    <td className="px-2 py-1.5" title={r.errors.join(' • ')}>{r.valide ? <span style={{ color: '#007E58', fontWeight: 700 }}>✓</span> : <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {r.errors[0]}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            {preview.counts.erreurs > 0 && (
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ignoreErr} onChange={(e) => setIgnoreErr(e.target.checked)} /> Ignorer les {preview.counts.erreurs} ligne(s) en erreur</label>
            )}
            <div className="flex-1" />
            <Button onClick={confirmer} disabled={importing || preview.counts.valides === 0 || (preview.counts.erreurs > 0 && !ignoreErr)}>{importing ? 'Import en cours…' : `Confirmer l'import (${preview.counts.valides})`}</Button>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-5" style={{ borderColor: '#9CEBD1', background: '#E5FFF7' }}>
          <div className="font-bold" style={{ color: '#007E58' }}>✓ Import terminé</div>
          <div className="text-sm mt-1"><b style={{ color: '#007E58' }}>{result.importes}</b> élève(s) importé(s){result.ignores > 0 && <> · <b style={{ color: '#b23b28' }}>{result.ignores}</b> ignoré(s)</>} · {result.total} au total.</div>
        </Card>
      )}
    </>
  )
}
