<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  @page { margin: 22mm 18mm; }
  body { font-size: 12px; color:#173a24; }
  .head { text-align:center; border-bottom:2px solid #00A876; padding-bottom:8px; margin-bottom:6px; }
  .head .soc { font-size:16px; font-weight:bold; letter-spacing:.5px; color:#0c2c21; }
  .head .sub { font-size:10px; color:#5A6B7B; }
  .head .etab { font-size:12px; font-weight:bold; color:#00A876; margin-top:2px; }
  h1 { text-align:center; font-size:16px; letter-spacing:1px; color:#0c2c21; margin:14px 0 12px; }
  .meta { width:100%; border-collapse:collapse; margin-bottom:6px; }
  .meta td { padding:4px 2px; font-size:11.5px; }
  .lbl { color:#5A6B7B; }
  .val { font-weight:bold; border-bottom:1px solid #cbd5cf; }
  table.det { width:100%; border-collapse:collapse; margin-top:8px; }
  table.det th { background:#E5FFF7; color:#0c2c21; text-align:left; padding:7px 8px; font-size:11px; border-bottom:1px solid #b7e4c7; }
  table.det th.r, table.det td.r { text-align:right; }
  table.det td { padding:7px 8px; border-bottom:1px solid #eef3ee; }
  table.det tr.total td { font-weight:bold; border-top:2px solid #00A876; background:#f5fffb; }
  .lettres { margin-top:10px; font-size:11px; }
  .mode { margin-top:6px; font-size:11px; }
  .mode .box { display:inline-block; margin-right:14px; }
  .sign { margin-top:40px; width:100%; }
  .sign td { width:50%; font-size:11px; color:#5A6B7B; padding-top:40px; text-align:center; }
  .sign .line { border-top:1px solid #333; margin:0 20px; padding-top:4px; }
  .foot { margin-top:22px; text-align:center; font-size:10px; color:#5A6B7B; font-style:italic; }
  .chk { font-family: DejaVu Sans, sans-serif; }
</style></head><body>

  <div class="head">
    <div class="soc">{{ $societe }}</div>
    <div class="sub">Solutions de gestion scolaire — BACOU ECONOMAT</div>
    <div class="etab">{{ $etablissement }}</div>
  </div>

  <h1>REÇU DE PAIEMENT</h1>

  <table class="meta">
    <tr>
      <td class="lbl" style="width:15%">Reçu N° :</td><td class="val" style="width:40%">{{ $recu }}</td>
      <td class="lbl" style="width:12%; text-align:right">Date :</td><td class="val" style="width:33%">{{ $date }}</td>
    </tr>
    <tr>
      <td class="lbl">Année scolaire</td><td class="val">{{ $annee ?: '—' }}</td>
      <td class="lbl" style="text-align:right">Matricule</td><td class="val">{{ $matricule }}</td>
    </tr>
    <tr>
      <td class="lbl">Nom &amp; Prénoms</td><td class="val" colspan="3">{{ $eleve }}</td>
    </tr>
    <tr>
      <td class="lbl">Niveau / Classe</td><td class="val">{{ trim(($niveau ? $niveau : '').' '.($classe ? '/ '.$classe : '')) ?: '—' }}</td>
      <td class="lbl" style="text-align:right">Statut</td>
      <td class="val">
        @if($statut === 'paye') Payé @elseif($statut === 'partiel') Partiel @else Non payé @endif
      </td>
    </tr>
  </table>

  <table class="det">
    <thead><tr><th>Désignation</th><th class="r">Montant ({{ $devise }})</th></tr></thead>
    <tbody>
      <tr><td>Frais de dossier</td><td class="r">{{ number_format((float)$frais_dossier, 0, ',', ' ') }}</td></tr>
      <tr><td>Frais annexes</td><td class="r">{{ number_format((float)$frais_annexes, 0, ',', ' ') }}</td></tr>
      <tr class="total"><td>TOTAL PAYÉ</td><td class="r">{{ number_format((float)$paye, 0, ',', ' ') }}</td></tr>
    </tbody>
  </table>

  <div class="mode chk">
    <b>Mode de paiement :</b>
    <span class="box">{{ str_contains(strtolower((string)$mode), 'espèce') || str_contains(strtolower((string)$mode), 'espece') ? '☑' : '☐' }} Espèces</span>
    <span class="box">{{ str_contains(strtolower((string)$mode), 'mobile') ? '☑' : '☐' }} Mobile Money</span>
    <span class="box">{{ str_contains(strtolower((string)$mode), 'chèque') || str_contains(strtolower((string)$mode), 'cheque') ? '☑' : '☐' }} Chèque</span>
    <span class="box">{{ str_contains(strtolower((string)$mode), 'virement') ? '☑' : '☐' }} Virement</span>
  </div>
  @if($reference)<div class="mode">Référence / N° transaction : <b>{{ $reference }}</b></div>@endif
  @if((float)$reste > 0)<div class="mode">Reste à payer : <b>{{ number_format((float)$reste, 0, ',', ' ') }} {{ $devise }}</b></div>@endif

  <table class="sign">
    <tr>
      <td><div class="line">Cachet de l'établissement</div></td>
      <td><div class="line">Signature du caissier</div></td>
    </tr>
  </table>

  <div class="foot">Ce reçu fait foi de paiement. À conserver.</div>
</body></html>
