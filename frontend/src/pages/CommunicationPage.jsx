import { useEffect, useMemo, useRef, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

const AUDIENCES = [
  { key: 'niveau', label: 'Niveau' },
  { key: 'classe', label: 'Classe' },
  { key: 'eleve', label: 'Élève' },
]

export default function CommunicationPage() {
  const [channel, setChannel] = useState('sms')      // 'sms' | 'mail'
  const [cible, setCible] = useState('niveau')        // audience type
  const [ids, setIds] = useState([])                  // selected codes/matricules

  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [loadError, setLoadError] = useState('')

  const [objet, setObjet] = useState('')
  const [message, setMessage] = useState('')

  const [apercu, setApercu] = useState(null)          // { total, avec_telephone, avec_email, apercu:[] }
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Chargement des référentiels
  useEffect(() => {
    setLoadError('')
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch((e) => setLoadError(apiError(e)))
    api.get('/school-classes').then(({ data }) => setClasses(data.data || data)).catch(() => setClasses([]))
    api.get('/students', { params: { per_page: 2000 } }).then(({ data }) => setStudents(data.data || data)).catch(() => setStudents([]))
  }, [])

  // Réinitialise la sélection quand l'audience change
  const changeCible = (k) => { setCible(k); setIds([]); setApercu(null); setResult(null) }
  const toggleId = (id) => setIds((arr) => arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])

  // Aperçu des destinataires (debounce)
  const timer = useRef(null)
  useEffect(() => {
    setResult(null)
    if (timer.current) clearTimeout(timer.current)
    if (!ids.length) { setApercu(null); return }
    setPreviewLoading(true)
    timer.current = setTimeout(() => {
      api.get('/communication/destinataires', { params: { cible, ids } })
        .then(({ data }) => setApercu(data))
        .catch(() => setApercu(null))
        .finally(() => setPreviewLoading(false))
    }, 450)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [cible, ids])

  const canSend = useMemo(() => {
    if (sending || !ids.length || !apercu) return false
    if (!message.trim()) return false
    if (channel === 'mail' && !objet.trim()) return false
    return true
  }, [sending, ids, apercu, message, objet, channel])

  const send = async () => {
    setError(''); setResult(null); setSending(true)
    try {
      if (channel === 'sms') {
        const { data } = await api.post('/communication/sms', { message, cible, ids })
        setResult({ channel: 'sms', ...data })
      } else {
        const { data } = await api.post('/communication/mail', { objet, message, cible, ids })
        setResult({ channel: 'mail', ...data })
      }
    } catch (e) {
      setError(apiError(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <PageHeader title="Communication — SMS & E-mail" subtitle="Message groupé aux tuteurs des élèves" />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      {/* Canal */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[{ key: 'sms', label: '📱 SMS' }, { key: 'mail', label: '✉️ E-mail' }].map((c) => (
          <button key={c.key} onClick={() => { setChannel(c.key); setResult(null) }} className="px-5 py-2 rounded-full text-sm font-semibold transition"
            style={channel === c.key ? { background: 'var(--teal)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audience + cible */}
        <Card className="p-4">
          <div className="text-xs font-bold text-heading mb-2">Destinataires</div>
          <div className="flex flex-wrap gap-2 mb-3">
            {AUDIENCES.map((a) => (
              <button key={a.key} onClick={() => changeCible(a.key)} className="px-4 py-1.5 rounded-full text-sm font-semibold transition"
                style={cible === a.key ? { background: 'var(--teal)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {a.label}
              </button>
            ))}
          </div>

          {cible === 'niveau' && <CheckList items={levels.map((l) => ({ id: String(l.code), label: l.name }))} selected={ids} toggle={toggleId} empty="Aucun niveau." />}
          {cible === 'classe' && <CheckList items={classes.map((c) => ({ id: String(c.code), label: c.name }))} selected={ids} toggle={toggleId} empty="Aucune classe." />}
          {cible === 'eleve' && <ElevePicker students={students} selected={ids} toggle={toggleId} clear={() => setIds([])} />}
        </Card>

        {/* Espace message */}
        <Card className="p-4">
          <div className="text-xs font-bold text-heading mb-2">Espace message</div>
          {channel === 'mail' && (
            <div className="mb-3">
              <Input label="Objet" value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Objet de l'e-mail" maxLength={200} />
            </div>
          )}
          <label className="block">
            <span className="text-xs font-bold text-heading">Message</span>
            <textarea className="field w-full mt-1" rows={channel === 'mail' ? 8 : 6} maxLength={channel === 'sms' ? 480 : undefined}
              value={message} onChange={(e) => setMessage(e.target.value)} placeholder={channel === 'sms' ? 'Votre SMS (160 caractères = 1 SMS)…' : 'Votre message…'} />
          </label>
          {channel === 'sms' && (
            <div className="text-xs text-ink mt-1 text-right">{message.length}/480 caractères · {Math.max(1, Math.ceil((message.length || 1) / 160))} SMS</div>
          )}
        </Card>
      </div>

      {/* Aperçu destinataires */}
      <Card className="p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-heading">Aperçu des destinataires</div>
          {ids.length > 0 && <span className="text-xs text-ink">{ids.length} sélection(s)</span>}
        </div>
        {!ids.length ? (
          <div className="text-sm text-ink">Sélectionnez au moins un {cible} pour prévisualiser.</div>
        ) : previewLoading ? (
          <div className="text-sm text-ink">Calcul des destinataires…</div>
        ) : apercu ? (
          <>
            <div className="text-sm mb-2">
              <strong>{apercu.total}</strong> destinataire(s) · <strong>{apercu.avec_telephone}</strong> avec téléphone · <strong>{apercu.avec_email}</strong> avec e-mail
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border" style={{ borderColor: 'var(--border)' }}>
              {apercu.apercu?.length ? apercu.apercu.map((r) => (
                <div key={r.matricule} className="flex items-center justify-between px-3 py-1.5 text-sm border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <span className="truncate">{r.nom} <span className="font-mono text-xs text-ink">({r.matricule})</span></span>
                  <span className="text-xs text-ink whitespace-nowrap ml-2">{channel === 'sms' ? (r.telephone || '— pas de n°') : (r.email || '— pas d\'e-mail')}</span>
                </div>
              )) : <div className="text-sm text-ink px-3 py-2">Aucun destinataire.</div>}
            </div>
          </>
        ) : (
          <div className="text-sm text-ink">Aperçu indisponible.</div>
        )}
      </Card>

      {/* Résultat / erreur */}
      {error && <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {result && (
        <div className="mt-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
          <div className="font-semibold mb-1">{result.message}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Envoyés : <strong>{result.envoyes}</strong></span>
            <span>{result.channel === 'sms' ? 'Sans numéro' : 'Sans e-mail'} : <strong>{result.channel === 'sms' ? result.sans_numero : result.sans_email}</strong></span>
            <span>Échecs : <strong>{result.echecs}</strong></span>
            {result.channel === 'sms' && !result.configure && <span style={{ color: '#b45309' }}>Passerelle SMS non configurée</span>}
          </div>
        </div>
      )}

      {/* Envoi */}
      <div className="mt-4 flex justify-end">
        <Button onClick={send} disabled={!canSend}>
          {sending ? 'Envoi en cours…' : channel === 'sms' ? '📱 Envoyer le SMS' : '✉️ Envoyer l\'e-mail'}
        </Button>
      </div>
    </>
  )
}

/* Liste à cases à cocher (niveaux / classes) */
function CheckList({ items, selected, toggle, empty }) {
  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border p-2 grid grid-cols-1 md:grid-cols-2 gap-1" style={{ borderColor: 'var(--border)' }}>
      {items.length ? items.map((it) => {
        const on = selected.includes(it.id)
        return (
          <label key={it.id} className="flex items-center gap-2 text-sm px-2 py-1 rounded cursor-pointer" style={{ background: on ? 'var(--surface-2)' : 'transparent' }}>
            <input type="checkbox" checked={on} onChange={() => toggle(it.id)} />
            <span className="truncate">{it.label}</span>
          </label>
        )
      }) : <div className="text-xs text-ink px-2 py-1">{empty}</div>}
    </div>
  )
}

/* Sélecteur multi-élèves avec recherche (mirroir de PointCaisseDetaillePage) */
function ElevePicker({ students, selected, toggle, clear }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = s ? students.filter((x) => `${x.full_name || ''} ${x.first_name || ''} ${x.last_name || ''} ${x.matricule || ''}`.toLowerCase().includes(s)) : students
    return base.slice(0, 40)
  }, [students, q])
  return (
    <div className="rounded-xl border" style={{ borderColor: 'var(--border)' }}>
      <div className="p-2 flex gap-2 items-center">
        <input className="field flex-1" placeholder="Rechercher un élève (nom ou matricule)…" value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.length > 0 && <button className="text-xs text-red-600 hover:underline" onClick={clear}>Tout retirer</button>}
      </div>
      <div className="max-h-48 overflow-y-auto px-2 pb-2 grid grid-cols-1 md:grid-cols-2 gap-1">
        {list.map((s) => {
          const on = selected.includes(String(s.matricule))
          return (
            <label key={s.matricule} className="flex items-center gap-2 text-sm px-2 py-1 rounded cursor-pointer" style={{ background: on ? 'var(--surface-2)' : 'transparent' }}>
              <input type="checkbox" checked={on} onChange={() => toggle(String(s.matricule))} />
              <span className="truncate">{s.full_name || `${s.first_name} ${s.last_name}`} <span className="font-mono text-xs text-ink">({s.matricule})</span></span>
            </label>
          )
        })}
        {list.length === 0 && <div className="text-xs text-ink px-2 py-1">Aucun élève.</div>}
      </div>
    </div>
  )
}
