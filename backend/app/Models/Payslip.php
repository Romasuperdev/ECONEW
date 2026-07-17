<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class Payslip extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'employee_id', 'number', 'period', 'base_salary',
        'total_primes', 'total_retenues', 'total_avances', 'net_amount',
        'status', 'paid_at', 'cash_account_id',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'total_primes' => 'decimal:2',
        'total_retenues' => 'decimal:2',
        'total_avances' => 'decimal:2',
        'net_amount' => 'decimal:2',
        'paid_at' => 'date',
    ];

    public function employee() { return $this->belongsTo(Employee::class); }
    public function lines() { return $this->hasMany(PayslipLine::class); }

    /** Recalcule les totaux et le net a partir des lignes. */
    public function recompute(): void
    {
        $this->total_primes = (float) $this->lines()->where('type', 'prime')->sum('amount');
        $this->total_retenues = (float) $this->lines()->where('type', 'retenue')->sum('amount');
        $this->total_avances = (float) $this->lines()->where('type', 'avance')->sum('amount');
        $this->net_amount = (float) $this->base_salary + (float) $this->total_primes
            - (float) $this->total_retenues - (float) $this->total_avances;
        $this->save();
    }
}
