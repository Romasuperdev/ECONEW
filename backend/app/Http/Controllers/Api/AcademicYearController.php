<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SocieteContext;
use App\Models\AcademicYear;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use App\Support\UidRegistry;

class AcademicYearController extends Controller
{
    public function index()
    {
        try {
            return AcademicYear::forTenant()->orderByDesc('DEBUT')->get()->map->toNormalized();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->rules($request);

        $year = AcademicYear::create([
            'CodeAnnee' => $data['code'] ?? $this->genCode($data['label']),
            'LibelleAnnee' => $data['label'],
            'DEBUT' => $data['start_date'] ?? null,
            'FIN' => $data['end_date'] ?? null,
            'Activer' => 0,
            'CloturePartielle' => 0,
            'ClotureDefinitive' => 0,
            'CODESOCIETE' => SocieteContext::current(),
        ]);

        UidRegistry::assign('ANNEE', (string) $year->CodeAnnee);
        AuditLogger::log('create', "Création année scolaire {$year->LibelleAnnee}");

        return response()->json($year->toNormalized(), 201);
    }

    public function update(Request $request, AcademicYear $academicYear)
    {
        $data = $this->rules($request);
        $academicYear->update([
            'LibelleAnnee' => $data['label'],
            'DEBUT' => $data['start_date'] ?? $academicYear->DEBUT,
            'FIN' => $data['end_date'] ?? $academicYear->FIN,
        ]);

        return $academicYear->toNormalized();
    }

    /** Ouvrir / activer l'année (une seule active par société). */
    public function activate(AcademicYear $academicYear)
    {
        if ((int) $academicYear->ClotureDefinitive === 1) {
            return response()->json(['message' => 'Année clôturée définitivement : réouverture impossible.'], 422);
        }
        AcademicYear::forTenant()->where('CodeAnnee', '!=', $academicYear->CodeAnnee)->update(['Activer' => 0]);
        $academicYear->update(['Activer' => 1]);
        AuditLogger::log('update', "Ouverture année {$academicYear->LibelleAnnee}");

        return $academicYear->toNormalized();
    }

    /** Clôture partielle. */
    public function closePartial(AcademicYear $academicYear)
    {
        $academicYear->update(['CloturePartielle' => 1]);
        AuditLogger::log('update', "Clôture partielle année {$academicYear->LibelleAnnee}");

        return $academicYear->toNormalized();
    }

    /** Clôture définitive. */
    public function closeDefinitive(AcademicYear $academicYear)
    {
        $academicYear->update(['ClotureDefinitive' => 1, 'CloturePartielle' => 1, 'Activer' => 0]);
        AuditLogger::log('update', "Clôture définitive année {$academicYear->LibelleAnnee}");

        return $academicYear->toNormalized();
    }

    public function destroy(AcademicYear $academicYear)
    {
        if ((int) $academicYear->Activer === 1) {
            return response()->json(['message' => 'Impossible de supprimer une année active.'], 422);
        }
        $academicYear->delete();

        return response()->json(['message' => 'Année supprimée.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'code' => ['nullable', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
        ]);
    }

    private function genCode(string $label): string
    {
        $base = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $label));
        return $base !== '' ? substr($base, 0, 18) : 'AN'.strtoupper(Str::random(6));
    }
}
