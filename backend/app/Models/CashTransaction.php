<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class CashTransaction extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'cash_account_id', 'type', 'amount', 'label', 'reference',
        'transaction_date', 'source_type', 'source_id', 'transfer_group', 'user_id', 'notes',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function account() { return $this->belongsTo(CashAccount::class, 'cash_account_id'); }
}
