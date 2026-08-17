<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Depart;
use App\Models\Destination;
use App\Models\Student;
use App\Support\AuditLogger;
use App\Support\SimpleXlsx;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;

/**
 * Module « Départ » : définitif / cantine / pension / transport.
 * La table `departs` fait foi pour l'état d'activation des services
 * (un service est désactivé s'il existe un départ non annulé de ce type).
 * L'historique des paiements n'est jamais modifié.
 */
class DepartController extends Controller
{
    private const TABLE = 'departs';
    private const STATUT_DEFINITIF = 'Départ définitif';

    private function ensure(): bool
    {
        try {
            if (Schema::connection('economat')->hasTable(self::TABLE)) {
                return true;
            }
            Schema::connection('economat')->create(self::TABLE, function ($t) {
                $t->increments('id');
                $t->string('code_societe', 50)->nullable();
                $t->string('etablissement_id', 50)->nullable();
                $t->string('eleve_id', 50);
                $t->string('annee_scolaire_id', 50)->nullable();
                $t->string('type_depart', 20);
                $t->date('date_depart')->nullable();
                $t->string('motif', 255)->nullable();
                $t->string('circuit_transport_id', 50)->nullable();
                $t->text('observations')->nullable();
                $t->string('previous_statut', 50)->nullable();
                $t->string('user_id', 50)->nullable();
                $t->string('created_by', 50)->nullable();
                $t->string('updated_by', 50)->nullable();
                $t->string('deleted_by', 50)->nullable();
                $t->string('motif_annulation', 255)->nullable();
                $t->timestamps();
                $t->softDeletes();
            });
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    /* ---------------- Effets métier par type ---------------- */

    /** Applique l'effet du départ (désactivation service / statut élève). */
    private function applyEffect(Depart $d): void
    {
        if ($d->type_depart === 'definitif') {
            try {
                $eleve = Student::where('Matricule', $d->eleve_id)->first();
                if ($eleve) {
                    $d->previous_statut = (string) ($eleve->Statut ?? $eleve->Etat ?? '');
                    $d->saveQuietly();
                    $eleve->Statut = self::STATUT_DEFINITIF;
                    $eleve->save();
                }
            } catch (\Throwable $e) {}
        }
        // cantine / pension / transport : la ligne `departs` fait foi (aucune
        // suppression d'historique). La génération de frais futurs interroge
        // serviceActif() ci-dessous.
    }

    /** Restaure l'état précédent lors d'une annulation. */
    private function restoreEffect(Depart $d): void
    {
        if ($d->type_depart === 'definitif') {
            try {
                $eleve = Student::where('Matricule', $d->eleve_id)->first();
                if ($eleve && $d->previous_statut !== null && $d->previous_statut !== '') {
                    $eleve->Statut = $d->previous_statut;
                    $eleve->save();
                }
            } catch (\Throwable $e) {}
        }
    }

    /** Un service est-il encore actif pour l'élève (aucun départ non annulé) ? */
    public static function serviceActif(string $matricule, string $type, ?string $annee = null): bool
    {
        try {
            return ! Depart::query()
                ->where('eleve_id', $matricule)
                ->where('type_depart', $type)
                ->when($annee, fn ($q) => $q->where('annee_scolaire_id', $annee))
                ->exists();
        } catch (\Throwable $e) {
            return true;
        }
    }

    /* ---------------- Lecture ---------------- */

    private function collectRows(Request $request): array
    {
        $this->ensure();

        $q = Depart::query();
        if ($annee = $request->query('annee_scolaire_id')) {
            $q->where('annee_scolaire_id', $annee);
        }
        if ($type = $request->query('type_depart')) {
            $q->where('type_depart', $type);
        }

        $niveau = $request->query('niveau_id');
        $classe = $request->query('classe_id');
        if ($niveau || $classe) {
            try {
                $mats = Student::forTenant()
                    ->when($niveau, fn ($x) => $x->where('CodeNiveau', $niveau))
                    ->when($classe, fn ($x) => $x->where('CodeClasse', $classe))
                    ->pluck('Matricule')->map(fn ($m) => (string) $m)->all();
                $q->whereIn('eleve_id', $mats ?: ['__none__']);
            } catch (\Throwable $e) {}
        }

        $departs = $q->orderByDesc('id')->get();

        $mats = $departs->pluck('eleve_id')->map(fn ($m) => (string) $m)->unique()->values()->all();
        $students = collect();
        if (! empty($mats)) {
            try {
                $students = Student::with('classe.niveau')->whereIn('Matricule', $mats)->get()->keyBy(fn ($s) => (string) $s->Matricule);
            } catch (\Throwable $e) {}
        }
        $dests = collect();
        try {
            $dests = Destination::all()->keyBy(fn ($x) => (string) $x->id);
        } catch (\Throwable $e) {}

        $search = strtolower(trim((string) $request->query('search', '')));
        $rows = [];
        foreach ($departs as $d) {
            $s = $students->get((string) $d->eleve_id);
            $nom = $s->Nom ?? '';
            $prenom = $s->Prenom ?? '';
            $niveauLbl = $s && $s->classe && $s->classe->niveau ? $s->classe->niveau->LibelleNiveau : ($s->CodeNiveau ?? '');
            $classeLbl = $s && $s->classe ? $s->classe->LibelleClasse : ($s->CodeClasse ?? '');
            if ($search !== '') {
                $hay = strtolower((string) $d->eleve_id.' '.$nom.' '.$prenom);
                if (! str_contains($hay, $search)) {
                    continue;
                }
            }
            $rows[] = [
                'id' => $d->id,
                'matricule' => (string) $d->eleve_id,
                'nom' => $nom,
                'prenom' => $prenom,
                'niveau' => $niveauLbl,
                'classe' => $classeLbl,
                'type_depart' => $d->type_depart,
                'date_depart' => $d->date_depart ? (string) $d->date_depart : null,
                'motif' => $d->motif,
                'circuit' => $d->circuit_transport_id ? optional($dests->get((string) $d->circuit_transport_id))->LIBELLE : null,
                'circuit_transport_id' => $d->circuit_transport_id,
                'observations' => $d->observations,
                'created_at' => optional($d->created_at)->format('Y-m-d H:i'),
            ];
        }

        $sort = $request->query('sort', 'id');
        $dir = strtolower($request->query('dir', 'desc')) === 'asc' ? 1 : -1;
        $allowed = ['matricule', 'nom', 'prenom', 'niveau', 'classe', 'type_depart', 'date_depart', 'id'];
        if (in_array($sort, $allowed, true)) {
            usort($rows, function ($a, $b) use ($sort, $dir) {
                $x = $a[$sort]; $y = $b[$sort];
                if (is_numeric($x) && is_numeric($y)) {
                    return ($x <=> $y) * $dir;
                }
                return strcasecmp((string) $x, (string) $y) * $dir;
            });
        }

        return [$rows, ['nombre' => count($rows)]];
    }

    public function index(Request $request)
    {
        [$rows, $tot] = $this->collectRows($request);
        $perPage = min((int) $request->query('per_page', 25), 500);
        $page = max(1, (int) $request->query('page', 1));
        $slice = array_slice($rows, ($page - 1) * $perPage, $perPage);

        return response()->json([
            'data' => $slice,
            'meta' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil(count($rows) / $perPage)),
                'per_page' => $perPage,
                'total' => count($rows),
            ],
            'totaux' => $tot,
        ]);
    }

    /* ---------------- Écriture ---------------- */

    public function store(Request $request)
    {
        $this->ensure();
        $data = $request->validate([
            'eleve_id' => ['required', 'string', 'max:50'],
            'annee_scolaire_id' => ['nullable', 'string', 'max:50'],
            'type_depart' => ['required', Rule::in(Depart::TYPES)],
            'date_depart' => ['required', 'date'],
            'motif' => ['nullable', 'string', 'max:255'],
            'circuit_transport_id' => ['nullable', 'string', 'max:50'],
            'observations' => ['nullable', 'string'],
        ]);

        try {
            $eleve = Student::forTenant()->where('Matricule', $data['eleve_id'])->first();
        } catch (\Throwable $e) {
            $eleve = Student::where('Matricule', $data['eleve_id'])->first();
        }
        if (! $eleve) {
            return response()->json(['message' => "Élève introuvable pour ce matricule."], 422);
        }

        // Un seul départ actif du même type par élève et par année.
        $exists = Depart::where('eleve_id', $data['eleve_id'])
            ->where('type_depart', $data['type_depart'])
            ->when($data['annee_scolaire_id'] ?? null, fn ($q, $a) => $q->where('annee_scolaire_id', $a))
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'Un départ de ce type est déjà enregistré pour cet élève.'], 422);
        }

        $d = new Depart();
        $d->eleve_id = $data['eleve_id'];
        $d->annee_scolaire_id = $data['annee_scolaire_id'] ?? null;
        $d->type_depart = $data['type_depart'];
        $d->date_depart = $data['date_depart'];
        $d->motif = $data['motif'] ?? null;
        $d->circuit_transport_id = $data['type_depart'] === 'transport' ? ($data['circuit_transport_id'] ?? null) : null;
        $d->observations = $data['observations'] ?? null;
        $d->save();

        $this->applyEffect($d);
        $d->save();

        AuditLogger::log('create', "Départ {$d->type_depart} — élève {$d->eleve_id}");

        return response()->json(['id' => $d->id, 'message' => 'Départ enregistré.'], 201);
    }

    public function update(Request $request, int $id)
    {
        $this->ensure();
        $d = Depart::findOrFail($id);
        $data = $request->validate([
            'date_depart' => ['nullable', 'date'],
            'motif' => ['nullable', 'string', 'max:255'],
            'circuit_transport_id' => ['nullable', 'string', 'max:50'],
            'observations' => ['nullable', 'string'],
        ]);

        if (array_key_exists('date_depart', $data) && $data['date_depart']) {
            $d->date_depart = $data['date_depart'];
        }
        if (array_key_exists('motif', $data)) {
            $d->motif = $data['motif'];
        }
        if ($d->type_depart === 'transport' && array_key_exists('circuit_transport_id', $data)) {
            $d->circuit_transport_id = $data['circuit_transport_id'];
        }
        if (array_key_exists('observations', $data)) {
            $d->observations = $data['observations'];
        }
        $d->save();

        AuditLogger::log('update', "Modification départ #{$d->id}");

        return response()->json(['message' => 'Départ mis à jour.']);
    }

    public function destroy(Request $request, int $id)
    {
        $this->ensure();
        $d = Depart::findOrFail($id);

        $this->restoreEffect($d);
        $motif = (string) $request->input('motif', $request->input('motif_annulation', ''));
        $d->withMotif($motif !== '' ? $motif : null)->delete();

        return response()->json(['message' => 'Départ annulé, situation antérieure restaurée.']);
    }

    /* ---------------- Export ---------------- */

    private function exportColumns(array $rows): array
    {
        $labels = ['definitif' => 'Définitif', 'cantine' => 'Cantine', 'pension' => 'Pension', 'transport' => 'Transport'];
        $headers = ['Matricule', 'Nom', 'Prénoms', 'Niveau', 'Classe', 'Type de départ', 'Date de départ', 'Motif', 'Circuit'];
        $data = array_map(fn ($r) => [
            $r['matricule'], $r['nom'], $r['prenom'], $r['niveau'], $r['classe'],
            $labels[$r['type_depart']] ?? $r['type_depart'], $r['date_depart'] ?? '',
            $r['motif'] ?? '', $r['circuit'] ?? '',
        ], $rows);
        return [$headers, $data];
    }

    public function export(Request $request)
    {
        [$rows] = $this->collectRows($request);
        $format = strtolower($request->query('format', 'xlsx'));
        [$headers, $data] = $this->exportColumns($rows);

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('pdf.departs', [
                'headers' => $headers,
                'rows' => $data,
                'total' => count($rows),
                'type' => $request->query('type_depart'),
            ])->setPaper('a4', 'landscape');
            return $pdf->download('Departs.pdf');
        }

        $footer = ['TOTAL', count($rows).' départ(s)', '', '', '', '', '', '', ''];
        $path = SimpleXlsx::generate($headers, $data, $footer);
        return response()->download($path, 'Departs.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ])->deleteFileAfterSend(true);
    }
}
