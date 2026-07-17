import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { apiError } from '../utils/apiError'

const PROVIDERS = ['Orange SMS', 'MTN SMS', 'Moov SMS', 'Twilio', 'Vonage (Nexmo)', 'Infobip', 'Autre']

function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 items-center rounded-full transition"
      style={{ background: checked ? 'var(--teal)' : 'var(--muted, #cbd5e1)' }}>
      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }} />
    </button>
  )
}

const empty = {
  enabled: false, name: '', provider: '', environment: 'test',
  api_url: '', api_key: '', api_secret: '', sender_id: '',
  delivery_reports: false, long_sms: false, auto_notif: false,
}

export default function Sms() {
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    setLoadError('')
    api.get('/sms-config')
      .then(({ data }) => setForm({ ...empty, ...data }))
      .catch((e) => setLoadError(apiError(e)))
      .finally(() => setLoading(false))
  }, [])

  const save = async (e) => {
    e.preventDefault(); setError(''); setSaved(false); setSaving(true)
    try {
      const { data } = await api.put('/sms-config', form)
      setForm({ ...empty, ...data }); setSaved(true); setTimeout(() => setSaved(false), 2500)
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') } finally { setSaving(false) }
  }

  const Check = ({ k, label }) => (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} className="h-4 w-4" /> {label}
    </label>
  )

  return (
    <>
      <PageHeader title="Configuration SMS" subtitle="Paramétrage de la passerelle d'envoi de SMS" />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}
      {loading ? <EmptyState message="Chargement…" /> : (
        <form onSubmit={save} className="space-y-6 max-w-2xl">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-heading">Informations générales</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm">Activer le service SMS</span>
              <div className="flex items-center gap-2">
                <Toggle checked={form.enabled} onChange={(v) => set('enabled', v)} />
                <span className="text-sm text-ink">{form.enabled ? 'Oui' : 'Non'}</span>
              </div>
            </div>
            <Input label="Nom de la configuration" value={form.name} onChange={(e) => set('name', e.target.value)} />
            <Select label="Fournisseur SMS" value={form.provider} onChange={(e) => set('provider', e.target.value)}>
              <option value="">— Choisir —</option>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select label="Environnement" value={form.environment} onChange={(e) => set('environment', e.target.value)}>
              <option value="test">Test</option>
              <option value="production">Production</option>
            </Select>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-heading">Paramètres API</h3>
            <Input label="URL de l'API" value={form.api_url} onChange={(e) => set('api_url', e.target.value)} />
            <Input label="API Key" value={form.api_key} onChange={(e) => set('api_key', e.target.value)} />
            <Input label="API Secret" type="password" value={form.api_secret} onChange={(e) => set('api_secret', e.target.value)} />
            <Input label="Sender ID (nom de l'expéditeur)" value={form.sender_id} onChange={(e) => set('sender_id', e.target.value)} />
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="font-semibold text-heading">Options</h3>
            <Check k="delivery_reports" label="Activer les accusés de réception" />
            <Check k="long_sms" label="Autoriser les SMS longs" />
            <Check k="auto_notif" label="Envoyer automatiquement les notifications" />
          </Card>

          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer la configuration'}</Button>
            {saved && <span className="text-sm" style={{ color: 'var(--teal)' }}>✓ Configuration enregistrée</span>}
          </div>
        </form>
      )}
    </>
  )
}
