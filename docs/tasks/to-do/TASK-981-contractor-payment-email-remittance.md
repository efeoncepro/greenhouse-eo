# TASK-981 — Contractor Payment Email + Remittance Attachment (+ canonical `.paid` event)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|hr|communications`
- Blocked by: `none` (TASK-977 settlement ya completa — el payable ya transiciona a `paid`)
- Branch: `task/TASK-981-contractor-payment-email-remittance`
- Legacy ID: `none`

## Summary

Cuando un contractor payable pasa a **`paid`**, envía automáticamente un **email al contractor** con su **Comprobante de Pago (remittance advice, TASK-960) en PDF adjunto**, vía la infra de email canónica (Resend + `EmailAttachment` + delivery tracking). Incluye, como **fundación reusable**, el evento de dominio **`workforce.contractor_payable.paid v1`** que hoy **falta** en el state machine del payable (las otras transiciones emiten outbox event; `paid` no).

## Why This Task Exists

El operador pidió (2026-05-31) "enviar un email al contractor al pagarle con su comprobante de pago adjunto". Verificado:

- El `contractor_payable` emite outbox events para `created`/`ready_for_finance`/`obligation_created`/`blocked`/`cancelled` pero **NO para `paid`** (el state machine transiciona `payment_order_created → paid` sin evento). → falta el evento canónico.
- La infra de email **ya existe** (`src/lib/email/`: `SendEmailInput`, `EmailAttachment`, Resend, delivery tracking `pending|sent|failed|delivered|dead_letter`) + templates React Email en `src/emails/` (`PayrollReceiptEmail`, `PayrollLiquidacionV2Email` — el patrón a espejar).
- El **comprobante** ya existe (TASK-960: `resolveRemittanceAdvice` + `generateContractorRemittancePdf` + numeración `EO-RA-NNNNNN`).

Falta el **pegamento reactivo**: evento `paid` → consumer → renderiza el comprobante + lo manda adjunto + trackea entrega.

## Mandatory Skills (OBLIGATORIO)

1. **`greenhouse-backend`** — outbox event versionado v1, reactive consumer (TASK-771 pattern), email delivery, idempotencia.
2. **`arch-architect`** (4-pillar) — el `.paid` como evento de dominio canónico (no email-específico); reactive consumer idempotente (no doble-envío); recipient resolution + degradación honesta.
3. **`greenhouse-finance-accounting-operator`** — el comprobante refleja el pago neto; la retención SII es pasivo separado (no se "paga" al contractor) — el email NO debe sugerir que la retención se le pagó.
4. **`greenhouse-ux-writing`** — copy es-CL del email (asunto, cuerpo, CTA). Si emerge diseño visual del email, **skills de product design** (espejar `PayrollReceiptEmail`).

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (documentar `workforce.contractor_payable.paid v1`)
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` / email delivery infra
- `CLAUDE.md` → "Contractor Remittance Advice invariants (TASK-960)" + "Finance — Reactive projections (TASK-771)" + "Outbox publisher canónico (TASK-773)"

Reglas obligatorias:

- **NUNCA** emitir el email desde el request path / inline en el mark-paid. Va por **outbox event `paid` → reactive consumer** (TASK-771): el settlement no se bloquea ni falla si el email falla.
- **NUNCA** enviar dos veces el mismo comprobante. Idempotencia por `(contractor_payable_id, email_kind)` — un email de comprobante por payable pagado (re-run safe).
- **NUNCA** enviar a un email inexistente/inválido. Resolver el email del contractor (identity_profile `canonical_email`); si no hay → **skip honesto** + signal, no error.
- **NUNCA** loggear el PDF ni el cuerpo completo del email (PII). `captureWithDomain(err, 'finance', ...)`; redactar.
- **NUNCA** sugerir en el copy que la retención SII se le pagó al contractor — el email confirma el **neto** + referencia el comprobante (que ya desglosa bruto/retención/neto, TASK-960).
- El `.paid` event es **canónico de dominio** (no email-específico): emitirlo en el path del settlement (mark-paid del payable), reusable por TASK-980 (reporte), Journey Intelligence Layer, analytics.

## Dependencies & Impact

### Depends on

- TASK-960 (`resolveRemittanceAdvice` + `generateContractorRemittancePdf`) — el comprobante.
- Email infra `src/lib/email/` (Resend + attachments + delivery tracking) + templates `src/emails/`.
- TASK-977 (settlement) — el payable ya transiciona a `paid`; acá se le agrega el evento.

### Blocks / Impacts

- Cierra el ciclo "pagamos → el contractor recibe su comprobante" sin intervención manual.
- El evento `.paid` desbloquea otros consumers (reporte, journey, analytics).

### Files owned

- `src/lib/contractor-engagements/payables/store.ts` + settlement path (emitir `workforce.contractor_payable.paid v1` en la tx del mark-paid)
- `src/config/...event-catalog...` (registrar el evento)
- `src/lib/sync/projections/contractor-payable-paid-email.ts` (reactive consumer)
- `src/emails/ContractorRemittanceEmail.tsx` (template, espejo `PayrollReceiptEmail`)
- `src/lib/reliability/queries/contractor-remittance-email-*.ts` (signal de entrega/dead_letter)

## Scope

### Slice 1 — Evento canónico `workforce.contractor_payable.paid v1`

- Emitir el outbox event en la misma tx en que el payable transiciona a `paid` (settlement path TASK-977). Payload: `contractorPayableId`, `engagementId`, `profileId`, `netAmount`, `currency`, `paidAt`, `remittanceNumber` (si ya asignado). Documentar en `EVENT_CATALOG`.
- **Evento de dominio reusable** — no email-específico.

### Slice 2 — Reactive consumer: email + comprobante adjunto

- Consumer (TASK-771 pattern) que, en `paid`: re-lee el payable (no confía el payload), resuelve el comprobante (`resolveRemittanceAdvice` + `generateContractorRemittancePdf`), resuelve el email del contractor (`identity_profile.canonical_email`), renderiza `ContractorRemittanceEmail` (es-CL), y envía vía la email infra con el PDF adjunto. Idempotente (un email por payable). Skip honesto si no hay email.

### Slice 3 — Reliability + cierre

- Signal `finance.contractor_remittance_email.dead_letter` (kind=dead_letter, steady=0). Docs + arch Delta + EVENT_CATALOG Delta.

## Out of Scope

- El comprobante en sí → TASK-960 (se reusa).
- El reporte de período → TASK-980.
- Notificaciones in-app / Teams del pago → futuro (el Notification Hub / journey podría sumarlo).

## Detailed Spec

**Trigger**: `paid` event (Slice 1). **Decoupled**: el settlement (rebajar banco) NUNCA depende del email. **Idempotente**: `(contractor_payable_id, 'remittance')` único — re-emitir el evento no re-envía. **Recipient**: `canonical_email` del `identity_profile`; sin email → skip + signal (no error). **Copy**: confirma el neto pagado + referencia el comprobante adjunto; NO sugiere que la retención se le pagó.

## Acceptance Criteria

- [ ] El payable emite `workforce.contractor_payable.paid v1` al pasar a `paid` (canónico, documentado en EVENT_CATALOG).
- [ ] El contractor recibe un email con su comprobante (PDF, TASK-960) adjunto al pagarle.
- [ ] Idempotente (un email por payable); skip honesto sin email; el settlement no se bloquea si el email falla.
- [ ] Signal de dead_letter operativo; steady=0. Copy es-CL tokenizado.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- `pnpm vitest run src/lib/contractor-engagements src/lib/email src/lib/sync`
- Smoke: marcar un payable de prueba `paid` en staging → verify email enviado con adjunto + delivery tracked + idempotente al re-emitir.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + mover a `complete/`
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md`
- [ ] `Handoff.md` + `changelog.md`
- [ ] chequeo de impacto cruzado (TASK-960, TASK-977, TASK-980, Journey Intelligence)
- [ ] CLAUDE.md invariant + arch Delta + **EVENT_CATALOG Delta** (el evento nuevo) + RELIABILITY_CONTROL_PLANE (el signal)

## Follow-ups

- Notificación in-app / Teams del pago (Notification Hub) si emerge.
- Email de comprobante para nómina si se quiere unificar (hoy payroll tiene `PayrollReceiptEmail` — patrón compartido).

## Open Questions

- ¿El email lleva el comprobante adjunto (PDF) o un link al comprobante in-app? (Plan Mode: adjunto es lo pedido; el link evita PII en el correo pero requiere auth — probablemente adjunto + link a la vista in-app.)
- ¿El `.paid` event se emite en `store.ts` (transición) o en el settlement atómico (TASK-977 `mark-paid-atomic`)? (Plan Mode: donde ocurre la transición real a `paid`, en la misma tx.)
