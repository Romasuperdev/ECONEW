<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Rattache les enregistrements « orphelins » (société / établissement / année
 * NULL ou vides) au tenant par défaut défini dans config/economat.php.
 *
 * Conforme au schéma multi-tenant : après ce backfill, plus aucune ligne ne
 * « fuit » entre tenants via une clé de cloisonnement vide, et le durcissement
 * des filtres (suppression des orWhereNull) ne fait disparaître aucune donnée
 * du tenant par défaut.
 *
 * Usage :
 *   php artisan tenant:backfill --dry-run    (compte seulement, ne modifie rien)
 *   php artisan tenant:backfill              (applique les mises à jour)
 */
class TenantBackfill extends Command
{
    protected $signature = 'tenant:backfill
        {--dry-run : Affiche seulement le nombre de lignes concernées sans rien modifier}
        {--societe= : Code société par défaut (sinon config economat.code_societe)}
        {--etab= : Code établissement par défaut (sinon config economat.code_etab)}
        {--annee= : Année par défaut (sinon config economat.annee)}';

    protected $description = 'Rattache les lignes sans société/établissement/année au tenant par défaut.';

    /**
     * Tables métier et colonnes candidates par dimension.
     * On ne touche qu'aux colonnes réellement présentes.
     */
    private function map(): array
    {
        return [
            'T_ETUDIANT'          => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['Site', 'CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['AnneeAcad', 'ANNEE', 'Annee']],
            'T_VERSEMENT'         => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['AnneeAcad', 'ANNEE', 'Annee']],
            'T_CLASSE'            => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'Site', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_NIVEAU'            => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_ETABLISSEMENT'     => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => [], 'annee' => []],
            'T_GRILLESCOLARITE'   => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_CATEGORIEPAIEMENT' => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_CANTINE'           => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_GRILLECANTINE'     => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_GRILLEPENSION'     => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_TRANSPORT'         => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT', 'CodeEtablissement'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_PENSION'           => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => [], 'annee' => ['ANNEE', 'AnneeAcad']],
            'ECO_DEPENSE'         => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CODEETABLISSEMENT'], 'annee' => ['ANNEE', 'AnneeAcad']],
            'T_CYCLE'             => ['soc' => ['CODESOCIETE', 'CodeSociete'], 'etab' => ['CodeEtab', 'CODEETABLISSEMENT'], 'annee' => []],
        ];
    }

    public function handle(): int
    {
        $soc = $this->option('societe') ?: config('economat.code_societe');
        $etab = $this->option('etab') ?: config('economat.code_etab');
        $annee = $this->option('annee') ?: config('economat.annee');
        $dry = (bool) $this->option('dry-run');

        if (! $soc) {
            $this->error('Aucun code société par défaut (config economat.code_societe ou --societe). Abandon.');
            return self::FAILURE;
        }

        $this->info(($dry ? '[SIMULATION] ' : '')."Tenant par défaut → société={$soc}"
            .($etab ? ", établissement={$etab}" : '')
            .($annee ? ", année={$annee}" : ''));
        $this->line('');

        $conn = DB::connection('economat');
        $totalRows = 0;

        foreach ($this->map() as $table => $dims) {
            try {
                if (! Schema::connection('economat')->hasTable($table)) {
                    continue;
                }
            } catch (\Throwable $e) {
                continue;
            }
            $cols = [];
            try { $cols = Schema::connection('economat')->getColumnListing($table); } catch (\Throwable $e) {}

            $targets = [
                'société'       => [$this->firstCol($dims['soc'], $cols), $soc],
                'établissement' => [$this->firstCol($dims['etab'], $cols), $etab],
                'année'         => [$this->firstCol($dims['annee'], $cols), $annee],
            ];

            $tableTouched = 0;
            foreach ($targets as $label => [$col, $value]) {
                if (! $col || $value === null || $value === '') {
                    continue;
                }
                try {
                    $q = $conn->table($table)->where(function ($w) use ($col) {
                        $w->whereNull($col)->orWhere($col, '');
                    });
                    $count = (clone $q)->count();
                    if ($count === 0) {
                        continue;
                    }
                    $totalRows += $count;
                    $tableTouched += $count;
                    if ($dry) {
                        $this->line(sprintf('  %-22s %-14s : %6d ligne(s) à rattacher (%s)', $table, $label, $count, $col));
                    } else {
                        $q->update([$col => $value]);
                        $this->line(sprintf('  %-22s %-14s : %6d ligne(s) rattachées (%s)', $table, $label, $count, $col));
                    }
                } catch (\Throwable $e) {
                    $this->warn("  {$table} {$label} : ignoré ({$e->getMessage()})");
                }
            }
            if ($tableTouched === 0) {
                $this->line(sprintf('  %-22s : rien à faire', $table));
            }
        }

        $this->line('');
        $this->info(($dry ? '[SIMULATION] ' : '')."Total : {$totalRows} ligne(s) "
            .($dry ? 'seraient rattachées.' : 'rattachées au tenant par défaut.'));
        if ($dry) {
            $this->comment('Relancez sans --dry-run pour appliquer.');
        }
        return self::SUCCESS;
    }

    private function firstCol(array $candidates, array $cols): ?string
    {
        foreach ($candidates as $c) {
            if (in_array($c, $cols, true)) {
                return $c;
            }
        }
        return null;
    }
}
