<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table du module « Départ » (définitif / cantine / pension / transport).
 * Connexion economat (SQL Server). Créée aussi à la volée par le contrôleur.
 */
return new class extends Migration
{
    private string $conn = 'economat';
    private string $table = 'departs';

    public function up(): void
    {
        if (Schema::connection($this->conn)->hasTable($this->table)) {
            return;
        }
        Schema::connection($this->conn)->create($this->table, function (Blueprint $t) {
            $t->increments('id');
            $t->string('code_societe', 50)->nullable()->index();
            $t->string('etablissement_id', 50)->nullable()->index();
            $t->string('eleve_id', 50)->index();
            $t->string('annee_scolaire_id', 50)->nullable()->index();
            $t->string('type_depart', 20);              // definitif / cantine / pension / transport
            $t->date('date_depart')->nullable();
            $t->string('motif', 255)->nullable();
            $t->string('circuit_transport_id', 50)->nullable();
            $t->text('observations')->nullable();
            $t->string('previous_statut', 50)->nullable(); // pour restaurer un départ définitif
            $t->string('user_id', 50)->nullable();
            $t->string('created_by', 50)->nullable();
            $t->string('updated_by', 50)->nullable();
            $t->string('deleted_by', 50)->nullable();
            $t->string('motif_annulation', 255)->nullable();
            $t->timestamps();
            $t->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::connection($this->conn)->dropIfExists($this->table);
    }
};
