import { useEffect } from 'react'
import { Input } from './ui'
import { formatMoney } from '../utils/format'

// Éditeur d'échéancier : nb versements -> nb lignes (montant + date modifiables).
export default function EcheancierEditor({ nb, lines, setLines }) {
  useEffect(() => {
    const n = Math.max(0, Number(nb || 0))
    setLines((prev) => {
      const arr = Array.isArray(prev) ? [...prev] : []
      if (n > arr.length) { for (let i = arr.length; i < n; i++) arr.push({ num: i + 1, montant: '', date: '' }) }
      else if (n < arr.length) { arr.length = n }
      return arr.map((l, i) => ({ ...l, num: i + 1 }))
    })
  }, [nb]) // eslint-disable-line

  const setLine = (i, k, v) => setLines((prev) => prev.map((l, j) => j === i ? { ...l, [k]: v } : l))
  const total = (lines || []).reduce((s, l) => s + Number(l.montant || 0), 0)

  if (!lines || lines.length === 0) return <p className="text-xs text-ink">Saisissez le nombre de versements pour générer l'échéancier.</p>

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-sm">
        <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-3 py-2 w-24">Versement</th><th>Montant</th><th>Date d'échéance</th></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-1.5 font-medium">N° {l.num}</td>
              <td><Input type="number" value={l.montant} onChange={(e) => setLine(i, 'montant', e.target.value)} /></td>
              <td><Input type="date" value={l.date || ''} onChange={(e) => setLine(i, 'date', e.target.value)} /></td>
            </tr>
          ))}
          <tr className="border-t font-semibold bg-brand-50"><td className="px-3 py-2">Total</td><td className="px-3">{formatMoney(total)}</td><td></td></tr>
        </tbody>
      </table>
    </div>
  )
}
