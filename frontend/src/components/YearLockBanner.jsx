/**
 * Bandeau d'alerte affiché lorsque l'année scolaire sélectionnée est clôturée.
 * À placer au-dessus du contenu ; le greyage des saisies est géré par la classe
 * CSS `year-locked` appliquée au conteneur de contenu.
 */
export default function YearLockBanner({ level, label }) {
  if (!level) return null
  const definitive = level === 'definitive'
  return (
    <div className="mb-4 rounded-xl px-4 py-3 flex items-start gap-3"
      style={{ background: '#fef6e6', border: '1px solid #f6d68a', color: '#8a5a00' }}>
      <span style={{ fontSize: 18, lineHeight: 1 }}>🔒</span>
      <div className="text-sm">
        <b>Année scolaire « {label} » {definitive ? 'clôturée' : 'en clôture partielle'}.</b>{' '}
        {definitive
          ? "Consultation uniquement — toutes les saisies sont désactivées."
          : "Seuls les encaissements d'impayés restent autorisés ; les autres saisies sont désactivées."}
        {' '}Passez sur une année active (sélecteur « Exercice » en haut) pour effectuer des opérations.
      </div>
    </div>
  )
}
