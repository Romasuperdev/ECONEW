<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentInstallment extends Model
{
    protected $fillable = ['invoice_id', 'label', 'amount', 'due_date', 'status'];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
    ];

    public function invoice() { return $this->belongsTo(Invoice::class); }
}
