<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<style>
  * { font-family: DejaVu Sans, sans-serif; }
  body { font-size: 11px; color:#173a24; }
  h1 { color:#28a745; font-size:18px; margin:0 0 2px; }
  .s { color:#5c6b82; font-size:10px; margin-bottom:12px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#28a745; color:#fff; text-align:left; padding:6px 7px; font-size:10px; }
  td { padding:5px 7px; border-bottom:1px solid #eef3ee; }
  .tot { margin-top:12px; font-weight:bold; color:#1e7e34; }
</style></head><body>
  <h1>Liste des départs @if($type) — {{ ucfirst($type) }} @endif</h1>
  <div class="s">Nexora Economat — édité le {{ now()->format('d/m/Y à H:i') }} · {{ $total }} départ(s)</div>
  <table>
    <thead><tr>@foreach($headers as $h)<th>{{ $h }}</th>@endforeach</tr></thead>
    <tbody>
      @foreach($rows as $r)
        <tr>@foreach($r as $c)<td>{{ $c }}</td>@endforeach</tr>
      @endforeach
    </tbody>
  </table>
  <div class="tot">Total : {{ $total }} départ(s)</div>
</body></html>
