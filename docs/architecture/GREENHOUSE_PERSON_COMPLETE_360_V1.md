# Greenhouse Person Complete 360 — Serving Layer V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.0
> **Creado:** 2026-04-07 por Claude (TASK-273)
> **Ultima actualizacion:** 2026-04-07
> **Task:** TASK-273 — Person Complete 360: capa de serving federada por facetas

---

## Purpose

Define el contrato, la arquitectura y las reglas del **Person Complete 360 Federated Resolver** — una capa de serving que consolida TODOS los datos de una persona bajo un solo resolver con facetas on-demand, autorizacion per-facet, cache in-memory, y observabilidad.

Antes de este resolver, cada vista del portal (Mi Perfil, Admin User Detail, People Detail) hacia 4-6 queries independientes a tablas distintas, cada una con su propia resolucion de `profile_id -> member_id`, su propio mapeo de avatares, y su propio fallback. Este resolver elimina esa duplicacion.

## Delta 2026-04-11 — pauta de consumo para surfaces de perfil personal

- `Person Complete 360` no debe inducir a mezclar `estructura`, `equipos`, `proyectos` y `capacidad extendida` en una sola tab o bajo el label genérico `colegas`.
- Para surfaces como `Mi Perfil`, la pauta de consumo queda así:
  - `identity` = quién soy
  - `organization` = a qué organizaciones pertenezco y en qué calidad
  - `assignments` = en qué equipos operativos/cuentas participo y con quién trabajo
  - `staffAug` = qué contexto de capacidad extendida aplica
- Nota explícita:
  - el contrato actual de `assignments` describe **equipos operativos**
  - no describe por sí solo **estructura interna**
  - la estructura formal debe venir de `departments` + `reporting_lines` por un reader específico, no forzarse dentro de `assignments`
- Consecuencia de diseño:
  - `Mi Perfil > Equipos` puede colgar de `assignments`, pero debe nombrarse y presentarse como equipo operativo
  - un futuro tab `Estructura` requiere un reader propio sobre jerarquía/departamentos
  - `Colegas` como lista plana org-wide no es una lectura canónica suficiente del objeto persona

## Architecture Decision 2026-05-09 -- Professional Presence as a Governed Person 360 Facet

- Status: `Accepted`
- Owner: `People / HR / Identity`
- Scope: `members` professional links/contact fields, Person 360, My Profile, HR professional profile, assigned team/client-safe profiles, collaboration deep links.
- Reversibility: `two-way-but-slow`
- Confidence: `medium`
- Validated as of: `2026-05-09`

### Context

Greenhouse ya persiste presencia profesional en `greenhouse_core.members`: `headline`, `about_me`, professional links, contacto basico y IDs de integracion como `teams_user_id` / `slack_user_id`. Tambien existen rutas self-service y HR para editar/leer parte de esos datos, y `client-safe-profile` ya expone un subconjunto a clientes.

El problema es que esos datos no son una sola categoria. `RUT`, direccion legal e identidad sensible viven bajo Person Legal Profile; cargo laboral y cargo por contexto viven bajo Workforce Role Title governance. Presencia profesional y contacto necesitan policy propia para evitar que telefono, handles personales o links externos se filtren a clientes por accidente, sin duplicar el modelo de identidad legal ni el de cargo.

### Decision

Greenhouse modela `Professional Presence` como una faceta gobernada de Person 360. La faceta resuelve presencia por contexto (`self`, `hr_internal`, `internal_collaboration`, `client_safe`, `public_share`) mediante una policy compartida.

La fuente de datos V1 sigue siendo `greenhouse_core.members` para campos existentes. No se crea tabla paralela salvo que una task futura demuestre necesidad de metadata versionada, opt-in por link o audit granular que no quepa en el modelo actual.

### Alternatives Considered

- Tratar todos los links profesionales como publicos por defecto. Rechazado: mezcla self-service con exposicion cliente y puede filtrar informacion externa no revisada.
- Meter contacto y presencia dentro de Person Legal Profile. Rechazado: contaminaría datos legales privados y surfaces de payroll/finiquito.
- Usar Workforce Role Title governance como owner de presencia. Rechazado: cargo laboral no equivale a perfil profesional, portafolio ni preferencia de contacto.
- Crear una tabla nueva de `person_presence` desde el inicio. Diferido: podria ser correcto si se requiere opt-in/audit por campo, pero V1 debe reutilizar columnas existentes y agregar policy primero.

### Consequences

- APIs y UI no deben decidir visibilidad inline; deben consumir una primitive compartida de presence policy/resolver.
- `phone`, `contact_channel` y `contact_handle` son internal-only por defecto.
- Client-safe presence solo puede exponer campos elegibles por policy.
- Teams/Slack actions se derivan desde IDs de integracion y deep link/action resolver; no se guardan URLs manuales.
- Completeness/readiness de presencia profesional no implica verificacion externa ni aptitud legal/laboral.

### Runtime Contract

- Datos V1: `greenhouse_core.members` professional/contact/integration fields.
- Consumer canonico esperado: `src/lib/person-presence/*` o equivalente, server-side/shared.
- Client-safe convergence: `src/lib/team/client-safe-profile.ts` debe consumir la policy.
- Deep links: `src/lib/navigation/deep-links/**` debe resolver acciones de colaboracion por referencia semantica.
- Access: capabilities `person.presence.*` o runtime-aligned equivalents deben distinguir read internal, read client-safe, self update, HR update y resolve contact action.

### Revisit When

- Se requiera opt-in por link/campo con historial/audit.
- Se lance public talent profile/share page fuera del portal.
- Se necesite verificar externamente portfolios/certificaciones antes de exposicion cliente.
- Contact preferences evolucionen a disponibilidad contractual/calendario real.

## Core Thesis

**Una persona, un resolver, N facetas.** El consumidor pide exactamente las facetas que necesita. El resolver resuelve identidad una sola vez, ejecuta facetas en paralelo, aplica autorizacion, cache, y retorna `_meta` con timing, errores, y estado de cache por faceta.

## Architecture

```
Consumer (MyProfileView, Admin Detail, API client)
    |
    v
GET /api/person/{id}/360?facets=identity,assignments,leave
    |
    v
[requireTenantContext] ── auth check
    |
    v
[resolveTarget] ── identity resolution chain
    |  accepts: profile_id, member_id, user_id, eo_id, "me"
    |  resolves: { profileId, memberId, userId, organizationId }
    v
[authorizeFacets] ── per-facet authorization
    |  determines: allowedFacets, deniedFacets, fieldRedactions
    |  based on: relation (self/same_org/different_org) x role x tenant_type
    v
[FACET_REGISTRY] ── parallel execution of allowed facets
    |  identity ──> greenhouse_serving.person_360
    |  assignments ──> greenhouse_core.client_team_assignments + team members
    |  organization ──> greenhouse_core.person_memberships + organizations
    |  leave ──> greenhouse_hr.leave_balances + leave_requests
    |  payroll ──> greenhouse_payroll.compensation_versions + payroll_entries
    |  delivery ──> greenhouse_serving.person_delivery_360 + projects
    |  costs ──> greenhouse_serving.member_capacity_economics + commercial_cost_attribution
    |  staffAug ──> greenhouse_core.client_team_assignments (type=staff_augmentation)
    v
[facet-cache] ── per-facet in-memory cache (TTL, stale-while-revalidate)
    |
    v
[applyFieldRedactions] ── post-process redacted fields
    |
    v
PersonComplete360 { _meta, identity, assignments?, organization?, leave?, payroll?, delivery?, costs?, staffAug? }
```

## Files

| File | Purpose |
|------|---------|
| `src/types/person-complete-360.ts` | All type definitions (facets, meta, auth, trace) |
| `src/lib/person-360/person-complete-360.ts` | Federated resolver + bulk resolver |
| `src/lib/person-360/facet-authorization.ts` | Authorization engine (per-facet + field-level) |
| `src/lib/person-360/facet-cache.ts` | In-memory cache with per-facet TTL |
| `src/lib/person-360/facet-cache-invalidation.ts` | Outbox event → cache invalidation mapping |
| `src/lib/person-360/resolve-avatar.ts` | Centralized avatar URL resolution (gs:// → proxy) |
| `src/lib/person-360/facets/identity.ts` | Identity facet (person_360 view) |
| `src/lib/person-360/facets/assignments.ts` | Assignments facet (client_team_assignments + team) |
| `src/lib/person-360/facets/organization.ts` | Organization facet (person_memberships) |
| `src/lib/person-360/facets/leave.ts` | Leave facet (balances + requests + summary) |
| `src/lib/person-360/facets/payroll.ts` | Payroll facet (compensation + entries + history) |
| `src/lib/person-360/facets/delivery.ts` | Delivery facet (ICO metrics + projects + CRM) |
| `src/lib/person-360/facets/costs.ts` | Costs facet (capacity economics + allocations) |
| `src/lib/person-360/facets/staff-aug.ts` | Staff augmentation facet (placements) |
| `src/app/api/person/[id]/360/route.ts` | REST endpoint (GET) |
| `src/app/api/persons/360/route.ts` | Bulk REST endpoint (POST) |

## Facet Registry

| Facet | Requires memberId | Cache TTL | Sensitivity | Data Source |
|-------|-------------------|-----------|-------------|-------------|
| `identity` | No | 5 min | public | `greenhouse_serving.person_360` |
| `assignments` | Yes | 5 min | internal | `greenhouse_core.client_team_assignments` |
| `organization` | No | 10 min | public | `greenhouse_core.person_memberships` |
| `leave` | Yes | 2 min | personal | `greenhouse_hr.leave_balances` + `leave_requests` |
| `payroll` | Yes | 1 hour | confidential | `greenhouse_payroll.compensation_versions` + `payroll_entries` |
| `delivery` | Yes | 5 min | internal | `greenhouse_serving.person_delivery_360` + `projects` |
| `costs` | Yes | 10 min | confidential | `member_capacity_economics` + `commercial_cost_attribution` |
| `staffAug` | Yes | 10 min | confidential | `client_team_assignments` (type=staff_augmentation) |

## Authorization Matrix

| Relation | Role | Allowed Facets | Field Redactions |
|----------|------|----------------|------------------|
| `self` | any | ALL | none |
| `same_org` | `efeonce_admin` | ALL | none |
| `same_org` | `hr_manager` | ALL except `costs` | none |
| `same_org` | collaborator | identity, assignments, organization, delivery | payroll/costs denied |
| `different_org` | `efeonce_admin` | ALL | none |
| `different_org` | other | identity only | phone redacted |
| client tenant | any | identity, assignments, delivery | all others denied |

## Identity Resolution

The resolver accepts any of these identifiers:

| Input | Pattern | Resolution |
|-------|---------|------------|
| `profile_id` | `identity-...` | Direct lookup |
| `member_id` | slug format | Via `resolvePersonIdentifier()` |
| `user_id` | `user-...` | Via `resolvePersonIdentifier()` |
| `eo_id` | `EO-ID####` | Via `resolvePersonIdentifier()` |
| `me` | literal | From `tenant.identityProfileId` |

Resolution is done **once** at the top of the resolver. The resulting `memberId` is passed to all facets that require it.

## Cache Strategy

- **Backend:** In-memory `Map<string, CacheEntry>` (per-process, prepared for Redis via TASK-276)
- **Key format:** `person360:{profileId}:{facetName}:{resolverVersion}`
- **Soft expiry:** TTL per facet (from registry)
- **Hard expiry:** 2x soft TTL (stale-while-revalidate window)
- **Bypass:** `?cache=bypass` query param
- **Invalidation:** Outbox events mapped to facets (e.g., `leave.request.created` → invalidate `leave` facet)
- **Status reporting:** `_meta.cacheStatus` per facet: `hit` | `miss` | `stale` | `bypass`

## Observability

Each resolver invocation logs a `ResolverTrace` JSON to Vercel runtime logs:

```json
{
  "traceId": "uuid",
  "profileId": "identity-...",
  "requestedFacets": ["identity", "assignments"],
  "resolvedFacets": ["identity", "assignments"],
  "deniedFacets": [],
  "timingMs": { "identity": 12, "assignments": 45 },
  "totalMs": 52,
  "cacheHits": 1,
  "cacheMisses": 1,
  "errors": [],
  "requesterUserId": "identity-...",
  "timestamp": "2026-04-07T..."
}
```

Response headers: `X-Resolver-Version`, `X-Timing-Ms`, `X-Cache-Status`.

## Temporal Queries (asOf)

Facets supporting point-in-time queries via `?asOf=YYYY-MM-DD`:

| Facet | Support | Mechanism |
|-------|---------|-----------|
| `payroll` | Full | `WHERE period_year/month` from asOf |
| `costs` | Full | `WHERE period_year/month` from asOf |
| `delivery` | Full | Via `person_delivery_360` period filter |
| `leave` | Partial | `WHERE year` from asOf for balances |
| `assignments` | Partial | `WHERE start_date <= asOf AND end_date >= asOf` |
| `identity` | No | Always current state |

## API Endpoints

### `GET /api/person/{id}/360`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `facets` | string (comma-separated) | `identity` | Facets to resolve |
| `asOf` | ISO date | null | Point-in-time query |
| `cache` | `bypass` | normal | Force fresh data |
| `limit` | number | per-facet default | Sub-collection limit |
| `offset` | number | 0 | Sub-collection offset |

### `POST /api/persons/360`

Body: `{ profileIds: string[], facets: string[] }`

- Max 100 profileIds per request
- Same authorization applied per person

## Related Docs

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canonico 360
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person-org
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — backbone 360 en Cloud SQL
- `docs/tasks/in-progress/TASK-273-person-complete-360-federated-serving-layer.md` — task spec

## Future

- **TASK-276:** Redis cache (Upstash) — replaces in-memory Map with distributed cache
- **TASK-277:** GraphQL layer — wraps the same facets for field-level client queries
- **TASK-274:** Account Complete 360 — same pattern for organizations/accounts
- Consumer migration: MyProfileView, Admin User Detail, People Detail → single 360 fetch
