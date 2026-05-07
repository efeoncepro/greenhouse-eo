# TASK-817 — Client Lifecycle Canonical Commands + Outbox Events v1

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial`
- Blocked by: `TASK-816`
- Branch: `task/TASK-817-client-lifecycle-commands`

## Summary

Implementa los 5 comandos canónicos del módulo Client Lifecycle V1 (`provisionClientLifecycle`, `deprovisionClientLifecycle`, `advanceLifecycleChecklistItem`, `resolveLifecycleCase`, `addLifecycleBlocker`/`resolveLifecycleBlocker`) atomic + idempotent, con audit log append-only + 8 outbox events versionados v1 + state machine enforcement TS↔DB.

## Why This Task Exists

Sin comandos canónicos, cualquier consumer (UI, webhook, script) tendría que componer el INSERT/UPDATE de case + checklist + audit + outbox a mano — el anti-pattern que TASK-771/773 cerró para finance. Los comandos canónicos son la única forma de garantizar atomicidad, idempotencia, validación de transiciones, redaction de PII en `reason`, y emisión consistente del outbox event v1 que dispara consumers reactivos downstream.

## Goal

- 5 comandos canónicos en `src/lib/client-lifecycle/commands/` con firmas del spec §7
- Audit log writer `recordCaseEvent({caseId, eventKind, payload, actor})` reusable (espeja TASK-808 `recordAuditEvent`)
- 8 outbox events declarados en `GREENHOUSE_EVENT_CATALOG_V1.md` con `payload_json.version=1`
- Pre-flight blocker detection en `deprovisionClientLifecycle` (consulta VIEWs canónicas TASK-722, engagement_phases, payment_orders)
- Tests unitarios + integración: idempotencia, transición ilegal, override sin capability, evidence requirement
- Lint + tsc + test verde

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §7 (Commands), §10 (Outbox Events), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — declarar 8 events nuevos con schema JSON
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón outbox + idempotency

Reglas obligatorias:

- Comandos atomic via `withTransaction(client => ...)` de `src/lib/db.ts`
- Outbox events versionados v1 con `payload_json.version=1`, sin sufijo `_v1` en el event_kind
- Idempotency via UNIQUE partial `client_lifecycle_cases_one_active_per_kind` (no double-create); commands re-llamables seguros
- Reason redacted via `redactSensitive` antes de loggear; raw value persiste en DB pero NUNCA en logs/Sentry
- Errors via `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle' } })`
- State machine enforced TS via helper `assertValidLifecycleTransition` mirror del DB CHECK
- Snapshot del template al materializar checklist (NO referenciar template by code en runtime — capturar `item_label`, `required`, `requires_evidence` al INSERT del item)
- NUNCA invocar `instantiateClientForParty` ni `archiveClientForParty` directo desde estos comandos; el cascade va por outbox + reactive consumer (TASK-820)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §7, §10, §16
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (catálogo a extender)
- `CLAUDE.md` sección "Outbox publisher canónico" (TASK-773) y "Finance — Reactive projections" (TASK-771)

## Dependencies & Impact

### Depends on

- TASK-816 (DDL completa)
- `src/lib/db.ts` `withTransaction` ✅ existe
- `src/lib/observability/redact.ts` `redactSensitive` ✅ existe
- `src/lib/observability/capture.ts` `captureWithDomain` ✅ existe
- VIEW canónica `greenhouse_finance.income_settlement_reconciliation` (TASK-571) para pre-flight blocker `pending_invoice` ✅ existe
- `greenhouse_commercial.engagement_phases` (TASK-803) para pre-flight blocker `open_engagement_phase` ✅ existe
- `greenhouse_finance.payment_orders` (TASK-765) para pre-flight blocker `pending_payment_order` ✅ existe

### Blocks / Impacts

- TASK-818 (API surface) — consume estos comandos
- TASK-820 (cascade consumers) — consume outbox events emitidos
- TASK-821 (HubSpot trigger) — invoca `provisionClientLifecycle` con `triggerSource='hubspot_deal'`

### Files owned

- `src/lib/client-lifecycle/commands/provision-client-lifecycle.ts`
- `src/lib/client-lifecycle/commands/deprovision-client-lifecycle.ts`
- `src/lib/client-lifecycle/commands/advance-checklist-item.ts`
- `src/lib/client-lifecycle/commands/resolve-lifecycle-case.ts`
- `src/lib/client-lifecycle/commands/blockers.ts`
- `src/lib/client-lifecycle/audit/record-case-event.ts`
- `src/lib/client-lifecycle/state-machine/transitions.ts`
- `src/lib/client-lifecycle/blockers/pre-flight.ts`
- `src/lib/client-lifecycle/__tests__/*.test.ts`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta con 8 events nuevos)

## Current Repo State

### Already exists

- 4 tablas + state machine + templates seed (TASK-816)
- Helpers canónicos: `withTransaction`, `redactSensitive`, `captureWithDomain`
- VIEWs canónicas finance para pre-flight (TASK-571/722/765)
- Outbox infrastructure (TASK-771/773): `outbox_events` + ops-worker publisher

### Gap

- No existen comandos TS para client lifecycle (single source of truth de transiciones)
- No hay audit log writer para `client_lifecycle_case_events`
- No hay outbox events v1 declarados para client lifecycle
- No hay pre-flight blocker detector que consulte invoices abiertas + phases sin outcome + payment_orders no-terminales

## Scope

### Slice 1 — Audit log writer + state machine helper

- `recordCaseEvent({caseId, eventKind, fromStatus?, toStatus?, payload, actor, client?})` con `client?: Kysely | Transaction`
- `assertValidLifecycleTransition(fromStatus, toStatus)` — TS mirror del CHECK DB
- Tests: 25 transiciones (válidas + inválidas)

### Slice 2 — Pre-flight blocker detector

- `detectOffboardingBlockers(organizationId)` — consulta:
  - invoices abiertas vía `income_settlement_reconciliation` (drift > 0)
  - engagement_phases sin outcome
  - payment_orders en estados no-terminales (`draft|pending_approval|approved|submitted|paid` sin `settled|closed`)
- Devuelve `BlockerReasonCode[]`: `pending_invoice | pending_settlement | open_engagement_phase | pending_payment_order`

### Slice 3 — `provisionClientLifecycle` + `deprovisionClientLifecycle`

- Atomic tx: validar idempotency (UNIQUE partial) → INSERT case → materializar checklist desde template (snapshot label/required/requires_evidence) → INSERT case_event `opened` → publish outbox `client.lifecycle.case.opened` v1
- `deprovisionClientLifecycle` adicionalmente: invoca `detectOffboardingBlockers`, popula `blocked_reason_codes`, status='in_progress' o 'blocked' según resultado
- Idempotency: si existe caso activo del mismo kind, devolver el existente (NO crear duplicado, NO error)
- Reason redaction antes de logs

### Slice 4 — `advanceLifecycleChecklistItem`

- Atomic tx: SELECT FOR UPDATE item → validar transición de status → validar `evidence_asset_id` requerido → UPDATE item → INSERT case_event `item_advanced` → outbox `client.lifecycle.item.advanced` v1
- Auto-resolución: si todos los items required + blocks_completion están `completed|skipped|not_applicable` y `blocked_reason_codes` vacío, transicionar case a "ready_for_resolution" via blocker_added/resolved meta-event
- NO transiciona case a `completed` automático — eso es trabajo de `resolveLifecycleCase`

### Slice 5 — `resolveLifecycleCase`

- Atomic tx: SELECT FOR UPDATE case → validar required items completados (o `overrideBlockers=true` con capability check) → UPDATE case status → INSERT case_event `closed` → outbox `client.lifecycle.case.completed` o `client.lifecycle.case.cancelled` v1
- Si `overrideBlockers=true`: enforce reason ≥ 20 chars + outbox `client.lifecycle.blocker.overridden` v1
- Cascade payload: incluir lista de side-effects requeridos (`instantiateClientForParty`, `archiveClientForParty`, `revokeClientUsersAccess`) que TASK-820 consumirá

### Slice 6 — `addLifecycleBlocker` / `resolveLifecycleBlocker`

- Helpers para gestión manual de blockers
- Atomic + outbox events `client.lifecycle.blocker.added` / `_resolved` v1

### Slice 7 — Outbox events declaration

- Editar `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` con Delta sección "TASK-817 Client Lifecycle V1.0"
- 8 events con schema JSON canónico:
  1. `client.lifecycle.case.opened` v1
  2. `client.lifecycle.case.activated` v1
  3. `client.lifecycle.item.advanced` v1
  4. `client.lifecycle.blocker.added` v1
  5. `client.lifecycle.blocker.resolved` v1
  6. `client.lifecycle.case.completed` v1
  7. `client.lifecycle.case.cancelled` v1
  8. `client.lifecycle.blocker.overridden` v1

### Slice 8 — Tests

- Unit: state machine transiciones (25 casos)
- Unit: pre-flight blocker detector (con/sin invoices abiertas, con/sin phases, con/sin payment_orders)
- Integration: idempotency (doble call → mismo case_id)
- Integration: race condition (2 callers concurrentes → uno gana, otro recibe el existing)
- Integration: resolveLifecycleCase con required pendientes → falla
- Integration: resolveLifecycleCase con overrideBlockers + capability → succeeds + outbox event `blocker.overridden` emitted

## Out of Scope

- API HTTP endpoints — TASK-818
- UI invocation — TASK-819
- Reactive consumers que ejecuten cascade post-completion — TASK-820
- HubSpot webhook handler — TASK-821
- CHECK constraint en `clients.status` que requiere case resuelto — V1.1

## Detailed Spec

Ver `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §7 para firmas TS completas. Reglas críticas:

```ts
// State machine TS
const ALLOWED_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ['in_progress', 'cancelled'],
  in_progress: ['blocked', 'completed', 'cancelled'],
  blocked: ['in_progress', 'completed' /* override only */, 'cancelled'],
  completed: [],
  cancelled: [],
}

// Outbox event payload contract
interface ClientLifecycleCaseOpenedPayloadV1 {
  version: 1
  caseId: string
  organizationId: string
  clientId: string | null
  caseKind: 'onboarding' | 'offboarding' | 'reactivation'
  triggerSource: 'hubspot_deal' | 'manual' | 'renewal' | 'churn_signal' | 'migration'
  effectiveDate: string  // ISO
  templateCode: string
  blockedReasonCodes: string[]
  occurredAt: string
}
```

Pre-flight blocker queries (pseudocódigo):

```sql
-- pending_invoice: leer income_settlement_reconciliation drift > 0
SELECT count(*) FROM greenhouse_finance.income_settlement_reconciliation
  WHERE client_id = $1 AND drift_clp > 0;

-- open_engagement_phase
SELECT count(*) FROM greenhouse_commercial.engagement_phases ep
  JOIN greenhouse_core.services s ON s.service_id = ep.service_id
  WHERE s.client_id = $1
    AND ep.status NOT IN ('completed','skipped')
    AND NOT EXISTS (SELECT 1 FROM engagement_outcomes WHERE phase_id = ep.phase_id);

-- pending_payment_order
SELECT count(*) FROM greenhouse_finance.payment_orders po
  WHERE po.client_id = $1
    AND po.state NOT IN ('settled','closed','cancelled');
```

## Acceptance Criteria

- [ ] 5 comandos exportados desde `src/lib/client-lifecycle/commands/index.ts`
- [ ] `recordCaseEvent` reusable con `client?` opcional para compartir transacción
- [ ] State machine `assertValidLifecycleTransition` cubre 100% de transiciones del spec §6
- [ ] `detectOffboardingBlockers` consulta las 3 fuentes y devuelve unión deduplicada
- [ ] Idempotency: doble call de `provisionClientLifecycle` con mismo `(organizationId, caseKind)` activo devuelve mismo `caseId`
- [ ] Race protection: 2 calls concurrentes → uno gana, el otro recibe existing (sin duplicate constraint violation crash)
- [ ] `resolveLifecycleCase` con required pendientes y `overrideBlockers=false` lanza `LifecycleCaseHasPendingItems` error
- [ ] `resolveLifecycleCase` con `overrideBlockers=true` requiere `overrideReason.length >= 20` (validado server-side)
- [ ] Reason redaction: `reason` raw NUNCA aparece en logs/Sentry; `redactSensitive` aplicado en error paths
- [ ] 8 outbox events declarados en `EVENT_CATALOG` con `payload_json.version=1`
- [ ] Cascade payload de `case.completed` incluye `sideEffectsRequired` array para TASK-820
- [ ] Tests unitarios + integración pasan (40+ tests estimado)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/client-lifecycle` verde

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-lifecycle`
- Smoke manual: invoke `provisionClientLifecycle` desde script ad-hoc en local, verificar case + 10 items + 1 outbox event en PG

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si Delta visible
- [ ] Chequeo cruzado: TASK-818, TASK-820, TASK-821 desbloqueadas (lo están)
- [ ] Si hubo desvío vs spec §7 o §10, registrar Delta en `GREENHOUSE_CLIENT_LIFECYCLE_V1.md`

## Follow-ups

- TASK-818 puede arrancar inmediatamente
- Considerar agregar reliability signal `client.lifecycle.cascade_dead_letter` (queda para TASK-820)
- Si emerge necesidad de blocker code nuevo (ej. `pending_legal_review`), agregar al catálogo en spec + helper

## Open Questions

- ¿`provisionClientLifecycle` para `caseKind='reactivation'` requiere `previous_case_id` validado como `status='completed'` o también acepta `cancelled`? Recomendación: solo `completed` (cancelled significa "el offboarding se canceló, el cliente sigue activo, no hay reactivation").
- ¿Auto-trigger de transición `in_progress → blocked` cuando un blocker se agrega vs queda manual? Recomendación: auto (más resiliente; el `addLifecycleBlocker` flippea status si está en `in_progress`).
