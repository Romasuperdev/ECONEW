import api from '../api/client'
import { formatMoney } from './format'

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]))
const capitalize = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const val = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v))

/* ---------------- Montant en lettres (français) ---------------- */

const UNITS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function below100(n) {
  if (n < 20) return UNITS[n]
  const t = Math.floor(n / 10); const u0 = n % 10; let u = u0
  if (t === 7 || t === 9) u += 10 // 70-79 / 90-99 : soixante-dix, quatre-vingt-dix…
  const liaison = u0 === 1 && t !== 8 && t !== 9 ? ' et ' : '-' // vingt et un, soixante et onze
  if (u === 0) return t === 8 ? 'quatre-vingts' : TENS[t]
  return TENS[t] + liaison + UNITS[u]
}

function below1000(n) {
  const c = Math.floor(n / 100); const r = n % 100
  if (c === 0) return below100(r)
  const cent = c === 1 ? 'cent' : `${UNITS[c]} cent${r === 0 ? 's' : ''}`
  return r === 0 ? cent : `${cent} ${below100(r)}`
}

export function montantEnLettres(value) {
  let n = Math.round(Math.abs(Number(value) || 0))
  if (n === 0) return 'zéro'
  const parts = []
  for (const [size, one, many] of [[1e9, 'un milliard', 'milliards'], [1e6, 'un million', 'millions'], [1e3, 'mille', 'mille']]) {
    const q = Math.floor(n / size)
    if (q > 0) {
      parts.push(q === 1 ? one : `${below1000(q)} ${many}`.replace(/(cent|vingt)s mille$/, '$1 mille'))
      n %= size
    }
  }
  if (n > 0) parts.push(below1000(n))
  return parts.join(' ')
}

/* ---------------- Données complémentaires ---------------- */

const fmtDate = (d, withTime = true) => {
  if (!d) return '—'
  const x = d instanceof Date ? d : new Date(String(d).replace(' ', 'T'))
  if (isNaN(x)) return String(d)
  const midnight = x.getHours() === 0 && x.getMinutes() === 0 && x.getSeconds() === 0
  return withTime && !midnight
    ? x.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : x.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const settle = (p) => p.then(({ data }) => data).catch(() => null)

/** Fiche élève, niveau, établissement courant et situation de scolarité. */
async function loadContext(r) {
  const [student, levels, etabs, versements] = await Promise.all([
    r.matricule ? settle(api.get(`/students/${encodeURIComponent(r.matricule)}`)) : null,
    settle(api.get('/levels')),
    settle(api.get('/etablissements')),
    r.matricule ? settle(api.get('/versements', { params: { matricule: r.matricule, per_page: 2000 } })) : null,
  ])

  let cur = null
  try { cur = localStorage.getItem('etablissement') } catch { /* stockage indisponible */ }
  const etabList = etabs?.data || etabs || []
  const etab = etabList.find((e) => String(e.code) === String(cur)) || etabList[0] || null

  const lvList = levels?.data || levels || []
  const niveau = student?.code_niveau ? (lvList.find((l) => String(l.code) === String(student.code_niveau))?.name || student.code_niveau) : null

  // Scolarité : montant dû et total versé jusqu'à la date de ce reçu (inclus).
  let scolarite = null
  const du = Number(student?.scolarite) || 0
  if (du > 0) {
    const limite = r.date ? String(r.date instanceof Date ? r.date.toISOString() : r.date).slice(0, 10) : '9999'
    const lignes = (versements?.data || versements || [])
      .filter((v) => /scolarit/i.test(v.libelle || '') && String(v.paid_at || '').slice(0, 10) <= limite)
    const verse = lignes.reduce((s, v) => s + (Number(v.amount) || 0), 0)
    scolarite = { du, verse, reste: Math.max(du - verse, 0) }
  }

  return { student, niveau, etab, scolarite }
}

/* ---------------- Mise en page ---------------- */

function renderHtml(r, ctx) {
  const s = ctx.student || {}
  const e = ctx.etab || {}
  const total = r.lignes.reduce((t, l) => t + (Number(l.montant) || 0), 0)
  const etabNom = e.name || r.etablissement || ''
  const initiales = (etabNom || r.societe || 'E').split(/[\s-]+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  const contact = [e.adresse, e.telephone && `Tél. ${e.telephone}`, e.email].filter(Boolean).map(esc).join(' · ')
  const parent = [s.father_first_name, s.father_name].filter(Boolean).join(' ') || [s.mother_first_name, s.mother_name].filter(Boolean).join(' ')
  const parentTel = s.father_phone || s.mother_phone || s.guardian_phone
  const sexe = s.gender ? (/^(m|1|masc)/i.test(String(s.gender)) ? 'Masculin' : /^(f|2|fém|fem)/i.test(String(s.gender)) ? 'Féminin' : s.gender) : null

  const info = (label, value) => `<div class="kv"><span>${esc(label)}</span><b>${esc(val(value))}</b></div>`
  const rows = r.lignes.map((l, i) => `<tr><td class="n">${i + 1}</td><td>${esc(l.rubrique)}</td><td class="r">${esc(formatMoney(l.montant))}</td></tr>`).join('')

  const situation = ctx.scolarite ? `
    <div class="situation">
      <div class="sit-title">Situation de la scolarité</div>
      <div class="sit-grid">
        <div><span>Montant annuel</span><b>${esc(formatMoney(ctx.scolarite.du))}</b></div>
        <div><span>Total versé</span><b>${esc(formatMoney(ctx.scolarite.verse))}</b></div>
        <div class="${ctx.scolarite.reste > 0 ? 'due' : 'ok'}"><span>Reste à payer</span><b>${ctx.scolarite.reste > 0 ? esc(formatMoney(ctx.scolarite.reste)) : 'Soldé'}</b></div>
      </div>
    </div>` : ''

  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Reçu ${esc(r.numero || '')}</title>
<style>
  @page { size: A4 portrait; margin: 0 }
  *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  html,body{margin:0}
  body{font-family:'Segoe UI','DM Sans',Arial,sans-serif;color:#1f2d27;background:#eef3f0;font-size:12.5px}
  .page{width:190mm;margin:10mm auto;background:#fff;border-radius:10px;overflow:hidden;position:relative;box-shadow:0 2px 14px rgba(0,0,0,.08)}
  @media print{ body{background:#fff} .page{margin:10mm auto;box-shadow:none;border:1px solid #d7e5dd} }

  .band{background:linear-gradient(120deg,#063d2b,#0b5c41 60%,#00a876);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:16px}
  .logo{width:56px;height:56px;border-radius:12px;background:rgba(255,255,255,.14);border:2px solid rgba(255,255,255,.45);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:21px;letter-spacing:1px;flex:none}
  .who{flex:1;min-width:0}
  .etab{font-size:18px;font-weight:800;letter-spacing:.3px;line-height:1.2}
  .soc{font-size:11px;opacity:.85;text-transform:uppercase;letter-spacing:1.5px;margin-top:2px}
  .contact{font-size:10.5px;opacity:.8;margin-top:5px}
  .num{text-align:right;flex:none}
  .num .lbl{font-size:10px;text-transform:uppercase;letter-spacing:1.5px;opacity:.8}
  .num .val{font-size:16px;font-weight:800;font-family:Consolas,monospace;background:rgba(255,255,255,.14);border-radius:6px;padding:4px 10px;margin-top:3px;display:inline-block}

  .title{display:flex;align-items:center;justify-content:space-between;padding:14px 24px 4px}
  .title h1{margin:0;font-size:17px;letter-spacing:3px;color:#063d2b}
  .title .date{font-size:11.5px;color:#5a6b62;text-align:right}
  .dup{display:inline-block;margin-left:10px;font-size:10px;font-weight:800;letter-spacing:2px;color:#b45309;border:1.5px solid #f59e0b;border-radius:4px;padding:2px 7px;vertical-align:middle}
  .watermark{position:absolute;top:47%;left:50%;transform:translate(-50%,-50%) rotate(-28deg);font-size:92px;font-weight:900;letter-spacing:10px;color:rgba(180,83,9,.06);pointer-events:none;white-space:nowrap}

  .cards{display:grid;grid-template-columns:1.35fr 1fr;gap:12px;padding:10px 24px}
  .card{border:1px solid #d7e5dd;border-radius:9px;padding:10px 14px;background:#fbfdfc}
  .card h3{margin:0 0 7px;font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:#00a876}
  .kv{display:flex;justify-content:space-between;gap:10px;padding:3px 0;border-bottom:1px dashed #e3ece7}
  .kv:last-child{border-bottom:0}
  .kv span{color:#6b7a72}
  .kv b{color:#12251c;text-align:right}
  .name{font-size:15px;font-weight:800;color:#063d2b;margin-bottom:5px}

  .tbl{padding:6px 24px 0}
  table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d7e5dd;border-radius:9px;overflow:hidden}
  th{background:#063d2b;color:#fff;font-size:10.5px;text-transform:uppercase;letter-spacing:1px;padding:9px 12px;text-align:left}
  td{padding:9px 12px;border-top:1px solid #edf3ef}
  tbody tr:nth-child(even) td{background:#f7fbf9}
  td.n,th.n{width:34px;text-align:center;color:#6b7a72}
  td.r,th.r{text-align:right;white-space:nowrap}
  tr.total td{background:#e5fff7!important;border-top:2px solid #00a876;font-weight:800;font-size:14px;color:#063d2b}

  .lettres{margin:10px 24px 0;padding:9px 14px;border-left:4px solid #00a876;background:#f3faf6;border-radius:0 8px 8px 0;font-size:12px}

  .situation{margin:12px 24px 0;border:1px solid #d7e5dd;border-radius:9px;overflow:hidden}
  .sit-title{background:#f3faf6;padding:6px 14px;font-size:10.5px;text-transform:uppercase;letter-spacing:1.5px;color:#00a876;font-weight:700}
  .sit-grid{display:grid;grid-template-columns:repeat(3,1fr)}
  .sit-grid div{padding:8px 14px;border-left:1px solid #edf3ef}
  .sit-grid div:first-child{border-left:0}
  .sit-grid span{display:block;font-size:10.5px;color:#6b7a72}
  .sit-grid b{font-size:13.5px;color:#12251c}
  .sit-grid .due b{color:#b91c1c}
  .sit-grid .ok b{color:#047857}

  .sign{display:grid;grid-template-columns:1fr 1fr;gap:40px;padding:26px 24px 8px}
  .sign div{text-align:center;font-size:11px;color:#5a6b62}
  .sign .line{height:54px;border-bottom:1.5px solid #9fb3a8;margin-bottom:5px}
  .foot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 24px;margin-top:10px;background:#f3faf6;border-top:1px solid #d7e5dd;font-size:10px;color:#6b7a72}
  .foot i{color:#063d2b}
</style></head><body>
<div class="page">
  ${r.duplicata ? '<div class="watermark">DUPLICATA</div>' : ''}
  <div class="band">
    <div class="logo">${esc(initiales || 'E')}</div>
    <div class="who">
      <div class="etab">${esc(etabNom || r.societe)}</div>
      ${etabNom && r.societe ? `<div class="soc">${esc(r.societe)}</div>` : ''}
      ${contact ? `<div class="contact">${contact}</div>` : ''}
    </div>
    <div class="num"><div class="lbl">Reçu N°</div><div class="val">${esc(r.numero || '—')}</div></div>
  </div>

  <div class="title">
    <h1>REÇU DE VERSEMENT${r.duplicata ? '<span class="dup">DUPLICATA</span>' : ''}</h1>
    <div class="date">Date du paiement<br><b style="font-size:13px;color:#12251c">${esc(fmtDate(r.date))}</b></div>
  </div>

  <div class="cards">
    <div class="card">
      <h3>Élève</h3>
      <div class="name">${esc(s.full_name || r.eleve)}</div>
      ${info('Matricule', s.matricule || r.matricule)}
      ${info('Classe', s.school_class?.name)}
      ${info('Niveau', ctx.niveau)}
      ${info('Sexe', sexe)}
      ${info('Né(e) le', s.birth_date ? fmtDate(s.birth_date, false) + (s.birth_place ? ` à ${s.birth_place}` : '') : null)}
      ${info('Parent / tuteur', parent || null)}
      ${info('Contact parent', parentTel)}
    </div>
    <div class="card">
      <h3>Règlement</h3>
      ${info('Mode', r.mode)}
      ${info('Caisse', r.caisse)}
      ${info('Caissier', r.caissier)}
      ${info('Nb de rubriques', r.lignes.length)}
      ${info('Montant total', formatMoney(total))}
    </div>
  </div>

  <div class="tbl">
    <table>
      <thead><tr><th class="n">#</th><th>Désignation</th><th class="r">Montant</th></tr></thead>
      <tbody>${rows}
        <tr class="total"><td></td><td>TOTAL ENCAISSÉ</td><td class="r">${esc(formatMoney(total))}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="lettres">Arrêté le présent reçu à la somme de : <b>${esc(capitalize(montantEnLettres(total)))} francs CFA</b></div>
  ${situation}

  <div class="sign">
    <div><div class="line"></div>Signature du parent / déposant</div>
    <div><div class="line"></div>Cachet de l'établissement &amp; signature du caissier</div>
  </div>

  <div class="foot">
    <i>Ce reçu fait foi de paiement. À conserver soigneusement — aucun remboursement sans présentation du reçu.</i>
    <span>Imprimé le ${esc(new Date().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }))}</span>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print()},150)}</script>
</body></html>`
}

/**
 * Imprime un reçu de versement. Utilisé par « Nouveau paiement » et
 * « Historique des paiements ». À appeler directement depuis un clic
 * (la fenêtre est ouverte AVANT le chargement, sinon le navigateur la bloque).
 *
 * @param {object} r
 * @param {string} r.societe
 * @param {string} [r.etablissement]   Nom (repli si la fiche établissement est indisponible)
 * @param {string} [r.numero]          N° de reçu
 * @param {string} r.eleve
 * @param {string} [r.matricule]
 * @param {string} [r.mode]
 * @param {string|Date} [r.date]
 * @param {string} [r.caisse]
 * @param {string} [r.caissier]
 * @param {{rubrique: string, montant: number}[]} r.lignes
 * @param {boolean} [r.duplicata]
 * @returns {boolean} false si la fenêtre a été bloquée
 */
export function printReceipt(r) {
  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) return false
  w.document.write('<p style="font-family:Arial,sans-serif;color:#555;padding:24px">Préparation du reçu…</p>')
  loadContext(r)
    .catch(() => ({}))
    .then((ctx) => {
      w.document.open()
      w.document.write(renderHtml({ ...r, date: r.date || new Date() }, ctx || {}))
      w.document.close()
    })
  return true
}
