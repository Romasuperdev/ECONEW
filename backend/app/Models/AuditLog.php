<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = [
        'user_id', 'school_id', 'action', 'auditable_type', 'auditable_id',
        'description', 'ip_address', 'user_agent',
    ];

    public function user() { return $this->belongsTo(User::class); }
    public function school() { return $this->belongsTo(School::class); }
}
