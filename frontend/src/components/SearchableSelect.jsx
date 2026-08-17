import { useEffect, useRef, useState } from 'react'

/**
 * Liste déroulante avec recherche (Searchable Select) — réutilisable.
 * Props :
 *  - options : string[]  ou  { value, label }[]
 *  - value : valeur sélectionnée
 *  - onChange(value)
 *  - label, help, error, placeholder, required, disabled
 */
export default function SearchableSelect({
  options = [], value = '', onChange, label, help, error,
  placeholder = 'Rechercher…', required = false, disabled = false,
}) {
  const norm = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const selected = norm.find((o) => o.value === value)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const filtered = q.trim()
    ? norm.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase()))
    : norm

  const pick = (v) => { onChange?.(v); setOpen(false); setQ('') }

  return (
    <label className="block" ref={ref}>
      {label && <span className="block text-sm font-bold text-heading mb-1">{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</span>}
      <div className="relative">
        <button type="button" disabled={disabled} onClick={() => !disabled && setOpen((o) => !o)}
          className="field flex items-center justify-between w-full text-left"
          style={{ borderColor: error ? '#dc2626' : undefined, opacity: disabled ? 0.6 : 1 }}>
          <span className={selected ? 'text-ink' : 'text-muted'}>{selected ? selected.label : '— Choisir —'}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border shadow-lg animate-fade-up"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', maxHeight: 260, overflow: 'hidden' }}>
            <div className="p-2 sticky top-0" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
                className="field" style={{ padding: '.4rem .6rem' }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted text-center">Aucun résultat</div>
              ) : filtered.map((o) => (
                <button type="button" key={o.value} onClick={() => pick(o.value)}
                  className="w-full text-left px-3 py-2 text-sm transition hover:bg-black/5"
                  style={{ background: o.value === value ? 'var(--surface-2)' : 'transparent', fontWeight: o.value === value ? 700 : 400 }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {error ? <span className="block text-xs mt-1 font-medium" style={{ color: '#dc2626' }}>{error}</span>
        : help && <span className="block text-xs mt-1 text-muted">{help}</span>}
    </label>
  )
}
