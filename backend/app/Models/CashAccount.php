<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;

class CashAccount extends Model
{
    use BelongsToSchool;

    protected $fillable = [
        'school_id', 'name', 'type', 'currency', 'opening_balance', 'is_active',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    protected $appends = ['balance'];

    public function transactions() { return $this->hasMany(CashTransaction::class); }

    /** Solde temps reel = solde d'ouverture + entrees - sorties. */
    public function getBalanceAttribute(): string
    {
        $in = (float) $this->transactions()->where('type', 'entree')->sum('amount');
        $out = (float) $this->transactions()->where('type', 'sortie')->sum('amount');

        return number_format((float) $this->opening_balance + $in - $out, 2, '.', '');
    }
}
