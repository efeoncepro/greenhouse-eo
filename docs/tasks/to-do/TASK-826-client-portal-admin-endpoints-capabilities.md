# TASK-826 — Client Portal Admin Endpoints + 7 Capabilities + Audit + UI Admin

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-015`
- Status real: `Diseno (TASK-824 cerrada 2026-05-12; bloqueada por TASK-825 resolver)`
- Rank: `TBD`
- Domain: `client_portal`
- Blocked by: `TASK-825`
- Branch: `task/TASK-826-client-portal-admin`

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
- Audit log writer + 6 outbox events v1
- 7 capabilities granulares declaradas y consumidas
- 7 endpoints HTTP admin bajo `/api/admin/client-portal/*`
- 2 surfaces UI admin: per-organization modules, catalog management
- Tests integration capability + idempotency + audit
- Cache invalidation desde commands → resolver fresh inmediato

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §7 (Commands), §8 (Capabilities), §9 (API), §10 (Outbox), §16 (Hard Rules)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (extender con 6 events nuevos)

Reglas obligatorias:

- Comandos atomic via `withTransaction`
- Idempotency: si existe assignment activo con mismo (org, module, status), devolver el existente
- Audit append-only en cada cambio
- Outbox events v1 con `payload_json.version=1`
- Reason redacted via `redactSensitive`
- Capability granular per acción (enable, disable, pause, override_business_line_default, catalog.manage)
- Override `business_line_default` SOLO EFEONCE_ADMIN + reason ≥ 20 chars
- Cache invalidation: cada command llama `__clearClientPortalResolverCache(orgId)` post-tx
- Endpoints usan `requireServerSession` + `can()` granular

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

- `src/lib/client-portal/commands/enable-module.ts`
- `src/lib/client-portal/commands/pause-resume.ts`
- `src/lib/client-portal/commands/expire-churn.ts`
- `src/lib/client-portal/commands/audit.ts` (recordAssignmentEvent helper)
- `src/lib/client-portal/commands/__tests__/*.test.ts`
- `src/app/api/admin/client-portal/organizations/[organizationId]/modules/route.ts` (GET + POST)
- `src/app/api/admin/client-portal/assignments/[assignmentId]/route.ts` (PATCH + DELETE)
- `src/app/api/admin/client-portal/catalog/route.ts` (GET + POST)
- `src/app/api/admin/client-portal/catalog/[moduleKey]/route.ts` (PUT effective_to)
- `src/app/(dashboard)/admin/client-portal/organizations/[organizationId]/modules/page.tsx`
- `src/app/(dashboard)/admin/client-portal/catalog/page.tsx`
- `src/views/greenhouse/admin/client-portal/AssignmentsView.tsx`
- `src/views/greenhouse/admin/client-portal/CatalogView.tsx`
- `src/lib/auth/capabilities.ts` (extender con 7 capabilities)
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` (Delta 6 events)

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

### Slice 1 — Audit log writer + outbox events declaration

- `recordAssignmentEvent({assignmentId, eventKind, fromStatus?, toStatus?, payload, actor, client})`
- Extender `EVENT_CATALOG_V1.md` con 6 events:
  - `client.portal.module.assignment.created` v1
  - `client.portal.module.assignment.status_changed` v1
  - `client.portal.module.assignment.churned` v1
  - `client.portal.catalog.module.declared` v1
  - `client.portal.catalog.module.deprecated` v1
  - `client.portal.migration.legacy_backfill.completed` v1 (TASK-829 emit)

### Slice 2 — `enableClientPortalModule`

- Atomic tx: validar idempotency → INSERT assignment con status='active' (o 'pilot' si expires_at) → audit + outbox `created` v1
- Invalida cache `__clearClientPortalResolverCache(orgId)`
- Validar `business_line` match con organization (excepto override capability + reason ≥ 20)

### Slice 3 — `pauseClientPortalModule` / `resumeClientPortalModule`

- Status transitions: active→paused, paused→active
- Audit + outbox `status_changed` v1
- Cache invalidation

### Slice 4 — `expireClientPortalModule` / `churnClientPortalModule`

- `expire`: SET effective_to=hoy + status='expired'
- `churn`: SET effective_to=hoy + status='churned' (post-offboarding)
- Audit + outbox correspondiente
- Cache invalidation

### Slice 5 — Capabilities + endpoints

- 7 capabilities en catálogo (per spec §8)
- 7 endpoints HTTP listed §9
- Auth: requireServerSession + can() granular
- Body validation Zod
- Errors via redactErrorForResponse + captureWithDomain

### Slice 6 — UI Admin

- `/admin/client-portal/organizations/[orgId]/modules` — listing + actions (enable/pause/resume/expire/churn)
- `/admin/client-portal/catalog` — read + create new module
- Vuexy primitives + tokens-only
- Microcopy via skill `greenhouse-ux-writing`

### Slice 7 — Tests integration

- Capability: enable sin capability → 403
- Idempotency: doble enable mismo (org, module) → mismo assignment_id, no duplicate
- Override: business_line mismatch sin override capability → 403
- Override: con capability + reason >= 20 → 200 + outbox blocker.overridden
- Cache invalidation: enable → resolver inmediato refleja
- Audit append-only: UPDATE en module_assignment_events → falla
- Catalog: PUT existing module campos críticos → falla (append-only trigger)

## Out of Scope

- Cliente self-service enable — V1.1
- Pricing automation — V1.1
- Composition layer UI cliente — TASK-827
- Cascade reactive consumer — TASK-828
- Reliability signals — TASK-829

## Detailed Spec

Ver `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §7 + §8. Patrón canónico:

```ts
export async function enableClientPortalModule(input: {
  organizationId: string
  moduleKey: string
  status?: 'active' | 'pilot' | 'pending'
  source: AssignmentSource
  sourceRefJson?: Record<string, unknown>
  effectiveFrom: string
  expiresAt?: string
  approvedByUserId: string
  reason?: string
  overrideBusinessLineMismatch?: boolean
  overrideReason?: string
}, client?: Kysely | Transaction): Promise<{ assignmentId, status }> {
  return withTransaction(async (tx) => {
    // 1. Idempotency check: existing active assignment
    const existing = await tx.selectFrom('greenhouse_client_portal.module_assignments')
      .selectAll()
      .where('organization_id', '=', input.organizationId)
      .where('module_key', '=', input.moduleKey)
      .where('effective_to', 'is', null)
      .executeTakeFirst()

    if (existing && existing.status === (input.status ?? 'active')) {
      return { assignmentId: existing.assignment_id, status: existing.status }
    }

    // 2. Validate business_line mismatch
    const module = await getModuleFromCatalog(input.moduleKey, tx)
    const org = await getOrganization(input.organizationId, tx)
    if (module.business_line !== 'cross' && module.business_line !== org.businessLine) {
      if (!input.overrideBusinessLineMismatch || !input.overrideReason || input.overrideReason.length < 20) {
        throw new BusinessLineMismatchError(...)
      }
    }

    // 3. INSERT assignment + audit event + outbox event
    const assignmentId = `cpma-${randomUUID()}`
    await tx.insertInto('greenhouse_client_portal.module_assignments')...
    await recordAssignmentEvent({ assignmentId, eventKind: 'enabled', toStatus: input.status, ...}, tx)
    await publishOutboxEvent('client.portal.module.assignment.created', { ...payload, version: 1 }, tx)

    return { assignmentId, status }
  }).then(result => {
    __clearClientPortalResolverCache(input.organizationId)
    return result
  })
}
```

## Acceptance Criteria

- [ ] 5 comandos atómicos exportados (enable, pause, resume, expire, churn)
- [ ] `recordAssignmentEvent` reusable con `client?` opcional
- [ ] 7 capabilities declaradas y consumidas
- [ ] 7 endpoints HTTP funcionando
- [ ] 6 outbox events v1 declarados en EVENT_CATALOG
- [ ] Idempotency tested (no duplicate active per (org, module))
- [ ] Business_line override require capability EFEONCE_ADMIN + reason >= 20
- [ ] Cache invalidation post-tx funciona (resolver fresh)
- [ ] UI admin funciona en `/admin/client-portal/organizations/[orgId]/modules`
- [ ] UI catalog en `/admin/client-portal/catalog`
- [ ] Errors sanitizados (sin stack)
- [ ] Audit append-only enforced (UPDATE → falla)
- [ ] Catalog append-only enforced (UPDATE business_line → falla)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde
- [ ] DESIGN.md CI gate verde si UI agregada

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/client-portal/commands src/app/api/admin/client-portal`
- Smoke staging: enable módulo addon a cliente test → verify resolver refleja → verify outbox event en BQ < 5min

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado con 7 capabilities introducidas
- [ ] Chequeo cruzado: TASK-827, TASK-828, TASK-829 desbloqueadas
- [ ] EVENT_CATALOG Delta agregado

## Follow-ups

- Self-service request flow (V1.1)
- Pricing engine integration (V1.1)
- OpenAPI doc para namespace `/api/admin/client-portal/*` (V1.1)

## Open Questions

- ¿Pause sin reason permitido? Recomendación: reason opcional pero recomendado; sin reason = audit con `reason='paused_no_reason_provided'`.
- ¿Catalog management UI permite crear modules desde UI o solo via SQL/migration? Recomendación: V1.0 read-only desde UI; create via migration solamente; V1.1 full UI write con flag.
