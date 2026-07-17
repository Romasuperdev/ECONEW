<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use App\Models\Level;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Support\UidRegistry;

class LevelController extends Controller
{
    // Cycles fixes autorisés (non paramétrables).
    private const CYCLES = ['PREMIER', 'SECOND'];

    public function index(Request $request)
    {
        return Level::available()->map->toNormalized()->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['nullable', 'string', 'max:50'],
            'name' => ['required', 'string', 'max:255'],
            'cycle' => ['nullable', 'string', 'in:'.implode(',', self::CYCLES)],
            'is_exam' => ['nullable', 'boolean'],
        ]);

        $code = $data['code'] ?? null;
        if ($code && $this->codeExists($code)) {
            return response()->json(['message' => 'Ce code de niveau existe déjà.'], 422);
        }
        $code = $this->uniqueCode($code, 'NIV');

        try {
            $level = Level::create([
                'LibelleNiveau' => $data['name'],
                'CodeNiveau' => $code,
                'CodeCycle' => $data['cycle'] ?? null,
                'NiveauExamen' => ! empty($data['is_exam']) ? 1 : 0,
                'Ordre' => $this->nextOrdre(),
                'ANNEE' => AnneeContext::current() ?: config('economat.annee'),
                'CODEETABLISSEMENT' => \App\Support\EtablissementContext::current(),
                'CODESOCIETE' => SocieteContext::current(),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }

        UidRegistry::assign('NIVEAU', (string) $level->Num);

        return response()->json($level->toNormalized(), 201);
    }

    public function update(Request $request, Level $level)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'cycle' => ['nullable', 'string', 'in:'.implode(',', self::CYCLES)],
            'is_exam' => ['nullable', 'boolean'],
        ]);

        $payload = ['LibelleNiveau' => $data['name']];
        if (array_key_exists('cycle', $data)) {
            $payload['CodeCycle'] = $data['cycle'] ?: null;
        }
        if (array_key_exists('is_exam', $data)) {
            $payload['NiveauExamen'] = ! empty($data['is_exam']) ? 1 : 0;
        }
        try {
            $level->update($payload);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        return $level->toNormalized();
    }

    public function destroy(Level $level)
    {
        try {
            $level->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Niveau supprimé.']);
    }

    /** Ordre suivant (max + 1) dans le périmètre société/année. */
    private function nextOrdre(): int
    {
        try {
            $max = (int) Level::query()
                ->when(SocieteContext::current(), fn ($q, $s) => $q->where('CODESOCIETE', $s))
                ->when(AnneeContext::current(), fn ($q, $a) => $q->where('ANNEE', $a))
                ->max('Ordre');
            return $max + 1;
        } catch (\Throwable $e) {
            return 1;
        }
    }

    /** Code unique : reprend celui fourni s'il est libre, sinon en génère un. */
    private function uniqueCode(?string $wanted, string $prefix): string
    {
        $code = $wanted ?: $this->genCode($prefix);
        $guard = 0;
        while ($this->codeExists($code) && $guard < 20) {
            $code = $this->genCode($prefix);
            $guard++;
        }
        return $code;
    }

    private function codeExists(string $code): bool
    {
        try {
            return Level::query()->where('CodeNiveau', $code)->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function genCode(string $prefix): string
    {
        return $prefix.'-'.strtoupper(Str::random(8));
    }
}
