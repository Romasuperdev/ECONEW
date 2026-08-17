import { useEffect } from 'react'
import { statusColors } from '../utils/format'

export function Card({ children, className = '' }) {
  return <div className={`card rounded-2xl animate-fade-up ${className}`}>{children}</div>
}

export function Badge({ value }) {
  const cls = statusColors[value] || 'bg-slate-100 text-slate-600'
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{value}</span>
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const base = 'px-4 py-2 rounded-xl font-semibold text-sm transition disabled:opacity-50 active:scale-[.98] inline-flex items-center gap-2'
  const styles = {
    primary: { background: 'var(--sidebar)', color: '#fff' },
    gold: { background: 'var(--accent)', color: 'var(--accent-ink)' },
    danger: { background: '#dc2626', color: '#fff' },
  }
  if (variant === 'ghost' || variant === 'outline') {
    return <button className={`${base} ${className}`} style={{ background: 'var(--surface-2)', color: 'var(--text)' }} {...props}>{children}</button>
  }
  return <button className={`${base} ${className}`} style={styles[variant] || styles.primary} {...props}>{children}</button>
}

export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-bold text-heading mb-1.5">{label}</span>}
      <input className={`field ${className}`} {...props} />
    </label>
  )
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-sm font-bold text-heading mb-1.5">{label}</span>}
      <select className={`field ${className}`} {...props}>{children}</select>
    </label>
  )
}

const MODAL_SIZES = {
  md: '32rem', lg: '40rem', xl: '52rem', '2xl': '64rem', '3xl': '72rem',
}

export function Modal({ open, onClose, title, children, size = 'xl', cols = 2 }) {
  // Fermeture par la touche Échap (Escape) tant que la modale est ouverte.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose?.() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,14,26,.5)', backdropFilter: 'blur(3px)' }} onClick={onClose}>
      <div className="card rounded-2xl w-full animate-fade-up" style={{ maxWidth: MODAL_SIZES[size] || MODAL_SIZES.xl, maxHeight: '94vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <h3 className="font-semibold text-lg text-heading">{title}</h3>
          <button onClick={onClose} className="text-muted hover:opacity-70 text-2xl leading-none">&times;</button>
        </div>
        <div className={cols === 2 ? 'modal-body modal-2col p-6' : 'modal-body p-6'}>{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ message = 'Aucune donnée.' }) {
  return <div className="text-center py-12 text-muted text-sm">{message}</div>
}
