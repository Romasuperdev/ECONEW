import { useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

export default function HistoriquePaiementTransportPage() {
  const [matricule, setMatricule] = useState('')
  const [rows, setRows] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const chercher = async (e) => {
    e.preventDefault(); setError(''); setRows(null)
    if (!matricule.trim()) return
    setLoading(true)
    try {
      const { data } = await api.get('/transport', { params: { search: matricule.trim() } })
      setRows(data.data || data)
    } catch (err) { setError(apiError(err)) } finally { setLoading(false) }
  }

  return (
    <>
      <PageHeader title="Historique des paiements transport" subtitle="Saisir le matricule de l'élève" />
      <Card className="p-4 mb-4">
        <form onSubmit={chercher} className="flex items-end gap-3">
          <div className="flex-1"><Input label="Matricule" value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="Ex : MAT2681541" /></div>
          <Button type="submit" disabled={loading}>{loading ? 'Recherche…' : 'Rechercher'}</Button>
        </form>
      </Card>
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {rows && (
        <Card className="overflow-hidden">
          {rows.length === 0 ? <EmptyState message="Aucun enregistrement transport pour ce matricule." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Élève</th><th>Car</th><th className="text-right">Montant/an</th><th className="text-right">Payé</th><th className="text-right">Reste</th><th>Période</th></tr></thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-medium">{t.full_name || t.matricule}</td>
                    <td className="font-mono text-xs">{t.immatriculation || '—'}</td>
                    <td className="text-right">{formatMoney(t.montant_annee)}</td>
                    <td className="text-right text-turquoise-600">{formatMoney(t.paye)}</td>
                    <td className="text-right text-red-600">{formatMoney(t.reste)}</td>
                    <td className="text-ink">{t.date_debut || '—'} → {t.date_fin || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </>
  )
}
