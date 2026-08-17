import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'
import { useAuth } from '../context/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)
const firstOfMonth = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10) }

export default function PointCaisseDetaillePage() {
  const { user } = useAuth()
  const societeName = user?.societes?.[0]?.name || 'AURIAK TECHNOLOGY'
  const [etabName, setEtabName] = useState('')
  const [versements, setVersements] = useState([])
  const [students, setStudents] = useState([])
  const [caisses, setCaisses] = useState([])
  const [caissiers, setCaissiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [du, setDu] = useState(firstOfMonth())
  const [au, setAu] = useState(today())
  const [eleves, setEleves] = useState([])       // matricules sélectionnés
  const [caisse, setCaisse] = useState('')
  const [caissier, setCaissier] = useState('')   // id caissier

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/versements', { params: { per_page: 5000 } }).then(({ data }) => setVersements(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
      api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data.data || data)).catch(() => setCaisses([])),
      api.get('/establishment-users').then(({ data }) => setCaissiers((data || []).filter((u) => u.role === 'caissier'))).catch(() => setCaissiers([])),
    ]).finally(() => setLoading(false))
    api.get('/etablissements').then(({ data }) => {
      const list = data.data || data
      const cur = localStorage.getItem('etablissement')
      const e = list.find((x) => String(x.code) === String(cur)) || list[0]
      setEtabName(e?.name || '')
    }).catch(() => {})
  }, [])

  const studName = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s.full_name || `${s.first_name} ${s.last_name}` }); return m }, [students])
  const caisseName = useMemo(() => { const m = {}; caisses.forEach((c) => { m[String(c.code)] = c.name }); return m }, [caisses])
  // Caisse -> caissier (par affectation caisse_code)
  const caissierOfCaisse = useMemo(() => { const m = {}; caissiers.forEach((u) => { if (u.caisse_code) m[String(u.caisse_code)] = u.name || u.login }); return m }, [caissiers])
  const caissierCaisse = useMemo(() => caissiers.find((u) => String(u.id) === String(caissier))?.caisse_code, [caissiers, caissier])

  const toggleEleve = (mat) => setEleves((arr) => arr.includes(mat) ? arr.filter((m) => m !== mat) : [...arr, mat])

  const rows = useMemo(() => {
    return versements.filter((v) => {
      const d = v.paid_at ? String(v.paid_at).slice(0, 10) : ''
      if (du && d && d < du) return false
      if (au && d && d > au) return false
      if (!d && (du || au)) return false
      if (eleves.length && !eleves.includes(String(v.matricule))) return false
      if (caisse && String(v.caisse) !== String(caisse)) return false
      if (caissier && caissierCaisse && String(v.caisse) !== String(caissierCaisse)) return false
      return true
    }).map((v) => ({
      ...v,
      _eleve: v.student?.full_name || studName[String(v.matricule)] || v.matricule,
      _caisse: caisseName[String(v.caisse)] || v.caisse || '—',
      _caissier: caissierOfCaisse[String(v.caisse)] || '—',
    })).sort((a, b) => String(a.paid_at).localeCompare(String(b.paid_at)))
  }, [versements, du, au, eleves, caisse, caissier, caissierCaisse, studName, caisseName, caissierOfCaisse])

  const total = useMemo(() => rows.reduce((s, v) => s + Number(v.amount || 0), 0), [rows])
  const byMode = useMemo(() => { const m = {}; rows.forEach((v) => { const k = v.method || 'Autre'; m[k] = (m[k] || 0) + Number(v.amount || 0) }); return m }, [rows])
  const byCaisse = useMemo(() => { const m = {}; rows.forEach((v) => { const k = v._caisse; m[k] = (m[k] || 0) + Number(v.amount || 0) }); return m }, [rows])

  const periodeLabel = `du ${du || '—'} au ${au || '—'}`
  const esc = (s) => String(s ?? '—').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))

  const tableRowsHtml = () => rows.map((v) => `<tr>
    <td>${esc(v.paid_at ? String(v.paid_at).slice(0, 10) : '—')}</td>
    <td>${esc(v.receipt_number || v.id)}</td>
    <td>${esc(v.matricule)}</td>
    <td>${esc(v._eleve)}</td>
    <td>${esc(v.libelle)}</td>
    <td>${esc(v.method)}</td>
    <td>${esc(v._caisse)}</td>
    <td>${esc(v._caissier)}</td>
    <td style="text-align:right">${esc(formatMoney(v.amount))}</td></tr>`).join('')

  const printReport = () => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Point de caisse détaillé</title>
    <style>*{font-family:'DM Sans',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{color:#173a24;padding:18px}
    .head{text-align:center;border-bottom:2px solid #00A876;padding-bottom:8px;margin-bottom:10px}
    .soc{font-size:16px;font-weight:800;color:#0c2c21}.sub{font-size:10px;color:#5A6B7B}.etab{font-size:12px;font-weight:700;color:#00A876}
    h1{text-align:center;font-size:16px;margin:8px 0 2px}.per{text-align:center;font-size:11px;color:#5A6B7B;margin-bottom:12px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:#00A876;color:#fff;text-align:left;padding:6px}th.r{text-align:right}
    td{padding:5px 6px;border-bottom:1px solid #eef3ee}
    tr.tot td{font-weight:800;border-top:2px solid #00A876;background:#f5fffb}
    .rec{margin-top:12px;font-size:11.5px}.rec b{color:#007E58}</style></head><body>
    <div class="head"><div class="soc">${esc(societeName)}</div><div class="sub">Solutions de gestion scolaire — Economat</div>${etabName ? `<div class="etab">${esc(etabName)}</div>` : ''}</div>
    <h1>POINT DE CAISSE DÉTAILLÉ</h1>
    <div class="per">Période ${esc(periodeLabel)}${caisse ? ` · Caisse ${esc(caisseName[caisse] || caisse)}` : ''}${caissier ? ` · Caissier ${esc(caissiers.find((u) => String(u.id) === String(caissier))?.name || '')}` : ''} — ${rows.length} versement(s)</div>
    <table><thead><tr><th>Date</th><th>Reçu</th><th>Matricule</th><th>Élève</th><th>Rubrique</th><th>Mode</th><th>Caisse</th><th>Caissier</th><th class="r">Montant</th></tr></thead>
    <tbody>${tableRowsHtml()}<tr class="tot"><td colspan="8">TOTAL</td><td style="text-align:right">${esc(formatMoney(total))}</td></tr></tbody></table>
    <div class="rec">Par mode : ${Object.entries(byMode).map(([k, v]) => `${esc(k)} <b>${esc(formatMoney(v))}</b>`).join(' · ') || '—'}</div>
    <div class="rec">Par caisse : ${Object.entries(byCaisse).map(([k, v]) => `${esc(k)} <b>${esc(formatMoney(v))}</b>`).join(' · ') || '—'}</div>
    <script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1000,height=800')
    if (w) { w.document.write(html); w.document.close() }
  }

  const exportExcel = () => {
    const head = ['Date', 'Reçu', 'Matricule', 'Élève', 'Rubrique', 'Mode', 'Caisse', 'Caissier', 'Montant']
    const body = rows.map((v) => [
      v.paid_at ? String(v.paid_at).slice(0, 10) : '',
      v.receipt_number || v.id, v.matricule, v._eleve, v.libelle || '', v.method || '', v._caisse, v._caissier, Number(v.amount || 0),
    ])
    const cell = (c, isNum) => isNum ? `<td style="mso-number-format:'0'">${c}</td>` : `<td>${esc(c)}</td>`
    const trs = body.map((r) => `<tr>${r.map((c, i) => cell(c, i === 8)).join('')}</tr>`).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>
    <table border="1">
    <tr><th colspan="9" style="background:#00A876;color:#fff;font-size:14px">Point de caisse détaillé — ${esc(periodeLabel)}</th></tr>
    <tr>${head.map((h) => `<th style="background:#E5FFF7">${esc(h)}</th>`).join('')}</tr>
    ${trs}
    <tr><td colspan="8" style="font-weight:bold">TOTAL</td><td style="font-weight:bold">${total}</td></tr>
    </table></body></html>`
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Point-caisse-detaille_${du}_${au}.xls`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const resetFiltres = () => { setDu(firstOfMonth()); setAu(today()); setEleves([]); setCaisse(''); setCaissier('') }

  return (
    <>
      <PageHeader title="Point de caisse détaillé" subtitle={`${rows.length} versement(s) · ${formatMoney(total)}`}
        action={<div className="flex gap-2">
          <Button variant="ghost" onClick={exportExcel} disabled={!rows.length}>⬇ Excel</Button>
          <Button onClick={printReport} disabled={!rows.length}>🖨 Imprimer</Button>
        </div>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      {/* Filtres */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Du" type="date" value={du} onChange={(e) => setDu(e.target.value)} />
          <Input label="Au" type="date" value={au} onChange={(e) => setAu(e.target.value)} />
          <Select label="Caisse" value={caisse} onChange={(e) => setCaisse(e.target.value)}>
            <option value="">— Toutes —</option>
            {caisses.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code})</option>)}
          </Select>
          <Select label="Caissier" value={caissier} onChange={(e) => setCaissier(e.target.value)}>
            <option value="">— Tous —</option>
            {caissiers.map((u) => <option key={u.id} value={u.id}>{u.name || u.login}{u.caisse_code ? ` (${u.caisse_code})` : ''}</option>)}
          </Select>
        </div>
        <div className="mt-3">
          <div className="text-xs font-bold text-heading mb-1">Élève(s) — laisser vide pour tous {eleves.length ? `(${eleves.length} sélectionné(s))` : ''}</div>
          <ElevePicker students={students} selected={eleves} toggle={toggleEleve} clear={() => setEleves([])} />
        </div>
        <div className="mt-3 flex justify-end"><Button variant="ghost" onClick={resetFiltres}>Réinitialiser les filtres</Button></div>
      </Card>

      {/* Récap */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-5"><div className="text-sm text-ink">Total encaissé</div><div className="text-2xl font-bold" style={{ color: 'var(--teal)' }}>{formatMoney(total)}</div></Card>
        <Card className="p-5"><div className="text-sm text-ink">Nombre de versements</div><div className="text-2xl font-bold text-heading">{rows.length}</div></Card>
        <Card className="p-4">
          <div className="text-sm text-ink mb-1">Par mode de règlement</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {Object.keys(byMode).length ? Object.entries(byMode).map(([k, v]) => <span key={k}>{k} : <strong>{formatMoney(v)}</strong></span>) : <span>—</span>}
          </div>
        </Card>
      </div>

      {/* Tableau */}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun versement pour ces critères." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink">
                <tr><th className="px-4 py-2">Date</th><th>Reçu</th><th>Matricule</th><th>Élève</th><th>Rubrique</th><th>Mode</th><th>Caisse</th><th>Caissier</th><th className="text-right">Montant</th></tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 whitespace-nowrap">{v.paid_at ? String(v.paid_at).slice(0, 10) : '—'}</td>
                    <td className="font-mono text-xs">{v.receipt_number || v.id}</td>
                    <td className="font-mono text-xs">{v.matricule}</td>
                    <td className="font-medium">{v._eleve}</td>
                    <td>{v.libelle || '—'}</td>
                    <td>{v.method || '—'}</td>
                    <td>{v._caisse}</td>
                    <td>{v._caissier}</td>
                    <td className="text-right font-medium" style={{ color: 'var(--teal)' }}>{formatMoney(v.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold" style={{ background: 'var(--surface-2)' }}>
                  <td className="px-4 py-2" colSpan={8}>TOTAL</td>
                  <td className="text-right" style={{ color: 'var(--teal)' }}>{formatMoney(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

/* Sélecteur multi-élèves avec recherche */
function ElevePicker({ students, selected, toggle, clear }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s ? students.filter((x) => `${x.full_name || ''} ${x.first_name || ''} ${x.last_name || ''} ${x.matricule || ''}`.toLowerCase().includes(s)) : students
    return base.slice(0, 40)
  }, [students, q])
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <div className="p-2 flex gap-2 items-center">
        <input className="field flex-1" placeholder="Rechercher un élève (nom ou matricule)…" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.length > 0 && <button className="text-xs text-red-600 hover:underline" onClick={clear}>Tout retirer</button>}
      </div>
      <div className="max-h-40 overflow-y-auto px-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-1">
        {list.map((s) => {
          const on = selected.includes(String(s.matricule))
          return (
            <label key={s.matricule} className="flex items-center gap-2 text-sm px-2 py-1 rounded cursor-pointer" style={{ background: on ? 'var(--surface-2)' : 'transparent' }}>
              <input type="checkbox" checked={on} onChange={() => toggle(String(s.matricule))} />
              <span className="truncate">{s.full_name || `${s.first_name} ${s.last_name}`} <span className="font-mono text-xs text-ink">({s.matricule})</span></span>
            </label>
          )
        })}
        {list.length === 0 && <div className="text-xs text-ink px-2 py-1">Aucun élève.</div>}
      </div>
    </div>
  )
}
