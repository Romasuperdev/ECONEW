import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { formatMoney } from '../../utils/format'
import { apiError } from '../../utils/apiError'

const Field = ({ label, children }) => (
  <div>
    <div className="text-xs text-ink">{label}</div>
    <div className="text-base font-semibold text-heading mt-0.5">{children ?? '—'}</div>
  </div>
)

// Badge de statut coloré : active/trial = vert, expired = rouge, sinon orange.
const StatusBadge = ({ statut }) => {
  const s = String(statut || '').toLowerCase()
  const palette = /(actif|active|trial|essai)/.test(s)
    ? { bg: '#ecfdf5', fg: '#047857', bd: '#a7f3d0' }
    : /(expir|resili)/.test(s)
      ? { bg: '#fef2f2', fg: '#b91c1c', bd: '#fecaca' }
      : { bg: '#fff7ed', fg: '#b45309', bd: '#fed7aa' }
  return (
    <span className="px-3 py-1 rounded-full text-xs font-semibold"
      style={{ background: palette.bg, color: palette.fg, border: `1px solid ${palette.bd}` }}>
      {statut}
    </span>
  )
}

export default function AbonnementPage() {
  const [abo, setAbo] = useState(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/admin-etablissement/abonnement')
      .then(({ data }) => { setAbo(data.abonnement || null); setMessage(data.message || '') })
      .catch((e) => { setAbo(null); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const jours = abo?.jours_restants
  const warn = !!abo && (abo.expire || (jours != null && Number(jours) <= 15))

  return (
    <>
      <PageHeader title="Abonnement" subtitle="Formule et facturation de l'établissement" />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}

      {loading ? (
        <Card className="p-5"><EmptyState message="Chargement…" /></Card>
      ) : !abo ? (
        <Card className="p-5"><EmptyState message={message || 'Aucun abonnement actif pour le moment.'} /></Card>
      ) : (
        <div className="space-y-4">
          {warn && (
            <div className="rounded-lg px-4 py-3 text-sm" style={{ background: '#fff7ed', color: '#b45309', border: '1px solid #fed7aa' }}>
              {abo.expire
                ? 'Abonnement expiré — contactez l’administrateur de la plateforme.'
                : 'Abonnement bientôt expiré — contactez l’administrateur de la plateforme.'}
            </div>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <div>
                <div className="text-xs text-ink">Formule</div>
                <div className="text-2xl font-bold text-heading">{abo.plan || '—'}</div>
              </div>
              {abo.statut && <StatusBadge statut={abo.statut} />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Field label="Montant">{abo.montant != null ? formatMoney(abo.montant) : '—'}</Field>
              <Field label="Période">
                {(abo.date_debut || abo.date_fin)
                  ? `${abo.date_debut || '—'} → ${abo.date_fin || '—'}`
                  : '—'}
              </Field>
              <Field label="Jours restants">
                {jours != null
                  ? <span style={{ color: abo.expire ? '#b23b28' : 'var(--teal)' }}>{jours} jour(s)</span>
                  : '—'}
              </Field>
              <Field label="Statut d'expiration">
                {abo.expire ? <span style={{ color: '#b23b28' }}>Expiré</span> : <span style={{ color: 'var(--teal)' }}>Actif</span>}
              </Field>
              <Field label="Renouvellement automatique">{abo.renouvellement_auto ? 'Oui' : 'Non'}</Field>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
