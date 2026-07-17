<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscription_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_id')->constrained()->cascadeOnDelete();
            $table->foreignId('school_id')->constrained();
            $table->string('reference')->unique();
            $table->decimal('amount', 12, 2);
            $table->date('paid_at');
            $table->string('method')->default('mobile_money'); // mobile_money | carte | virement | especes
            $table->string('status')->default('paye'); // paye | en_attente | echoue
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_payments');
    }
};
