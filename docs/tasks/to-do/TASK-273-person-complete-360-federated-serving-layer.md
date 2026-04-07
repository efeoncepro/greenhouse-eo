# TASK-273 — Person Complete 360: capa de serving federada por facetas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Critico`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`, `platform`, `identity`
- Blocked by: `none`
- Branch: `task/TASK-273-person-complete-360`
- Legacy ID: —
- GitHub Issue: —

## Summary

`person_360` solo resuelve identidad (nombre, email, avatar, job title). Todos los demas datos de una persona — asignaciones, nomina, leave, delivery, costos, organizacion — viven en tablas separadas sin federacion. Cada API hace sus propios JOINs, duplicando logica y resolviendo `profile_id → member_id` de forma ad-hoc. Esta task crea una **capa de serving federada** que consolida todo bajo un solo resolver con facetas on-demand, eliminando las queries dispersas y habilitando un `GET /api/person/{id}/360?facets=...` enterprise.

## Why This Task Exists

Hoy para armar una vista completa de una persona se necesitan 4-6 queries a tablas distintas, cada una con su propia resolucion de identity → member, su propio mapeo de avatares, y su propio fallback. Esto genera:

1. **Duplicacion de logica** — `resolveAvatarUrl()` copiada en 3 archivos, `COALESCE(p360.resolved_display_name, ...)` repetido en 5+ queries
2. **Performance** — `/my/profile` hace 4 fetches paralelos porque no existe un solo endpoint que consolide
3. **Inconsistencia** — un endpoint resuelve el nombre de una forma, otro de otra
4. **Fragilidad** — cada nueva vista que necesite datos de persona recrea la misma cadena de JOINs
5. **Gap funcional** — Mi Perfil no puede mostrar proyectos, ICO, ni nomina porque no existe un serving layer que los unifique

El resultado esperado es que cualquier consumidor (My Profile, Admin User Detail, People Detail, Agency Team) pida una persona y reciba exactamente las facetas que necesita, sin queries ad-hoc.

## Goal

- Un solo `getPersonComplete360(profileId, facets[])` server-side que retorna el objeto completo o parcial
- Un endpoint `GET /api/person/{id}/360?facets=identity,assignments,leave,payroll,delivery,costs,organization` que cualquier vista puede consumir
- Todas las vistas existentes que consultan datos de persona migran al resolver (My Profile, Admin User Detail, People Detail)
- El resolver resuelve `profile_id → member_id` una sola vez y lo pasa a cada faceta
- Cada faceta es un modulo independiente que se puede agregar sin modificar el resolver core

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` — arquitectura general
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canonico 360
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — estrategia PG + BQ

Reglas obligatorias:

- `identity_profiles.profile_id` es el anchor canonico — todo se une ahi
- `members.member_id` es el FK para datos HR/payroll/delivery — el resolver lo resuelve una vez
- Datos de persona se leen de PostgreSQL first, BigQuery fallback
- No crear tablas nuevas — esto es un serving layer sobre datos existentes
- Las vistas serving existentes (`person_360`, `person_hr_360`, `person_operational_360`) se reutilizan, no se duplican

## Normative Docs

- `migrations/20260405180048252_canonical-source-system-function-person360.sql` — definicion actual de `person_360`
- `src/lib/person-360/` — funciones existentes de persona
- `src/lib/people/get-person-detail.ts` — ejemplo de query multi-join actual
- `src/lib/person-360/get-person-finance.ts` — ejemplo de finance overview actual

## Dependencies & Impact

### Depends on

- `greenhouse_serving.person_360` — vista base de identidad (ya existe)
- `greenhouse_serving.person_operational_360` — metricas ICO por persona (ya existe)
- `greenhouse_serving.commercial_cost_attribution` — costos por persona (ya existe)
- `greenhouse_core.client_team_assignments` — asignaciones (ya existe)
- `greenhouse_hr.leave_balances` + `leave_requests` — HR leave (ya existe)
- `greenhouse_payroll.payroll_entries` + `compensation_versions` — nomina (ya existe)
- `greenhouse_delivery.projects` + `tasks` — delivery (ya existe)
- `greenhouse_core.person_memberships` — memberships organizacionales (ya existe)

### Blocks / Impacts

- TASK-011 (ICO Person 360 Integration) — esta task la subsume
- TASK-272 (My Profile) — consumidor principal, simplifica sus 4 fetches a 1
- Todas las vistas de persona (People Detail, Admin User Detail, Agency Team)
- Futuras vistas de persona (evaluaciones, career path, org chart)

### Files owned

- `src/lib/person-360/person-complete-360.ts` — resolver principal (NUEVO)
- `src/lib/person-360/facets/` — modulos por faceta (NUEVO)
- `src/app/api/person/[id]/360/route.ts` — endpoint API (NUEVO)
- `src/types/person-complete-360.ts` — tipos del objeto completo (NUEVO)

## Current Repo State

### Already exists

- `person_360` VIEW con ~50 columnas de identidad (4 facetas: identity, member, user, CRM)
- `person_hr_360` VIEW con datos HR + leave + compensation
- `person_operational_360` materialized table con ICO + capacity + costs por mes
- `person_finance_360` VIEW con payroll + expenses
- `getPersonFinanceOverviewFromPostgres()` en `src/lib/person-360/get-person-finance.ts`
- `getPersonRuntimeProfile()` en `src/lib/person-360/get-person-runtime.ts`
- `getPersonDetailFromPostgres()` en `src/lib/people/get-person-detail.ts`
- `toPersonProfileSummary()` en `src/lib/person-360/get-person-profile.ts`
- `resolveAvatarUrl()` duplicada en 3 archivos

### Gap

- No existe resolver federado — cada consumidor hace sus propios JOINs
- `person_360` solo cubre identidad (15 de 40+ columnas de `members`)
- `person_memberships` estaba en v1 de person_360, se quito en v2 — hay que reintroducirlo
- No existe endpoint unificado `/api/person/{id}/360`
- `resolveAvatarUrl` copiada en `get-person-profile.ts`, `my/organization/members/route.ts`, `my/assignments/route.ts`
- El salto `profile_id → member_id` se resuelve ad-hoc en cada query

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Types: definir PersonComplete360 con todas las facetas

Crear `src/types/person-complete-360.ts` con:

```typescript
type PersonComplete360 = {
  // Faceta core (siempre presente)
  identity: PersonIdentityFacet       // de person_360
  
  // Facetas on-demand
  assignments?: PersonAssignmentFacet[]    // client_team_assignments + team members
  organization?: PersonOrganizationFacet   // person_memberships + organizations
  leave?: PersonLeaveFacet                 // leave_balances + leave_requests summary
  payroll?: PersonPayrollFacet             // current compensation + last payroll entry
  delivery?: PersonDeliveryFacet           // projects + task counts + ICO metrics
  costs?: PersonCostFacet                  // cost attribution + capacity economics
  staffAug?: PersonStaffAugFacet           // placements si aplica
}
```

Cada faceta es una interface tipada con los campos que el consumidor necesita. No exponer raw rows — transformar a la forma que la UI consume.

### Slice 2 — Facet modules: un archivo por faceta

Crear `src/lib/person-360/facets/`:

- `identity.ts` — lee de `person_360` view, resuelve avatar URL. Es la base.
- `assignments.ts` — lee `client_team_assignments` + team members de `person_360` por space. Incluye `resolveAvatarUrl` centralizado.
- `organization.ts` — lee `person_memberships` + `organizations` + `spaces`
- `leave.ts` — lee `leave_balances` (saldos actuales) + `leave_requests` (resumen: pending, approved, last 5)
- `payroll.ts` — lee `compensation_versions` (current) + ultimo `payroll_entry`
- `delivery.ts` — lee `person_operational_360` para ICO metrics + counts de projects/tasks
- `costs.ts` — lee `commercial_cost_attribution` + `member_capacity_economics` periodo actual

Cada modulo exporta una funcion `fetchXxxFacet(memberId: string): Promise<XxxFacet>`.

### Slice 3 — Resolver: `getPersonComplete360()`

Crear `src/lib/person-360/person-complete-360.ts`:

```typescript
export async function getPersonComplete360(
  profileId: string,
  facets: PersonFacetName[] = ['identity']
): Promise<PersonComplete360> {
  // 1. Siempre: resolver identity + member_id
  const identity = await fetchIdentityFacet(profileId)
  const memberId = identity.memberId // puede ser null si no tiene faceta member
  
  // 2. Facetas on-demand en paralelo
  const [assignments, organization, leave, payroll, delivery, costs] = await Promise.all([
    facets.includes('assignments') && memberId ? fetchAssignmentsFacet(memberId) : undefined,
    facets.includes('organization') ? fetchOrganizationFacet(profileId) : undefined,
    facets.includes('leave') && memberId ? fetchLeaveFacet(memberId) : undefined,
    facets.includes('payroll') && memberId ? fetchPayrollFacet(memberId) : undefined,
    facets.includes('delivery') && memberId ? fetchDeliveryFacet(memberId) : undefined,
    facets.includes('costs') && memberId ? fetchCostsFacet(memberId) : undefined,
  ])
  
  return { identity, assignments, organization, leave, payroll, delivery, costs }
}
```

El resolver resuelve `profile_id → member_id` **una sola vez** y lo pasa a cada faceta. Las facetas que requieren `member_id` se saltan si la persona no tiene faceta member (ej: contacto CRM puro).

### Slice 4 — API endpoint: `GET /api/person/[id]/360`

Crear `src/app/api/person/[id]/360/route.ts`:

- Auth: `requireTenantContext` — cualquier usuario autenticado puede consultar personas de su organizacion
- Query param `facets` — comma-separated list de facetas a incluir (default: `identity`)
- El `[id]` acepta `profile_id`, `member_id`, `user_id`, o `eo_id` — el resolver normaliza a `profile_id`
- Respuesta: `PersonComplete360` con solo las facetas solicitadas

### Slice 5 — Migrar MyProfileView al resolver

Reescribir `MyProfileView` para usar un solo fetch:

```
GET /api/person/me/360?facets=identity,assignments,leave,organization
```

Donde `me` se resuelve al `identity_profile_id` del usuario autenticado.

Elimina los 4 fetches paralelos actuales (`/api/my/profile`, `/api/my/assignments`, `/api/my/leave`, `/api/my/organization/members`).

### Slice 6 — Migrar Admin User Detail al resolver

Reescribir las queries de `getPersonDetailFromPostgres()` y relacionadas para usar el resolver con todas las facetas.

### Slice 7 — Centralizar `resolveAvatarUrl`

Mover `resolveAvatarUrl` a `src/lib/person-360/resolve-avatar.ts` y eliminar las 3 copias actuales. Todos los facets y APIs importan de ahi.

## Out of Scope

- Crear tablas nuevas o materialized views — esto es un serving layer sobre datos existentes
- Migrar BigQuery data a PostgreSQL — se sigue usando el patron PG first, BQ fallback
- API publica/externa — el endpoint es solo para consumo interno del portal
- Caching layer (Redis, etc.) — optimizacion futura si se necesita
- Reescribir `person_360` VIEW — se reutiliza tal cual como faceta identity
- Migrar TODAS las vistas de persona en un solo PR — se hace incremental por slice

## Detailed Spec

### Facet Registry Pattern

```typescript
const FACET_REGISTRY: Record<PersonFacetName, FacetFetcher> = {
  identity: { fetch: fetchIdentityFacet, requiresMemberId: false },
  assignments: { fetch: fetchAssignmentsFacet, requiresMemberId: true },
  organization: { fetch: fetchOrganizationFacet, requiresMemberId: false },
  leave: { fetch: fetchLeaveFacet, requiresMemberId: true },
  payroll: { fetch: fetchPayrollFacet, requiresMemberId: true },
  delivery: { fetch: fetchDeliveryFacet, requiresMemberId: true },
  costs: { fetch: fetchCostsFacet, requiresMemberId: true },
  staffAug: { fetch: fetchStaffAugFacet, requiresMemberId: true },
}
```

Agregar una faceta nueva es agregar un archivo en `facets/` y registrarlo. El resolver no cambia.

### Resolution de identidad flexible

El endpoint acepta multiples identificadores:

| Input | Resolucion |
|-------|-----------|
| `profile_id` (`identity-...`) | directo |
| `member_id` (`julio-reyes`) | `members.identity_profile_id` |
| `user_id` (`user-efeonce-...`) | `client_users.identity_profile_id` |
| `eo_id` (`EO-ID0001`) | `identity_profiles.public_id` |
| `me` | `tenant.identityProfileId` del session |

### Datos de cada faceta

**identity**: resolvedDisplayName, resolvedEmail, resolvedPhone, resolvedAvatarUrl, resolvedJobTitle, departmentName, jobLevel, employmentType, hireDate, hasMemberFacet, hasUserFacet, hasCrmFacet, linkedSystems[], activeRoleCodes[], eoId

**assignments**: assignmentId, clientId, clientName, fteAllocation, hoursPerMonth, roleTitle, startDate, endDate, active, teamMembers[{name, avatarUrl}]

**organization**: memberships[{membershipId, organizationId, organizationName, spaceName, membershipType, roleLabel, department, isPrimary}], primaryOrganization{id, name, legalName}

**leave**: balances[{leaveTypeCode, leaveTypeName, year, allowance, used, reserved, available}], recentRequests[{requestId, leaveTypeName, startDate, endDate, requestedDays, status, startPeriod, endPeriod}], summary{totalPending, totalApproved, totalUsedThisYear}

**payroll**: currentCompensation{currency, baseSalary, remoteAllowance, totalComp, payRegime, contractType}, lastEntry{periodYear, periodMonth, grossTotal, netTotal, status}

**delivery**: icoMetrics{rpaAvg, otdPct, throughputCount, cycleTimeAvg}, projectCount, activeTaskCount, completedTaskCount, ownedProjects[{name, status, clientName}]

**costs**: currentPeriod{year, month, loadedCostTarget, costPerHour, utilizationPct, capacityHealth}, allocationsBySpace[{clientName, fteContribution, commercialLoadedCost}]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `getPersonComplete360('identity-xxx', ['identity'])` retorna datos equivalentes a `person_360` actual
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'assignments'])` retorna asignaciones con team members y avatares resueltos
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'leave'])` retorna saldos y solicitudes recientes
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'payroll'])` retorna compensacion actual y ultima liquidacion
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'delivery'])` retorna metricas ICO y conteos de proyectos/tareas
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'costs'])` retorna cost attribution y capacity economics
- [ ] `getPersonComplete360('identity-xxx', ['identity', 'organization'])` retorna memberships organizacionales
- [ ] `GET /api/person/me/360?facets=identity,assignments,leave` retorna datos correctos para el usuario autenticado
- [ ] `GET /api/person/{profileId}/360?facets=identity` funciona con profile_id, member_id, user_id, y eo_id
- [ ] MyProfileView usa un solo fetch al endpoint 360 (no 4 fetches separados)
- [ ] `resolveAvatarUrl` centralizada en un solo archivo, sin copias
- [ ] `pnpm build`, `pnpm lint` pasan sin errores

## Verification

- `pnpm build`
- `pnpm lint`
- `npx tsc --noEmit`
- Verificacion E2E: navegar a `/my/profile` como usuario interno, verificar que todos los datos cargan desde el endpoint 360
- Verificacion: `pnpm staging:request /api/person/me/360?facets=identity,assignments,leave,organization`
- Verificacion: agregar una faceta nueva (mock) para confirmar que el patron de registro funciona sin modificar el resolver

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` con la arquitectura del resolver federado
- [ ] Actualizar `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` con el endpoint 360
- [ ] Actualizar `docs/documentation/plataforma/mi-perfil.md` con el nuevo data source
- [ ] Marcar TASK-011 (ICO Person 360 Integration) como subsumida

## Follow-ups

- Cache layer: si el endpoint 360 es lento con todas las facetas, agregar cache per-facet con TTL
- Streaming: para vistas que muestran datos parciales progresivamente, considerar streaming de facetas
- Webhooks: cuando una faceta cambia (nuevo payroll entry, nueva asignacion), emitir evento para invalidar cache
- GraphQL: si los consumers necesitan granularidad sub-faceta, considerar un resolver GraphQL sobre las mismas facetas
- Person 360 VIEW v3: si las facetas de identidad se quedan cortas, extender la VIEW con los ~25 campos de `members` que faltan

## Open Questions

- Performance: con todas las facetas, cuantas queries paralelas son? Estimar ~7 queries concurrentes. Verificar que PG pool size lo soporte.
- Auth: un usuario puede consultar el 360 de otro usuario? Propuesta: si, pero solo para usuarios de la misma organizacion. Admin puede consultar cualquiera.
- Facetas de solo-lectura vs facetas mutables: delivery metrics son calculadas, payroll es sensible. Considerar field-level visibility por rol.
