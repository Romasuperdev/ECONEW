<?php

namespace App\Support;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    /** Enregistre une action dans le journal d'activite (ECO_AUDIT). Ne bloque jamais l'action. */
    public static function log(string $action, ?string $description = null, $auditable = null): void
    {
        try {
            $user = Auth::user();
            ActivityLog::create([
                'USER_ID' => $user?->getKey(),
                'USER_LOGIN' => $user?->getAttribute('Login') ?? ($user?->name ?? null),
                'ACTION' => $action,
                'DESCRIPTION' => $description,
                'CODESOCIETE' => SocieteContext::current(),
                'CODEETABLISSEMENT' => EtablissementContext::current(),
                'IP' => request()?->ip(),
                'CREATED_AT' => now(),
            ]);
        } catch (\Throwable $e) {
            // journalisation best-effort : on n'interrompt jamais l'operation metier
        }
    }
}
