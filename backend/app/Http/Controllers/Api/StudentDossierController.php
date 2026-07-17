<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dossiers & frais annexes des élèves + photo (tables auxiliaires).
 */
class StudentDossierController extends Controller
{
    private const DOSSIER = 'ECO_DOSSIER_ELEVE';
    private const PHOTO = 'ECO_ELEVE_PHOTO';

    private function ensureDossier(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::DOSSIER)) {
                Schema::connection('economat')->create(self::DOSSIER, function ($t) {
                    $t->increments('id');
                    $t->string('MATRICULE', 50);
                    $t->string('CODE', 50)->nullable();
                    $t->string('LIBELLE', 200)->nullable();
                    $t->decimal('MONTANT', 18, 2)->nullable();
                    $t->integer('QUANTITE')->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    private function ensurePhoto(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::PHOTO)) {
                Schema::connection('economat')->create(self::PHOTO, function ($t) {
                    $t->increments('id');
                    $t->string('MATRICULE', 50);
                    $t->text('PHOTO')->nullable();
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) { return false; }
    }

    public function index(Request $request)
    {
        if (! $this->ensureDossier()) return response()->json([]);
        try {
            return response()->json(DB::connection('economat')->table(self::DOSSIER)
                ->when($request->matricule, fn ($q, $m) => $q->where('MATRICULE', $m))
                ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
                ->get()->map(fn ($r) => [
                    'id' => $r->id, 'matricule' => $r->MATRICULE, 'code' => $r->CODE,
                    'libelle' => $r->LIBELLE, 'montant' => $r->MONTANT !== null ? (float) $r->MONTANT : null,
                    'quantite' => $r->QUANTITE,
                ])->values());
        } catch (\Throwable $e) { return response()->json([]); }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string', 'max:50'],
            'code' => ['nullable', 'string', 'max:50'],
            'libelle' => ['nullable', 'string', 'max:200'],
            'montant' => ['nullable', 'numeric', 'min:0'],
            'quantite' => ['nullable', 'integer', 'min:0'],
        ]);
        if (! $this->ensureDossier()) return response()->json(['message' => 'Table indisponible.'], 422);
        try {
            $id = DB::connection('economat')->table(self::DOSSIER)->insertGetId([
                'MATRICULE' => $data['matricule'], 'CODE' => $data['code'] ?? null,
                'LIBELLE' => $data['libelle'] ?? null, 'MONTANT' => $data['montant'] ?? null,
                'QUANTITE' => $data['quantite'] ?? null,
                'CODESOCIETE' => SocieteContext::current(), 'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['id' => $id] + $data, 201);
    }

    public function destroy(string $dossier)
    {
        if (! $this->ensureDossier()) return response()->json(['message' => 'Table indisponible.'], 422);
        try { DB::connection('economat')->table(self::DOSSIER)->where('id', $dossier)->delete(); }
        catch (\Throwable $e) { return response()->json(['message' => 'Suppression impossible.'], 422); }
        return response()->json(['message' => 'Ligne supprimée.']);
    }

    public function showPhoto(Request $request, string $matricule)
    {
        if (! $this->ensurePhoto()) return response()->json(['photo' => null]);
        try {
            $row = DB::connection('economat')->table(self::PHOTO)->where('MATRICULE', $matricule)->first();
            return response()->json(['photo' => $row->PHOTO ?? null]);
        } catch (\Throwable $e) { return response()->json(['photo' => null]); }
    }

    public function storePhoto(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string', 'max:50'],
            'photo' => ['nullable', 'string'],
        ]);
        if (! $this->ensurePhoto()) return response()->json(['message' => 'Table indisponible.'], 422);
        try {
            DB::connection('economat')->table(self::PHOTO)->where('MATRICULE', $data['matricule'])->delete();
            DB::connection('economat')->table(self::PHOTO)->insert([
                'MATRICULE' => $data['matricule'], 'PHOTO' => $data['photo'] ?? null,
                'CODESOCIETE' => SocieteContext::current(), 'CODEETABLISSEMENT' => EtablissementContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Photo non enregistrée : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Photo enregistrée.']);
    }
}
