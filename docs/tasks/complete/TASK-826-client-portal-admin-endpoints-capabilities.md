# TASK-826 — Client Portal Admin Endpoints + 7 Capabilities + Audit + UI Admin

## Status

- Lifecycle: `complete`
- Completed at: `2026-05-12`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto` (era Medio; reclasificado por verdict v1.1 — 8 slices densos: errors+audit + 4 commands + capabilities+parity + endpoints + UI + tests)
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Implementacion v1.1 directo en develop (sin branch separada por instruccion operativa 2026-05-12). Spec v1.1 con 5 correcciones verdict aplicadas pre-Slice-1.`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `none` (TASK-825 cerrada 2026-05-12)
- Branch: `develop` (direct work, no feature branch — user override)

## Delta 2026-05-12 (tercera revisión — arch-architect verdict v1.1 aplicado pre-Slice-1)

5 correcciones estructurales al spec V1.0 original verificadas contra realidad post-cierre de TASK-822/823/824/825 + invariantes canónicos del repo:

1. **Issue 1 (bloqueante)** — `business_line` drift residual: 8 referencias en spec post-TASK-824 V1.4 rename a `applicability_scope`. **Distinción load-bearing canonizada en V1.4 §3.1**:
   - **Column DB y código** → `applicability_scope` / `applicabilityScope` (renombrado por "no duplicar enum del 360 canónico" per `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1`).
   - **Capability names y signal names** → preservan `business_line` (concepto operator-facing — describe "categoría de aplicabilidad" que en el lenguaje comercial es business-line). Reconciliado explícitamente en spec V1.4 glossary §21.
   - **Fix**: Detailed Spec código `module.business_line` → `module.applicabilityScope`, scope rules líneas 142/176/221/224/258 actualizadas. Capability `override_business_line_default` SE PRESERVA (concept, no column).

2. **Issue 2 (bloqueante)** — Auth pattern: spec usaba `requireServerSession + can()`. CLAUDE.md sección "Admin Center Entitlement Governance" línea 73 canoniza: **"Cada endpoint debe hacer doble gate: `requireAdminTenantContext()` para entrada broad y `can(tenant, 'access.governance.*', action, 'tenant')` para least privilege granular"**. TASK-839 + TASK-848 + TASK-850 lo siguen. **Fix**: cambiar pattern auth en los 7 endpoints a `requireAdminTenantContext()` + `can()` granular. Diferencia funcional: `requireAdminTenantContext` rechaza cliente/operations sessions con 403 inmediato (defense-in-depth + perf), mientras `requireServerSession` los habría dejado pasar broad antes del filtro `can()`.

3. **Issue 3 (bloqueante)** — Zod prohibido: spec línea 162 decía "Body validation Zod". `greenhouse-backend` skill explicit: **"Never use Zod — use custom assertion functions"**. Pattern canónico: `FinanceValidationError extends Error { statusCode, details }` + `assertNonEmptyString(value, fieldName)` etc. (verificado `src/lib/finance/shared.ts:47-181`). **Fix**: crear `src/lib/client-portal/commands/errors.ts` con `ClientPortalValidationError` + `BusinessLineMismatchError` + assertion functions del dominio. Catch handler: `if (error instanceof ClientPortalValidationError) return NextResponse.json({error: error.message, details: error.details}, {status: error.statusCode})`.

4. **Issue 4 (reclasificación)** — Effort Medio → Alto: scope spec incluye 5 commands atómicos + 7 capabilities (declaración TS + seed migration `capabilities_registry` TASK-840 invariant) + 6 outbox events v1 (EVENT_CATALOG + payloads typed) + 7 endpoints HTTP admin + 2 surfaces UI (Vuexy + microcopy + DESIGN.md CI gate) + parity test heredado + 14+ tests integration. Objetivamente Alto, no Medio. **Decisión**: mantener 7 slices secuenciales (NO split en 826A+826B — split agrega handoff overhead y commands sin endpoints no aportan valor downstream). Presupuestar 3-5 días.

5. **Issue 5 (polish bloqueante)** — Parity test capabilities[] heredado de TASK-824 Delta: mencionado en Delta block línea 31-33 pero NO en Files owned ni Acceptance Criteria. Riesgo de drop silent del invariant. **Fix**: agregar a Files owned 3 archivos canónicos (`parity.{ts,test.ts,live.test.ts}`) replicando shape TASK-611 + TASK-824 Slice 2 + AC: "Parity test live verifica que seed `modules.capabilities[]` ⊆ entitlements-catalog post-seed migration. Drift detection bloqueante."

## Delta 2026-05-12 — Open Questions resueltas pre-execution

3 Open Questions del spec original resueltas durante el verdict:

- **OQ catalog management UI** (línea 288 original) → **V1.0 read-only via UI** + create solo via migration (consistente con append-only trigger TASK-824). POST + PUT endpoints quedan diferidos a V1.1 con feature flag explícito. **Eliminados de Files owned V1.0**: `catalog/route.ts (POST)` y `catalog/[moduleKey]/route.ts (PUT)` — solo ship `GET /api/admin/client-portal/catalog` + UI read-only. Reduce scope 2 endpoints; consistente con anti-pattern "UI write sin governance pattern claro".

- **OQ pause sin reason** (línea 287 original) → reason opcional pero recomendado. Sin reason: audit row con `reason='paused_no_reason_provided'` (placeholder honesto). Reliability signal V1.1 podría detectar high rate de "paused sin reason" como anomalía operativa.

- **OQ implícita Issue 7** (resolver helper `org.businessLine`) → documentar que `org.businessLine` resuelve via helper canónico `resolveOrganizationCanonicalBusinessLine(orgId, tx)` que lee `greenhouse_core.service_modules.module_code WHERE module_kind='business_line'` (TASK-016) JOIN organizations. Multi-BL orgs (multi-business-line clients) requieren choice explícito — error si emerge (V1.0 NO soporta auto-pick first), Open Question V1.1 para multi-BL handling.

## Delta 2026-05-12 — TASK-825 cerrada, cache invalidator listo

TASK-825 cerró 2026-05-12 con resolver canónico + cache TTL 60s + invalidator `__clearClientPortalResolverCache(orgId?)` exportado. Cuando esta task arranque:

- **Importar invalidator** desde `@/lib/client-portal/readers/native/module-resolver`. Cada command (`enable/pause/resume/expire/churn`) DEBE llamar `__clearClientPortalResolverCache(organizationId)` post-mutation atómicamente — staleness max 60s sin invalidation; con invalidation, próxima lectura es fresca instantánea.
- **Endpoint pattern** ya canonizado: clone shape de `src/app/api/client-portal/modules/route.ts` (5 estados HTTP: 401/401-degenerate/403/500-orgId/200/500-throws). Admin endpoints replicarán con tenant check distinto (`internal` o `admin` route group + capability granular).
- **Resolver expone `includePending=true` opt-in** que bypassea cache — admin UI lo usa para vista de assignments pendientes que aún no son visibles para el cliente.
- 5 estados HTTP canónicos + `captureWithDomain('client_portal', tags:{source:'api_endpoint', endpoint, stage}, extra:{organizationId})` pattern.

## Delta 2026-05-12 — TASK-824 cerrada, parity capabilities responsibility heredada

TASK-824 cerró el sustrato DB. Esta task hereda **responsabilidad explícita** de la parity test live `capabilities[]` TS↔DB:

- `client_portal.modules.capabilities[]` seed declara 12 capabilities forward-looking (`client_portal.creative_hub.read`, `client_portal.csc_pipeline.read`, `client_portal.brand_intelligence.read`, `client_portal.cvr.read`, `client_portal.cvr.export`, `client_portal.roi.read`, `client_portal.exports.generate`, `client_portal.assigned_team.read`, `client_portal.pulse.read`, `client_portal.staff_aug.read`, `client_portal.crm_command.read`, `client_portal.web_delivery.read`). Solo `client_portal.workspace` existe hoy en `entitlements-catalog`.
- Cuando esta task materialice las 12 capabilities en `src/config/entitlements-catalog.ts` + seed migration `greenhouse_core.capabilities_registry`, debe agregar parity test `src/lib/client-portal/capabilities/parity.{ts,test.ts,live.test.ts}` replicando shape canónico TASK-611 + patrón TASK-824 Slice 2.
- Comparator pattern: el seed `modules.capabilities[]` debe ⊆ del set de capability keys del catalog TS. Drift detection bloqueante.
- Spec V1.4 §5.5 documenta este contract.

## Summary

Implementa los 5 comandos canónicos write (enable/pause/resume/expire/churn module assignment), 7 capabilities granulares, audit log writer + 6 outbox events v1, y endpoints admin bajo `/api/admin/client-portal/*` con UI admin (`/admin/client-portal/organizations/[orgId]/modules` + `/admin/client-portal/catalog`).

## Why This Task Exists

Sin admin endpoints + UI, los assignments solo pueden crearse via cascade automático del lifecycle (TASK-828) — bien para casos felices, pero no cubre: vending manual de addon, pause/resume operativo, override por business_line mismatch, gestión del catálogo. EFEONCE_ADMIN necesita controles para gestionar el portal cliente como producto.

## Goal

- 5 comandos atómicos canónicos en `src/lib/client-portal/commands/`
- Audit log writer (`recordAssignmentEvent`) + 6 outbox events v1
- 7 capabilities granulares declaradas + seed migration `capabilities_registry` (TASK-840 invariant) + **parity test live TS↔DB**
- 6 endpoints HTTP admin bajo `/api/admin/client-portal/*` (era 7; eliminado catalog write V1.0 — POST + PUT diferidos a V1.1 con feature flag)
- 2 surfaces UI admin: per-organization modules (read + 5 actions), catalog (**read-only V1.0**)
- Tests integration capability + idempotency + audit + parity
- Cache invalidation desde commands → resolver fresh inmediato (TASK-825 `__clearClientPortalResolverCache(orgId)`)
- Custom assertion functions (`ClientPortalValidationError` + asserts) — **NO Zod** (CLAUDE.md / greenhouse-backend skill canónico)
- Auth pattern: `requireAdminTenantContext()` + `can()` doble gate (admin endpoints canónico, NO `requireServerSession`)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §7 (Commands), §8 (Capabilities), §9 (API), §10 (Outbox), §16 (Hard Rules) — V1.4 vigente
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — pattern capabilities + `capabilities_registry` seed
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` — fuente de `org.businessLine` canónico via `service_modules.module_code WHERE module_kind='business_line'`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (extender con 6 events nuevos)
- `CLAUDE.md` sección "Admin Center Entitlement Governance" línea 73 — doble gate canónico
- Patrones canonizados que se replican:
  - **TASK-839 Admin Center Entitlement Governance** — `requireAdminTenantContext + can()` doble gate + audit + outbox + transaction única
  - **TASK-848 Production Release Control Plane** — 3 capabilities granulares least-privilege + reason >=20 char patrón
  - **TASK-840 Deprecated Capabilities Discipline** — seed migration `capabilities_registry` paralela al TS catalog
  - **TASK-771/773 outbox + reactive consumer** — `publishOutboxEvent(event, tx)` en misma tx
  - **TASK-611 capabilities_registry parity** — `parity.{ts,live.test.ts}` shape canónico
  - **TASK-finance custom error pattern** (`FinanceValidationError + assertNonEmptyString`) — `src/lib/finance/shared.ts:47-181`

Reglas obligatorias:

- Comandos atomic via `withTransaction` (Kysely transaction); `publishOutboxEvent(event, tx)` en la misma tx
- Idempotency: si existe assignment activo con mismo `(organization_id, module_key, status)`, devolver el existente (UNIQUE partial active enforce a nivel DB; código returns existing)
- Audit append-only en cada cambio (`module_assignment_events` con triggers anti-UPDATE/DELETE TASK-824)
- Outbox events v1 con `payload_json.version=1` y `eventType` declarado en EVENT_CATALOG
- Reason redacted via `redactSensitive` en logs; persistido raw en audit (que es seguro porque triggers anti-mutation)
- Capability granular per acción (7 capabilities — ver §8 spec V1.4)
- Override `business_line_default` SOLO EFEONCE_ADMIN + reason ≥ 20 chars + audit row + reliability signal anomaly rate (TASK-829)
- Cache invalidation: cada command llama `__clearClientPortalResolverCache(input.organizationId)` post-tx atómico (si tx falla, no se invalida)
- **Auth pattern canónico** (admin endpoints): `requireAdminTenantContext()` doble gate (broad: route_group=admin AND role=EFEONCE_ADMIN) + `can(tenant, capability, action, 'tenant')` granular (least privilege per-action)
- **NO Zod**: usar `ClientPortalValidationError` + assertion functions custom (pattern TASK-finance)
- **Column vs capability naming** (V1.4 §3.1 reconciliación):
  - DB column + code: `applicability_scope` / `applicabilityScope` (no business_line — TASK-824 V1.4 rename para no duplicar enum 360)
  - Capability + signal names: preservan `business_line` (concepto operator-facing): `client_portal.module.override_business_line_default`, signal `assignment.business_line_mismatch`
  - Helper canónico para resolver `org.businessLine`: `resolveOrganizationCanonicalBusinessLine(orgId, tx)` lee `service_modules.module_code WHERE module_kind='business_line'` (TASK-016 + Bow-tie)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §7-§10
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Dependencies & Impact

### Depends on

- TASK-825 (resolver + cache invalidator)
- TASK-824 (tablas)
- Capability platform (TASK-403) ✅
- `redactSensitive`, `captureWithDomain`, `redactErrorForResponse` ✅

### Blocks / Impacts

- TASK-827 (UI cliente puede asumir admin enabled state)
- TASK-828 (cascade reactive consumer invoca `enableClientPortalModule` directo)

### Files owned

**Commands + helpers (Slice 1-4)**:

- `src/lib/client-portal/commands/errors.ts` — `ClientPortalValidationError` + `BusinessLineMismatchError` + assertion functions custom (NO Zod)
- `src/lib/client-portal/commands/audit.ts` — `recordAssignmentEvent({assignmentId, eventKind, fromStatus?, toStatus?, payload, actorUserId}, client)` helper canónico
- `src/lib/client-portal/commands/enable-module.ts` — `enableClientPortalModule`
- `src/lib/client-portal/commands/pause-resume.ts` — `pauseClientPortalModule` + `resumeClientPortalModule`
- `src/lib/client-portal/commands/expire-churn.ts` — `expireClientPortalModule` + `churnClientPortalModule`
- `src/lib/client-portal/commands/resolve-org-business-line.ts` — helper `resolveOrganizationCanonicalBusinessLine(orgId, tx)` (lee `service_modules` TASK-016)
- `src/lib/client-portal/commands/__tests__/*.test.ts` — unit tests por command + audit + resolver-org-bl

**Capabilities + parity (Slice 5)**:

- `src/config/entitlements-catalog.ts` — extender con 7 capabilities `client_portal.module.*` + `client_portal.catalog.manage`
- `migrations/<ts>_task-826-client-portal-capabilities-seed.sql` — seed 7 capabilities en `greenhouse_core.capabilities_registry` (TASK-840 invariant) + bloque DO anti-pre-up-marker
- `src/lib/client-portal/capabilities/parity.ts` — helper canónico (mirror TASK-611) que valida seed `modules.capabilities[]` ⊆ entitlements-catalog
- `src/lib/client-portal/capabilities/parity.test.ts` — unit tests con fixtures (sin PG)
- `src/lib/client-portal/capabilities/parity.live.test.ts` — live PG test con `describe.skipIf(!hasPgConfig)`

**Endpoints (Slice 6) — 6 endpoints V1.0**:

- `src/app/api/admin/client-portal/organizations/[organizationId]/modules/route.ts` — GET listing + POST enable
- `src/app/api/admin/client-portal/assignments/[assignmentId]/route.ts` — PATCH (pause/resume/expire) + DELETE (churn)
- `src/app/api/admin/client-portal/catalog/route.ts` — GET only V1.0 (POST diferido V1.1)
- `src/app/api/admin/client-portal/__tests__/*.test.ts` — endpoint integration tests

**UI Admin (Slice 7)**:

- `src/app/(dashboard)/admin/client-portal/organizations/[organizationId]/modules/page.tsx` — listing + 5 actions
- `src/app/(dashboard)/admin/client-portal/catalog/page.tsx` — read-only listing V1.0
- `src/views/greenhouse/admin/client-portal/AssignmentsView.tsx`
- `src/views/greenhouse/admin/client-portal/CatalogView.tsx` — read-only V1.0

**Docs at cierre**:

- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — Delta con 6 events `client.portal.*` v1

NO se crean V1.0 (diferidos V1.1):

- ~~`src/app/api/admin/client-portal/catalog/route.ts (POST)`~~ — V1.1 con feature flag (catalog mutations queda solo via migration en V1.0)
- ~~`src/app/api/admin/client-portal/catalog/[moduleKey]/route.ts (PUT effective_to)`~~ — V1.1 (deprecación de módulos via migration en V1.0)

## Current Repo State

### Already exists

- TASK-825 produce resolver + cache + helpers
- TASK-824 produce tablas
- Capability platform
- Helper canonical para outbox events (TASK-771/773 patterns)
- Admin UI patterns (TASK-720/766/772)

### Gap

- No existen comandos write
- No existen capabilities client_portal.module.*
- No existen endpoints admin
- No existe UI admin

## Scope

### Slice 1 — Errors + audit log writer + outbox events declaration

- `src/lib/client-portal/commands/errors.ts`: `ClientPortalValidationError extends Error` (`statusCode`, `details`), `BusinessLineMismatchError extends ClientPortalValidationError`, assertion functions del dominio (`assertNonEmptyOrganizationId`, `assertValidModuleKey`, `assertReason20Plus`, etc.)
- `src/lib/client-portal/commands/audit.ts`: `recordAssignmentEvent({assignmentId, eventKind, fromStatus?, toStatus?, payload, actorUserId}, client)` — INSERT en `module_assignment_events` via Kysely client (acepta tx)
- `src/lib/client-portal/commands/resolve-org-business-line.ts`: `resolveOrganizationCanonicalBusinessLine(orgId, tx)` lee `service_modules.module_code WHERE module_kind='business_line'` (TASK-016). Throws si emerge multi-BL org (V1.0 no soporta auto-pick first).
- Extender `EVENT_CATALOG_V1.md` Delta con 6 events:
  - `client.portal.module.assignment.created` v1
  - `client.portal.module.assignment.status_changed` v1
  - `client.portal.module.assignment.churned` v1
  - `client.portal.catalog.module.declared` v1
  - `client.portal.catalog.module.deprecated` v1
  - `client.portal.migration.legacy_backfill.completed` v1 (TASK-829 emit, declarado acá)

### Slice 2 — `enableClientPortalModule` command

- Atomic tx (Kysely):
  1. Idempotency check: existing active assignment con mismo `(organization_id, module_key)` y mismo target status → return existing
  2. Fetch módulo activo del catálogo (`m.effective_to IS NULL`) — throw si no existe
  3. Resolver `org.businessLine` canónico via helper
  4. Validar `module.applicabilityScope !== 'cross' && module.applicabilityScope !== org.businessLine` → si mismatch, requiere `overrideBusinessLineMismatch=true` + `overrideReason.length >= 20` + capability `client_portal.module.override_business_line_default` (EFEONCE_ADMIN solo)
  5. INSERT assignment con `assignment_id='cpma-{uuid}'`
  6. `recordAssignmentEvent({eventKind:'enabled', toStatus, payload:{...}, actorUserId}, tx)`
  7. `publishOutboxEvent({eventType:'client.portal.module.assignment.created', payload:{version:1, ...}}, tx)`
- Post-tx atómico: `__clearClientPortalResolverCache(input.organizationId)` (si tx falló, no se llega — no efecto fantasma)
- Tests: idempotency dual-call, business_line mismatch + override path, FK violations

### Slice 3 — `pauseClientPortalModule` / `resumeClientPortalModule`

- Status transitions: `active → paused` / `paused → active`. Atomic tx similar.
- Audit `status_changed` v1 + outbox correspondiente
- Cache invalidation post-tx
- Tests: state machine enforce (paused→paused no permitido sin error claro; resume sin paused throws)

### Slice 4 — `expireClientPortalModule` / `churnClientPortalModule`

- `expire`: SET `effective_to=hoy, status='expired'` (pilot timeout o terminate operativo)
- `churn`: SET `effective_to=hoy, status='churned'` (post-offboarding, terminal definitivo)
- Audit + outbox `status_changed` v1 + outbox `churned` v1 (churn-specific)
- Cache invalidation
- Tests: terminal status no re-activable; churn solo emite event `churned`

### Slice 5 — Capabilities + parity test

- Extender `src/config/entitlements-catalog.ts` con **7 capabilities granulares** (per spec V1.4 §8):
  - `client_portal.module.read_assignment` (commercial, finance, operations, EFEONCE_ADMIN)
  - `client_portal.module.enable` (commercial_admin, EFEONCE_ADMIN)
  - `client_portal.module.disable` (commercial_admin, EFEONCE_ADMIN)
  - `client_portal.module.pause` (commercial, finance_admin, EFEONCE_ADMIN)
  - `client_portal.module.override_business_line_default` (EFEONCE_ADMIN solo) — **preserva nombre concept-level**, NO se renombra a `applicability_scope`
  - `client_portal.catalog.manage` (EFEONCE_ADMIN solo)
  - `client_portal.assignment.migrate_legacy` (EFEONCE_ADMIN solo, TASK-829 backfill)
- Migration `task-826-client-portal-capabilities-seed.sql`: INSERT 7 rows en `greenhouse_core.capabilities_registry` + bloque DO anti pre-up-marker (TASK-838 pattern)
- **Parity test live TS↔DB** en `src/lib/client-portal/capabilities/parity.{ts,test.ts,live.test.ts}` (mirror TASK-611 + TASK-824 Slice 2):
  - Compara TS catalog (`ENTITLEMENT_CAPABILITY_CATALOG`) vs DB seed (`capabilities_registry`) para todas las `client_portal.*` keys
  - **Adicionalmente**: valida que seed `modules.capabilities[]` (TASK-824) ⊆ TS catalog keys (drift detection bloqueante)

### Slice 6 — Endpoints HTTP admin (6 endpoints V1.0)

Auth pattern canónico (clone TASK-839/TASK-848 mirror):

```ts
const { tenant, errorResponse } = await requireAdminTenantContext()
if (!tenant) return errorResponse
if (!can(tenant, 'client_portal.module.enable', 'create', 'tenant')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

Endpoints:

- `GET /api/admin/client-portal/organizations/[organizationId]/modules` — listing assignments + history (capability `read_assignment`)
- `POST /api/admin/client-portal/organizations/[organizationId]/modules` — enable módulo (capability `enable`, body validation custom)
- `PATCH /api/admin/client-portal/assignments/[assignmentId]` — pause/resume/expire (capability per target status)
- `DELETE /api/admin/client-portal/assignments/[assignmentId]` — churn (capability `disable`; sets effective_to atomic)
- `GET /api/admin/client-portal/catalog` — read-only listing (capability `catalog.manage` o roles broad). **V1.0 SIN POST/PUT** (V1.1 con feature flag).

Errors: `redactErrorForResponse` envuelto en `NextResponse.json({error, detail}, {status})`. `captureWithDomain(err, 'client_portal', {tags:{source:'api_endpoint', endpoint, stage}, extra:{organizationId, assignmentId?}})`.

### Slice 7 — UI Admin (Vuexy + microcopy via greenhouse-ux-writing)

- `/admin/client-portal/organizations/[organizationId]/modules` — listing + 5 row actions (enable/pause/resume/expire/churn) + dialog para override business_line mismatch (reason >= 20 chars)
- `/admin/client-portal/catalog` — **read-only V1.0** listing 10 seed modules + filtros applicability_scope/tier
- Vuexy primitives + tokens-only (GH_COLORS + DM Sans + Tabler icons)
- Microcopy via skill `greenhouse-ux-writing` (lint `greenhouse/no-untokenized-copy` activa)
- DESIGN.md CI gate verde

### Slice 8 — Tests integration end-to-end

- Capability gating: enable sin capability → 403 inmediato (broad gate de `requireAdminTenantContext`); con capability incorrecta → 403 granular de `can()`
- Idempotency: doble enable mismo (org, module, status) → mismo assignment_id, no duplicate insert
- Business_line override: mismatch sin override capability → 403; con capability + reason >= 20 → 200 + audit row con override stamp + outbox v1
- Cache invalidation: enable → resolver TASK-825 inmediato refleja (no esperar TTL)
- Audit append-only enforced: UPDATE en `module_assignment_events` → trigger PG falla con mensaje canónico
- Catalog read-only: UI catalog NO expone botones POST/PUT (V1.0)
- Parity test live verde: seed `modules.capabilities[]` ⊆ TS catalog post-Slice-5 migration

NOTA: 8 slices (era 7); split del original Slice 5 "Capabilities + endpoints" en Slice 5 (capabilities + parity) + Slice 6 (endpoints) para slices más atómicos y commit-able individualmente.

## Out of Scope

- Cliente self-service enable — V1.1
- Pricing automation — V1.1
- Composition layer UI cliente — TASK-827
- Cascade reactive consumer — TASK-828
- Reliability signals — TASK-829

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.4 §7 + §8. Patrón canónico V1.1 (post-verdict):

```ts
// src/lib/client-portal/commands/enable-module.ts
import { randomUUID } from 'crypto'

import { withTransaction } from '@/lib/db'
import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { publishOutboxEvent } from '@/lib/sync/publish-event'

import { BusinessLineMismatchError, ClientPortalValidationError, assertReason20Plus } from './errors'
import { recordAssignmentEvent } from './audit'
import { resolveOrganizationCanonicalBusinessLine } from './resolve-org-business-line'

import type { AssignmentSource, ResolvedAssignmentStatus } from '@/lib/client-portal/dto/module'

export interface EnableClientPortalModuleInput {
  readonly organizationId: string
  readonly moduleKey: string
  readonly status?: ResolvedAssignmentStatus // default 'active'; 'pilot' requires expiresAt
  readonly source: AssignmentSource
  readonly sourceRefJson?: Record<string, unknown>
  readonly effectiveFrom: string
  readonly expiresAt?: string
  readonly approvedByUserId: string
  readonly reason?: string
  readonly overrideBusinessLineMismatch?: boolean
  readonly overrideReason?: string
}

export const enableClientPortalModule = async (
  input: EnableClientPortalModuleInput
): Promise<{ readonly assignmentId: string; readonly status: ResolvedAssignmentStatus }> => {
  // CHECK constraint mirror (DB enforce + early validation)
  const targetStatus = input.status ?? 'active'
  if (targetStatus === 'pilot' && !input.expiresAt) {
    throw new ClientPortalValidationError(
      'pilot status requires expiresAt',
      400,
      { moduleKey: input.moduleKey }
    )
  }

  const result = await withTransaction(async (tx) => {
    // 1. Idempotency check: existing active assignment con mismo target status
    const existing = await tx
      .selectFrom('greenhouse_client_portal.module_assignments')
      .selectAll()
      .where('organization_id', '=', input.organizationId)
      .where('module_key', '=', input.moduleKey)
      .where('effective_to', 'is', null)
      .executeTakeFirst()

    if (existing && existing.status === targetStatus) {
      return {
        assignmentId: existing.assignment_id,
        status: existing.status as ResolvedAssignmentStatus
      }
    }

    if (existing) {
      // Existe activo pero con status distinto → operador debe usar
      // pause/resume/expire en lugar de enable nuevamente
      throw new ClientPortalValidationError(
        `Assignment already active with status='${existing.status}'; use pause/resume/expire commands instead`,
        409,
        { existingAssignmentId: existing.assignment_id }
      )
    }

    // 2. Fetch módulo activo del catálogo
    const module = await tx
      .selectFrom('greenhouse_client_portal.modules')
      .select(['module_key', 'applicability_scope', 'tier'])
      .where('module_key', '=', input.moduleKey)
      .where('effective_to', 'is', null)
      .executeTakeFirst()

    if (!module) {
      throw new ClientPortalValidationError(
        `Module '${input.moduleKey}' not found or deprecated`,
        404
      )
    }

    // 3. Validate applicability_scope vs organization canonical business_line
    //    'cross' es metavalue aplicable-a-múltiples (no requiere match).
    //    org.businessLine canónico viene de service_modules.module_code WHERE
    //    module_kind='business_line' (TASK-016 + Bow-tie).
    if (module.applicability_scope !== 'cross') {
      const orgBusinessLine = await resolveOrganizationCanonicalBusinessLine(input.organizationId, tx)

      if (module.applicability_scope !== orgBusinessLine) {
        if (
          !input.overrideBusinessLineMismatch ||
          !input.overrideReason ||
          input.overrideReason.length < 20
        ) {
          throw new BusinessLineMismatchError(
            `Module applicability_scope='${module.applicability_scope}' does not match organization business_line='${orgBusinessLine}'. Override requires overrideBusinessLineMismatch=true + overrideReason >=20 chars + capability client_portal.module.override_business_line_default.`,
            403,
            {
              moduleApplicabilityScope: module.applicability_scope,
              orgBusinessLine
            }
          )
        }

        // Validate reason format (assertion ya verificó length, pero double-check trim)
        assertReason20Plus(input.overrideReason, 'overrideReason')
      }
    }

    // 4. INSERT assignment + audit + outbox (atomic en tx)
    const assignmentId = `cpma-${randomUUID()}`

    await tx
      .insertInto('greenhouse_client_portal.module_assignments')
      .values({
        assignment_id: assignmentId,
        organization_id: input.organizationId,
        module_key: input.moduleKey,
        status: targetStatus,
        source: input.source,
        source_ref_json: input.sourceRefJson ?? {},
        effective_from: input.effectiveFrom,
        expires_at: input.expiresAt ?? null,
        approved_by_user_id: input.approvedByUserId,
        approved_at: new Date().toISOString()
      })
      .execute()

    await recordAssignmentEvent(
      {
        assignmentId,
        eventKind: 'enabled',
        toStatus: targetStatus,
        actorUserId: input.approvedByUserId,
        payload: {
          source: input.source,
          sourceRefJson: input.sourceRefJson,
          reason: input.reason,
          overrideBusinessLineMismatch: input.overrideBusinessLineMismatch,
          overrideReason: input.overrideReason
        }
      },
      tx
    )

    await publishOutboxEvent(
      {
        aggregateType: 'client_portal_module_assignment',
        aggregateId: assignmentId,
        eventType: 'client.portal.module.assignment.created',
        payload: {
          version: 1,
          assignmentId,
          organizationId: input.organizationId,
          moduleKey: input.moduleKey,
          status: targetStatus,
          source: input.source,
          effectiveFrom: input.effectiveFrom,
          expiresAt: input.expiresAt ?? null
        }
      },
      tx
    )

    return { assignmentId, status: targetStatus }
  })

  // 5. Post-tx atomic: invalidate resolver cache scoped al cliente
  //    Si la tx PG falló, no se llega aquí — no efecto fantasma.
  __clearClientPortalResolverCache(input.organizationId)

  return result
}
```

Endpoint pattern (mirror TASK-839 Admin Center governance — `requireAdminTenantContext + can()` doble gate):

```ts
// src/app/api/admin/client-portal/organizations/[organizationId]/modules/route.ts
import { NextResponse } from 'next/server'

import { enableClientPortalModule } from '@/lib/client-portal/commands/enable-module'
import { ClientPortalValidationError } from '@/lib/client-portal/commands/errors'
import { can } from '@/lib/entitlements/runtime'
import { captureWithDomain } from '@/lib/observability/capture'
import { redactErrorForResponse } from '@/lib/observability/redact'
import { requireAdminTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

export const POST = async (
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) => {
  const { tenant, errorResponse } = await requireAdminTenantContext()
  if (!tenant) return errorResponse

  if (!can(tenant, 'client_portal.module.enable', 'create', 'tenant')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { organizationId } = await params

  try {
    const body = (await request.json()) as Record<string, unknown>

    // Custom assertion functions — NO Zod (per CLAUDE.md / greenhouse-backend skill)
    const result = await enableClientPortalModule({
      organizationId,
      moduleKey: assertNonEmptyString(body.moduleKey, 'moduleKey'),
      // ... otras assertions
      approvedByUserId: tenant.userId
    })

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof ClientPortalValidationError) {
      return NextResponse.json(
        { error: err.message, details: err.details ?? null },
        { status: err.statusCode }
      )
    }

    captureWithDomain(err, 'client_portal', {
      tags: { source: 'api_endpoint', endpoint: 'admin_enable_module' },
      extra: { organizationId }
    })

    return NextResponse.json(
      { error: 'Unable to enable module', detail: redactErrorForResponse(err) },
      { status: 500 }
    )
  }
}
```

Notas del pattern:

- **`requireAdminTenantContext` doble gate** — broad (route_group=admin AND role=EFEONCE_ADMIN) + `can()` granular per-action. Cliente/operations sessions reciben 403 inmediato del broad gate (defense-in-depth + perf).
- **Custom assertion functions + `ClientPortalValidationError`** — NO Zod. Catch del handler diferencia entre validation errors (return JSON con statusCode del error) y runtime errors (capture + 500 con sanitización).
- **`publishOutboxEvent(event, tx)`** en la misma tx que la mutación — el event no se publica si la mutación falla.
- **Cache invalidation post-tx** — `__clearClientPortalResolverCache(input.organizationId)` se ejecuta solo si la tx commiteó. Pattern atómico canonizado en TASK-825.
- **Idempotency vía UNIQUE partial active** — la DB enforce que solo puede haber 1 assignment activo per `(organization_id, module_key)`; el código returns existing si match exacto del target status, o throws 409 si status distinto (operador debe usar pause/resume/expire).
- **Capability `override_business_line_default`** — preserva el nombre concept-level (V1.4 §3.1 reconciliación: column rename a `applicability_scope` pero capability/signal names preservan "business_line" como concepto operator-facing).

## Acceptance Criteria

- [ ] 5 comandos atómicos exportados (`enableClientPortalModule`, `pauseClientPortalModule`, `resumeClientPortalModule`, `expireClientPortalModule`, `churnClientPortalModule`)
- [ ] `recordAssignmentEvent` helper canónico con `client?` opcional (Kysely tx)
- [ ] `resolveOrganizationCanonicalBusinessLine(orgId, tx)` lee `service_modules.module_code WHERE module_kind='business_line'` (TASK-016 canonical). Throws explicit si multi-BL org
- [ ] `ClientPortalValidationError + BusinessLineMismatchError + assertion functions` custom (NO Zod)
- [ ] 7 capabilities granulares declaradas en `entitlements-catalog` TS + seed migration en `capabilities_registry` (TASK-840 invariant)
- [ ] **Parity test live TS↔DB verde** — capabilities + seed `modules.capabilities[]` ⊆ TS catalog (drift detection bloqueante; `src/lib/client-portal/capabilities/parity.live.test.ts`)
- [ ] 6 endpoints HTTP funcionando bajo `/api/admin/client-portal/*` (era 7 — eliminado catalog POST/PUT V1.0)
- [ ] **Auth pattern canónico** `requireAdminTenantContext()` + `can()` doble gate en los 6 endpoints (NO `requireServerSession`)
- [ ] 6 outbox events v1 declarados en EVENT_CATALOG (`client.portal.module.assignment.{created,status_changed,churned}` + `client.portal.catalog.module.{declared,deprecated}` + `client.portal.migration.legacy_backfill.completed`)
- [ ] Idempotency tested: doble enable mismo `(org, module, status)` → mismo assignment_id; enable cuando existe activo con status distinto → 409 con `existingAssignmentId` en details
- [ ] Business_line override require capability `client_portal.module.override_business_line_default` (EFEONCE_ADMIN solo) + reason ≥ 20 chars + audit row con stamp
- [ ] Cache invalidation post-tx funciona — enable → resolver TASK-825 inmediato refleja (no esperar TTL 60s); si tx falla, no se invalida
- [ ] UI admin assignments en `/admin/client-portal/organizations/[orgId]/modules` con 5 row actions
- [ ] UI catalog en `/admin/client-portal/catalog` — **read-only V1.0** (UI NO expone botones create/edit)
- [ ] Errors sanitizados (sin stack, sin secrets, sin env vars) via `redactErrorForResponse`
- [ ] Audit append-only enforced — UPDATE en `module_assignment_events` → trigger PG falla con mensaje canónico
- [ ] Catalog append-only enforced — UPDATE en `modules.applicability_scope` (V1.4 column) → trigger PG falla
- [ ] **Column vs capability naming** verificado: código accede `module.applicabilityScope` (NO `business_line`); capability/signal names preservan `business_line` concept (V1.4 §3.1 reconciliación)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/client-portal src/app/api/admin/client-portal` verde
- [ ] DESIGN.md CI gate verde (UI Slice 7 agregada)
- [ ] Grep negativos canónicos limpios: 0 `Zod` refs en TASK files, 0 `requireServerSession` en endpoints admin, 0 `module.business_line` en código (solo `module.applicabilityScope`)

## Verification

- `pnpm lint` (incluye `greenhouse/no-untokenized-copy` para UI microcopy)
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-portal/commands src/lib/client-portal/capabilities src/app/api/admin/client-portal`
- `pnpm migrate:status` confirma seed migration aplicada
- Smoke staging: enable módulo addon a cliente test → verify resolver `/api/client-portal/modules` refleja → verify outbox event en `greenhouse_sync.outbox_events` < 5min via reactive consumer
- Parity test live: `pnpm test src/lib/client-portal/capabilities/parity.live.test.ts` verde con PG config (cierra inheritance TASK-824 Delta)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (complete)
- [ ] Archivo en carpeta correcta (complete/)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con cierre + Deltas cruzados
- [ ] `changelog.md` actualizado con 7 capabilities introducidas + 6 outbox events nuevos
- [ ] `EVENT_CATALOG_V1.md` Delta agregado (6 events nuevos)
- [ ] `CLAUDE.md` Delta si emerge invariante nueva (probablemente NO — pattern ya canonizado en TASK-822/823/824/825/839)
- [ ] Chequeo cruzado: TASK-827 (UI cliente puede asumir admin enable funcional), TASK-828 (cascade consumer invoca `enableClientPortalModule`/`churnClientPortalModule` directo), TASK-829 (reliability signals incluyen override anomaly rate)

## Follow-ups

- **V1.1 — Self-service request flow**: cliente solicita addon desde UI cliente → outbox event → notification a EFEONCE_ADMIN → approval workflow → invoca `enableClientPortalModule`
- **V1.1 — Pricing engine integration**: enable de tier addon dispara line item en finance billing
- **V1.1 — Catalog mutations UI**: POST + PUT endpoints + UI write con feature flag (eliminados V1.0)
- **V1.1 — Multi-BL org handling**: cuando emerja la primera org con múltiples business_lines activos, resolver `resolveOrganizationCanonicalBusinessLine` requiere choice explícita (V1.0 throws)
- **V1.1 — OpenAPI doc** para namespace `/api/admin/client-portal/*`
- **V1.2 — Second-signature pending_approval** para `override_business_line_default` (TASK-839 pattern) si emerge anomaly rate alto (TASK-829 signal)

## Open Questions

- (Resuelta por verdict v1.1) ~~Catalog UI permite create desde UI o solo via migration~~ → **V1.0 read-only via UI** + create via migration solamente. POST + PUT endpoints diferidos a V1.1 con feature flag. Reduce scope 2 endpoints (era 7, ahora 6). Consistente con append-only trigger TASK-824.
- (Resuelta por verdict v1.1) ~~Pause sin reason permitido~~ → reason opcional pero recomendado. Sin reason: audit row con `reason='paused_no_reason_provided'` (placeholder honesto). Reliability signal V1.1 podría detectar high rate como anomalía.
- (Resuelta por verdict v1.1) **`org.businessLine` resolver**: helper canónico `resolveOrganizationCanonicalBusinessLine(orgId, tx)` lee `service_modules.module_code WHERE module_kind='business_line'` (TASK-016 + Bow-tie). Multi-BL orgs (multi-business-line clients) → throws explicit V1.0 (NO auto-pick first). V1.1 introducirá choice explícita.
- (Heredada de TASK-824 Delta) **Parity test capabilities[]**: ESTA task lo entrega (Slice 5). Mirror TASK-611 + TASK-824 Slice 2 shape.
