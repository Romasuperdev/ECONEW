import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'
import { useAuth } from '../context/AuthContext'

// Rubriques consultables. Le "montant dû" par élève vient de la grille du niveau.
const ZONES = [
  { key: 'global', label: 'Global' },
  { key: 'scolarite', label: 'Scolarité' },
  { key: 'inscription', label: 'Inscription' },
  { key: 'cantine', label: 'Cantine' },
  { key: 'pension', label: 'Pension' },
  { key: 'transport', label: 'Transport' },
]
const money = (n) => formatMoney(n)

export default function ChiffreAffairePage() {
  const { user } = useAuth()
  const societeName = user?.societes?.[0]?.name || 'AURIAK TECHNOLOGY'
  const [etabName, setEtabName] = useState('')
  const [students, setStudents] = useState([])
  const [levels, setLevels] = useState([])
  const [gSco, setGSco] = useState([])
  const [versements, setVersements] = useState([])
  const [tCantine, setTCantine] = useState([])
  const [gPension, setGPension] = useState([])
  const [tTransport, setTTransport] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [zone, setZone] = useState('global')

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/students', { params: { per_page: 5000 } }).then(({ data }) => setStudents(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
      api.get('/grille-scolarite').then(({ data }) => setGSco(data.data || data)).catch(() => setGSco([])),
      api.get('/versements', { params: { per_page: 5000 } }).then(({ data }) => setVersements(data.data || data)).catch(() => setVersements([])),
      api.get('/cantine-tarifs').then(({ data }) => setTCantine(data.data || data)).catch(() => setTCantine([])),
      api.get('/pension/grille').then(({ data }) => setGPension(data.data || data)).catch(() => setGPension([])),
      api.get('/transport-tarifs').then(({ data }) => setTTransport(data.data || data)).catch(() => setTTransport([])),
    ]).finally(() => setLoading(false))
    api.get('/etablissements').then(({ data }) => {
      const list = data.data || data
      const cur = localStorage.getItem('etablissement')
      const e = list.find((x) => String(x.code) === String(cur)) || list[0]
      setEtabName(e?.name || '')
    }).catch(() => {})
  }, [])

  const levelName = (code) => levels.find((l) => String(l.code) === String(code))?.name || code || '—'
  const scoOf = (code) => { const g = gSco.find((x) => String(x.code_grille) === String(code)); return g ? { scolarite: Number(g.scolarite || 0), inscription: Number(g.inscription || 0) } : { scolarite: 0, inscription: 0 } }

  // Montant dû (unitaire) d'un élève pour la zone
  const montantDu = (s) => {
    const g = scoOf(s.code_niveau)
    if (zone === 'scolarite') return Number(s.scolarite || g.scolarite || 0)
    if (zone === 'inscription') return g.inscription
    if (zone === 'cantine') return Number(tCantine[0]?.montant_annee || 0)
    if (zone === 'pension') return Number(gPension[0]?.montant_total || 0)
    if (zone === 'transport') return Number(tTransport[0]?.montant_annee || 0)
    // global : total attendu toutes rubriques
    return Number(s.scolarite || g.scolarite || 0) + g.inscription + Number(tCantine[0]?.montant_annee || 0) + Number(gPension[0]?.montant_total || 0) + Number(tTransport[0]?.montant_annee || 0)
  }

  // Payé d'un élève pour la zone (depuis les versements classés par libellé)
  const payeByMat = useMemo(() => {
    const kw = { scolarite: ['scolar'], inscription: ['inscri'], cantine: ['cantine'], pension: ['pension'], transport: ['transport'] }
    const m = {}
    versements.forEach((v) => {
      const lib = String(v.libelle || '').toLowerCase()
      let ok = zone === 'global'
      if (!ok && kw[zone]) ok = kw[zone].some((k) => lib.includes(k))
      if (ok) { const mat = String(v.matricule); m[mat] = (m[mat] || 0) + Number(v.amount || 0) }
    })
    return m
  }, [versements, zone])

  const payeDe = (s) => {
    // Pour la scolarité, le solde élève (total_paye) fait foi ; sinon on somme les versements.
    if (zone === 'scolarite') return Number(s.total_paye || 0)
    if (zone === 'global') return Number(s.total_paye || 0) + (payeByMat[String(s.matricule)] || 0)
    return payeByMat[String(s.matricule)] || 0
  }

  // Agrégation par niveau
  const { rows, totaux } = useMemo(() => {
    const byNiv = {}
    students.forEach((s) => {
      const code = String(s.code_niveau || '—')
      if (!byNiv[code]) byNiv[code] = { code, inscrits: 0, nbAff: 0, nbNaff: 0, caAff: 0, caNaff: 0, paye: 0 }
      const r = byNiv[code]
      const du = montantDu(s)
      const aff = !!s.affecte
      r.inscrits += 1
      if (aff) { r.nbAff += 1; r.caAff += du } else { r.nbNaff += 1; r.caNaff += du }
      r.paye += payeDe(s)
    })
    const rows = Object.values(byNiv).map((r) => {
      const totalCA = r.caAff + r.caNaff
      return {
        ...r,
        montAff: r.nbAff ? Math.round(r.caAff / r.nbAff) : 0,
        montNaff: r.nbNaff ? Math.round(r.caNaff / r.nbNaff) : 0,
        totalCA,
        reste: Math.max(0, totalCA - r.paye),
      }
    }).sort((a, b) => levelName(a.code).localeCompare(levelName(b.code)))
    const totaux = rows.reduce((t, r) => ({
      inscrits: t.inscrits + r.inscrits, nbAff: t.nbAff + r.nbAff, nbNaff: t.nbNaff + r.nbNaff,
      caAff: t.caAff + r.caAff, caNaff: t.caNaff + r.caNaff, totalCA: t.totalCA + r.totalCA,
      paye: t.paye + r.paye, reste: t.reste + r.reste,
    }), { inscrits: 0, nbAff: 0, nbNaff: 0, caAff: 0, caNaff: 0, totalCA: 0, paye: 0, reste: 0 })
    return { rows, totaux }
  }, [students, zone, gSco, tCantine, gPension, tTransport, versements, levels])

  const zoneLabel = ZONES.find((z) => z.key === zone)?.label || zone
  const esc = (s) => String(s ?? '—').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))

  const COLS = [
    ['Niveau', (r) => levelName(r.code), 'l'],
    ['Total inscrits', (r) => r.inscrits, 'r'],
    ['Montant affectés', (r) => money(r.montAff), 'r'],
    ['Nb affectés', (r) => r.nbAff, 'r'],
    ["CA affectés", (r) => money(r.caAff), 'r'],
    ['Montant non-affectés', (r) => money(r.montNaff), 'r'],
    ['Nb non-affectés', (r) => r.nbNaff, 'r'],
    ['CA non-affectés', (r) => money(r.caNaff), 'r'],
    ["Total chiffre d'affaires", (r) => money(r.totalCA), 'r'],
    ['Total payé', (r) => money(r.paye), 'r'],
    ['Reste', (r) => money(r.reste), 'r'],
  ]
  const totalCells = [
    'TOTAL', totaux.inscrits, '', totaux.nbAff, money(totaux.caAff), '', totaux.nbNaff, money(totaux.caNaff), money(totaux.totalCA), money(totaux.paye), money(totaux.reste),
  ]

  const printReport = () => {
    const head = COLS.map((c) => `<th class="${c[2] === 'r' ? 'r' : ''}">${esc(c[0])}</th>`).join('')
    const body = rows.map((r) => `<tr>${COLS.map((c) => `<td class="${c[2] === 'r' ? 'r' : ''}">${esc(c[1](r))}</td>`).join('')}</tr>`).join('')
    const totalRow = `<tr class="tot">${totalCells.map((v, i) => `<td class="${COLS[i][2] === 'r' ? 'r' : ''}">${esc(v)}</td>`).join('')}</tr>`
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Chiffre d'affaires — ${esc(zoneLabel)}</title>
    <style>*{font-family:'DM Sans',Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    body{color:#173a24;padding:14px}@page{size:landscape}
    .head{text-align:center;border-bottom:2px solid #00A876;padding-bottom:6px;margin-bottom:8px}
    .soc{font-size:15px;font-weight:800;color:#0c2c21}.sub{font-size:10px;color:#5A6B7B}.etab{font-size:11px;font-weight:700;color:#00A876}
    h1{text-align:center;font-size:15px;margin:6px 0 10px}
    table{width:100%;border-collapse:collapse;font-size:10px}
    th{background:#00A876;color:#fff;text-align:left;padding:5px}th.r,td.r{text-align:right}
    td{padding:4px 5px;border-bottom:1px solid #eef3ee}
    tr.tot td{font-weight:800;border-top:2px solid #00A876;background:#f5fffb}</style></head><body>
    <div class="head"><div class="soc">${esc(societeName)}</div><div class="sub">Solutions de gestion scolaire — Economat</div>${etabName ? `<div class="etab">${esc(etabName)}</div>` : ''}</div>
    <h1>CHIFFRE D'AFFAIRES — ${esc(zoneLabel.toUpperCase())}</h1>
    <table><thead><tr>${head}</tr></thead><tbody>${body}${totalRow}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`
    const w = window.open('', '_blank', 'width=1100,height=800')
    if (w) { w.document.write(html); w.document.close() }
  }

  const exportExcel = () => {
    const head = COLS.map((c) => `<th style="background:#E5FFF7">${esc(c[0])}</th>`).join('')
    const numCol = (i) => i !== 0 && i !== 2 && i !== 5 // colonnes numériques brutes pour Excel
    const body = rows.map((r) => `<tr>${COLS.map((c, i) => {
      const raw = c[1](r)
      // valeurs numériques : réinjecter le nombre brut
      const num = [null, r.inscrits, r.montAff, r.nbAff, r.caAff, r.montNaff, r.nbNaff, r.caNaff, r.totalCA, r.paye, r.reste][i]
      return i === 0 ? `<td>${esc(raw)}</td>` : `<td>${num}</td>`
    }).join('')}</tr>`).join('')
    const totalRow = `<tr><td style="font-weight:bold">TOTAL</td><td>${totaux.inscrits}</td><td></td><td>${totaux.nbAff}</td><td>${totaux.caAff}</td><td></td><td>${totaux.nbNaff}</td><td>${totaux.caNaff}</td><td>${totaux.totalCA}</td><td>${totaux.paye}</td><td>${totaux.reste}</td></tr>`
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>
    <table border="1"><tr><th colspan="${COLS.length}" style="background:#00A876;color:#fff">Chiffre d'affaires — ${esc(zoneLabel)}</th></tr>
    <tr>${head}</tr>${body}${totalRow}</table></body></html>`
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Chiffre-affaires_${zone}.xls`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <PageHeader title="Chiffre d'affaires" subtitle={`${zoneLabel} · ${money(totaux.totalCA)} attendu · ${money(totaux.paye)} payé`}
        action={<div className="flex gap-2">
          <Button variant="ghost" onClick={exportExcel} disabled={!rows.length}>⬇ Excel</Button>
          <Button onClick={printReport} disabled={!rows.length}>🖨 Imprimer</Button>
        </div>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      {/* Zones */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ZONES.map((z) => (
          <button key={z.key} onClick={() => setZone(z.key)} className="px-4 py-2 rounded-full text-sm font-semibold transition"
            style={zone === z.key ? { background: 'var(--teal)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {z.label}
          </button>
        ))}
      </div>

      {/* Récap cartes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <Card className="p-4"><div className="text-xs text-ink">Total inscrits</div><div className="text-xl font-bold text-heading">{totaux.inscrits}</div><div className="text-xs text-ink mt-1">{totaux.nbAff} affectés · {totaux.nbNaff} non-affectés</div></Card>
        <Card className="p-4"><div className="text-xs text-ink">Total chiffre d'affaires</div><div className="text-xl font-bold" style={{ color: 'var(--teal)' }}>{money(totaux.totalCA)}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink">Total payé</div><div className="text-xl font-bold text-heading">{money(totaux.paye)}</div></Card>
        <Card className="p-4"><div className="text-xs text-ink">Reste à recouvrer</div><div className="text-xl font-bold" style={{ color: '#b23b28' }}>{money(totaux.reste)}</div></Card>
      </div>

      {/* Tableau détaillé par niveau — en-têtes groupés, colonnes compactes */}
      <Card className="overflow-hidden p-0">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucune donnée." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]" style={{ borderCollapse: 'collapse', fontVariantNumeric: 'tabular-nums' }}>
              <thead>
                <tr className="text-ink" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: .3 }}>
                  <th rowSpan={2} className="sticky left-0 z-10 px-3 py-2 text-left align-bottom" style={{ background: 'var(--surface-2)', minWidth: 92 }}>Niveau</th>
                  <th rowSpan={2} className="px-3 py-2 text-right align-bottom" style={{ background: 'var(--surface-2)' }}>Inscrits</th>
                  <th colSpan={3} className="px-3 py-1.5 text-center" style={{ background: '#E5FFF7', color: '#0c7a54', borderLeft: '2px solid #fff' }}>Affectés</th>
                  <th colSpan={3} className="px-3 py-1.5 text-center" style={{ background: '#eef2f7', color: '#41506b', borderLeft: '2px solid #fff' }}>Non-affectés</th>
                  <th colSpan={3} className="px-3 py-1.5 text-center" style={{ background: '#e6f6ec', color: '#0c2c21', borderLeft: '2px solid #fff' }}>Totaux</th>
                </tr>
                <tr className="text-ink" style={{ fontSize: 10.5 }}>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#E5FFF7', borderLeft: '2px solid #fff' }}>Nb</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#E5FFF7' }}>Montant</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#E5FFF7' }}>CA</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#eef2f7', borderLeft: '2px solid #fff' }}>Nb</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#eef2f7' }}>Montant</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#eef2f7' }}>CA</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#e6f6ec', borderLeft: '2px solid #fff' }}>CA total</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#e6f6ec' }}>Payé</th>
                  <th className="px-3 py-1.5 text-right" style={{ background: '#e6f6ec' }}>Reste</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.code} className="hover:bg-brand-50" style={{ borderTop: '1px solid var(--border)' }}>
                    <td className="sticky left-0 z-10 px-3 py-2 font-semibold text-heading" style={{ background: 'var(--surface)', minWidth: 92 }}>{levelName(r.code)}</td>
                    <td className="px-3 py-2 text-right">{r.inscrits}</td>
                    <td className="px-3 py-2 text-right" style={{ borderLeft: '2px solid #f0faf5' }}>{r.nbAff}</td>
                    <td className="px-3 py-2 text-right text-ink">{money(r.montAff)}</td>
                    <td className="px-3 py-2 text-right">{money(r.caAff)}</td>
                    <td className="px-3 py-2 text-right" style={{ borderLeft: '2px solid #f5f7fa' }}>{r.nbNaff}</td>
                    <td className="px-3 py-2 text-right text-ink">{money(r.montNaff)}</td>
                    <td className="px-3 py-2 text-right">{money(r.caNaff)}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ borderLeft: '2px solid #eef7f0', color: 'var(--teal)' }}>{money(r.totalCA)}</td>
                    <td className="px-3 py-2 text-right">{money(r.paye)}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: r.reste > 0 ? '#b23b28' : '#0c7a54' }}>{money(r.reste)}</td>
                  </tr>
                ))}
                <tr className="font-bold" style={{ borderTop: '2px solid var(--teal)', background: 'var(--surface-2)' }}>
                  <td className="sticky left-0 z-10 px-3 py-2" style={{ background: 'var(--surface-2)' }}>TOTAL</td>
                  <td className="px-3 py-2 text-right">{totaux.inscrits}</td>
                  <td className="px-3 py-2 text-right">{totaux.nbAff}</td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right">{money(totaux.caAff)}</td>
                  <td className="px-3 py-2 text-right">{totaux.nbNaff}</td>
                  <td className="px-3 py-2 text-right"></td>
                  <td className="px-3 py-2 text-right">{money(totaux.caNaff)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--teal)' }}>{money(totaux.totalCA)}</td>
                  <td className="px-3 py-2 text-right">{money(totaux.paye)}</td>
                  <td className="px-3 py-2 text-right" style={{ color: '#b23b28' }}>{money(totaux.reste)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-ink mt-2">Montant = dû unitaire moyen (grille du niveau) · CA = chiffre d'affaires attendu du groupe · Payé = encaissé · Reste = CA total − Payé. Le statut « affecté » provient de la fiche élève.</p>
    </>
  )
}
