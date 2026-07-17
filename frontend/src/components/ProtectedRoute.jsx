import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * Garde de route.
 * - superAdmin=true  : reserve au Super Administrateur (indicateur reel is_super).
 * - superAdmin=false : espace etablissement, accessible a tous les comptes,
 *   y compris le Super Admin (qui peut y choisir un role via le selecteur).
 */
export default function ProtectedRoute({ children, superAdmin = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink">Chargement…</div>
  }
  if (!user) return <Navigate to="/login" replace />

  const isSuper = !!user.is_super
  if (superAdmin && !isSuper) return <Navigate to="/" replace />

  return children
}
