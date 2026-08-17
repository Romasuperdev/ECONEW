import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ORDER = ['gestion_utilisateurs', 'parametres_etablissement', 'rapports_transversaux', 'abonnement_facturation']
const PATH = {
  gestion_utilisateurs: 'utilisateurs',
  parametres_etablissement: 'parametres',
  rapports_transversaux: 'rapports',
  abonnement_facturation: 'abonnement',
}

/**
 * Accueil de la console Admin d'établissement : redirige vers la première
 * section autorisée. Si aucun module n'est accordé, affiche un message clair.
 */
export default function AdminEtabHome() {
  const { user } = useAuth()
  const allowed = user?.is_super ? ORDER : (user?.modules_autorises || [])
  const first = ORDER.find((m) => allowed.includes(m))

  if (first) return <Navigate to={PATH[first]} replace />

  return (
    <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 30 }}>🔒</div>
      <div className="text-lg font-bold text-heading mt-2">Aucun module ne vous a été attribué</div>
      <p className="text-sm text-ink mt-1 max-w-md mx-auto">
        Votre compte administrateur d'établissement n'a pas encore de section activée.
        Demandez à votre directeur (ou au super administrateur) de vous accorder des modules
        via « Configuration → Utilisateurs → Modules ».
      </p>
    </div>
  )
}
