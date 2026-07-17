<?php

namespace App\Http\Controllers\Api\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\RhUser;
use App\Models\Societe;
use App\Models\SocieteUtilisateur;
use App\Support\AuditLogger;
use Illuminate\Http\Request;
use App\Models\Application;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AffectationController extends Controller
{
    public function societes()
    {
        try {
            return Societe::orderBy('NOMSOCIETE')->get()->map->toNormalized();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function users(Request $request)
    {
        try {
            return RhUser::query()
                ->where(fn ($q) => $q->whereNull('Supprimer')->orWhere('Supprimer', 0))
                ->when($request->search, fn ($q, $s) => $q->where(fn ($w) => $w
                    ->where('Login', 'like', "%$s%")
                    ->orWhere('Email', 'like', "%$s%")
                    ->orWhere('Nom', 'like', "%$s%")
                    ->orWhere('Prenom', 'like', "%$s%")))
                ->orderBy('Nom')->limit(200)->get()
                ->map(fn ($u) => [
                    'id' => $u->Id, 'name' => $u->name, 'login' => $u->Login,
                    'email' => $u->Email, 'role' => $u->role,
                ]);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function index(Request $request)
    {
        try {
            return SocieteUtilisateur::with(['societe', 'utilisateur'])
                ->when($request->societe_id, fn ($q, $id) => $q->where('societe_id', $id))
                ->get()
                ->map(fn ($a) => [
                    'id' => $a->id,
                    'user_id' => $a->user_id,
                    'societe_id' => $a->societe_id,
                    'user' => $a->utilisateur ? ['id' => $a->utilisateur->Id, 'name' => $a->utilisateur->name, 'login' => $a->utilisateur->Login, 'email' => $a->utilisateur->Email] : null,
                    'societe' => $a->societe?->toNormalized(),
                ]);
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required'],
            'societe_id' => ['required'],
        ]);

        try {
            $exists = SocieteUtilisateur::where('user_id', $data['user_id'])
                ->where('societe_id', $data['societe_id'])->first();
            if ($exists) {
                return response()->json(['message' => 'Affectation déjà existante.', 'id' => $exists->id]);
            }
            $aff = SocieteUtilisateur::create($data);
            AuditLogger::log('create', "Affectation utilisateur #{$data['user_id']} -> societe #{$data['societe_id']}");

            return response()->json($aff->load(['societe', 'utilisateur']), 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Table des affectations indisponible.'], 422);
        }
    }

    public function destroy(SocieteUtilisateur $affectation)
    {
        try {
            $affectation->delete();
            return response()->json(['message' => 'Affectation supprimée.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Suppression impossible.'], 422);
        }
    }

    public function applications()
    {
        try {
            return Application::orderBy('CodeApp')->get()->map->toNormalized();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }

    // Détecte les colonnes réelles du pivot US_SOCIETE_APPLICATION
    private function pivotCols(): array
    {
        $cols = Schema::connection('master')->getColumnListing('US_SOCIETE_APPLICATION');
        $socCol = null;
        foreach (['CODESOCIETE', 'societe_id', 'NUMAUTO', 'CodeSociete'] as $c) {
            if (in_array($c, $cols, true)) { $socCol = $c; break; }
        }
        $appCol = null;
        foreach (['CodeApp', 'CODEAPP', 'code_app', 'application_id'] as $c) {
            if (in_array($c, $cols, true)) { $appCol = $c; break; }
        }
        return [$socCol, $appCol];
    }

    public function assignApp(Request $request)
    {
        $data = $request->validate([
            'societe_id' => ['nullable'],
            'societe_code' => ['nullable'],
            'code_app' => ['required'],
        ]);
        try {
            [$socCol, $appCol] = $this->pivotCols();
            if (! $socCol || ! $appCol) {
                return response()->json(['message' => 'Structure US_SOCIETE_APPLICATION non reconnue.'], 422);
            }
            $socVal = $socCol === 'CODESOCIETE' || $socCol === 'CodeSociete'
                ? $data['societe_code'] : $data['societe_id'];
            $t = DB::connection('master')->table('US_SOCIETE_APPLICATION');
            $exists = (clone $t)->where($socCol, $socVal)->where($appCol, $data['code_app'])->exists();
            if (! $exists) {
                $t->insert([$socCol => $socVal, $appCol => $data['code_app']]);
            }
            AuditLogger::log('create', "Affectation application {$data['code_app']} -> societe {$socVal}");
            return response()->json(['message' => 'Application affectée.'], 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Affectation impossible : '.$e->getMessage()], 422);
        }
    }

    public function unassignApp(Request $request)
    {
        $data = $request->validate([
            'societe_id' => ['nullable'],
            'societe_code' => ['nullable'],
            'code_app' => ['required'],
        ]);
        try {
            [$socCol, $appCol] = $this->pivotCols();
            if (! $socCol || ! $appCol) {
                return response()->json(['message' => 'Structure non reconnue.'], 422);
            }
            $socVal = $socCol === 'CODESOCIETE' || $socCol === 'CodeSociete'
                ? $data['societe_code'] : $data['societe_id'];
            DB::connection('master')->table('US_SOCIETE_APPLICATION')
                ->where($socCol, $socVal)->where($appCol, $data['code_app'])->delete();
            return response()->json(['message' => 'Affectation retirée.']);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Retrait impossible.'], 422);
        }
    }

    public function societeApplications()
    {
        try {
            return DB::connection('master')->table('US_SOCIETE_APPLICATION')->get();
        } catch (\Throwable $e) {
            return response()->json([]);
        }
    }
}
