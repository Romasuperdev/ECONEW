import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

/* ------------------------------------------------------------------ *
 *  Assistant de configuration SMS (Wizard premium, réutilisable)
 *  Étapes : 1 Informations générales · 2 Paramètres API · 3 Options
 *  États gérés : loading · erreur · succès · aucune donnée
 * ------------------------------------------------------------------ */

const BLUE = '#2563eb'
const BLUE_DARK = '#1d4ed8'
const BLUE_SOFT = '#eff4ff'
const BLUE_BORDER = '#c7d7fe'
const GREEN = '#16a34a'
const RED = '#dc2626'

const PROVIDERS = ['Orange SMS', 'MTN SMS', 'Moov SMS', 'Twilio', 'Vonage (Nexmo)', 'Infobip', 'Africa\'s Talking', 'Autre']
const COUNTRIES = ['Côte d\'Ivoire', 'Sénégal', 'Mali', 'Burkina Faso', 'Bénin', 'Togo', 'Guinée', 'Cameroun', 'France', 'Autre']
const TIMEZONES = ['Africa/Abidjan', 'Africa/Dakar', 'Africa/Bamako', 'Africa/Ouagadougou', 'Africa/Lome', 'Africa/Douala', 'Europe/Paris', 'UTC']

const empty = {
  enabled: true, name: '', provider: '', description: '', country: 'Côte d\'Ivoire',
  timezone: 'Africa/Abidjan', environment: 'test', is_default: false,
  api_url: '', login: '', password: '', api_key: '', secret_key: '', sender_id: '',
  timeout: 30, encoding: 'GSM7', api_version: 'v1',
  delivery_reports: false, unicode: false, long_sms: false, split_auto: false,
  retry: false, log_all: true, campaigns: false,
}

const STEPS = [
  { key: 'general', label: 'Informations générales', hint: 'Identité de la configuration' },
  { key: 'api', label: 'Paramètres API', hint: 'Connexion à la passerelle' },
  { key: 'options', label: 'Options', hint: 'Comportement des envois' },
  { key: 'done', label: 'Terminé', hint: 'Vérification & enregistrement' },
]

/* ---------- Petites icônes SVG ---------- */
const I = {
  info: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>,
  plug: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4" /></svg>,
  sliders: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
  arrowL: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  arrowR: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  save: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8M7 3v5h8" /></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>,
}

/* ---------- Champ générique avec aide + erreur ---------- */
function Field({ label, required, help, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-bold text-heading mb-1">
        {label} {required && <span style={{ color: RED }}>*</span>}
      </span>
      {children}
      {error
        ? <span className="block text-xs mt-1 font-medium" style={{ color: RED }}>{error}</span>
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

/* ---------- Interrupteur ---------- */
function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0"
      style={{ background: checked ? BLUE : '#cbd5e1' }}>
      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition shadow"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}

/* ---------- Ligne d'option (case à cocher premium) ---------- */
function OptionRow({ checked, onChange, title, desc }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 rounded-xl border p-3 text-left transition"
      style={{ borderColor: checked ? BLUE_BORDER : 'var(--border)', background: checked ? BLUE_SOFT : 'var(--surface)' }}>
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-md border shrink-0"
        style={{ borderColor: checked ? BLUE : '#cbd5e1', background: checked ? BLUE : 'transparent', color: '#fff' }}>
        {checked && <I.check width={12} height={12} />}
      </span>
      <span>
        <span className="block text-sm font-semibold text-heading">{title}</span>
        {desc && <span className="block text-xs text-muted mt-0.5">{desc}</span>}
      </span>
    </button>
  )
}

/* ---------- Stepper horizontal ---------- */
function Stepper({ step, maxReached, onJump }) {
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STEPS.map((s, i) => {
        const done = i < step
        const active = i === step
        const clickable = i <= maxReached
        return (
          <div key={s.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none', minWidth: 0 }}>
            <button type="button" disabled={!clickable} onClick={() => clickable && onJump(i)}
              className="flex items-center gap-3 shrink-0 rounded-xl px-2 py-1.5 transition"
              style={{ cursor: clickable ? 'pointer' : 'default', opacity: clickable ? 1 : 0.55 }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition"
                style={{
                  background: done ? BLUE : active ? '#fff' : 'var(--surface-2)',
                  color: done ? '#fff' : active ? BLUE : 'var(--muted)',
                  border: active ? `2px solid ${BLUE}` : done ? 'none' : '2px solid var(--border)',
                  boxShadow: active ? `0 0 0 4px ${BLUE_SOFT}` : 'none',
                }}>
                {done ? <I.check /> : (i === STEPS.length - 1 ? <I.check /> : i + 1)}
              </span>
              <span className="hidden sm:block leading-tight">
                <span className="block text-sm font-bold" style={{ color: active || done ? 'var(--heading, #14223f)' : 'var(--muted)' }}>{s.label}</span>
                <span className="block text-[11px] text-muted">{s.hint}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="mx-2 h-0.5 flex-1 rounded" style={{ background: i < step ? BLUE : 'var(--border)', minWidth: 24 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ---------- Carte récapitulative verrouillée (étapes précédentes) ---------- */
function LockedSummary({ title, items, onEdit }) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-bold text-heading">
          <span style={{ color: BLUE }}><I.lock /></span> {title}
        </div>
        <button type="button" onClick={onEdit} className="text-xs font-semibold" style={{ color: BLUE }}>Modifier</button>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {items.filter((it) => it.v).map((it) => (
          <div key={it.k} className="text-xs">
            <span className="text-muted">{it.k} : </span>
            <span className="font-semibold text-ink">{it.v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sms() {
  const [form, setForm] = useState(empty)
  const [step, setStep] = useState(0)
  const [maxReached, setMaxReached] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null) // {type,title,msg}
  const [test, setTest] = useState({ state: 'idle' }) // idle|testing|ok|ko

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  useEffect(() => {
    setLoadError('')
    api.get('/sms-config')
      .then(({ data }) => setForm({ ...empty, ...data }))
      .catch((e) => setLoadError(apiError(e)))
      .finally(() => setLoading(false))
  }, [])

  const showToast = (type, title, msg) => {
    setToast({ type, title, msg })
    setTimeout(() => setToast(null), 4000)
  }

  /* ----- Validation par étape ----- */
  const validate = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Donnez un nom à cette configuration.'
      if (!form.provider) e.provider = 'Choisissez votre fournisseur SMS.'
    }
    if (s === 1) {
      if (!form.api_url.trim()) e.api_url = "L'URL de l'API est requise."
      else if (!/^https?:\/\//i.test(form.api_url.trim())) e.api_url = "L'URL doit commencer par http:// ou https://."
      if (!form.sender_id.trim()) e.sender_id = "Indiquez le nom de l'expéditeur (Sender ID)."
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const goNext = () => {
    if (!validate(step)) return
    const n = Math.min(step + 1, STEPS.length - 1)
    setStep(n); setMaxReached((m) => Math.max(m, n))
  }
  const goBack = () => setStep((s) => Math.max(0, s - 1))
  const jump = (i) => { if (i <= maxReached) setStep(i) }

  const runTest = async () => {
    if (!validate(1)) return
    setTest({ state: 'testing' })
    try {
      const { data } = await api.post('/sms-config/test', form)
      setTest({ state: data.ok ? 'ok' : 'ko', title: data.title, msg: data.message })
    } catch (err) {
      setTest({ state: 'ko', title: 'Test impossible', msg: "La connexion n'a pas pu être vérifiée. Réessayez dans un instant." })
    }
  }

  const save = async () => {
    if (!validate(0) || !validate(1)) { setStep(0); return }
    setSaving(true)
    try {
      const { data } = await api.put('/sms-config', form)
      setForm({ ...empty, ...data })
      showToast('ok', 'Configuration enregistrée', 'Vos paramètres SMS ont été sauvegardés avec succès.')
      setStep(STEPS.length - 1)
    } catch (err) {
      showToast('ko', 'Enregistrement impossible', err.response?.data?.message || 'Vérifiez les champs puis réessayez.')
    } finally { setSaving(false) }
  }

  /* ================= RENDU ================= */
  return (
    <>
      <PageHeader title="Configuration SMS" subtitle="Assistant de paramétrage de votre passerelle d'envoi de SMS" />

      {/* Toast global */}
      {toast && (
        <div className="fixed right-6 top-6 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg animate-fade-up"
          style={{ background: 'var(--surface)', borderColor: toast.type === 'ok' ? '#bbf7d0' : '#fecaca' }}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0"
              style={{ background: toast.type === 'ok' ? GREEN : RED }}>
              {toast.type === 'ok' ? <I.check /> : <I.x />}
            </span>
            <div>
              <div className="text-sm font-bold text-heading">{toast.title}</div>
              <div className="text-xs text-muted mt-0.5">{toast.msg}</div>
            </div>
          </div>
        </div>
      )}

      {/* État : chargement */}
      {loading ? (
        <div className="card rounded-2xl p-10 text-center">
          <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 animate-spin"
            style={{ borderColor: BLUE_SOFT, borderTopColor: BLUE }} />
          <p className="text-sm text-muted">Chargement de la configuration…</p>
        </div>
      ) : loadError ? (
        /* État : erreur de chargement */
        <div className="card rounded-2xl p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: RED }}><I.x /></div>
          <div className="text-sm font-bold text-heading mb-1">Impossible de charger la configuration</div>
          <p className="text-xs text-muted mb-4">{loadError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: BLUE }}>Réessayer</button>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {/* Barre de progression */}
          <div className="card rounded-2xl p-4">
            <Stepper step={step} maxReached={maxReached} onJump={jump} />
          </div>

          {/* Récapitulatifs verrouillés des étapes déjà validées */}
          {step > 0 && step < STEPS.length - 1 && (
            <div className="space-y-3">
              {step > 0 && (
                <LockedSummary title="Informations générales" onEdit={() => jump(0)}
                  items={[
                    { k: 'Nom', v: form.name },
                    { k: 'Fournisseur', v: form.provider },
                    { k: 'Pays', v: form.country },
                    { k: 'Environnement', v: form.environment === 'production' ? 'Production' : 'Test' },
                  ]} />
              )}
              {step > 1 && (
                <LockedSummary title="Paramètres API" onEdit={() => jump(1)}
                  items={[
                    { k: 'URL API', v: form.api_url },
                    { k: 'Sender ID', v: form.sender_id },
                    { k: 'Version', v: form.api_version },
                  ]} />
              )}
            </div>
          )}

          {/* ---------- ÉTAPE 1 : INFORMATIONS GÉNÉRALES ---------- */}
          {step === 0 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.info /></span>
                <div>
                  <h3 className="font-bold text-heading leading-tight">Informations générales</h3>
                  <p className="text-xs text-muted">Identifiez cette configuration SMS</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de la configuration" required help="Ex : Orange Côte d'Ivoire" error={errors.name}>
                  <TextInput value={form.name} error={errors.name} onChange={(e) => set('name', e.target.value)} placeholder="Orange Côte d'Ivoire" />
                </Field>
                <Field label="Fournisseur SMS" required help="La plateforme qui achemine vos messages" error={errors.provider}>
                  <SelectInput value={form.provider} error={errors.provider} onChange={(e) => set('provider', e.target.value)}>
                    <option value="">— Choisir un fournisseur —</option>
                    {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </SelectInput>
                </Field>
                <label className="block sm:col-span-2">
                  <span className="block text-sm font-bold text-heading mb-1">Description</span>
                  <textarea className="field" rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Notes internes sur l'usage de cette configuration (facultatif)" />
                  <span className="block text-xs mt-1 text-muted">Facultatif — pour vous aider à repérer cette configuration.</span>
                </label>
                <Field label="Pays" help="Pays d'émission des messages">
                  <SelectInput value={form.country} onChange={(e) => set('country', e.target.value)}>
                    {COUNTRIES.map((cc) => <option key={cc} value={cc}>{cc}</option>)}
                  </SelectInput>
                </Field>
                <Field label="Fuseau horaire" help="Utilisé pour l'horodatage des envois">
                  <SelectInput value={form.timezone} onChange={(e) => set('timezone', e.target.value)}>
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </SelectInput>
                </Field>
              </div>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="text-sm font-semibold text-heading">Activer cette configuration</div>
                    <div className="text-xs text-muted">Les SMS ne partent que si elle est active.</div>
                  </div>
                  <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <div className="text-sm font-semibold text-heading">Configuration par défaut</div>
                    <div className="text-xs text-muted">Utilisée automatiquement pour les envois.</div>
                  </div>
                  <Toggle checked={form.is_default} onChange={(v) => set('is_default', v)} />
                </div>
              </div>
            </div>
          )}

          {/* ---------- ÉTAPE 2 : PARAMÈTRES API ---------- */}
          {step === 1 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.plug /></span>
                <div>
                  <h3 className="font-bold text-heading leading-tight">Paramètres API</h3>
                  <p className="text-xs text-muted">Connectez la plateforme de votre fournisseur</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="URL de l'API" required help="Adresse fournie par votre opérateur" error={errors.api_url}>
                  <TextInput value={form.api_url} error={errors.api_url} onChange={(e) => set('api_url', e.target.value)} placeholder="https://api.fournisseur.com/sms/send" />
                </Field>
                <Field label="Sender ID" required help="Nom affiché à la réception (11 car. max)" error={errors.sender_id}>
                  <TextInput value={form.sender_id} error={errors.sender_id} maxLength={11} onChange={(e) => set('sender_id', e.target.value)} placeholder="MON ECOLE" />
                </Field>
                <Field label="Identifiant (Login)" help="Nom d'utilisateur de votre compte">
                  <TextInput value={form.login} onChange={(e) => set('login', e.target.value)} placeholder="utilisateur@ecole.ci" autoComplete="off" />
                </Field>
                <Field label="Mot de passe" help="Mot de passe du compte fournisseur">
                  <TextInput type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </Field>
                <Field label="API Key" help="Clé d'accès à l'API">
                  <TextInput value={form.api_key} onChange={(e) => set('api_key', e.target.value)} placeholder="pk_live_..." autoComplete="off" />
                </Field>
                <Field label="Secret Key" help="Clé secrète (gardée confidentielle)">
                  <TextInput type="password" value={form.secret_key} onChange={(e) => set('secret_key', e.target.value)} placeholder="••••••••" autoComplete="new-password" />
                </Field>
                <Field label="Délai d'attente (s)" help="Temps max avant d'abandonner un envoi">
                  <TextInput type="number" min={1} max={300} value={form.timeout} onChange={(e) => set('timeout', e.target.value)} />
                </Field>
                <Field label="Encodage" help="GSM7 (standard) ou Unicode (accents/emojis)">
                  <SelectInput value={form.encoding} onChange={(e) => set('encoding', e.target.value)}>
                    <option value="GSM7">GSM7 — standard</option>
                    <option value="UCS2">Unicode (UCS-2)</option>
                  </SelectInput>
                </Field>
                <Field label="Version de l'API" help="Version proposée par votre fournisseur">
                  <SelectInput value={form.api_version} onChange={(e) => set('api_version', e.target.value)}>
                    <option value="v1">v1</option>
                    <option value="v2">v2</option>
                    <option value="v3">v3</option>
                  </SelectInput>
                </Field>
                <Field label="Environnement" help="Test pour essayer sans envoyer réellement">
                  <SelectInput value={form.environment} onChange={(e) => set('environment', e.target.value)}>
                    <option value="test">Test (bac à sable)</option>
                    <option value="production">Production</option>
                  </SelectInput>
                </Field>
              </div>

              {/* Résultat du test */}
              {test.state === 'ok' && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: GREEN }}><I.check /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#15803d' }}>{test.title || 'Connexion réussie'}</div><div className="text-xs text-muted mt-0.5">{test.msg}</div></div>
                </div>
              )}
              {test.state === 'ko' && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border p-3" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white shrink-0" style={{ background: RED }}><I.x /></span>
                  <div><div className="text-sm font-bold" style={{ color: '#b91c1c' }}>{test.title || 'Impossible de se connecter'}</div><div className="text-xs text-muted mt-0.5">{test.msg}</div></div>
                </div>
              )}
            </div>
          )}

          {/* ---------- ÉTAPE 3 : OPTIONS ---------- */}
          {step === 2 && (
            <div className="card rounded-2xl p-6 animate-fade-up">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: BLUE_SOFT, color: BLUE }}><I.sliders /></span>
                <div>
                  <h3 className="font-bold text-heading leading-tight">Options</h3>
                  <p className="text-xs text-muted">Choisissez le comportement des envois</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <OptionRow checked={form.delivery_reports} onChange={(v) => set('delivery_reports', v)} title="Accusés de réception" desc="Savoir si chaque SMS a bien été reçu." />
                <OptionRow checked={form.unicode} onChange={(v) => set('unicode', v)} title="SMS Unicode" desc="Autoriser accents, caractères spéciaux et emojis." />
                <OptionRow checked={form.long_sms} onChange={(v) => set('long_sms', v)} title="SMS longs" desc="Autoriser les messages dépassant 160 caractères." />
                <OptionRow checked={form.split_auto} onChange={(v) => set('split_auto', v)} title="Fractionnement automatique" desc="Découper les longs messages automatiquement." />
                <OptionRow checked={form.retry} onChange={(v) => set('retry', v)} title="Réessayer en cas d'échec" desc="Relancer automatiquement les envois échoués." />
                <OptionRow checked={form.log_all} onChange={(v) => set('log_all', v)} title="Journaliser tous les SMS" desc="Conserver l'historique de chaque envoi." />
                <OptionRow checked={form.campaigns} onChange={(v) => set('campaigns', v)} title="Campagnes SMS" desc="Autoriser les envois groupés (parents, classes…)." />
                <OptionRow checked={form.is_default} onChange={(v) => set('is_default', v)} title="Utiliser par défaut" desc="Configuration prioritaire pour les envois." />
              </div>
            </div>
          )}

          {/* ---------- ÉTAPE 4 : TERMINÉ ---------- */}
          {step === 3 && (
            <div className="card rounded-2xl p-8 text-center animate-fade-up">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-white" style={{ background: GREEN }}>
                <I.check width={30} height={30} />
              </div>
              <h3 className="text-lg font-bold text-heading">Configuration terminée</h3>
              <p className="text-sm text-muted mt-1 mb-5">Vérifiez le récapitulatif ci-dessous, puis enregistrez.</p>
              <div className="mx-auto max-w-lg text-left space-y-3">
                <LockedSummary title="Informations générales" onEdit={() => jump(0)}
                  items={[{ k: 'Nom', v: form.name }, { k: 'Fournisseur', v: form.provider }, { k: 'Pays', v: form.country }, { k: 'État', v: form.enabled ? 'Active' : 'Inactive' }]} />
                <LockedSummary title="Paramètres API" onEdit={() => jump(1)}
                  items={[{ k: 'URL API', v: form.api_url }, { k: 'Sender ID', v: form.sender_id }, { k: 'Encodage', v: form.encoding }, { k: 'Environnement', v: form.environment === 'production' ? 'Production' : 'Test' }]} />
              </div>
            </div>
          )}

          {/* ---------- BARRE D'ACTIONS ---------- */}
          <div className="card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" onClick={goBack} disabled={step === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition disabled:opacity-40"
              style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>
              <I.arrowL /> Retour
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {step === 1 && (
                <button type="button" onClick={runTest} disabled={test.state === 'testing'}
                  className="px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition disabled:opacity-60"
                  style={{ background: '#fff', color: BLUE, border: `1.5px solid ${BLUE}` }}>
                  {test.state === 'testing'
                    ? <><span className="h-4 w-4 rounded-full border-2 animate-spin" style={{ borderColor: BLUE_SOFT, borderTopColor: BLUE }} /> Test en cours…</>
                    : <><I.bolt /> Tester la connexion</>}
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition active:scale-[.98]"
                  style={{ background: BLUE }}>
                  Suivant <I.arrowR />
                </button>
              ) : (
                <button type="button" onClick={save} disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2 transition active:scale-[.98] disabled:opacity-60"
                  style={{ background: GREEN }}>
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
