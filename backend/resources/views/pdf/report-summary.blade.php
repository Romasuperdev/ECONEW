<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { color: #1f2937; font-size: 12px; }
  .head { border-bottom: 3px solid #1B2A4A; padding-bottom: 8px; margin-bottom: 16px; }
  .brand { color: #1B2A4A; font-size: 22px; font-weight: bold; }
  .sub { color: #6b7280; font-size: 11px; }
  .kpis { width: 100%; margin: 12px 0; border-collapse: collapse; }
  .kpis td { width: 33%; padding: 12px; text-align: center; border: 1px solid #e5e7eb; }
  .kpis .lbl { color: #6b7280; font-size: 10px; text-transform: uppercase; }
  .kpis .val { font-size: 18px; font-weight: bold; }
  .rec { color: #2E9C9C; }
  .dep { color: #dc2626; }
  .sol { color: #1B2A4A; }
  h3 { color: #1B2A4A; font-size: 13px; margin: 18px 0 6px; border-left: 4px solid #D9A441; padding-left: 8px; }
  table.data { width: 100%; border-collapse: collapse; }
  table.data th { background: #1B2A4A; color: #fff; text-align: left; padding: 6px 8px; font-size: 11px; }
  table.data td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
  table.data td.r { text-align: right; }
  .foot { margin-top: 24px; color: #9ca3af; font-size: 9px; text-align: center; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">Economat</div>
    <div class="sub">Rapport financier @if($societe) · Société {{ $societe }} @endif</div>
    <div class="sub">Période : {{ $d['periode']['from'] }} au {{ $d['periode']['to'] }}</div>
  </div>

  <table class="kpis">
    <tr>
      <td><div class="lbl">Recettes</div><div class="val rec">{{ number_format($d['recettes'], 0, ',', ' ') }} XOF</div></td>
      <td><div class="lbl">Dépenses</div><div class="val dep">{{ number_format($d['depenses'], 0, ',', ' ') }} XOF</div></td>
      <td><div class="lbl">Solde</div><div class="val sol">{{ number_format($d['solde'], 0, ',', ' ') }} XOF</div></td>
    </tr>
  </table>

  <h3>Recettes par mode de paiement</h3>
  <table class="data">
    <tr><th>Mode</th><th style="text-align:right">Montant (XOF)</th></tr>
    @forelse($d['recettes_par_mode'] as $r)
      <tr><td>{{ $r['method'] ?: '—' }}</td><td class="r">{{ number_format($r['total'], 0, ',', ' ') }}</td></tr>
    @empty
      <tr><td colspan="2">Aucune recette sur la période.</td></tr>
    @endforelse
  </table>

  <h3>Dépenses par catégorie</h3>
  <table class="data">
    <tr><th>Catégorie</th><th style="text-align:right">Montant (XOF)</th></tr>
    @forelse($d['depenses_par_categorie'] as $r)
      <tr><td>{{ $r['category'] }}</td><td class="r">{{ number_format($r['total'], 0, ',', ' ') }}</td></tr>
    @empty
      <tr><td colspan="2">Aucune dépense sur la période.</td></tr>
    @endforelse
  </table>

  <div class="foot">Document généré par Economat le {{ date('d/m/Y H:i') }}</div>
</body>
</html>
