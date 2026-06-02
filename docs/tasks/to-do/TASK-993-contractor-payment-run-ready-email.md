# TASK-993 — Contractor Payment Run Ready Email

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-013`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|communications|reliability|ui`
- Blocked by: `none`
- Branch: `task/TASK-993-contractor-payment-run-ready-email`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Cuando Finanzas ejecuta la corrida mensual de contractors y quedan ordenes de
pago preparadas, Greenhouse debe enviar un email operacional a los responsables
de Finanzas (ej. Humberly + Julio) con el resumen del periodo, links a las
ordenes y la nomina de contractors adjunta en PDF + Excel. El envio debe ser
idempotente, auditable, configurable por suscripcion y nunca debe dispararse al
descargar manualmente el reporte.

## Why This Task Exists

Hoy `/finance/contractor-payments` permite descargar la nomina de contractors
manualmente y la corrida mensual deja las ordenes en `pending_approval`, pero
no existe una notificacion automatica de "corrida lista para revision". Payroll
ya tiene el patron `payroll_export` (artefactos persistidos + email con adjuntos
+ resend), y contractors ya tiene email transaccional del comprobante individual
cuando el payable queda `paid` (`contractor_remittance_paid`). Falta el tramo
intermedio: avisar a Tesoreria/Finanzas que el lote contractor esta preparado y
requiere approval/payment lifecycle.

La solucion NO debe mandar email cada vez que alguien descarga el PDF. Eso
generaria duplicados, mezclaria una accion read-only con delivery operacional y
convertiria un reporte en side effect. El source of truth correcto es la corrida
mensual `greenhouse_sync.contractor_payment_runs` cuando termina `succeeded`
con ordenes preparadas.

## Goal

- Emitir un evento canonico al completar una corrida mensual contractor con
  ordenes de pago preparadas.
- Generar/reusar el paquete de artefactos de la nomina contractor (PDF + Excel)
  como adjuntos del email operacional.
- Enviar un email `contractor_payment_run_ready` a los suscriptores de Finanzas,
  con resumen, totales por moneda, ordenes creadas y CTA a Payment Orders.
- Registrar delivery/idempotencia/reintentos/dead-letter para que el operador
  pueda saber si el mail llego o fallo.
- Exponer un camino manual de reenvio desde la UI o API, sin ejecutar de nuevo
  la corrida ni crear ordenes duplicadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_ARCHITECTURE_V2.md`
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_EMAIL_PREVIEW_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- **No mail on download**: `GET /api/finance/contractor-payables/run-report`
  sigue siendo read-only y nunca envia email.
- **No confundir estados**: el email debe decir "nomina contractor preparada /
  ordenes pendientes de aprobacion", no "pagada".
- **Payment Orders owns payment**: el CTA principal debe llevar a
  `/finance/payment-orders`; no debe sugerir que el pago se ejecuto.
- **Recipients configurables**: Humberly + Julio son recipients iniciales de
  rollout, pero NO pueden quedar hardcodeados en codigo. Usar
  `greenhouse_notifications.email_subscriptions` / admin email subscriptions,
  o una primitive canonica equivalente verificada en discovery.
- **Idempotencia fuerte**: una corrida `payment_run_id` debe enviar como maximo
  un email automatico por recipient. Reintentos del dispatcher no duplican.
- **Adjuntos seguros**: los adjuntos deben generarse con los helpers canonicos
  del reporte contractor; no recomputar montos en el email.
- **Finance semantics**: bruto = gasto; neto = pago al contractor; retencion SII
  = pasivo separado a remesar al SII. El email debe preservar esta separacion.
- **No bypass de delivery infra**: usar `sendEmail`, `EmailType`,
  `EMAIL_PRIORITY_MAP`, preview meta y delivery logs existentes.
- **No romper payroll**: reusar patrones de payroll export como referencia, pero
  no tocar `payroll_entries`, `payroll_receipts` ni la entrega de recibos.

## Normative Docs

- `docs/tasks/complete/TASK-979-monthly-contractor-payment-run.md`
- `docs/tasks/complete/TASK-980-contractor-payment-run-report-pdf-excel.md`
- `docs/tasks/complete/TASK-981-contractor-payment-email-remittance.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-979` complete: `prepareMonthlyContractorPaymentRun`,
  `greenhouse_sync.contractor_payment_runs`, `paymentRunId`, `preparedOrderIds`.
- `TASK-980` complete: `buildContractorRunReport`,
  `generateContractorRunPdf`, `generateContractorRunExcel`,
  `GET /api/finance/contractor-payables/run-report`.
- `TASK-981` complete: contractor remittance email pattern, `sendEmail`
  attachment usage, dead-letter signal pattern.
- Email foundation:
  - `src/lib/email/delivery.ts`
  - `src/lib/email/types.ts`
  - `src/lib/email/templates.ts`
  - `src/lib/email/subscriptions.ts`
  - `src/app/api/admin/emails/preview/route.ts`
  - `src/app/api/admin/email-subscriptions/route.ts`
- Payroll export reference pattern:
  - `src/lib/payroll/payroll-export-packages.ts`
  - `src/lib/payroll/payroll-export-packages-store.ts`
  - `src/lib/payroll/dispatch-payroll-export-notifications.ts`
  - `src/app/api/hr/payroll/periods/[periodId]/resend-export-ready/route.ts`
  - `src/emails/PayrollExportReadyEmail.tsx`

### Blocks / Impacts

- Mejora la operacion manual post-corrida en `/finance/contractor-payments`.
- Mejora handoff Finanzas -> Tesoreria: la orden existe y debe ser aprobada.
- Habilita auditoria de delivery para "se aviso a Finanzas que el lote estaba
  listo".
- Puede alimentar futuro Notification Hub multi-canal; V1 solo exige email.
- No bloquea payment orders, settlement ni remittance individual.

### Files owned

Archivos existentes a tocar o revisar:

- `src/lib/contractor-engagements/payables/monthly-run.ts`
- `src/lib/contractor-engagements/payables/payment-run-store.ts`
- `src/lib/contractor-engagements/payables/run-report-reader.ts`
- `src/lib/contractor-engagements/payables/generate-contractor-run-pdf.tsx`
- `src/lib/contractor-engagements/payables/generate-contractor-run-excel.ts`
- `src/app/api/finance/contractor-payables/monthly-run/route.ts`
- `src/app/api/finance/contractor-payables/run-report/route.ts`
- `src/views/greenhouse/finance/contractor-payments/ContractorPaymentsWorkbenchView.tsx`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/index.ts`
- `src/lib/email/types.ts`
- `src/lib/email/templates.ts`
- `src/lib/email/subscriptions.ts`
- `src/emails/PayrollExportReadyEmail.tsx`
- `src/emails/ContractorRemittanceEmail.tsx`
- `src/emails/EmailTemplateBaseline.test.tsx`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/entitlements/runtime.ts`

Candidate new files under existing directories:

- `src/lib/contractor-engagements/payables/payment-run-artifacts.ts`
- `src/lib/contractor-engagements/payables/send-contractor-run-ready.ts`
- `src/lib/sync/projections/contractor-payment-run-ready-email.ts`
- `src/lib/reliability/queries/contractor-payment-run-ready-email-dead-letter.ts`
- `src/emails/ContractorPaymentRunReadyEmail.tsx`
- `src/app/api/finance/contractor-payables/monthly-run/[paymentRunId]/resend-ready-email/route.ts`
- Tests next to each new helper/projection/component.

Docs to update:

- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Monthly contractor run:
  - `src/lib/contractor-engagements/payables/monthly-run.ts`
  - `src/app/api/finance/contractor-payables/monthly-run/route.ts`
  - Table `greenhouse_sync.contractor_payment_runs`
  - Result includes `paymentRunId`, `preparedOrderIds`, `payablesIncluded`,
    `obligationsSwept`, `totalsByCurrency`, `cutoffDate`.
- Contractor report artifacts:
  - `buildContractorRunReport({ periodYear, periodMonth })`
  - `generateContractorRunPdf(report)`
  - `generateContractorRunExcel(report)`
  - `GET /api/finance/contractor-payables/run-report?periodYear=&periodMonth=&format=pdf|excel`
- Email infra:
  - `sendEmail({ emailType, recipients, context, attachments, sourceEventId, sourceEntity })`
  - `wasEmailAlreadySent(sourceEventId, sourceEntity, recipientEmail)`
  - `greenhouse_notifications.email_subscriptions`
  - `greenhouse_notifications.email_type_config`
  - Admin preview/test-send via `/admin/emails/preview`
- Payroll precedent:
  - `payroll_export` email attaches PDF + CSV and records delivery status.
  - `resend-export-ready` endpoint resends a payroll export-ready email.
- Contractor remittance precedent:
  - `contractor_remittance_paid` sends a PDF to the contractor only after the
    payable is `paid`.

### Gap

- `completeContractorPaymentRun` updates the run row but does not publish a
  domain event for "run ready".
- No `EmailType` exists for `contractor_payment_run_ready`.
- No email template exists for the contractor payment run summary.
- No artifact package helper persists/reuses the contractor PDF + Excel for the
  email; the download endpoint generates on demand.
- No projection sends the report to Finance subscribers when the run succeeds.
- No UI/API path exists to manually resend the run-ready email if delivery
  failed.
- No reliability signal exposes dead-letter / failed delivery for run-ready
  emails.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Event contract + run completion publisher

- Add event catalog support for a run-ready event. Proposed event:
  `finance.contractor_payment_run.ready`.
- Add aggregate type if needed:
  `AGGREGATE_TYPES.contractorPaymentRun = 'contractor_payment_run'`.
- Emit the event only after `completeContractorPaymentRun` succeeds and
  `preparedOrderIds.length > 0`.
- Payload must include:
  - `schemaVersion: 1`
  - `paymentRunId`
  - `periodYear`
  - `periodMonth`
  - `cutoffDate`
  - `preparedOrderIds`
  - `payablesIncluded`
  - `obligationsSwept`
  - `totalsByCurrency`
  - `triggerSource`
  - `triggeredByUserId`
  - `preparedAt`
  - explicit semantic flag `paymentState: 'prepared_not_paid'`
- Do not emit for `dryRun`.
- Do not emit for successful empty run (`preparedOrderIds.length === 0`) in V1.
  The UI already shows "Nada por preparar"; a mail with no work is noise.
- Ensure event publish does not happen inside a transaction that could roll back
  after `completeContractorPaymentRun`, unless the implementation proves atomic
  outbox semantics. Preferred: finish state update and publish outbox event in a
  controlled sequence with idempotency via `paymentRunId`.

### Slice 2 — Contractor run artifact package helper

- Create a contractor analogue to payroll export artifacts, but keep scope
  proportional:
  - helper can generate PDF + Excel buffers from `buildContractorRunReport`.
  - helper returns deterministic filenames:
    `nomina-contractors-<mes>-<año>.pdf` and
    `nomina-contractors-<mes>-<año>.xlsx`.
  - if persisting assets is already straightforward via asset registry, persist
    and record asset IDs on a new/additive table or columns; otherwise generate
    on send and document why this is acceptable for V1.
- If a schema is added, prefer additive and auditable:
  - `greenhouse_sync.contractor_payment_run_artifacts` or additive nullable
    columns on `contractor_payment_runs`, depending on discovery.
  - Store `pdf_asset_id`, `excel_asset_id`, `generated_at`, `generated_by`,
    delivery status fields.
- Do NOT store raw bank-sensitive data beyond what the PDF/Excel already
  contains.
- Do NOT recompute payout math in the email; artifacts read from report helper.

### Slice 3 — Email type, template and preview

- Add `contractor_payment_run_ready` to `EmailType`.
- Add priority mapping. Recommended: `broadcast`, mirroring `payroll_export`,
  because recipients are operational subscribers and unsubscribe/kill-switch
  controls should apply. If Discovery proves this must be non-optional, document
  and choose `transactional` with explicit justification.
- Create `ContractorPaymentRunReadyEmail` with:
  - subject: `Nómina de contractors lista — <Mes Año>`.
  - eyebrow: `CONTRACTORS · <MES AÑO>`.
  - headline: `Nómina de contractors preparada para revisión`.
  - body copy that says: "Se crearon ordenes de pago pendientes de aprobacion.
    Aun no es pago bancario."
  - summary rows:
    - cantidad de contractors/payables incluidos
    - obligaciones barridas
    - ordenes creadas
    - cutoff / fecha comprometida
    - neto total por moneda
    - retencion SII por moneda/regimen if available from report
  - CTA: `Revisar ordenes de pago` -> `/finance/payment-orders`.
  - secondary text: "La retencion SII se remesa al SII por separado."
  - attachments section: PDF + Excel.
- Register template in `src/lib/email/templates.ts`.
- Register preview meta so `/admin/emails/preview` can render/test-send it.
- Add email component tests and baseline snapshot if consistent with current
  email test suite.
- Copy must use the existing email design system (`EmailLayout`, buttons,
  tokens) and avoid hardcoded reusable copy outside the template/context.

### Slice 4 — Recipient resolver + initial subscriptions

- Use `getSubscribers('contractor_payment_run_ready')` as the canonical V1
  recipient resolver, unless Discovery finds a newer Notification Hub primitive
  already active for this case.
- Seed initial subscribers for:
  - Humberly Henriquez `[verificar email/user_id desde DB o identity profile]`
  - Julio Reyes `[verificar email/user_id desde DB o current admin profile]`
- Do not hardcode names/emails in runtime code.
- If there are no active subscribers:
  - automatic projection should skip honestly and capture a finance warning;
  - manual resend endpoint should return a clear 409/422 with `no_subscribers`.
- Ensure `email_type_config` kill switch can pause this email type without code
  deploy.
- Confirm unsubscribe behavior is acceptable for this operational email. If
  Finance decides the email must be mandatory, document why and avoid using
  broadcast priority.

### Slice 5 — Reactive projection sender

- Add a projection:
  `contractor_payment_run_ready_email`.
- Trigger event: `finance.contractor_payment_run.ready`.
- Re-read the run row from Postgres by `paymentRunId`; never trust payload
  amounts as the source of truth.
- Verify run is still:
  - `status='succeeded'`
  - `prepared_order_ids` non-empty
  - matching period/year/month from event if present
- Build or reuse report artifacts from Slice 2.
- Send email with:
  - `emailType: 'contractor_payment_run_ready'`
  - `domain: 'finance'`
  - recipients from Slice 4
  - PDF + Excel attachments
  - `sourceEventId` from outbox `_eventId`
  - `sourceEntity = paymentRunId`
- Idempotency:
  - same `sourceEventId` + `sourceEntity` + recipient never sends twice.
  - dispatcher retry sends zero duplicates.
  - if manual resend uses a new source event/entity key, it must be explicit and
    audited as manual.
- Failure behavior:
  - no subscribers -> skip and capture, no dead-letter.
  - artifact generation failure -> throw, retry, dead-letter if persistent.
  - email provider failure -> throw, retry, dead-letter if persistent.
- Register projection in `src/lib/sync/projections/index.ts`.

### Slice 6 — Manual resend API + UI affordance

- Add a resend endpoint, proposed:
  `POST /api/finance/contractor-payables/monthly-run/[paymentRunId]/resend-ready-email`.
- Gate with Finance tenant + appropriate capability. Recommended:
  `finance.contractor_payable:manage` for V1, or a new
  `finance.contractor_payment_run.notify` only if discovery shows current
  capability is too broad.
- Endpoint behavior:
  - validate run exists and belongs to requested tenant/scope if applicable.
  - validate `status='succeeded'`.
  - validate `prepared_order_ids.length > 0`.
  - send with `manual_resend` delivery source and actor user ID.
  - return recipients count, delivery IDs/statuses, and artifact filenames.
- UI:
  - after successful monthly run modal, show secondary action
    `Reenviar email a Finanzas` only if run has `paymentRunId` and prepared
    orders.
  - in workbench, expose last run delivery status if cheap to read; otherwise
    leave UI minimal and rely on endpoint response.
  - no duplicate primary action: "Iniciar corrida mensual" remains the main
    action; resend is contextual.
- Manual resend must never re-run `prepareMonthlyContractorPaymentRun` and never
  create payment orders.

### Slice 7 — Reliability signal + admin observability

- Add a reliability signal:
  `finance.contractor_payment_run_ready_email.dead_letter`.
- Query `greenhouse_sync.outbox_reactive_log` for handler
  `contractor_payment_run_ready_email:finance.contractor_payment_run.ready`
  dead-letters / exhausted retries.
- Include run IDs, period labels and last error summaries in `sampleRows`.
- Wire into `getReliabilityOverview` under Finance Data Quality / Finance
  Operations.
- Add optional signal or dashboard read for "no subscribers configured" only if
  it is actionable and not noisy. A one-time seed verification may be enough.
- Ensure failed email deliveries from `sendEmail` are visible through existing
  email delivery logs/admin email tooling.

### Slice 8 — Documentation and rollout

- Update manual:
  - `docs/manual-de-uso/finance/pagos-a-contractors.md`
  - `docs/manual-de-uso/finance/ordenes-de-pago.md`
- Update functional docs:
  - `docs/documentation/finance/pagos-a-contractors.md`
  - `docs/documentation/finance/ordenes-de-pago.md` if needed.
- Update architecture:
  - contractor payables architecture: add run-ready notification chain.
  - payment orders architecture: clarify email says prepared, not paid.
  - event catalog if the repo keeps event docs there.
- Update `docs/tasks/README.md`, `Handoff.md`, `changelog.md`.
- Add runbook notes:
  - how to add/remove recipients via email subscriptions UI/API.
  - how to resend.
  - what to do if dead-letter appears.
  - why no mail is sent for dry-run/empty run.

## Out of Scope

- No automatic bank payment.
- No automatic approval of payment orders.
- No email to contractors from this task; that remains
  `contractor_remittance_paid` after `payable.status='paid'`.
- No Teams/Slack notification in V1. This task should leave a clean event that
  Notification Hub can consume later.
- No replacing the manual "Descargar nomina" button.
- No changing report math, SII withholding rate, payable readiness, or payment
  order settlement.
- No hardcoding Humberly/Julio in source code.
- No migration of payroll export packages.

## Detailed Spec

### Proposed event contract

```ts
EVENT_TYPES.contractorPaymentRunReady = 'finance.contractor_payment_run.ready'
AGGREGATE_TYPES.contractorPaymentRun = 'contractor_payment_run'

type ContractorPaymentRunReadyPayloadV1 = {
  schemaVersion: 1
  paymentRunId: string
  periodYear: number
  periodMonth: number
  cutoffDate: string
  preparedOrderIds: string[]
  payablesIncluded: number
  obligationsSwept: number
  totalsByCurrency: Record<string, { payables: number; netTotal: string }>
  triggerSource: 'manual' | 'scheduled'
  triggeredByUserId: string | null
  preparedAt: string
  paymentState: 'prepared_not_paid'
}
```

Emission rule:

```text
dryRun=true                         -> no event
succeeded + preparedOrderIds=[]      -> no event
succeeded + preparedOrderIds.length  -> publish finance.contractor_payment_run.ready
failed                              -> no ready email; existing error path
```

### Proposed email context

```ts
type ContractorPaymentRunReadyEmailContext = {
  periodLabel: string
  cutoffDateLabel: string
  payablesIncluded: number
  obligationsSwept: number
  orderCount: number
  orderLinks: Array<{ orderId: string; title?: string | null; href: string }>
  totalsByCurrency: Array<{
    currency: string
    payables: number
    netTotal: string
    grossTotal?: string
    withholdingTotal?: string
  }>
  preparedByLabel: string | null
  preparedAtLabel: string
  portalUrl: string
  paymentOrdersUrl: string
  attachments: Array<{ filename: string; label: string }>
}
```

The email subject/body must not include "pagado" except in the explicit warning
"aun no esta pagado".

### Recipient resolution

V1 source:

```text
greenhouse_notifications.email_subscriptions
WHERE email_type = 'contractor_payment_run_ready'
  AND active = TRUE
```

Initial seed must be explicit and audited. Use real user/profile lookup in
discovery. If emails cannot be verified safely, do not seed fake rows; leave the
task blocked at rollout with `[verificar]`.

### Artifact handling options

Preferred implementation if cheap:

```text
getOrCreateContractorPaymentRunArtifacts(paymentRunId)
  -> read run
  -> buildContractorRunReport(periodYear, periodMonth)
  -> generateContractorRunPdf(report)
  -> generateContractorRunExcel(report)
  -> persist assets in canonical asset storage
  -> record asset IDs/delivery metadata
```

Acceptable V1 if persistence is too large for this slice:

```text
buildContractorPaymentRunEmailAttachments(paymentRunId)
  -> re-read run
  -> build report
  -> generate buffers
  -> attach directly
```

If choosing direct buffers, the implementation must document why no persistent
artifact table was added and must preserve idempotent email delivery. This is
not a workaround if the report endpoint already regenerates deterministic
artifacts and payload sizes stay within Resend limits.

### Delivery records

At minimum, rely on existing email delivery logs from `sendEmail`.

If adding run-level delivery columns/table, mirror payroll export fields:

- `delivery_status`: `pending|sent|failed`
- `delivery_attempts`
- `last_sent_at`
- `last_sent_by`
- `last_email_delivery_id`
- `last_send_error`

Do not make the payment run mutable beyond the existing allowed completion patch
unless the DB trigger permits it. If `contractor_payment_runs` is append-only
except completion, prefer a separate delivery table over weakening the trigger.

### Manual resend source identity

Automatic:

```text
sourceEventId = outbox event id
sourceEntity = paymentRunId
```

Manual:

```text
sourceEventId = contractor-payment-run-ready:manual:<paymentRunId>:<requestId>
sourceEntity = paymentRunId
actorEmail/userId = requester
```

Manual resend may intentionally send again; it must be auditable and visible in
email logs. It must not bypass recipient subscriptions unless endpoint includes
an explicit recipient override and a reason. Recipient override is out of scope
for V1 unless operator requests it during implementation.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (event contract) -> Slice 5 (projection). The projection must not be
  registered before the event type exists.
- Slice 2 (artifact helper) -> Slice 3 (template attachments) -> Slice 5
  (projection). Projection needs artifacts and template.
- Slice 4 (subscribers/recipient resolver) must ship before Slice 5 sends in
  production, or projection must skip honestly with `no_subscribers`.
- Slice 6 (manual resend) depends on Slice 3 + Slice 4 + Slice 2.
- Slice 7 (signal) can ship after Slice 5 is registered.
- Slice 8 closes after all behavior is verified.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Email duplicado por retry o doble corrida | email/outbox | medium | `sourceEventId` + `sourceEntity` + recipient idempotency; run re-read; no mail on download | email delivery duplicate query; `contractor_payment_run_ready_email.dead_letter` |
| Email dice o insinua que el pago ya ocurrio | finance/communications | medium | Copy explicit "preparada / pendiente aprobacion / no pagada"; UX writing review; email snapshot tests | Manual review + preview |
| Adjuntos muestran periodo vacio o equivocado | finance/reporting | medium | Build report from run period; include period label; tests with non-empty report; verify against UI run result | Test failures; operator QA |
| Recipients hardcodeados quedan stale | communications/access | medium | Use `email_subscriptions`; seed only initial rows; no runtime literals | no_subscribers capture |
| Email se envia aunque no hay ordenes | communications | low | Do not emit event for empty run; projection re-checks `prepared_order_ids` | Projection skip message |
| Attachment size too large | email | low | Check PDF+Excel size; if > provider limit, send links instead of attachments as fallback | sendEmail failure/dead-letter |
| Projection failure blocks payment run | outbox/finance | low | Event emitted after run success; projection async; failures do not rollback orders | reactive dead-letter |
| New schema weakens append-only audit | postgres/data | low | Prefer separate delivery table if run trigger disallows delivery updates | migration review / tests |

### Feature flags / cutover

Recommended flag:

- `CONTRACTOR_PAYMENT_RUN_READY_EMAIL_ENABLED`
  - default `false` in initial merge if the projection is registered and could
    send in production immediately.
  - Flip to `true` in staging after subscriber seed + preview + test send.
  - Flip to `true` in production after first staging run smoke.
  - Revert: set `false` + redeploy/restart relevant runtime if env-based.

Alternative:

- Use `email_type_config.enabled=false` as the kill switch for
  `contractor_payment_run_ready`. This is acceptable only if the projection
  still records a clear skipped/paused result and does not throw.

The agent must choose one primary cutover mechanism in Plan Mode and document
why. Do not rely on both silently.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Disable event publish via flag or revert commit; event rows already published are harmless if projection disabled | <5 min | si |
| Slice 2 | Revert helper; if schema added, leave additive table/columns unused until cleanup | <15 min | si |
| Slice 3 | Disable `email_type_config` or remove template registration via revert | <5 min | si |
| Slice 4 | Deactivate subscribers in `greenhouse_notifications.email_subscriptions` | <5 min | si |
| Slice 5 | Disable projection via flag/email type config; revert registration if needed | <5 min | si |
| Slice 6 | Revert route/UI; no data mutation beyond email logs | <10 min | si |
| Slice 7 | Remove signal wiring or let it report zero once projection disabled | <10 min | si |
| Slice 8 | Docs rollback not required; update with corrected state if behavior changes | n/a | si |

### Production verification sequence

1. Run focused tests for monthly run, artifact helper, email template, projection
   and reliability signal.
2. Run `pnpm lint`, `pnpm exec tsc --noEmit --pretty false`, and relevant
   focused `vitest` suites.
3. Verify email template in `/admin/emails/preview` locally or staging.
4. Seed staging subscribers for Humberly/Julio equivalents or test accounts.
5. Execute staging dry-run: confirm no email.
6. Execute staging real run with a controlled payable fixture:
   - payment order created;
   - event published;
   - projection sent exactly one email per active subscriber;
   - PDF + Excel attached;
   - email says pending approval / not paid;
   - no contractor receives this email.
7. Click CTA and confirm `/finance/payment-orders` opens the created order.
8. Trigger manual resend and confirm a second audited manual delivery, without
   new payment orders.
9. Verify dead-letter signal is `ok`.
10. Flip production only after staging evidence is attached to Handoff.
11. First production run: confirm delivery logs and ask recipients to verify
    receipt.

### Out-of-band coordination required

- Confirm exact recipients for initial production seed:
  - Humberly Henriquez email/user ID `[verificar]`
  - Julio Reyes email/user ID `[verificar]`
- Confirm whether `contractor_payment_run_ready` is optional (`broadcast`) or
  mandatory operational (`transactional`).
- If Resend attachment size limits are exceeded by real Excel/PDF, approve
  fallback to signed portal links rather than attachments.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] A successful non-empty contractor monthly run emits a canonical
      `finance.contractor_payment_run.ready` event exactly once per run.
- [ ] Dry-run and empty successful run do not send automatic email.
- [ ] `contractor_payment_run_ready` exists as an email type with priority,
      template, plain text and preview metadata.
- [ ] The email uses active subscribers, not hardcoded Humberly/Julio literals.
- [ ] The initial production rollout has verified subscribers for Humberly and
      Julio, or rollout remains blocked with explicit `[verificar]` note.
- [ ] The email includes PDF + Excel contractor run report attachments generated
      by the canonical TASK-980 helpers.
- [ ] The email clearly states the run is prepared/pending approval and not yet
      paid.
- [ ] The projection is idempotent under dispatcher retry and does not duplicate
      emails per recipient.
- [ ] A manual resend endpoint/path exists and does not re-run the payment run
      or create additional payment orders.
- [ ] A reliability signal exposes dead-letter/failure for the run-ready email.
- [ ] Admin email preview can render and test-send the template.
- [ ] Docs/manuals explain that Finanzas receives the email when the run is
      ready, and the next action is Payment Orders approval/payment.
- [ ] No payroll receipt/export tests regress.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/contractor-engagements/payables/monthly-run.test.ts`
- `pnpm exec vitest run src/lib/contractor-engagements/payables/generate-contractor-run-pdf.test.ts src/lib/contractor-engagements/payables/generate-contractor-run-excel.test.ts src/lib/contractor-engagements/payables/run-report-reader.test.ts`
- `pnpm exec vitest run src/lib/sync/projections/contractor-payment-run-ready-email.test.ts`
- `pnpm exec vitest run src/lib/email/templates.test.ts src/emails/EmailTemplateBaseline.test.tsx`
- `pnpm exec vitest run src/lib/reliability/queries/contractor-payment-run-ready-email-dead-letter.test.ts`
- `pnpm exec vitest run src/lib/payroll/payroll-export-packages.test.ts src/lib/sync/projections/payroll-receipts.test.ts`
- `pnpm build`
- GVC or Playwright evidence for `/finance/contractor-payments`:
  - monthly run success modal;
  - resend affordance if implemented in UI;
  - no visual overlap/regression.
- Staging email smoke:
  - test-send from `/admin/emails/preview`;
  - real run sends to subscribers;
  - attachments open and match report period.

## Closing Protocol

- [ ] Move task file to `docs/tasks/complete/`.
- [ ] Update `Lifecycle` to `complete`.
- [ ] Update `docs/tasks/README.md`.
- [ ] Update `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `docs/epics/to-do/EPIC-013-contractor-engagements-global-payables-program.md` if epic remains open.
- [ ] Update `Handoff.md` with rollout evidence and exact production subscriber seed.
- [ ] Update `changelog.md`.
- [ ] Document any feature flag/env var and its final production value.
- [ ] If rollout remains disabled, close as `code complete, rollout pendiente`,
      not `complete`.
