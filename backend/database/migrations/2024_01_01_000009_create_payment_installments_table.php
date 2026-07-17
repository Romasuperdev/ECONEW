<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Échéancier : tranches attendues sur une facture
        Schema::create('payment_installments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->string('label'); // Tranche 1, Tranche 2...
            $table->decimal('amount', 12, 2);
            $table->date('due_date');
            $table->enum('status', ['a_venir', 'echue', 'payee'])->default('a_venir');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_installments');
    }
};
