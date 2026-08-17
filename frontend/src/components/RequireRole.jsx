import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Garde de rôle. `role` peut être une chaîne ou un tableau de rôles.
 * Le Super Admin (is_super) passe toujours.
 */
export default function RequireRole({ role, children }) {
  const { user, loading } = useAuth()

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-ink">Chargement…</div>
  }

  const roles = Array.isArray(role) ? role : [role]
  const ok = user.is_super || roles.includes(user.role)
  if (!ok) return <Navigate to="/" replace />

  return children
}
