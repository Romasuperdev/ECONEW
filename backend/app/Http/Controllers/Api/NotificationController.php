<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\ReceiptMail;
use App\Models\Versement;
use App\Support\SocieteContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class NotificationController extends Controller
{
    /** Envoie par email le recu d'un versement (PDF joint), scelle par societe. */
    public function emailReceipt(Request $request, Versement $versement)
    {
        // Isolation : le versement doit appartenir a la societe courante
        $societe = SocieteContext::current();
        $vsoc = $versement->getAttribute('CODESOCIETE');
        if ($societe && $vsoc && (string) $vsoc !== (string) $societe) {
            return response()->json(['message' => 'Accès refusé.'], 403);
        }

        $data = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $versement->load('eleve');
        $n = $versement->toNormalized();
        $ctx = [
            'recu' => $n['receipt_number'] ?? $versement->NUM,
            'montant' => $n['amount'] ?? 0,
            'devise' => 'XOF',
            'eleve' => $versement->eleve?->full_name ?? '',
            'matricule' => $n['matricule'] ?? '',
            'date' => $n['paid_at'] ? (string) $n['paid_at'] : '',
            'mode' => $n['method'] ?? '',
            'libelle' => $n['libelle'] ?? '',
            'societe' => $societe ?? 'Etablissement',
        ];

        try {
            $pdf = Pdf::loadView('pdf.versement', $ctx);
            $name = 'Recu-'.($ctx['recu']).'.pdf';
            Mail::to($data['email'])->send(new ReceiptMail($ctx, $pdf->output(), $name));
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Envoi impossible. Vérifiez la configuration SMTP (.env).",
                'detail' => $e->getMessage(),
            ], 502);
        }

        return response()->json(['message' => 'Reçu envoyé à '.$data['email'].'.']);
    }

    /** Envoie un rappel d'impaye a une adresse donnee. */
    public function sendReminder(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'eleve' => ['nullable', 'string'],
            'montant' => ['nullable', 'numeric'],
            'message' => ['nullable', 'string'],
        ]);

        $societe = SocieteContext::current() ?? 'Etablissement';
        $corps = $data['message'] ?? sprintf(
            "Bonjour,\n\nNous vous rappelons qu'un solde%s reste dû%s.\nMerci de bien vouloir régulariser votre situation.\n\n%s",
            !empty($data['eleve']) ? ' pour '.$data['eleve'] : '',
            isset($data['montant']) ? ' de '.number_format((float) $data['montant'], 0, ',', ' ').' XOF' : '',
            $societe
        );

        try {
            Mail::raw($corps, function ($m) use ($data) {
                $m->to($data['email'])->subject('Rappel de paiement - Economat');
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => "Envoi impossible. Vérifiez la configuration SMTP (.env).",
                'detail' => $e->getMessage(),
            ], 502);
        }

        return response()->json(['message' => 'Rappel envoyé à '.$data['email'].'.']);
    }
}
