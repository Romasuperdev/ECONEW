// Message d'erreur lisible à partir d'une erreur axios.
export function apiError(e) {
  if (e?.response) {
    const s = e.response.status
    const m = e.response.data?.message || e.response.statusText || ''
    if (s === 403) return `Accès refusé (403) : votre rôle n'a pas la permission pour cette page.`
    if (s === 423) return `Exercice clôturé (423) : ${m}`
    if (s === 401) return `Session expirée (401) : reconnectez-vous.`
    return `Erreur ${s} : ${m}`
  }
  return `Serveur injoignable. Vérifiez que le backend Laravel est démarré (et redémarré après mise à jour).`
}
