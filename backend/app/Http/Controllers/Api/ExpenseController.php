<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Support\AnneeContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use App\Support\UidRegistry;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        try {
            $rows = Expense::forTenant()
                ->with(['category', 'supplier'])
                ->when($request->expense_category_id, fn ($q, $id) => $q->where('CATEGORIE_ID', $id))
                ->when($request->supplier_id, fn ($q, $id) => $q->where('FOURNISSEUR_ID', $id))
                ->when($request->status, fn ($q, $s) => $q->where('STATUT', $s))
                ->when($request->search, fn ($q, $s) => $q->where(function ($w) use ($s) {
                    $w->where('LIBELLE', 'like', "%$s%")->orWhere('REFERENCE', 'like', "%$s%");
                }))
                ->orderByDesc('DATE_DEPENSE')
                ->get()
                ->map(fn (Expense $e) => $e->toNormalized());

            $perPage = (int) ($request->per_page ?? 15);
            $page = (int) ($request->page ?? 1);

            return response()->json([
                'data' => $rows->forPage($page, $perPage)->values(),
                'total' => $rows->count(),
                'per_page' => $perPage,
                'current_page' => $page,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['data' => [], 'total' => 0, 'per_page' => 15, 'current_page' => 1]);
        }
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request);

        $e = new Expense();
        $e->CODESOCIETE = SocieteContext::current();
        $e->ANNEE = AnneeContext::current();
        $e->CATEGORIE_ID = $data['expense_category_id'] ?? null;
        $e->FOURNISSEUR_ID = $data['supplier_id'] ?? null;
        $e->LIBELLE = $data['label'];
        $e->MONTANT = $data['amount'];
        $e->DATE_DEPENSE = $data['spent_at'];
        $e->MODE_PAIEMENT = $data['method'];
        $e->CODECAISSE = $data['caisse'] ?? null;
        $e->STATUT = $data['status'] ?? 'validee';
        $e->NOTES = $data['notes'] ?? null;
        $e->REFERENCE = $this->generateReference();
        $e->CREATED_AT = now();
        $e->save();
        UidRegistry::assign('DEPENSE', (string) $e->getKey());

            \App\Support\AuditLogger::log('create', 'Dépense '.$e->MONTANT.' - '.$e->LIBELLE);
        return response()->json($e->load(['category', 'supplier'])->toNormalized(), 201);
    }

    public function show(string $expense)
    {
        return response()->json($this->find($expense)->load(['category', 'supplier'])->toNormalized());
    }

    public function update(Request $request, string $expense)
    {
        $data = $this->validateData($request);
        $e = $this->find($expense);
        $e->CATEGORIE_ID = $data['expense_category_id'] ?? null;
        $e->FOURNISSEUR_ID = $data['supplier_id'] ?? null;
        $e->LIBELLE = $data['label'];
        $e->MONTANT = $data['amount'];
        $e->DATE_DEPENSE = $data['spent_at'];
        $e->MODE_PAIEMENT = $data['method'];
        $e->CODECAISSE = $data['caisse'] ?? null;
        $e->STATUT = $data['status'] ?? $e->STATUT;
        $e->NOTES = $data['notes'] ?? null;
        $e->save();

        return response()->json($e->load(['category', 'supplier'])->toNormalized());
    }

    public function destroy(string $expense)
    {
        $this->find($expense)->delete();

        return response()->json(['message' => 'Dépense supprimée.']);
    }

    // Recuperation scellee par societe + exercice (isolation).
    private function find(string $id): Expense
    {
        return Expense::forTenant()->where('ID', $id)->firstOrFail();
    }

    private function validateData(Request $request): array
    {
        return $request->validate([
            'expense_category_id' => ['nullable', 'integer'],
            'supplier_id' => ['nullable', 'integer'],
            'label' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'spent_at' => ['required', 'date'],
            'method' => ['required', 'in:especes,mobile_money,virement,cheque,carte'],
            'status' => ['nullable', 'in:en_attente,validee,rejetee'],
            'caisse' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function generateReference(): string
    {
        $year = now()->format('Y');
        $etab = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) \App\Support\EtablissementContext::current())) ?: 'ETB';
        try {
            $seq = Expense::forTenant()->where('REFERENCE', 'like', "DEP-$etab-$year-%")->count() + 1;
        } catch (\Throwable $e) {
            $seq = 1;
        }
        return sprintf('DEP-%s-%s-%04d', $etab, $year, $seq);
    }
}
