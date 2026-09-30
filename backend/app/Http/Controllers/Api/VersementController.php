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
        $cDate = Versement::col(['DateVers', 'DateVersement', 'DATEVERS', 'DateRecu']) ?? 'DateVers';
        $cCaisse = Versement::col(['CODECAISSE', 'CodeCaisse']);
        $cMode = Versement::col(['ModePaiement', 'TypeVers', 'TypeVersent', 'ModeReglement']);
        $cLib = Versement::col(['Libelle', 'LIBELLE', 'Motif']);

        $q = Versement::forTenant()->with('eleve')
            ->when($request->matricule, fn ($x, $m) => $x->where('Matricule', $m))
            ->when($request->search, fn ($x, $s) => $x->where(fn ($w) => $w
                ->where('Matricule', 'like', "%$s%")
                ->orWhere('NUM_RECU', 'like', "%$s%")
                // Recherche par nom / prénom de l'élève
                ->orWhereHas('eleve', fn ($e) => $e->where(fn ($n) => $n
                    ->where('Nom', 'like', "%$s%")->orWhere('Prenom', 'like', "%$s%")))))
            ->when($request->date_from, fn ($x, $d) => $x->whereDate($cDate, '>=', $d))
            ->when($request->date_to, fn ($x, $d) => $x->whereDate($cDate, '<=', $d))
            ->when($request->caisse && $cCaisse, fn ($x) => $x->where($cCaisse, $request->caisse))
            ->when($request->mode && $cMode, fn ($x) => $x->where($cMode, $request->mode))
            ->when($request->libelle && $cLib, fn ($x) => $x->where($cLib, $request->libelle))
            ->orderByDesc($cDate)->orderByDesc('Num');

        $page = $q->paginate(min((int) ($request->per_page ?? 30), 2000));
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
            // N° de reçu à réutiliser : un paiement multi-rubriques = un seul reçu.
            'num_recu' => ['nullable', 'string', 'max:50'],
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

        $login = $request->user()?->Login ?? $request->user()?->name;

        return DB::connection('economat')->transaction(function () use ($data, $eleve, $has, $set, $caisseCode, $login) {
            $v = new Versement();
            $set($v, ['Matricule', 'MATRICULE', 'CodeEleve', 'CODEELEVE'], $data['matricule']);
            $set($v, ['Montant', 'MONTANT', 'MONTANT_CFA', 'MontantVerse'], $data['montant']);
            // Date + heure du paiement (colonne datetime) pour l'historique.
            $set($v, ['DateVers', 'DateVersement', 'DATEVERS', 'DateRecu'], $data['date'] ?? now()->format('Y-m-d H:i:s'));
            $set($v, ['ModePaiement', 'TypeVers', 'TypeVersent', 'ModeReglement'], $data['mode'] ?? 'Espèces');
            $set($v, ['Libelle', 'LIBELLE', 'Motif'], $data['libelle'] ?? 'Versement scolarité');
            $set($v, ['CODECAISSE', 'CodeCaisse'], $caisseCode);
            $set($v, ['AnneAcad', 'AnneeAcad', 'ANNEE'], AnneeContext::current());
            $set($v, ['CODESOCIETE'], SocieteContext::current());
            $set($v, ['CODEETABLISSEMENT', 'CodeEtablissement'], EtablissementContext::current());
            $set($v, ['LOGIN', 'Login'], $login); // caissier ayant encaissé

            // Numéro de reçu : réutilisé pour les lignes d'un même paiement, sinon nouveau.
            $recCol = null;
            foreach (['NUM_RECU', 'NUMERO_RECU', 'NUMRECU', 'NumeroRecu'] as $c) {
                if ($has($c)) { $recCol = $c; break; }
            }
            if ($recCol) {
                $v->{$recCol} = ! empty($data['num_recu']) ? $data['num_recu'] : $this->nextReceiptNumber($recCol);
            }

            // Insertion : on tente en laissant NUM auto, sinon on génère NUM
            try {
                $v->save();
            } catch (\Throwable $e) {
                try {
                    $v->Num = (int) DB::connection('economat')->table('T_VERSEMENT')->max('Num') + 1;
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

    /**
     * Prochain n° de reçu au format REC-AAAA-000001 (séquence par année civile).
     * La colonne est un varchar contenant des formats hérités hétérogènes
     * ("1", "ROM00002", "REC-000010-9-2025"…) : on ne lit que le format courant.
     * Verrou (UPDLOCK/HOLDLOCK) pour éviter deux reçus identiques en concurrence.
     */
    private function nextReceiptNumber(string $col): string
    {
        $prefix = 'REC-'.now()->format('Y').'-';
        $row = DB::connection('economat')->selectOne(
            "SELECT MAX(TRY_CAST(SUBSTRING([$col], ?, 20) AS INT)) AS n
               FROM T_VERSEMENT WITH (UPDLOCK, HOLDLOCK)
              WHERE [$col] LIKE ?",
            [strlen($prefix) + 1, $prefix.'%']
        );

        return $prefix.str_pad((string) (((int) ($row->n ?? 0)) + 1), 6, '0', STR_PAD_LEFT);
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
