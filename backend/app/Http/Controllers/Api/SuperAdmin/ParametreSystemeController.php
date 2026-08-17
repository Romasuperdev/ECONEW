<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ParametreSysteme;
use App\Support\AuditLogger;
use Illuminate\Http\Request;

/**
 * Paramètres système globaux (console Super Admin).
 * Configuration par défaut SMS/mail, quotas, etc. — stockage clé/valeur.
 */
class ParametreSystemeController extends Controller
{
    /** Paramètres proposés par défaut (créés vides au premier accès). */
    private const DEFAUTS = [
        ['cle' => 'sms_expediteur', 'description' => 'Nom/expéditeur SMS par défaut'],
        ['cle' => 'sms_api_key', 'description' => 'Clé API SMS par défaut'],
        ['cle' => 'mail_from', 'description' => 'Adresse e-mail expéditrice par défaut'],
        ['cle' => 'mail_from_name', 'description' => "Nom de l'expéditeur e-mail par défaut"],
        ['cle' => 'quota_sms_mensuel', 'description' => 'Quota SMS mensuel par établissement'],
        ['cle' => 'quota_eleves', 'description' => "Nombre maximum d'élèves par établissement"],
        ['cle' => 'support_contact', 'description' => 'Contact support affiché aux établissements'],
    ];

    public function index()
    {
        ParametreSysteme::ensureTable();
        // Crée les paramètres suggérés s'ils n'existent pas encore.
        try {
            foreach (self::DEFAUTS as $d) {
                ParametreSysteme::firstOrCreate(['cle' => $d['cle']], ['valeur' => null, 'description' => $d['description']]);
            }
        } catch (\Throwable $e) {
        }

        $rows = ParametreSysteme::query()->orderBy('cle')->get()
            ->map(fn ($p) => ['cle' => $p->cle, 'valeur' => $p->valeur, 'description' => $p->description]);

        return response()->json(['data' => $rows->values()]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'parametres' => ['required', 'array'],
            'parametres.*.cle' => ['required', 'string', 'max:100'],
            'parametres.*.valeur' => ['nullable', 'string'],
            'parametres.*.description' => ['nullable', 'string', 'max:255'],
        ]);

        ParametreSysteme::ensureTable();
        foreach ($data['parametres'] as $p) {
            ParametreSysteme::updateOrCreate(
                ['cle' => $p['cle']],
                ['valeur' => $p['valeur'] ?? null, 'description' => $p['description'] ?? null]
            );
        }
        AuditLogger::log('update', 'Mise à jour des paramètres système ('.count($data['parametres']).' clé(s))');

        return response()->json(['message' => 'Paramètres enregistrés.']);
    }
}
