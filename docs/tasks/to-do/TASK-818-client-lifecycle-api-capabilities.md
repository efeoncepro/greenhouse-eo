# TASK-818 — Client Lifecycle API Surface + Capabilities

## Delta 2026-05-07 — Bow-tie alignment

Agrega capability + endpoint para classifier override (Bow-tie alignment via `GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` §5.4).

Adiciones obligatorias:

1. **Capability nueva**:
   - `client.lifecycle.classify` (action=update, scope=tenant) — permite operador forzar `client_kind` cuando regla automática no aplica
   - Allowed: commercial_admin, EFEONCE_ADMIN
   - Reason ≥ 20 chars enforced server-side por el comando `overrideClientKind` (defense in depth)

2. **Endpoint nuevo**:
   - `POST /api/admin/clients/[organizationId]/classify` — Body `{forcedKind: 'active'|'self_serve'|'project', reason}` → invoca `overrideClientKind`
   - `GET /api/admin/clients/[organizationId]/classification-history` — devuelve últimos N rows de `client_kind_history` con rationale

3. **Acceptance criteria adicional**:
   - [ ] Capability `client.lifecycle.classify` declarada
   - [ ] POST endpoint `/classify` rechaza con 400 si `reason.length < 20`
   - [ ] POST endpoint `/classify` con `forcedKind` no en enum → 400
   - [ ] GET `/classification-history` paginado cursor-based
   - [ ] Tests integration: capability scoping + reason validation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial`
- Blocked by: `TASK-817`
- Branch: `task/TASK-818-client-lifecycle-api`

## Summary

Expone los comandos canónicos del módulo Client Lifecycle V1 vía 6 endpoints HTTP bajo `/api/admin/clients/*` con 6 capabilities granulares (least-privilege per spec §8), redaction completa de errores, y guards `requireServerSession` + `can()`. Cubre: abrir/cerrar cases, avanzar checklist, leer estado, gestionar templates (admin only).

## Why This Task Exists

Sin API HTTP, los comandos TS de TASK-817 son inaccesibles para UI (TASK-819) y webhooks (TASK-821). El acceso debe ir gateado por capabilities granulares — NO reusar `commercial.admin` catch-all (anti-pattern explícito en CLAUDE.md). Cada acción crítica (open, advance, resolve, override) tiene su propia capability con scope (`tenant`) y owner role validation.

## Goal

- 6 endpoints HTTP bajo `/api/admin/clients/*` con auth + capability + redaction
- 6 capabilities granulares declaradas y consumidas:
  - `client.lifecycle.case.read`
  - `client.lifecycle.case.open`
  - `client.lifecycle.case.advance`
  - `client.lifecycle.case.resolve`
  - `client.lifecycle.case.override_blocker` (EFEONCE_ADMIN solo)
  - `client.lifecycle.template.manage` (EFEONCE_ADMIN solo)
- `advance` valida que el `actor` tiene capability matching el `owner_role` del item
- Errors via `redactErrorForResponse` + `captureWithDomain`
- Tests integration de permisos por endpoint

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §8 (Capabilities), §9 (API Surface)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability platform
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — lanes admin-tenant
- `CLAUDE.md` sección "Auth en server components" — `requireServerSession` + `can()`

Reglas obligatorias:

- Cada endpoint usa `requireServerSession` + `can(subject, capability, action, scope)` (NO middleware ad-hoc)
- Errors NUNCA exponen `error.stack` ni `error.message` raw; siempre via `redactErrorForResponse`
- Capability granular per acción — NUNCA reusar `commercial.admin` catch-all
- `advance` valida granularmente: capability `client.lifecycle.case.advance` + match con `owner_role` del item (si item es `owner_role='finance'`, actor debe estar en grupo finance o ser EFEONCE_ADMIN)
- `override_blocker` y `template.manage` restringidos a EFEONCE_ADMIN exclusivamente
- Cursor-based pagination en listing global (no OFFSET)
- Body validation con Zod o helper canónico antes de invocar comandos
- 500 responses sanitizados — sin env leakage

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §8, §9
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Dependencies & Impact

### Depends on

- TASK-817 (comandos canónicos)
- Capability platform `can()` ✅ existe
- `requireServerSession` ✅ existe
- `redactErrorForResponse` ✅ existe

### Blocks / Impacts

- TASK-819 (UI) — consume los endpoints
- TASK-821 (HubSpot webhook) — invoca `provisionClientLifecycle` directo via comando, NO via HTTP (interno al servidor)

### Files owned

- `src/app/api/admin/clients/[organizationId]/lifecycle/route.ts` — GET active case + history
- `src/app/api/admin/clients/[organizationId]/lifecycle/onboarding/route.ts` — POST open onboarding
- `src/app/api/admin/clients/[organizationId]/lifecycle/offboarding/route.ts` — POST open offboarding
- `src/app/api/admin/clients/[organizationId]/lifecycle/reactivation/route.ts` — POST open reactivation
- `src/app/api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]/route.ts` — PATCH advance item
- `src/app/api/admin/clients/lifecycle/cases/[caseId]/resolve/route.ts` — POST resolve case
- `src/app/api/admin/clients/lifecycle/cases/route.ts` — GET listing global con filtros
- `src/app/api/admin/clients/lifecycle/templates/route.ts` — GET + POST templates
- `src/app/api/admin/clients/lifecycle/templates/[templateCode]/route.ts` — PUT template
- `src/app/api/admin/clients/lifecycle/health/route.ts` — GET platform-health.v1 extension
- `src/lib/client-lifecycle/api/zod-schemas.ts` — body validation
- `src/lib/client-lifecycle/api/owner-role-guard.ts` — granular capability matching item.owner_role
- `src/lib/auth/capabilities.ts` (extender catálogo con 6 nuevas)

## Current Repo State

### Already exists

- Capability platform (`src/lib/auth/capabilities.ts` con `can()`)
- `requireServerSession` (`src/lib/auth/require-server-session.ts`)
- `redactErrorForResponse` + `captureWithDomain`
- Patrones canónicos de admin endpoints en `src/app/api/admin/finance/*` (TASK-720/721/766/772)

### Gap

- No existen endpoints para client lifecycle
- No están declaradas las 6 capabilities en el catálogo
- No hay helper para validar owner_role granularmente al avanzar checklist

## Scope

### Slice 1 — Capabilities declaration

- Extender `src/lib/auth/capabilities.ts` (o equivalente) con 6 capabilities nuevas:
  - `client.lifecycle.case.read` → commercial / finance / operations / hr (read-only)
  - `client.lifecycle.case.open` → commercial_admin / finance_admin / EFEONCE_ADMIN
  - `client.lifecycle.case.advance` → commercial / finance / operations (further filtered by item.owner_role)
  - `client.lifecycle.case.resolve` → commercial_admin / finance_admin / EFEONCE_ADMIN
  - `client.lifecycle.case.override_blocker` → EFEONCE_ADMIN solo
  - `client.lifecycle.template.manage` → EFEONCE_ADMIN solo
- Tests unit del catálogo

### Slice 2 — Helpers

- Zod schemas para todos los body shapes (provision, deprovision, advance, resolve)
- `validateOwnerRoleAccess(actor, itemOwnerRole)` — devuelve boolean; cubre matching `commercial`, `finance`, `operations`, `hr`, `identity`, `it`, EFEONCE_ADMIN bypass

### Slice 3 — Endpoints read

- `GET /api/admin/clients/[organizationId]/lifecycle` — devuelve active case (or null) + last 5 historical + checklist con status agregado
- `GET /api/admin/clients/lifecycle/cases?status=&kind=&overdue=&cursor=` — listing paginado cursor-based
- `GET /api/admin/clients/lifecycle/health` — extiende platform-health.v1 con counters: open_cases, overdue, blocked, by_kind

### Slice 4 — Endpoints write (open)

- `POST /api/admin/clients/[organizationId]/lifecycle/onboarding`
- `POST /api/admin/clients/[organizationId]/lifecycle/offboarding`
- `POST /api/admin/clients/[organizationId]/lifecycle/reactivation`
- Body: `{triggerSource, reason?, effectiveDate, targetCompletionDate?, templateCode?, previousCaseId?}`
- Auth: capability `client.lifecycle.case.open`
- Response: `{caseId, status, blockers[], checklistItems[]}` (201)

### Slice 5 — Endpoints write (advance + resolve)

- `PATCH /api/admin/clients/lifecycle/cases/[caseId]/items/[itemCode]`
  - Body: `{newStatus, evidenceAssetId?, notes?, blockedReason?}`
  - Auth: capability `client.lifecycle.case.advance` + `validateOwnerRoleAccess` per item
- `POST /api/admin/clients/lifecycle/cases/[caseId]/resolve`
  - Body: `{resolution: 'completed'|'cancelled', resolutionReason?, overrideBlockers?, overrideReason?}`
  - Auth: capability `client.lifecycle.case.resolve`; si `overrideBlockers=true` requiere también `client.lifecycle.case.override_blocker`

### Slice 6 — Templates admin endpoints

- `GET /api/admin/clients/lifecycle/templates` — read
- `POST /api/admin/clients/lifecycle/templates` — crear nuevo template (e.g., `enterprise_onboarding_v1`)
- `PUT /api/admin/clients/lifecycle/templates/[templateCode]` — deprecar (set `effective_to`) o agregar items nuevos (sin modificar items existentes — append-only)
- Auth: `client.lifecycle.template.manage` (EFEONCE_ADMIN solo)

### Slice 7 — Tests integration

- 6 endpoints × { authorized | forbidden | bad input | happy path } = 24 casos mínimos
- Mock de session con distintos roles
- Verificar redaction: errors NO exponen `error.stack`
- Verificar capability granular en `advance` (commercial actor no puede avanzar item con owner_role='finance')

## Out of Scope

- UI consuming the endpoints — TASK-819
- HubSpot webhook calling `provisionClientLifecycle` (lo hace internamente via TS, no via HTTP) — TASK-821
- Bidireccional HubSpot — V1.1
- Cliente portal endpoints (estos son admin-tenant exclusivamente) — V1.2

## Detailed Spec

Ver `GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §8 + §9 para shape completo. Patrones canónicos a aplicar:

```ts
// Endpoint shape canónico
export async function POST(req: Request, { params }: { params: { organizationId: string } }) {
  try {
    const session = await requireServerSession()
    const subject = await getCapabilitySubject(session)

    if (!await can(subject, 'client.lifecycle.case.open', 'create', 'tenant')) {
      return new Response('Forbidden', { status: 403 })
    }

    const body = ProvisionInputSchema.parse(await req.json())
    const result = await provisionClientLifecycle({
      organizationId: params.organizationId,
      ...body,
      triggeredByUserId: session.user.id,
    })
    return Response.json(result, { status: 201 })
  } catch (err) {
    captureWithDomain(err, 'commercial', { tags: { source: 'client_lifecycle_api', endpoint: 'onboarding' }})
    return redactErrorForResponse(err)
  }
}
```

Pagination cursor canónico (TASK-720 pattern): cursor opaco `base64(JSON.stringify({lastCaseId, lastCreatedAt}))`.

## Acceptance Criteria

- [ ] 6 capabilities declaradas y consumidas vía `can()`
- [ ] 9 endpoints HTTP funcionando (6 listado §9 + 3 abrir per kind)
- [ ] 401 (no session) / 403 (no capability) / 400 (bad input) / 500 (server) sanitizados
- [ ] Errors NUNCA exponen stack ni env vars (test asserting response body shape)
- [ ] `advance` rechaza con 403 si actor no matchea `owner_role` del item (commercial actor → finance item = 403)
- [ ] `resolve` con `overrideBlockers=true` requiere AMBAS capabilities (`resolve` + `override_blocker`)
- [ ] Cursor pagination funcionando (no OFFSET)
- [ ] Listing health extiende contract `platform-health.v1`
- [ ] Body validation Zod rechaza inputs malformados (reason vacío en offboarding, etc.)
- [ ] Tests integration cubren 24+ casos (6 endpoints × 4 escenarios)
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde
- [ ] OpenAPI doc actualizado en `docs/api/` (si existe; sino, follow-up)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/app/api/admin/clients/lifecycle src/lib/client-lifecycle/api`
- Smoke manual via `pnpm staging:request` o curl con bypass: `POST /api/admin/clients/<orgId>/lifecycle/onboarding` con session válida → 201 + caseId

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si capabilities introducidas
- [ ] Chequeo cruzado: TASK-819 desbloqueada
- [ ] Si introduce nueva capability granular, documentar en `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Follow-ups

- OpenAPI / Swagger doc para el client lifecycle namespace (V1.1)
- Considerar rate limiting en open endpoints si abuse pattern emerge

## Open Questions

- ¿`override_blocker` capability requiere también `reason >= 20` o lo enforce el comando TS? Recomendación: comando TS lo enforce (defense in depth + single source of truth).
- ¿Health endpoint expone breakdown por owner_role o solo agregado? Recomendación: agregado en V1.0; breakdown en V1.1 si UI lo necesita.
