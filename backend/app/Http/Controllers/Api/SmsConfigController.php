<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Configuration de la passerelle SMS par établissement.
 * Stockée dans une table auxiliaire ECO_SMS_CONFIG (créée automatiquement).
 */
class SmsConfigController extends Controller
{
    private const TABLE = 'ECO_SMS_CONFIG';

    private function ensure(): bool
    {
        try {
            if (! Schema::connection('economat')->hasTable(self::TABLE)) {
                Schema::connection('economat')->create(self::TABLE, function ($t) {
                    $t->increments('id');
                    $t->string('CODESOCIETE', 50)->nullable();
                    $t->string('CODEETABLISSEMENT', 50)->nullable();
                    $t->boolean('ENABLED')->default(0);
                    $t->string('NAME', 150)->nullable();
                    $t->string('PROVIDER', 100)->nullable();
                    $t->string('ENVIRONMENT', 20)->default('test');
                    $t->string('API_URL', 255)->nullable();
                    $t->string('API_KEY', 255)->nullable();
                    $t->string('API_SECRET', 255)->nullable();
                    $t->string('SENDER_ID', 50)->nullable();
                    $t->boolean('DELIVERY_REPORTS')->default(0);
                    $t->boolean('LONG_SMS')->default(0);
                    $t->boolean('AUTO_NOTIF')->default(0);
                    $t->dateTime('UPDATED_AT')->nullable();
                });
            }
            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function row()
    {
        if (! $this->ensure()) {
            return null;
        }
        try {
            return DB::connection('economat')->table(self::TABLE)
                ->where('CODESOCIETE', SocieteContext::current())
                ->where('CODEETABLISSEMENT', EtablissementContext::current())
                ->first();
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function normalize($r): array
    {
        return [
            'enabled' => (bool) ($r->ENABLED ?? false),
            'name' => $r->NAME ?? '',
            'provider' => $r->PROVIDER ?? '',
            'environment' => $r->ENVIRONMENT ?? 'test',
            'api_url' => $r->API_URL ?? '',
            'api_key' => $r->API_KEY ?? '',
            'api_secret' => $r->API_SECRET ?? '',
            'sender_id' => $r->SENDER_ID ?? '',
            'delivery_reports' => (bool) ($r->DELIVERY_REPORTS ?? false),
            'long_sms' => (bool) ($r->LONG_SMS ?? false),
            'auto_notif' => (bool) ($r->AUTO_NOTIF ?? false),
        ];
    }

    public function show()
    {
        $r = $this->row();
        if (! $r) {
            return response()->json($this->normalize((object) []));
        }
        return response()->json($this->normalize($r));
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'enabled' => ['nullable', 'boolean'],
            'name' => ['nullable', 'string', 'max:150'],
            'provider' => ['nullable', 'string', 'max:100'],
            'environment' => ['nullable', 'string', 'max:20'],
            'api_url' => ['nullable', 'string', 'max:255'],
            'api_key' => ['nullable', 'string', 'max:255'],
            'api_secret' => ['nullable', 'string', 'max:255'],
            'sender_id' => ['nullable', 'string', 'max:50'],
            'delivery_reports' => ['nullable', 'boolean'],
            'long_sms' => ['nullable', 'boolean'],
            'auto_notif' => ['nullable', 'boolean'],
        ]);

        if (! $this->ensure()) {
            return response()->json(['message' => 'Table de configuration indisponible.'], 422);
        }

        $payload = [
            'CODESOCIETE' => SocieteContext::current(),
            'CODEETABLISSEMENT' => EtablissementContext::current(),
            'ENABLED' => ! empty($data['enabled']) ? 1 : 0,
            'NAME' => $data['name'] ?? null,
            'PROVIDER' => $data['provider'] ?? null,
            'ENVIRONMENT' => $data['environment'] ?? 'test',
            'API_URL' => $data['api_url'] ?? null,
            'API_KEY' => $data['api_key'] ?? null,
            'API_SECRET' => $data['api_secret'] ?? null,
            'SENDER_ID' => $data['sender_id'] ?? null,
            'DELIVERY_REPORTS' => ! empty($data['delivery_reports']) ? 1 : 0,
            'LONG_SMS' => ! empty($data['long_sms']) ? 1 : 0,
            'AUTO_NOTIF' => ! empty($data['auto_notif']) ? 1 : 0,
            'UPDATED_AT' => now(),
        ];

        try {
            $exists = DB::connection('economat')->table(self::TABLE)
                ->where('CODESOCIETE', $payload['CODESOCIETE'])
                ->where('CODEETABLISSEMENT', $payload['CODEETABLISSEMENT'])
                ->exists();
            if ($exists) {
                DB::connection('economat')->table(self::TABLE)
                    ->where('CODESOCIETE', $payload['CODESOCIETE'])
                    ->where('CODEETABLISSEMENT', $payload['CODEETABLISSEMENT'])
                    ->update($payload);
            } else {
                DB::connection('economat')->table(self::TABLE)->insert($payload);
            }
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Enregistrement impossible : '.$e->getMessage()], 422);
        }

        AuditLogger::log('update', 'Configuration SMS mise à jour');

        return $this->show();
    }
}
