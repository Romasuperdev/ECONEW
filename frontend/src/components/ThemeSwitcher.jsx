import { useTheme } from '../context/ThemeContext'
import Icon from './Icon'

const OPTIONS = [
  { key: 'light', label: 'Clair', icon: 'sun' },
  { key: 'dark', label: 'Sombre', icon: 'moon' },
  { key: 'sunny', label: 'Ensoleillé', icon: 'sunny' },
]

export default function ThemeSwitcher({ compact = false }) {
  const { theme, setTheme } = useTheme()
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-2)' }}>
      {OPTIONS.map((o) => (
        <button key={o.key} type="button" onClick={() => setTheme(o.key)} title={o.label}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
          style={theme === o.key
            ? { background: 'var(--accent)', color: 'var(--accent-ink)' }
            : { color: 'var(--muted)' }}>
          <Icon name={o.icon} size={15} />{!compact && o.label}
        </button>
      ))}
    </div>
  )
}
