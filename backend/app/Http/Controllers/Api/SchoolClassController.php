<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use App\Support\UidRegistry;
use App\Models\Level;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    public function index(Request $request)
    {
        return SchoolClass::available()->map->toNormalized()->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'level_id' => ['nullable'], // Num du niveau
        ]);

        if ($this->codeExists($data['code'])) {
            return response()->json(['message' => 'Ce code de classe existe déjà.'], 422);
        }

        $codN = null;
        if (! empty($data['level_id'])) {
            $codN = optional(Level::find($data['level_id']))->CodeNiveau;
        }

        try {
            $class = SchoolClass::create([
                'LibelleClasse' => $data['name'],
                'CodeClasse' => $data['code'],
                'CodN' => $codN,
                'ANNEE' => AnneeContext::current() ?: config('economat.annee'),
                'CODEETABLISSEMENT' => \App\Support\EtablissementContext::current(),
                'CODESOCIETE' => SocieteContext::current(),
                'BoolClassExam' => 0,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }

        // UID interne géré côté application (en plus du code saisi).
        UidRegistry::assign('CLASSE', (string) $class->num);

        $out = $class->load('niveau')->toNormalized();
        $out['uid'] = UidRegistry::for('CLASSE', (string) $class->num);

        return response()->json($out, 201);
    }

    public function show(SchoolClass $schoolClass)
    {
        $out = $schoolClass->load('niveau')->loadCount('students')->toNormalized();
        $out['uid'] = UidRegistry::for('CLASSE', (string) $schoolClass->num);

        return $out;
    }

    public function update(Request $request, SchoolClass $schoolClass)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'level_id' => ['nullable'],
        ]);

        if ($this->codeExists($data['code'], $schoolClass->num)) {
            return response()->json(['message' => 'Ce code de classe existe déjà.'], 422);
        }

        $payload = [
            'LibelleClasse' => $data['name'],
            'CodeClasse' => $data['code'],
        ];
        if (array_key_exists('level_id', $data)) {
            $payload['CodN'] = $data['level_id'] ? optional(Level::find($data['level_id']))->CodeNiveau : null;
        }
        try {
            $schoolClass->update($payload);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        $out = $schoolClass->load('niveau')->toNormalized();
        $out['uid'] = UidRegistry::for('CLASSE', (string) $schoolClass->num);

        return $out;
    }

    public function destroy(SchoolClass $schoolClass)
    {
        try {
            $schoolClass->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Classe supprimée.']);
    }

    /** Vrai si le code existe déjà (hors classe en cours d'édition). */
    private function codeExists(string $code, $exceptNum = null): bool
    {
        try {
            return SchoolClass::query()
                ->where('CodeClasse', $code)
                ->when($exceptNum, fn ($q) => $q->where('num', '!=', $exceptNum))
                ->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }
}
