<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\Societe;
use App\Support\AuditLogger;
use Illuminate\Http\Request;

class SocieteController extends Controller
{
    public function index(Request $request)
    {
        try {
            return Societe::query()
                ->when($request->search, fn ($q, $s) => $q->where('NOMSOCIETE', 'like', "%$s%")->orWhere('CODESOCIETE', 'like', "%$s%"))
                ->orderBy('NOMSOCIETE')->get()->map->toNormalized();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30'],
            'name' => ['required', 'string', 'max:255'],
            'ville' => ['nullable', 'string'],
            'pays' => ['nullable', 'string'],
            'telephone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'adresse' => ['nullable', 'string'],
            'activite' => ['nullable', 'string'],
            'base' => ['nullable', 'string'],
            'representant' => ['nullable', 'string'],
        ]);

        $s = new Societe();
        $s->CODESOCIETE = $data['code'];
        $s->NOMSOCIETE = $data['name'];
        $s->VILLESOCIETE = $data['ville'] ?? null;
        $s->PAYSSOCIETE = $data['pays'] ?? null;
        $s->TELSOCIETE = $data['telephone'] ?? null;
        $s->EMAILSOCIETE = $data['email'] ?? null;
        $s->ADRESSE = $data['adresse'] ?? null;
        $s->ACTIVITESOCIETE = $data['activite'] ?? null;
        $s->NOMBASE = $data['base'] ?? null;
        $s->NOMPRENOMREPRESENTANT = $data['representant'] ?? null;
        // valeurs par defaut pour colonnes numeriques eventuellement NOT NULL
        foreach (['NB_ETAB', 'NB_APPART', 'NB_USER'] as $c) {
            try { $s->{$c} = 0; } catch (\Throwable $e) {}
        }
        $s->save();
        AuditLogger::log('create', "Création société {$s->NOMSOCIETE}");

        return response()->json($s->toNormalized(), 201);
    }

    public function show(Societe $societe)
    {
        return $societe->toNormalized();
    }

    public function update(Request $request, Societe $societe)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'ville' => ['nullable', 'string'],
            'pays' => ['nullable', 'string'],
            'telephone' => ['nullable', 'string'],
            'email' => ['nullable', 'email'],
            'adresse' => ['nullable', 'string'],
            'activite' => ['nullable', 'string'],
            'base' => ['nullable', 'string'],
            'representant' => ['nullable', 'string'],
        ]);
        $map = [
            'name' => 'NOMSOCIETE', 'ville' => 'VILLESOCIETE', 'pays' => 'PAYSSOCIETE',
            'telephone' => 'TELSOCIETE', 'email' => 'EMAILSOCIETE', 'adresse' => 'ADRESSE',
            'activite' => 'ACTIVITESOCIETE', 'base' => 'NOMBASE', 'representant' => 'NOMPRENOMREPRESENTANT',
        ];
        foreach ($map as $in => $col) {
            if (array_key_exists($in, $data)) $societe->{$col} = $data[$in];
        }
        $societe->save();
        AuditLogger::log('update', "Modification société {$societe->NOMSOCIETE}");

        return $societe->toNormalized();
    }

    public function destroy(Societe $societe)
    {
        $name = $societe->NOMSOCIETE;
        $societe->delete();
        AuditLogger::log('delete', "Suppression société {$name}");

        return response()->json(['message' => 'Société supprimée.']);
    }
}
