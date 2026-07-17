<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayslipLine extends Model
{
    protected $fillable = ['payslip_id', 'type', 'label', 'amount'];

    protected $casts = ['amount' => 'decimal:2'];

    public function payslip() { return $this->belongsTo(Payslip::class); }
}
