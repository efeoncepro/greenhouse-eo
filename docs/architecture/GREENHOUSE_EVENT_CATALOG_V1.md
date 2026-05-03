# Greenhouse Event Catalog V1

Catalogo canonico de eventos del sistema de outbox de Greenhouse. Cada evento se registra en `greenhouse_sync.outbox_events` y se publica a BigQuery via el consumer `outbox-publish`.

## Delta 2026-05-03 — TASK-766: CLP currency reader contract

Un nuevo evento canónico del dominio finance para hacer auditable el path de reparación de payments con drift CLP (`currency != 'CLP' AND amount_clp IS NULL`). Lo emite el endpoint admin de slice 5 y lo consume el AI Observer + audit log.

### `finance.payments.clp_repaired`

Aggregate type: `finance_payments_clp_repair`.

Publisher: `src/app/api/admin/finance/payments-clp-repair/route.ts` (endpoint admin POST gated por capability granular `finance.payments.repair_clp`, FINANCE_ADMIN + EFEONCE_ADMIN).

Schema v1:

```ts
type FinancePaymentsClpRepairedV1 = {
  eventVersion: 'v1'
  kind: 'expense_payments' | 'income_payments'
  dryRun: boolean
  candidatesScanned: number
  repaired: number
  skippedCount: number
  errorsCount: number
  skipped: Array<{ paymentId: string; reason: string }> // truncado a 50 para evitar payload bloat
  errors: Array<{ paymentId: string; message: string }> // idem
  actorUserId: string
  repairedAt: string // ISO timestamp del trigger
}
```

Consumers:

- **Audit log** — fuente de verdad de cuándo y quién disparó un repair (los UPDATEs `amount_clp` no carry actor; el outbox sí).
- **Reliability AI Observer** — correlaciona la curación del signal `finance.expense_payments.clp_drift` / `finance.income_payments.clp_drift` con la acción humana que la cerró.
- **Reliability dashboard** — útil para ver "drift detectado → repair ejecutado → drift volvió a 0" como un cycle visible.

Reglas:

- `aggregate_id` = `${kind}-${Date.now()}` (sintético; no hay un single-entity natural ya que el repair afecta una batch).
- El evento es **fire-and-forget**: si el publish falla, el repair no se rollbackea (los UPDATEs ya commitearon). El endpoint loggea via `captureWithDomain(err, 'finance', { tags: { source: 'payments_clp_repair_audit_publish' } })` y devuelve 200 con `eventId: null`.
- DryRun emite el evento igual con `dryRun: true` para que el audit log capture intentos de operador.
- Las arrays `skipped` / `errors` se truncan a 50 entries en el payload outbox; los counts (`skippedCount`, `errorsCount`) preservan la magnitud real. La response HTTP del endpoint sí incluye las arrays completas (no se truncan client-side).
- Steady state esperado: 0 events en ventana de 24h en producción saludable post-cutover (CHECK constraint `payments_amount_clp_required_after_cutover` impide nuevos drift).

## Delta 2026-05-02 — TASK-765: Payment Order Bank Settlement Resilience

Dos nuevos eventos canónicos del dominio finance para hacer observable y auditable la cadena `payment_order.paid → bank impact`. Los emiten distintos slices de TASK-765, pero ambos se documentan aquí porque comparten el mismo aggregate domain (`finance` / `payroll_expense`) y serán consumidos por la misma capa de Reliability + AI Observer.

### `finance.payment_order.settlement_blocked`

Aggregate type: `payment_order`.

Publisher (a partir de slice 4): `src/lib/finance/payment-orders/record-payment-from-order.ts` (proyección reactiva `record_expense_payment_from_order` cuando un step en la cadena `expense ↔ expense_payment ↔ settlement_leg ↔ account_balances` falla).

Schema v1:

```ts
type FinancePaymentOrderSettlementBlockedV1 = {
  eventVersion: 'v1'
  orderId: string
  state: 'paid'
  reason:
    | 'expense_unresolved'        // resolver no encontró expenses para (period_id, member_id)
    | 'account_missing'           // source_account_id NULL al transicionar
    | 'cutover_violation'         // CHECK expense_payments_account_required_after_cutover rechazó el INSERT
    | 'materializer_dead_letter'  // upstream payroll materializer en dead-letter
    | 'out_of_scope_v1'           // V1 del proyector no cubre este obligation_kind (e.g. employer_social_security)
  detail: string                  // mensaje human-readable, sanitizable
  affectedLineIds: string[]       // payment_order_lines afectadas
  retryableAfter?: string         // ISO timestamp, sugiere re-disparo
  blockedAt: string               // ISO timestamp del bloqueo
}
```

Consumers:

- **UI banner** en `PaymentOrderDetailDrawer.tsx` (slice 7) — alert rojo si la order tiene un evento reciente sin resolver, con CTA `Recuperar orden`.
- **Reliability AI Observer** (TASK-638) — correlaciona con dead-letter del proyector y signal `paid_orders_without_expense_payment` (slice 5/7).
- **Reliability signal `payment_orders_dead_letter`** (slice 7) — query directa al outbox + `outbox_reactive_log`.

Reglas:

- `aggregate_id` = `orderId`.
- Publicado **dentro de la misma transacción** que el throw del proyector cuando es posible; si no, en un commit separado pero antes de re-disparar refresh queue.
- Steady state esperado: 0 events en ventana de 24h en producción saludable.

### `finance.payroll_expenses.rematerialized`

Aggregate type: `payroll_expense`.

Publisher: `src/app/api/admin/finance/payroll-expense-rematerialize/route.ts` (endpoint admin de slice 3, gated por `finance.payroll.rematerialize`).

Schema v1:

```ts
type FinancePayrollExpensesRematerializedV1 = {
  eventVersion: 'v1'
  periodId: string                 // greenhouse_payroll.payroll_periods.period_id
  year: number                     // 2000-2100
  month: number                    // 1-12
  dryRun: boolean                  // true = preview (no INSERTs)
  payrollCreated: number           // filas `expenses` creadas (expense_type='payroll')
  payrollSkipped: number           // filas existentes (idempotencia)
  socialSecurityCreated: boolean   // true si se creó la fila Previred consolidada
  socialSecuritySkipped: boolean   // inverse
  actorUserId: string              // tenant.userId del admin
  rematerializedAt: string         // ISO timestamp del trigger
}
```

Consumers:

- **Audit log** — el evento es la fuente de verdad de cuándo y quién re-disparó la materialización (los `expenses` insertados también tienen `source_type='payroll_generated'`, pero NO carry actor — el outbox sí).
- **Reliability AI Observer** — útil para correlacionar la curación del signal `payroll_expense_materialization_lag` (slice 7) con la acción humana que la cerró.

Reglas:

- `aggregate_id` = `periodId`.
- El evento es **fire-and-forget**: si el publish falla, la materialización no se rollbackea (el endpoint loggea via `captureWithDomain` y devuelve 200 con `eventId: undefined`).
- DryRun emite el evento igual con `dryRun: true` para que el audit log capture intentos de operador (operativamente útil aunque no muten).

## Delta 2026-05-01 — TASK-748: Payment Obligations

Aggregate type nuevo: `payment_obligation`.

Eventos:

- `finance.payment_obligation.generated` — emitido por `createPaymentObligation` cuando se materializa una obligation desde una source (payroll, supplier_invoice, manual). Payload: `{ obligationId, sourceKind, sourceRef, periodId, beneficiaryType, beneficiaryId, obligationKind, amount, currency, status, spaceId }`.
- `finance.payment_obligation.superseded` — emitido por `supersedePaymentObligation` cuando una obligation viva (no pagada) es reemplazada por otra. Payload: `{ obligationId, supersededBy, reason, originalAmount, replacementAmount, deltaAmount, currency, beneficiaryId, obligationKind }`.

Consumers futuros:

- TASK-750 payment_orders consume `.generated` para construir ordenes.
- TASK-751 reconciliation consume `.superseded` para mantener delta auditable.
- Reliability AI Observer (TASK-638) puede correlacionar drift entre obligations y expenses.

Reglas:

- Eventos publicados DENTRO de la transaccion del INSERT/UPDATE para idempotencia.
- `aggregate_id` = `obligation_id`.
- Schema version implicita V1; no se necesita `schemaVersion: 2` (eventos entity-scoped, no period-scoped).

## Delta 2026-04-21

- `TASK-533` agrega el aggregate type `vat_position` y el evento `finance.vat_position.period_materialized`.
- La projection reactiva `vat_monthly_position` consume `finance.income.{created,updated,nubox_synced}` y `finance.expense.{created,updated,nubox_synced}` para recomputar la posicion mensual de IVA por `space_id`.
- El catálogo también se alinea a la realidad runtime de Nubox: `finance.expense.nubox_synced` ya existe como familia emitida/consumible y queda formalizado en esta versión documental.

## Delta 2026-04-22

- `TASK-550` agrega el aggregate type `pricing_catalog_approval`.
- Se formalizan dos eventos nuevos:
  - `commercial.pricing_catalog_approval.proposed`
  - `commercial.pricing_catalog_approval.decided`
- La proyección reactiva `pricing_catalog_approval_notifier` consume ambos eventos para despachar notificaciones in-app, email y Slack del approval workflow del pricing catalog.

## Delta 2026-04-20

- `TASK-452` agrega el aggregate type `service_attribution` y el evento `accounting.service_attribution.period_materialized`.
- La projection reactiva `service_attribution` ya escucha anchors de Finance, Services y Commercial (`income`, `expense`, `quotation`, `contract`, `deal`, `membership`, `assignment`, `service`).
- El evento nace como coarse-grained v2 para observabilidad y desacople de futuros consumers por servicio; en este corte no agrega un downstream reactivo obligatorio.

## Delta 2026-04-19

- `TASK-470` agrega el aggregate type `commercial_capacity` y el evento `commercial.capacity.overcommit_detected`.
- El payload canónico incluye `member_id`, `as_of_date`, período, `contracted_hours`, `commercial_availability_hours`, `commitment_hours`, `overcommit_hours`, `commitment_count` y el breakdown de commitments que causan el exceso.
- El evento nace para observabilidad/reactividad downstream; en este corte no se registra como trigger reactivo obligatorio.

## Infraestructura

| Componente | Ubicacion | Funcion |
|---|---|---|
| Tabla outbox | `greenhouse_sync.outbox_events` | Cola de eventos pendientes (Postgres) |
| Helper publicacion | `src/lib/sync/publish-event.ts` | `publishOutboxEvent()` — helper reutilizable |
| Catalogo tipos | `src/lib/sync/event-catalog.ts` | Constantes de aggregate types y event types |
| Consumer BigQuery | `src/lib/sync/outbox-consumer.ts` | Publica eventos a `greenhouse_raw.postgres_outbox_events` |
| Consumer reactivo | `src/lib/sync/reactive-consumer.ts` | Procesa eventos via projection registry |
| Projection registry | `src/lib/sync/projection-registry.ts` | Mapa declarativo evento → proyecciones afectadas |
| Projections | `src/lib/sync/projections/*.ts` | Definiciones individuales por proyeccion |
| Refresh queue | `src/lib/sync/refresh-queue.ts` | Cola persistente con dedup, prioridad y retry |
| Cron publish | `/api/cron/outbox-publish` | Cada 5 min — publica a BigQuery |
| Cron react (all) | `/api/cron/outbox-react` | Procesa todos los dominios (secuencial) |
| Cron react (org) | `/api/cron/outbox-react-org` | Solo dominio `organization` |
| Cron react (people) | `/api/cron/outbox-react-people` | Solo dominio `people` |
| Cron react (finance) | `/api/cron/outbox-react-finance` | Solo dominio `finance` |
| Cron react (notify) | `/api/cron/outbox-react-notify` | Solo dominio `notifications` |
| Cron react (delivery) | `/api/cron/outbox-react-delivery` | Solo dominio `delivery` (TASK-253) |
| Log reactivo | `greenhouse_sync.outbox_reactive_log` | Tracking con retries y dead-letter, keyed by `(event_id, handler)` |
| Recovery cron | `/api/cron/projection-recovery` | Cada 15 min — reclama items huérfanos (pending/processing >30 min) y re-ejecuta el refresh |
| Observabilidad | `/api/internal/projections` | Stats por proyeccion + queue health |

## Ciclo de vida de un evento

```
Mutacion en store
  -> publishOutboxEvent() inserta en outbox_events (status: 'pending')
  -> outbox-publish cron lee pending, escribe a BigQuery, marca 'published'
  -> outbox-react cron lee published + tipo reactivo, ejecuta handler, registra en reactive_log (evento + handler)
```

## Schema versioning convention

> Introducido por TASK-379 el 2026-04-13. El event catalog no versionaba payloads antes — todos los eventos preexistentes son considerados "v1 legacy" bajo esta convencion.

Los payloads del outbox siguen dos versiones que coexisten durante el rollout de V2:

- **v1 legacy** (sin campo `schemaVersion`). Un evento por entidad. El consumer lee todo el detalle del payload. Todos los eventos publicados antes del 2026-04-13 caen en esta categoria por definicion.
- **v2** (`schemaVersion: 2`). Un evento por periodo/corrida de materializacion. Payload minimo: `{ schemaVersion: 2, periodId, snapshotCount, _materializedAt, ...contexto }`. Los consumers deben refetchar el detalle desde la tabla materializada (no leer detalle del payload).

**Reglas:**

1. Todo nuevo event type `*.period_materialized` debe usar `publishPeriodMaterializedEvent()` en `src/lib/sync/publish-event.ts`. Nunca construir payloads v2 a mano.
2. Los consumers v2-aware (`staff_augmentation_placements`, downstream de provider tooling) deben tolerar ambas versiones — el consumer reactivo V2 no discrimina por `schemaVersion`, es responsabilidad de `extractScope` y `refresh` en cada proyeccion.
3. Durante la ventana de coexistencia (~2 semanas post-deploy de V2), publishers legacy siguen emitiendo v1 hasta que un cleanup task dedicado retire el codigo.
4. Ver playbook operativo: [GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md](./GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md).

**Event types `*.period_materialized` introducidos por Slice 2 de TASK-379:**

| Aggregate Type | Event Type | Publisher | Proyeccion downstream |
|---|---|---|---|
| `provider_tooling_snapshot` | `provider.tooling_snapshot.period_materialized` | `src/lib/sync/projections/provider-tooling.ts` | `staff_augmentation_placements` |
| `commercial_cost_attribution` | `accounting.commercial_cost_attribution.period_materialized` | `src/lib/sync/projections/commercial-cost-attribution.ts` | `client_economics`, `operational_pl` |
| `service_attribution` | `accounting.service_attribution.period_materialized` | `src/lib/sync/projections/service-attribution.ts` | — |
| `pl_snapshot` | `accounting.pl_snapshot.period_materialized` | `src/lib/sync/projections/operational-pl.ts` | `operational_pl_rollup` |
| `staff_aug_placement_snapshot` | `staff_aug.placement_snapshot.period_materialized` | `src/lib/sync/projections/staff-augmentation.ts` | Downstream de staff augmentation |
| `vat_position` | `finance.vat_position.period_materialized` | `src/lib/sync/projections/vat-monthly-position.ts` | observability, serving VAT mensual, futuros cierres fiscales |

## Catalogo de eventos

### Finance

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `income` | `income.created`, `income.updated`, `income.deleted` | `finance/postgres-store.ts` | `{ incomeId, clientProfileId, amount, currency }` | `service_attribution`, `income_hubspot_outbound` |
| `income` | `finance.income.nubox_synced` | `nubox/sync-nubox-to-postgres.ts` | `{ incomeId, nuboxDocumentId, emissionStatus, dteFolio }` | `income_hubspot_outbound` (re-run + prepare artifact attach) |
| `income` | `finance.income.hubspot_synced` | `finance/income-hubspot/income-hubspot-events.ts` (from reactive projection `income_hubspot_outbound`) | `{ incomeId, hubspotInvoiceId, hubspotCompanyId, hubspotDealId, syncedAt, attemptCount }` | audit, analytics BigQuery |
| `income` | `finance.income.hubspot_sync_failed` | `finance/income-hubspot/income-hubspot-events.ts` | `{ incomeId, hubspotInvoiceId?, status: 'failed'\|'endpoint_not_deployed'\|'skipped_no_anchors', errorMessage, failedAt, attemptCount }` | alerting, retry worker, soporte ops |
| `income` | `finance.income.hubspot_artifact_attached` | `finance/income-hubspot/income-hubspot-events.ts` (Fase 2 — post-Nubox attach) | `{ incomeId, hubspotInvoiceId, hubspotArtifactNoteId, attachedAt, artifactKind }` | audit |
| `expense` | `expense.created`, `expense.updated`, `expense.deleted` | `finance/postgres-store.ts` | `{ expenseId, amount, currency }` | `service_attribution` |
| `expense` | `finance.expense.nubox_synced` | `nubox/sync-nubox-to-postgres.ts` | `{ nubox_purchase_id, document_status }` | `vat_monthly_position`, futuros consumers de conciliacion tributaria |
| `vat_position` | `finance.vat_position.period_materialized` | `sync/projections/vat-monthly-position.ts` | `{ schemaVersion: 2, periodId, periodYear, periodMonth, snapshotCount, source: 'vat_monthly_position', triggerEventType, scope }` | observability, audit fiscal, serving readers |
| `account` | `account.created`, `account.updated` | `finance/postgres-store-slice2.ts` | `{ accountId }` | — |
| `supplier` | `supplier.created`, `supplier.updated` | `finance/postgres-store-slice2.ts` | `{ supplierId }` | — |
| `exchange_rate` | `exchange_rate.updated` | `finance/postgres-store-slice2.ts` | `{ currency, rate }` | — |
| `economic_indicator` | `finance.economic_indicator.upserted` | `finance/postgres-store.ts` | `{ indicatorId, indicatorCode, indicatorDate, value, source }` | `member_capacity_economics`, `person_intelligence`, futuros consumers de forecast laboral/financiero |
| `finance_expense_payment` | `finance.expense_payment.recorded` | `finance/expense-payment-ledger.ts` | `{ paymentId, expenseId, paymentDate, amount, paymentSource, reference, paymentStatus, amountPaid }` | client-economics, commercial-cost-attribution, operational-pl, period-closure-status |

### Quotes — legacy finance namespace (TASK-210, kept during cutover per TASK-347)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `quote` | `finance.quote.created` | `commercial/quotation-events.ts` (dual-publish helper called from `hubspot/create-hubspot-quote.ts`) | `{ quoteId, hubspotQuoteId, sourceSystem, direction, organizationId, amount, currency }` | — |
| `quote` | `finance.quote.synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-quotes.ts`) | `{ quoteId, hubspotQuoteId, hubspotDealId, sourceSystem, action, organizationId, spaceId }` | — |
| `quote` | `finance.quote.converted` | (futuro: quote → invoice bridge) | `{ quoteId, incomeId }` | — |
| `quote_line_item` | `finance.quote_line_item.synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-line-items.ts`) | `{ quoteId, hubspotQuoteId, created, updated }` | — |

### Commercial Quotation — canonical namespace (TASK-347)

Emitted alongside the legacy `finance.quote.*` family by the same publishers so
consumers can migrate gradually. Canonical events are scoped to the commercial
`quotation_id` and include the legacy `quoteId` in payload for cross-reference.

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `quotation` | `commercial.quotation.created` | `commercial/quotation-events.ts` (from `hubspot/create-hubspot-quote.ts`, outbound) | `{ quotationId, quoteId, hubspotQuoteId, direction, organizationId, spaceId, amount, currency, lineItemCount }` | — |
| `quotation` | `commercial.quotation.synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-quotes.ts`, inbound) | `{ quotationId, quoteId, hubspotQuoteId, hubspotDealId, action, organizationId, spaceId }` | — |
| `quotation` | `commercial.quotation.updated` | `commercial/quotation-events.ts` (update path canónico) | `{ quotationId, quoteId, hubspotDealId, organizationId, spaceId, changedFields }` | `service_attribution` |
| `quotation` | `commercial.quotation.converted` | (futuro: quote-to-cash bridge, TASK-350) | `{ quotationId, quoteId, incomeId }` | — |
| `quotation` | `commercial.quotation.po_linked` (TASK-350) | `finance/quote-to-cash/link-purchase-order.ts`, `api/finance/purchase-orders` POST/PUT | `{ quotationId, poId, poNumber, authorizedAmountClp, linkedBy }` | Audit log (quotation_audit_log `po_received`), profitability tracking (TASK-351), `service_attribution` |
| `quotation` | `commercial.quotation.hes_linked` (TASK-350) | `finance/quote-to-cash/link-service-entry.ts`, `api/finance/hes` POST | `{ quotationId, hesId, hesNumber, amountAuthorizedClp, linkedBy }` | Audit log (`hes_received`), profitability tracking, `service_attribution` |
| `quotation` | `commercial.quotation.invoice_emitted` (TASK-350) | `finance/quote-to-cash/materialize-invoice-from-{quotation,hes}.ts` | `{ quotationId, incomeId, sourceHesId \| null, totalAmountClp, emittedBy }` | Audit log (`invoice_triggered`), pipeline projection, Nubox emission follow-up |
| `quotation` | `commercial.quotation.expired` (TASK-351) | `commercial-intelligence/renewal-lifecycle.ts` | `{ quotationId, clientId, organizationId, totalAmountClp, expiredAt, daysSinceExpiry }` | `quotation_pipeline` projection, audit log (`action: 'expired'`), notifications |
| `quotation` | `commercial.quotation.renewal_due` (TASK-351) | `commercial-intelligence/renewal-lifecycle.ts` | `{ quotationId, clientId, organizationId, totalAmountClp, expiryDate, daysUntilExpiry }` | `quotation_pipeline` projection, notifications (`finance_alert` + `metadata.subtype: quotation_renewal`) |
| `quotation` | `commercial.quotation.pipeline_materialized` (TASK-351) | `commercial/quotation-events.ts` (from `quotation_pipeline` projection) | `{ quotationId, pipelineStage, status, totalAmountClp, probabilityPct }` | observability/dashboards |
| `quotation` | `commercial.quotation.profitability_materialized` (TASK-351) | `commercial/quotation-events.ts` (from `quotation_profitability` projection) | `{ quotationId, periodYear, periodMonth, effectiveMarginPct, quotedMarginPct, marginDriftPct, driftSeverity }` | observability/dashboards |
| `quotation_line_item` | `commercial.quotation.line_items_synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-line-items.ts`) | `{ quotationId, quoteId, hubspotQuoteId, created, updated }` | — |
| `contract` | `commercial.contract.created` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, originatorQuoteId, clientId, organizationId, spaceId, status }` | `contract_profitability`, `contract_renewal`, `service_attribution` y futuros consumers de MRR/ARR |
| `contract` | `commercial.contract.activated` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, originatorQuoteId, clientId, organizationId, spaceId, status, activatedAt }` | `contract_profitability`, `contract_renewal`, `service_attribution`, observability |
| `contract` | `commercial.contract.renewed` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, quotationId?, relationshipType, renewedAt, nextEndDate?, spaceId }` | `contract_renewal`, timeline UI, futuros consumers de MRR/ARR |
| `contract` | `commercial.contract.modified` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, quotationId, relationshipType, modifiedAt, spaceId }` | detail UI, audit timeline, `service_attribution` |
| `contract` | `commercial.contract.terminated` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, terminatedAt, terminatedReason?, clientId, organizationId, spaceId }` | `contract_renewal`, futuros consumers de churn |
| `contract` | `commercial.contract.completed` (TASK-460) | `commercial/contract-events.ts` (from `commercial/contract-lifecycle.ts`) | `{ contractId, contractNumber, completedAt, clientId, organizationId, spaceId }` | `contract_renewal`, observability |
| `contract` | `commercial.contract.renewal_due` (TASK-460) | `commercial/contract-events.ts` (from `commercial-intelligence/contract-renewal-lifecycle.ts`) | `{ contractId, contractNumber, clientId, organizationId, spaceId, endDate, daysUntilEndDate }` | notifications, renewals UI, futuros dashboards de ARR en riesgo |
| `contract` | `commercial.contract.profitability_materialized` (TASK-460) | `commercial/contract-events.ts` (from `commercial-intelligence/contract-profitability-materializer.ts`) | `{ contractId, contractNumber, periodYear, periodMonth, effectiveMarginPct, quotedMarginPct, marginDriftPct, driftSeverity, spaceId }` | observability, dashboards de rentabilidad contractual |
| `deal` | `commercial.deal.created` (TASK-453) | `commercial/deal-events.ts` (from `hubspot/sync-hubspot-deals.ts`) | `{ dealId, hubspotDealId, hubspotPipelineId, dealstage, clientId, organizationId, spaceId, amountClp, currency, closeDate }` | `deal_pipeline` projection (TASK-456), `service_attribution`, foundation for TASK-457 |
| `deal` | `commercial.deal.synced` (TASK-453) | `commercial/deal-events.ts` (from `hubspot/sync-hubspot-deals.ts`) | `{ dealId, hubspotDealId, hubspotPipelineId, dealstage, clientId, organizationId, spaceId, action, amountClp, currency, closeDate, isClosed, isWon, changedFields }` | `deal_pipeline` projection (TASK-456), `service_attribution`, foundation for TASK-457 |
| `deal` | `commercial.deal.stage_changed` (TASK-453) | `commercial/deal-events.ts` (from `hubspot/sync-hubspot-deals.ts`) | `{ dealId, hubspotDealId, hubspotPipelineId, dealstage, previousPipelineId, previousDealstage, previousStageLabel, currentStageLabel }` | `deal_pipeline` projection (TASK-456), `service_attribution` |
| `deal` | `commercial.deal.won` (TASK-453) | `commercial/deal-events.ts` (from `hubspot/sync-hubspot-deals.ts`) | `{ dealId, hubspotDealId, hubspotPipelineId, dealstage, clientId, organizationId, spaceId, amountClp, closeDate }` | `deal_pipeline` projection (TASK-456), `service_attribution`, forecast |
| `deal` | `commercial.deal.lost` (TASK-453) | `commercial/deal-events.ts` (from `hubspot/sync-hubspot-deals.ts`) | `{ dealId, hubspotDealId, hubspotPipelineId, dealstage, clientId, organizationId, spaceId, closeDate }` | `deal_pipeline` projection (TASK-456), `service_attribution`, forecast |
| `deal` | `commercial.deal.create_requested` (TASK-539) | `commercial/deal-events.ts` (from `createDealFromQuoteContext`) | `{ attemptId, organizationId, hubspotCompanyId, actorUserId, dealName, amountClp, idempotencyKey }` | Audit trail de intentos inline (incluye intentos que nunca llegaron a HubSpot por rate limit o threshold) |
| `deal` | `commercial.deal.create_approval_requested` (TASK-539) | `commercial/deal-events.ts` (from `createDealFromQuoteContext` cuando amount > $50M CLP) | `{ attemptId, organizationId, actorUserId, dealName, amountClp, thresholdClp, approvalId }` | Approval workflow + notificación al Sales Lead |
| `deal` | `commercial.deal.created_from_greenhouse` (TASK-539) | `commercial/deal-events.ts` (from `createDealFromQuoteContext` happy path) | `{ dealId, hubspotDealId, organizationId, hubspotCompanyId, dealName, amount, amountClp, currency, pipelineId, stageId, ownerHubspotUserId, actorUserId, quotationId?, origin: 'greenhouse_quote_builder', attemptId }` | Distingue deals originados desde Greenhouse vs sync inbound; `promoteParty(prospect→opportunity)` ya se disparó en la misma transacción |
| `commercial_operation` | `commercial.quote_to_cash.started` (TASK-541 Fase G) | `commercial/party/commands/quote-to-cash-events.ts` (from `convertQuoteToCash` entry) | `{ operationId, correlationId, quotationId, organizationId, hubspotDealId?, triggerSource, actorUserId, totalAmountClp, startedAt }` | Audit trail + observabilidad del funnel quote→cash |
| `commercial_operation` | `commercial.quote_to_cash.completed` (TASK-541 Fase G) | `commercial/party/commands/quote-to-cash-events.ts` (from `convertQuoteToCash` happy path) | `{ ...started fields, contractId, clientId, organizationPromoted, clientInstantiated, dealWonEmitted, completedAt }` | Analytics, MRR materializer trigger confirmado |
| `commercial_operation` | `commercial.quote_to_cash.failed` (TASK-541 Fase G) | `commercial/party/commands/quote-to-cash-events.ts` (mid-transaction catch) | `{ ...started fields, errorCode, errorMessage, failedAt }` | Alerting, retry worker, soporte |
| `commercial_operation` | `commercial.quote_to_cash.approval_requested` (TASK-541 Fase G) | `commercial/party/commands/quote-to-cash-events.ts` (cuando `total_amount_clp > $100M`) | `{ ...started fields, approvalId, thresholdClp, requestedAt }` | Dual approval workflow (CFO+CEO); genérico pendiente, hoy audit trace persist. `quoteToCash` queda en `pending_approval` hasta resolución. |
| `quotation` | `commercial.quotation.converted` (re-emitido por la coreografía con `correlationId`) | `convertQuoteToCash` emite directo vía `publishOutboxEvent` con payload `{ quotationId, organizationId, contractId, correlationId, operationId, convertedAt, source: 'quote_to_cash_choreography' }` | Legacy + quotation_pipeline projection + downstream consumers |
| `quotation` | `commercial.discount.health_alert` | `finance/pricing/quotation-pricing-orchestrator.ts` (TASK-346) | `{ quotationId, versionNumber, marginPct, floorPct, targetPct, alerts, createdBy }` | `notifications` (Finance approvals), audit log |
| `quotation` | `commercial.quotation.pushed_to_hubspot` (TASK-463) | `commercial/quotation-events.ts` (from `hubspot/push-canonical-quote.ts` invocado por projection `quotationHubSpotOutbound`) | `{ quotationId, hubspotQuoteId, hubspotDealId, direction: 'outbound', result: 'created' \| 'updated' \| 'skipped', reason?, actorId? }` | observability del bridge outbound + retry audit |
| `quotation` | `commercial.quotation.hubspot_sync_failed` (TASK-463) | `commercial/quotation-events.ts` (from `hubspot/push-canonical-quote.ts` catch branch) | `{ quotationId, hubspotDealId, errorMessage, attemptedAction: 'create' \| 'update', actorId? }` | ops-worker retry, Finance alerting |
| `pricing_catalog_approval` | `commercial.pricing_catalog_approval.proposed` (TASK-550) | `commercial/pricing-catalog-approvals.ts` (from `proposeApproval`) | `{ approvalId, entityType, entityId, entitySku, proposedByUserId, proposedByName, criticality, justification, proposedAt, proposalMeta? }` | `pricing_catalog_approval_notifier`, audit/observability |
| `pricing_catalog_approval` | `commercial.pricing_catalog_approval.decided` (TASK-550) | `commercial/pricing-catalog-approvals.ts` (from `decideApproval`) | `{ approvalId, entityType, entityId, entitySku, proposedByUserId, proposedByName, criticality, decision, decidedByUserId, decidedByName, decidedAt, comment, applied, appliedFields, newAuditId, proposalMeta? }` | `pricing_catalog_approval_notifier`, audit/observability |

### Commercial Party Lifecycle (TASK-535)

Fase A del programa TASK-534. Eventos emitidos por los 3 comandos CQRS en
`commercial/party/commands/*`. Nuevos aggregate types: `commercial_party` y
`commercial_client`.

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `commercial_party` | `commercial.party.created` (TASK-535) | `commercial/party/party-events.ts` (from `commands/create-party-from-hubspot-company.ts`) | `{ commercialPartyId, organizationId, initialStage, source: 'hubspot_sync', hubspotCompanyId }` | TASK-536 inbound sync, TASK-540 outbound HubSpot, TASK-538 selector projection |
| `commercial_party` | `commercial.party.promoted` (TASK-535) | `commercial/party/party-events.ts` (from `commands/promote-party.ts`) | `{ commercialPartyId, organizationId, fromStage, toStage, source, triggerEntity?, actorUserId?, reason? }` | TASK-540 outbound HubSpot (write-back lifecyclestage), TASK-541 quote-to-cash, analytics |
| `commercial_party` | `commercial.party.demoted` (TASK-535) | `commercial/party/party-events.ts` (from `commands/promote-party.ts`) | `{ commercialPartyId, organizationId, fromStage, toStage, source, direction: 'demote', triggerEntity?, actorUserId?, reason? }` | TASK-540 outbound, analytics |
| `commercial_client` | `commercial.client.instantiated` (TASK-535) | `commercial/party/party-events.ts` (from `commands/instantiate-client-for-party.ts`, side-effect de `promoteParty → active_client`) | `{ clientId, clientProfileId, organizationId, commercialPartyId, triggerEntity, actorUserId? }` | Finance bootstrap (profile ya creado en misma transacción), ICO/attribution pipelines, TASK-541 |

Eventos adicionales del programa TASK-534:

- `commercial.party.hubspot_synced_in` — reservado para follow-up inbound más rico sobre TASK-536.
- `commercial.party.hubspot_synced_out` / `commercial.party.sync_conflict` — shipped por TASK-540 (`hubspot/party-hubspot-events.ts`).
- `commercial.party.merged` — future follow-up de merge resolution.
- `commercial.party.inactivated` / `churned` — emitidos por el sweep operativo de `TASK-542`.
- `commercial.party.lifecycle_backfilled` — reservado en `EVENT_TYPES` para futuros runs ad-hoc del backfill script.

### Products — legacy finance namespace (TASK-211, kept during cutover)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `product` | `finance.product.synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-products.ts`) | `{ productId, hubspotProductId, name, sku, action }` | — |
| `product` | `finance.product.created` | `commercial/quotation-events.ts` (from `hubspot/create-hubspot-product.ts`) | `{ productId, hubspotProductId, name, sku, direction }` | — |

### Commercial Product Catalog — canonical namespace (TASK-347 + TASK-545 sync foundation)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `product_catalog` | `commercial.product_catalog.created` | `commercial/product-catalog/product-catalog-events.ts` (from TASK-546 materializer handlers; legacy `commercial/quotation-events.ts` still emits for HubSpot-driven creation during cutover) | `{ productId, sourceKind, sourceId, productCode, productName, defaultUnitPrice, defaultCurrency, defaultUnit, businessLineCode, hubspotProductId, ghOwnedFieldsChecksum, isArchived }` | `source_to_product_catalog` (Fase A scaffolded no-op), TASK-547 outbound (Fase C) |
| `product_catalog` | `commercial.product_catalog.updated` | `commercial/product-catalog/product-catalog-events.ts` (from TASK-546 handlers) | `{ ...created payload, changedFields, previousChecksum }` | TASK-547 outbound, TASK-548 drift |
| `product_catalog` | `commercial.product_catalog.archived` | `commercial/product-catalog/product-catalog-events.ts` | `{ productId, sourceKind, sourceId, productCode, archivedAt, archivedBy, reason? }` | TASK-547 archive HubSpot |
| `product_catalog` | `commercial.product_catalog.unarchived` | `commercial/product-catalog/product-catalog-events.ts` | `{ productId, sourceKind, sourceId, productCode, unarchivedAt, unarchivedBy }` | TASK-547 unarchive HubSpot |
| `product_catalog` | `commercial.product_catalog.synced` | `commercial/quotation-events.ts` (from `hubspot/sync-hubspot-products.ts`) | `{ commercialProductId, productId, hubspotProductId, name, sku, action }` | legacy, retained during cutover |
| `product_sync_conflict` | `commercial.product_sync_conflict.detected` | `commercial/product-catalog/product-catalog-events.ts` (emitted by TASK-548 drift cron) | `{ conflictId, productId?, hubspotProductId?, conflictType, detectedAt, conflictingFields?, metadata? }` | TASK-548 Admin Center alerts |
| `product_sync_conflict` | `commercial.product_sync_conflict.resolved` | `commercial/product-catalog/product-catalog-events.ts` (emitted by Admin Center resolution handler) | `{ conflictId, productId?, hubspotProductId?, conflictType, resolutionStatus, resolvedBy, resolutionAppliedAt }` | audit trail |

TASK-545 Fase A (shipped 2026-04-21) adds the `source_kind` + `source_id` linkage, `is_archived` archival semantics, and `gh_owned_fields_checksum` drift primitives to `greenhouse_commercial.product_catalog`, plus the `product_sync_conflicts` table. TASK-546 (same date) activates the source handlers/materializer; TASK-547 wires HubSpot outbound; TASK-548 closes the loop with drift detection, Admin Center resolution UI, and `source_sync_runs` tracking for the nightly reconciler. See `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1`.

### Nubox

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `nubox_emission` | `nubox.emission.*` | `nubox/emission.ts` | `{ emissionId, dteType }` | — |
| `nubox_sync` | `nubox.sync.*` | `nubox/sync-nubox-to-postgres.ts` | `{ syncRunId }` | — |

### HR Leave

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `leave_request` | `leave_request.created`, `leave_request.escalated_to_hr`, `leave_request.approved`, `leave_request.rejected`, `leave_request.cancelled` | `hr-core/postgres-leave-store.ts` | `{ requestId, memberId, leaveTypeCode, startDate, endDate, status }` | `notifications` |
| `leave_request` | `leave_request.payroll_impact_detected` | `hr-core/postgres-leave-store.ts` | `{ requestId, memberId, affectedPeriods, payrollImpact }` | `notifications`, `projected_payroll`, `leave_payroll_recalculation` |

Notas:
- `leave_request.payroll_impact_detected` es una señal operativa; no reemplaza `payroll_entry.upserted` como source of truth económico downstream.
- `Finance`, `Cost Intelligence`, `Providers` y `AI Tooling` deben seguir reaccionando al carril `payroll -> projections`, no a `leave_request.*` directo salvo alertas.

### Payroll

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `payroll_period` | `payroll_period.created`, `payroll_period.updated`, `payroll_period.calculated`, `payroll_period.approved`, `payroll_period.exported` | `payroll/postgres-store.ts` | `{ periodId, month, year, status? }` | `member_capacity_economics`, `person_intelligence`, `client_economics`, `service_attribution` |
| `payroll_entry` | `payroll_entry.upserted` | `payroll/postgres-store.ts` | `{ entryId, periodId, memberId, currency, grossTotal, netTotal }` | `member_capacity_economics`, `person_intelligence`, `client_economics`, `service_attribution` |
| `payroll_entry` | `payroll_entry.reliquidated` | `payroll/postgres-store.ts` (supersede path) | `{ entryId, periodId, operationalYear, operationalMonth, memberId, version, previousVersion, previousEntryId, previousGrossTotal, previousNetTotal, newGrossTotal, newNetTotal, deltaGross, deltaNet, currency, reopenAuditId, reason }` | `payroll_reliquidation_delta`, `commercial_cost_attribution`, `client_economics`, `service_attribution` |
| `compensation_version` | `compensation_version.created`, `compensation_version.updated` | `payroll/postgres-store.ts` | `{ versionId, memberId, effectiveFrom, payRegime, currency, baseSalary }` | `member_capacity_economics`, `person_intelligence`, `service_attribution` |

Notas:
- `payroll_period.exported` sigue siendo el cierre canónico de nómina y también alimenta el intake reactivo de `Finance > Expenses`.
- La materialización reactiva de expenses de payroll y cargas sociales se publica downstream por las señales existentes de `finance.expense.created|updated`; no existe un evento dedicado `expense.tool_linked`.
- **TASK-409 / TASK-411** — `payroll_entry.reliquidated` es el evento canónico de reliquidación post-reopen. Lo emite `pgUpsertPayrollEntry` cuando se invoca en modo supersede (dentro de la TX de `supersedePayrollEntryOnRecalculate`). Lleva `deltaGross`/`deltaNet` ya calculados — el consumer `payroll_reliquidation_delta` **solo aplica el delta** a `greenhouse_finance.expenses` (nunca el monto completo) y referencia la fila `payroll_period_reopen_audit` vía `reopenAuditId` para trazabilidad. `finance_expense_reactive_intake` dedupe por `(payroll_period_id, member_id, source_type='payroll_generated')` para que v2 no cree un segundo expense "primario" — la suma canónica queda: `expense_primario_v1 + sum(expense_delta_v2..vN) = monto_final`.

### ICO Materialization

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `ico_materialization` | `ico.materialization.completed` | `ico-engine/materialize.ts` | `{ memberId?, organizationId?, periodYear, periodMonth, memberMetricsWritten?, organizationMetricsWritten? }` | `person_intelligence`, `projected_payroll`, organization-level projections derivadas |
| `ico_ai_signals` | `ico.ai_signals.materialized` | `ico-engine/materialize.ts` | `{ periodYear, periodMonth, aiSignalsWritten, predictionLogsWritten, spaceId? }` | `ico_ai_signals` projection hacia `greenhouse_serving.ico_ai_signals` y consumers internal-only (`Agency`, `Ops Health`, `Nexa`) |

Notas:
- `ico.materialization.completed` es hoy la señal reactiva canónica downstream cuando ya quedaron materializadas las métricas mensuales de `ICO`.
- `ico.ai_signals.materialized` es aditivo sobre `ico.materialization.completed`: no reemplaza el contrato base de snapshots, solo publica la lane de señales AI persistidas.
- `projected_payroll` y `person_intelligence` deben reaccionar a este evento derivado, no recalcular directamente desde cambios crudos de tareas.
- La introducción futura de un evento base tipo `delivery.task_assignment.upserted` puede complementar refresh dirigido de `ico_member_metrics`, pero no reemplaza el contrato de `ico.materialization.completed` para consumers derivados.
- `payroll_period.exported` sigue siendo el cierre canónico de nómina; tanto Postgres-first como BigQuery fallback deben emitirlo solo si la mutación realmente avanzó el período.
- `payroll_period.exported` ya quedó smoke-validado como disparador de `payroll_receipts_delivery`: primero se publica el outbox y luego el reactor materializa la entrega de recibos, sin depender de cron separado ni de un consumer bloqueado por otro handler del mismo evento.
- Contrato de eventos `payroll.projected_*` (hardened en TASK-109):
  - `payroll.projected_period.refreshed` — audit trail; se emite tras cada refresh exitoso del snapshot serving. Sin consumer de negocio activo.
  - `payroll.projected_snapshot.refreshed` — **deprecated / no usado en runtime**. Definido en catálogo pero ningún publisher lo emite. Mantener solo por backward-compat del catálogo; no crear consumers.
  - `payroll.projected_promoted_to_official_draft` — audit trail; registra que un snapshot proyectado fue promovido a borrador oficial. Sin consumer downstream.
  - `payroll_period.recalculated_from_projection` — audit trail; señal interna post-promoción. Sin consumer downstream.
  - Regla: estos cuatro eventos son **audit-only** hasta que un consumer real con contrato de negocio explícito los reclame. `projected_payroll_snapshots` es serving cache, no transactional source of truth.

Notas:
- `payroll_period.exported` es el evento canónico de cierre mensual de nómina.
- los eventos `payroll_period.*` pueden resolverse por `finance_period` en projections que necesiten fanout a todos los miembros del período.
- el fallback BigQuery de Payroll mantiene compatibilidad funcional, pero la arquitectura reactiva canonica depende del path `Postgres-first` con outbox.
- el `outbox_reactive_log` debe quedar en granularidad `(event_id, handler)` para que un handler exitoso no bloquee a los demás projections del mismo evento.

### Capacity Economics (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `finance_exchange_rate` | `finance.exchange_rate.upserted` | `finance/postgres-store.ts` | `{ rateId, fromCurrency, toCurrency, rate, rateDate, source }` | `member_capacity_economics` |
| `finance_overhead` | `finance.overhead.updated` | — | `{ periodYear, periodMonth, amount }` | `member_capacity_economics` |
| `finance_license_cost` | `finance.license_cost.updated` | — | `{ periodYear, periodMonth, amount }` | `member_capacity_economics` |
| `finance_tooling_cost` | `finance.tooling_cost.updated` | — | `{ periodYear, periodMonth, amount }` | `member_capacity_economics` |

### AI Tools

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `ai_credits` | `ai.credits.*` | `ai-tools/postgres-store.ts` | `{ tenantId, amount }` | — |
| `ai_wallet` | `ai.wallet.*` | `ai-tools/postgres-store.ts` | `{ walletId }` | — |

### Account 360 (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `organization` | `organization.updated` | `account-360/organization-store.ts` | `{ organizationId, updatedFields }` | — |
| `membership` | `membership.created` | `account-360/organization-store.ts` | `{ membershipId, profileId, organizationId, spaceId }` | `invalidateOrganization360`, `service_attribution` |
| `membership` | `membership.updated` | `account-360/organization-store.ts` | `{ membershipId, updatedFields }` | `invalidateOrganization360`, `service_attribution` |
| `membership` | `membership.deactivated` | `account-360/organization-store.ts` | `{ membershipId }` | `invalidateOrganization360`, `service_attribution` |

### CRM Company Lifecycle (TASK-454)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `crm_company` | `crm.company.lifecyclestage_changed` | `hubspot/company-lifecycle-events.ts` (from `hubspot/sync-hubspot-company-lifecycle.ts`) | `{ clientId, organizationId, spaceId, hubspotCompanyId, fromStage, toStage, source }` | — |

### Commercial Party Lifecycle (TASK-535, Fase A)

Domain: `cost_intelligence`. Canonical source of truth for the commercial state of every organization — `greenhouse_core.organizations.lifecycle_stage`. Every write passes through the CQRS commands in `src/lib/commercial/party/commands/**`; direct UPDATEs to `lifecycle_stage` are not permitted.

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `commercial_party` | `commercial.party.created` | `party/party-events.ts` (from `createPartyFromHubSpotCompany`) | `{ commercialPartyId, organizationId, initialStage, source, hubspotCompanyId? }` | TASK-536 inbound sync materialization, TASK-538 selector cache |
| `commercial_party` | `commercial.party.promoted` | `party/party-events.ts` (from `promoteParty`) | `{ commercialPartyId, organizationId, fromStage, toStage, source, triggerEntity?, actorUserId?, reason? }` | TASK-540 HubSpot outbound, TASK-541 quote-to-cash |
| `commercial_party` | `commercial.party.demoted` | `party/party-events.ts` (from `promoteParty` when the stage rank drops) | `{ …promoted payload, direction: 'demote' }` | TASK-540 HubSpot outbound |
| `commercial_party` | `commercial.party.lifecycle_backfilled` | Reserved for the operational backfill runbook (M2 migration + CLI). Not emitted in Fase A. | `{ commercialPartyId, organizationId, toStage, batchId }` | — |
| `commercial_client` | `commercial.client.instantiated` | `party/party-events.ts` (from `instantiateClientForParty`, invoked as side-effect of promoteParty → active_client) | `{ clientId, clientProfileId, organizationId, commercialPartyId, triggerEntity, actorUserId? }` | Finance (`fin_client_profiles` bootstrap is already in-transaction), ICO / cost attribution pipelines |

Invariants:

- Every transition appends exactly one row to `greenhouse_core.organization_lifecycle_history` (append-only; trigger blocks UPDATE/DELETE).
- Same-stage writes are no-ops — no event is emitted, no history row written.
- Side effect: `promoteParty` with `toStage=active_client` invokes `instantiateClientForParty`; `ORGANIZATION_ALREADY_HAS_CLIENT` is swallowed so the promotion stays valid on double-bootstrap.
- HubSpot → Greenhouse stage mapping (§4.5) lives in `src/lib/commercial/party/hubspot-lifecycle-mapping.ts` with an env-var override (`HUBSPOT_LIFECYCLE_STAGE_MAP_OVERRIDE`) for custom HubSpot portals.
- Events not emitted in Fase A (sync-conflict, merged, hubspot_synced_in/out, inactivated, churned-by-sweep) quedaron distribuidos entre Fases B/F/H: `TASK-536`, `TASK-540` y `TASK-542`.

### HR Core / People (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `member` | `member.created` | `team-admin/mutate-team.ts` | `{ memberId, email, displayName }` | — |
| `member` | `member.updated` | `team-admin/mutate-team.ts` | `{ memberId, updatedFields }` | — |
| `member` | `member.deactivated` | `team-admin/mutate-team.ts` | `{ memberId }` | — |
| `assignment` | `assignment.created` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId, fteAllocation }` | `invalidateOrganization360`, `service_attribution` |
| `assignment` | `assignment.updated` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId, updatedFields }` | `invalidateOrganization360`, `service_attribution` |
| `assignment` | `assignment.removed` | `team-admin/mutate-team.ts` | `{ assignmentId, memberId, clientId }` | `invalidateOrganization360`, `service_attribution` |

### Identity (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `identity_reconciliation` | `identity.reconciliation.approved` | `identity/reconciliation/apply-link.ts` | `{ proposalId, status, resolvedBy }` | — |
| `identity_reconciliation` | `identity.reconciliation.rejected` | `identity/reconciliation/apply-link.ts` | `{ proposalId, status, resolvedBy }` | — |
| `identity_profile` | `identity.profile.linked` | `identity/reconciliation/apply-link.ts` | `{ proposalId, profileId, memberId, sourceSystem, sourceObjectId }` | — |

### Operational Responsibility (nuevo, TASK-227)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `operational_responsibility` | `responsibility.assigned` | `operational-responsibility/store.ts` | `{ responsibilityId, memberId, scopeType, scopeId, responsibilityType, isPrimary }` | — |
| `operational_responsibility` | `responsibility.revoked` | `operational-responsibility/store.ts` | `{ responsibilityId, memberId, scopeType, scopeId, responsibilityType }` | — |
| `operational_responsibility` | `responsibility.updated` | `operational-responsibility/store.ts` | `{ responsibilityId, memberId, scopeType, scopeId, responsibilityType, changes }` | — |

### Role Governance (TASK-226)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `role_assignment` | `role.assigned` | `admin/role-management.ts` | `{ userId, roleCode, assignedByUserId }` | — |
| `role_assignment` | `role.revoked` | `admin/role-management.ts` | `{ userId, roleCode, revokedByUserId }` | — |

### Scope Governance (TASK-248)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `user_scope` | `scope.assigned` | `admin/tenant-member-provisioning.ts` | `{ userId, scopeType, scopeId, clientId, accessLevel }` | — |
| `user_scope` | `scope.revoked` | — (no revoke function yet) | `{ userId, scopeType, scopeId, clientId }` | — |

### Auth Session (TASK-248)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `auth_session` | `auth.login.success` | `auth.ts` (NextAuth `events.signIn`) | `{ userId, email, provider, tenantType }` | — |
| `auth_session` | `auth.login.failed` | `auth.ts` (credentials `authorize`) | `{ email, provider, reason }` | — |

### Email Delivery

| Aggregate | Event Type | Trigger | Payload |
|-----------|-----------|---------|---------|
| `email_delivery` | `email_delivery.bounced` | Resend webhook `email.bounced` | `{ recipientEmail, resendId, bounceType, reason }` |
| `email_delivery` | `email_delivery.complained` | Resend webhook `email.complained` | `{ recipientEmail, resendId, reason }` |
| `email_delivery` | `email_delivery.rate_limited` | deliverRecipient() rate limit exceeded | `{ recipientEmail, emailType, currentCount, limit }` |
| `email_delivery` | `email_delivery.undeliverable_marked` | Hard bounce → client_users.email_undeliverable = true | `{ recipientEmail, userId, reason }` |

Publisher: `src/app/api/webhooks/resend/route.ts` (bounce/complaint), `src/lib/email/delivery.ts` (rate_limited)
Consumer: none yet (future: admin alerts, delivery health metrics)

### User Lifecycle (TASK-253, TASK-267)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `user_lifecycle` | `user.deactivated` | `admin/users/[id]/route.ts` | `{ userId, email, deactivatedByUserId }` | — |
| `user_lifecycle` | `user.reactivated` | `admin/users/[id]/route.ts` | `{ userId, email, reactivatedByUserId }` | — |
| `user_lifecycle` | `invitation.resent` | `admin/users/[id]/route.ts` | `{ userId, email, resentByUserId }` | — |

### Services (nuevo)

| Aggregate Type | Event Type | Publisher | Payload | Consumer reactivo |
|---|---|---|---|---|
| `service` | `service.created` | `services/service-store.ts` | `{ serviceId, spaceId, organizationId, lineaDeServicio }` | `service_attribution` |
| `service` | `service.updated` | `services/service-store.ts` | `{ serviceId, updatedFields }` | `service_attribution` |
| `service` | `service.deactivated` | `services/service-store.ts` | `{ serviceId }` | `service_attribution` |

## Consumer reactivo — Projection Registry

El consumer ya no usa handlers hardcodeados. Usa el Projection Registry declarativo:

| Projection | Domain | Trigger Events | Accion |
|---|---|---|---|
| `organization_360` | organization | assignment.*, membership.* | Invalida `updated_at` de la organizacion afectada |
| `notification_dispatch` | notifications | service.created, identity.reconciliation.approved, finance.dte.discrepancy_found, identity.profile.linked | Despacha notificacion in-app + email via NotificationService |
| `ico_member_metrics` | people | member.*, assignment.* | Refresh dirigido: pull member data BQ → Postgres |
| `client_economics` | finance | membership.*, assignment.* | Recompute snapshots del periodo actual |
| `service_attribution` | finance | income.*, expense.*, payroll_entry.*, membership.*, assignment.*, commercial.quotation.created, commercial.quotation.synced, commercial.quotation.po_linked, commercial.quotation.hes_linked, commercial.contract.created, commercial.contract.activated, commercial.contract.modified, commercial.deal.created, commercial.deal.synced, commercial.deal.stage_changed, service.* | Materializa attribution factual por `service_id + period` y persiste unresolved auditable |
| `member_capacity_economics` | people | member.*, assignment.*, compensation_version.*, payroll_period.*, payroll_entry.*, finance.expense.created, finance.expense.updated, finance.exchange_rate.upserted, finance.overhead.updated, finance.license_cost.updated, finance.tooling_cost.updated | Materializa snapshot por miembro/periodo en `greenhouse_serving.member_capacity_economics` |
| `person_intelligence` | people | member.*, assignment.*, compensation_version.*, payroll_period.*, payroll_entry.*, finance.exchange_rate.upserted, finance.overhead.updated, finance.license_cost.updated, finance.tooling_cost.updated, ico.materialization.completed | Materializa inteligencia operativa/capacidad/costo por miembro y también soporta fanout por `finance_period` |
| `projected_payroll` | people | compensation_version.*, payroll_entry.*, payroll_period.calculated, finance.exchange_rate.upserted, ico.materialization.completed | Refresca snapshots de nómina proyectada del período cuando cambia compensación, FX o quedan materializados KPI `ICO` |
| `finance_expense_reactive_intake` | finance | payroll_period.exported | Materializa expenses system-generated de payroll y social_security en `greenhouse_finance.expenses`. Dedupe por `(period_id, member_id, source_type='payroll_generated')` tras TASK-411. |
| `payroll_reliquidation_delta` | finance | payroll_entry.reliquidated | Aplica delta neto (`deltaGross`) como nuevo expense con `source_type='payroll_reliquidation'` y `reopen_audit_id` FK. Skip/no-op si delta=0. Idempotente por `(event_id, handler)` en outbox_reactive_log. |
| `payroll_receipts_delivery` | notifications | payroll_period.exported | Genera, persiste y envía el batch de recibos del período exportado |
| `payroll_export_ready_notification` | notifications | payroll_period.exported | Envía el aviso de cierre/exportación a Finance/HR con el resumen operativo del período |

## Extensibilidad

### Para agregar un nuevo evento:

1. Agregar aggregate type y event type en `src/lib/sync/event-catalog.ts`
2. Llamar `publishOutboxEvent()` en la mutacion del store
3. Documentar en esta tabla

### Para agregar una nueva proyeccion reactiva:

1. Crear archivo en `src/lib/sync/projections/my-projection.ts` con `ProjectionDefinition`
2. Registrar en `src/lib/sync/projections/index.ts`
3. Declarar `domain`, `triggerEvents`, `extractScope`, `refresh`
4. NO tocar `reactive-consumer.ts` ni crear crons nuevos
5. Documentar en esta tabla

Ver playbook completo: `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

### Para agregar un nuevo dominio de cron:

1. Agregar el dominio a `ProjectionDomain` type en `projection-registry.ts`
2. Crear cron route en `src/app/api/cron/outbox-react-{domain}/route.ts`
3. Registrar en Vercel cron config si aplica
