import { useAuth } from '../context/AuthContext'

/**
 * Garde de module pour l'espace Admin d'établissement.
 * Rend les enfants si le compte est super admin, ou si le module demandé
 * figure dans user.modules_autorises. Sinon affiche un message (pas de
 * redirection : évite les boucles quand aucun module n'est accordé).
 */
export default function RequireModule({ module, children }) {
  const { user } = useAuth()
  const ok = user?.is_super || (user?.modules_autorises || []).includes(module)
  if (!ok) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="text-lg font-bold text-heading mb-1">Accès non autorisé</div>
        <p className="text-sm text-ink">Ce module ne vous a pas été attribué. Contactez l'administrateur de votre établissement.</p>
      </div>
    )
  }
  return children
}
