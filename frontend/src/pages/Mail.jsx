import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

/* ------------------------------------------------------------------ *
 *  Assistant de configuration e-mail (SMTP) — Wizard premium
 *  Étapes : 1 Informations générales · 2 Paramètres SMTP
 *           · 3 Options avancées · 4 Test & validation
 *  États : loading · erreur · succès · aucune donnée
 * ------------------------------------------------------------------ */

const BLUE = '#2563eb'
const BLUE_SOFT = '#eff4ff'
const BLUE_BORDER = '#c7d7fe'
const GREEN = '#16a34a'
const RED = '#dc2626'

// Fournisseurs + pré-remplissage automatique
const PROVIDERS = {
  'Gmail': { host: 'smtp.gmail.com', port: 587, security: 'tls' },
  'Microsoft 365': { host: 'smtp.office365.com', port: 587, security: 'starttls' },
  'Outlook': { host: 'smtp.office365.com', port: 587, security: 'starttls' },
  'Yahoo': { host: 'smtp.mail.yahoo.com', port: 465, security: 'ssl' },
  'Zoho': { host: 'smtp.zoho.com', port: 587, security: 'tls' },
  'Serveur SMTP personnalisé': null,
}

const empty = {
  enabled: true, name: '', from_name: '', from_email: '', provider: '', description: '', is_default: false,
  host: '', port: 587, security: 'tls', auth: true, username: '', password: '', timeout: 30, max_retries: 3,
  log_all: true, allow_attachments: true, encrypt: true, bcc: false, bcc_address: '',
  reply_to: false, reply_to_address: '', max_attachments: 5, max_attachment_size: 10, retry_auto: false,
}

const STEPS = [
  { key: 'general', label: 'Informations générales', hint: 'Identité de la configuration' },
  { key: 'smtp', label: 'Paramètres SMTP', hint: "Serveur d'envoi" },
  { key: 'options', label: 'Options avancées', hint: 'Comportement des e-mails' },
  { key: 'test', label: 'Test & validation', hint: 'Vérification & enregistrement' },
]

const SEC_LABEL = { tls: 'TLS', ssl: 'SSL', starttls: 'STARTTLS', none: 'Aucune' }

const I = {
  info: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
  server: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="3" width="20" height="8" rx="2" /><rect x="2" y="13" width="20" height="8" rx="2" /><path d="M6 7h.01M6 17h.01" /></svg>,
  sliders: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>,
  send: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  arrowL: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  arrowR: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  save: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17.94 17.94A10 10 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 5-6M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.16 3.19M1 1l22 22" /></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>,
}

function Field({ label, required, help, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-heading mb-1">{label} {required && <span style={{ color: RED }}>*</span>}</span>
      {children}
      {error ? <span className="block text-xs mt-1 font-medium" style={{ color: RED }}>{error}</span>
        : help && <span className="block text-xs mt-1 text-muted">{help}</span>}
    </label>
  )
}
function TextInput({ error, ...props }) {
  return <input className="field" style={error ? { borderColor: RED } : undefined} {...props} />
}
function SelectInput({ error, children, ...props }) {
  return <select className="field" style={error ? { borderColor: RED } : undefined} {...props}>{children}</select>
}
function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0" style={{ background: checked ? BLUE : '#cbd5e1' }}>
      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition shadow" style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}
function OptionRow({ checked, onChange, title, desc }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-start gap-3 rounded-xl border p-3 text-left transition"
      style={{ borderColor: checked ? BLUE_BORDER : 'var(--border)', background: checked ? BLUE_SOFT : 'var(--surface)' }}>
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border shrink-0"
        style={{ borderColor: checked ? BLUE : '#cbd5e1', background: checked ? BLUE : 'transparent', color: '#fff' }}>
        {checked && <I.check width={12} height={12} />}
      </span>
      <span><span className="block text-sm font-semibold text-heading">{title}</span>{desc && <span className="block text-xs text-muted mt-0.5">{desc}</span>}</span>
    </button>
  )
}
function Stepper({ step, maxReached, onJump }) {
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = i < step, active = i === step, clickable = i <= maxReached
        return (
          <div key={s.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none', minWidth: 0 }}>
            <button type="button" disabled={!clickable} onClick={() => clickable && onJump(i)} className="flex items-center gap-3 shrink-0 rounded-xl px-2 py-1.5 transition"
              style={{ cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.55 }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition"
                style={{ background: done ? BLUE : active ? '#fff' : 'var(--surface-2)', color: done ? '#fff' : active ? BLUE : 'var(--muted)',
                  border: active ? `2px solid ${BLUE}` : done ? 'none' : '2px solid var(--border)', boxShadow: active ? `0 0 0 4px ${BLUE_SOFT}` : 'none' }}>
                {done ? <I.check /> : i + 1}
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-sm font-bold" style={{ color: active || done ? 'var(--heading, #14223f)' : 'var(--muted)' }}>{s.label}</span>
                <span className="block text-[11px] text-muted">{s.hint}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && <span className="mx-2 h-0.5 flex-1 rounded" style={{ background: i < step ? BLUE : 'var(--border)', minWidth: 24 }} />}
          </div>
        )
      })}
    </div>
  )
}
function LockedSummary({ title, items, onEdit }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-heading"><span style={{ color: BLUE }}><I.lock /></span> {title}</div>
        <button type="button" onClick={onEdit} className="text-xs font-semibold" style={{ color: BLUE }}>Modifier</button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {items.filter((it) => it.v).map((it) => (
          <div key={it.k} className="text-xs"><span className="text-muted">{it.k} : </span><span className="font-semibold text-ink">{it.v}</span></div>
        ))}
      </div>
    </div>
  )
}

export default function Mail() {
  const [form, setForm] = useState(empty)
  const [step, setStep] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [test, setTest] = useState({ state: 'idle' })
  const [sendState, setSendState] = useState({ state: 'idle' })
  const [recipient, setRecipient] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }
  const isCustom = form.provider === 'Serveur SMTP personnalisé' || form.provider === ''

  useEffect(() => {
    setLoadError('')
    api.get('/mail-config')
      .then(({ data }) => setForm({ ...empty, ...data }))
      .catch((e) => setLoadError(apiError(e)))
      .finally(() => setLoading(false))
  }, [])

  const showToast = (type, title, msg) => { setToast({ type, title, msg }); setTimeout(() => setToast(null), 4000) }

  // Auto-configuration selon le fournisseur
  const pickProvider = (name) => {
    const preset = PROVIDERS[name]
    setForm((f) => ({ ...f, provider: name, ...(preset ? { host: preset.host, port: preset.port, security: preset.security } : {}) }))
    setErrors((e) => ({ ...e, provider: undefined, host: undefined, port: undefined }))
  }

  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Donnez un nom à cette configuration.'
      if (!form.from_name.trim()) e.from_name = "Indiquez le nom de l'expéditeur."
      if (!form.from_email.trim()) e.from_email = "L'adresse e-mail d'envoi est requise."
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.from_email.trim())) e.from_email = 'Adresse e-mail invalide.'
    }
    if (s === 1) {
      if (!form.host.trim()) e.host = 'Le serveur SMTP est requis.'
      if (!form.port) e.port = 'Le port SMTP est requis.'
      if (form.auth) {
        if (!form.username.trim()) e.username = "L'identifiant est requis."
        if (!form.password) e.password = 'Le mot de passe est requis.'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = () => { if (!validate(step)) return; const n = Math.min(step + 1, STEPS.length - 1); setStep(n); setMaxReached((m) => Math.max(m, n)) }
  const goBack = () => setStep((s) => Math.max(0, s - 1))
  const jump = (i) => { if (i <= maxReached) setStep(i) }

  const runTest = async () => {
    if (!validate(1)) return
    setTest({ state: 'testing' })
    try {
      const { data } = await api.post('/mail-config/test', form)
      setTest({ state: data.ok ? 'ok' : 'ko', title: data.title, msg: data.message })
    } catch { setTest({ state: 'ko', title: 'Test impossible', msg: "La connexion n'a pas pu être vérifiée. Réessayez." }) }
  }

  const sendTestEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.trim())) { setSendState({ state: 'ko', title: 'Adresse invalide', msg: 'Saisissez une adresse e-mail valide du destinataire.' }); return }
    setSendState({ state: 'sending' })
    try {
      const { data } = await api.post('/mail-config/send-test', { ...form, recipient })
      setSendState({ state: data.ok ? 'ok' : 'ko', title: data.title, msg: data.message })
    } catch { setSendState({ state: 'ko', title: "Échec de l'envoi", msg: "L'e-mail n'a pas pu être envoyé. Réessayez." }) }
  }

  const save = async () => {
    if (!validate(0) || !validate(1)) { setStep(!validate(0) ? 0 : 1); return }
    setSaving(true)
    try {
      const { data } = await api.put('/mail-config', form)
      setForm({ ...empty, ...data })
      showToast('ok', 'Configuration enregistrée', 'Vos paramètres e-mail ont été sauvegardés avec succès.')
    } catch (err) {
      showToast('ko', 'Enregistrement impossible', err.response?.data?.message || 'Vérifiez les champs puis réessayez.')
    } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader title="Configuration e-mail" subtitle="Assistant de paramétrage de votre serveur d'envoi (SMTP)" />

      {toast && (
        <div className="fixed right-6 top-6 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-fade-up"
          style={{ background: 'var(--surface)', borderColor: toast.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: toast.type === 'ok' ? GREEN : RED }}>{toast.type === 'ok' ? <I.check /> : <I.x />}</span>
            <div><div className="text-sm font-bold text-heading">{toast.title}</div><div className="text-xs text-muted mt-0.5">{toast.msg}</div></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin" style={{ borderColor: BLUE_SOFT, borderTopColor: BLUE }} />
          <p className="text-sm text-muted">Chargement de la configuration…</p>
        </div>
      ) : loadError ? (
        <div className="card rounded-2xl p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: RED }}><I.x /></div>
          <div className="text-sm font-bold text-heading mb-1">Impossible de charger la configuration</div>
          <p className="text-xs text-muted mb-4">{loadError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: BLUE }}>Réessayer</button>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          <div className="card rounded-2xl p-4"><Stepper step={step} maxReached={maxReached} onJump={jump} /></div>

          {step > 0 && step < STEPS.length - 1 && (
            <div className="space-y-3">
              <LockedSummary title="Informations générales" onEdit={() => jump(0)}
                items={[{ k: 'Nom', v: form.name }, { k: 'Expéditeur', v: form.from_name }, { k: 'Adresse', v: form.from_email }, { k: 'Fournisseur', v: form.provider }]} />
              {step > 1 && (
                <LockedSummary title="Paramètres SMTP" onEdit={() => jump(1)}
                  items={[{ k: 'Serveur', v: form.host }, { k: 'Port', v: String(form.port) }, { k: 'Sécurité', v: SEC_LABEL[form.security] }, { k: 'Authentification', v: form.auth ? 'Oui' : 'Non' }]} />
              )}
            </div>
          )}

          {/* ÉTAPE 1 */}
          {step === 0 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.info /></span>
                <div><h3 className="font-bold text-heading leading-tight">Informations générales</h3><p className="text-xs text-muted">Identifiez cette configuration e-mail</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de la configuration" required help='Ex : "Configuration principale"' error={errors.name}>
                  <TextInput value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Configuration principale" />
                </Field>
                <Field label="Fournisseur" help="Sélectionnez pour pré-remplir les paramètres">
                  <SelectInput value={form.provider} onChange={(e) => pickProvider(e.target.value)}>
                    <option value="">— Choisir un fournisseur —</option>
                    {Object.keys(PROVIDERS).map((p) => <option key={p} value={p}>{p}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Nom de l'expéditeur" required help='Ex : "Ecole Saint Michel"' error={errors.from_name}>
                  <TextInput value={form.from_name} error={errors.from_name} onChange={(e) => set('from_name', e.target.value)} placeholder="Ecole Saint Michel" />
                </Field>
                <Field label="Adresse e-mail d'envoi" required help='Ex : "contact@ecole.ci"' error={errors.from_email}>
                  <TextInput type="email" value={form.from_email} error={errors.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="contact@ecole.ci" />
                </Field>
                <label className="block sm:col-span-2">
                  <span className="block text-sm font-bold text-heading mb-1">Description</span>
                  <textarea className="field" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Notes internes sur l'usage de cette configuration (facultatif)" />
                  <span className="block text-xs mt-1 text-muted">Facultatif — pour repérer facilement cette configuration.</span>
                </label>
              </div>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div><div className="text-sm font-semibold text-heading">Activer cette configuration</div><div className="text-xs text-muted">Les e-mails ne partent que si elle est active.</div></div>
                  <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div><div className="text-sm font-semibold text-heading">Configuration par défaut</div><div className="text-xs text-muted">Utilisée automatiquement pour les envois.</div></div>
                  <Toggle checked={form.is_default} onChange={(v) => set('is_default', v)} />
                </div>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 */}
          {step === 1 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.server /></span>
                <div><h3 className="font-bold text-heading leading-tight">Paramètres SMTP</h3><p className="text-xs text-muted">Connectez votre serveur d'envoi</p></div>
              </div>
              {!isCustom && (
                <div className="mb-4 rounded-xl border px-3 py-2 text-xs flex items-center gap-2" style={{ background: BLUE_SOFT, borderColor: BLUE_BORDER, color: '#1e40af' }}>
                  <I.bolt /> Paramètres pré-remplis pour <b>{form.provider}</b>. Choisissez « Serveur SMTP personnalisé » à l'étape 1 pour les modifier.
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Serveur SMTP" required help="Adresse du serveur d'envoi" error={errors.host}>
                  <TextInput value={form.host} error={errors.host} disabled={!isCustom} onChange={(e) => set('host', e.target.value)} placeholder="smtp.exemple.com" />
                </Field>
                <Field label="Port SMTP" required help="587 (TLS/STARTTLS) ou 465 (SSL)" error={errors.port}>
                  <TextInput type="number" value={form.port} error={errors.port} disabled={!isCustom} onChange={(e) => set('port', Number(e.target.value))} />
                </Field>
                <Field label="Type de sécurité" help="Chiffrement de la connexion">
                  <SelectInput value={form.security} disabled={!isCustom} onChange={(e) => set('security', e.target.value)}>
                    <option value="tls">TLS</option>
                    <option value="ssl">SSL</option>
                    <option value="starttls">STARTTLS</option>
                    <option value="none">Aucune</option>
                  </SelectInput>
                </Field>
                <div className="flex items-center justify-between rounded-xl border p-3 self-end" style={{ borderColor: 'var(--border)' }}>
                  <div><div className="text-sm font-semibold text-heading">Authentification SMTP</div><div className="text-xs text-muted">Le serveur exige un identifiant.</div></div>
                  <Toggle checked={form.auth} onChange={(v) => set('auth', v)} />
                </div>
                {form.auth && (
                  <>
                    <Field label="Adresse e-mail (identifiant)" required help="Compte utilisé pour l'authentification" error={errors.username}>
                      <TextInput value={form.username} error={errors.username} onChange={(e) => set('username', e.target.value)} placeholder="contact@ecole.ci" autoComplete="off" />
                    </Field>
                    <Field label="Mot de passe" required help="Mot de passe ou clé d'application" error={errors.password}>
                      <div className="relative">
                        <TextInput type={showPwd ? 'text' : 'password'} value={form.password} error={errors.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" style={{ paddingRight: 40, ...(errors.password ? { borderColor: RED } : {}) }} />
                        <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-heading" aria-label="Afficher/masquer">{showPwd ? <I.eyeOff /> : <I.eye />}</button>
                      </div>
                    </Field>
                  </>
                )}
                <Field label="Délai d'attente (s)" help="Par défaut 30 secondes">
                  <TextInput type="number" min={1} max={300} value={form.timeout} onChange={(e) => set('timeout', Number(e.target.value))} />
                </Field>
                <Field label="Nombre maximal de tentatives" help="Renvois en cas d'échec temporaire">
                  <TextInput type="number" min={0} max={10} value={form.max_retries} onChange={(e) => set('max_retries', Number(e.target.value))} />
                </Field>
              </div>

              {test.state === 'ok' && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: GREEN }}><I.check /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#15803d' }}>{test.title}</div><div className="text-xs text-muted mt-0.5">{test.msg}</div></div>
                </div>
              )}
              {test.state === 'ko' && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: RED }}><I.x /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#b91c1c' }}>{test.title}</div><div className="text-xs text-muted mt-0.5">{test.msg}</div></div>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 */}
          {step === 2 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.sliders /></span>
                <div><h3 className="font-bold text-heading leading-tight">Options avancées</h3><p className="text-xs text-muted">Affinez le comportement des e-mails</p></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <OptionRow checked={form.log_all} onChange={(v) => set('log_all', v)} title="Journaliser tous les e-mails" desc="Conserver l'historique de chaque envoi." />
                <OptionRow checked={form.allow_attachments} onChange={(v) => set('allow_attachments', v)} title="Autoriser les pièces jointes" desc="Permettre l'ajout de fichiers aux messages." />
                <OptionRow checked={form.encrypt} onChange={(v) => set('encrypt', v)} title="Chiffrer les connexions" desc="Sécuriser l'échange avec le serveur." />
                <OptionRow checked={form.retry_auto} onChange={(v) => set('retry_auto', v)} title="Réessayer en cas d'échec" desc="Relancer automatiquement les envois échoués." />
                <OptionRow checked={form.bcc} onChange={(v) => set('bcc', v)} title="Copie cachée (BCC)" desc="Recevoir une copie discrète de chaque envoi." />
                <OptionRow checked={form.reply_to} onChange={(v) => set('reply_to', v)} title="Adresse de réponse (Reply-To)" desc="Définir une adresse de réponse différente." />
              </div>
              {(form.bcc || form.reply_to) && (
                <div className="mt-3 grid sm:grid-cols-2 gap-4">
                  {form.bcc && (
                    <Field label="Adresse en copie cachée (BCC)" help="Recevra une copie de chaque e-mail">
                      <TextInput type="email" value={form.bcc_address} onChange={(e) => set('bcc_address', e.target.value)} placeholder="archive@ecole.ci" />
                    </Field>
                  )}
                  {form.reply_to && (
                    <Field label="Adresse de réponse (Reply-To)" help="Adresse à laquelle les gens répondront">
                      <TextInput type="email" value={form.reply_to_address} onChange={(e) => set('reply_to_address', e.target.value)} placeholder="secretariat@ecole.ci" />
                    </Field>
                  )}
                </div>
              )}
              {form.allow_attachments && (
                <div className="mt-3 grid sm:grid-cols-2 gap-4">
                  <Field label="Nombre maximal de pièces jointes" help="Par e-mail">
                    <TextInput type="number" min={0} max={50} value={form.max_attachments} onChange={(e) => set('max_attachments', Number(e.target.value))} />
                  </Field>
                  <Field label="Taille maximale par pièce jointe (Mo)" help="Limite recommandée : 10 Mo">
                    <TextInput type="number" min={1} max={100} value={form.max_attachment_size} onChange={(e) => set('max_attachment_size', Number(e.target.value))} />
                  </Field>
                </div>
              )}
              <div className="mt-3">
                <OptionRow checked={form.is_default} onChange={(v) => set('is_default', v)} title="Utiliser cette configuration par défaut" desc="Configuration prioritaire pour tous les envois." />
              </div>
            </div>
          )}

          {/* ÉTAPE 4 */}
          {step === 3 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.send /></span>
                <div><h3 className="font-bold text-heading leading-tight">Test &amp; validation</h3><p className="text-xs text-muted">Envoyez un e-mail de test, puis enregistrez</p></div>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                <Field label="Adresse e-mail du destinataire" help="Un message de test y sera envoyé">
                  <TextInput type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="vous@exemple.com" />
                </Field>
                <button type="button" onClick={sendTestEmail} disabled={sendState.state === 'sending'}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition disabled:opacity-60 mb-[2px]" style={{ background: BLUE }}>
                  {sendState.state === 'sending' ? <><span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: BLUE_SOFT, borderTopColor: '#fff' }} /> Envoi…</> : <><I.send width={16} height={16} /> Envoyer un e-mail de test</>}
                </button>
              </div>

              {sendState.state === 'ok' && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: GREEN }}><I.check /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#15803d' }}>{sendState.title}</div><div className="text-xs text-muted mt-0.5">{sendState.msg}</div></div>
                </div>
              )}
              {sendState.state === 'ko' && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: RED }}><I.x /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#b91c1c' }}>{sendState.title}</div><div className="text-xs text-muted mt-0.5">{sendState.msg}</div></div>
                </div>
              )}

              {/* Résumé */}
              <div className="mt-5 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="px-4 py-2.5 text-sm font-bold text-heading" style={{ background: 'var(--surface-2)' }}>Résumé de la configuration</div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-sm">
                  {[
                    ['Configuration', form.name || '—'],
                    ['Serveur SMTP', form.host || '—'],
                    ['Port', String(form.port || '—')],
                    ['Sécurité', SEC_LABEL[form.security]],
                    ['Authentification', form.auth ? 'Activée' : 'Désactivée'],
                    ['Statut', form.enabled ? 'Active' : 'Inactive'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                      <span className="text-muted">{k}</span><span className="font-semibold text-ink text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* BARRE D'ACTIONS */}
          <div className="card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={goBack} disabled={step === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition disabled:opacity-40" style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              <I.arrowL /> Retour
            </button>
            <div className="flex flex-wrap items-center gap-3">
              {step === 1 && (
                <button type="button" onClick={runTest} disabled={test.state === 'testing'}
                  className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition disabled:opacity-60" style={{ background: '#fff', color: BLUE, border: `1.5px solid ${BLUE}` }}>
                  {test.state === 'testing' ? <><span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: BLUE_SOFT, borderTopColor: BLUE }} /> Test en cours…</> : <><I.bolt /> Tester la connexion</>}
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className="px-5 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition active:scale-[.98]" style={{ background: BLUE }}>
                  Suivant <I.arrowR />
                </button>
              ) : (
                <button type="button" onClick={save} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition active:scale-[.98] disabled:opacity-60" style={{ background: GREEN }}>
                  {saving ? <><span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: '#dcfce7', borderTopColor: '#fff' }} /> Enregistrement…</> : <><I.save /> Enregistrer</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
