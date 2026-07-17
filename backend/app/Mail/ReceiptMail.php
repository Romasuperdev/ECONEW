<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public array $data,
        public string $pdfContent,
        public string $pdfName,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reçu de versement '.($this->data['recu'] ?? ''),
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.receipt', with: ['d' => $this->data]);
    }

    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfContent, $this->pdfName)
                ->withMime('application/pdf'),
        ];
    }
}
