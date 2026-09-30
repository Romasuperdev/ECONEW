import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Card, Button, Input, Select, Badge, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { printReceipt as printReceiptDoc } from '../utils/receipt'
import { apiError } from '../utils/apiError'
import { useAuth } from '../context/AuthContext'

const RUBRIQUES = ['Scolarité', 'Inscription', 'Cantine', 'Pension', 'Transport']
const MODES_DEFAUT = ['Espèces', 'Chèque', 'Virement bancaire', 'Mobile Money', 'Carte bancaire', 'Dépôt bancaire']

export default function NouveauPaiementPage() {
  const navto = useNavigate()
  const { user } = useAuth()
  const societeName = user?.societes?.[0]?.name || 'AURIAK TECHNOLOGY'
  const [etabName, setEtabName] = useState('')
  const [session, setSession] = useState(null)
  const [levels, setLevels] = useState([])
  const [students, setStudents] = useState([])
  const [modes, setModes] = useState([])
  const [grilles, setGrilles] = useState([])
  const [tCantine, setTCantine] = useState([])
  const [gPension, setGPension] = useState([])
  const [tTransport, setTTransport] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [levelCode, setLevelCode] = useState('')
  const [matricule, setMatricule] = useState('')
  const [mode, setMode] = useState('')
  const [lignes, setLignes] = useState({})       // { rubrique: montant }
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
      api.get('/cantine-tarifs').then(({ data }) => setTCantine(data.data || data)).catch(() => setTCantine([])),
      api.get('/pension/grille').then(({ data }) => setGPension(data.data || data)).catch(() => setGPension([])),
      api.get('/transport-tarifs').then(({ data }) => setTTransport(data.data || data)).catch(() => setTTransport([])),
    ]).finally(() => setLoading(false))
    api.get('/etablissements').then(({ data }) => {
      const list = data.data || data
      const cur = localStorage.getItem('etablissement')
      const e = list.find((x) => String(x.code) === String(cur)) || list[0]
      setEtabName(e?.name || '')
    }).catch(() => {})
  }, [])

  const modeOptions = useMemo(() => {
    const api = (modes || []).map((m) => m.label ?? m.name ?? m.code).filter(Boolean)
    return api.length ? api : MODES_DEFAUT
  }, [modes])

  const studentsOfLevel = useMemo(() => levelCode ? students.filter((s) => String(s.code_niveau) === String(levelCode)) : students, [students, levelCode])
  const student = useMemo(() => students.find((s) => String(s.matricule) === String(matricule)), [students, matricule])
  const grille = useMemo(() => grilles.find((g) => String(g.code_grille) === String(student?.code_niveau || levelCode)), [grilles, student, levelCode])

  const scolariteTotal = Number(grille?.total || student?.scolarite || 0)
  const dejaPaye = Number(student?.total_paye || 0)
  const scolariteReste = Math.max(0, scolariteTotal - dejaPaye)

  // Montants issus des grilles tarifaires, par rubrique
  const grilleAmount = useMemo(() => ({
    Inscription: Number(grille?.inscription || 0),
    Cantine: Number(tCantine[0]?.montant_annee || 0),
    Pension: Number(gPension[0]?.montant_total || 0),
    Transport: Number(tTransport[0]?.montant_annee || 0),
  }), [grille, tCantine, gPension, tTransport])
  // Reste temps réel : déduit le montant saisi sur la rubrique Scolarité
  const montantScoSaisi = Number(lignes['Scolarité']) || 0
  const scolariteResteLive = Math.max(0, scolariteReste - montantScoSaisi)

  const setLigne = (r, v) => setLignes((l) => ({ ...l, [r]: v }))
  const totalAEncaisser = useMemo(() => RUBRIQUES.reduce((s, r) => s + (Number(lignes[r]) || 0), 0), [lignes])
  const lignesAPayer = useMemo(() => RUBRIQUES.map((r) => ({ rubrique: r, montant: Number(lignes[r]) || 0 })).filter((x) => x.montant > 0), [lignes])

  const submit = async (e) => {
    e.preventDefault(); setError(''); setReceipt(null)
    if (!session?.open) { setError("Ouvrez d'abord la caisse (Paiement → Ouverture de caisse)."); return }
    if (!matricule) { setError('Sélectionnez un élève.'); return }
    if (lignesAPayer.length === 0) { setError('Saisissez un montant pour au moins une rubrique.'); return }
    setSaving(true)
    try {
      const results = []
      let numRecu = null
      // Un versement par rubrique, dans la même caisse ouverte, sous UN SEUL n° de reçu.
      for (const l of lignesAPayer) {
        const { data } = await api.post('/versements', {
          matricule, montant: l.montant, mode: mode || null,
          libelle: l.rubrique, caisse: session.caisse_code || null,
          num_recu: numRecu,
        })
        numRecu = numRecu || data.receipt_number || null
        results.push({ ...l, receipt_number: data.receipt_number })
      }
      setReceipt({
        numero: numRecu, eleve: student?.full_name, matricule, mode: mode || '—',
        caisse: session.caisse_code, caissier: user?.name, date: new Date(),
        lignes: results, total: results.reduce((s, x) => s + x.montant, 0),
      })
      setLignes({})
    } catch (err) {
      const errs = err.response?.data?.errors
      setError(errs ? Object.values(errs).flat().join(' ') : (err.response?.data?.message || 'Erreur lors de l\'encaissement.'))
    } finally { setSaving(false) }
  }

  const printReceipt = () => {
    if (!receipt) return
    printReceiptDoc({ ...receipt, societe: societeName, etablissement: etabName })
  }

  if (!loading && !session?.open) {
    return (
      <>
        <PageHeader title="Nouveau paiement" subtitle="Caisse fermée" />
        <Card className="p-8 max-w-lg text-center space-y-4">
          <div className="text-lg font-semibold text-heading">Caisse fermée</div>
          <p className="text-sm text-ink">Aucune caisse n'est ouverte à votre nom. Vous devez ouvrir votre caisse avant d'enregistrer un paiement.</p>
          {session?.occupee && (
            <p className="text-sm rounded-lg px-3 py-2" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
              Votre caisse <strong>{session.occupee.caisse_code}</strong> est actuellement ouverte par <strong>{session.occupee.user}</strong>
              {session.occupee.date_ouverture && <> depuis le {new Date(String(session.occupee.date_ouverture).replace(' ', 'T')).toLocaleString('fr-FR')}</>}.
              Elle doit d'abord être fermée.
            </p>
          )}
          <div className="flex justify-center gap-2">
            <Button onClick={() => navto('/traitement/ouverture-caisse')}>Ouvrir la caisse</Button>
            {session?.occupee && <Button variant="ghost" onClick={() => navto('/traitement/fermeture-caisse')}>Fermeture de caisse</Button>}
          </div>
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

            <Select label="Mode de règlement" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="">— Choisir —</option>
              {modeOptions.map((m) => <option key={m} value={m}>{m}</option>)}
            </Select>

            {/* Rubriques à payer (plusieurs possibles) */}
            <div>
              <div className="text-sm font-bold text-heading mb-2">Rubriques à payer</div>
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <table className="w-full text-sm">
                  <thead className="bg-brand-50 text-left text-ink">
                    <tr><th className="px-3 py-2">Rubrique</th><th className="px-3 py-2">Info</th><th className="px-3 py-2 text-right">Montant à verser</th></tr>
                  </thead>
                  <tbody>
                    {RUBRIQUES.map((r) => (
                      <tr key={r} className="border-t" style={{ borderColor: 'var(--border)' }}>
                        <td className="px-3 py-2 font-medium">{r}</td>
                        <td className="px-3 py-2 text-xs text-ink">
                          {(() => {
                            const saisi = Number(lignes[r]) || 0
                            if (r === 'Scolarité') {
                              return scolariteTotal > 0
                                ? <>Total {formatMoney(scolariteTotal)} · Reste <b style={{ color: montantScoSaisi > 0 ? 'var(--teal)' : undefined }}>{formatMoney(scolariteResteLive)}</b></>
                                : '—'
                            }
                            const base = grilleAmount[r] || 0
                            if (base <= 0) return '—'
                            const reste = Math.max(0, base - saisi)
                            return <>Total {formatMoney(base)} · Reste <b style={{ color: saisi > 0 ? 'var(--teal)' : undefined }}>{formatMoney(reste)}</b></>
                          })()}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <input type="number" min="0" className="field text-right" style={{ maxWidth: 160 }}
                            value={lignes[r] ?? ''} onChange={(e) => setLigne(r, e.target.value)} placeholder="0" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)' }}>
                      <td className="px-3 py-2 font-bold" colSpan={2}>Total à encaisser</td>
                      <td className="px-3 py-2 text-right font-extrabold" style={{ color: 'var(--teal)' }}>{formatMoney(totalAEncaisser)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="text-xs text-ink mt-1">Saisissez un montant sur chaque rubrique concernée. Un reçu unique récapitule l'ensemble.</div>
            </div>

            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !session?.open || totalAEncaisser <= 0}>
                {saving ? 'Encaissement…' : `Encaisser ${totalAEncaisser > 0 ? formatMoney(totalAEncaisser) : ''}`}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <div className="font-semibold mb-2">Informations élève</div>
          {!student ? <EmptyState message="Sélectionnez un élève." /> : (
            <div className="space-y-2 text-sm">
              <div className="font-medium text-heading text-base">{student.full_name}</div>
              <div>Matricule : <span className="font-mono">{student.matricule}</span></div>
              <div>Classe : {student.school_class?.name || student.school_class_id || '—'}</div>
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
                Paiement enregistré ({receipt.lignes.length} rubrique{receipt.lignes.length > 1 ? 's' : ''}).
              </div>
              <div id="recu-print" className="text-sm space-y-1">
                <div className="font-bold">Reçu de versement{receipt.numero ? ` n° ${receipt.numero}` : ''}</div>
                <div>Élève : {receipt.eleve}</div>
                <div>Mode : {receipt.mode}</div>
                <table className="w-full mt-2 text-xs">
                  <tbody>
                    {receipt.lignes.map((l, i) => (
                      <tr key={i}><td>{l.rubrique}</td><td className="text-right">{formatMoney(l.montant)}</td></tr>
                    ))}
                    <tr className="border-t font-bold" style={{ borderColor: 'var(--border)' }}><td>Total</td><td className="text-right">{formatMoney(receipt.total)}</td></tr>
                  </tbody>
                </table>
                <div>Date : {receipt.date.toLocaleString('fr-FR')}</div>
              </div>
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" onClick={printReceipt}>Imprimer le reçu</Button>
                <Button variant="ghost" onClick={() => navto('/traitement/historique-paiements')}>Historique des paiements</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
