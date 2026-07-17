<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 12px; color:#1B2A4A; }
  .header { display:flex; justify-content:space-between; border-bottom:3px solid #2E9C9C; padding-bottom:10px; margin-bottom:20px; }
  .brand { font-size:22px; font-weight:bold; }
  .brand small { display:block; font-size:10px; color:#5A6B7B; font-weight:normal; }
  .doc-title h1 { margin:0; font-size:20px; color:#2E9C9C; text-align:right; }
  .box { border:1px solid #ddd; border-radius:6px; padding:15px; margin-top:15px; }
  .row { margin:6px 0; }
  .amount { font-size:26px; font-weight:bold; color:#2E9C9C; text-align:center; margin:20px 0; }
  .muted { color:#5A6B7B; }
  .label { display:inline-block; width:160px; color:#5A6B7B; }
</style>
</head>
<body>
  <div class="header">
    <div><div class="brand">{{ $school->name ?? 'Economat' }}<small>Gestion financière scolaire</small></div></div>
    <div class="doc-title"><h1>REÇU DE PAIEMENT</h1><div>N° {{ $payment->receipt_number }}</div></div>
  </div>

  <div class="amount">{{ number_format($payment->amount, 0, ',', ' ') }} {{ $currency }}</div>

  <div class="box">
    <div class="row"><span class="label">Reçu de</span> <strong>{{ $payment->student->full_name ?? '' }}</strong> ({{ $payment->student->matricule ?? '' }})</div>
    <div class="row"><span class="label">Facture</span> {{ $payment->invoice->number ?? '' }}</div>
    <div class="row"><span class="label">Date de paiement</span> {{ optional($payment->paid_at)->format('d/m/Y') }}</div>
    <div class="row"><span class="label">Mode de paiement</span> {{ ucfirst(str_replace('_',' ', $payment->method)) }}</div>
    @if($payment->reference)<div class="row"><span class="label">Référence</span> {{ $payment->reference }}</div>@endif
  </div>

  <div style="margin-top:60px; text-align:right;">
    <div class="muted">Signature & cachet</div>
    <div style="margin-top:40px; border-top:1px solid #333; width:200px; float:right;"></div>
  </div>
  <div style="clear:both; margin-top:40px; text-align:center; font-size:10px;" class="muted">
    Document généré par Economat le {{ now()->format('d/m/Y à H:i') }}
  </div>
</body>
</html>
