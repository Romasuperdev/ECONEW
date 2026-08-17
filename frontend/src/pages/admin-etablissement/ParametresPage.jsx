import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { apiError } from '../../utils/apiError'

const isSecret = (cle) => /(key|password|secret|token)/i.test(cle || '')
const isMessagerie = (cle) => /^(sms_|mail_|smtp_)/i.test(cle || '')

const Group = ({ title, rows, setVal }) => (
  <div>
    <div className="text-sm font-bold text-heading mb-3">{title}</div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rows.map((r) => (
        <div key={r.cle}>
          <Input
            label={r.libelle || r.cle}
            type={isSecret(r.cle) ? 'password' : 'text'}
            value={r.valeur ?? ''}
            onChange={(e) => setVal(r.cle, e.target.value)}
            placeholder={r.cle}
            autoComplete={isSecret(r.cle) ? 'new-password' : 'off'}
          />
          <div className="text-[11px] text-ink mt-1 font-mono">{r.cle}</div>
        </div>
      ))}
    </div>
  </div>
)

export default function ParametresPage() {
  const [etab, setEtab] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/admin-etablissement/parametres')
      .then(({ data }) => { setEtab(data.etablissement || null); setRows(data.parametres || []) })
      .catch((e) => { setRows([]); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setVal = (cle, valeur) => setRows((r) => r.map((x) => x.cle === cle ? { ...x, valeur } : x))

  const save = async () => {
    setSaving(true); setError(''); setDone('')
    try {
      await api.put('/admin-etablissement/parametres', { parametres: rows.map((r) => ({ cle: r.cle, valeur: r.valeur ?? '' })) })
      setDone('Paramètres enregistrés.'); setTimeout(() => setDone(''), 3000)
    } catch (e) { setError(apiError(e)) } finally { setSaving(false) }
  }

  const messagerie = rows.filter((r) => isMessagerie(r.cle))
  const general = rows.filter((r) => !isMessagerie(r.cle))

  return (
    <>
      <PageHeader title="Paramètres de l'établissement" subtitle="Configuration de l'établissement"
        action={<Button onClick={save} disabled={saving || loading || rows.length === 0}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>} />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {done && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{done}</div>}

      {etab && (
        <Card className="p-5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <div className="text-xs text-ink">Établissement</div>
              <div className="text-base font-semibold text-heading mt-0.5">{etab.name || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-ink">Code</div>
              <div className="text-base font-semibold text-heading mt-0.5 font-mono">{etab.code || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-ink">Société</div>
              <div className="text-base font-semibold text-heading mt-0.5">{etab.societe || '—'}</div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun paramètre." /> : (
          <div className="space-y-6">
            {general.length > 0 && <Group title="Général" rows={general} setVal={setVal} />}
            {messagerie.length > 0 && <Group title="Messagerie" rows={messagerie} setVal={setVal} />}
          </div>
        )}
      </Card>
    </>
  )
}
