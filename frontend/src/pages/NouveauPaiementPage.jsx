import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Card, Button, Input, Select, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { apiError } from '../utils/apiError'

const RUBRIQUES = ['Scolarité', 'Inscription', 'Cantine', 'Pension', 'Transport']

export default function NouveauPaiementPage() {
  const navto = useNavigate()
  const [session, setSession] = useState(null)
  const [levels, setLevels] = useState([])
  const [students, setStudents] = useState([])
  const [modes, setModes] = useState([])
  const [grilles, setGrilles] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [levelCode, setLevelCode] = useState('')
  const [matricule, setMatricule] = useState('')
  const [rubrique, setRubrique] = useState('Scolarité')
  const [mode, setMode] = useState('')
  const [montant, setMontant] = useState('')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoadError('')
    Promise.all([
      api.get('/caisse-session/current').then(({ data }) => setSession(data)).catch(() => {}),
      api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([])),
      api.get('/students', { params: { per_page: 1000 } }).then(({ data }) => setStudents(data.data || data)).catch((e) => setLoadError(apiError(e))),
      api.get('/payment-modes').then(({ data }) => setModes(data.data || data)).catch(() => setModes([])),
      api.get('/grille-scolarite').then(({ data }) => setGrilles(data.data || data)).catch(() => setGrilles([])),
    ]).finally(() => setLoading(false))
  }, [])

  const studentsOfLevel = useMemo(() => levelCode ? students.filter((s) => String(s.code_niveau) === String(levelCode)) : students, [students, levelCode])
  const student = useMemo(() => students.find((s) => String(s.matricule) === String(matricule)), [students, matricule])
  const grille = useMemo(() => grilles.find((g) => String(g.code_grille) === String(levelCode)), [grilles, levelCode])

  const total = rubrique === 'Scolarité' ? Number(grille?.total || student?.scolarite || 0) : 0
  const dejaPaye = Number(student?.total_paye || 0)
  const reste = Math.max(0, total - dejaPaye)

  const submit = async (e) => {
    e.preventDefault(); setError(''); setReceipt(null)
    if (!session?.open) { setError("Ouvrez d'abord la caisse (Paiement → Ouverture de caisse)."); return }
    if (!matricule) { setError('Sélectionnez un élève.'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/versements', {
        matricule, montant: Number(montant || 0), mode: mode || null,
        libelle: rubrique, caisse: session.caisse_code || null,
      })
      setReceipt({ ...data, eleve: student?.full_name, rubrique, montant: Number(montant || 0) })
      setMontant('')
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Erreur.'))
    } finally { setSaving(false) }
  }

  if (!loading && !session?.open) {
    return (
      <>
        <PageHeader title="Nouveau paiement" subtitle="Caisse fermée" />
        <Card className="p-8 max-w-lg text-center space-y-4">
          <div className="text-lg font-semibold text-heading">Caisse fermée</div>
          <p className="text-sm text-ink">Vous devez ouvrir votre caisse avant d'enregistrer un paiement.</p>
          <div className="flex justify-center"><Button onClick={() => navto('/traitement/ouverture-caisse')}>Ouvrir la caisse</Button></div>
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Nouveau paiement" subtitle={session?.open ? `Caisse ${session.caisse_code} ouverte` : 'Caisse fermée'} />
      {loadError && <div className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>{loadError}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 lg:col-span-2">
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Date" value={new Date().toLocaleDateString('fr-FR')} readOnly className="bg-gray-50" />
              <Select label="Niveau" value={levelCode} onChange={(e) => { setLevelCode(e.target.value); setMatricule('') }}>
                <option value="">— Tous —</option>
                {levels.map((l) => <option key={l.id} value={l.code}>{l.name}</option>)}
              </Select>
            </div>
            <Select label="Matricule (élève)" value={matricule} onChange={(e) => setMatricule(e.target.value)} required>
              <option value="">— Choisir —</option>
              {studentsOfLevel.map((s) => <option key={s.matricule} value={s.matricule}>{s.matricule} — {s.full_name || `${s.first_name} ${s.last_name}`}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Select label="Rubrique" value={rubrique} onChange={(e) => setRubrique(e.target.value)}>
                {RUBRIQUES.map((r) => <option key={r} value={r}>{r}</option>)}
              </Select>
              <Select label="Mode de règlement" value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="">— Choisir —</option>
                {modes.map((m) => <option key={m.id ?? m.code ?? m.label} value={m.label ?? m.code ?? m.name}>{m.label ?? m.name ?? m.code}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Montant total" value={formatMoney(total)} readOnly className="bg-gray-50" />
              <Input label="Déjà versé" value={formatMoney(dejaPaye)} readOnly className="bg-gray-50" />
              <Input label="Reste à payer" value={formatMoney(reste)} readOnly className="font-semibold bg-gray-50" />
            </div>
            <Input label="Montant à verser" type="number" value={montant} onChange={(e) => setMontant(e.target.value)} required />
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end"><Button type="submit" disabled={saving || !session?.open}>{saving ? 'Encaissement…' : 'Encaisser'}</Button></div>
          </form>
        </Card>

        <Card className="p-5">
          <div className="font-semibold mb-2">Informations élève</div>
          {!student ? <EmptyState message="Sélectionnez un élève." /> : (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-heading text-base">{student.full_name}</div>
              <div>Matricule : <span className="font-mono">{student.matricule}</span></div>
              <div>Classe : {student.school_class_id || '—'}</div>
              <div>Niveau : {student.code_niveau || '—'}</div>
              <div className="flex gap-2 flex-wrap pt-1">
                {student.affecte ? <Badge value="Affecté" /> : <span className="text-ink text-xs px-2 py-0.5 rounded" style={{ border: '1px solid var(--border)' }}>Non affecté</span>}
                {student.boursier && <Badge value="Boursier" />}
                {student.redoublant && <Badge value="Redoublant" />}
              </div>
            </div>
          )}
          {receipt && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="rounded-lg px-4 py-3 text-sm mb-3" style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>
                Versement enregistré{receipt.receipt_number ? ` — reçu ${receipt.receipt_number}` : ''}.
              </div>
              <div id="recu-print" className="text-sm space-y-1">
                <div className="font-bold">Reçu de versement</div>
                <div>Élève : {receipt.eleve}</div>
                <div>Rubrique : {receipt.rubrique}</div>
                <div>Montant : <strong>{formatMoney(receipt.montant)}</strong></div>
                <div>Date : {new Date().toLocaleString('fr-FR')}</div>
              </div>
              <Button variant="ghost" className="mt-2" onClick={() => window.print()}>Imprimer le reçu</Button>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
