# TASK-1206 — Commercial Q2C Canonical Close Command

## Delta 2026-06-21 — runtime gobernado parametrizado ya disponible (TASK-1212)

- TASK-1212 extendió el **runtime de Nexa governed actions a acciones PARAMETRIZADAS** (`NexaActionDefinition<TInput>` + `inputSchema` Zod; `resolveNexaActionProposal`/`confirmNexaAction` ahora parsean + re-validan input; el `propose_action` tool acepta `input`). El close command de esta task debe **reusar ese mismo runtime** (registrar una acción `close_quote`/`convert_to_cash` con su `inputSchema`), NO crear una integración Nexa paralela. Comparte el governed-action surface (dominio `commercial-q2c`) con `author_quote`.
- El command de autoría `submitQuoteFromBuilder` (`src/lib/commercial/`) es el **patrón de referencia**: command server-side único + idempotencia vía el ledger canónico `api_platform_command_executions` (sin migración) + capability `can(commercial.quotation, ...)` enforced en el command + atomicidad por etapa con rollback honesto. El cierre debe enforzar la capability huérfana **`commercial.quote_to_cash.execute`** (que esta task hace dejar de ser huérfana).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `Commercial P1.1`
- Domain: `commercial|finance|api|controls`
- Blocked by: `none`
- Branch: `task/TASK-1206-commercial-q2c-canonical-close-command`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la brecha raiz del flujo Commercial Quote-to-Cash creando un comando canonico de cierre que componga cotizacion emitida, contrato, party/client, income/AR, audit y eventos en una sola operacion server-side. La UI y los futuros agentes/API Platform deben consumir este contrato; no debe existir un camino de negocio que convierta una cotizacion a factura saltandose la auditoria Q2C comercial.

## Why This Task Exists

La auditoria Commercial Q2C 2026-06-20 encontro una base tecnica solida, pero partida en dos caminos:

- `/api/commercial/quotations/[id]/convert-to-cash` crea/reusa contrato, promueve party/client y emite eventos, pero no materializa income.
- `/api/finance/quotes/[id]/convert-to-invoice` materializa income y marca la cotizacion como convertida, pero no usa `commercial_operations_audit` ni la coreografia formal `commercial.quote_to_cash.*`.
- La UI visible usa el camino `convert-to-invoice`; no hay consumidor visible del comando atomico `convert-to-cash`.
- En Cloud SQL dev habia 57 quotations, 12 `issued`, 0 `converted` y 0 filas `quote_to_cash` en `commercial_operations_audit`.

El resultado es una capacidad con Full API Parity parcial: hay commands/rutas internas, pero no un contrato unico, idempotente, auditable y observable para cerrar Quote-to-Cash end-to-end.

## Goal

- Definir e implementar un comando canonico `closeQuoteToCash` o extender `convertQuoteToCash` con strategy explicita.
- Garantizar que el cierre Q2C pueda dejar contrato, cliente, income, audit y eventos correlacionados en una misma operacion.
- Hacer idempotente y concurrent-safe el cierre para evitar doble income o doble conversion.
- Reconciliar los caminos `convert-to-cash` y `convert-to-invoice` para que ninguno pueda saltarse el contrato canonico.
- Dejar signals/smoke runtime que prueben que una quote emitida puede cerrar Q2C end-to-end.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/audits/commercial/COMMERCIAL_QUOTE_TO_CASH_DEEP_AUDIT_2026-06-20.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- Commercial es owner del cierre de cotizacion; Finance es owner del objeto financiero `income`/AR. El comando Q2C debe respetar esa frontera sin duplicar reglas.
- La UI no puede ser source of truth ni contener logica de cierre. Debe llamar a command/route thin.
- No crear endpoints ad hoc que expongan tablas; usar commands/readers server-side y contratos API gobernados.
- No duplicar `TASK-1202`: esta task cierra el comando canonico Q2C; `TASK-1202` endurece capabilities de quotes/reconciliation. La capability fina de cierre sigue la **convencion del catalogo que fija TASK-1202** (steward del catalogo de quote capabilities).
- No duplicar `TASK-1211`: el command de **autoria/emision** del frente del embudo y la Nexa governed action / MCP / API Platform lane los construye TASK-1211. La Nexa governed action del **cierre** Q2C se registra en el MISMO governed-action surface (dominio commercial-q2c) que establece TASK-1211 — no una integracion Nexa paralela.
- Cualquier workaround `contract_only` debe quedar explicitamente auditado, con reason y SLA, no como estado final silencioso.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`

## Dependencies & Impact

### Depends on

- Auditoria base: `docs/audits/commercial/COMMERCIAL_QUOTE_TO_CASH_DEEP_AUDIT_2026-06-20.md`
- Existing commands/readers:
  - `src/lib/commercial/party/commands/convert-quote-to-cash.ts`
  - `src/lib/commercial/party/commands/convert-quote-to-cash-types.ts`
  - `src/lib/commercial/party/commands/quote-to-cash-events.ts`
  - `src/lib/commercial/party/commands/commercial-operations-audit.ts`
  - `src/lib/commercial/contract-lifecycle.ts`
  - `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
  - `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts`
  - `src/lib/sync/projections/quote-to-cash-autopromoter.ts`
  - `src/lib/commercial/quotation-events.ts`
  - `src/lib/sync/event-catalog.ts`
- Existing routes:
  - `src/app/api/commercial/quotations/[id]/convert-to-cash/route.ts`
  - `src/app/api/finance/quotes/[id]/convert-to-invoice/route.ts`
- Existing data:
  - `greenhouse_commercial.quotations`
  - `greenhouse_commercial.contracts`
  - `greenhouse_commercial.commercial_operations_audit`
  - `greenhouse_finance.income`
  - `greenhouse_sync.outbox_events`

### Blocks / Impacts

- Desbloquea una UI Q2C honesta como follow-up (el follow-up de UI de cierre Q2C, propuesta, no creada aun).
- Desbloquea API Platform/App parity versionada para `quotation.v1` / `quote_to_cash.v1`: **este follow-up lo absorbe `TASK-1211`** (Quote Builder API Parity), que expone el lane versionado para todo el embudo. Coordinar el orden de cierre: si TASK-1206 cierra primero, TASK-1211 incluye su close en el lane; si TASK-1211 cierra primero, deja el slot del close listo para esta task.
- Reduce drift entre Commercial y Finance para cotizaciones visibles en `/finance/quotes`.
- Alimenta reliability/readiness signals de cierre comercial y HubSpot anchors.

### Files owned

- `src/lib/commercial/party/commands/convert-quote-to-cash.ts`
- `src/lib/commercial/party/commands/convert-quote-to-cash-types.ts`
- `src/lib/commercial/party/commands/quote-to-cash-events.ts`
- `src/lib/commercial/party/commands/commercial-operations-audit.ts`
- `src/lib/commercial/contract-lifecycle.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts`
- `src/app/api/commercial/quotations/[id]/convert-to-cash/route.ts`
- `src/app/api/finance/quotes/[id]/convert-to-invoice/route.ts`
- `src/lib/sync/projections/quote-to-cash-autopromoter.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/reliability/queries/`
- `migrations/` if additive DDL is required after Plan Mode
- `docs/audits/commercial/COMMERCIAL_QUOTE_TO_CASH_DEEP_AUDIT_2026-06-20.md`

## Current Repo State

### Already exists

- `convertQuoteToCash` locks the quotation with `FOR UPDATE`, writes `commercial_operations_audit`, creates/reuses contract, promotes party/client, marks the quote `converted` and emits commercial events.
- `materializeInvoiceFromApprovedQuotation` and `materializeInvoiceFromHes` can create finance income from quotation/HES contexts.
- `quote_to_cash_autopromoter` exists as reactive projection hook.
- Focused Q2C/HubSpot tests passed during the audit: 6 files, 18 tests.

### Gap

- `convertQuoteToCash` explicitly leaves income materialization out of scope.
- `convert-to-invoice` creates income but bypasses the Q2C commercial audit substrate.
- The visible operator path uses the invoice route, not the atomically audited Q2C command.
- Dev data has no evidence of a completed Q2C operation.
- Issued quotations in dev lacked `hubspot_deal_id`, so HubSpot-driven autopromotion cannot close them.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_commercial.quotations`, `greenhouse_commercial.contracts`, `greenhouse_commercial.commercial_operations_audit`, `greenhouse_finance.income`, `greenhouse_sync.outbox_events`
- Consumidores afectados: Commercial Q2C commands, finance quote conversion route, reactive sync projections, future UI close action, future Nexa/API Platform actions
- Runtime target: `local`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: `convertQuoteToCash`, finance quotation materializers, `convert-to-cash` route, `convert-to-invoice` route, commercial event catalog.
- Contrato nuevo o modificado: canonical close command, recommended shape:

```ts
closeQuoteToCash({
  quotationId,
  strategy: 'simple_invoice' | 'enterprise_hes' | 'contract_only',
  dueDate,
  sourceHesId,
  idempotencyKey,
  correlationId,
  actor,
  reason
})
```

- Output minimo: `operationId`, `correlationId`, `quotationId`, `finalState`, `contractId`, `incomeId`, `clientId`, `organizationId`, `hubspotDealId`, `strategy`, `events`, `requiresApproval`, `approvalId`.
- Backward compatibility: existing HTTP callers keep working; response can add fields but must not silently change failure semantics.
- Full API parity: the business action lives in `src/lib/**` command/readers and every route/UI/agent path delegates to it.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.quotations`, `greenhouse_commercial.contracts`, `greenhouse_commercial.commercial_operations_audit`, `greenhouse_finance.income`, `greenhouse_sync.outbox_events`.
- Invariantes que no se pueden romper:
  - No new quote reaches final `converted` state without a completed or explicitly suspended `quote_to_cash` audit record.
  - When strategy requires invoice, `converted_to_income_id` or equivalent link points to an existing `greenhouse_finance.income` row.
  - Contract and income are correlated to the same quotation and organization.
  - **Income idempotency (refuerzo audit M2):** una retry/replay NUNCA crea un segundo income. El comando resuelve idempotencia con (a) `idempotencyKey` persistido + (b) lookup de income existente por `quotation_id`+`strategy` ANTES de insertar + (c) **replay devuelve el resultado previo (mismo `incomeId`)**, NO un conflicto. NUNCA depender solo del `FOR UPDATE`/status como prevención de doble AR — el `INC-${randomUUID()}` actual de `convert-to-invoice` debe quedar detrás de este guard (un segundo income = AR/revenue sobre-declarado).
  - **`contract_only` no es estado terminal silencioso:** solo permitido como estado **suspendido/intermedio**, gateado por flag, con `reason` + audit `status='suspended'` + SLA + signal de breach. Una quote en `contract_only` NUNCA cuenta como Q2C cerrado (deal ganado sin AR = revenue leakage); la conversión real (invoice) queda pendiente y observable.
  - Enterprise/HES flow cannot bypass required PO/HES evidence.
  - Approval-gated high-value Q2C cannot mutate final state through `skipApprovalGate` without explicit actor/reason/audit.
- Tenant/space boundary: use existing tenant/internal context and quotation `organization_id`; no cross-tenant lookup by raw id.
- Idempotency/concurrency: lock quotation row + **`idempotencyKey` persistido + lookup de income existente antes de insertar**; en replay **devolver el resultado previo (incl. `incomeId`)**, no un conflicto. El lock/status es defensa-en-profundidad, NO el mecanismo único de prevención de doble income.
- Audit/outbox/history: record actor, reason, strategy, before/after, correlation id, and emitted event ids.

### Migration, backfill and rollout

- Migration posture: prefer no migration; use additive DDL only if the command needs durable strategy/status/idempotency fields not already represented.
- Default state: route delegation can be additive; any behavior-changing cutover must be flag/allowlist gated until staging smoke.
- Backfill plan: no historical mass conversion in this task. Provide read-only report for issued/no-deal/no-income/converted-without-audit cases.
- Rollback path: route can be pointed back to previous implementation; additive signals/queries can remain; any created income/contract is handled through audit-guided reversal, not blind delete.
- External coordination: Finance/Commercial owner sign-off before production close smoke on a real quote.

### Security and access

- Auth/access gate: keep or introduce fine capability for Q2C execution, e.g. `commercial.quote_to_cash.execute` / existing entitlement, and do not rely only on broad session.
- Sensitive data posture: commercial deal data, finance AR/income and HubSpot anchors; redact raw provider/internal errors.
- Error contract: canonical sanitized errors with stable codes for invalid state, missing organization, missing HES/PO, approval required, duplicate conversion and permission denied.
- Abuse/rate-limit posture: no batch conversion without dry-run, allowlist and explicit operator reason.

### Runtime evidence

- Local checks: focused unit/integration tests for simple invoice, enterprise HES guard, contract-only suspension, idempotent replay and concurrent duplicate prevention.
- DB/runtime checks: read-only SQL before/after for `issued`, `converted`, `commercial_operations_audit`, `income`, `converted_to_income_id`, missing HubSpot deal anchors.
- Integration checks: staging smoke on a controlled quote fixture or approved existing issued quote.
- Reliability signals/logs: add or wire signals for `commercial.quote_to_cash.converted_without_income`, `commercial.quote_to_cash.converted_without_audit`, `commercial.quotation.issued_without_deal`, `commercial.quote_to_cash.contract_only_sla_breach` (quote en `contract_only` más allá del SLA sin income), `commercial.quote_to_cash.duplicate_income` (más de un income por `quotation_id`+`strategy`, steady=0), and Q2C completion health.
- Production verification sequence: deploy gated -> run read-only readiness -> execute one allowlisted close -> verify contract + income + audit + outbox + signal steady.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Q2C close can be executed programmatically through the canonical command without UI.
- [ ] Existing UI/API routes delegate to the same server-side command instead of separate business logic.
- [ ] The command emits audit/outbox/history with actor, reason, correlation and idempotency.
- [ ] Denied or invalid actions fail before mutation and without leaking finance/commercial internals.
- [ ] API Platform parity follow-up queda implementado o explicitamente enlazado a `TASK-1211` (que lo absorbe para todo el embudo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-06-21 (Claude) — Slices 2-5 implementados (code-complete, smoke de conversión diferido)

**Estado:** `code complete, rollout pendiente`. Slices 2-5 implementados local-first en `develop` (sin push). El **flag del cutover y el smoke de conversión real quedan diferidos** (ver más abajo). La task **sigue `in-progress`** hasta el smoke + flip con sign-off (Runtime Rollout Completion Gate).

**Commits:** `e7c45c59c` (2a: audit `suspended` + `convertQuoteToCash.incomeId`), `039ca3c47` (2b: primitives idempotentes de income), `3b26e92b4` (2c: orquestador `closeQuoteToCash` + 12 tests), `08920d3b5` (3: convergencia de ruta flag-gated + ledger), `fdd6611ed` (4: 5 reliability signals + 4 tests), `8b797a7f5` (fix tsc).

**Qué quedó construido:**
- **Slice 2a** — migración aditiva `20260621222152560` (extiende CHECK `commercial_operations_audit_status_valid` con `'suspended'`, DO block) + `'suspended'` en `COMMERCIAL_OPERATION_STATUSES`; `convertQuoteToCash` acepta `incomeId?` y enlaza `converted_to_income_id` (COALESCE).
- **Slice 2b** — `ensureIncomeFromQuotation` / `ensureIncomeFromHes` (`src/lib/finance/quote-to-cash/`): primitives **idempotentes** (lookup income existente por `quotation_id` / `HES.income_id` ANTES de insertar; replay devuelve el `incomeId` previo, NUNCA un 2.º AR). NO marcan converted ni crean contrato (contract_id NULL, backfill vía `syncContractIdOnDocumentChain`). Builder de campos de income compartido con el materializer legacy (fuente única).
- **Slice 2c** — `closeQuoteToCash` (`src/lib/commercial/quote-to-cash/close-quote-to-cash.ts`): orquestador SSOT. **income idempotente PRIMERO → `convertQuoteToCash` DESPUÉS** (nunca converted sin income). 3 estrategias: `simple_invoice`, `enterprise_hes` (exige `sourceHesId`), `contract_only` (suspended + reason + SLA, flag-gated, NUNCA terminal). Approval pre-gate ANTES de income (nunca AR antes de aprobar). Idempotencia global vía ledger `api_platform_command_executions`. Capability `commercial.quote_to_cash.execute` enforced en el command. 12 tests.
- **Slice 3** — `/api/finance/quotes/[id]/convert-to-invoice` delega en `closeQuoteToCash(simple_invoice)` detrás de `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` (default OFF → legacy intacto). Response backward-compatible.
- **Slice 4** — 5 signals en `commercial-quote-to-cash-health.ts` (rollup `commercial`), wired en `get-reliability-overview`. Live steady: `converted_without_income`=0, `converted_without_audit`=0, `issued_without_deal`=12 (warning), `contract_only_sla_breach`=0, `duplicate_income`=0. Ejercidas contra PG real (gate TASK-893).

**Hallazgo de seguridad AR + smoke local PASS (2026-06-22):** las **12 cotizaciones `issued` en dev son TODAS `source_system='nubox'`** (espejos de facturación importada). Convertir cualquiera materializaría un income que **DUPLICA el AR ya proyectado por Nubox** (revenue double-count). Resuelve la Open Question "fixture nueva vs una de las 12": **fixture manual nuevo** (NUNCA una importada). El smoke se corrió sobre un **fixture manual** (`scripts/commercial/task-1206-q2c-close-smoke.ts`, org `ZZZ Q2C Smoke`): **PASS ✅** — income + contrato + audit Q2C `completed` + converted + outbox completo; **replay devolvió el mismo `incomeId` (anti doble-AR confirmado)**; signals críticos en steady. **Pendiente:** smoke en staging (requiere push + flip `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED`) + sign-off prod.

**Gates de cierre verdes:** `pnpm test` full (7669 passed / 0 failed), `pnpm build` (Turbopack ✓), `tsc --noEmit` ✓, `pnpm lint` ✓, capability-grant-coverage ✓, flags audit ✓ (0 sin registrar).

**Pendiente de rollout (acción operador):** (1) crear fixture manual o autorizar; (2) `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED=true` en staging + smoke `simple_invoice` controlado → verificar income + contrato + audit Q2C + outbox + signals steady; (3) prod tras sign-off Commercial/Finance. `COMMERCIAL_Q2C_CONTRACT_ONLY_ENABLED` solo con política aprobada.

## Plan / Diseño (2026-06-21, Claude — Slice 1 hecho, resto pendiente)

> **Decisión del operador en esta sesión:** hacer **diseño + readiness report read-only ahora**, y **diferir el command/rutas/signals/cutover** (toca AR; entrega conservadora). Atomicidad elegida: **income idempotente primero → converted** (NO una sola tx compartida que toque primitives compartidos).

**Estado de la sesión:** `Slice 1 (discovery + readiness report) ✅ HECHO`; Slices 2-5 (command + convergencia + signals + smoke) PENDIENTES.

### Discovery verificado (no re-hacer)

- **Divergencia confirmada en código:**
  - `convertQuoteToCash` (`src/lib/commercial/party/commands/convert-quote-to-cash.ts`): substrate comercial — `FOR UPDATE`, `commercial_operations_audit` (`operation_type='quote_to_cash'`), contrato (reuse/create), promoción party/client, eventos, **approval gate**, **idempotente** (replay → `status:'idempotent_hit'`). **NO materializa income** (comentario explícito ~línea 49).
  - `materializeInvoiceFromApprovedQuotation` (`src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`): crea income `INC-${randomUUID().slice(0,8)}` (~línea 193) + contrato + marca `converted` (~350). **NO escribe audit Q2C.** **NO idempotente:** replay con `converted_to_income_id`/status converted **lanza 409** (~146), NO devuelve el `incomeId` previo. Errores string-matched (frágil).
- **Path VISIBLE del operador = `convert-to-invoice`** (finance), ya con gate `commercial.quote_to_cash.execute` (TASK-1202). `convert-to-cash` (commercial) NO tiene consumer visible.
- **Live dev (2026-06-21):** 48 draft, 12 issued, 2 expired; **0 converted, 0 income-linked, 0 audit Q2C**. Green-field. **Las 12 issued tienen organización (canCloseSimple) pero NINGUNA tiene `hubspot_deal_id`** → el autopromoter no las puede cerrar; el primer smoke debe ser un cierre operator-triggered (no autopromoter) sobre una de esas 12 (o un fixture nuevo).
- **Schema:** `commercial_operations_audit(operation_type, status, quotation_id, contract_id, ...)`; `contracts(contract_id, originator_quote_id, organization_id, status)`; `quotations(status, organization_id, hubspot_deal_id, converted_to_income_id, converted_at)`.

### Slice 1 — Readiness report (HECHO)

- `src/lib/commercial/quote-to-cash/q2c-readiness-report.ts` (read-only) + test. SQL con LATERAL joins ejercido contra PG real (gate TASK-893). Reporta por quote: `canCloseSimple`, `issuedWithoutDeal`, `convertedWithoutIncome`, `convertedWithoutAudit`, `contractOnlySuspended` + agregados. Live: 12 rows, 12 canCloseSimple, 12 issuedWithoutDeal, 0 drifts.

### Slices 2-5 — diseño para implementar (PENDIENTE)

- **Slice 2 — `closeQuoteToCash` orquestador** (`src/lib/commercial/quote-to-cash/`): NO copia SQL; compone los primitives. **Orden de atomicidad (decisión del operador):** (1) si `strategy` requiere invoice, **materializar income de forma idempotente PRIMERO** (lookup de income existente por `quotation_id`(+strategy) ANTES de insert; replay devuelve el `incomeId` previo, NO 409); (2) LUEGO `convertQuoteToCash` (substrate: audit Q2C + contrato + party + marca `converted` + eventos). Así **nunca queda `converted` sin income**; si el income falla, la quote sigue `issued` (recuperable). Idempotencia global vía el ledger canónico `api_platform_command_executions` (sin migración, patrón TASK-1212) keyado por `idempotencyKey`. Refactor mínimo de `materializeInvoiceFromApprovedQuotation`: extraer/guardar el "create-or-return-existing income" idempotente; el `INC-${uuid}` queda DETRÁS del lookup. Capability: `commercial.quote_to_cash.execute` (ya existe + granteada + enforced en ambas rutas).
  - **Estrategias:** `simple_invoice` (income desde quotation), `enterprise_hes` (income desde HES vía `materializeInvoiceFromHes`, exige PO/HES), `contract_only` (sin income, `status='suspended'` en audit + flag + SLA + signal — NUNCA terminal).
- **Slice 3 — convergencia de rutas (gated):** `convert-to-invoice` (visible) y `convert-to-cash` delegan en `closeQuoteToCash`. **Cutover behind flag/allowlist** hasta staging smoke (cambia el path visible). Backward-compatible en el response.
- **Slice 4 — signals read-only** (steady=0): `commercial.quote_to_cash.converted_without_income`, `converted_without_audit`, `commercial.quotation.issued_without_deal`, `commercial.quote_to_cash.contract_only_sla_breach`, `commercial.quote_to_cash.duplicate_income`. La lógica de detección YA vive en el readiness reader (Slice 1) — wire-up a `/admin/operations`.
- **Slice 5 — smoke + docs:** un cierre `simple_invoice` controlado (operator-triggered, sobre una de las 12 issued o fixture) → verificar contrato + income + audit + outbox + signal steady. Owner Commercial/Finance firma antes del primer cierre prod.
- **Nexa governed action `close_quote`:** reusa el runtime PARAMETRIZADO de TASK-1212 (`NexaActionDefinition<TInput>` + `inputSchema`); comparte surface `commercial-q2c` con `author_quote`. (Slice opcional post-cutover.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command contract discovery and naming

- Re-query live/staging/dev data before implementation; do not rely only on the audit counts.
- Decide whether to introduce `closeQuoteToCash` as wrapper/orchestrator or evolve `convertQuoteToCash` directly.
- Map every existing caller of `convert-to-cash`, `convert-to-invoice`, materializers and autopromoter.
- Define the accepted strategies: `simple_invoice`, `enterprise_hes`, `contract_only`.

### Slice 2 — Canonical close command

- Compose the command so the success path creates/reuses contract, promotes party/client, materializes income when required, marks quotation state, writes Q2C audit and emits outbox/events.
- Preserve the current commercial approval gate and make suspended approvals observable.
- Refactor materializers only as much as needed so there is a single final state writer for quote conversion.
- Guarantee idempotent replay returns the prior result with `incomeId` rather than creating duplicate income.

### Slice 3 — Route and projection convergence

- Update `/api/commercial/quotations/[id]/convert-to-cash` to call the canonical close command.
- Update or deprecate `/api/finance/quotes/[id]/convert-to-invoice` so it cannot bypass Q2C audit.
- Update `quote_to_cash_autopromoter` to use the canonical command or emit a clear readiness/no-op reason.
- Keep route responses backward-compatible where possible and add new result fields.

### Slice 4 — Reliability signals and readiness report

- Add read-only signals/queries for converted-without-audit, converted-without-income, issued-without-deal and Q2C operation health.
- Ensure the new reliability code does not touch unrelated WIP files under `src/lib/reliability/queries/`.
- Provide a readiness report that lets Commercial decide whether issued quotes can close or need HubSpot/deal remediation first.

### Slice 5 — Runtime smoke and docs closure

- Create a controlled local/staging smoke for one simple invoice Q2C close.
- Document before/after evidence: quotation state, contract id, income id, audit row, outbox/event ids and reliability signals.
- Update the commercial audit with the new status or link to task closure evidence.

## Out of Scope

- No new visible UI flow in this task; create/use the proposed el follow-up de UI de cierre Q2C for the operator close experience.
- No API Platform app/ecosystem lane in this task; create/use the proposed el follow-up de API Platform parity Q2C.
- No historical mass conversion/backfill of issued quotes.
- No broad capability hardening for all quote/reconciliation routes; coordinate with `TASK-1202`.
- No direct HubSpot mutation unless required for one controlled smoke and already covered by existing guarded commands.

## Detailed Spec

The command must make the final business state explicit:

- `simple_invoice`: quotation closes into contract/client/income without HES, with due date/payment terms validated.
- `enterprise_hes`: quotation closes only with required PO/HES evidence and materializes income from HES.
- `contract_only`: allowed only as a suspended/intermediate path with `reason`, audit status and follow-up signal; it is not a silent success equivalent to invoice closure.

The preferred implementation shape is one orchestration layer around existing primitives, not a copy of finance materializer SQL. If materializers currently mutate quote state independently, extract or wrap the finance income creation primitive so the canonical Q2C command owns the final converted transition.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- No route cutover before idempotency tests and a dry-run/readiness report exist.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicate income on retry (doble AR) | finance AR | medium | `idempotencyKey` persistido + lookup de income existente ANTES de insert + replay devuelve el previo (no solo lock/status) | `duplicate_income` (steady=0) / converted_without_income |
| `contract_only` queda como cierre silencioso sin AR | commercial-finance | medium | flag-gated + audit `status='suspended'` + SLA + signal; nunca terminal | `contract_only_sla_breach` |
| Quote converted without Q2C audit | commercial controls | medium | single final state writer, route convergence, regression test | converted_without_audit |
| Enterprise deal invoiced without HES/PO | commercial-finance boundary | medium | strategy-specific guards and canonical errors | enterprise missing evidence |
| HubSpot-driven autopromoter no-ops silently | sync | high | readiness reason and issued-without-deal signal | issued_without_deal |
| Existing UI route behavior breaks | operator workflow | medium | backward-compatible response and gated cutover | route error rate / smoke failure |

### Feature flags / cutover

- Additive command and signals can ship without user-visible cutover.
- Behavior-changing route convergence should be gated or allowlisted until staging smoke passes.
- Production Q2C close on real quote requires explicit owner sign-off.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert docs/read-only mapping | <10 min | si |
| Slice 2 | Disable command path / revert PR before cutover | <15 min | si |
| Slice 3 | Repoint route to previous implementation or disable flag | <15 min | parcial |
| Slice 4 | Revert signals/readiness queries | <10 min | si |
| Slice 5 | Stop smoke/allowlist and repair via audit trail | variable | parcial |

### Production verification sequence

1. Deploy command/signals gated.
2. Run read-only readiness in production: issued, converted, audit and income counts.
3. Execute one allowlisted Q2C close only after Commercial/Finance sign-off.
4. Verify quotation final state, contract, client, income, audit and outbox/events.
5. Confirm reliability signals stay steady and no duplicate income appears.

### Out-of-band coordination required

Commercial/Finance owner must approve the first production Q2C close smoke and any policy that allows `contract_only` without immediate income.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] A canonical Q2C close command exists (`closeQuoteToCash`) componiendo contract/client/income/audit/events en una operación gobernada.
- [x] `convert-to-cash` and `convert-to-invoice` cannot diverge: ambos pasan por `convertQuoteToCash`; `convert-to-invoice` delega en `closeQuoteToCash` (flag) que añade el audit Q2C que le faltaba.
- [x] The command is idempotent, concurrent-safe (income primitive con `FOR UPDATE` + lookup; ledger global) y cubierto por tests de duplicate prevention.
- [x] **Income idempotency dura:** replay devuelve el resultado previo (mismo `incomeId`), sin segundo income ni conflicto (test de replay + ledger replay). El `INC-${randomUUID()}` queda detrás del lookup de income existente.
- [x] **`contract_only` no terminal:** queda `status='suspended'` en audit + SLA + signal `contract_only_sla_breach` (test); NUNCA marca converted.
- [x] Strategy-specific guards exist for `simple_invoice`, `enterprise_hes` and `contract_only`.
- [x] New or updated signals report converted-without-audit, converted-without-income, issued-without-deal, contract-only SLA breach y duplicate-income (live steady verificado).
- [x] **Runtime evidence (smoke local + staging HTTP PASS 2026-06-22):** local — `closeQuoteToCash(simple_invoice)` sobre fixture → income `INC-be2ec127` + contrato + audit Q2C `completed` + converted + outbox completo; replay → mismo incomeId. **Staging — flag ON + redeploy `greenhouse-jfz70d2gr`; `POST convert-to-invoice` (HTTP) devolvió shape canónico (operationId/finalState/strategy) = ruta deployada delega en el comando; 2.º POST → mismo incomeId, 1 income en PG (anti doble-AR en el deployment real).** Signals críticos steady. **Pendiente SOLO prod:** migración en base prod (release control plane) + flag Production + smoke + sign-off. NUNCA convertir las 12 Nubox imports (doble AR).
- [x] Full API Parity follow-up enlazado a `TASK-1211` (lane versionado para todo el embudo).

## Verification

- `pnpm test src/lib/commercial/party/commands/__tests__/convert-quote-to-cash.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-hes.test.ts`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm task:lint --task TASK-1206`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed --runtime --data --docs`
- Read-only DB smoke: counts for quotations by status, Q2C audit rows, linked income rows and issued-without-deal rows before/after.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1202`, el follow-up de API Platform parity Q2C y el follow-up de UI de cierre Q2C si existen
- [ ] Commercial Q2C audit fue actualizado con el nuevo estado o evidencia de cierre.

## Follow-ups

- API Platform parity Q2C → **absorbido por `TASK-1211`** (`quotation.v1` / `quote_to_cash.v1` para todo el embudo). Coordinar el slot del close.
- el follow-up de UI de cierre Q2C (propuesta): UI operator close experience que consuma el comando canonico.
- Approval workflow resoluble para Q2C >100M si no queda cubierto por el sistema generico de aprobaciones.

## Open Questions

- ~~Debe `contract_only` existir en produccion o solo como modo interno/suspendido con SLA?~~ **Resuelto (endurecimiento 2026-06-20):** `contract_only` existe SOLO como **estado interno/suspendido** gateado por flag, con `reason` + audit `status='suspended'` + SLA + signal `contract_only_sla_breach`. NUNCA es un Q2C cerrado terminal (sería deal ganado sin AR = revenue leakage). El owner Commercial/Finance debe aprobar cualquier política que lo permita en prod (ver Out-of-band coordination).
- Que capability fina exacta sera canonica: `commercial.quote_to_cash.execute`, `commercial.quotation.close` u otra ya registrada? **El naming lo fija `TASK-1202`** como steward del catalogo de quote capabilities; esta task la consume.
- El primer smoke debe usar una quote fixture nueva o una de las 12 issued observadas en dev/staging?
