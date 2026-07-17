<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\Versement;
use App\Support\AnneeContext;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class VersementController extends Controller
{
    public function index(Request $request)
    {
        $q = Versement::forTenant()->with('eleve')
            ->when($request->matricule, fn ($x, $m) => $x->where('Matricule', $m))
            ->when($request->search, fn ($x, $s) => $x->where(fn ($w) => $w
                ->where('Matricule', 'like', "%$s%")
                ->orWhere('NUM_RECU', 'like', "%$s%")))
            ->orderByDesc('NUM');

        $page = $q->paginate((int) ($request->per_page ?? 30));
        $page->getCollection()->transform(fn ($v) => $v->toNormalized());

        return $page;
    }

    public function show(Versement $versement)
    {
        return $versement->load('eleve')->toNormalized();
    }

    /** Enregistre un versement (encaissement) dans T_VERSEMENT. */
    public function store(Request $request)
    {
        $data = $request->validate([
            'matricule' => ['required', 'string'],
            'montant' => ['required', 'numeric', 'min:1'],
            'mode' => ['nullable', 'string'],
            'date' => ['nullable', 'date'],
            'libelle' => ['nullable', 'string'],
            'caisse' => ['nullable', 'string'],
        ]);

        // Aucun paiement possible si la caisse de l'utilisateur n'est pas ouverte.
        $session = null;
        try {
            if (Schema::connection('economat')->hasTable('ECO_CAISSE_SESSION')) {
                $session = DB::connection('economat')->table('ECO_CAISSE_SESSION')
                    ->where('USER_ID', $request->user()?->getKey())
                    ->where('STATUT', 'open')
                    ->orderByDesc('id')->first();
            }
        } catch (\Throwable $e) {
        }
        if (! $session) {
            return response()->json(['message' => "Aucune caisse ouverte : ouvrez votre caisse avant d'encaisser."], 423);
        }
        // Force la caisse du versement sur celle de la session ouverte.
        $data['caisse'] = $session->CODECAISSE ?? ($data['caisse'] ?? null);

        $eleve = Student::where('Matricule', $data['matricule'])->first();
        if (! $eleve) {
            throw ValidationException::withMessages(['matricule' => ['Élève introuvable.']]);
        }

        // Contrôle du reste à payer (si une scolarité est définie)
        $reste = (float) $eleve->Scolarite - (float) $eleve->TotalPaye;
        if ((float) $eleve->Scolarite > 0 && $data['montant'] > $reste + 0.01) {
            throw ValidationException::withMessages([
                'montant' => ["Le montant dépasse le reste à payer (".number_format($reste, 0, ',', ' ').")."],
            ]);
        }

        $cols = Schema::connection('economat')->getColumnListing('T_VERSEMENT');
        $has = fn ($c) => in_array($c, $cols, true);
        $set = function ($model, array $candidates, $value) use ($has) {
            foreach ($candidates as $c) {
                if ($has($c)) { $model->{$c} = $value; return $c; }
            }
            return null;
        };

        // Caisse : fournie, sinon celle affectée au caissier connecté (ECO_USER_CAISSE)
        $caisseCode = $data['caisse'] ?? null;
        if (! $caisseCode) {
            try {
                if (Schema::connection('economat')->hasTable('ECO_USER_CAISSE')) {
                    $caisseCode = DB::connection('economat')->table('ECO_USER_CAISSE')
                        ->where('USER_ID', $request->user()?->getKey())->value('CODECAISSE');
                }
            } catch (\Throwable $e) {
            }
        }

        return DB::connection('economat')->transaction(function () use ($data, $eleve, $has, $set, $caisseCode) {
            $v = new Versement();
            $set($v, ['Matricule', 'MATRICULE', 'CodeEleve', 'CODEELEVE'], $data['matricule']);
            $set($v, ['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse'], $data['montant']);
            $set($v, ['DateVers', 'DateVersement', 'DATEVERS', 'DateRecu'], $data['date'] ?? now()->toDateString());
            $set($v, ['ModePaiement', 'TypeVers', 'TypeVersent', 'ModeReglement'], $data['mode'] ?? 'Espèces');
            $set($v, ['Libelle', 'LIBELLE', 'Motif'], $data['libelle'] ?? 'Versement scolarité');
            $set($v, ['CODECAISSE', 'CodeCaisse'], $caisseCode);
            $set($v, ['AnneeAcad', 'ANNEE'], AnneeContext::current());
            $set($v, ['CODESOCIETE'], SocieteContext::current());
            $set($v, ['CODEETABLISSEMENT', 'CodeEtablissement'], EtablissementContext::current());

            // Numéro de reçu (séquence)
            $recCol = null;
            foreach (['NUM_RECU', 'NUMERO_RECU', 'NUMRECU', 'NumeroRecu'] as $c) {
                if ($has($c)) { $recCol = $c; break; }
            }
            if ($recCol) {
                $v->{$recCol} = (int) DB::connection('economat')->table('T_VERSEMENT')->max($recCol) + 1;
            }

            // Insertion : on tente en laissant NUM auto, sinon on génère NUM
            try {
                $v->save();
            } catch (\Throwable $e) {
                try {
                    $v->NUM = (int) DB::connection('economat')->table('T_VERSEMENT')->max('NUM') + 1;
                    $v->save();
                } catch (\Throwable $e2) {
                    return response()->json([
                        'message' => "Enregistrement du versement impossible : ".$e2->getMessage(),
                    ], 422);
                }
            }

            // Mise à jour du solde de l'élève
            try {
                $eleve->TotalPaye = (float) $eleve->TotalPaye + (float) $data['montant'];
                $eleve->save();
            } catch (\Throwable $e) {
            }

            AuditLogger::log('create', "Versement {$data['montant']} pour élève {$data['matricule']}");

            return response()->json($v->load('eleve')->toNormalized(), 201);
        });
    }

    public function destroy(Request $request, Versement $versement)
    {
        // Controle d'annulation : caissier = jour meme uniquement ; comptable/directeur = sans limite
        $user = $request->user();
        $superviseur = $user && method_exists($user, 'hasAbility') && $user->hasAbility('versements.cancel');
        if (! $superviseur) {
            $paidAt = $versement->toNormalized()['paid_at'] ?? null;
            $isToday = false;
            try { $isToday = $paidAt && Carbon::parse($paidAt)->isToday(); } catch (\Throwable $e) {}
            if (! $isToday) {
                return response()->json([
                    'message' => "Vous ne pouvez annuler qu'un versement du jour. Contactez un superviseur pour les versements anterieurs.",
                ], 403);
            }
        }

        // Retrait du montant du solde de l'élève avant suppression
        try {
            $n = $versement->toNormalized();
            $matricule = $n['matricule'] ?? null;
            $montant = (float) ($n['amount'] ?? 0);
            if ($matricule) {
                $st = Student::where('Matricule', $matricule)->first();
                if ($st) { $st->TotalPaye = max((float) $st->TotalPaye - $montant, 0); $st->save(); }
            }
        } catch (\Throwable $e) {
        }
        $versement->delete();

        return response()->json(['message' => 'Versement annulé.']);
    }
}
