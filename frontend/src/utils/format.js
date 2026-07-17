export const formatMoney = (value, currency = 'XOF') => {
  const n = Number(value || 0)
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency, maximumFractionDigits: 0,
  }).format(n)
}

export const formatDate = (value) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

export const statusColors = {
  impayee: 'bg-red-100 text-red-700',
  partielle: 'bg-amber-100 text-amber-700',
  payee: 'bg-green-100 text-green-700',
  annulee: 'bg-slate-200 text-slate-600',
  actif: 'bg-green-100 text-green-700',
  inactif: 'bg-slate-200 text-slate-600',
  validee: 'bg-green-100 text-green-700',
  en_attente: 'bg-amber-100 text-amber-700',
  rejetee: 'bg-red-100 text-red-700',
}
