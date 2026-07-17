<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use App\Models\Employee;
use App\Models\Payslip;
use App\Models\PayslipLine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayslipController extends Controller
{
    public function index(Request $request)
    {
        return Payslip::query()
            ->with('employee:id,first_name,last_name,matricule')
            ->when($request->period, fn ($q, $p) => $q->where('period', $p))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->employee_id, fn ($q, $id) => $q->where('employee_id', $id))
            ->latest()->paginate($request->per_page ?? 20);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'exists:employees,id'],
            'period' => ['required', 'string'], // 2025-09
            'base_salary' => ['nullable', 'numeric', 'min:0'],
            'lines' => ['nullable', 'array'],
            'lines.*.type' => ['required_with:lines', 'in:prime,retenue,avance'],
            'lines.*.label' => ['required_with:lines', 'string'],
            'lines.*.amount' => ['required_with:lines', 'numeric', 'min:0'],
        ]);

        $employee = Employee::findOrFail($data['employee_id']);

        return DB::transaction(function () use ($data, $employee) {
            $payslip = Payslip::create([
                'employee_id' => $employee->id,
                'number' => $this->generateNumber(),
                'period' => $data['period'],
                'base_salary' => $data['base_salary'] ?? $employee->base_salary,
                'status' => 'brouillon',
            ]);

            foreach ($data['lines'] ?? [] as $line) {
                PayslipLine::create([
                    'payslip_id' => $payslip->id,
                    'type' => $line['type'], 'label' => $line['label'], 'amount' => $line['amount'],
                ]);
            }
            $payslip->recompute();

            return response()->json($payslip->load('lines', 'employee'), 201);
        });
    }

    public function show(Payslip $payslip)
    {
        return $payslip->load('lines', 'employee');
    }

    public function update(Request $request, Payslip $payslip)
    {
        $data = $request->validate([
            'base_salary' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:brouillon,valide,paye'],
        ]);
        $payslip->update($data);
        $payslip->recompute();

        return $payslip->load('lines', 'employee');
    }

    /** Marque le bulletin comme payé et enregistre la sortie de caisse. */
    public function pay(Request $request, Payslip $payslip)
    {
        $data = $request->validate([
            'cash_account_id' => ['nullable', 'exists:cash_accounts,id'],
            'paid_at' => ['required', 'date'],
        ]);

        return DB::transaction(function () use ($data, $payslip, $request) {
            $payslip->update([
                'status' => 'paye',
                'paid_at' => $data['paid_at'],
                'cash_account_id' => $data['cash_account_id'] ?? null,
            ]);

            if (! empty($data['cash_account_id'])) {
                CashTransaction::create([
                    'cash_account_id' => $data['cash_account_id'],
                    'type' => 'sortie',
                    'amount' => $payslip->net_amount,
                    'label' => "Salaire {$payslip->period} - {$payslip->employee->full_name}",
                    'reference' => $payslip->number,
                    'transaction_date' => $data['paid_at'],
                    'source_type' => Payslip::class,
                    'source_id' => $payslip->id,
                    'user_id' => optional($request->user())->getKey(),
                ]);
            }

            return $payslip->load('lines', 'employee');
        });
    }

    public function destroy(Payslip $payslip)
    {
        $payslip->delete();

        return response()->json(['message' => 'Bulletin supprimé.']);
    }

    private function generateNumber(): string
    {
        $year = now()->format('Y');
        $seq = Payslip::whereYear('created_at', $year)->count() + 1;

        return sprintf('BUL-%s-%04d', $year, $seq);
    }
}
