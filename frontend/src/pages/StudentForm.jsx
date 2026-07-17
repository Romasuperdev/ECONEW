import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import { Card, Button, Input, Select, EmptyState } from '../components/ui'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { formatMoney } from '../utils/format'

const empty = {
  date_inscription: new Date().toISOString().slice(0, 10),
  matricule: '', last_name: '', first_name: '', gender: 'M', birth_date: '', birth_place: '',
  num_acte: '', acte_date: '', phone: '', address: '', email: '', nationality: 'Ivoirienne', photo: '',
  etab_origine: '', affecte: true, boursier: false, inscription_type: 'inscription', redoublant: 0,
  code_niveau: '', level_id: '', school_class_id: '',
  father_name: '', father_first_name: '', father_profession: '', father_phone: '', father_email: '',
  mother_name: '', mother_first_name: '', mother_profession: '', mother_phone: '', mother_email: '',
  status: '2',
}

const REMISE_TYPES = ['Inscription', 'Scolarité', 'Transport', 'Cantine', 'Pension']
const STEPS = ['Identification', 'Niveau scolaire', 'Parents / Tuteur', 'Dossiers & frais annexes', 'Remises', 'Paiements']

export default function StudentForm() {
  const nav = useNavigate()
  const { matricule } = useParams()
  const editing = !!matricule
  const [form, setForm] = useState(empty)
  const [levels, setLevels] = useState([])
  const [classes, setClasses] = useState([])
  const [grilles, setGrilles] = useState([])
  const [tCantine, setTCantine] = useState([])
  const [gPension, setGPension] = useState([])
  const [tTransport, setTTransport] = useState([])
  const [dossiers, setDossiers] = useState([])
  const [remises, setRemises] = useState([])
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  useEffect(() => {
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => setLevels([]))
    api.get('/school-classes').then(({ data }) => setClasses(data.data || data)).catch(() => setClasses([]))
    api.get('/grille-scolarite').then(({ data }) => setGrilles(data.data || data)).catch(() => setGrilles([]))
    api.get('/cantine-tarifs').then(({ data }) => setTCantine(data.data || data)).catch(() => setTCantine([]))
    api.get('/pension/grille').then(({ data }) => setGPension(data.data || data)).catch(() => setGPension([]))
    api.get('/transport-tarifs').then(({ data }) => setTTransport(data.data || data)).catch(() => setTTransport([]))
  }, [])

  useEffect(() => {
    if (!editing) return
    api.get(`/students/${matricule}`).then(({ data }) => setForm({ ...empty, ...data, birth_date: data.birth_date ? String(data.birth_date).slice(0, 10) : '' })).catch(() => {})
    api.get('/student-dossiers', { params: { matricule } }).then(({ data }) => setDossiers(data)).catch(() => {})
    api.get(`/student-photo/${matricule}`).then(({ data }) => data.photo && set('photo', data.photo)).catch(() => {})
  }, [matricule])

  const classesFiltered = useMemo(() => form.level_id ? classes.filter((c) => String(c.level_id) === String(form.level_id)) : classes, [classes, form.level_id])

  const pickLevel = (levelId) => {
    const l = levels.find((x) => String(x.id) === String(levelId))
    setForm((f) => ({ ...f, level_id: levelId, code_niveau: l?.code || '', school_class_id: '' }))
  }

  const onPhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader(); reader.onload = () => set('photo', reader.result); reader.readAsDataURL(file)
  }

  // Dossiers dynamiques
  const addDossier = () => setDossiers((d) => [...d, { code: '', libelle: '', montant: '', quantite: 1, _new: true }])
  const setDossier = (i, k, v) => setDossiers((d) => d.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const rmDossier = (i) => setDossiers((d) => d.filter((_, j) => j !== i))

  // Remises dynamiques
  const addRemise = () => setRemises((r) => [...r, { date: new Date().toISOString().slice(0, 10), type: '', montant: '', taux: '' }])
  const setRemise = (i, k, v) => setRemises((r) => r.map((x, j) => j === i ? { ...x, [k]: v } : x))
  const rmRemise = (i) => setRemises((r) => r.filter((_, j) => j !== i))
  const baseFor = (type) => {
    if (type === 'Scolarité' || type === 'Inscription') {
      const g = grilles.find((x) => String(x.code_grille) === String(form.code_niveau))
      if (!g) return ''
      return type === 'Scolarité' ? (g.scolarite ?? '') : (g.inscription ?? '')
    }
    if (type === 'Cantine') return tCantine[0]?.montant_annee ?? ''
    if (type === 'Pension') return gPension[0]?.montant_total ?? ''
    if (type === 'Transport') return tTransport[0]?.montant_annee ?? ''
    return ''
  }
  const setRemiseType = (i, type) => setRemises((r) => r.map((x, j) => j === i ? { ...x, type, montant: String(baseFor(type) || '') } : x))
    const remiseCalc = (r) => { const m = Number(r.montant || 0), t = Number(r.taux || 0); const mr = Math.round(m * t) / 100; return { mr, net: m - mr } }

  // Paiements (récap depuis la grille scolarité du niveau)
  const grille = useMemo(() => grilles.find((g) => String(g.code_grille) === String(form.code_niveau)), [grilles, form.code_niveau])
  const dossiersTotal = useMemo(() => dossiers.reduce((s, d) => s + Number(d.montant || 0) * Number(d.quantite || 1), 0), [dossiers])
  const paiements = useMemo(() => {
    const rows = []
    if (grille) rows.push({ rubrique: 'Scolarité', total: grille.total || 0, verse: 0 })
    if (dossiersTotal) rows.push({ rubrique: 'Frais annexes', total: dossiersTotal, verse: 0 })
    return rows
  }, [grille, dossiersTotal])

  const submit = async (print = false) => {
    setError(''); setSaving(true)
    try {
      const payload = {
        date_inscription: form.date_inscription, matricule: form.matricule || undefined,
        last_name: form.last_name, first_name: form.first_name, gender: form.gender,
        birth_date: form.birth_date || null, birth_place: form.birth_place, num_acte: form.num_acte, acte_date: form.acte_date || null,
        phone: form.phone, address: form.address, email: form.email || null, nationality: form.nationality,
        etab_origine: form.etab_origine, affecte: form.affecte, boursier: form.boursier,
        inscription_type: form.inscription_type, redoublant: !!Number(form.redoublant),
        code_niveau: form.code_niveau, school_class_id: form.school_class_id || null,
        father_name: form.father_name, father_first_name: form.father_first_name, father_profession: form.father_profession, father_phone: form.father_phone, father_email: form.father_email || null,
        mother_name: form.mother_name, mother_first_name: form.mother_first_name, mother_profession: form.mother_profession, mother_phone: form.mother_phone, mother_email: form.mother_email || null,
        status: form.status,
      }
      const resp = editing ? await api.put(`/students/${matricule}`, payload) : await api.post('/students', payload)
      const mat = resp.data?.matricule || form.matricule || matricule

      if (form.photo && mat) { try { await api.post('/student-photo', { matricule: mat, photo: form.photo }) } catch (e) {} }
      for (const d of dossiers) {
        if (d.id) continue
        try { await api.post('/student-dossiers', { matricule: mat, code: d.code || null, libelle: d.libelle || null, montant: d.montant || null, quantite: d.quantite || null }) } catch (e) {}
      }
      for (const r of remises) {
        try { await api.post('/remises', { matricule: mat, nom: form.last_name, prenom: form.first_name, niveau: form.code_niveau, classe: form.school_class_id, statut: form.affecte, rubrique: r.type, montant: Number(r.montant || 0), taux: Number(r.taux || 0), date: r.date }) } catch (e) {}
      }
      if (print) { setTimeout(() => window.print(), 300) } else { nav('/traitement/inscription') }
    } catch (err) {
      setError(err.response?.data?.message || "Erreur lors de l'enregistrement.")
      const errs = err.response?.data?.errors; if (errs) setError(Object.values(errs).flat().join(' '))
    } finally { setSaving(false) }
  }

  const Toggle2 = ({ value, onChange, on, off }) => (
    <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
      <button type="button" onClick={() => onChange(true)} className="px-3 py-1.5 text-sm" style={{ background: value ? 'var(--teal)' : 'transparent', color: value ? '#fff' : 'var(--ink)' }}>{on}</button>
      <button type="button" onClick={() => onChange(false)} className="px-3 py-1.5 text-sm" style={{ background: !value ? 'var(--accent)' : 'transparent', color: !value ? 'var(--accent-ink)' : 'var(--ink)' }}>{off}</button>
    </div>
  )

  return (
    <>
      <PageHeader title={editing ? "Modifier la fiche" : "Fiche d'inscription"} subtitle={`Étape ${step + 1}/${STEPS.length} — ${STEPS[step]}`} />

      <div className="flex flex-wrap gap-2 mb-4">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className="px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: i === step ? 'var(--accent)' : 'var(--card)', color: i === step ? 'var(--accent-ink)' : 'var(--ink)', border: '1px solid var(--border)' }}>
            {i + 1}. {s}
          </button>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Encadré photo à gauche (style fiche) */}
            <div className="shrink-0 flex flex-col items-center">
              <label className="cursor-pointer">
                <div className="w-44 h-56 rounded-xl flex items-center justify-center overflow-hidden"
                  style={{ border: '2px dashed color-mix(in srgb, var(--sidebar) 45%, var(--border))', background: 'var(--surface-2)' }}>
                  {form.photo ? <img src={form.photo} alt="photo" className="w-full h-full object-cover" /> : <span className="flex flex-col items-center text-muted"><Icon name="students" size={44} /><span className="text-xs mt-2">Importer</span></span>}
                </div>
                <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
              </label>
              <div className="text-sm font-bold text-heading mt-2">Photo de l'élève</div>
            </div>

            {/* Champs d'identité à droite */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              <Input label="N° Matricule (auto si vide)" value={form.matricule} onChange={(e) => set('matricule', e.target.value)} disabled={editing} />
              <Input label="Date d'inscription" type="date" value={form.date_inscription} onChange={(e) => set('date_inscription', e.target.value)} />
              <Input label="Nom" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
              <Input label="Prénom" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              <Select label="Sexe" value={form.gender} onChange={(e) => set('gender', e.target.value)}><option value="M">Masculin</option><option value="F">Féminin</option></Select>
              <Input label="Date de naissance" type="date" value={form.birth_date} onChange={(e) => set('birth_date', e.target.value)} />
              <Input label="Lieu de naissance" value={form.birth_place} onChange={(e) => set('birth_place', e.target.value)} />
              <Input label="Téléphone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              <Input label="N° acte de naissance" value={form.num_acte} onChange={(e) => set('num_acte', e.target.value)} />
              <Input label="Date de l'acte" type="date" value={form.acte_date} onChange={(e) => set('acte_date', e.target.value)} />
              <Input label="Adresse e-mail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              <Input label="Adresse postale" value={form.address} onChange={(e) => set('address', e.target.value)} />
              <Input label="Nationalité" value={form.nationality} onChange={(e) => set('nationality', e.target.value)} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 max-w-2xl">
            <Input label="Établissement d'origine" value={form.etab_origine} onChange={(e) => set('etab_origine', e.target.value)} />
            <div className="flex items-center justify-between"><span className="text-sm">Statut</span><Toggle2 value={form.affecte} onChange={(v) => set('affecte', v)} on="Affecté" off="Non affecté" /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Régime (bourse)</span><Toggle2 value={form.boursier} onChange={(v) => set('boursier', v)} on="Boursier" off="Non boursier" /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Type</span>
              <div className="inline-flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                <button type="button" onClick={() => set('inscription_type', 'inscription')} className="px-3 py-1.5 text-sm" style={{ background: form.inscription_type === 'inscription' ? 'var(--teal)' : 'transparent', color: form.inscription_type === 'inscription' ? '#fff' : 'var(--ink)' }}>Inscription</button>
                <button type="button" onClick={() => set('inscription_type', 'reinscription')} className="px-3 py-1.5 text-sm" style={{ background: form.inscription_type === 'reinscription' ? 'var(--teal)' : 'transparent', color: form.inscription_type === 'reinscription' ? '#fff' : 'var(--ink)' }}>Réinscription</button>
              </div>
            </div>
            <Select label="Redoublant" value={String(form.redoublant)} onChange={(e) => set('redoublant', e.target.value)}><option value="0">Non</option><option value="1">Oui</option></Select>
            <Select label="Niveau" value={form.level_id} onChange={(e) => pickLevel(e.target.value)}>
              <option value="">— Choisir —</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </Select>
            <Select label="Classe" value={form.school_class_id} onChange={(e) => set('school_class_id', e.target.value)}>
              <option value="">— Choisir —</option>
              {classesFiltered.map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}
            </Select>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 max-w-3xl">
            <div>
              <div className="font-semibold mb-2">Père / Tuteur</div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nom" value={form.father_name} onChange={(e) => set('father_name', e.target.value)} />
                <Input label="Prénoms" value={form.father_first_name} onChange={(e) => set('father_first_name', e.target.value)} />
                <Input label="Profession" value={form.father_profession} onChange={(e) => set('father_profession', e.target.value)} />
                <Input label="Téléphone" value={form.father_phone} onChange={(e) => set('father_phone', e.target.value)} />
                <Input label="E-mail" type="email" value={form.father_email} onChange={(e) => set('father_email', e.target.value)} />
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Mère</div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Nom de la mère" value={form.mother_name} onChange={(e) => set('mother_name', e.target.value)} />
                <Input label="Prénoms de la mère" value={form.mother_first_name} onChange={(e) => set('mother_first_name', e.target.value)} />
                <Input label="Profession" value={form.mother_profession} onChange={(e) => set('mother_profession', e.target.value)} />
                <Input label="Téléphone" value={form.mother_phone} onChange={(e) => set('mother_phone', e.target.value)} />
                <Input label="E-mail" type="email" value={form.mother_email} onChange={(e) => set('mother_email', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center"><div className="font-semibold">Dossiers & frais annexes</div><Button variant="ghost" onClick={addDossier}><Icon name="plus" size={15} /> Ajouter</Button></div>
            {dossiers.length === 0 ? <EmptyState message="Aucun élément." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-2 py-2">Code</th><th>Libellé</th><th>Montant</th><th>Quantité</th><th></th></tr></thead>
                <tbody>
                  {dossiers.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1"><Input value={d.code} onChange={(e) => setDossier(i, 'code', e.target.value)} /></td>
                      <td><Input value={d.libelle} onChange={(e) => setDossier(i, 'libelle', e.target.value)} /></td>
                      <td><Input type="number" value={d.montant} onChange={(e) => setDossier(i, 'montant', e.target.value)} /></td>
                      <td><Input type="number" value={d.quantite} onChange={(e) => setDossier(i, 'quantite', e.target.value)} /></td>
                      <td className="text-right"><button onClick={() => rmDossier(i)} className="text-red-600 hover:underline">Suppr.</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="text-right text-sm">Total frais annexes : <strong>{formatMoney(dossiersTotal)}</strong></div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center"><div className="font-semibold">Remises</div><Button variant="ghost" onClick={addRemise}><Icon name="plus" size={15} /> Ajouter</Button></div>
            {remises.length === 0 ? <EmptyState message="Aucune remise." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-2 py-2">Date</th><th>Type</th><th>Montant</th><th>Taux %</th><th>Remise</th><th>Net</th><th></th></tr></thead>
                <tbody>
                  {remises.map((r, i) => { const c = remiseCalc(r); return (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1"><Input type="date" value={r.date} onChange={(e) => setRemise(i, 'date', e.target.value)} /></td>
                      <td><Select value={r.type} onChange={(e) => setRemiseType(i, e.target.value)}><option value="">— Choisir —</option>{REMISE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></td>
                      <td><Input type="number" value={r.montant} onChange={(e) => setRemise(i, 'montant', e.target.value)} /></td>
                      <td><Input type="number" value={r.taux} onChange={(e) => setRemise(i, 'taux', e.target.value)} /></td>
                      <td className="text-red-600">{formatMoney(c.mr)}</td>
                      <td className="font-semibold">{formatMoney(c.net)}</td>
                      <td className="text-right"><button onClick={() => rmRemise(i)} className="text-red-600 hover:underline">Suppr.</button></td>
                    </tr>
                  )})}
                </tbody>
              </table>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <div className="font-semibold">Paiements effectués</div>
            {paiements.length === 0 ? <EmptyState message="Aucune rubrique (choisissez un niveau avec grille)." /> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-50 text-left text-ink"><tr><th className="px-4 py-2">Rubrique</th><th className="text-right">Montant total</th><th className="text-right">Montant versé</th><th className="text-right">Reste</th></tr></thead>
                <tbody>
                  {paiements.map((p) => (
                    <tr key={p.rubrique} className="border-t">
                      <td className="px-4 py-2 font-medium">{p.rubrique}</td>
                      <td className="text-right">{formatMoney(p.total)}</td>
                      <td className="text-right">{formatMoney(p.verse)}</td>
                      <td className="text-right font-semibold text-red-600">{formatMoney(p.total - p.verse)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-ink">Les encaissements se font ensuite dans la page Versements.</p>
          </div>
        )}

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="flex justify-between mt-6 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <Button variant="ghost" onClick={() => step === 0 ? nav('/traitement/inscription') : setStep(step - 1)}>{step === 0 ? 'Annuler' : 'Précédent'}</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Suivant</Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => submit(true)} disabled={saving}>{saving ? '…' : 'Valider & imprimer'}</Button>
              <Button onClick={() => submit(false)} disabled={saving}>{saving ? 'Enregistrement…' : 'Valider'}</Button>
            </div>
          )}
        </div>
      </Card>

      {/* Fiche imprimable (visible uniquement à l'impression) */}
      <div className="print-fiche">
        <div style={{ border: '6px double #1f3a63', color: '#1f3a63', fontFamily: 'Georgia, serif', padding: '24px' }}>
          <h1 style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, letterSpacing: '.5px', marginBottom: '18px' }}>Fiche d'inscription</h1>
          <div style={{ display: 'flex', gap: '24px' }}>
            <div style={{ width: '150px', textAlign: 'center' }}>
              <div style={{ width: '150px', height: '185px', border: '2px solid #1f3a63', borderRadius: '14px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {form.photo ? <img src={form.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '12px' }}>Photo</span>}
              </div>
              <div style={{ fontWeight: 700, marginTop: '6px' }}>Photo de l'élève</div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="pf-line"><strong>MATRICULE :</strong> <span className="pf-val">{form.matricule}</span></div>
              <div className="pf-line"><strong>NOM :</strong> <span className="pf-val">{form.last_name}</span></div>
              <div className="pf-line"><strong>PRÉNOM :</strong> <span className="pf-val">{form.first_name}</span></div>
              <div className="pf-line"><strong>SEXE :</strong> <span className="pf-val">{form.gender === 'F' ? 'Féminin' : 'Masculin'}</span></div>
              <div className="pf-line"><strong>DATE DE NAISSANCE :</strong> <span className="pf-val">{form.birth_date}</span></div>
              <div className="pf-line"><strong>LIEU DE NAISSANCE :</strong> <span className="pf-val">{form.birth_place}</span></div>
              <div className="pf-line"><strong>TÉLÉPHONE :</strong> <span className="pf-val">{form.phone}</span></div>
              <div className="pf-line"><strong>NATIONALITÉ :</strong> <span className="pf-val">{form.nationality}</span></div>
            </div>
          </div>

          <div className="pf-sec">SCOLARITÉ</div>
          <div className="pf-line"><strong>NIVEAU :</strong> <span className="pf-val">{levels.find((l) => String(l.code) === String(form.code_niveau))?.name || form.code_niveau}</span>&nbsp;&nbsp;<strong>CLASSE :</strong> <span className="pf-val">{classes.find((c) => String(c.code) === String(form.school_class_id))?.name || form.school_class_id}</span></div>
          <div className="pf-line"><strong>ÉTABLISSEMENT D'ORIGINE :</strong> <span className="pf-val">{form.etab_origine}</span></div>
          <div className="pf-line"><strong>STATUT :</strong> <span className="pf-val">{form.affecte ? 'Affecté' : 'Non affecté'}</span>&nbsp;&nbsp;<strong>RÉGIME :</strong> <span className="pf-val">{form.boursier ? 'Boursier' : 'Non boursier'}</span></div>
          <div className="pf-line"><strong>TYPE :</strong> <span className="pf-val">{form.inscription_type === 'reinscription' ? 'Réinscription' : 'Inscription'}</span>&nbsp;&nbsp;<strong>REDOUBLANT :</strong> <span className="pf-val">{Number(form.redoublant) ? 'Oui' : 'Non'}</span></div>

          <div className="pf-sec">PARENTS / TUTEUR</div>
          <div className="pf-line"><strong>PÈRE :</strong> <span className="pf-val">{form.father_first_name} {form.father_name}</span>&nbsp;&nbsp;<strong>TÉL :</strong> <span className="pf-val">{form.father_phone}</span></div>
          <div className="pf-line"><strong>MÈRE :</strong> <span className="pf-val">{form.mother_first_name} {form.mother_name}</span>&nbsp;&nbsp;<strong>TÉL :</strong> <span className="pf-val">{form.mother_phone}</span></div>

          <div className="pf-sec">FRAIS</div>
          {paiements.map((p) => (
            <div key={p.rubrique} className="pf-line"><strong>{p.rubrique.toUpperCase()} :</strong> <span className="pf-val">{formatMoney(p.total)}</span></div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', fontSize: '13px' }}>
            <div>Fait le {new Date(form.date_inscription || Date.now()).toLocaleDateString('fr-FR')}</div>
            <div>Signature : ______________________</div>
          </div>
        </div>
      </div>
    </>
  )
}
