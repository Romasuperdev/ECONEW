<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Caisse;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Invoice;
use App\Models\Payment;
use App\Support\SocieteContext;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    /** Resume financier sur une periode (recettes, depenses, solde). Isole par societe/exercice. */
    public function summary(Request $request)
    {
        [$from, $to] = $this->range($request);

        return response()->json($this->summaryData($from, $to));
    }

    /** Donnees consolidees du resume, reutilisees par le JSON et les exports. */
    private function summaryData(Carbon $from, Carbon $to): array
    {
        $recettes = $this->safe(fn () => (float) Payment::whereBetween('paid_at', [$from, $to])->sum('amount'), 0.0);

        $depenses = $this->safe(fn () => (float) Expense::forTenant()
            ->where('STATUT', 'validee')
            ->whereBetween('DATE_DEPENSE', [$from, $to])
            ->sum('MONTANT'), 0.0);

        $parJour = $this->safe(fn () => Payment::selectRaw('CAST(paid_at AS DATE) as jour, SUM(amount) as total')
            ->whereBetween('paid_at', [$from, $to])
            ->groupByRaw('CAST(paid_at AS DATE)')
            ->orderBy('jour')->get()
            ->map(fn ($r) => ['jour' => (string) $r->jour, 'total' => (float) $r->total])->all(), []);

        $recettesParMode = $this->safe(fn () => Payment::selectRaw('method, SUM(amount) as total')
            ->whereBetween('paid_at', [$from, $to])->groupBy('method')->get()
            ->map(fn ($r) => ['method' => $r->method, 'total' => (float) $r->total])->all(), []);

        $depensesParCat = $this->safe(function () use ($from, $to) {
            $rows = Expense::forTenant()
                ->selectRaw('CATEGORIE_ID, SUM(MONTANT) as total')
                ->where('STATUT', 'validee')
                ->whereBetween('DATE_DEPENSE', [$from, $to])
                ->groupBy('CATEGORIE_ID')->get();
            $cats = ExpenseCategory::forTenant()->get()->keyBy('ID');
            return $rows->map(fn ($r) => [
                'expense_category_id' => $r->CATEGORIE_ID,
                'category' => optional($cats->get($r->CATEGORIE_ID))->LIBELLE ?? 'Non classé',
                'total' => (float) $r->total,
            ])->all();
        }, []);

        return [
            'periode' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'recettes' => $recettes,
            'depenses' => $depenses,
            'solde' => $recettes - $depenses,
            'recettes_par_mode' => $recettesParMode,
            'depenses_par_categorie' => $depensesParCat,
            'recettes_par_jour' => $parJour,
        ];
    }

    /** Liste des eleves debiteurs (solde de facture > 0). */
    public function debtors(Request $request)
    {
        $rows = $this->safe(fn () => Invoice::query()
            ->whereIn('status', ['impayee', 'partielle'])
            ->with('student:id,first_name,last_name,matricule,school_class_id')
            ->selectRaw('student_id, SUM(total_amount - paid_amount) as solde_du, COUNT(*) as nb_factures')
            ->groupBy('student_id')
            ->havingRaw('SUM(total_amount - paid_amount) > 0')
            ->get(), collect());

        return response()->json($rows);
    }

    /** Tresorerie : solde par caisse (table ECONOMAT T_CAISSES). */
    public function treasury()
    {
        $rows = $this->safe(fn () => Caisse::forTenant()->get()
            ->map(fn (Caisse $c) => $c->toNormalized()), collect());

        return response()->json($rows->values());
    }

    /** Export CSV des paiements sur une periode. */
    public function exportPaymentsCsv(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $filename = "paiements_{$from->toDateString()}_{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($from, $to) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, ['Recu', 'Date', 'Eleve', 'Matricule', 'Facture', 'Mode', 'Montant'], ';');
            try {
                Payment::with(['student:id,first_name,last_name,matricule', 'invoice:id,number'])
                    ->whereBetween('paid_at', [$from, $to])
                    ->orderBy('paid_at')
                    ->chunk(200, function ($rows) use ($out) {
                        foreach ($rows as $p) {
                            fputcsv($out, [
                                $p->receipt_number,
                                optional($p->paid_at)->format('d/m/Y'),
                                $p->student?->full_name,
                                $p->student?->matricule,
                                $p->invoice?->number,
                                $p->method,
                                $p->amount,
                            ], ';');
                        }
                    });
            } catch (\Throwable $e) {
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Export CSV des depenses sur une periode (ECO_DEPENSE), isole par societe/exercice. */
    public function exportExpensesCsv(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $filename = "depenses_{$from->toDateString()}_{$to->toDateString()}.csv";

        return response()->streamDownload(function () use ($from, $to) {
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF).chr(0xBB).chr(0xBF));
            fputcsv($out, ['Reference', 'Date', 'Libelle', 'Categorie', 'Fournisseur', 'Mode', 'Montant'], ';');
            try {
                Expense::forTenant()->with(['category', 'supplier'])
                    ->whereBetween('DATE_DEPENSE', [$from, $to])
                    ->orderBy('DATE_DEPENSE')
                    ->chunk(200, function ($rows) use ($out) {
                        foreach ($rows as $e) {
                            fputcsv($out, [
                                $e->REFERENCE,
                                optional($e->DATE_DEPENSE ? Carbon::parse($e->DATE_DEPENSE) : null)->format('d/m/Y'),
                                $e->LIBELLE,
                                optional($e->category)->LIBELLE,
                                optional($e->supplier)->NOM,
                                $e->MODE_PAIEMENT,
                                $e->MONTANT,
                            ], ';');
                        }
                    });
            } catch (\Throwable $e) {
            }
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** Export Excel (.xls ouvrable par Excel) du resume financier. */
    public function exportSummaryXlsx(Request $request): StreamedResponse
    {
        [$from, $to] = $this->range($request);
        $d = $this->summaryData($from, $to);
        $filename = "rapport_{$from->toDateString()}_{$to->toDateString()}.xls";

        return response()->streamDownload(function () use ($d) {
            $esc = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES);
            echo "\xEF\xBB\xBF";
            echo '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body>';
            echo '<table border="1"><tr><th colspan="2" style="background:#1B2A4A;color:#fff">Rapport financier Economat</th></tr>';
            echo '<tr><td>Période</td><td>'.$esc($d['periode']['from']).' au '.$esc($d['periode']['to']).'</td></tr>';
            echo '<tr><td>Recettes</td><td>'.number_format($d['recettes'], 0, ',', ' ').'</td></tr>';
            echo '<tr><td>Dépenses</td><td>'.number_format($d['depenses'], 0, ',', ' ').'</td></tr>';
            echo '<tr><td><b>Solde</b></td><td><b>'.number_format($d['solde'], 0, ',', ' ').'</b></td></tr>';
            echo '</table><br/>';

            echo '<table border="1"><tr><th style="background:#2E9C9C;color:#fff">Recettes par mode</th><th style="background:#2E9C9C;color:#fff">Montant</th></tr>';
            foreach ($d['recettes_par_mode'] as $r) {
                echo '<tr><td>'.$esc($r['method']).'</td><td>'.number_format($r['total'], 0, ',', ' ').'</td></tr>';
            }
            echo '</table><br/>';

            echo '<table border="1"><tr><th style="background:#D9A441">Dépenses par catégorie</th><th style="background:#D9A441">Montant</th></tr>';
            foreach ($d['depenses_par_categorie'] as $r) {
                echo '<tr><td>'.$esc($r['category']).'</td><td>'.number_format($r['total'], 0, ',', ' ').'</td></tr>';
            }
            echo '</table></body></html>';
        }, $filename, ['Content-Type' => 'application/vnd.ms-excel; charset=UTF-8']);
    }

    /** Export PDF du resume financier (dompdf). */
    public function exportSummaryPdf(Request $request)
    {
        [$from, $to] = $this->range($request);
        $d = $this->summaryData($from, $to);

        $societe = SocieteContext::current();
        $pdf = Pdf::loadView('pdf.report-summary', ['d' => $d, 'societe' => $societe]);

        return $pdf->download("rapport_{$from->toDateString()}_{$to->toDateString()}.pdf");
    }

    private function safe(callable $fn, $default)
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            return $default;
        }
    }

    private function range(Request $request): array
    {
        $from = $request->from ? Carbon::parse($request->from)->startOfDay() : Carbon::now()->startOfMonth();
        $to = $request->to ? Carbon::parse($request->to)->endOfDay() : Carbon::now()->endOfDay();

        return [$from, $to];
    }
}
