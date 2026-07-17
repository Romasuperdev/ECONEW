import { useEffect, useState } from 'react'
import api from '../api/client'
import { Card, Button, Input, Modal, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'

export default function Mail() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ ADRESS_MAIL: '', MOT_PASS: '', SERVEUR_SMTP: '', PORT_SMTP: 587 })
  const [editing, setEditing] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    setLoadError('')
    return api.get('/mail-diffusion')
      .then(({ data }) => setItems(data))
      .catch((e) => { setItems([]); setLoadError(apiError(e)) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setForm({ ADRESS_MAIL: '', MOT_PASS: '', SERVEUR_SMTP: '', PORT_SMTP: 587 }); setEditing(null); setError(''); setModal(true) }
  const openEdit = (m) => { setForm({ ADRESS_MAIL: m.ADRESS_MAIL, MOT_PASS: '', SERVEUR_SMTP: m.SERVEUR_SMTP, PORT_SMTP: m.PORT_SMTP }); setEditing(m.ID_MAIL_DIF); setError(''); setModal(true) }

  const save = async (e) => {
    e.preventDefault(); setError('')
    try {
      if (editing) await api.put(`/mail-diffusion/${editing}`, form); else await api.post('/mail-diffusion', form)
      setModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const remove = async (m) => {
    if (!confirm('Supprimer cette configuration mail ?')) return
    await api.delete(`/mail-diffusion/${m.ID_MAIL_DIF}`)
    load()
  }

  return (
    <>
      <PageHeader
        title="Mail"
        subtitle={`${items.length} configuration(s)`}
        action={<Button onClick={openCreate}><Icon name="plus" size={16} /> Nouvelle configuration</Button>}
      />
      {loadError && (
        <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
          {loadError}
        </div>
      )}
      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState message="Aucune configuration mail." /> : (
          <table className="w-full text-sm">
            <thead className="bg-brand-50 text-left text-ink">
              <tr>
                <th className="px-4 py-2">Adresse mail</th>
                <th>Serveur SMTP</th>
                <th>Port</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.ID_MAIL_DIF} className="border-t hover:bg-brand-50">
                  <td className="px-4 py-2 font-medium">{m.ADRESS_MAIL}</td>
                  <td>{m.SERVEUR_SMTP}</td>
                  <td className="text-ink">{m.PORT_SMTP}</td>
                  <td className="text-right px-4 space-x-3 whitespace-nowrap">
                    <button onClick={() => openEdit(m)} className="hover:underline" style={{ color: 'var(--teal)' }}>Modifier</button>
                    <button onClick={() => remove(m)} className="text-red-600 hover:underline">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la configuration mail' : 'Nouvelle configuration mail'}>
        <form onSubmit={save} className="space-y-4">
          <Input
            label="Adresse mail"
            type="email"
            value={form.ADRESS_MAIL}
            onChange={(e) => setForm({ ...form, ADRESS_MAIL: e.target.value })}
            required
          />
          <Input
            label={editing ? 'Mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe'}
            type="password"
            value={form.MOT_PASS}
            onChange={(e) => setForm({ ...form, MOT_PASS: e.target.value })}
            required={!editing}
          />
          <Input
            label="Serveur SMTP"
            value={form.SERVEUR_SMTP}
            onChange={(e) => setForm({ ...form, SERVEUR_SMTP: e.target.value })}
            required
          />
          <Input
            label="Port SMTP"
            type="number"
            value={form.PORT_SMTP}
            onChange={(e) => setForm({ ...form, PORT_SMTP: Number(e.target.value) })}
            required
          />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setModal(false)}>Annuler</Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}