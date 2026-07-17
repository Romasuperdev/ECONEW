<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('cash_account_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // entree | sortie
            $table->decimal('amount', 14, 2);
            $table->string('label');
            $table->string('reference')->nullable();
            $table->date('transaction_date');
            // lien optionnel vers une autre entite (paiement, depense, salaire)
            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            // regroupe les deux ecritures d'un virement interne
            $table->string('transfer_group')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['school_id', 'cash_account_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
