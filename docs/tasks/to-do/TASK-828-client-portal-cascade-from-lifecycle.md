# TASK-828 — Client Portal Cascade from Client Lifecycle V1

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (TASK-824 cerrada 2026-05-12; columna engagement_commercial_terms.bundled_modules ya disponible)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `TASK-820` (TASK-825 + TASK-826 cerradas 2026-05-12)
- Branch: `task/TASK-828-client-portal-cascade`

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

- `src/lib/sync/projections/client-portal-modules-from-lifecycle.ts`
- `src/lib/client-portal/cascade/get-bundled-modules.ts`
- `src/lib/client-portal/cascade/__tests__/*.test.ts`
- `src/lib/sync/projections/index.ts` (registrar projection)

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

### Slice 1 — Helper `getBundledModulesForOrganization`

- Lee `engagement_commercial_terms` activos (`effective_to IS NULL`) para todos los services del org
- Une los `bundled_modules[]` (dedup)
- Filtra modules que existen en catálogo activo (`modules.effective_to IS NULL`)
- Devuelve `string[]` de module_keys

### Slice 2 — Reactive consumer onboarding completed

- Trigger: `client.lifecycle.case.completed` con `payload.caseKind='onboarding'`
- Refresh:
  - Re-leer case desde PG
  - Si `client_id IS NULL` → skip (esperar a TASK-820 cascade que crea el client primero)
  - Llamar `getBundledModulesForOrganization(case.organization_id)`
  - Para cada module: invocar `enableClientPortalModule({source:'lifecycle_case_provision', sourceRefJson:{caseId, ...}})`
- Idempotent via outbox_reactive_log
- Dead letter después de 5 retries

### Slice 3 — Reactive consumer offboarding completed

- Trigger: `client.lifecycle.case.completed` con `payload.caseKind='offboarding'`
- Refresh:
  - Re-leer case
  - Listar `module_assignments` activos del org
  - Para cada: invocar `churnClientPortalModule({reason: 'Offboarding case completed: ${caseId}', actorUserId: case.triggered_by_user_id})`

### Slice 4 — Reactive consumer reactivation completed

- Trigger: `client.lifecycle.case.completed` con `payload.caseKind='reactivation'`
- Refresh:
  - Re-leer case
  - V1.0: tratar como onboarding fresh — invocar `getBundledModulesForOrganization` (assume terms reinstalados via reactivation_v1 checklist) + enable per module
  - `sourceRefJson` incluye `caseId` y `previousCaseId`

### Slice 5 — Tests integration E2E

- Smoke: completar onboarding case con `bundled_modules=['creative_hub_globe_v1','equipo_asignado','pulse']`
  → outbox `client.lifecycle.case.completed` v1
  → consumer fires
  → 3 assignments materializados
  → resolver para org devuelve los 3 modules
- Smoke offboarding: completar offboarding → 3 assignments churned (effective_to set)
- Smoke reactivation: previous case completed offboarding → reactivation case → modules re-enabled
- Idempotency: re-deliver mismo event → outbox_reactive_log dedup → no double-enable
- Dead letter: forzar fail 5 veces → dead_letter

## Out of Scope

- Pricing automation post-cascade (V1.1)
- Smart restore en reactivation (V1.1: leer del previous case el state previo)
- Notification al cliente cuando módulo enabled/churned (V1.1 con notification hub)
- Reactive consumer downstream que escucha `client.portal.module.assignment.created` para BQ projection (consumer separado)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §11. Patrón:

```ts
// src/lib/sync/projections/client-portal-modules-from-lifecycle.ts
import { registerProjection } from '@/lib/sync/projections'
import { getClientLifecycleCase } from '@/lib/client-lifecycle/queries'
import { getBundledModulesForOrganization } from '@/lib/client-portal/cascade/get-bundled-modules'
import { enableClientPortalModule, churnClientPortalModule, listActiveAssignments } from '@/lib/client-portal/commands'

registerProjection({
  name: 'client_portal_modules_from_lifecycle',
  triggerEvents: ['client.lifecycle.case.completed'],
  domain: 'client_portal',
  extractScope: (event) => ({
    entityId: event.payload.caseId,
    skipIf: !['onboarding','offboarding','reactivation'].includes(event.payload.caseKind),
  }),
  refresh: async ({ entityId }) => {
    const caseRow = await getClientLifecycleCase(entityId)
    if (!caseRow) return { status: 'skip', reason: 'case_not_found' }

    if (caseRow.case_kind === 'onboarding' || caseRow.case_kind === 'reactivation') {
      const bundledModules = await getBundledModulesForOrganization(caseRow.organization_id)
      for (const moduleKey of bundledModules) {
        await enableClientPortalModule({
          organizationId: caseRow.organization_id,
          moduleKey,
          source: 'lifecycle_case_provision',
          sourceRefJson: { caseId: caseRow.case_id, previousCaseId: caseRow.previous_case_id ?? null },
          effectiveFrom: caseRow.effective_date,
          approvedByUserId: caseRow.triggered_by_user_id,
          status: 'active',
        })
      }
      return { status: 'completed', materialized: bundledModules.length }
    }

    if (caseRow.case_kind === 'offboarding') {
      const active = await listActiveAssignments(caseRow.organization_id)
      for (const a of active) {
        await churnClientPortalModule({
          assignmentId: a.assignment_id,
          reason: `Offboarding case completed: ${caseRow.case_id}`,
          actorUserId: caseRow.triggered_by_user_id,
        })
      }
      return { status: 'completed', churned: active.length }
    }

    return { status: 'skip', reason: 'unknown_case_kind' }
  },
  maxRetries: 5,
})
```

## Acceptance Criteria

- [ ] Reactive consumer registrado via `registerProjection`
- [ ] `getBundledModulesForOrganization` resuelve correctamente desde `engagement_commercial_terms.bundled_modules[]`
- [ ] Cascade onboarding: outbox event → consumer fires → assignments materializados
- [ ] Cascade offboarding: outbox event → todos los assignments activos churned
- [ ] Cascade reactivation: similar a onboarding + sourceRefJson incluye previousCaseId
- [ ] Idempotent: re-deliver event → no double-enable (outbox_reactive_log dedup)
- [ ] Dead letter: forzar 5 fails → event va a dead_letter
- [ ] Cache invalidation correcta (resolver fresh inmediato)
- [ ] Tests integration E2E cubren los 3 paths + idempotency + dead letter
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde
- [ ] Smoke staging: complete onboarding test → assignments visibles via API + resolver

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/sync/projections/client-portal-modules-from-lifecycle src/lib/client-portal/cascade`
- Smoke staging E2E: open onboarding case con bundled_modules → resolve case → verify ops-worker procesa < 5min → verify assignments en PG + resolver

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

- ¿Reactivation re-instala TODOS los modules previos o solo los del bundled actualizado? Recomendación V1.0: solo los del bundled actualizado (terms pueden haber cambiado entre offboarding y reactivation).
- ¿Cascade ejecuta synchronous within tx del case completion o async via outbox? Recomendación: async via outbox (decoupled, resilient, recovery-friendly).
- ¿Si `bundled_modules[]` está vacío en commercial terms, se materializa default per business_line? Recomendación V1.0: NO (cliente queda sin modules → reliability signal `client_active_without_modules` alerta); V1.1 fallback to business_line default.
