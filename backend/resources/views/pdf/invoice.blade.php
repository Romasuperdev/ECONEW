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
  .row { width: 100%; margin: 14px 0; }
  .row td { vertical-align: top; }
  .box { color: #374151; font-size: 12px; }
  h3 { color: #1B2A4A; font-size: 13px; margin: 16px 0 6px; }
  table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.data th { background: #1B2A4A; color: #fff; text-align: left; padding: 7px 8px; font-size: 11px; }
  table.data td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; }
  table.data td.r, table.data th.r { text-align: right; }
  .totaux { width: 45%; margin-left: 55%; margin-top: 10px; border-collapse: collapse; }
  .totaux td { padding: 5px 8px; }
  .totaux .lbl { color: #6b7280; }
  .totaux .tot { font-weight: bold; color: #1B2A4A; border-top: 2px solid #1B2A4A; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 10px; font-weight: bold; }
  .foot { margin-top: 26px; color: #9ca3af; font-size: 9px; text-align: center; }
  .num { color: #D9A441; font-weight: bold; }
</style>
</head>
<body>
  <div class="head">
    <table style="width:100%"><tr>
      <td><div class="brand">Economat</div><div class="sub">Société {{ $societe }}</div></td>
      <td style="text-align:right"><div class="num">{{ $inv['number'] }}</div><div class="sub">Reçu de paiement</div></td>
    </tr></table>
  </div>

  <table class="row"><tr>
    <td class="box" style="width:60%">
      <strong>Élève</strong><br>
      {{ $inv['student']['full_name'] ?? '' }}<br>
      <span class="sub">Matricule : {{ $inv['matricule'] }}</span>
    </td>
    <td class="box" style="text-align:right">
      Émission : {{ $inv['issue_date'] }}<br>
      @if(!empty($inv['due_date']))Échéance : {{ $inv['due_date'] }}<br>@endif
      Statut : <span class="badge" style="background:#eef2ff;color:#1B2A4A">{{ $inv['status'] }}</span>
    </td>
  </tr></table>

  <table class="data">
    <tr><th>Désignation</th><th class="r">Montant (XOF)</th></tr>
    @forelse($inv['items'] as $it)
      <tr><td>{{ $it['label'] }}</td><td class="r">{{ number_format($it['amount'], 0, ',', ' ') }}</td></tr>
    @empty
      <tr><td colspan="2">Aucune ligne.</td></tr>
    @endforelse
  </table>

  <table class="totaux">
    <tr><td class="lbl">Total</td><td class="r">{{ number_format($inv['total_amount'], 0, ',', ' ') }}</td></tr>
    <tr><td class="lbl">Payé</td><td class="r">{{ number_format($inv['paid_amount'], 0, ',', ' ') }}</td></tr>
    <tr><td class="tot">Solde</td><td class="r tot">{{ number_format($inv['balance'], 0, ',', ' ') }} XOF</td></tr>
  </table>

  <div class="foot">Document généré par Economat le {{ date('d/m/Y H:i') }}</div>
</body>
</html>
