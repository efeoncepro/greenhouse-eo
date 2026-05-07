# TASK-829 — Client Portal Reliability Signals + Legacy Backfill Idempotente

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `client_portal / platform`
- Blocked by: `TASK-828`
- Branch: `task/TASK-829-client-portal-reliability-backfill`

## Summary

Cierra V1.0 EPIC-015: 6 reliability signals registrados bajo nuevo subsystem `Client Portal Health`, backfill idempotente desde legacy `tenant_capabilities` con dry-run obligatorio, y validación end-to-end del flow completo en producción. Ejecuta migración Fase A (dry-run staging) → Fase B (apply staging) → Fase C (apply producción).

## Why This Task Exists

Sin reliability signals, casos atascados (orphan modules, lifecycle drift, dead_letter cascade) son invisibles para ops. Sin backfill, los clientes activos hoy NO tienen assignments materializados — el portal seguiría usando `tenant_capabilities` legacy hasta migrar manualmente cada uno. La task cierra el ciclo: signals detectan drift, backfill resuelve cohort histórico, V1.0 entra en producción con cobertura completa.

## Goal

- 6 reliability signals registrados bajo subsystem `Client Portal Health`
- Subsystem rollup en `getReliabilityOverview` con max severity wins
- Visible en `/admin/operations`
- Backfill `migrateClientPortalAssignmentsFromLegacy` con dry-run + apply
- Migration Fase A (staging dry-run): output proposedAssignments + driftDetected reviewed con stakeholders
- Migration Fase B (staging apply): signal `lifecycle_module_drift` = 0 post-cutover
- Migration Fase C (production apply): mismo verification + Handoff documentado
- Outbox event `client.portal.migration.legacy_backfill.completed` v1

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §13 (Reliability), §19 (Migration Strategy)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- CLAUDE.md sección "Reliability dashboard hygiene"

Reglas obligatorias:

- Reliability signals via `RELIABILITY_REGISTRY` (NO endpoints paralelos)
- Cada signal tiene `kind`, `severity`, `steady` declarados; queries puras
- Backfill `dryRun=true` por default; `dryRun=false` requires capability `client_portal.assignment.migrate_legacy` (EFEONCE_ADMIN solo)
- Backfill idempotent — reusa `enableClientPortalModule` (UNIQUE partial previene duplicados)
- Cada apply emit outbox event `migration.legacy_backfill.completed` v1
- Errors via `captureWithDomain(err, 'client_portal', { tags: { source: 'reliability'|'backfill' } })`
- Subsystem rollup `Client Portal Health` extiende registry existente

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §13, §19

## Dependencies & Impact

### Depends on

- TASK-828 (cascade funcional)
- TASK-826 (commands `enableClientPortalModule`)
- `RELIABILITY_REGISTRY` ✅
- `tenant_capabilities` legacy (HubSpot-derived) ✅

### Blocks / Impacts

- Cierre EPIC-015 V1.0
- Producción ready para nuevos onboardings + migración cohort histórico

### Files owned

- `src/lib/reliability/queries/client-portal-orphan-module-key.ts`
- `src/lib/reliability/queries/client-portal-lifecycle-module-drift.ts`
- `src/lib/reliability/queries/client-portal-cascade-dead-letter.ts`
- `src/lib/reliability/queries/client-portal-business-line-mismatch.ts`
- `src/lib/reliability/queries/client-portal-pilot-expired-not-actioned.ts`
- `src/lib/reliability/queries/client-portal-churned-with-active-session.ts`
- `src/lib/reliability/registry/client-portal-health.ts` (subsystem nuevo)
- `src/lib/client-portal/migration/migrate-legacy.ts`
- `src/lib/client-portal/migration/infer-modules-from-legacy.ts`
- `src/app/api/admin/client-portal/migration/backfill/route.ts`
- `scripts/client-portal/migrate-legacy.ts` (CLI wrapper)
- `src/lib/client-portal/migration/__tests__/*.test.ts`

## Current Repo State

### Already exists

- TASK-828 cascade funcional
- Reliability platform + subsystem rollup
- `tenant_capabilities` con `businessLines/serviceModules` legacy
- Modules canonizados (TASK-824 seed)

### Gap

- No existen reliability queries para client_portal
- No existe subsystem `Client Portal Health`
- No existe backfill idempotente
- Cohort histórico de clientes no tiene assignments materializados

## Scope

### Slice 1 — Reliability signals (6 readers)

Por cada signal: archivo en `src/lib/reliability/queries/<name>.ts` con query pura. Wire-up en subsystem `Client Portal Health`:

1. **`client_portal.assignment.orphan_module_key`** — `kind=data_quality, severity=error, steady=0`
   - Query: `SELECT count(*) FROM module_assignments a LEFT JOIN modules m USING(module_key) WHERE a.effective_to IS NULL AND m.module_key IS NULL`
2. **`client_portal.assignment.lifecycle_module_drift`** — `kind=drift, severity=warning, steady=0`
   - Query: clientes con `organizations.lifecycle_stage='active_client'` AND zero assignments activos AND `lifecycle_stage_since < now() - INTERVAL '14 days'`
3. **`client_portal.cascade.dead_letter`** — `kind=dead_letter, severity=error, steady=0`
   - Query: `outbox_events.status='dead_letter' AND event_kind LIKE 'client.portal.%' OR (event_kind='client.lifecycle.case.completed' AND error LIKE '%client_portal%')`
4. **`client_portal.assignment.business_line_mismatch`** — `kind=drift, severity=warning, steady=0`
   - Query: assignments cuyo `module.business_line` distinto a `org.business_line` excepto `cross`
5. **`client_portal.assignment.pilot_expired_not_actioned`** — `kind=drift, severity=warning, steady=0`
   - Query: assignments `status='pilot' AND expires_at < now() AND effective_to IS NULL`
6. **`client_portal.assignment.churned_with_active_session`** — `kind=drift, severity=error, steady=0`
   - Query: client_users con session activa últimos 7d cuya org tiene `lifecycle_stage IN ('inactive','churned')` AND existen assignments `status NOT IN ('expired','churned')`

### Slice 2 — Subsystem `Client Portal Health` registry

- `src/lib/reliability/registry/client-portal-health.ts` con declaración del subsystem + 6 signals
- Wire-up en `getReliabilityOverview`
- Subsystem rollup: max severity wins
- `incidentDomainTag: 'client_portal'` (domain Sentry)

### Slice 3 — Backfill `migrateClientPortalAssignmentsFromLegacy`

- `src/lib/client-portal/migration/migrate-legacy.ts`
- Lee `organizations` con `tenant_type='client'` y `lifecycle_stage='active_client'`
- Para cada org:
  - Lee `tenant_capabilities.businessLines/serviceModules` legacy
  - Mapea legacy → modules canonical via helper `inferModulesFromLegacySignals`
  - Compara con assignments existentes → calcula drift
  - Si `dryRun=false`: invoca `enableClientPortalModule({source:'migration_backfill', ...})` per inferred module
- Idempotency: re-llamar es safe (UNIQUE partial garantiza no duplicates)
- Output: `{proposedAssignments[], driftDetected[], applied: boolean}`

### Slice 4 — Mapping helper `inferModulesFromLegacySignals`

- Reglas declarativas:
  - `businessLines.includes('globe')` → `creative_hub_globe_v1` + `equipo_asignado` + `pulse`
  - `businessLines.includes('wave')` → `web_delivery` + `equipo_asignado`
  - `businessLines.includes('crm_solutions')` → `crm_command_legacy` + `equipo_asignado`
  - `businessLines.includes('staff_aug')` → `staff_aug_visibility` + `equipo_asignado`
  - `serviceModules.includes('roi')` → agregar `roi_reports`
  - `serviceModules.includes('cvr')` → agregar `cvr_quarterly`
  - `serviceModules.includes('brand_intelligence')` → agregar `brand_intelligence`
  - `serviceModules.includes('csc')` → agregar `csc_pipeline`
- Reglas en config declarativo, no hardcoded en if/else

### Slice 5 — Admin endpoint backfill

- `POST /api/admin/client-portal/migration/backfill`
- Body: `{dryRun: boolean, organizationIds?: string[]}`
- Capability: `client_portal.assignment.migrate_legacy` (EFEONCE_ADMIN solo)
- Response: `{proposedAssignments, driftDetected, applied}`
- Outbox event `client.portal.migration.legacy_backfill.completed` v1 cuando `applied=true`

### Slice 6 — CLI wrapper

- `scripts/client-portal/migrate-legacy.ts`
- Args: `--dry-run` (default true), `--apply` (require explicit), `--orgs <comma-separated-ids>`
- Output: pretty-print + JSON dump a `/tmp/client-portal-migration-<timestamp>.json`

### Slice 7 — Tests

- Reliability queries: 6 readers cubiertos con tests unitarios + edge cases (empty, threshold violated)
- Backfill idempotency: dry-run no muta, apply mutates, re-apply noop
- Mapping helper: 4 business lines x cubierto + edge cases (multi-business-line, vacío)
- E2E: backfill staging → signals = 0 post-cutover

### Slice 8 — Migration execution Fase A→C

- **Fase A staging**: `pnpm tsx scripts/client-portal/migrate-legacy.ts --dry-run` → output reviewed con stakeholders comerciales
- **Fase B staging**: `pnpm tsx scripts/client-portal/migrate-legacy.ts --apply` → verify `lifecycle_module_drift` = 0 + `orphan_module_key` = 0
- **Fase C producción**: con flag explícito + EFEONCE_ADMIN trigger via UI admin → mismo verification
- Documentar resultados en Handoff.md

## Out of Scope

- Notification a clientes cuando backfill apply (V1.1)
- Deprecation lectura de `tenant_capabilities` legacy del path client-portal (V1.1)
- Cleanup de modules huérfanos via UI (V1.1; V1.0 detect via signal, manual fix)
- BQ projection de adoption metrics (separate task V1.1)

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §13 + §19.

```ts
// src/lib/client-portal/migration/migrate-legacy.ts
export async function migrateClientPortalAssignmentsFromLegacy({
  dryRun = true,
  organizationIds,
}: { dryRun?: boolean; organizationIds?: string[] }): Promise<MigrationResult> {
  const orgs = organizationIds
    ? await getOrganizationsByIds(organizationIds)
    : await listAllActiveClientOrganizations()

  const proposedAssignments: ProposedAssignment[] = []
  const driftDetected: DriftRecord[] = []

  for (const org of orgs) {
    const businessLines = org.tenant_capabilities?.businessLines ?? []
    const serviceModules = org.tenant_capabilities?.serviceModules ?? []
    const inferred = inferModulesFromLegacySignals(businessLines, serviceModules)

    proposedAssignments.push({ organizationId: org.id, modules: inferred })

    const existing = await listActiveAssignments(org.id)
    const drift = computeDrift(existing.map(a => a.module_key), inferred)
    if (drift.added.length > 0 || drift.removed.length > 0) {
      driftDetected.push({ organizationId: org.id, ...drift })
    }
  }

  if (dryRun) return { dryRun: true, proposedAssignments, driftDetected, applied: false }

  let appliedCount = 0
  for (const { organizationId, modules } of proposedAssignments) {
    for (const moduleKey of modules) {
      await enableClientPortalModule({
        organizationId,
        moduleKey,
        source: 'migration_backfill',
        sourceRefJson: { migrationBatch: new Date().toISOString() },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        approvedByUserId: SYSTEM_USER_ID,
        status: 'active',
      })
      appliedCount++
    }
  }

  await publishOutboxEvent('client.portal.migration.legacy_backfill.completed', {
    version: 1,
    proposedCount: proposedAssignments.flatMap(p => p.modules).length,
    appliedCount,
    driftCount: driftDetected.length,
    timestamp: new Date().toISOString(),
  })

  return { dryRun: false, proposedAssignments, driftDetected, applied: true, appliedCount }
}
```

## Acceptance Criteria

- [ ] 6 reliability signals registrados y wired
- [ ] Subsystem `Client Portal Health` rollup max severity
- [ ] Visible en `/admin/operations` con datos reales staging
- [ ] Backfill `dryRun=true` no muta DB (idempotent verified)
- [ ] Backfill `dryRun=false` invoca `enableClientPortalModule` per inferred module
- [ ] Backfill re-apply es noop (UNIQUE partial dedupes)
- [ ] Mapping helper cubre 4 business lines + multi-line + empty
- [ ] CLI wrapper produce dry-run output + JSON dump
- [ ] Admin endpoint `/api/admin/client-portal/migration/backfill` con capability check
- [ ] Outbox event `migration.legacy_backfill.completed` v1 emitted on apply
- [ ] **Fase A staging**: dry-run output reviewed + stakeholder approval
- [ ] **Fase B staging**: apply ejecutado + signals = 0 post-cutover
- [ ] **Fase C producción**: apply ejecutado + signals = 0 + Handoff documentado
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde
- [ ] EPIC-015 V1.0 cierra

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/reliability/queries src/lib/client-portal/migration`
- Smoke staging Fase A: `pnpm tsx scripts/client-portal/migrate-legacy.ts --dry-run` → review output
- Smoke staging Fase B: `pnpm tsx scripts/client-portal/migrate-legacy.ts --apply` → verify signals via `/admin/operations`
- Producción Fase C: `POST /api/admin/client-portal/migration/backfill` con `{dryRun: false}` desde admin UI → verify signals

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con resultados Fase A/B/C
- [ ] `changelog.md` actualizado con backfill executed
- [ ] EPIC-015 V1.0 marked como ready-for-completion
- [ ] Documentación funcional `docs/documentation/client-portal/` creada
- [ ] CLAUDE.md sección "Client Portal Domain (TASK-822..829)" agregada

## Follow-ups

- V1.1: deprecation lectura de `tenant_capabilities` legacy del path client-portal (después de 90d producción estable)
- V1.1: notification al cliente cuando módulo enabled/churned via cascade
- V1.1: BQ projection adoption metrics (qué módulos generan más revenue)
- V1.1: cleanup UI para orphan module_keys

## Open Questions

- ¿Backfill apply en producción ejecuta para TODOS los clientes activos en una sola corrida o batched? Recomendación: batched de 50 clientes a la vez para limitar blast radius en caso de bug; cada batch su outbox event individual.
- ¿`SYSTEM_USER_ID` para audit trail del backfill o usuario humano que dispara? Recomendación: usuario humano (EFEONCE_ADMIN) que invoca el endpoint — preserva accountability.
- ¿Re-correr backfill cada 24h como sweep de drift o solo una vez al cutover? Recomendación: solo cutover en V1.0; signal `lifecycle_module_drift` detecta drift continuo.
