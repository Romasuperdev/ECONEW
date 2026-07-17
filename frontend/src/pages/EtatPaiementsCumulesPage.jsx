import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Input, Select, EmptyState, Button } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

export default function EtatPaiementsCumulesPage() {
  const [versements, setVersements] = useState([])
  const [students, setStudents] = useState([])
  const [levels, setLevels] = useState([])
  const [grilles, setGrilles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [niveau, setNiveau] = useState('')
  const [q, setQ] = useState('')

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/versements', { params: { per_page: 2000 } }).then(({ data }) => setVersements(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([])),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
      api.get('/grille-scolarite').then(({ data }) => setGrilles(data.data || data)).catch(() => setGrilles([])),
    ]).finally(() => setLoading(false))
  }, [])

  // Cumul versé par matricule
  const payeByMat = useMemo(() => {
    const m = {}; versements.forEach((v) => { const k = String(v.matricule); m[k] = (m[k] || 0) + Number(v.amount || 0) }); return m
  }, [versements])
  const dueByNiveau = useMemo(() => { const m = {}; grilles.forEach((g) => { m[String(g.code_grille)] = Number(g.total || 0) }); return m }, [grilles])

  const rows = useMemo(() => students.filter((s) => {
    if (niveau && String(s.code_niveau) !== String(niveau)) return false
    if (q) { const t = `${s.matricule} ${s.full_name || ''}`.toLowerCase(); if (!t.includes(q.toLowerCase())) return false }
    return true
  }).map((s) => {
    const paye = payeByMat[String(s.matricule)] || 0
    const du = dueByNiveau[String(s.code_niveau)] || Number(s.scolarite || 0) || 0
    return { matricule: s.matricule, nom: s.full_name, niveau: s.code_niveau, classe: s.school_class_id, du, paye, reste: Math.max(0, du - paye) }
  }), [students, niveau, q, payeByMat, dueByNiveau])

  const tot = useMemo(() => rows.reduce((a, r) => ({ du: a.du + r.du, paye: a.paye + r.paye, reste: a.reste + r.reste }), { du: 0, paye: 0, reste: 0 }), [rows])

  return (
    <>
      <PageHeader title="État des paiements cumulés" subtitle={`${rows.length} élève(s)`} action={<Button variant="ghost" onClick={() => window.print()}>Imprimer</Button>} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Select label="Niveau" value={niveau} onChange={(e) => setNiveau(e.target.value)}><option value="">— Tous —</option>{levels.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}</Select>
          <Input label="Élève (matricule / nom)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun élève." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Matricule</th><th>Élève</th><th>Niveau</th><th>Classe</th><th className="text-right">Dû</th><th className="text-right">Versé (cumul)</th><th className="text-right">Reste</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.matricule} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-mono text-xs">{r.matricule}</td>
                  <td className="font-medium">{r.nom}</td>
                  <td>{r.niveau || '—'}</td>
                  <td>{r.classe || '—'}</td>
                  <td className="text-right">{formatMoney(r.du)}</td>
                  <td className="text-right text-turquoise-600">{formatMoney(r.paye)}</td>
                  <td className="text-right font-semibold text-red-600">{formatMoney(r.reste)}</td>
                </tr>
              ))}
              <tr className="border-t font-semibold bg-brand-50"><td className="px-4 py-2" colSpan={4}>Total</td><td className="text-right">{formatMoney(tot.du)}</td><td className="text-right">{formatMoney(tot.paye)}</td><td className="text-right">{formatMoney(tot.reste)}</td></tr>
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
