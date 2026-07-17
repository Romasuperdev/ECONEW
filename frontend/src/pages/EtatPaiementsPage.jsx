import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Input, Select, EmptyState, Button } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

export default function EtatPaiementsPage() {
  const [versements, setVersements] = useState([])
  const [students, setStudents] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const today = new Date().toISOString().slice(0, 10)
  const [debut, setDebut] = useState(today)
  const [fin, setFin] = useState(today)
  const [niveau, setNiveau] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/versements', { params: { per_page: 2000 } }).then(({ data }) => setVersements(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
    ]).finally(() => setLoading(false))
  }, [])

  const stud = useMemo(() => { const m = {}; students.forEach((s) => { m[String(s.matricule)] = s }); return m }, [students])

  const rows = useMemo(() => versements.filter((v) => {
    const d = v.paid_at ? String(v.paid_at).slice(0, 10) : ''
    if (debut && d < debut) return false
    if (fin && d > fin) return false
    const s = stud[String(v.matricule)]
    if (niveau && String(s?.code_niveau) !== String(niveau)) return false
    if (q) { const t = `${v.matricule} ${v.full_name || ''}`.toLowerCase(); if (!t.includes(q.toLowerCase())) return false }
    return true
  }), [versements, stud, debut, fin, niveau, q])

  const total = useMemo(() => rows.reduce((s, v) => s + Number(v.amount || 0), 0), [rows])

  return (
    <>
      <PageHeader title="État des paiements" subtitle={`${rows.length} versement(s) — total ${formatMoney(total)}`} action={<Button variant="ghost" onClick={() => window.print()}>Imprimer</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input label="Du" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
          <Input label="Au" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
          <Select label="Niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)}><option value="">— Tous —</option>{levels.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}</Select>
          <Input label="Élève (matricule / nom)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun paiement." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Date</th><th>Reçu</th><th>Matricule</th><th>Élève</th><th>Motif</th><th>Mode</th><th className="text-right">Montant</th></tr></thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2">{v.paid_at ? String(v.paid_at).slice(0, 10) : '—'}</td>
                  <td className="font-mono text-xs">{v.receipt_number || v.id}</td>
                  <td className="font-mono text-xs">{v.matricule}</td>
                  <td className="font-medium">{v.full_name || '—'}</td>
                  <td>{v.libelle || '—'}</td>
                  <td>{v.method || '—'}</td>
                  <td className="text-right font-medium text-turquoise-600">{formatMoney(v.amount)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold bg-brand-50"><td className="px-4 py-2" colSpan={6}>Total</td><td className="text-right">{formatMoney(total)}</td></tr>
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
