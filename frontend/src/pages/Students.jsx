import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { Card, Button, Input, Badge, EmptyState, Modal } from '../components/ui'
import PageHeader from '../components/PageHeader'
import { formatMoney } from '../utils/format'
import { useAuth } from '../context/AuthContext'

const statutLabel = (v) => ({ '1': 'Inactif', '2': 'Actif', '3': 'Diplômé', '4': 'Transféré' }[String(v)] || v || '—')

export default function Students() {
  const nav = useNavigate()
  const { user } = useAuth()
  const societeName = user?.societes?.[0]?.name || 'AURIAK TECHNOLOGY'
  const [items, setItems] = useState([])
  const [levels, setLevels] = useState([])
  const [etabName, setEtabName] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [fiche, setFiche] = useState(null)

  const load = () => {
    setLoading(true)
    api.get('/students', { params: { search, per_page: 100 } })
      .then(({ data }) => setItems(data.data || data))
      .finally(() => setLoading(false))
  }
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    api.get('/levels').then(({ data }) => setLevels(data.data || data)).catch(() => {})
    api.get('/etablissements').then(({ data }) => {
      const list = data.data || data
      const cur = localStorage.getItem('etablissement')
      const e = list.find((x) => String(x.code) === String(cur)) || list[0]
      setEtabName(e?.name || '')
    }).catch(() => {})
  }, [])

  const hasPaid = (s) => Number(s?.total_paye || 0) > 0
  const remove = async (s) => {
    if (hasPaid(s)) { alert("Cet élève a déjà effectué des paiements : il ne peut pas être supprimé."); return }
    if (!confirm('Supprimer cet élève ?')) return
    try { await api.delete(`/students/${s.id}`); load() }
    catch (err) { alert(err.response?.data?.message || 'Suppression impossible.') }
  }

  const niveauName = (s) => levels.find((l) => String(l.code) === String(s?.code_niveau))?.name || s?.code_niveau || '—'

  const printFiche = (s) => {
    if (!s) return
    const esc = (v) => String(v ?? '—').replace(/[&<>]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]))
    const line = (lbl, val) => `<div class="l"><b>${lbl} :</b> <span class="v">${esc(val)}</span></div>`
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Fiche élève</title>
    <style>
      *{font-family:Georgia,'Times New Roman',serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{color:#173a24;padding:24px;max-width:720px;margin:0 auto}
      .box{border:2px solid #00A876;padding:24px}
      .head{text-align:center;border-bottom:2px solid #00A876;padding-bottom:8px;margin-bottom:14px}
      .soc{font-size:18px;font-weight:800;letter-spacing:.5px}
      .sub{font-size:11px;color:#5A6B7B}
      .etab{font-size:13px;font-weight:700;color:#00A876;margin-top:2px}
      h1{text-align:center;font-size:22px;font-weight:800;letter-spacing:1px;margin:4px 0 14px}
      .sec{background:#E5FFF7;border-left:4px solid #00A876;padding:5px 10px;font-weight:800;font-size:12.5px;margin:16px 0 8px;letter-spacing:.5px}
      .l{font-size:13px;margin:5px 0}
      .v{border-bottom:1px dotted #9bbcae;padding:0 4px}
      .sign{display:flex;justify-content:space-between;margin-top:48px;font-size:12px;text-align:center}
      .sign div{width:45%;border-top:1px solid #333;padding-top:4px}
      .fait{margin-top:18px;font-size:12px}
    </style></head><body>
      <div class="box">
        <div class="head">
          <div class="soc">${esc(societeName)}</div>
          <div class="sub">Solutions de gestion scolaire — Economat</div>
          ${etabName ? `<div class="etab">${esc(etabName)}</div>` : ''}
        </div>
        <h1>FICHE DE L'ÉLÈVE</h1>
        <div class="sec">IDENTITÉ</div>
        ${line('MATRICULE', s.matricule)}
        ${line('NOM', s.last_name)}
        ${line('PRÉNOM(S)', s.first_name)}
        ${line('SEXE', s.gender === 'F' ? 'Féminin' : s.gender === 'M' ? 'Masculin' : (s.gender || '—'))}
        ${line('DATE DE NAISSANCE', s.birth_date)}
        ${line('LIEU DE NAISSANCE', s.birth_place)}
        ${line('NATIONALITÉ', s.nationality)}
        ${line('TÉLÉPHONE', s.phone)}
        <div class="sec">SCOLARITÉ</div>
        ${line('NIVEAU', niveauName(s))}
        ${line('CLASSE', s.school_class?.name || s.school_class_id)}
        ${line('STATUT', statutLabel(s.status))}
        ${line('SCOLARITÉ (grille)', formatMoney(s.scolarite))}
        <div class="sec">PARENTS / TUTEUR</div>
        ${line('PÈRE / TUTEUR', `${s.father_first_name || ''} ${s.father_name || s.guardian_name || ''}`.trim())}
        ${line('TÉL. PÈRE / TUTEUR', s.father_phone || s.guardian_phone)}
        ${line('MÈRE', `${s.mother_first_name || ''} ${s.mother_name || ''}`.trim())}
        ${line('TÉL. MÈRE', s.mother_phone)}
        <div class="sign"><div>Signature du parent / tuteur</div><div>Cachet et signature de l'établissement</div></div>
        <div class="fait">Fait à ____________________, le ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>
      <script>window.onload=function(){window.print()}</script>
    </body></html>`
    const w = window.open('', '_blank', 'width=780,height=900')
    if (w) { w.document.write(html); w.document.close() }
  }

  const Row = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-1 text-sm border-b" style={{ borderColor: 'var(--border)' }}>
      <span className="text-ink">{label}</span>
      <span className="font-medium text-right">{value || '—'}</span>
    </div>
  )

  return (
    <>
      <PageHeader title="Élèves" subtitle={`${items.length} élève(s)`}
        action={<Button onClick={() => nav('/eleves/nouveau')}>+ Nouvel élève</Button>} />

      <Card className="p-4 mb-4">
        <Input placeholder="Rechercher par nom ou matricule…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Card>

      <Card className="overflow-hidden">
        {loading ? <EmptyState message="Chargement…" /> : items.length === 0 ? <EmptyState /> : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">Matricule</th><th>Nom complet</th><th>Classe</th>
                <th>Parent / tuteur</th><th>Téléphone</th><th className="text-right">Scolarité</th><th className="text-right">Reste</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t hover:bg-brand-50 cursor-pointer" onClick={() => setFiche(s)} title="Voir la fiche">
                  <td className="px-4 py-3 font-mono text-xs">{s.matricule}</td>
                  <td className="font-medium" style={{ color: 'var(--teal)' }}>{s.first_name} {s.last_name}</td>
                  <td>{s.school_class?.name || '—'}</td>
                  <td className="text-slate-500">{s.guardian_name || s.mother_name || '—'}</td>
                  <td className="text-slate-500">{s.father_phone || s.mother_phone || '—'}</td>
                  <td className="text-right">{formatMoney(s.scolarite)}</td>
                  <td className="text-right font-medium text-gold-600">{formatMoney((Number(s.scolarite) || 0) - (Number(s.total_paye) || 0))}</td>
                  <td><Badge value={statutLabel(s.status)} /></td>
                  <td className="text-right px-4 space-x-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setFiche(s)} className="hover:underline" style={{ color: 'var(--teal)' }}>Fiche</button>
                    <button onClick={() => nav(`/eleves/${s.matricule}/modifier`)} className="text-brand-600 hover:underline">Modifier</button>
                    {hasPaid(s)
                      ? <span className="text-gray-300 cursor-not-allowed" title="Élève avec paiements : suppression interdite">Suppr.</span>
                      : <button onClick={() => remove(s)} className="text-red-600 hover:underline">Suppr.</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={!!fiche} onClose={() => setFiche(null)} title="Fiche de l'élève" size="2xl">
        {fiche && (
          <div className="space-y-4">
            <div>
              <div className="text-lg font-bold text-heading">{fiche.full_name || `${fiche.first_name} ${fiche.last_name}`}</div>
              <div className="text-xs font-mono text-ink">{fiche.matricule}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <div className="text-xs font-bold text-heading mb-1 mt-1">Identité</div>
                <Row label="Sexe" value={fiche.gender === 'F' ? 'Féminin' : fiche.gender === 'M' ? 'Masculin' : fiche.gender} />
                <Row label="Date de naissance" value={fiche.birth_date} />
                <Row label="Lieu de naissance" value={fiche.birth_place} />
                <Row label="Nationalité" value={fiche.nationality} />
                <Row label="Téléphone" value={fiche.phone} />
              </div>
              <div>
                <div className="text-xs font-bold text-heading mb-1 mt-1">Scolarité</div>
                <Row label="Niveau" value={niveauName(fiche)} />
                <Row label="Classe" value={fiche.school_class?.name || fiche.school_class_id} />
                <Row label="Statut" value={statutLabel(fiche.status)} />
                <Row label="Scolarité (grille)" value={formatMoney(fiche.scolarite)} />
                <Row label="Reste" value={formatMoney((Number(fiche.scolarite) || 0) - (Number(fiche.total_paye) || 0))} />
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-heading mb-1">Parents / tuteur</div>
              <Row label="Père / tuteur" value={`${fiche.father_first_name || ''} ${fiche.father_name || fiche.guardian_name || ''}`.trim()} />
              <Row label="Tél. père / tuteur" value={fiche.father_phone || fiche.guardian_phone} />
              <Row label="Mère" value={`${fiche.mother_first_name || ''} ${fiche.mother_name || ''}`.trim()} />
              <Row label="Tél. mère" value={fiche.mother_phone} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button variant="ghost" onClick={() => nav(`/eleves/${fiche.matricule}/modifier`)}>Modifier</Button>
              <Button onClick={() => printFiche(fiche)}>🖨 Imprimer la fiche</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
