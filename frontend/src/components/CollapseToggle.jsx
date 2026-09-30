import Icon from './Icon'

// Bouton de réduction / dépliage de la sidebar (grand écran uniquement).
export default function CollapseToggle({ collapsed, onToggle }) {
  const label = collapsed ? 'Déplier le menu' : 'Réduire le menu'
  return (
    <button onClick={onToggle} aria-label={label} title={label}
      className={`hidden lg:flex p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 ${collapsed ? '' : 'ml-auto'}`}>
      <span className="flex" style={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>
        <Icon name="collapse" size={18} />
      </span>
    </button>
  )
}
