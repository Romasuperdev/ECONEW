<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Versement;
use App\Support\SocieteContext;
use Barryvdh\DomPDF\Facade\Pdf;

class DocumentController extends Controller
{
    public function invoicePdf(string $invoice)
    {
        $inv = Invoice::forTenant()->with(['eleve', 'lignes'])->where('ID', $invoice)->firstOrFail();
        $n = $inv->toNormalized();

        $pdf = Pdf::loadView('pdf.invoice', [
            'inv' => $n,
            'societe' => SocieteContext::current() ?? 'Etablissement',
        ]);

        return $pdf->download('Paiement-'.($n['number'] ?? $inv->ID).'.pdf');
    }

    public function receiptPdf(Payment $payment)
    {
        $payment->load(['student', 'invoice', 'school']);
        $currency = $payment->school->currency ?? 'XOF';

        $pdf = Pdf::loadView('pdf.receipt', [
            'payment' => $payment,
            'school' => $payment->school,
            'currency' => $currency,
        ]);

        return $pdf->download("Recu-{$payment->receipt_number}.pdf");
    }

    public function versementPdf(Versement $versement)
    {
        $societe = SocieteContext::current();
        $vsoc = $versement->getAttribute('CODESOCIETE');
        if ($societe && $vsoc && (string) $vsoc !== (string) $societe) {
            abort(403, 'Accès refusé.');
        }

        $versement->load('eleve');
        $n = $versement->toNormalized();
        $pdf = Pdf::loadView('pdf.versement', [
            'recu' => $n['receipt_number'] ?? $versement->NUM,
            'montant' => $n['amount'] ?? 0,
            'devise' => 'XOF',
            'eleve' => $versement->eleve?->full_name ?? '',
            'matricule' => $n['matricule'] ?? '',
            'date' => $n['paid_at'] ? (string) $n['paid_at'] : '',
            'mode' => $n['method'] ?? '',
            'libelle' => $n['libelle'] ?? '',
            'societe' => $societe ?? 'Etablissement',
        ]);
        return $pdf->download('Recu-'.($n['receipt_number'] ?? $versement->NUM).'.pdf');
    }
}
