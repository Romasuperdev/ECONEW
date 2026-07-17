import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Input, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import ThemeSwitcher from '../components/ThemeSwitcher'

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      <span className="text-muted text-sm">{label}</span>
      <span className="text-sm font-medium text-heading text-right">{value || '—'}</span>
    </div>
  )
}

const roleLabels = {
  super_admin: 'Super Administrateur', directeur: 'Directeur',
  comptable: 'Comptable', caissier: 'Caissier', admin: 'Administrateur',
}


function PaymentModesCard() {
  const { can } = useAuth()
  const [modes, setModes] = useState([])
  const [name, setName] = useState('')
  if (!can('users.manage')) return null
  const load = () => api.get('/payment-modes').then(({ data }) => setModes(data || [])).catch(() => setModes([]))
  useEffect(() => { load() }, [])
  const add = async (e) => { e.preventDefault(); if (!name.trim()) return; await api.post('/payment-modes', { name }); setName(''); load() }
  const del = async (m) => { if (!confirm('Supprimer ce mode ?')) return; await api.delete(`/payment-modes/${m.id}`); load() }
  return (
    <Card className="p-6 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: 'color-mix(in srgb, var(--teal) 15%, transparent)', color: 'var(--teal)' }}>
          <Icon name="payments" size={22} />
        </div>
        <h3 className="font-semibold text-heading">Modalités de paiement</h3>
      </div>
      <form onSubmit={add} className="flex gap-2 mb-3">
        <Input placeholder="Ex : Espèces, Mobile Money, Virement…" value={name} onChange={(e) => setName(e.target.value)} />
        <Button type="submit">Ajouter</Button>
      </form>
      {modes.length === 0 ? <p className="text-muted text-sm">Aucun mode. Ajoutez-en ; sinon des modes par défaut sont utilisés.</p> : (
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm" style={{ background: 'var(--surface-2)' }}>
              {m.name}
              <button onClick={() => del(m)} className="text-red-600">✕</button>
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const societe = user?.societes?.[0]

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Établissement, compte et préférences" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: 'color-mix(in srgb, var(--teal) 15%, transparent)', color: 'var(--teal)' }}>
              <Icon name="building" size={22} />
            </div>
            <h3 className="font-semibold text-heading">Établissement / Société</h3>
          </div>
          {societe ? (
            <div>
              <Row label="Nom" value={societe.name} />
              <Row label="Code société" value={societe.code} />
              <Row label="Ville" value={societe.ville} />
              <Row label="Pays" value={societe.pays} />
              <Row label="Email" value={societe.email} />
            </div>
          ) : <EmptyState message="Aucune société rattachée à ce compte." />}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="rounded-xl flex items-center justify-center" style={{ width: 42, height: 42, background: 'color-mix(in srgb, var(--accent) 15%, transparent)', color: 'var(--accent)' }}>
              <Icon name="students" size={22} />
            </div>
            <h3 className="font-semibold text-heading">Mon compte</h3>
          </div>
          <Row label="Nom" value={user?.name} />
          <Row label="Identifiant" value={user?.login} />
          <Row label="Email" value={user?.email} />
          <Row label="Rôle" value={roleLabels[user?.role] || user?.role} />

          <div className="mt-6">
            <h4 className="font-semibold text-heading mb-2">Apparence</h4>
            <p className="text-muted text-sm mb-3">Choisissez le thème de l'interface.</p>
            <ThemeSwitcher />
          </div>
        </Card>
      </div>
      <PaymentModesCard />
    </>
  )
}
