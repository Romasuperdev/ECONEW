<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table du module « Paiements prévisionnels de l'État ».
 * Connexion economat (SQL Server). Créée aussi à la volée par le contrôleur.
 */
return new class extends Migration
{
    private string $conn = 'economat';
    private string $table = 'affectations_etat';

    public function up(): void
    {
        if (Schema::connection($this->conn)->hasTable($this->table)) {
            return;
        }
        Schema::connection($this->conn)->create($this->table, function (Blueprint $t) {
            $t->increments('id');
            $t->string('code_societe', 50)->nullable()->index();
            $t->string('etablissement_id', 50)->nullable()->index();
            $t->string('eleve_id', 50)->index();            // matricule de l'élève
            $t->string('annee_scolaire_id', 50)->nullable()->index();
            $t->string('type_affectation', 80)->nullable();
            $t->decimal('montant_prevu', 14, 2)->default(0);
            $t->string('cycle', 60)->nullable();
            $t->string('filiere', 80)->nullable();
            $t->string('statut_affectation', 40)->nullable();
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
