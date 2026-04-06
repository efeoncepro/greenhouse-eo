# ISSUE-022 — Adjuntos de email convertidos a base64 string pueden corromper PDFs

## Ambiente

production + staging

## Detectado

2026-04-06, revision de codigo end-to-end del modulo de emails

## Sintoma

Los adjuntos PDF de recibos de nomina y reportes de export podrian llegar corruptos o con contenido ilegible al destinatario.

## Causa raiz

`src/lib/email/delivery.ts` lineas 51-55:

```typescript
const toResendAttachments = (attachments: EmailAttachment[] | undefined) =>
  (attachments ?? []).map(attachment => ({
    filename: attachment.filename,
    content: attachment.content.toString('base64'),
    contentType: attachment.contentType
  }))
```

El `content` del attachment (un `Buffer`) se convierte a string base64 antes de pasar a Resend. Sin embargo, el SDK de Resend v6 espera `content` como `Buffer` o `string` (raw). Al pasar base64, Resend puede:
1. Interpretar el string base64 literalmente como contenido del adjunto
2. Double-encode el contenido si internamente hace su propia conversion base64

**Nota**: Este issue requiere verificacion empirica. Es posible que Resend v6 detecte y decodifique base64 automaticamente, en cuyo caso el adjunto llega correcto. Pero el patron es fragil y no esta documentado como soportado.

## Impacto

- Afecta recibos de nomina individuales (`payroll_receipt` con PDF)
- Afecta reportes de export de nomina (`payroll_export` con PDF + CSV)
- Si los adjuntos estan corruptos, los colaboradores no pueden ver sus liquidaciones

## Solucion

Pasar el Buffer directamente sin conversion a base64:

```typescript
const toResendAttachments = (attachments: EmailAttachment[] | undefined) =>
  (attachments ?? []).map(attachment => ({
    filename: attachment.filename,
    content: attachment.content,
    contentType: attachment.contentType
  }))
```

Resend SDK maneja la codificacion internamente.

## Verificacion

1. Enviar un email de tipo `payroll_receipt` con adjunto PDF
2. Descargar el PDF del email recibido
3. Verificar que el PDF se abre correctamente y muestra el contenido esperado
4. Repetir con `payroll_export` (PDF + CSV)

## Estado

open

## Relacionado

- `src/lib/email/delivery.ts` (lineas 51-55)
- `src/emails/PayrollReceiptEmail.tsx`
- `src/emails/PayrollExportReadyEmail.tsx`
- Resend SDK v6 docs: attachment handling
