# TASK-820 — Client Lifecycle Reliability Signals + Cascade Reactive Consumers

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / platform`
- Blocked by: `TASK-817`
- Branch: `task/TASK-820-client-lifecycle-reliability-cascade`

## Summary

Cierra el bucle async del módulo Client Lifecycle V1: 6 reliability signals (subsystem `Commercial Health`) que detectan stalls / blocked overdue / orphan items / cascade dead-letter / blocker override anomaly + 3 reactive consumers que ejecutan los side-effects post-completion (instantiate/archive client, revoke client_users access, propagate engagement_outcomes), todos idempotentes via `outbox_reactive_log` y con dead_letter recovery.

## Why This Task Exists

Sin reliability signals, casos atascados son invisibles para ops (regresión al estado pre-V1). Sin cascade consumers, los side-effects post-completion (flippear `clients.status`, archive Notion, revoke access) viven inline en `resolveLifecycleCase` — anti-pattern TASK-771/773 cerró para finance. Los consumers async garantizan que la operación de completion sea fast (< 500ms) y los side-effects sean resilient (retry + backoff + dead_letter visible en `/admin/operations`).

## Goal

- 6 reliability signals registrados bajo subsystem `Commercial Health` con readers
- 3 reactive consumers (cascade) registrados en projection registry
- Consumers idempotent via `outbox_reactive_log` (TASK-808 pattern)
- Dead_letter signal `client.lifecycle.cascade_dead_letter` para incidentes
- 1 signal `blocker_override_anomaly_rate` con threshold 3 overrides/30d (heurística, ajustable)
- Tests integration: cascade flow happy path + dead_letter path

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §13 (Reliability Signals), §14 (Defense in Depth)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry + subsystem rollup
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — projection pattern + dead_letter
- `CLAUDE.md` sección "Reactive projections en lugar de sync inline a BQ (TASK-771)"
- `CLAUDE.md` sección "Outbox publisher canónico (TASK-773)"

Reglas obligatorias:

- Reliability signals registrados via `RELIABILITY_REGISTRY` (NO endpoints paralelos)
- Cada signal tiene `kind`, `severity`, `steady` declarados; queries puras (no side-effects)
- Reactive consumers usan `registerProjection({...})` canonico de TASK-771
- Idempotency via `outbox_reactive_log(event_id, handler)` (TASK-808 pattern); re-entrega segura
- Cascade consumers re-leen entity desde PG (NO confiar en payload outbox como SoT)
- Errors via `captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle_cascade' } })`
- NUNCA invocar `instantiateClientForParty` o `archiveClientForParty` directo desde el comando `resolveLifecycleCase` — solo desde el reactive consumer
- Backoff exponencial + max retries 5 → dead_letter
- Subsystem rollup `Commercial Health` extendido con los 6 signals nuevos (max severity wins)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §13, §14
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

## Dependencies & Impact

### Depends on

- TASK-817 (outbox events `client.lifecycle.case.completed` + `_cancelled` + `_blocker.overridden` emitidos)
- `RELIABILITY_REGISTRY` ✅ existe
- `registerProjection` + ops-worker reactive consumer infrastructure ✅ existe
- `instantiateClientForParty()` + `archiveClientForParty()` (TASK-535 — verificar `archiveClientForParty` `[verificar]`)
- `revokeClientUsersAccess()` helper (existe en `src/lib/identity/`? — `[verificar]`)

### Blocks / Impacts

- TASK-821 (HubSpot trigger) — el flow completo debe estar funcional
- UI tiles en TASK-819 — leen estos signals

### Files owned

- `src/lib/reliability/queries/client-lifecycle-onboarding-stalled.ts`
- `src/lib/reliability/queries/client-lifecycle-offboarding-blocked-overdue.ts`
- `src/lib/reliability/queries/client-lifecycle-checklist-orphan-items.ts`
- `src/lib/reliability/queries/client-lifecycle-cascade-dead-letter.ts`
- `src/lib/reliability/queries/client-lifecycle-blocker-override-anomaly.ts`
- `src/lib/reliability/queries/client-lifecycle-case-without-template.ts`
- `src/lib/sync/projections/client-lifecycle-onboarding-completed.ts`
- `src/lib/sync/projections/client-lifecycle-offboarding-completed.ts`
- `src/lib/sync/projections/client-lifecycle-reactivation-completed.ts`
- `src/lib/reliability/registry/commercial-health.ts` (extender)
- `src/lib/sync/projections/index.ts` (registrar 3 projections)
- `src/lib/client-lifecycle/cascade/__tests__/*.test.ts`

## Current Repo State

### Already exists

- Reliability platform `RELIABILITY_REGISTRY` + subsystem rollup
- Projection registry `registerProjection` (TASK-771)
- ops-worker reactive consumer + Cloud Scheduler trigger
- Subsystem `Commercial Health` (TASK-807) — extender, NO crear nuevo
- Outbox events `client.lifecycle.case.completed` + variants emitidos por TASK-817
- `instantiateClientForParty()` (TASK-535) ✅ existe
- `archiveClientForParty()` `[verificar]` — si no existe, crear como parte de Slice 2

### Gap

- No existen reliability queries para client lifecycle
- No existen reactive consumers para cascade post-completion
- `archiveClientForParty()` puede no existir como writer canónico (verificar)
- `revokeClientUsersAccess()` puede no existir como helper canónico (verificar)

## Scope

### Slice 1 — Reliability signals (6 readers)

Para cada signal: archivo `src/lib/reliability/queries/<name>.ts` exportando query pura, registrado en `commercial-health.ts` registry:

1. **`client.lifecycle.onboarding_stalled`** — `kind=drift, severity=warning, steady=0`
   - Query: `SELECT count(*) FROM client_lifecycle_cases WHERE case_kind='onboarding' AND status='in_progress' AND updated_at < now() - INTERVAL '14 days'`
2. **`client.lifecycle.offboarding_blocked_overdue`** — `kind=drift, severity=error, steady=0`
   - Query: cases offboarding en `blocked` > 30 días
3. **`client.lifecycle.checklist_orphan_items`** — `kind=data_quality, severity=error, steady=0`
   - Query: items con `template_code` no presente en templates activos
4. **`client.lifecycle.cascade_dead_letter`** — `kind=dead_letter, severity=error, steady=0`
   - Query: `outbox_events.status='dead_letter' AND event_kind LIKE 'client.lifecycle.%'`
5. **`client.lifecycle.blocker_override_anomaly_rate`** — `kind=drift, severity=warning, steady<3`
   - Query: count de `case_events.event_kind='blocker_overridden'` en últimos 30 días
6. **`client.lifecycle.case_without_template`** — `kind=data_quality, severity=error, steady=0`
   - Query: cases con `template_code` no presente en `client_lifecycle_checklist_templates`

Wire-up en `getReliabilityOverview` rollup `Commercial Health`.

### Slice 2 — Verify + create canonical writers

- Verify `archiveClientForParty()` existe en `src/lib/commercial/party/commands/`. Si NO:
  - Crear `archiveClientForParty(organizationId, actor, reason)` atomic: UPDATE `clients.status='inactive', active=FALSE` + UPDATE `organizations.lifecycle_stage='inactive'` via `promoteParty()` + outbox event `clientArchived`
  - Mirror exacto de `instantiateClientForParty` shape
- Verify `revokeClientUsersAccess(organizationId, actor)` helper existe. Si NO:
  - Crear: SET `client_users.active=FALSE` + audit + outbox `client_users.access_revoked` v1
- Tests unit

### Slice 3 — Reactive consumer onboarding completed

- `src/lib/sync/projections/client-lifecycle-onboarding-completed.ts`
- Trigger: outbox event `client.lifecycle.case.completed` con `caseKind='onboarding'`
- Refresh: re-leer case desde PG → si `client_id IS NULL` → invocar `instantiateClientForParty(organizationId, ..., actor)` → emit `client.lifecycle.cascade.onboarding_finished` v1
- Idempotent: `outbox_reactive_log(event_id, 'client_lifecycle_onboarding_completed')`
- Max retries 5 → dead_letter

### Slice 4 — Reactive consumer offboarding completed

- `src/lib/sync/projections/client-lifecycle-offboarding-completed.ts`
- Trigger: outbox event `client.lifecycle.case.completed` con `caseKind='offboarding'`
- Refresh: re-leer case → ejecutar **en paralelo**:
  - `archiveClientForParty(organizationId, actor, reason='Offboarding case completed: ${caseId}')`
  - `revokeClientUsersAccess(organizationId, actor)`
  - Propagate `engagement_outcomes`: para cada engagement_phase activa del cliente, emit outbox `service.engagement.outcome_recorded` v1 con `outcome_kind='cancelled_by_client'` o `cancelled_by_provider` según metadata del case
- Idempotent + dead_letter

### Slice 5 — Reactive consumer reactivation completed

- `src/lib/sync/projections/client-lifecycle-reactivation-completed.ts`
- Trigger: outbox event `client.lifecycle.case.completed` con `caseKind='reactivation'`
- Refresh: re-leer case → invocar `reactivateClientForParty(organizationId)` (SET `clients.active=TRUE, status='active'` + `lifecycle_stage='active_client'` via `promoteParty()`)
- Si helper canónico no existe, crear como parte del slice
- Idempotent + dead_letter

### Slice 6 — Tests integration

- Happy path onboarding: completed event → instantiate triggered → client created
- Happy path offboarding: completed event → archive + revoke + outcomes propagated
- Dead letter: forzar fail 5 veces → event va a dead_letter → signal `cascade_dead_letter` count > 0
- Idempotency: re-deliver event → consumer noop (outbox_reactive_log dedup)
- Subsystem rollup: cuando un signal está error → rollup max severity = error

## Out of Scope

- Notion workspace archive automation — V1.1 (queda como checklist item operator-driven en V1.0)
- Teams provisioning automation — V1.1
- Bidireccional HubSpot — V1.1
- Notification a operator cuando dead_letter (queda visible en `/admin/operations`; emails opcional follow-up)
- Métricas de tiempo medio onboarding/offboarding (data warehouse query, V1.1)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §13 (signals) y §14 (defense in depth).

Patrón canónico reactive projection (TASK-771):

```ts
registerProjection({
  name: 'client_lifecycle_onboarding_completed',
  triggerEvents: ['client.lifecycle.case.completed'],
  domain: 'commercial',
  extractScope: (event) => ({
    entityId: event.payload.caseId,
    skipIf: event.payload.caseKind !== 'onboarding',
  }),
  refresh: async ({ entityId }) => {
    const caseRow = await getClientLifecycleCase(entityId)
    if (!caseRow) return { status: 'skip', reason: 'case_not_found' }
    if (caseRow.client_id) return { status: 'skip', reason: 'already_instantiated' }

    await instantiateClientForParty({
      organizationId: caseRow.organization_id,
      triggerEntity: { kind: 'client_lifecycle_case', id: entityId },
      actor: caseRow.triggered_by_user_id,
    })

    return { status: 'completed' }
  },
  maxRetries: 5,
})
```

Reliability signal pattern:

```ts
export async function getOnboardingStalledSignal(): Promise<ReliabilitySignal> {
  const result = await query<{ count: number }>(`
    SELECT count(*)::int AS count FROM greenhouse_core.client_lifecycle_cases
    WHERE case_kind='onboarding' AND status='in_progress'
      AND updated_at < now() - INTERVAL '14 days'
  `)
  return {
    name: 'client.lifecycle.onboarding_stalled',
    kind: 'drift',
    severity: result.count > 0 ? 'warning' : 'ok',
    value: result.count,
    steady: 0,
    subsystem: 'Commercial Health',
  }
}
```

## Acceptance Criteria

- [ ] 6 reliability signals registrados y wired a `getReliabilityOverview`
- [ ] Subsystem `Commercial Health` rollup max severity wins
- [ ] 3 reactive consumers registrados via `registerProjection`
- [ ] `archiveClientForParty` y `revokeClientUsersAccess` existen como helpers canónicos
- [ ] `reactivateClientForParty` existe (creado o pre-existente)
- [ ] Cascade consumer onboarding: completed event → instantiate (verificable via SQL post-event)
- [ ] Cascade consumer offboarding: completed event → archive + revoke + outcomes propagated
- [ ] Cascade consumer reactivation: completed event → flip active + lifecycle_stage
- [ ] Idempotency: re-deliver mismo event → noop (outbox_reactive_log dedup)
- [ ] Dead_letter: forzar fail 5x → dead_letter + signal count > 0
- [ ] `blocker_override_anomaly_rate` signal triggers warning con > 3 overrides/30d
- [ ] Visible en `/admin/operations` con datos reales de staging
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test src/lib/reliability/queries src/lib/sync/projections` verde
- [ ] Smoke E2E: open offboarding → resolve → verificar archive + revoke + outcomes en PG (en staging)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/reliability/queries src/lib/sync/projections`
- Smoke en staging: invocar `resolveLifecycleCase` → verificar `client.lifecycle.case.completed` v1 en outbox → ops-worker procesa en < 5min → verificar PG state + reliability signal `cascade_dead_letter=0`
- `pnpm staging:request /admin/operations` → verificar 6 signals visibles bajo Commercial Health

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-821 puede tomar
- [ ] Si emergió helper canónico nuevo (e.g., `archiveClientForParty`), documentar en `GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` Delta

## Follow-ups

- Notion archive automation (V1.1) — agregar projection que escucha `case.completed` con `caseKind='offboarding'` y dispara archive Notion API
- Teams provisioning (V1.1)
- Email notification al operator cuando `cascade_dead_letter > 0` (depende de TASK-716 Notification Hub)
- Threshold tuning de `blocker_override_anomaly_rate` post 30d de baseline real

## Open Questions

- ¿`reactivateClientForParty` debe restaurar terms y assignments del case anterior, o requiere reinstalar desde cero? Recomendación: V1.0 reinstala desde cero (operator-driven via checklist `reactivation_v1`); restore automático queda V1.1.
- ¿Cuándo emit `engagement.outcome_recorded` desde offboarding consumer, qué `outcome_kind` por default? Recomendación: leer `case.metadata_json.churn_reason`; default a `cancelled_by_client` si trigger_source='churn_signal'`, `cancelled_by_provider` si manual sin razón cliente-driven.
