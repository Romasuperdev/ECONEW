<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; color:#1f2937;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="background:#1B2A4A;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0;">
      <span style="font-size:20px;font-weight:bold;">Economat</span>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
      <p>Bonjour,</p>
      <p>Veuillez trouver ci-joint le reçu <strong>{{ $d['recu'] ?? '' }}</strong>
         d'un montant de <strong>{{ number_format((float)($d['montant'] ?? 0), 0, ',', ' ') }} {{ $d['devise'] ?? 'XOF' }}</strong>
         @if(!empty($d['eleve'])) concernant l'élève <strong>{{ $d['eleve'] }}</strong>@endif.</p>
      @if(!empty($d['date']))<p style="color:#6b7280;">Date : {{ $d['date'] }}</p>@endif
      <p style="color:#6b7280;font-size:13px;">Ce message est généré automatiquement par la plateforme Economat.</p>
    </div>
  </div>
</body>
</html>
