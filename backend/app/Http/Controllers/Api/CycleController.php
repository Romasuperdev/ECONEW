<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cycle;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CycleController extends Controller
{
    public function index()
    {
        return Cycle::available()->map->toNormalized()->values();
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:20'],
            'position' => ['nullable', 'integer'],
        ]);

        try {
            $cycle = Cycle::create([
                'LibelleCycle' => $data['name'],
                'CodeCycle' => ($data['code'] ?? null) ?: $this->genCode('CYC'),
                'CodeEtab' => \App\Support\EtablissementContext::current(),
                'Primaire' => 0,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Création impossible : '.$e->getMessage()], 422);
        }

        return response()->json($cycle->toNormalized(), 201);
    }

    public function update(Request $request, Cycle $cycle)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'position' => ['nullable', 'integer'],
        ]);
        try {
            $cycle->update(['LibelleCycle' => $data['name']]);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Modification impossible : '.$e->getMessage()], 422);
        }

        return $cycle->toNormalized();
    }

    public function destroy(Cycle $cycle)
    {
        try {
            $cycle->delete();
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible : '.$e->getMessage()], 422);
        }
        return response()->json(['message' => 'Cycle supprimé.']);
    }

    private function genCode(string $prefix): string
    {
        return $prefix.'-'.strtoupper(Str::random(5));
    }
}
