<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeeType;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Student;
use App\Support\AnneeContext;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        try {
            $rows = Invoice::forTenant()->with(['eleve', 'lignes'])
                ->when($request->status, fn ($q, $s) => $q->where('STATUT', $s))
                ->when($request->student_id, fn ($q, $m) => $q->where('MATRICULE', $m))
                ->when($request->search, fn ($q, $s) => $q->where('NUMERO', 'like', "%$s%"))
                ->orderByDesc('ID')
                ->get()
                ->map(fn (Invoice $i) => $i->toNormalized());

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
        $data = $request->validate([
            'student_id' => ['required', 'string'], // Matricule
            'issue_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.fee_type_id' => ['nullable'],
            'items.*.label' => ['nullable', 'string'],
            'items.*.amount' => ['required', 'numeric', 'min:0'],
        ]);

        $eleve = Student::forTenant()->where('Matricule', $data['student_id'])->first();
        if (! $eleve) {
            return response()->json(['message' => 'Élève introuvable.'], 422);
        }

        return DB::connection('economat')->transaction(function () use ($data) {
            $total = collect($data['items'])->sum(fn ($it) => (float) $it['amount']);

            $invoice = Invoice::create([
                'NUMERO' => $this->generateNumber(),
                'MATRICULE' => $data['student_id'],
                'ANNEE' => AnneeContext::current(),
                'DATE_EMISSION' => $data['issue_date'],
                'DATE_ECHEANCE' => $data['due_date'] ?? null,
                'MONTANT_TOTAL' => $total,
                'MONTANT_PAYE' => 0,
                'STATUT' => 'impayee',
                'NOTES' => $data['notes'] ?? null,
                'CODEETABLISSEMENT' => EtablissementContext::current(),
                'CODESOCIETE' => SocieteContext::current(),
                'CREATED_AT' => now(),
            ]);

            foreach ($data['items'] as $it) {
                $label = $it['label'] ?? null;
                if (! $label && ! empty($it['fee_type_id'])) {
                    $label = optional(FeeType::find($it['fee_type_id']))->toNormalized()['name'] ?? null;
                }
                InvoiceItem::create([
                    'FACTURE_ID' => $invoice->ID,
                    'LIBELLE' => $label ?: 'Frais',
                    'MONTANT' => (float) $it['amount'],
                    'CODE_CATEGORIE' => $it['fee_type_id'] ?? null,
                    'CREATED_AT' => now(),
                ]);
            }

            \App\Support\AuditLogger::log('create', 'Facture '.$invoice->NUMERO.' pour '.$data['student_id']);
            return response()->json($invoice->load(['eleve', 'lignes'])->toNormalized(), 201);
        });
    }

    public function show(string $invoice)
    {
        $inv = Invoice::forTenant()->with(['eleve', 'lignes'])->where('ID', $invoice)->firstOrFail();

        return response()->json($inv->toNormalized());
    }

    public function update(Request $request, string $invoice)
    {
        $data = $request->validate([
            'due_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'status' => ['nullable', 'in:impayee,partielle,payee,annulee'],
            'paid_amount' => ['nullable', 'numeric', 'min:0'],
        ]);

        $inv = Invoice::forTenant()->where('ID', $invoice)->firstOrFail();
        if (array_key_exists('due_date', $data)) {
            $inv->DATE_ECHEANCE = $data['due_date'];
        }
        if (array_key_exists('notes', $data)) {
            $inv->NOTES = $data['notes'];
        }
        if (! empty($data['status'])) {
            $inv->STATUT = $data['status'];
        }
        if (array_key_exists('paid_amount', $data) && $data['paid_amount'] !== null) {
            $inv->MONTANT_PAYE = $data['paid_amount'];
        }
        $inv->save();

        return response()->json($inv->load(['eleve', 'lignes'])->toNormalized());
    }

    public function destroy(string $invoice)
    {
        $inv = Invoice::forTenant()->where('ID', $invoice)->firstOrFail();
        InvoiceItem::where('FACTURE_ID', $inv->ID)->delete();
        $inv->delete();

        return response()->json(['message' => 'Paiement supprimé.']);
    }

    private function generateNumber(): string
    {
        $year = now()->format('Y');
        $etab = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string) EtablissementContext::current())) ?: 'ETB';
        try {
            $seq = Invoice::forTenant()->where('NUMERO', 'like', "PAIE-$etab-$year-%")->count() + 1;
        } catch (\Throwable $e) {
            $seq = 1;
        }
        return sprintf('PAIE-%s-%s-%04d', $etab, $year, $seq);
    }
}
