import { useState, useEffect } from 'react'

const KEY = 'sidebar-collapsed'

// Sidebar réduite (icônes seules) sur grand écran — préférence mémorisée.
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(KEY) === '1' } catch { return false }
  })
  useEffect(() => {
    try { localStorage.setItem(KEY, collapsed ? '1' : '0') } catch { /* stockage indisponible */ }
  }, [collapsed])
  return [collapsed, setCollapsed]
}
