import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Input, Select, EmptyState, Button } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const periodLabel = (ym) => { const [y, m] = ym.split('-'); return `${MOIS[Number(m) - 1] || m} ${y}` }

export default function EtatPaiementsPeriodiquesPage() {
  const [versements, setVersements] = useState([])
  const [students, setStudents] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [niveau, setNiveau] = useState('')

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/versements', { params: { per_page: 2000 } }).then(({ data }) => setVersements(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
    ]).finally(() => setLoading(false))
  }, [])

  const stud = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s }); return m }, [students])

  const groups = useMemo(() => {
    const g = {}
    versements.forEach((v) => {
      const s = stud[String(v.matricule)]
      if (niveau && String(s?.code_niveau) !== String(niveau)) return
      const ym = v.paid_at ? String(v.paid_at).slice(0, 7) : 'inconnu'
      ;(g[ym] = g[ym] || []).push(v)
    })
    return Object.keys(g).sort().reverse().map((ym) => ({ ym, rows: g[ym], total: g[ym].reduce((s, v) => s + Number(v.amount || 0), 0) }))
  }, [versements, stud, niveau])

  const grand = useMemo(() => groups.reduce((s, g) => s + g.total, 0), [groups])

  return (
    <>
      <PageHeader title="État des paiements périodiques (détaillé)" subtitle={`Total ${formatMoney(grand)}`} action={<Button variant="ghost" onClick={() => window.print()}>Imprimer</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="p-4 mb-4 max-w-sm">
        <Select label="Niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)}><option value="">— Tous —</option>{levels.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}</Select>
      </Card>
      {loading ? <Card><EmptyState message="Chargement…" /></Card> : groups.length === 0 ? <Card><EmptyState message="Aucun paiement." /></Card> : groups.map((g) => (
        <Card key={g.ym} className="overflow-hidden mb-4">
          <div className="px-4 py-2 border-b flex justify-between font-semibold text-sm capitalize"><span>{periodLabel(g.ym)}</span><span>{formatMoney(g.total)}</span></div>
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Élève</th><th>Motif</th><th>Mode</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {g.rows.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-4 py-1.5">{v.paid_at ? String(v.paid_at).slice(0, 10) : '—'}</td>
                  <td className="font-medium">{v.full_name || v.matricule}</td>
                  <td>{v.libelle || '—'}</td>
                  <td>{v.method || '—'}</td>
                  <td className="text-right">{formatMoney(v.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ))}
    </>
  )
}
