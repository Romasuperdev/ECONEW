import { useEffect, useState } from 'react'
import api from '../api/client'

/**
 * Détermine si l'année scolaire actuellement sélectionnée est clôturée.
 * Renvoie { locked, level ('definitive'|'partielle'|null), label }.
 * Les saisies doivent être désactivées lorsque locked === true.
 */
export function useYearLock() {
  const [state, setState] = useState({ locked: false, level: null, label: '' })

  useEffect(() => {
    let alive = true
    api.get('/academic-years')
      .then(({ data }) => {
        if (!alive) return
        const list = Array.isArray(data) ? data : (data?.data || [])
        const cur = localStorage.getItem('annee')
        const y = list.find((x) => String(x.code ?? x.id) === String(cur)) || list.find((x) => x.is_current)
        if (y && (y.cloture_definitive || y.cloture_partielle)) {
          setState({
            locked: !!y.cloture_definitive || !!y.cloture_partielle,
            level: y.cloture_definitive ? 'definitive' : 'partielle',
            label: y.name || y.label || y.code || '',
          })
        } else {
          setState({ locked: false, level: null, label: '' })
        }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  return state
}
