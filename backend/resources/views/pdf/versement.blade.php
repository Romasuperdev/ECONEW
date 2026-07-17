<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 12px; color:#1B2A4A; }
  .header { display:flex; justify-content:space-between; border-bottom:3px solid #2E9C9C; padding-bottom:10px; margin-bottom:20px; }
  .brand { font-size:22px; font-weight:bold; }
  .brand small { display:block; font-size:10px; color:#5A6B7B; font-weight:normal; }
  .doc h1 { margin:0; font-size:20px; color:#2E9C9C; text-align:right; }
  .amount { font-size:26px; font-weight:bold; color:#2E9C9C; text-align:center; margin:20px 0; }
  .box { border:1px solid #ddd; border-radius:6px; padding:15px; margin-top:10px; }
  .row { margin:6px 0; }
  .label { display:inline-block; width:170px; color:#5A6B7B; }
  .muted { color:#5A6B7B; }
</style></head><body>
  <div class="header">
    <div><div class="brand">{{ $societe }}<small>Reçu de versement — Economat</small></div></div>
    <div class="doc"><h1>REÇU</h1><div>N° {{ $recu }}</div></div>
  </div>
  <div class="amount">{{ number_format((float)$montant, 0, ',', ' ') }} {{ $devise }}</div>
  <div class="box">
    <div class="row"><span class="label">Reçu de l'élève</span> <strong>{{ $eleve }}</strong> ({{ $matricule }})</div>
    <div class="row"><span class="label">Date</span> {{ $date }}</div>
    <div class="row"><span class="label">Mode de paiement</span> {{ $mode }}</div>
    <div class="row"><span class="label">Motif</span> {{ $libelle }}</div>
  </div>
  <div style="margin-top:60px; text-align:right;">
    <div class="muted">Signature & cachet</div>
    <div style="margin-top:40px; border-top:1px solid #333; width:200px; float:right;"></div>
  </div>
  <div style="clear:both; margin-top:40px; text-align:center; font-size:10px;" class="muted">Généré par Economat le {{ now()->format('d/m/Y à H:i') }}</div>
</body></html>
