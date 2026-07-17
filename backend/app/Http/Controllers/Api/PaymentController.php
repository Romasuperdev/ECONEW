<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        return Payment::query()
            ->with(['student:id,first_name,last_name,matricule', 'invoice:id,number', 'user:id,name'])
            ->when($request->user()->school_id, fn ($q, $id) => $q->where('school_id', $id))
            ->when($request->student_id, fn ($q, $id) => $q->where('student_id', $id))
            ->when($request->invoice_id, fn ($q, $id) => $q->where('invoice_id', $id))
            ->when($request->method, fn ($q, $m) => $q->where('method', $m))
            ->when($request->search, fn ($q, $s) => $q->where('receipt_number', 'like', "%$s%"))
            ->latest('paid_at')
            ->paginate($request->per_page ?? 15);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'invoice_id' => ['required', 'exists:invoices,id'],
            'amount' => ['required', 'numeric', 'min:1'],
            'paid_at' => ['required', 'date'],
            'method' => ['required', 'in:especes,mobile_money,virement,cheque,carte'],
            'reference' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = Invoice::findOrFail($data['invoice_id']);

        if ($invoice->status === 'annulee') {
            throw ValidationException::withMessages(['invoice_id' => ['Facture annulée.']]);
        }

        $balance = (float) $invoice->total_amount - (float) $invoice->paid_amount;
        if ($data['amount'] > $balance + 0.001) {
            throw ValidationException::withMessages([
                'amount' => ["Le montant dépasse le solde restant ($balance)."],
            ]);
        }

        return DB::transaction(function () use ($data, $invoice, $request) {
            $payment = Payment::create([
                'school_id' => $invoice->school_id,
                'invoice_id' => $invoice->id,
                'student_id' => $invoice->student_id,
                'user_id' => $request->user()->id,
                'receipt_number' => $this->generateReceipt($invoice->school_id),
                'amount' => $data['amount'],
                'paid_at' => $data['paid_at'],
                'method' => $data['method'],
                'reference' => $data['reference'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $invoice->refreshTotals();

            return response()->json($payment->load('invoice'), 201);
        });
    }

    public function show(Payment $payment)
    {
        return $payment->load(['invoice', 'student', 'user:id,name']);
    }

    public function destroy(Payment $payment)
    {
        $invoice = $payment->invoice;
        $payment->delete();
        $invoice?->refreshTotals();

        return response()->json(['message' => 'Paiement annulé.']);
    }

    private function generateReceipt(?int $schoolId): string
    {
        $year = now()->format('Y');
        $seq = Payment::whereYear('created_at', $year)->count() + 1;

        return sprintf('RECU-%s-%04d', $year, $seq);
    }
}
