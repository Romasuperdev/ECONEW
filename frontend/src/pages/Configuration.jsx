import { Link } from 'react-router-dom'
import { Card } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAuth } from '../context/AuthContext'

export default function Configuration() {
  const { can } = useAuth()
  const cards = [
    { to: '/configuration/annees', icon: 'calendar', label: 'Années scolaires', desc: 'Créer, activer, clôturer un exercice', show: can('config.manage') },
    { to: '/configuration/cycles', icon: 'structure', label: 'Cycles', desc: 'Cycles de l\'établissement', show: can('config.manage') },
    { to: '/configuration/niveaux', icon: 'structure', label: 'Niveaux', desc: 'Niveaux par cycle', show: can('config.manage') },
    { to: '/configuration/classes', icon: 'students', label: 'Classes', desc: 'Classes et sections', show: can('config.manage') },
    { to: '/configuration/affectation', icon: 'link', label: 'Affectation Niveau ↔ Classe', desc: 'Rattacher chaque classe à son niveau', show: can('config.manage') },
    { to: '/configuration/grille-scolarite', icon: 'invoices', label: 'Grille scolarité', desc: 'Frais d\'inscription et de scolarité', show: can('config.manage') },
    { to: '/configuration/caisses', icon: 'treasury', label: 'Caisses', desc: 'Caisses de l\'établissement', show: can('treasury.view') },
    { to: '/configuration/sms', icon: 'message', label: 'SMS', desc: 'Historique et envoi de SMS', show: can('config.manage') },
    { to: '/configuration/mail', icon: 'mail', label: 'Mail', desc: 'Configuration SMTP de diffusion', show: can('config.manage') },
    { to: '/configuration/utilisateurs', icon: 'students', label: 'Utilisateurs & rôles', desc: 'Comptes de l\'établissement et permissions', show: can('users.manage') },
  ].filter((c) => c.show)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.to} to={c.to}>
            <Card className="p-5 h-full hover:-translate-y-0.5 transition cursor-pointer">
              <div className="rounded-xl flex items-center justify-center mb-3" style={{ width: 46, height: 46, background: 'color-mix(in srgb, var(--teal) 14%, transparent)', color: 'var(--teal)' }}>
                <Icon name={c.icon} size={22} />
              </div>
              <div className="font-semibold text-heading">{c.label}</div>
              <div className="text-muted text-sm mt-1">{c.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
      {cards.length === 0 && <p className="text-muted mt-6">Vous n'avez pas accès aux options de configuration.</p>}
    </>
  )
}