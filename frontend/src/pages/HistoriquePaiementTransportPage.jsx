import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const emptyFilters = { search: '', immatriculation: '', destination_id: '', date_debut: '', date_fin: '' }

export default function HistoriquePaiementTransportPage() {
  const [f, setF] = useState(emptyFilters)
  const [rows, setRows] = useState([])
  const [totaux, setTotaux] = useState({ paye: 0, reste: 0 })
  const [destinations, setDestinations] = useState([])
  const [buses, setBuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const hasFilter = useMemo(() => Object.values(f).some((v) => String(v).trim() !== ''), [f])

  useEffect(() => {
    api.get('/destinations').then(({ data }) => setDestinations(data.data || data)).catch(() => {})
    api.get('/transport/buses').then(({ data }) => setBuses(data.data || data)).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true); setError('')
    api.get('/transport', { params: { ...f } })
      .then(({ data }) => { setRows(data.data || data); setTotaux(data.totaux || { paye: 0, reste: 0 }) })
      .catch((e) => { setRows([]); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  // Recherche en temps réel (debounce) dès qu'un critère change.
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t) }, [f])

  const destName = useMemo(() => { const m = {}; destinations.forEach((d) => { m[String(d.id)] = d.libelle }); return m }, [destinations])

  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
  const exportExcel = () => {
    const head = ['Matricule', 'Élève', 'Car', 'Montant/an', 'Payé', 'Reste', 'Début', 'Fin']
    const body = rows.map((t) => `<tr><td>${esc(t.matricule)}</td><td>${esc(t.full_name || '')}</td><td>${esc(t.immatriculation || '')}</td><td>${Number(t.montant_annee || 0)}</td><td>${Number(t.paye || 0)}</td><td>${Number(t.reste || 0)}</td><td>${esc(t.date_debut || '')}</td><td>${esc(t.date_fin || '')}</td></tr>`).join('')
    const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table border="1"><tr><th colspan="8" style="background:#00A876;color:#fff">Historique paiements transport (${rows.length})</th></tr><tr>${head.map((h) => `<th style="background:#E5FFF7">${esc(h)}</th>`).join('')}</tr>${body}</table></body></html>`
    const blob = new Blob(['﻿' + html], { type: 'application/vnd.ms-excel' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Historique-transport.xls'; a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <>
      <PageHeader title="Historique des paiements transport" subtitle={`${rows.length} enregistrement(s) · Payé ${formatMoney(totaux.paye)} · Reste ${formatMoney(totaux.reste)}`}
        action={<Button variant="ghost" onClick={exportExcel} disabled={!rows.length}>⬇ Excel</Button>} />

      {/* Recherche multi-critères */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input label="Matricule ou nom" value={f.search} onChange={(e) => set('search', e.target.value)} placeholder="Ex : MAT2681541 ou KONE" />
          <Select label="Car" value={f.immatriculation} onChange={(e) => set('immatriculation', e.target.value)}>
            <option value="">— Tous —</option>
            {buses.map((b) => <option key={b.immatriculation} value={b.immatriculation}>{b.immatriculation}{b.marque ? ` (${b.marque})` : ''}</option>)}
          </Select>
          <Select label="Destination" value={f.destination_id} onChange={(e) => set('destination_id', e.target.value)}>
            <option value="">— Toutes —</option>
            {destinations.map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </Select>
          <Input label="Période — du" type="date" value={f.date_debut} onChange={(e) => set('date_debut', e.target.value)} />
          <Input label="Période — au" type="date" value={f.date_fin} onChange={(e) => set('date_fin', e.target.value)} />
          <div className="flex items-end">
            <Button variant="ghost" onClick={() => setF(emptyFilters)} disabled={!hasFilter}>Réinitialiser</Button>
          </div>
        </div>
      </Card>

      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun enregistrement transport pour ces critères." /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Matricule</th><th>Élève</th><th>Car</th><th className="text-right">Montant/an</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th>Période</th></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-mono text-xs">{t.matricule}</td>
                    <td className="font-medium">{t.full_name || t.matricule}</td>
                    <td className="font-mono text-xs">{t.immatriculation || '—'}</td>
                    <td className="text-right">{formatMoney(t.montant_annee)}</td>
                    <td className="text-right" style={{ color: 'var(--teal)' }}>{formatMoney(t.paye)}</td>
                    <td className="text-right text-red-600">{formatMoney(t.reste)}</td>
                    <td className="text-ink">{t.date_debut || '—'} → {t.date_fin || '—'}</td>
                  </tr>
                ))}
                <tr className="border-t font-bold" style={{ background: 'var(--surface-2)' }}>
                  <td className="px-4 py-2" colSpan={4}>TOTAL</td>
                  <td className="text-right" style={{ color: 'var(--teal)' }}>{formatMoney(totaux.paye)}</td>
                  <td className="text-right text-red-600">{formatMoney(totaux.reste)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
