import { Outlet } from 'react-router-dom'

// La navigation Configuration se fait via la liste déroulante du menu latéral.
// Ce layout se contente d'afficher la sous-page sélectionnée.
export default function ConfigLayout() {
  return <Outlet />
}
