import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { Card, Select, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { formatMoney, formatDate } from '../utils/format'

const typeLabels = { caisse: 'Caisse', banque: 'Banque', mobile_money: 'Mobile Money', autre: 'Autre' }

export default function Treasury() {
  const [accounts, setAccounts] = useState([])
  const [txns, setTxns] = useState([])
  const [overview, setOverview] = useState(null)
  const [selected, setSelected] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(true)

  const loadAccounts = () => api.get('/cash-accounts').then(({ data }) => setAccounts(data))
  const loadTxns = () => api.get('/cash-transactions', {
    params: { cash_account_id: selected || undefined, type: type || undefined, per_page: 100 },
  }).then(({ data }) => setTxns(data.data || data))
  const loadOverview = () => api.get('/treasury-overview').then(({ data }) => setOverview(data)).catch(() => setOverview(null))

  useEffect(() => { Promise.all([loadAccounts(), loadTxns(), loadOverview()]).finally(() => setLoading(false)) }, [])
  useEffect(() => { loadTxns() }, [selected, type])

  const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0)
  const nameByCode = useMemo(() => {
    const m = {}
    accounts.forEach((a) => { m[String(a.code ?? a.id)] = a.name })
    return m
  }, [accounts])

  const Kpi = ({ icon, label, value, tone }) => (
    <Card className="p-5 flex items-center gap-4">
      <div className="rounded-xl flex items-center justify-center" style={{ width: 44, height: 44, background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}>
        <Icon name={icon} size={20} />
      </div>
      <div className="min-w-0"><div className="text-sm text-muted truncate">{label}</div><div className="text-xl font-bold text-heading truncate">{value}</div></div>
    </Card>
  )

  return (
    <>
      <PageHeader title="Trésorerie" subtitle={overview?.etablissement ? `Établissement ${overview.etablissement}` : 'Caisses et mouvements'} />

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Kpi icon="payments" tone="var(--teal)" label="Total encaissé (établissement)" value={formatMoney(overview.total_encaisse)} />
          <Kpi icon="treasury" tone="var(--sidebar)" label="Solde des caisses" value={formatMoney(overview.total_solde)} />
          <Kpi icon="building" tone="var(--accent)" label="Nombre de caisses" value={overview.nb_caisses} />
        </div>
      )}

      {overview && (
        <Card className="overflow-hidden mb-6">
          <div className="px-4 py-3 border-b font-semibold text-sm">Caissiers rattachés à l'établissement ({overview.caissiers?.length || 0})</div>
          {(!overview.caissiers || overview.caissiers.length === 0) ? <EmptyState message="Aucun caissier rattaché à cet établissement." /> : (
            <table className="w-full text-sm">
              <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Nom</th><th>Login</th><th>Email</th><th>Statut</th></tr></thead>
              <tbody>
                {overview.caissiers.map((c) => (
                  <tr key={c.id} className="border-t hover:bg-brand-50">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="font-mono text-xs">{c.login}</td>
                    <td className="text-ink">{c.email || '—'}</td>
                    <td>{c.active ? <Badge value="actif" /> : <Badge value="inactif" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {accounts.map((a) => (
          <Card key={a.id} className={`p-5 cursor-pointer transition ${String(selected) === String(a.code ?? a.id) ? 'ring-2 ring-gold-500' : ''}`}
            onClick={() => setSelected(String(selected) === String(a.code ?? a.id) ? '' : String(a.code ?? a.id))}>
            <div className="flex justify-between items-start">
              <div className="text-sm text-ink">{typeLabels[a.type] || a.type}</div>
              {!a.is_active && <Badge value="inactif" />}
            </div>
            <div className="font-semibold text-brand-800">{a.name}</div>
            <div className="text-2xl font-bold text-turquoise-600 mt-1">{formatMoney(a.balance, a.currency)}</div>
            {a.code && <div className="text-xs text-ink mt-1">Code : {a.code}</div>}
          </Card>
        ))}
        {accounts.length === 0 && !loading && <EmptyState message="Aucune caisse pour cette société / cet exercice." />}
      </div>

      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
          <div className="font-semibold text-sm">
            Mouvements {selected ? `· ${nameByCode[String(selected)] || selected}` : '(toutes caisses)'}
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Tous types</option>
            <option value="entree">Entrées</option>
            <option value="sortie">Sorties</option>
          </Select>
        </div>
        {loading ? <EmptyState message="Chargement…" /> : txns.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr><th className="px-4 py-2">Date</th><th>Caisse</th><th>Libellé</th><th>Référence</th><th>Type</th><th className="text-right px-4">Montant</th></tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={t.id ?? i} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2">{formatDate(t.transaction_date)}</td>
                  <td>{nameByCode[String(t.cash_account_id)] || t.cash_account_id}</td>
                  <td>{t.label}</td>
                  <td className="text-ink">{t.reference}</td>
                  <td><span className={t.type === 'entree' ? 'text-turquoise-600' : 'text-red-600'}>{t.type === 'entree' ? '↑ Entrée' : '↓ Sortie'}</span></td>
                  <td className={`text-right px-4 font-medium ${t.type === 'entree' ? 'text-turquoise-600' : 'text-red-600'}`}>
                    {t.type === 'entree' ? '+' : '-'}{formatMoney(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <p className="text-xs text-ink mt-4">
        Chiffres et caissiers de l'établissement sélectionné en haut. La saisie des mouvements se fait dans l'application ECONOMAT ; cette vue est en lecture.
      </p>
    </>
  )
}
