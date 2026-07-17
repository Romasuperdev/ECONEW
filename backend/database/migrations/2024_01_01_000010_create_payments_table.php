<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained();
            $table->unsignedBigInteger('user_id')->nullable(); // encaisseur (RH_USER.Id)
            $table->string('receipt_number')->unique(); // RECU-2025-0001
            $table->decimal('amount', 12, 2);
            $table->date('paid_at');
            // especes | mobile_money | virement | cheque | carte
            $table->enum('method', ['especes', 'mobile_money', 'virement', 'cheque', 'carte'])->default('especes');
            $table->string('reference')->nullable(); // ref transaction
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
