<?php

namespace App\Http\Controllers\Api\AdminEtablissement;

use App\Http\Controllers\Controller;
use App\Models\Etablissement;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Paramètres propres à l'établissement (SMS/e-mail, infos générales, logo).
 * Stockage clé/valeur scopé par établissement (table ECO_ETAB_PARAMS, economat).
 */
class ParametreEtablissementController extends Controller
{
    private const TABLE = 'ECO_ETAB_PARAMS';

    private const DEFAUTS = [
        ['cle' => 'sms_expediteur', 'libelle' => 'Expéditeur SMS'],
        ['cle' => 'sms_api_key', 'libelle' => 'Clé API SMS'],
        ['cle' => 'mail_from', 'libelle' => 'E-mail expéditeur'],
        ['cle' => 'mail_from_name', 'libelle' => "Nom de l'expéditeur e-mail"],
        ['cle' => 'telephone', 'libelle' => 'Téléphone'],
        ['cle' => 'adresse', 'libelle' => 'Adresse'],
        ['cle' => 'email', 'libelle' => 'E-mail de contact'],
        ['cle' => 'logo_url', 'libelle' => 'Logo (URL)'],
    ];

    private function ensure(): void
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                    $t->string('CLE', 60);
                    $t->text('VALEUR')->nullable();
                });
            }
        } catch (\Throwable $e) {}
    }

    public function index()
    {
        $this->ensure();
        $etab = EtablissementContext::current();
        $stored = [];
        try {
            $rows = DB::connection('economat')->table(self::TABLE)
                ->when($etab, fn ($q) => $q->where('CODEETABLISSEMENT', $etab))->get();
            foreach ($rows as $r) { $stored[$r->CLE] = $r->VALEUR; }
        } catch (\Throwable $e) {}

        $parametres = array_map(fn ($d) => [
            'cle' => $d['cle'], 'libelle' => $d['libelle'], 'valeur' => $stored[$d['cle']] ?? null,
        ], self::DEFAUTS);

        return response()->json([
            'etablissement' => [
                'code' => $etab,
                'name' => Etablissement::currentName(),
                'societe' => SocieteContext::current(),
            ],
            'parametres' => $parametres,
        ]);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'parametres' => ['required', 'array'],
            'parametres.*.cle' => ['required', 'string', 'max:60'],
            'parametres.*.valeur' => ['nullable', 'string'],
        ]);
        $this->ensure();
        $etab = EtablissementContext::current();
        foreach ($data['parametres'] as $p) {
            try {
                DB::connection('economat')->table(self::TABLE)->updateOrInsert(
                    ['CODEETABLISSEMENT' => $etab, 'CLE' => $p['cle']],
                    ['VALEUR' => $p['valeur'] ?? null]
                );
            } catch (\Throwable $e) {}
        }
        AuditLogger::log('update', "Paramètres établissement mis à jour ({$etab})");

        return response()->json(['message' => 'Paramètres enregistrés.']);
    }
}
