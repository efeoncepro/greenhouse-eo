# TASK-470 — Pricing Catalog Enterprise Hardening (Concurrency + Validation + Impact + Overcommit)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `hardening`
- Status real: `Complete`
- Rank: `TBD`
- Domain: `backend`
- Blocked by: `TASK-467 phase-2 (shipped)`
- Branch: `task/TASK-470-pricing-catalog-enterprise-hardening`
- Legacy ID: `split out de TASK-467 "enterprise-grade gaps"`
- GitHub Issue: `none`

## Summary

Robustecer las operaciones del pricing catalog admin (TASK-467 MVP + phase-2) cerrando 4 gaps backend concretos que hoy dejan huecos de seguridad operativa: concurrency control (last-write-wins), validación de constraints de negocio (rates inválidos), impact analysis pre-change (blast radius invisible) y overcommit alerts (vender más FTE del disponible).

TASK-467 phase-2 shipped la UI; esta task es backend hardening puro.

## Why This Task Exists

TASK-467 dejó el admin UI funcional pero con huecos de producción real:

- **Concurrency**: dos admins editando el mismo rol simultáneamente pierden cambios silenciosamente (last-write-wins sin warning)
- **Validación**: `hours_per_fte_month=0`, `margin_min<0`, `factor_min>factor_max` pasan sin bloquear — el `max(x,1)` reactivo del engine es band-aid, no prevención
- **Impact blindness**: finance_admin baja el `margin_min` del Tier 4 sin saber que afecta 43 quotes activas por ~$120M CLP en pipeline
- **Overcommit silencioso**: la sinergia FTE de phase-2 fijó el cálculo, pero no la protección. Se puede vender 2.0 FTE de la misma persona (hay billable commitment) mientras operacionalmente son 160h disponibles

Son los 4 gaps que cuantifican la diferencia entre MVP funcional vs sistema confiable para operar sin supervisión.

## Goal

- **Concurrency control**: todos los PATCH endpoints de admin exigen header `If-Match: <updated_at>` (optimistic locking). Response 409 Conflict si stale
- **Business constraint validator**: helper central `validatePricingCatalogConstraints(entity, input)` con reglas por entity type (role, tool, overhead, tier_margin, etc.). Rechaza antes de INSERT/UPDATE con 422 + `issues[]`
- **Impact analysis pre-change**: endpoint `POST /api/admin/pricing-catalog/{entity}/[id]/preview-impact` que estima quotes afectadas + total CLP en pipeline si el cambio se aplica
- **Overcommit detection**: helper `detectMemberOvercommit(memberId, asOfDate?)` que cruza billable commitments (de `quotation_line_items` con `lineType='person'`) vs operational capacity (de `member_capacity_economics`). Emite evento outbox `commercial.capacity.overcommit_detected` cuando detecta > 100% utilization proyectado

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` (v2.18)
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md` (capacity layer canonical)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (nuevo evento `commercial.capacity.overcommit_detected`)

Reglas obligatorias:

- **Payroll isolation**: cero writes a `greenhouse_payroll.*`. Los 194 tests baseline deben pasar intactos
- **Backward compat**: requests admin existentes sin `If-Match` header deben seguir funcionando con warning header de deprecation (migración gradual — strict enforcement en phase-4)
- **Read-only para detección**: el overcommit detector NO muta data, solo lee y emite evento. Las acciones correctivas (desasignar, re-balancear) quedan como follow-up
- **Business constraints declarativos**: las reglas viven en un archivo `pricing-catalog-constraints.ts` como data, no hardcoded en routes. Extensible vía config si aparecen nuevos constraints

## Dependencies & Impact

### Depends on

- TASK-467 phase-2 shipped — audit log, stores, API routes existentes
- TASK-456 deal pipeline snapshots — para impact analysis cross-reference
- TASK-464d pricing engine v2 — constraint validation reutiliza la lógica del engine

### Blocks / Impacts

- Elimina la clase de bugs "cambio perdido por edit simultáneo"
- Previene rates corruptos que rompen pricing silenciosamente
- Da Finance visibility: "si bajo este margin_min, 43 quotes activas se ven afectadas"
- Alerta overcommit antes de que un PM descubra en delivery que Juan está sobre-vendido

### Files owned

- `src/lib/commercial/pricing-catalog-constraints.ts` (nuevo — reglas de validación declarativas)
- `src/lib/commercial/pricing-catalog-impact-analysis.ts` (nuevo — queries cross-reference)
- `src/lib/team-capacity/overcommit-detector.ts` (nuevo — cruza capacity vs billable)
- `src/lib/tenant/optimistic-locking.ts` (nuevo — helper `requireIfMatch(request, currentUpdatedAt)`)
- `src/app/api/admin/pricing-catalog/**/route.ts` (extender con concurrency + validation)
- `src/app/api/admin/pricing-catalog/{roles,tools,overheads}/[id]/preview-impact/route.ts` (nuevos)
- `src/lib/sync/event-catalog.ts` (agregar `capacity.overcommit_detected`)
- `migrations/[verificar]-task-470-overcommit-detector-snapshot.sql` (opcional — tabla de snapshots si se quiere historizar detections)

## Current Repo State

### Already exists

- TASK-467 phase-2: admin UI + audit log + PATCH routes
- TASK-456: `greenhouse_serving.deal_pipeline_snapshots` con quote rollups
- `greenhouse_serving.member_capacity_economics` con operational capacity
- Pricing engine v2 con tier compliance validation (parcial)

### Gap

- Sin `If-Match` / optimistic locking en ningún PATCH admin
- Sin validator central de business constraints
- Sin endpoint de impact preview
- Sin overcommit detector
- Evento `capacity.overcommit_detected` no existe en catálogo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Optimistic locking helper

- `src/lib/tenant/optimistic-locking.ts` con `requireIfMatch(request, currentUpdatedAt): { ok, errorResponse? }`
- Todos los PATCH de admin pricing catalog enforzan el header. Si falta: warning header `X-Deprecated-No-If-Match: true` (phase-4 lo vuelve strict)
- Response 409 si stale: `{ error: 'Conflict', currentUpdatedAt, message }`
- GET endpoints agregan `ETag: <updated_at>` header + response incluye `updatedAt` en el body para que UI lo loopee back

### Slice 2 — Business constraint validator

Archivo `src/lib/commercial/pricing-catalog-constraints.ts` exporta:

```ts
export type ConstraintIssue = {
  field: string
  rule: string
  message: string
  severity: 'error' | 'warning'
}

export function validateSellableRole(input): ConstraintIssue[]
export function validateToolCatalog(input): ConstraintIssue[]
export function validateOverheadAddon(input): ConstraintIssue[]
export function validateRoleTierMargin(input): ConstraintIssue[]
export function validateCommercialModelMultiplier(input): ConstraintIssue[]
export function validateCountryPricingFactor(input): ConstraintIssue[]
export function validateEmploymentType(input): ConstraintIssue[]
export function validateCostComponents(input): ConstraintIssue[]
export function validatePricingRow(input): ConstraintIssue[]
```

Reglas iniciales sugeridas (extensible):

- `hours_per_fte_month`: `>= 80 && <= 220` (rango sano ± 20% sobre 180 default)
- `margin_min <= margin_opt <= margin_max` (monotonicidad)
- `factor_min <= factor_opt <= factor_max` (monotonicidad)
- `multiplier_pct`: `>= -50 && <= 100` (sanity)
- `previsional_pct_default`: `>= 0 && <= 50` (sanity previsional Chile)
- `fte_fraction`: `>= 0.05 && <= 1.5` (evitar 0 y overcommit)
- `subscription_amount`: `>= 0` si costModel === 'subscription'
- `bonus_*`: `>= 0`

Las routes llaman al validator y devuelven 422 con `{ issues: ConstraintIssue[] }` si hay `severity='error'`. `warning` se devuelve pero no bloquea.

### Slice 3 — Impact analysis endpoints

`POST /api/admin/pricing-catalog/{entity}/[id]/preview-impact`:

Body: `{ changeset: Partial<EntityShape> }` (qué valores va a cambiar, sin persistir).

Response:
```ts
{
  affectedQuotes: {
    count: number
    totalAmountClp: number
    sample: Array<{ quotationId, quotationNumber, clientName, totalAmountClp, status }>
  }
  affectedDeals: {
    count: number
    totalPipelineClp: number
  }
  warnings: string[]
}
```

Logic:
- Para `sellable_role` (cambio de cost/pricing): join `quotation_line_items` con `lineType='role'` y `roleCode` = el rol cambiado, con status `draft|sent|pending_approval`. Count + sum total_amount_clp
- Para `role_tier_margin` (cambio de margin_min/opt/max): join roles del tier con quotation_line_items activos. Count
- Para `commercial_model_multiplier` / `country_pricing_factor`: join quotations con ese modelo/país
- Para `tool_catalog` / `overhead_addon`: similar join
- Siempre scoped a quotes con status abierto (no `rejected`, `expired`, `invoiced`)

Es un dry-run read-only. Nunca muta.

### Slice 4 — Overcommit detector

`src/lib/team-capacity/overcommit-detector.ts`:

```ts
export interface OvercommitReport {
  memberId: string
  asOfDate: string
  operationalCapacityHours: number  // del capacity snapshot
  billableCommittedHours: number    // suma de quotation_line_items activos
  utilizationPct: number            // committed / capacity
  status: 'healthy' | 'near_limit' | 'overcommit'
  breakdown: Array<{ quotationId, quotationNumber, clientName, commitmentHours }>
}

export async function detectMemberOvercommit(
  memberId: string,
  asOfDate?: string
): Promise<OvercommitReport>

export async function detectAllOvercommits(
  asOfDate?: string
): Promise<OvercommitReport[]>
```

Logic:
1. Lee `member_capacity_economics.commercialAvailabilityHours` (o `contractedHours` como fallback) para `asOfDate`
2. Lee `quotation_line_items` con `lineType='person' AND memberId=$1` para quotes con status `sent | approved | pending_approval` que incluyan el mes
3. Suma commitments convertidos a horas (usando `fte_hours_guide` override per-role o default)
4. Clasifica: `healthy` (<85%), `near_limit` (85-100%), `overcommit` (>100%)

Cuando `detectAllOvercommits` encuentra cases `overcommit`, emite outbox event `commercial.capacity.overcommit_detected` con payload:
```ts
{
  memberId, asOfDate,
  operationalCapacityHours,
  billableCommittedHours,
  utilizationPct,
  affectedQuotationIds: string[]
}
```

Consumer para este evento es follow-up (ej. notification a delivery manager, dashboard widget).

### Slice 5 — Cron opcional de overcommit sweep

Opcional MVP: `/api/cron/capacity-overcommit-sweep` cada 6h que corre `detectAllOvercommits()` y emite los eventos. Si se difiere, se puede llamar manualmente desde ops-worker o admin UI botón "Check overcommit".

### Slice 6 — Tests

- `src/lib/commercial/__tests__/pricing-catalog-constraints.test.ts`: happy path + edge cases per validator (~40 tests)
- `src/lib/team-capacity/__tests__/overcommit-detector.test.ts`: mocked capacity + commitments, scenarios de healthy/near_limit/overcommit (~15 tests)
- `src/lib/tenant/__tests__/optimistic-locking.test.ts`: missing header, stale, fresh (~8 tests)
- Integration test per route admin: concurrency violation → 409, constraint violation → 422 (~20 tests)

Total ~80-100 tests nuevos.

### Out of Scope

- Maker-checker approval workflow (phase-4)
- One-click revert desde audit (phase-4)
- Bulk operations + Excel roundtrip (phase-4)
- RBAC granular por BL (phase-4, cuando el negocio escale)
- Notificaciones Slack/email (consumer del overcommit event es follow-up)

## Detailed Spec

### Concurrency flow

```
Client: GET /admin/pricing-catalog/roles/xxx
Response: {
  body: { ..., updatedAt: '2026-04-19T10:00:00Z' }
  headers: { ETag: '2026-04-19T10:00:00Z' }
}

Client: PATCH /admin/pricing-catalog/roles/xxx
Headers: { If-Match: '2026-04-19T10:00:00Z' }
Body: { active: false }

Backend:
  current = SELECT updated_at FROM sellable_roles WHERE role_id=xxx
  if current !== If-Match header: return 409
  else: proceed with UPDATE, return new row with new updatedAt
```

### Validation error shape

```json
{
  "error": "Validation failed",
  "issues": [
    { "field": "margin_min", "rule": "monotonicity", "message": "margin_min debe ser <= margin_opt", "severity": "error" },
    { "field": "hours_per_fte_month", "rule": "range", "message": "debe estar entre 80 y 220", "severity": "error" }
  ]
}
```

UI debe mostrar los issues agrupados por field con el message humano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Todos los PATCH admin aceptan `If-Match` header y responden 409 si stale
- [x] GET endpoints exponen `updatedAt` en body + `ETag` header
- [x] Validator bloquea 10+ constraints de negocio documentados
- [x] Preview-impact endpoint funciona para role/tool/overhead/tier/model/country y retorna counts + sample
- [x] Overcommit detector identifica correctamente member con 120% utilization en test scenario
- [x] Evento `commercial.capacity.overcommit_detected` emitido y visible en outbox
- [x] Tests nuevos y suite de validación relevante passing
- [x] Payroll baseline intacto (`pnpm test` → 1476 passed, 2 skipped)
- [x] TypeScript + lint + build verdes

## Verification

- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit --incremental false`
- [x] `pnpm test`
- [x] `pnpm build`
- [ ] Manual staging: simular concurrency con dos sessions + edit simultáneo → verificar 409
- [ ] Manual: editar role con `hours_per_fte_month=0` → 422 con issue
- [ ] Manual: preview-impact de cambio de margin_min → ver count de quotes afectadas

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] Archivo en carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] Chequeo impacto cruzado con TASK-467 (admin UI debería consumir el If-Match + validator)
- [x] Architecture doc actualizado — sección "Pricing Catalog Hardening"

## Delta 2026-04-19 — Cierre

- TASK-470 queda cerrada como backend hardening del pricing catalog admin.
- Se validó con `pnpm lint`, `pnpm exec tsc --noEmit --incremental false`, `pnpm build` y `pnpm test` (`1476 passed`, `2 skipped`).
- La verificación manual de staging queda como smoke check recomendable, no bloqueante para cerrar el hardening backend en el repo.

## Follow-ups (phase-4)

- Maker-checker approval workflow para cambios críticos (margin_min, commercial_model_multiplier)
- One-click revert desde audit log entry
- Bulk operations: select N roles + apply change con preview-impact agregado
- RBAC granular por BL/región
- Consumer del overcommit event: notificación a delivery manager + widget en dashboard
- Rate limiting admin endpoints
- API versioning `/v1/` path
- Schema snapshot / export a Excel + re-import con diff preview

## Open Questions

- ¿El overcommit detector debe incluir commitments de service_composition (TASK-465) cuando shipee? Propuesta: sí, pero como follow-up cuando TASK-465 canonice `module_id` en quote line items
- ¿El If-Match debe ser strict de inmediato o gradual? Propuesta: warning-only en phase-3, strict en phase-4 después de 2 semanas de runway (UI ya manda siempre)
- ¿El impact-preview cachea? Propuesta: no en V1, es read-only. Si aparece latencia, cache 5min
