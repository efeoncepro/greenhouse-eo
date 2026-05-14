# TASK-828 — Client Portal Cascade from Client Lifecycle V1

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto` (revisado 2026-05-13 tras arch-architect review — +Slice 0 + Slice 1 ampliado + runbook stub)
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseño con review arch-architect aplicado (2026-05-13). Bloqueado real por TASK-820 que sigue en to-do/. TASK-824/825/826 cerradas 2026-05-12.`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by:
  - `TASK-820` (todavía en `to-do/` — emite `client.lifecycle.case.completed` + cascade `instantiateClientForParty`). Sin TASK-820 Slice de emisión, el consumer de esta task no dispara nunca.
  - `TASK-826 follow-up` consolidado dentro de esta task como **Slice 0** (listActiveAssignmentsForOrganization reader nunca shipó).
- Branch: `task/TASK-828-client-portal-cascade`

## Delta 2026-05-13 — arch-architect review + decisiones canonizadas

Review arquitectónica completa (skill `arch-architect`, 4-pillar contract aplicada). 2 bloqueos reales + 6 gaps detectados; los 5 que requerían decisión humana se resolvieron así y se reflejan en Scope/Open Questions/Detailed Spec abajo:

### G-1 — Race con TASK-820 cascade sobre el mismo evento → **Opción (A): instantiate inline**

Ambos consumers (TASK-820 instantiate + TASK-828 modules) escuchan `client.lifecycle.case.completed`. El registry no garantiza orden y un `skip` por `client_id IS NULL` se marca `skipped` en `outbox_reactive_log` y NUNCA reintenta — el cliente quedaría sin modules para siempre.

**Decisión**: TASK-820 ejecuta `instantiateClientForParty` **inline dentro de `resolveLifecycleCase`** (misma tx PG, antes de `publishOutboxEvent('client.lifecycle.case.completed')`). El evento se emite POST-instantiation. Para TASK-828 esto implica:

- El cliente SIEMPRE existe cuando el consumer dispara → `client_id IS NULL` debe tratarse como **error duro** (re-raise), no skip silencioso. Si la invariante se rompe, dead_letter + signal escalan visible.
- Latencia tx `resolveLifecycleCase` +20-50ms estimada (single PG insert + audit row). Aceptable.
- Latencia ops: ahorra 5min del cron flush + elimina race por orden de consumers.

Acción dependiente sobre TASK-820: actualizar su Slice 1 para emitir el evento POST-instantiation, no antes. Coordinación cross-task.

### G-2 — `bundled_modules[]` vacío en commercial terms → **Audit + signal inmediato, NO skip silente**

Spec V1 §13 declara el signal `client_portal.assignment.lifecycle_module_drift` que dispara a los 14 días. Operador queda 2 semanas ciego ante el caso "completé onboarding pero el contrato no tenía bundle declarado".

**Decisión**: cuando `getBundledModulesForOrganization(orgId)` devuelva `[]` durante un cascade onboarding/reactivation:

1. `captureWithDomain(new Error('cascade_no_bundled_modules'), 'client_portal', { tags: {source: 'cascade_consumer', caseKind, caseId, orgId}, level: 'warning' })`
2. Persistir audit row en `module_assignment_events` con `event_kind='cascade_skipped_no_bundled'` (extender enum si necesario; coordinar con TASK-826 audit table — si requiere migration, sumarla a Slice 0).
3. Retornar `{ status: 'completed', materialized: 0, reason: 'no_bundled_modules' }` (es un completion legítimo con 0 efectos, no skip).
4. Reliability signal **nuevo** `client_portal.cascade.no_bundled_modules` (kind=drift, severity=warning, steady=0): cuenta audit rows con `event_kind='cascade_skipped_no_bundled'` últimos 7 días. Detect inmediato, complementa el signal lifecycle_module_drift de 14d.

### G-3 — Filtrado de `bundled_modules[]` contra catálogo activo → **Filter upstream en `getBundledModulesForOrganization`**

Si un `module_key` quedó en commercial terms pero el catálogo lo deprecó (`modules.effective_to IS NOT NULL`), el loop del consumer truena en `enableClientPortalModule (404 module_not_found)` — los primeros N módulos quedan enabled, los restantes no, dead_letter del evento aunque la mayoría se materializó.

**Decisión**: el filtrado contra catálogo **vive en `getBundledModulesForOrganization`**, no en el consumer. El helper JOIN-ea contra `greenhouse_client_portal.modules WHERE effective_to IS NULL` y descarta deprecated/desconocidos. Esta decisión es coherente con el Delta TASK-824 ("esta task DEBE implementar validación lógica al INSERT/UPDATE de `bundled_modules` … cada string debe matchear un `modules.module_key` activo") y aterriza el reliability signal que el Delta menciona.

Reliability signal **nuevo** `client_portal.commercial_terms.unknown_bundled_module` (kind=drift, severity=error si > 0, steady=0): query a `engagement_commercial_terms WHERE effective_to IS NULL` cruzado con `modules WHERE effective_to IS NULL`, cuenta strings en `bundled_modules[]` que NO tienen módulo activo. Detecta drift TS↔DB upstream antes de que el cascade lo descubra.

Consumer asume que todo `moduleKey` recibido del helper es válido. Si el assignment falla por algún motivo distinto (PG transient error), eso es per-module dead_letter via retries normales del registry.

### G-4 — Walk `organization_id → spaces → services → terms` defensive

Edge cases declarados:

- `spaces.organization_id IS NULL` (orgs huérfanas pre-canonical): caen del WHERE, helper devuelve `[]` → cae en G-2 handling.
- Múltiples services del mismo org con `bundled_modules[]` parcialmente solapados: `UNNEST + DISTINCT` antes del filtrado contra catálogo.
- Org SIN services activos: `[]` → G-2 handling.

SQL canónico declarado en Slice 1 Detailed Spec abajo.

### G-5 — `sourceRefJson` expandido para forensic completo

Pseudocode V1.0 inicial pasaba solo `{caseId, previousCaseId}`. Insuficiente para responder "¿por qué tengo module X?" sin un JOIN extra. **Decisión** schema canónico V1.0:

```ts
sourceRefJson: {
  caseId: string                     // FK lifecycle case
  caseKind: 'onboarding' | 'reactivation' | 'offboarding'
  effectiveDate: string              // ISO date del case
  previousCaseId: string | null      // solo reactivation
  commercialTermsIds: string[]       // todos los terms que aportaron bundled_modules
  cascadeRunAt: string               // ISO timestamp consumer fire
}
```

Este schema vive como TypeScript interface canónica en `src/lib/client-portal/cascade/types.ts` para que cualquier downstream (admin UI, BQ projection futura) pueda parsear sin reverse-engineering.

### G-6 — Tests cross-tenant isolation explícitos

Slice 5 ampliado con test obligatorio: 2 orgs (A, B) con services y bundled_modules disjuntos, onboarding A → assert B sin cambios, offboarding A → assert B sin cambios. Sin esto un bug en el `WHERE sp.organization_id = $1` puede churnear cross-tenant (caso análogo: bug Notion sync Efeonce↔Sky).

### Reactivation V1.0 semantics — **solo bundled actuales** (no smart restore)

Open question original confirmada: V1.0 trata reactivation como "fresh onboarding contra terms reactivados" (`getBundledModulesForOrganization` lee terms actuales). Terms pueden haber cambiado entre offboarding y reactivation; el cliente recibe los modules del contrato vigente, NO el snapshot pre-offboarding. Smart restore desde `previous_case_id` queda V1.1.

### Runbook recovery — **stub mínimo en este TASK**, detalle en TASK-829

Acceptance criteria sumado: crear `docs/operations/runbooks/client-portal-cascade-recovery.md` con 5 escenarios canónicos:

1. Dead_letter de un evento específico — cómo replay
2. Consumer reportó `partial` (módulos failed individualmente) — cómo recovery manual per-module
3. Cliente reclama "no veo module X" pero contract dice que sí — diagnóstico via audit + sourceRefJson
4. Operator quiere forzar re-cascade post-edit de `bundled_modules[]` mid-engagement — endpoint admin
5. Signal `cascade.no_bundled_modules` disparado — escalation comercial

TASK-829 expande este runbook a una sección completa con outputs reales del signal panel.

---

## Delta 2026-05-12 — TASK-826 cerrada, commands canónicos disponibles

TASK-826 cerró 2026-05-12 con 5 commands canónicos atomic-tx exportados desde `src/lib/client-portal/commands/`:

- `enableClientPortalModule({ organizationId, moduleKey, source: 'lifecycle_case_provision', status: 'active' | 'pilot', effectiveFrom, expiresAt?, approvedByUserId, sourceRefJson, overrideBusinessLineMismatch?, overrideReason? })` — atomic tx PG con BL check, idempotency, audit, outbox v1, cache invalidation. **El reactive consumer debe llamar este helper directo**, NO componer su propia tx.
- `churnClientPortalModule({ assignmentId, actorUserId, reason, effectiveTo? })` — para módulos que dejan de aplicar post-lifecycle (cliente cambia tier/bundle).
- `expireClientPortalModule(...)` — para módulos pilot que expiran al cumplir milestone.
- `pauseClientPortalModule` / `resumeClientPortalModule` — disponibles si emerge necesidad de pause cascade (V1.0 NO usa).

**Outbox events v1 emitidos**: `client.portal.module.assignment.{created,paused,resumed,expired,churned}` — el reactive consumer consume `client.lifecycle.case.completed` (TASK-820) y produce events derivados via los commands.

**Capability del consumer**: el reactive consumer corre con identity sistema (no usuario operador). El audit log registra `actor_user_id='system_cascade'` o equivalente. NO requiere capability check porque corre fuera del request path (cron Cloud Run worker).

**Idempotency en cascade**: `enableClientPortalModule` detecta duplicate (same org+module activo) y retorna `idempotent=true` sin emit outbox. Reentries del cron NO duplican assignments — patrón TASK-773 reactive consumer canónico.

## Delta 2026-05-12 — TASK-825 cerrada, cache invalidation pattern canonizado

TASK-825 cerró 2026-05-12 con `__clearClientPortalResolverCache(orgId?)` invalidator exportado. Cuando esta task arranque (post-TASK-826 que entrega los commands):

- **Reactive consumer `client_portal_modules_from_lifecycle`** que escucha `client.lifecycle.case.completed` (TASK-820 outbox) y materializa/churn-ea assignments DEBE llamar `__clearClientPortalResolverCache(organizationId)` post-materialización para invalidar el cache scoped del cliente afectado. Sin invalidation, el resolver devuelve stale data por hasta 60s (TTL) — con invalidation, próxima lectura del cliente es fresca instantánea.
- **Pattern atómico**: invalidator es side-effect tras la mutación PG; si la mutación PG falla, no se invalida (no hay efecto fantasma). Si la invalidación falla por algún motivo extraño, el TTL 60s resuelve eventualmente.

## Delta 2026-05-12 — TASK-824 cerrada, columna bundled_modules disponible

TASK-824 cerró 2026-05-12 con ALTER `greenhouse_commercial.engagement_commercial_terms ADD COLUMN bundled_modules TEXT[] DEFAULT ARRAY[]::TEXT[]`. Cuando esta task arranque:

- La columna existe en runtime con default array vacío (backward compat 100%).
- Tipos Kysely regenerados cubren la columna.
- NO hay FK física `bundled_modules[]` → `modules.module_key` (cross-schema boundary, decisión spec V1 §5.4). Esta task DEBE implementar validación lógica al INSERT/UPDATE de `bundled_modules` (e.g. en el helper canónico para setear bundled_modules en commercial terms): cada string debe matchear un `modules.module_key` activo.
- Cuando emerja la primera surface que setea `bundled_modules`, considerar reliability signal `client_portal.commercial_terms.unknown_bundled_module` que detecte drift (filas en commercial_terms con `bundled_modules` que referencian module_keys inexistentes o ya en `effective_to IS NOT NULL`).

## Summary

Cierra el loop end-to-end Commercial → Lifecycle → Portal: implementa el reactive consumer `client_portal_modules_from_lifecycle` que escucha `client.lifecycle.case.completed` (TASK-820) y materializa/churn-ea assignments según `engagement_commercial_terms.bundled_modules[]`. Idempotent via `outbox_reactive_log`, dead_letter recovery, tests E2E del flow completo.

## Why This Task Exists

Sin cascade, los assignments solo se crean manualmente — los slices 1-6 entregan infraestructura pero no entregan automatización. El flow canónico es: contrato comercial declara `bundled_modules[]` → onboarding case completa → cascade reactive consumer materializa assignments → portal cliente compuesto. Sin este loop, el cliente debe configurar a mano lo que ya compró.

## Goal

- Reactive consumer `client_portal_modules_from_lifecycle` registrado en projection registry
- Helper `getBundledModulesForOrganization(orgId)` que resuelve modules desde commercial terms activos
- Cascade onboarding completed → enable assignments per `bundled_modules[]`
- Cascade offboarding completed → churn all active assignments
- Cascade reactivation completed → re-enable assignments desde commercial terms reactivados
- Idempotent via `outbox_reactive_log` (TASK-808 pattern)
- Dead_letter recovery + reliability signal
- Tests integration E2E: complete onboarding → modules materialized → resolver fresh

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §11 (Cascade)
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §13 (cascade outbox events)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- CLAUDE.md sección "Reactive projections en lugar de sync inline a BQ"

Reglas obligatorias:

- Reactive consumer canónico via `registerProjection`
- Re-leer entity desde PG (NO confiar en payload outbox como SoT)
- Idempotency via `outbox_reactive_log(event_id, handler='client_portal_modules_from_lifecycle')`
- Max retries 5 → dead_letter
- Errors via `captureWithDomain(err, 'client_portal', { tags: { source: 'cascade_consumer' } })`
- Cascade onboarding: para cada module en bundled, invocar `enableClientPortalModule({source:'lifecycle_case_provision', sourceRefJson:{caseId, ...}})`
- Cascade offboarding: invocar `churnClientPortalModule` para cada assignment activo
- Cascade reactivation: similar a onboarding pero `sourceRefJson` incluye `previousCaseId`
- NO inline calls — todo via outbox
- Cache invalidation post-tx (cada `enableClientPortalModule` ya lo hace)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §11
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §13

## Dependencies & Impact

### Depends on

- TASK-820 (cascade events emitidos: `client.lifecycle.case.completed`)
- TASK-825 (resolver)
- TASK-826 (commands enable/churn)
- `outbox_reactive_log` infrastructure ✅
- `engagement_commercial_terms.bundled_modules[]` (TASK-824 extension)
- `getActiveCommercialTerms` helper (TASK-802)

### Blocks / Impacts

- Cierra valor end-to-end de EPIC-015
- TASK-829 reliability signal `cascade.dead_letter` recibe data real

### Files owned

- `src/lib/sync/projections/client-portal-modules-from-lifecycle.ts` (+ `.test.ts`)
- `src/lib/client-portal/cascade/types.ts` (`LifecycleCascadeSourceRef` schema canónico G-5)
- `src/lib/client-portal/cascade/get-bundled-modules.ts` (+ `.test.ts`)
- `src/lib/client-portal/cascade/audit.ts` (`recordCascadeSkippedNoBundled` G-2 helper)
- `src/lib/client-portal/readers/native/list-active-assignments.ts` (Slice 0 — gap TASK-826) (+ `.test.ts`)
- `src/lib/client-portal/readers/native/index.ts` (re-export del nuevo reader)
- `src/lib/reliability/queries/client-portal-cascade-no-bundled-modules.ts` (+ `.test.ts`)
- `src/lib/reliability/queries/client-portal-commercial-terms-unknown-bundled-module.ts` (+ `.test.ts`)
- `src/lib/sync/projections/index.ts` (registrar projection)
- `docs/operations/runbooks/client-portal-cascade-recovery.md` (Slice 6)
- `migrations/<timestamp>_task-828-cascade-audit-event-kind.sql` (si extender CHECK constraint `module_assignment_events.event_kind`)

## Current Repo State

### Already exists

- TASK-820 cascade consumers para client lifecycle
- TASK-825 resolver
- TASK-826 commands enable/churn
- TASK-808 outbox_reactive_log pattern
- `getActiveCommercialTerms` helper

### Gap

- No existe reactive consumer `client_portal_modules_from_lifecycle`
- No existe `getBundledModulesForOrganization` helper

## Scope

### Slice 0 — `listActiveAssignmentsForOrganization` reader (gap TASK-826)

**Por qué este Slice**: TASK-826 exportó `enableClientPortalModule` y `churnClientPortalModule`, pero NO `listActiveAssignments`. El resolver canónico (`resolveClientPortalModulesForOrganization`) devuelve `ResolvedClientPortalModule[]` sin `assignmentId` — esa surface es para composición UI, no para ops. El cascade de offboarding (Slice 3) necesita `assignmentId`s para iterar `churnClientPortalModule`.

- Archivo nuevo: `src/lib/client-portal/readers/native/list-active-assignments.ts`
- Metadata canónica: `classification: 'native'`, `ownerDomain: null`, `dataSources: ['client_portal_module_assignments']`, `clientFacing: false`, `routeGroup: 'admin'`
- Signature:

  ```ts
  export const listActiveAssignmentsForOrganization = async (
    organizationId: string
  ): Promise<Array<{
    assignmentId: string
    moduleKey: string
    status: 'active' | 'pilot' | 'paused'
    effectiveFrom: string
    expiresAt: string | null
    source: AssignmentSource
  }>>
  ```

- Query: `SELECT … FROM module_assignments WHERE organization_id = $1 AND effective_to IS NULL`. NO cache (lo consume el consumer ops, no UI).
- Re-export en `src/lib/client-portal/readers/native/index.ts`.
- Tests: 4 escenarios (zero assignments, 3 activos mixed status, includes paused, NO cross-tenant leak).
- **NO** invocar desde UI cliente: prohibido por la regla "raw assignment IDs leak". UI consume el resolver.

### Slice 1 — Helper `getBundledModulesForOrganization` con validación y filtrado

- Archivo nuevo: `src/lib/client-portal/cascade/get-bundled-modules.ts`
- Schema canónico de retorno:

  ```ts
  export interface BundledModulesResolution {
    moduleKeys: string[]                   // únicos, filtrados contra catálogo activo
    commercialTermsIds: string[]           // todos los terms que contribuyeron
    skippedDeprecatedKeys: string[]        // module_keys en bundled_modules[] que NO tienen módulo activo (drift)
    skippedReason: 'no_services' | 'no_active_terms' | 'no_bundled_modules' | null
  }
  ```

- SQL canónico (en el helper, NO inline en consumer):

  ```sql
  WITH org_services AS (
    SELECT s.service_id
    FROM greenhouse_core.spaces sp
    JOIN greenhouse_core.services s ON s.space_id = sp.space_id
    WHERE sp.organization_id = $1
      AND s.active = TRUE
      AND s.status != 'legacy_seed_archived'
      AND s.hubspot_sync_status IS DISTINCT FROM 'unmapped'
  ),
  active_terms AS (
    SELECT t.terms_id, UNNEST(t.bundled_modules) AS module_key
    FROM greenhouse_commercial.engagement_commercial_terms t
    JOIN org_services os ON os.service_id = t.service_id
    WHERE t.effective_to IS NULL
  )
  SELECT
    at.terms_id,
    at.module_key,
    m.module_key AS catalog_match
  FROM active_terms at
  LEFT JOIN greenhouse_client_portal.modules m
    ON m.module_key = at.module_key
   AND m.effective_to IS NULL
  ```

- Lógica:
  1. Si `org_services` vacío → return `{moduleKeys:[], commercialTermsIds:[], skippedDeprecatedKeys:[], skippedReason:'no_services'}`.
  2. Si `active_terms` vacío → `skippedReason: 'no_active_terms'`.
  3. Particionar el result: `catalog_match IS NOT NULL` → valid; `IS NULL` → skippedDeprecatedKeys.
  4. Dedup `moduleKeys`. Dedup `commercialTermsIds`.
  5. Si `moduleKeys.length === 0 && skippedDeprecatedKeys.length === 0` → `skippedReason: 'no_bundled_modules'`.
  6. Loggear `captureWithDomain(new Error('skipped_deprecated_in_bundle'), 'client_portal', { level: 'warning', tags: {source:'cascade_helper', orgId, count: skippedDeprecatedKeys.length} })` si hay deprecated.
- Tests obligatorios:
  - org sin spaces → `no_services`
  - org con spaces sin services activos → `no_services`
  - org con services sin terms activos → `no_active_terms`
  - org con terms `bundled_modules=[]` → `no_bundled_modules`
  - mix válidos + deprecated → ambos arrays poblados correctamente
  - múltiples services con overlap → dedup correcto
  - `spaces.organization_id IS NULL` defensive case → no se filtra cross-tenant
  - cross-tenant: org A con bundles `[m1]`, org B con `[m2]` → query para A devuelve solo `[m1]`

### Slice 2 — Reactive consumer onboarding completed

- Archivo nuevo: `src/lib/sync/projections/client-portal-modules-from-lifecycle.ts`
- Trigger: `client.lifecycle.case.completed` con `payload.caseKind='onboarding'`
- `extractScope`: `{ entityId: event.payload.caseId, skipIf: !['onboarding','offboarding','reactivation'].includes(event.payload.caseKind) }`
- `refresh`:
  1. Re-leer case desde PG via `getClientLifecycleCase(caseId)`. Si NO existe → throw (anomalía: event apunta a case inexistente). Retry → eventual dead_letter.
  2. **Invariante post-G-1**: `case.client_id IS NULL` → throw `Error('cascade_consumer_invariant_violated: client_id null after instantiate inline')`. Esto debe ser imposible si TASK-820 cerró correctamente; si pasa, dead_letter + signal alertan.
  3. Resolver `getBundledModulesForOrganization(case.organization_id)`.
  4. Si `resolution.skippedReason === 'no_bundled_modules'` (o cualquier non-null skippedReason en onboarding/reactivation): G-2 handling — capture warning + audit row `event_kind='cascade_skipped_no_bundled'` + return `{status:'completed', materialized:0, reason: resolution.skippedReason}`.
  5. Construir `sourceRefJson` canónico (schema G-5).
  6. Loop por `moduleKey` en `resolution.moduleKeys`: `await enableClientPortalModule({organizationId, moduleKey, source:'lifecycle_case_provision', sourceRefJson, effectiveFrom: case.effective_date, approvedByUserId: case.triggered_by_user_id, status:'active'})`. Errores per-module re-raise (consumer dead_letter se encarga via retry).
  7. Invalidate cache: `__clearClientPortalResolverCache(case.organization_id)`.
  8. Return `{status:'completed', materialized: moduleKeys.length, skippedDeprecatedCount: resolution.skippedDeprecatedKeys.length}`.
- Idempotent via `outbox_reactive_log(event_id, handler='client_portal_modules_from_lifecycle')`.
- `maxRetries: 5` → dead_letter.

### Slice 3 — Reactive consumer offboarding completed

- Mismo archivo + handler; ramificación por `case.case_kind === 'offboarding'`
- Refresh:
  1. Re-leer case.
  2. `listActiveAssignmentsForOrganization(case.organization_id)` (Slice 0).
  3. Si lista vacía → `{status:'completed', churned:0, reason:'no_active_assignments'}` (idempotent ante re-deliver).
  4. Por cada: `churnClientPortalModule({assignmentId, reason: 'Offboarding case completed: ' + caseId, actorUserId: case.triggered_by_user_id})`.
  5. Invalidate cache: `__clearClientPortalResolverCache(case.organization_id)`.
  6. Return `{status:'completed', churned: list.length}`.

### Slice 4 — Reactive consumer reactivation completed

- Mismo archivo + handler; ramificación por `case.case_kind === 'reactivation'`
- Semantics V1.0 confirmada (Delta arch-architect): trata como "fresh onboarding contra terms reactivados". Mismo flow que Slice 2 pero:
  - `sourceRefJson.previousCaseId = case.previous_case_id` (non-null per CHECK constraint lifecycle V1)
  - Si existe assignment previo churned (effective_to NOT NULL), el `enableClientPortalModule` idempotency check (effective_to IS NULL) NO matchea → INSERT nuevo (correcto: nuevo período).
- V1.1 smart restore desde `previous_case_id` queda fuera de scope (registrar en Follow-ups).

### Slice 5 — Tests integration E2E

Tests anti-regresión obligatorios:

1. **Happy path onboarding**: case con `bundled_modules=['creative_hub_globe_v1','equipo_asignado','pulse']` → consumer fires → 3 assignments materializados → resolver devuelve 3 modules → audit log 3 rows con `sourceRefJson` completo (G-5 schema).
2. **Happy path offboarding**: 3 assignments activos pre-offboarding → consumer fires → 3 assignments con `effective_to` set → resolver devuelve `[]`.
3. **Happy path reactivation**: org con previous case offboarded (assignments con `effective_to`) → reactivation case completed → assignments NUEVOS con `sourceRefJson.previousCaseId` poblado.
4. **Idempotency re-deliver**: mismo `event_id` consumido 2 veces → 2do skipea via `outbox_reactive_log` dedup → 0 audit rows duplicados → 0 outbox events duplicados.
5. **Cross-tenant isolation** (obligatorio G-6): org A con services y bundles `[m1,m2]`; org B con services y bundles `[m3]`. Complete onboarding A → assert A tiene m1+m2 activos, B tiene `[]`. Complete offboarding A → assert A churned, B intacto.
6. **G-2 no bundled modules**: org con commercial terms cuyo `bundled_modules=[]` → onboarding cascade → 0 materializados → audit row `event_kind='cascade_skipped_no_bundled'` presente → signal `cascade.no_bundled_modules` cuenta = 1.
7. **G-3 deprecated module_key in bundle**: `bundled_modules=['active_mod','deprecated_mod']` con `deprecated_mod` deprecated en catálogo → cascade enabling solo `active_mod` → captureWithDomain warning emitido → signal `commercial_terms.unknown_bundled_module` cuenta el drift.
8. **G-1 invariant**: case con `client_id IS NULL` (estado imposible post-TASK-820 inline) → consumer THROW (no skip) → eventual dead_letter → signal `cascade.dead_letter` cuenta = 1. **Esto verifica defense in depth**, no flow normal.
9. **Dead letter**: forzar fail 5 veces (mock `enableClientPortalModule` throw) → outbox_reactive_log status='dead_letter' → signal lo detecta.
10. **Cache invalidation**: post-cascade, segunda llamada a resolver para esa org devuelve fresh sin esperar TTL 60s.

### Slice 6 — Runbook recovery (stub mínimo)

- Crear `docs/operations/runbooks/client-portal-cascade-recovery.md` con los 5 escenarios canónicos (declarados en Delta G arriba, sección "Runbook recovery").
- Cada escenario: síntoma (cómo se detecta), diagnóstico (queries SQL + signal a chequear), recovery (comando/endpoint), validación (cómo confirmar que quedó OK).
- TASK-829 expande este runbook con outputs reales del signal panel cuando esos signals reciban data en staging.

## Out of Scope

- Pricing automation post-cascade (V1.1)
- Smart restore en reactivation (V1.1: leer del previous case el state previo)
- Notification al cliente cuando módulo enabled/churned (V1.1 con notification hub)
- Reactive consumer downstream que escucha `client.portal.module.assignment.created` para BQ projection (consumer separado)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §11 (Delta 2026-05-13 reflejará los acuerdos G-1..G-6).

### Schema canónico de `sourceRefJson` (G-5)

Vive en `src/lib/client-portal/cascade/types.ts`. Cualquier consumer downstream (admin UI, BQ projection futura, audit forensics) lo importa, NO parsea ad-hoc.

```ts
// src/lib/client-portal/cascade/types.ts
export type LifecycleCascadeSourceRef = {
  caseId: string                                 // FK greenhouse_core.client_lifecycle_cases
  caseKind: 'onboarding' | 'reactivation' | 'offboarding'
  effectiveDate: string                          // ISO date — del lifecycle case
  previousCaseId: string | null                  // non-null en reactivation; null en onboarding
  commercialTermsIds: string[]                   // terms_id[] que aportaron bundled_modules
  cascadeRunAt: string                           // ISO timestamp del consumer fire
}
```

### Consumer canónico

```ts
// src/lib/sync/projections/client-portal-modules-from-lifecycle.ts
import 'server-only'
import { registerProjection } from '@/lib/sync/projections'
import { getClientLifecycleCase } from '@/lib/client-lifecycle/queries'
import { getBundledModulesForOrganization } from '@/lib/client-portal/cascade/get-bundled-modules'
import { recordCascadeSkippedNoBundled } from '@/lib/client-portal/cascade/audit'
import {
  enableClientPortalModule,
  churnClientPortalModule
} from '@/lib/client-portal/commands'
import { listActiveAssignmentsForOrganization } from '@/lib/client-portal/readers/native/list-active-assignments'
import { __clearClientPortalResolverCache } from '@/lib/client-portal/readers/native/module-resolver'
import { captureWithDomain } from '@/lib/observability/capture'
import type { LifecycleCascadeSourceRef } from '@/lib/client-portal/cascade/types'

registerProjection({
  name: 'client_portal_modules_from_lifecycle',
  description: 'Materializa/churn-ea client_portal.module_assignments cuando un client_lifecycle_case completa',
  domain: 'client_portal',
  triggerEvents: ['client.lifecycle.case.completed'],

  extractScope: (event) => {
    const caseKind = event.payload.caseKind as string | undefined
    if (!caseKind || !['onboarding', 'offboarding', 'reactivation'].includes(caseKind)) {
      return null   // skip — case_kind no aplica a cascade
    }
    const caseId = event.payload.caseId as string | undefined
    if (!caseId) return null
    return { entityType: 'client_lifecycle_case', entityId: caseId }
  },

  refresh: async (scope) => {
    const caseRow = await getClientLifecycleCase(scope.entityId)

    // Throw, NO skip — anomalía (event apunta a case inexistente).
    // Retry exhaustivo eventualmente dead_letter + signal alerta.
    if (!caseRow) {
      throw new Error(`cascade_consumer: case ${scope.entityId} not found`)
    }

    // G-1 invariant: post-TASK-820 inline, client_id SIEMPRE existe en case completed.
    // Si null, es violación de invariante → throw → dead_letter + signal escala visible.
    if (caseRow.client_id == null) {
      throw new Error(
        `cascade_consumer_invariant_violated: case ${caseRow.case_id} completed con client_id null`
      )
    }

    const cascadeRunAt = new Date().toISOString()

    if (caseRow.case_kind === 'onboarding' || caseRow.case_kind === 'reactivation') {
      const resolution = await getBundledModulesForOrganization(caseRow.organization_id)

      // G-2: vacío en cualquiera de sus formas → audit + signal inmediato (NO skip silente)
      if (resolution.skippedReason != null) {
        await recordCascadeSkippedNoBundled({
          organizationId: caseRow.organization_id,
          caseId: caseRow.case_id,
          caseKind: caseRow.case_kind,
          reason: resolution.skippedReason
        })
        captureWithDomain(
          new Error(`cascade_no_bundled_modules: ${resolution.skippedReason}`),
          'client_portal',
          {
            level: 'warning',
            tags: { source: 'cascade_consumer', caseKind: caseRow.case_kind, caseId: caseRow.case_id },
            extra: { orgId: caseRow.organization_id, skippedReason: resolution.skippedReason }
          }
        )
        return { status: 'completed', materialized: 0, reason: resolution.skippedReason }
      }

      const sourceRefBase: Omit<LifecycleCascadeSourceRef, 'caseKind'> & { caseKind: typeof caseRow.case_kind } = {
        caseId: caseRow.case_id,
        caseKind: caseRow.case_kind,
        effectiveDate: caseRow.effective_date,
        previousCaseId: caseRow.previous_case_id ?? null,
        commercialTermsIds: resolution.commercialTermsIds,
        cascadeRunAt
      }

      for (const moduleKey of resolution.moduleKeys) {
        await enableClientPortalModule({
          organizationId: caseRow.organization_id,
          moduleKey,
          source: 'lifecycle_case_provision',
          sourceRefJson: sourceRefBase,
          effectiveFrom: caseRow.effective_date,
          approvedByUserId: caseRow.triggered_by_user_id,
          status: 'active'
        })
      }

      __clearClientPortalResolverCache(caseRow.organization_id)

      return {
        status: 'completed',
        materialized: resolution.moduleKeys.length,
        skippedDeprecatedCount: resolution.skippedDeprecatedKeys.length
      }
    }

    if (caseRow.case_kind === 'offboarding') {
      const active = await listActiveAssignmentsForOrganization(caseRow.organization_id)

      if (active.length === 0) {
        return { status: 'completed', churned: 0, reason: 'no_active_assignments' }
      }

      for (const assignment of active) {
        await churnClientPortalModule({
          assignmentId: assignment.assignmentId,
          reason: `Offboarding lifecycle case completed: ${caseRow.case_id}`,
          actorUserId: caseRow.triggered_by_user_id
        })
      }

      __clearClientPortalResolverCache(caseRow.organization_id)

      return { status: 'completed', churned: active.length }
    }

    // Inalcanzable por `extractScope` filter, pero defensive return:
    return { status: 'skip', reason: 'unknown_case_kind' }
  },

  maxRetries: 5
})
```

### Reliability signals nuevos (este TASK escribe el reader; TASK-829 los wirea al dashboard)

- `client_portal.cascade.no_bundled_modules` — kind=drift, severity=warning, steady=0. Query: `module_assignment_events` con `event_kind='cascade_skipped_no_bundled'` últimos 7 días.
- `client_portal.commercial_terms.unknown_bundled_module` — kind=drift, severity=error si >0, steady=0. Query: `engagement_commercial_terms` activos × `UNNEST(bundled_modules)` LEFT JOIN `modules` activos, cuenta NULL matches.
- `client_portal.cascade.dead_letter` — ya declarado en spec §13; este TASK lo alimenta con data real.

## Acceptance Criteria

### Pre-requisitos (coordinación cross-task)

- [ ] TASK-820 Slice 1 cerró: `client.lifecycle.case.completed` se emite POST-`instantiateClientForParty` (G-1 opción A inline). Verificado en código + smoke staging.

### Implementación

- [ ] **Slice 0**: `listActiveAssignmentsForOrganization` reader native creado, exportado, tests verdes (zero / mixed status / paused incluido / cross-tenant isolation).
- [ ] **Slice 1**: `getBundledModulesForOrganization` devuelve shape `BundledModulesResolution` canónico, filtra deprecated contra catálogo activo, retorna `skippedReason` enumerado, tests cubren los 8 escenarios obligatorios.
- [ ] **Slice 2**: Reactive consumer registrado via `registerProjection` con `name='client_portal_modules_from_lifecycle'`, `extractScope` filtra `case_kind` válidos, refresh implementa G-1 invariant + G-2 handling + G-5 sourceRefJson + cache invalidation.
- [ ] **Slice 3**: Cascade offboarding consume `listActiveAssignmentsForOrganization`, idempotent ante re-deliver con 0 activos, invalida cache post-tx.
- [ ] **Slice 4**: Cascade reactivation comparte refresh de onboarding pero pobla `sourceRefJson.previousCaseId` (non-null por CHECK constraint lifecycle).
- [ ] **Slice 5**: Los 10 tests anti-regresión obligatorios verdes (incluye cross-tenant G-6, G-2 vacío, G-3 deprecated, G-1 invariant defense).
- [ ] **Slice 6**: Runbook `docs/operations/runbooks/client-portal-cascade-recovery.md` creado con los 5 escenarios canónicos (síntoma + diagnóstico + recovery + validación).

### Reliability signals

- [ ] `client_portal.cascade.no_bundled_modules` reader implementado, query verificada vs PG real (puede retornar 0 en V1.0; signal listo para TASK-829 wire-up).
- [ ] `client_portal.commercial_terms.unknown_bundled_module` reader implementado.
- [ ] `client_portal.cascade.dead_letter` ya declarado en spec §13 — verificar que el reader existente lo recoge cuando este consumer escribe a dead_letter.

### Audit

- [ ] `module_assignment_events.event_kind` extendido con `'cascade_skipped_no_bundled'` (migration si requiere CHECK constraint extension; coordinar con TASK-826 audit schema).
- [ ] Todo `enableClientPortalModule` invocado desde el cascade persiste `sourceRefJson` matching el schema `LifecycleCascadeSourceRef`.

### Operativos

- [ ] Cache invalidation correcta post-cascade: 2da llamada a resolver devuelve fresh sin esperar TTL.
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` verdes.
- [ ] Smoke staging: open onboarding case con `bundled_modules=[...]` → `resolveLifecycleCase` → verificar outbox event v1 → ops-worker procesa < 5min → assignments visibles via `/api/client-portal/modules` + resolver.
- [ ] Smoke staging: open offboarding case → ops-worker procesa → assignments con `effective_to` set → resolver devuelve `[]`.
- [ ] Smoke staging cross-tenant: 2 orgs simultaneous, onboarding A no afecta B.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/sync/projections/client-portal-modules-from-lifecycle src/lib/client-portal/cascade src/lib/client-portal/readers/native/list-active-assignments src/lib/reliability/queries/client-portal-cascade-no-bundled-modules src/lib/reliability/queries/client-portal-commercial-terms-unknown-bundled-module`
- `pnpm build` (Turbopack production; defense-in-depth contra `server-only` transitivo en reader native)
- Smoke staging E2E onboarding: open onboarding case con bundled_modules → resolve case → verify outbox event v1 → ops-worker procesa < 5min → verify assignments en PG + resolver fresh
- Smoke staging E2E offboarding: con assignments activos → complete offboarding → verify churned + signal `cascade.dead_letter=0`
- Smoke staging cross-tenant: 2 orgs simultáneas, onboarding A no muta B

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con E2E flow validation
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-829 puede tomar (signal cascade_dead_letter recibirá data)
- [ ] EPIC-015 progress actualizado

## Follow-ups

- Smart restore en reactivation V1.1 (preserva state previo del previous_case_id)
- Notification al cliente cuando módulo enabled (V1.1 + notification hub)
- BQ projection separada para "module adoption metrics" (V1.1)

## Open Questions

### Resueltas en review arch-architect 2026-05-13

- ✅ **Race con TASK-820 cascade (G-1)**: TASK-820 instantiate corre **inline dentro de `resolveLifecycleCase`** antes de emitir el outbox event. TASK-828 trata `client_id IS NULL` como error duro (no skip).
- ✅ **`bundled_modules[]` vacío (G-2)**: NO fallback a business_line default V1.0. Audit row + Sentry warning + signal `cascade.no_bundled_modules` (steady=0, warning si >0 últimos 7d). Detecta inmediato, complementa el 14d signal `lifecycle_module_drift` de spec §13.
- ✅ **Filtrado deprecated modules (G-3)**: vive en `getBundledModulesForOrganization`, NO en el consumer. Filter upstream + signal `commercial_terms.unknown_bundled_module` detect drift TS↔DB antes de que el cascade lo descubra.
- ✅ **Reactivation V1.0 semantics**: solo bundled actuales (terms vigentes al momento de la reactivation). Smart restore desde `previous_case_id` queda V1.1.
- ✅ **Cascade sync vs async**: async via outbox (decoupled, resilient, recovery-friendly). Inline solo aplica a `instantiateClientForParty` que es prerequisito hard, NO a projection downstream.
- ✅ **Runbook recovery**: stub mínimo en este TASK (5 escenarios), detalle expandido en TASK-829 con outputs reales del signal panel.

### Abiertas para post-V1.0

- **Per-module failure isolation**: hoy un error per-module re-raisa y dead_letter el evento completo. ¿V1.1 cambia a `try/catch` per-iteración con `failedModules[]` + retornar `{status: 'partial'}`? Pendiente data real — si en producción nunca emerge falla per-module aislada, mantener strict.
- **Operator-driven re-cascade post-edit**: si comercial edita `bundled_modules` mid-engagement (no via case completion), ¿hay endpoint admin para forzar re-cascade? V1.1: `POST /api/admin/client-portal/organizations/[orgId]/cascade-from-current-terms` con capability dedicada.
- **BQ projection downstream de assignments**: declarado out-of-scope, pero ¿qué módulo lo posee? Probablemente `commercial` (adoption metrics) o `client_portal` native — decidir al abrir TASK V1.1.
- **Smart restore reactivation V1.1**: leer `previous_case_id` chain y restituir state previo. Requiere snapshot persistente del state de assignments al momento del offboarding (TASK-828 NO lo persiste — solo deja `effective_to` set).
