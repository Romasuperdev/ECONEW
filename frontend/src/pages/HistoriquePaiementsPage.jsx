import { Fragment, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'
import { printReceipt } from '../utils/receipt'
import { useAuth } from '../context/AuthContext'

const RUBRIQUES = ['Scolarité', 'Inscription', 'Cantine', 'Pension', 'Transport']
const MODES = ['Espèces', 'Chèque', 'Virement', 'Mobile Money', 'Carte bancaire']
const emptyFilters = { search: '', date_from: '', date_to: '', caisse: '', mode: '', libelle: '' }

const day = (d) => (d ? String(d).slice(0, 10) : '')
const fmtDate = (d) => {
  if (!d) return '—'
  const x = new Date(String(d).replace(' ', 'T'))
  if (isNaN(x)) return String(d)
  const hasTime = !/ 00:00:00/.test(String(d)) && String(d).length > 10
  return hasTime ? x.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : x.toLocaleDateString('fr-FR')
}
// N° de reçu hérités non fiables (tous à « 1 ») : on ne s'en sert pas pour regrouper.
const reliableNumber = (n) => n && String(n).trim() !== '' && String(n).trim() !== '1'

/**
 * Regroupe les versements par reçu : un paiement multi-rubriques = un reçu.
 * - n° de reçu fiable → regroupement par n° ;
 * - anciens versements (n° « 1 ») → même élève + même jour + même caisse + même mode.
 */
function groupByReceipt(versements) {
  const map = new Map()
  for (const v of versements) {
    const key = reliableNumber(v.receipt_number)
      ? `n:${v.receipt_number}`
      : `l:${v.matricule}|${day(v.paid_at)}|${v.caisse || ''}|${v.method || ''}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        numero: reliableNumber(v.receipt_number) ? v.receipt_number : null,
        date: v.paid_at, matricule: v.matricule,
        eleve: v.student?.full_name || v.matricule,
        mode: v.method, caisse: v.caisse, caissier: v.caissier,
        lignes: [], total: 0,
      })
    }
    const g = map.get(key)
    g.lignes.push({ id: v.id, rubrique: v.libelle || 'Versement', montant: Number(v.amount) || 0 })
    g.total += Number(v.amount) || 0
    if (String(v.paid_at) > String(g.date)) g.date = v.paid_at
  }
  return [...map.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)))
}

export default function HistoriquePaiementsPage() {
  const { user } = useAuth()
  const societeName = user?.societes?.[0]?.name || ''
  const [f, setF] = useState(emptyFilters)
  const [versements, setVersements] = useState([])
  const [caisses, setCaisses] = useState([])
  const [etabName, setEtabName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null) // reçu déplié

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const hasFilter = Object.values(f).some((v) => String(v).trim() !== '')

  useEffect(() => {
    api.get('/cash-accounts', { params: { balances: 0 } }).then(({ data }) => setCaisses(data.data || data)).catch(() => {})
    api.get('/etablissements').then(({ data }) => {
      const list = data.data || data
      let cur = null
      try { cur = localStorage.getItem('etablissement') } catch { /* stockage indisponible */ }
      setEtabName((list.find((x) => String(x.code) === String(cur)) || list[0])?.name || '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true); setError('')
      const params = { per_page: 2000 }
      Object.entries(f).forEach(([k, v]) => { if (String(v).trim() !== '') params[k] = String(v).trim() })
      api.get('/versements', { params })
        .then(({ data }) => setVersements(data.data || data))
        .catch((e) => { setVersements([]); setError(apiError(e)) })
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [f])

  const recus = useMemo(() => groupByReceipt(versements), [versements])
  const total = useMemo(() => recus.reduce((s, r) => s + r.total, 0), [recus])
  const nbEleves = useMemo(() => new Set(recus.map((r) => r.matricule)).size, [recus])
  const parRubrique = useMemo(() => {
    const m = {}
    versements.forEach((v) => { const k = v.libelle || 'Versement'; m[k] = (m[k] || 0) + (Number(v.amount) || 0) })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  }, [versements])

  const imprimer = (r) => {
    const ok = printReceipt({
      societe: societeName, etablissement: etabName, numero: r.numero, eleve: r.eleve, matricule: r.matricule,
      mode: r.mode, date: r.date, caisse: r.caisse, caissier: r.caissier, lignes: r.lignes, duplicata: true,
    })
    if (!ok) alert("La fenêtre d'impression a été bloquée par le navigateur. Autorisez les fenêtres pop-up pour ce site.")
  }

  const exportCsv = () => {
    const head = ['Date', 'N° reçu', 'Matricule', 'Élève', 'Rubrique', 'Montant', 'Mode', 'Caisse', 'Caissier']
    const lines = recus.flatMap((r) => r.lignes.map((l) => [fmtDate(r.date), r.numero || '', r.matricule, r.eleve, l.rubrique, l.montant, r.mode || '', r.caisse || '', r.caissier || '']))
    const csv = [head, ...lines].map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `historique-paiements-${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader title="Historique des paiements" subtitle="Paiements encaissés et réimpression des reçus"
        action={<Button variant="ghost" onClick={exportCsv} disabled={recus.length === 0}><Icon name="download" size={16} /> Exporter</Button>} />

      <Card className="p-4 mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Recherche" placeholder="Nom, matricule ou n° de reçu…" value={f.search} onChange={(e) => set('search', e.target.value)} />
          <Input label="Du" type="date" value={f.date_from} onChange={(e) => set('date_from', e.target.value)} />
          <Input label="Au" type="date" value={f.date_to} onChange={(e) => set('date_to', e.target.value)} />
          <Select label="Rubrique" value={f.libelle} onChange={(e) => set('libelle', e.target.value)}>
            <option value="">Toutes</option>
            {RUBRIQUES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Select label="Mode de règlement" value={f.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="">Tous</option>
            {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </Select>
          <Select label="Caisse" value={f.caisse} onChange={(e) => set('caisse', e.target.value)}>
            <option value="">Toutes</option>
            {caisses.map((c) => <option key={c.code ?? c.id} value={c.code ?? c.id}>{c.name} ({c.code ?? c.id})</option>)}
          </Select>
        </div>
        {hasFilter && (
          <div className="flex justify-end mt-3">
            <button type="button" onClick={() => setF(emptyFilters)} className="text-sm hover:underline" style={{ color: 'var(--teal)' }}>Réinitialiser les filtres</button>
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card className="p-4"><div className="text-xs text-muted uppercase font-semibold">Total encaissé</div><div className="text-2xl font-extrabold text-heading mt-1">{formatMoney(total)}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted uppercase font-semibold">Reçus</div><div className="text-2xl font-extrabold text-heading mt-1">{recus.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted uppercase font-semibold">Élèves</div><div className="text-2xl font-extrabold text-heading mt-1">{nbEleves}</div></Card>
      </div>
      {parRubrique.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4 text-xs">
          {parRubrique.map(([k, v]) => (
            <span key={k} className="rounded-full px-3 py-1" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {k} : <b>{formatMoney(v)}</b>
            </span>
          ))}
        </div>
      )}

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : recus.length === 0 ? <EmptyState message={hasFilter ? 'Aucun paiement pour ces critères.' : 'Aucun paiement enregistré.'} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink">
                <tr>
                  <th className="px-4 py-3">Date</th><th>N° reçu</th><th>Élève</th><th>Rubriques</th>
                  <th>Mode</th><th>Caisse</th><th className="text-right">Montant</th><th></th>
                </tr>
              </thead>
              <tbody>
                {recus.map((r) => (
                  <Fragment key={r.key}>
                    <tr className="border-t hover:bg-brand-50 cursor-pointer" onClick={() => setOpen(open === r.key ? null : r.key)}>
                      <td className="px-4 py-2 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="font-mono text-xs whitespace-nowrap">{r.numero || <span className="text-muted">—</span>}</td>
                      <td>
                        <div className="font-medium">{r.eleve}</div>
                        <div className="text-xs text-muted font-mono">{r.matricule}</div>
                      </td>
                      <td className="text-xs">{r.lignes.map((l) => l.rubrique).join(', ')}</td>
                      <td className="whitespace-nowrap">{r.mode || '—'}</td>
                      <td className="font-mono text-xs">{r.caisse || '—'}</td>
                      <td className="text-right font-semibold whitespace-nowrap">{formatMoney(r.total)}</td>
                      <td className="text-right px-4 whitespace-nowrap">
                        <button type="button" onClick={(e) => { e.stopPropagation(); imprimer(r) }}
                          className="inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--teal)' }}>
                          <Icon name="invoices" size={15} /> Reçu
                        </button>
                      </td>
                    </tr>
                    {open === r.key && (
                      <tr className="bg-brand-50">
                        <td colSpan={8} className="px-6 py-3">
                          <table className="text-xs w-full max-w-md">
                            <tbody>
                              {r.lignes.map((l) => (
                                <tr key={l.id}><td className="py-0.5">{l.rubrique}</td><td className="text-right">{formatMoney(l.montant)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                          {r.caissier && <div className="text-xs text-muted mt-2">Encaissé par {r.caissier}</div>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
