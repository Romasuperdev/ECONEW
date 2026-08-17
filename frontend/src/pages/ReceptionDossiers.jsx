import { useEffect, useState } from 'react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import { downloadFile } from '../utils/download'
import { apiError } from '../utils/apiError'

/* Design system local : vert #00CC8E, DM Sans, radius 20px */
const G = '#00CC8E'
const G_DARK = '#007E58'
const G_SOFT = '#E5FFF7'
const G_BORDER = '#9CEBD1'
const RED = '#dc2626'
const FONT = "'DM Sans','Inter','Segoe UI',sans-serif"
const R = 20

const MODES = ['Espèces', 'Chèque', 'Virement', 'Mobile Money', 'Carte bancaire']
const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} XOF`

const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: R, padding: 20, fontFamily: FONT }
const label = { display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--heading, #14223f)', marginBottom: 6 }
const input = { width: '100%', borderRadius: 12, border: '1.5px solid var(--border)', padding: '.6rem .8rem', fontFamily: FONT, background: 'var(--surface)', color: 'var(--text)' }

export default function ReceptionDossiers() {
  const [matricule, setMatricule] = useState('')
  const [infos, setInfos] = useState(null)       // { eleve, grille }
  const [state, setState] = useState('idle')     // idle | loading | ok | notfound | error
  const [errMsg, setErrMsg] = useState('')
  const [form, setForm] = useState({ montant_paye: '', quantite: '1', mode_paiement: 'Espèces', reference_paiement: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(null)        // reçu enregistré
  const [formErr, setFormErr] = useState({})

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setFormErr((e) => ({ ...e, [k]: undefined })) }

  // Recherche auto (debounce)
  useEffect(() => {
    const m = matricule.trim()
    setSaved(null)
    if (m.length < 3) { setInfos(null); setState('idle'); return }
    setState('loading'); setErrMsg('')
    const t = setTimeout(() => {
      api.get(`/eleves/${encodeURIComponent(m)}/infos`)
        .then(({ data }) => {
          setInfos(data); setState('ok')
        })
        .catch((e) => {
          setInfos(null)
          if (e.response?.status === 404) { setState('notfound') }
          else { setState('error'); setErrMsg(apiError(e)) }
        })
    }, 450)
    return () => clearTimeout(t)
  }, [matricule])

  const validate = () => {
    const e = {}
    const paye = Number(form.montant_paye)
    if (form.montant_paye === '' || isNaN(paye) || paye < 0) e.montant_paye = 'Saisissez un montant valide.'
    const qte = Number(form.quantite)
    if (form.quantite === '' || isNaN(qte) || qte < 1) e.quantite = 'Quantité invalide (min. 1).'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  const valider = async () => {
    if (!infos?.eleve || !validate()) return
    setSaving(true)
    try {
      const { data } = await api.post('/paiements-dossiers', {
        matricule_eleve: infos.eleve.matricule,
        montant_paye: Number(form.montant_paye),
        quantite: Number(form.quantite) || 1,
        mode_paiement: form.mode_paiement,
        reference_paiement: form.reference_paiement || null,
      })
      setSaved(data)
    } catch (err) {
      setFormErr({ global: err.response?.data?.message || 'Enregistrement impossible.' })
    } finally { setSaving(false) }
  }

  const imprimer = async () => {
    if (!saved?.id) return
    try { await downloadFile(`/paiements-dossiers/${saved.id}/recu`, `Recu-${saved.numero_recu}.pdf`) }
    catch { setFormErr((e) => ({ ...e, global: 'Téléchargement du reçu impossible.' })) }
  }

  const reset = () => { setMatricule(''); setInfos(null); setState('idle'); setSaved(null); setForm({ montant_paye: '', quantite: '1', mode_paiement: 'Espèces', reference_paiement: '' }); setFormErr({}) }

  const fiche = infos?.eleve
  const grille = infos?.grille

  return (
    <div style={{ fontFamily: FONT }}>
      <PageHeader title="Réception des dossiers & frais annexes" subtitle="Encaissement des frais de dossier et frais annexes" />

      {/* Recherche élève */}
      <div style={{ ...card, marginBottom: 18 }}>
        <label style={label}>Matricule de l'élève</label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <input style={{ ...input, paddingLeft: 38 }} value={matricule} onChange={(e) => setMatricule(e.target.value)} placeholder="Saisissez le matricule (recherche automatique)…" />
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: G }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            </span>
          </div>
          {(matricule || infos) && <button onClick={reset} style={{ borderRadius: 12, border: '1px solid var(--border)', padding: '.6rem 1rem', background: 'var(--surface-2)', fontFamily: FONT, fontWeight: 600 }}>Réinitialiser</button>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>La fiche de l'élève et la grille tarifaire s'affichent dès que le matricule est valide.</div>
      </div>

      {/* États */}
      {state === 'loading' && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', border: `4px solid ${G_SOFT}`, borderTopColor: G, margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
          Recherche de l'élève…
          <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}
      {state === 'notfound' && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>Aucun élève trouvé pour ce matricule.</div>}
      {state === 'error' && <div style={{ ...card, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>{errMsg}</div>}
      {state === 'idle' && !infos && <div style={{ ...card, textAlign: 'center', color: 'var(--muted)' }}>Commencez par saisir un matricule pour afficher la fiche de l'élève.</div>}

      {state === 'ok' && fiche && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18, alignItems: 'start' }} className="rd-grid">
          {/* Fiche élève + grille */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, color: G_DARK, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 26, height: 26, borderRadius: 8, background: G_SOFT, color: G, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </span>
                {fiche.full_name || `${fiche.prenom || ''} ${fiche.nom || ''}`}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                {[['Matricule', fiche.matricule], ['Sexe', fiche.sexe], ['Niveau', fiche.niveau], ['Statut', fiche.statut], ['Année scolaire', fiche.annee_scolaire]].map(([k, v]) => (
                  <div key={k}><span style={{ color: 'var(--muted)' }}>{k} : </span><b style={{ color: 'var(--text)' }}>{v || '—'}</b></div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, color: G_DARK, marginBottom: 12 }}>Grille tarifaire applicable</div>
              {grille?.trouvee ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                  <tbody>
                    <tr><td style={{ padding: '8px 0', color: 'var(--muted)' }}>Frais de dossier</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{money(grille.frais_dossier)}</td></tr>
                    <tr><td style={{ padding: '8px 0', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>Frais annexes</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border)' }}>{money(grille.frais_annexes)}</td></tr>
                  </tbody>
                </table>
              ) : <div style={{ fontSize: 13, color: '#a9761a', background: '#fef6e6', border: '1px solid #f6e2b8', borderRadius: 12, padding: 12 }}>Aucune grille trouvée pour ce niveau. Vous pouvez tout de même saisir le montant encaissé.</div>}
            </div>
          </div>

          {/* Encaissement */}
          <div style={{ ...card, borderColor: G_BORDER, position: 'sticky', top: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: G_DARK, marginBottom: 14 }}>Encaissement</div>

            {saved ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: 58, height: 58, borderRadius: '50%', background: G, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div style={{ fontWeight: 800, color: G_DARK }}>Paiement enregistré</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Reçu N° <b>{saved.numero_recu}</b> — {money(saved.montant_paye)} encaissé.</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Transaction verrouillée après 2 jours.</div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                  <button onClick={imprimer} style={{ borderRadius: 12, background: G, color: '#fff', fontWeight: 700, padding: '.6rem 1.1rem', border: 'none', fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 6 }}>🖨 Télécharger le reçu (PDF)</button>
                  <button onClick={reset} style={{ borderRadius: 12, background: 'var(--surface-2)', fontWeight: 700, padding: '.6rem 1.1rem', border: '1px solid var(--border)', fontFamily: FONT }}>Nouvelle réception</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                  <div>
                    <label style={label}>Montant payé (XOF)</label>
                    <input type="number" min={0} style={{ ...input, borderColor: formErr.montant_paye ? RED : 'var(--border)' }} value={form.montant_paye} onChange={(e) => set('montant_paye', e.target.value)} />
                    {formErr.montant_paye && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.montant_paye}</div>}
                  </div>
                  <div>
                    <label style={label}>Quantité</label>
                    <input type="number" min={1} step={1} style={{ ...input, borderColor: formErr.quantite ? RED : 'var(--border)' }} value={form.quantite} onChange={(e) => set('quantite', e.target.value)} />
                    {formErr.quantite && <div style={{ color: RED, fontSize: 12, marginTop: 4 }}>{formErr.quantite}</div>}
                  </div>
                </div>
                <div>
                  <label style={label}>Mode de paiement</label>
                  <select style={input} value={form.mode_paiement} onChange={(e) => set('mode_paiement', e.target.value)}>
                    {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>Référence (facultatif)</label>
                  <input style={input} value={form.reference_paiement} onChange={(e) => set('reference_paiement', e.target.value)} placeholder="N° chèque, transaction mobile…" />
                </div>
                {formErr.global && <div style={{ color: RED, fontSize: 13 }}>{formErr.global}</div>}
                <button onClick={valider} disabled={saving} style={{ borderRadius: 14, background: saving ? G_DARK : G, color: '#fff', fontWeight: 800, padding: '.75rem 1rem', border: 'none', fontFamily: FONT, fontSize: 14, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Enregistrement…' : 'Valider le paiement'}
                </button>
              </div>
            )}
          </div>
          <style>{'@media (max-width: 860px){ .rd-grid{ grid-template-columns: 1fr !important; } }'}</style>
        </div>
      )}
    </div>
  )
}
