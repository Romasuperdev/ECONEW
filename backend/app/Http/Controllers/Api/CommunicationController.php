<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Support\AuditLogger;
use App\Support\EtablissementContext;
use App\Support\SocieteContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;

/**
 * Communication de masse (SMS & e-mail) vers les tuteurs des élèves.
 * L'audience se choisit par Niveau, Classe ou Élève.
 */
class CommunicationController extends Controller
{
    private const SMS_TABLE = 'ECO_SMS_CONFIG';

    /**
     * Résout la liste des élèves ciblés.
     *
     * @param  string  $cible  niveau|classe|eleve
     * @param  array<int,string>  $ids
     * @return \Illuminate\Support\Collection
     */
    private function resolveStudents(string $cible, array $ids)
    {
        $ids = array_values(array_filter(array_map(fn ($v) => is_string($v) ? trim($v) : $v, $ids), fn ($v) => $v !== null && $v !== ''));
        if (empty($ids)) {
            return collect();
        }

        $column = match ($cible) {
            'niveau' => 'CodeNiveau',
            'classe' => 'CodeClasse',
            'eleve' => 'Matricule',
            default => null,
        };
        if ($column === null) {
            return collect();
        }

        try {
            return Student::forTenant()->whereIn($column, $ids)->get();
        } catch (\Throwable $e) {
            return collect();
        }
    }

    /** Premier téléphone non vide : tuteur, père, mère, élève. */
    private function pickPhone(array $n): ?string
    {
        foreach (['guardian_phone', 'father_phone', 'mother_phone', 'phone'] as $k) {
            $v = trim((string) ($n[$k] ?? ''));
            if ($v !== '') {
                return $v;
            }
        }
        return null;
    }

    /** Premier e-mail non vide : élève, père, mère. */
    private function pickEmail(array $n): ?string
    {
        foreach (['email', 'father_email', 'mother_email'] as $k) {
            $v = trim((string) ($n[$k] ?? ''));
            if ($v !== '') {
                return $v;
            }
        }
        return null;
    }

    /**
     * Aperçu des destinataires : total, avec téléphone, avec e-mail + liste (max 200).
     */
    public function destinataires(Request $request)
    {
        $data = $request->validate([
            'cible' => ['required', 'string', 'in:niveau,classe,eleve'],
            'ids' => ['required', 'array'],
            'ids.*' => ['nullable', 'string'],
        ]);

        $students = $this->resolveStudents($data['cible'], $data['ids']);

        $avecTel = 0;
        $avecMail = 0;
        $apercu = [];
        foreach ($students as $s) {
            $n = $s->toNormalized();
            $tel = $this->pickPhone($n);
            $mail = $this->pickEmail($n);
            if ($tel) {
                $avecTel++;
            }
            if ($mail) {
                $avecMail++;
            }
            if (count($apercu) < 200) {
                $apercu[] = [
                    'matricule' => $n['matricule'],
                    'nom' => $n['full_name'],
                    'telephone' => $tel,
                    'email' => $mail,
                ];
            }
        }

        return response()->json([
            'total' => $students->count(),
            'avec_telephone' => $avecTel,
            'avec_email' => $avecMail,
            'apercu' => $apercu,
        ]);
    }

    /**
     * Envoi SMS de masse via la passerelle configurée (ECO_SMS_CONFIG).
     * Best-effort : ne jamais échouer si la passerelle n'est pas configurée.
     */
    public function sms(Request $request)
    {
        $data = $request->validate([
            'message' => ['required', 'string', 'max:480'],
            'cible' => ['required', 'string', 'in:niveau,classe,eleve'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['nullable', 'string'],
        ]);

        $students = $this->resolveStudents($data['cible'], $data['ids']);

        // Téléphones distincts.
        $phones = [];
        foreach ($students as $s) {
            $tel = $this->pickPhone($s->toNormalized());
            if ($tel) {
                $phones[$tel] = true;
            }
        }
        $phones = array_keys($phones);

        $total = $students->count();
        $sansNumero = $total - count($phones);

        // Configuration de la passerelle.
        $config = null;
        try {
            if (Schema::connection('economat')->hasTable(self::SMS_TABLE)) {
                $config = DB::connection('economat')->table(self::SMS_TABLE)
                    ->where('CODESOCIETE', SocieteContext::current())
                    ->where('CODEETABLISSEMENT', EtablissementContext::current())
                    ->first();
            }
        } catch (\Throwable $e) {
            $config = null;
        }

        $apiUrl = trim((string) ($config->API_URL ?? ''));
        $apiKey = (string) ($config->API_KEY ?? '');
        $senderId = (string) ($config->SENDER_ID ?? '');
        $configure = $apiUrl !== '';

        $envoyes = 0;
        $echecs = 0;

        if ($configure) {
            foreach ($phones as $phone) {
                try {
                    $resp = Http::timeout(15)->asForm()->post($apiUrl, [
                        'to' => $phone,
                        'message' => $data['message'],
                        'sender' => $senderId,
                        'api_key' => $apiKey,
                    ]);
                    if ($resp->successful()) {
                        $envoyes++;
                    } else {
                        $echecs++;
                    }
                } catch (\Throwable $e) {
                    $echecs++;
                }
            }
            $message = "SMS traité : {$envoyes} envoyé(s), {$echecs} échec(s), {$sansNumero} sans numéro.";
        } else {
            $message = "La passerelle SMS n'est pas configurée. Renseignez l'URL de l'API dans Configuration > SMS pour envoyer des messages.";
        }

        AuditLogger::log('create', "Envoi SMS ({$data['cible']}) : {$envoyes}/".count($phones)." destinataire(s), ".($configure ? 'passerelle configurée' : 'passerelle non configurée'));

        return response()->json([
            'total' => $total,
            'envoyes' => $envoyes,
            'sans_numero' => $sansNumero,
            'echecs' => $echecs,
            'configure' => $configure,
            'message' => $message,
        ]);
    }

    /**
     * Envoi e-mail de masse via le mailer configuré (SMTP .env).
     * Best-effort : chaque échec est compté, jamais d'exception propagée.
     */
    public function mail(Request $request)
    {
        $data = $request->validate([
            'objet' => ['required', 'string', 'max:200'],
            'message' => ['required', 'string'],
            'cible' => ['required', 'string', 'in:niveau,classe,eleve'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['nullable', 'string'],
        ]);

        $students = $this->resolveStudents($data['cible'], $data['ids']);

        // E-mails distincts.
        $emails = [];
        foreach ($students as $s) {
            $mail = $this->pickEmail($s->toNormalized());
            if ($mail) {
                $emails[$mail] = true;
            }
        }
        $emails = array_keys($emails);

        $total = $students->count();
        $sansEmail = $total - count($emails);

        $objet = $data['objet'];
        $corps = $data['message'];

        $envoyes = 0;
        $echecs = 0;
        foreach ($emails as $email) {
            try {
                Mail::raw($corps, function ($m) use ($email, $objet) {
                    $m->to($email)->subject($objet);
                });
                $envoyes++;
            } catch (\Throwable $e) {
                $echecs++;
            }
        }

        $message = "E-mail traité : {$envoyes} envoyé(s), {$echecs} échec(s), {$sansEmail} sans e-mail.";

        AuditLogger::log('create', "Envoi e-mail ({$data['cible']}) : {$envoyes}/".count($emails)." destinataire(s)");

        return response()->json([
            'total' => $total,
            'envoyes' => $envoyes,
            'sans_email' => $sansEmail,
            'echecs' => $echecs,
            'message' => $message,
        ]);
    }
}
