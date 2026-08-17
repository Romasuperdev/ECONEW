import { useEffect, useState } from 'react'
import api from '../../api/client'
import { Card, Button, Input, EmptyState } from '../../components/ui'
import PageHeader from '../../components/PageHeader'
import { apiError } from '../../utils/apiError'

export default function ParametresPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const load = () => {
    setLoading(true); setError('')
    api.get('/super/parametres-systeme')
      .then(({ data }) => setRows(data.data || []))
      .catch((e) => { setRows([]); setError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const setVal = (cle, valeur) => setRows((r) => r.map((x) => x.cle === cle ? { ...x, valeur } : x))

  const save = async () => {
    setSaving(true); setError(''); setDone('')
    try {
      await api.put('/super/parametres-systeme', { parametres: rows.map((r) => ({ cle: r.cle, valeur: r.valeur ?? '', description: r.description })) })
      setDone('Paramètres enregistrés.'); setTimeout(() => setDone(''), 3000)
    } catch (e) { setError(apiError(e)) } finally { setSaving(false) }
  }

  return (
    <>
      <PageHeader title="Paramètres système" subtitle="Configuration globale de la plateforme"
        action={<Button onClick={save} disabled={saving || loading}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>} />
      {error && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{error}</div>}
      {done && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>{done}</div>}

      <Card className="p-5">
        {loading ? <EmptyState message="Chargement…" /> : rows.length === 0 ? <EmptyState message="Aucun paramètre." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map((r) => (
              <div key={r.cle}>
                <Input
                  label={r.description || r.cle}
                  value={r.valeur ?? ''}
                  onChange={(e) => setVal(r.cle, e.target.value)}
                  placeholder={r.cle}
                />
                <div className="text-[11px] text-ink mt-1 font-mono">{r.cle}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <p className="text-xs text-ink mt-3">Ces paramètres servent de valeurs par défaut à l'échelle de la plateforme (SMS/e-mail, quotas, contact support).</p>
    </>
  )
}
