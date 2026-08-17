import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatMoney } from '../../utils/format'
import { apiError } from '../../utils/apiError'

// Libellés « connus » et couleur associée (le reste est humanisé automatiquement).
const KNOWN = {
  recettes: { label: 'Recettes', color: 'var(--teal)' },
  paye: { label: 'Payé', color: 'var(--teal)' },
  depenses: { label: 'Dépenses', color: '#b23b28' },
  solde: { label: 'Solde', color: 'var(--sidebar)' },
  impayes: { label: 'Impayés', color: '#a9761a' },
  reste: { label: 'Reste à payer', color: '#a9761a' },
}

const humanize = (k) => String(k).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
const isMoneyKey = (k) => /(recette|depense|solde|montant|impaye|paye|reste)/i.test(k)

export default function RapportsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/admin-etablissement/rapports')
      .then(({ data }) => setData(data))
      .catch((e) => { setData(null); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  // Extraction null-safe : accepte un objet direct ou enveloppé dans { data: {...} }.
  const source = (data && typeof data === 'object' && !Array.isArray(data))
    ? (data.data && typeof data.data === 'object' && !Array.isArray(data.data) ? data.data : data)
    : {}

  // Construit la liste des KPI numériques.
  const kpis = Object.entries(source)
    .filter(([, v]) => typeof v === 'number' || (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))))
    .map(([k, v]) => {
      const known = KNOWN[k]
      const num = Number(v)
      const money = isMoneyKey(k)
      return {
        key: k,
        label: known?.label || humanize(k),
        color: known?.color || 'var(--teal)',
        value: money ? formatMoney(num) : num.toLocaleString('fr-FR'),
      }
    })

  // Recouvrement : payé vs dû (impayés / reste).
  const pick = (...keys) => {
    for (const key of keys) {
      const val = source?.[key]
      if (val != null && !Number.isNaN(Number(val))) return Number(val)
    }
    return null
  }
  const paid = pick('recettes', 'paye')
  const due = pick('impayes', 'reste')
  const showRecouvrement = paid != null && due != null && (paid + due) > 0
  const pct = showRecouvrement ? Math.min(100, Math.round((paid / (paid + due)) * 100)) : 0

  return (
    <>
      <PageHeader title="Rapports transversaux" subtitle="Vue consolidée de l'établissement — année en cours" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

      {loading ? (
        <Card className="p-5"><EmptyState message="Chargement…" /></Card>
      ) : kpis.length === 0 ? (
        <Card className="p-5"><EmptyState message="Aucun indicateur disponible." /></Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <Card key={k.key} className="p-4">
                <div className="text-xs text-ink">{k.label}</div>
                <div className="text-2xl font-bold mt-1" style={{ color: k.color }}>{k.value}</div>
              </Card>
            ))}
          </div>

          {showRecouvrement && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="text-sm font-bold text-heading">Taux de recouvrement</div>
                <div className="text-2xl font-bold" style={{ color: 'var(--teal)' }}>{pct}%</div>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 12, background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--teal)' }} />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-ink">
                <span>Encaissé : {formatMoney(paid)}</span>
                <span>Restant dû : {formatMoney(due)}</span>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
