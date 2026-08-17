<?php

namespace App\Models\Concerns;

use App\Support\AuditLogger;
use Illuminate\Support\Facades\Auth;

/**
 * Traçabilité : qui a créé / modifié / annulé une ligne, quand et pourquoi.
 *
 * - Remplit user_id + created_by à la création, updated_by à la mise à jour.
 * - À la suppression (soft delete), enregistre deleted_by et journalise via AuditLogger.
 * - Un motif d'annulation peut être positionné avant delete() via ->withMotif($texte).
 *
 * Column-tolerant : n'écrit que dans les colonnes présentes.
 */
trait HasTracabilite
{
    public ?string $motifAnnulation = null;

    protected static function bootHasTracabilite(): void
    {
        static::creating(function ($model) {
            $uid = Auth::id();
            if ($model->hasTraceColumn('user_id') && empty($model->user_id)) {
                $model->user_id = $uid;
            }
            if ($model->hasTraceColumn('created_by') && empty($model->created_by)) {
                $model->created_by = $uid;
            }
        });

        static::updating(function ($model) {
            if ($model->hasTraceColumn('updated_by')) {
                $model->updated_by = Auth::id();
            }
        });

        static::deleting(function ($model) {
            try {
                if ($model->hasTraceColumn('deleted_by')) {
                    $model->deleted_by = Auth::id();
                }
                if ($model->motifAnnulation !== null && $model->hasTraceColumn('motif_annulation')) {
                    $model->motif_annulation = $model->motifAnnulation;
                }
                // Persiste deleted_by/motif avant le soft delete effectif.
                if ($model->isDirty() && method_exists($model, 'saveQuietly')) {
                    $model->saveQuietly();
                }
            } catch (\Throwable $e) {
                // best-effort
            }
            AuditLogger::log('delete', trim(sprintf(
                'Annulation %s #%s%s',
                class_basename($model),
                $model->getKey(),
                $model->motifAnnulation ? ' — motif : '.$model->motifAnnulation : ''
            )));
        });
    }

    public function withMotif(?string $motif): static
    {
        $this->motifAnnulation = $motif;
        return $this;
    }

    public function hasTraceColumn(string $col): bool
    {
        try {
            return in_array($col, \App\Support\SchemaCache::columns($this->getTable(), $this->getConnectionName() ?: 'economat'), true);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
