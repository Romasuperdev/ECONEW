<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaiementDossier;
use App\Models\Prerequis;
use App\Models\Student;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration « Dossiers & Frais annexes » : CRUD sur la table existante T_PREREQUIS.
 * Mapping des colonnes détecté dynamiquement (voir modèle Prerequis).
 */
class PrerequisController extends Controller
{
    private const QTE_TABLE = 'ECO_PREREQUIS_QTE';

    private function tableOk(): bool
    {
        try {
            return Schema::connection('economat')->hasTable('T_PREREQUIS');
        } catch (\Throwable $e) {
            return false;
        }
    }

    /** Table auxiliaire pour la quantité et le montant unitaire (créée au besoin). */
    private function ensureQte(): void
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::QTE_TABLE)) {
                Schema::connection('economat')->create(self::QTE_TABLE, function ($t) {
                    $t->string('PREREQUIS_ID', 50)->primary();
                    $t->integer('QUANTITE')->default(1);
                    $t->decimal('MONTANT_UNITAIRE', 18, 2)->default(0);
                });
            }
        } catch (\Throwable $e) {}
    }

    private function saveQte($id, int $quantite, float $unitaire): void
    {
        if ($id === null || $id === '') { return; }
        $this->ensureQte();
        try {
            DB::connection('economat')->table(self::QTE_TABLE)->updateOrInsert(
                ['PREREQUIS_ID' => (string) $id],
                ['QUANTITE' => max(1, $quantite), 'MONTANT_UNITAIRE' => $unitaire]
            );
        } catch (\Throwable $e) {}
    }

    /** Map id -> ['quantite'=>, 'unitaire'=>]. */
    private function qteMap(): array
    {
        $this->ensureQte();
        $map = [];
        try {
            foreach (DB::connection('economat')->table(self::QTE_TABLE)->get() as $r) {
                $map[(string) $r->PREREQUIS_ID] = ['quantite' => (int) $r->QUANTITE, 'unitaire' => (float) $r->MONTANT_UNITAIRE];
            }
        } catch (\Throwable $e) {}
        return $map;
    }

    public function index(Request $request)
    {
        if (! $this->tableOk()) {
            return response()->json(['message' => "La table T_PREREQUIS est introuvable dans la base."], 422);
        }
        $m = Prerequis::mapping();
        try {
            $q = Prerequis::forTenant();
            if (($n = $request->query('niveau_id')) && $m['niveau']) { $q->where($m['niveau'], $n); }
            if (($c = $request->query('classe_id')) && $m['classe']) { $q->where($m['classe'], $c); }
            if (($a = $request->query('annee_scolaire_id')) && $m['annee']) { $q->where($m['annee'], $a); }
            $qte = $this->qteMap();
            $rows = $q->get()->map(function ($r) use ($qte) {
                $n = $r->toNormalized();
                $total = (float) ($n['montant'] ?? 0);           // T_PREREQUIS.montant = total (avec quantité)
                $info = $qte[(string) ($n['id'] ?? '')] ?? null;
                $n['quantite'] = $info['quantite'] ?? 1;
                $n['montant_unitaire'] = $info['unitaire'] ?? $total;   // à défaut, unitaire = total (qté 1)
                $n['montant_total'] = $total;
                return $n;
            })->values();
        } catch (\Throwable $e) {
            $rows = collect();
        }

        return response()->json([
            'data' => $rows,
            '_meta' => [
                'colonnes_detectees' => $m,     // aide au diagnostic / ajustement
                'table' => 'T_PREREQUIS',
            ],
        ]);
    }

    private function payload(array $data): array
    {
        $m = Prerequis::mapping();
        $row = [];
        $put = function ($logical, $value) use (&$row, $m) {
            if ($m[$logical]) { $row[$m[$logical]] = $value; }
        };
        $put('libelle', $data['libelle'] ?? null);
        $put('montant', $data['montant'] ?? 0);
        $put('niveau', $data['niveau_code'] ?? null);
        $put('classe', $data['classe_code'] ?? null);
        $put('annee', $data['annee'] ?? AnneeContext::current());
        $put('type', $data['type'] ?? null);
        $put('societe', SocieteContext::current());
        $put('etab', EtablissementContext::current());
        return $row;
    }

    public function store(Request $request)
    {
        if (! $this->tableOk()) {
            return response()->json(['message' => "Table T_PREREQUIS introuvable."], 422);
        }
        $data = $request->validate([
            'libelle' => ['required', 'string', 'max:150'],
            'montant' => ['required', 'numeric', 'min:0'],   // montant unitaire
            'quantite' => ['nullable', 'integer', 'min:1'],
            'niveau_code' => ['nullable', 'string', 'max:50'],
            'classe_code' => ['nullable', 'string', 'max:50'],
            'annee' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:50'],
        ]);
        $unitaire = (float) $data['montant'];
        $quantite = (int) ($data['quantite'] ?? 1);
        $data['montant'] = round($unitaire * max(1, $quantite), 2);   // T_PREREQUIS.montant = total
        $row = $this->payload($data);
        if (empty($row)) {
            return response()->json(['message' => "Aucune colonne exploitable détectée dans T_PREREQUIS. Merci de confirmer sa structure."], 422);
        }
        try {
            $id = DB::connection('economat')->table('T_PREREQUIS')->insertGetId($row);
        } catch (\Throwable $e) {
            // PK non auto-incrémentée : on tente un insert simple.
            try {
                DB::connection('economat')->table('T_PREREQUIS')->insert($row);
                $id = null;
            } catch (\Throwable $e2) {
                return response()->json(['message' => "Enregistrement impossible : ".$e2->getMessage()], 422);
            }
        }
        $this->saveQte($id, $quantite, $unitaire);
        AuditLogger::log('create', 'Prérequis (frais dossier/annexe) : '.($data['libelle'] ?? ''));
        return response()->json(['id' => $id, 'message' => 'Frais enregistré.'], 201);
    }

    public function update(Request $request, string $id)
    {
        if (! $this->tableOk()) {
            return response()->json(['message' => "Table T_PREREQUIS introuvable."], 422);
        }
        $data = $request->validate([
            'libelle' => ['nullable', 'string', 'max:150'],
            'montant' => ['nullable', 'numeric', 'min:0'],   // montant unitaire
            'quantite' => ['nullable', 'integer', 'min:1'],
            'niveau_code' => ['nullable', 'string', 'max:50'],
            'classe_code' => ['nullable', 'string', 'max:50'],
            'annee' => ['nullable', 'string', 'max:50'],
            'type' => ['nullable', 'string', 'max:50'],
        ]);
        $m = Prerequis::mapping();
        $pk = $m['pk'] ?? null;
        if (! $pk) {
            return response()->json(['message' => "Clé primaire de T_PREREQUIS non détectée."], 422);
        }
        $unitaire = array_key_exists('montant', $data) && $data['montant'] !== null ? (float) $data['montant'] : null;
        $quantite = (int) ($data['quantite'] ?? 1);
        if ($unitaire !== null) {
            $data['montant'] = round($unitaire * max(1, $quantite), 2);   // total
        }
        $row = array_filter($this->payload($data), fn ($v) => $v !== null);
        try {
            $n = DB::connection('economat')->table('T_PREREQUIS')->where($pk, $id)->update($row);
        } catch (\Throwable $e) {
            return response()->json(['message' => "Modification impossible : ".$e->getMessage()], 422);
        }
        if ($unitaire !== null) { $this->saveQte($id, $quantite, $unitaire); }
        AuditLogger::log('update', "Prérequis #{$id} modifié");
        return response()->json(['message' => 'Frais mis à jour.', 'updated' => $n]);
    }

    /**
     * Suppression bloquée si des paiements de dossier existent déjà pour des élèves
     * du même niveau/année (intégrité du module « Réception des dossiers »).
     */
    public function destroy(string $id)
    {
        if (! $this->tableOk()) {
            return response()->json(['message' => "Table T_PREREQUIS introuvable."], 422);
        }
        $m = Prerequis::mapping();
        $pk = $m['pk'] ?? null;
        if (! $pk) {
            return response()->json(['message' => "Clé primaire de T_PREREQUIS non détectée."], 422);
        }

        try {
            $ligne = DB::connection('economat')->table('T_PREREQUIS')->where($pk, $id)->first();
        } catch (\Throwable $e) {
            $ligne = null;
        }
        if (! $ligne) {
            return response()->json(['message' => 'Ligne introuvable.'], 404);
        }

        // Contrôle d'intégrité : des paiements existent-ils pour ce niveau/année ?
        try {
            $niveau = $m['niveau'] ? ($ligne->{$m['niveau']} ?? null) : null;
            $annee = $m['annee'] ? ($ligne->{$m['annee']} ?? null) : AnneeContext::current();
            if ($niveau && Schema::connection('economat')->hasTable('paiements_dossiers')) {
                $mats = Student::query()->where('CodeNiveau', $niveau)->pluck('Matricule')->all();
                $used = ! empty($mats) && PaiementDossier::query()
                    ->whereIn('matricule_eleve', $mats)
                    ->when($annee, fn ($q) => $q->where('annee_scolaire_id', $annee))
                    ->exists();
                if ($used) {
                    return response()->json([
                        'message' => "Suppression impossible : des paiements de dossier ont déjà été enregistrés pour ce niveau. Modifiez la grille plutôt que de la supprimer.",
                    ], 409);
                }
            }
        } catch (\Throwable $e) {}

        try {
            DB::connection('economat')->table('T_PREREQUIS')->where($pk, $id)->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => "Suppression impossible : ".$e->getMessage()], 422);
        }
        AuditLogger::log('delete', "Prérequis #{$id} supprimé");
        return response()->json(['message' => 'Frais supprimé.']);
    }
}
