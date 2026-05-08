# GREENHOUSE ORGANIZATION WORKSPACE PROJECTION V1

> **Tipo de documento:** Spec de arquitectura canónica
> **Versión:** 1.1
> **Creado:** 2026-05-07 por arch-architect (skill) — anclado a EPIC-008
> **Última actualización:** 2026-05-08 (recalibración pre-execution TASK-611)
> **Tasks ancla:** TASK-611 (foundation), TASK-612 (shell), TASK-613 (Finance convergence), TASK-614 (Person workspace extension)
> **Doc funcional asociado:** `docs/documentation/identity/sistema-identidad-roles-acceso.md`
> **Estado:** Diseño aprobado — implementación TASK-611 en curso

## Delta 2026-05-08 — Recalibración pre-execution TASK-611 (V1.1)

Discovery contra el repo en `task/TASK-611-...` reveló cinco divergencias entre el diseño V1 y el estado real del código/PG. La intención canónica se mantiene; los detalles se ajustan a la realidad sin debilitar defense-in-depth.

1. **`greenhouse_core.entitlement_grants` NO existe**. El runtime de Greenhouse compone capabilities como pure function desde `(roleCodes, routeGroups, authorizedViews, ...)` en `src/lib/entitlements/runtime.ts:83-1042` — no persiste grants. Por lo tanto:
   - **`capabilities_registry` se crea como tabla declarativa SIN FK a `entitlement_grants`** en V1.1. La parity TS↔DB (test runtime) es el guardia primario. Cuando emerja persistencia de grants (cleanup de TASK-404 o nueva task derivada), se agregará FK en migración separada.
   - Spec §4.2 mantiene la intención de doble fuente; la sección "ALTER TABLE … entitlement_grants ADD CONSTRAINT … FK" se difiere a una task futura cuando exista la tabla.

2. **Eventos `identity.entitlement.granted` / `identity.entitlement.revoked` v1 NO existen**. Los eventos canónicos relevantes que sí existen y se usan para la cache invalidation reactiva (Slice 6) son:
   - `access.entitlement_role_default_changed` (TASK-404, declarado en `src/lib/sync/event-catalog.ts:272`)
   - `access.entitlement_user_override_changed` (TASK-404, `src/lib/sync/event-catalog.ts:273`)
   - `role.assigned` + `role.revoked` (ya en `REACTIVE_EVENT_TYPES`, líneas 780-781)
   - `user.deactivated` (ya en `REACTIVE_EVENT_TYPES`, línea 790)
   Spec §5 layer 7 + §10 hard rule "SIEMPRE invalidar cache via clearProjectionCacheForSubject" se preservan; los event keys cambian. Los dos primeros se agregan a `REACTIVE_EVENT_TYPES` en TASK-611 Slice 6.

3. **Columnas reales del relationship resolver** (Slice 3 query bridges via `greenhouse_core.spaces`):
   - `client_team_assignments`: `member_id` (NO `member_user_id`), `client_id` (NO `organization_id`), `start_date`/`end_date` (NO `active_until`), `role_title_override` (NO `role_in_account`).
   - `client_users`: `user_id` + `client_id` (NO `organization_id` directo) + `member_id` opcional para bridge a `members`.
   - `user_role_assignments` (NO `role_assignments`): `user_id`, `role_code`, `scope_level`, `client_id|project_id|campaign_id` opcional.
   - **Puente canónico user ↔ organization**: `client_team_assignments.client_id` ⇄ `greenhouse_core.spaces.client_id` ⇄ `spaces.organization_id`. La tabla `clients` NO tiene `organization_id` — el puente es `spaces`.
   - El query del Apéndice del spec se reescribe en TASK-611 Slice 3 con estos joins reales, conservando la intención (single roundtrip + cross-tenant isolation enforced en WHERE).

4. **5 categorías canónicas** (no 4). El TL;DR §2 dice "4" pero §4.3 enumera 5: `internal_admin | assigned_member | client_portal_user | unrelated_internal | no_relation`. Se canoniza **5** (la quinta es la rama base). Apéndice A documenta las 5.

5. **Layer 5 audit log (TASK-404 entitlement_governance_audit_log)** está bloqueado por un pre-up-marker bug en la migración `20260417044741101_task-404-entitlements-governance.sql` (CREATE TABLE bajo `-- Down Migration` en lugar de bajo `-- Up Migration`). Las tablas governance NUNCA fueron creadas en PG — confirmado vía `kysely-codegen` output (no aparecen en `src/types/db.d.ts`). TASK-611 NO arregla TASK-404; la projection helper es read-only y NO requiere audit log propio. El cleanup queda capturado en `ISSUE-###` separado (a crear durante Slice 7).

**Consecuencias prácticas para implementadores futuros**:

- `capabilities_registry` se entrega sin FK enforcement de runtime; la TS↔DB parity test es el contrato. NO esto debilita el defense-in-depth (Layer 1 sigue siendo PK + CHECK + parity test); difiere la Layer 1 enforcement contra grants persistidos hasta que existan.
- Cualquier sucesor que cree `entitlement_grants` o reanime las tables de TASK-404 DEBE agregar FK contra `capabilities_registry.capability_key`.
- Slice 6 cache invalidation consumer cubre los 5 events canónicos enumerados arriba; cuando emerjan eventos nuevos que invaliden capability bag (ej. `access.permission_set_assigned/revoked`), se extiende el `triggerEvents` del consumer.

## Delta 2026-05-07 — TASK-614 person workspace extension

El patrón canonizado en este V1 es **transversal por objeto canónico 360**, no específico de organizations. TASK-614 lo extiende al objeto `Persona`/`Colaborador` con las siguientes especificidades:

- **Namespace transversal**: `person.<facet>.<action>` con `scope ∈ {own, tenant, all}`. `person` se agrega al modules union (mismo patrón que `organization` en este V1).
- **Infraestructura compartida (NO duplicar)**: misma tabla `greenhouse_core.capabilities_registry`, mismo patrón de relationship resolver (single PG query con CTEs), mismo helper shape (`resolvePersonWorkspaceProjection` mirror de `resolveOrganizationWorkspaceProjection`), mismo cache TTL 30s, mismo defense-in-depth 7-layer.
- **Diferencias específicas de person**:
  - **6 relationship kinds** (vs 5 en organization): `self | manager | internal_admin | peer | unrelated_internal | no_relation`. `self` y `manager` son nuevos ejes específicos de persona.
  - **10 facets canónicos** (vs 9 en organization): `identity | legal_profile | assignments | organizations | compensation | payroll | benefits | delivery | finance_impact | tooling | staff_aug`. `legal_profile` ya canonizado por TASK-784 — preservado tal cual.
  - **Manager relationship** consume helpers de TASK-731 reporting_hierarchy (`getCurrentReportingLine`, `listReportingSubtree`, `listReportingChain`). Cap explícito: manager solo accede a `compensation`/`payroll` de subordinates en su subtree, nunca cross-chain.
  - **Self-detection canonizada**: helper `isSelf(subject, memberId)` reemplaza comparaciones inline `accessContext.userId === memberId` repartidas en código.
  - **`economy` UI tab decomposition**: 4 sub-secciones internas (Compensación / Nómina / Beneficios / Impacto financiero) consumiendo capabilities finas — preserva URL stable.
- **Reliability signals propios de person**: `identity.person_workspace.facet_view_drift` + `identity.person_workspace.deprecated_reader_usage`. Subsystem rollup compartido `Identity & Access`.

**Hard rule canonizada por este Delta**: cuando emerja un tercer workspace candidate (provider, space) y reuse este patrón, NO escribir un V2 spec sibling — extender este V1 con un nuevo Delta. Si los Delta crecen demasiado, lift a master `GREENHOUSE_CANONICAL_OBJECT_WORKSPACE_PROJECTION_V1.md` con este V1 (organizations) + person + nuevo como aplicaciones específicas. Antes de eso, NO.

## 1. Propósito

Definir la capa canónica que traduce **entitlements + relación subject↔organization + entrypoint** en un contrato de presentación reusable para todas las superficies que renderizan el detalle de una organización (`/agency/organizations/[id]`, `/finance/clients/[id]`, futuros entrypoints organization-first).

Reemplaza la lógica dispersa de visibilidad de tabs/facets por un único helper `resolveOrganizationWorkspaceProjection(...)`.

## 2. Decisión clave (TL;DR comprometido)

1. **Capabilities namespace canónico**: `organization.<facet>.<action>` con `scope ∈ { own | tenant | all }`. **Cierra la Open Question de TASK-611.** El namespace es transversal — entrypoint NO es dimensión de autorización.
2. **`organization` se agrega al union de modules** del entitlements catalog como namespace de objeto canónico 360 (mismo patrón que `home` y `my_workspace`, que tampoco son bounded contexts).
3. **Capabilities registry doble fuente** (TS + DB) con CHECK + FK desde `entitlement_grants` para defensa en profundidad.
4. **Relationship resolver canónico** con 4 categorías enumeradas: `internal_admin | assigned_member | client_portal_user | unrelated_internal | no_relation`.
5. **Projection helper canónico** — pure function, in-memory cache TTL 30s, degraded mode honesto cuando dependencias fallan.
6. **Shell con contrato chrome-vs-content explícito** — shell owns chrome, domain owns facet content via render-prop o registry.
7. **Rollout flag** consumiendo el patrón canónico `home_rollout_flags` extendido (o `feature_rollout_flags` cuando esté materializado per `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md`).
8. **`authorizedViews` y `routeGroups` se preservan** como capa de navegación. Reliability signal detecta drift; colapso queda como follow-up explícito (NO en scope V1).

## 3. Anchors canónicos

### Specs canónicas que este V1 extiende

- `GREENHOUSE_360_OBJECT_MODEL_V1.md` — `organization` es objeto canónico 360.
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — runtime de capabilities (TASK-403/404).
- `GREENHOUSE_IDENTITY_ACCESS_V2.md` — modelo de identidad y acceso fino.
- `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — relaciones person↔org (poblaciones A/B/C).
- `GREENHOUSE_AUTH_RESILIENCE_V1.md` — plantilla 7-layer defense-in-depth (TASK-742).
- `GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md` (TASK-780) — patrón rollout flag declarativo.
- `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registry de signals.
- `ACCOUNT_360_IMPLEMENTATION_V1.md` — facets cross-domain del 360.

### Código canónico que este V1 reusa o extiende

- `src/config/entitlements-catalog.ts` — universo de capabilities + types.
- `src/lib/entitlements/runtime.ts` — `getTenantEntitlements`, `hasEntitlement`, `can`.
- `src/types/account-complete-360.ts` — facet union (`identity | spaces | team | economics | delivery | finance | crm | services | staffAug`).
- `src/lib/account-360/facet-authorization.ts` — `authorizeAccountFacets(ctx)` (se ABSORBE como input del projection helper, no se reemplaza).
- `src/lib/admin/view-access-catalog.ts` — registry de viewCodes (preservado).
- `src/lib/reliability/registry.ts` — registry de módulos para signals.
- `greenhouse_serving.home_rollout_flags` — tabla rollout (extender CHECK o migrar a `feature_rollout_flags`).

## 4. Modelo

### 4.1 Capabilities namespace `organization.*`

| Capability key | Module | Actions | Scopes válidos | Semántica |
|---|---|---|---|---|
| `organization.identity` | `organization` | `read` | `own`, `tenant`, `all` | Datos básicos: nombre, dominio, logo, status comercial. |
| `organization.identity_sensitive` | `organization` | `read_sensitive`, `update` | `tenant`, `all` | RUT, dirección legal, beneficiarios. |
| `organization.spaces` | `organization` | `read` | `tenant`, `all` | Spaces operativos (Notion). |
| `organization.team` | `organization` | `read` | `own`, `tenant`, `all` | Roster + assignments. `own` = Globe-self. |
| `organization.economics` | `organization` | `read` | `tenant`, `all` | KPIs económicos del cliente (ICO, contribution, P&L summary). |
| `organization.delivery` | `organization` | `read` | `own`, `tenant`, `all` | Tasks, projects, sprints, ICO score. |
| `organization.finance` | `organization` | `read` | `tenant`, `all` | Income, expenses, payment_orders, FX, account_balances scope-organization. |
| `organization.finance_sensitive` | `organization` | `read_sensitive`, `export`, `approve` | `tenant`, `all` | Documentos fiscales, evidence, OTB declarations. |
| `organization.crm` | `organization` | `read` | `tenant`, `all` | Contacts, deals, HubSpot pipeline. |
| `organization.services` | `organization` | `read`, `update` | `tenant`, `all` | Service engagements + catálogo `p_services`. |
| `organization.staff_aug` | `organization` | `read`, `update` | `tenant`, `all` | Staff augmentation arrangements. |

**Notas**:

- `read_sensitive` se separa de `read` para PII/finance details — patrón TASK-784 (person-legal-profile).
- Casing: capability keys en `snake_case`. Mapeo a facets TS via tabla en §4.4 (TS facet `staffAug` ↔ capability `staff_aug`).
- `economics` es facet del 360 distinto de `finance`. Economics = KPIs derivados (ICO, contribution margin, member loaded cost). Finance = primitivas operacionales (income/expenses/payments).

### 4.2 Capabilities registry — doble fuente

**TS catalog** (compile-time): `src/config/entitlements-catalog.ts` declara las 11 capabilities `organization.*` como `EntitlementCatalogEntry[]`. Single source of truth para autocomplete + type narrowing en consumers.

**DB registry** (runtime defense): tabla nueva `greenhouse_core.capabilities_registry` seedeada por migración con CHECK + FK:

```sql
CREATE TABLE greenhouse_core.capabilities_registry (
  capability_key TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  allowed_actions TEXT[] NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  description TEXT NOT NULL,
  introduced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deprecated_at TIMESTAMPTZ NULL,
  CHECK (cardinality(allowed_actions) > 0),
  CHECK (cardinality(allowed_scopes) > 0)
);

ALTER TABLE greenhouse_core.entitlement_grants
  ADD CONSTRAINT entitlement_grants_capability_key_fk
  FOREIGN KEY (capability_key)
  REFERENCES greenhouse_core.capabilities_registry(capability_key);
```

**Test de paridad TS↔DB** (CI): assert que `entitlementsCatalog.map(e => e.key).sort()` ≡ `SELECT capability_key FROM capabilities_registry WHERE deprecated_at IS NULL`. Drift rompe build (mismo patrón TASK-700 Luhn TS↔SQL).

### 4.3 Relationship resolver

**Tipo canónico**:

```ts
type SubjectOrganizationRelation =
  | { kind: 'internal_admin'; tenantId: string }
  | { kind: 'assigned_member'; tenantId: string; assignmentId: string; roleInAccount: string; activeFrom: Date; activeUntil: Date | null }
  | { kind: 'client_portal_user'; tenantId: string; clientUserId: string; organizationId: string }
  | { kind: 'unrelated_internal'; tenantId: string }
  | { kind: 'no_relation' }
```

**Helper**: `resolveSubjectOrganizationRelation(subject, organizationId): Promise<SubjectOrganizationRelation>` en `src/lib/organization-workspace/relationship-resolver.ts`.

**Contrato de query** (single Postgres roundtrip):

```sql
WITH subject_admin AS (
  SELECT 1 FROM greenhouse_core.role_assignments
  WHERE user_id = $subjectId AND role_code = 'efeonce_admin' AND tenant_id = $tenantId
),
subject_assignment AS (
  SELECT assignment_id, role_in_account, active_from, active_until
  FROM greenhouse_serving.client_team_assignments
  WHERE member_user_id = $subjectId
    AND organization_id = $organizationId
    AND active_until IS NULL OR active_until > now()
),
subject_client_portal AS (
  SELECT client_user_id, organization_id
  FROM greenhouse_core.client_users
  WHERE user_id = $subjectId AND organization_id = $organizationId
)
SELECT ...; -- COALESCE en orden de prioridad
```

**Cross-tenant isolation enforced en WHERE clause** — no hay path donde el resolver pueda leer una assignment de otro tenant sin scope `all` explícito en la capability check posterior.

**Indexes requeridos**:

- `greenhouse_serving.client_team_assignments(member_user_id, organization_id, active_until)` — composite, parcial `WHERE active_until IS NULL OR active_until > now()`.
- `greenhouse_core.client_users(user_id, organization_id)` — UNIQUE composite.

### 4.4 Workspace projection helper

**Helper canónico**: `resolveOrganizationWorkspaceProjection(...)` en `src/lib/organization-workspace/projection.ts`.

**Tipo de retorno**:

```ts
export type EntrypointContext = 'agency' | 'finance' | 'admin' | 'client_portal'

export type OrganizationFacet =
  | 'identity' | 'spaces' | 'team' | 'economics'
  | 'delivery' | 'finance' | 'crm' | 'services' | 'staffAug'

export type OrganizationWorkspaceProjection = {
  organizationId: string
  entrypointContext: EntrypointContext
  relationship: SubjectOrganizationRelation
  visibleFacets: OrganizationFacet[]
  visibleTabs: WorkspaceTab[]
  defaultFacet: OrganizationFacet
  allowedActions: WorkspaceAction[]
  fieldRedactions: Partial<Record<OrganizationFacet, string[]>>
  degradedMode: boolean
  degradedReason: 'relationship_lookup_failed' | 'entitlements_lookup_failed' | 'no_facets_authorized' | null
  cacheKey: string
  computedAt: Date
}
```

**Contrato de composición** (orden de evaluación, determinístico):

1. Resolver `SubjectOrganizationRelation` (§4.3). Si falla → `degradedMode: true`, `visibleFacets: []`, `degradedReason: 'relationship_lookup_failed'`.
2. Cargar entitlements del subject vía `getTenantEntitlements(subject)` (existente). Si falla → degraded.
3. Por cada facet del 9-set: evaluar `hasEntitlement(entitlements, 'organization.<facet>', 'read', requiredScope(relationship))`.
4. Aplicar `authorizeAccountFacets(ctx)` (existente) como capa adicional para `fieldRedactions` — el helper EXISTENTE se preserva como input al projection, NO se reemplaza.
5. Mapear facets visibles → tabs según el `entrypointContext`. Default tab por entrypoint:
   - `agency` → `'identity'`
   - `finance` → `'finance'`
   - `admin` → `'identity'`
   - `client_portal` → primer facet visible en orden `['identity', 'team', 'delivery', 'services']`.
6. Si la facet default no está en `visibleFacets`, caer al primer visible. Si no hay visibles → degraded mode con `degradedReason: 'no_facets_authorized'`.
7. Computar `allowedActions` per facet desde la matriz capabilities × relationship (§Apéndice A).

**Cache TTL 30s** in-memory por `${subjectId}:${organizationId}:${entrypointContext}` — patrón TASK-780.

**Pure function**: ningún side effect. Idempotente. Mismo input → mismo output bajo cache lifecycle.

**Mapping facet TS ↔ capability key**:

```ts
const FACET_TO_CAPABILITY_KEY: Record<OrganizationFacet, string> = {
  identity: 'organization.identity',
  spaces: 'organization.spaces',
  team: 'organization.team',
  economics: 'organization.economics',
  delivery: 'organization.delivery',
  finance: 'organization.finance',
  crm: 'organization.crm',
  services: 'organization.services',
  staffAug: 'organization.staff_aug',
}
```

### 4.5 Shell vs facet content — contrato canónico

**Shell owns chrome**. Domain owns facet content. **Inviolable.**

**API del shell**:

```tsx
<OrganizationWorkspaceShell
  organization={organization}        // 360 base data
  projection={projection}            // resultado del helper §4.4
  onFacetChange={...}                // controlled
  activeFacet={...}                  // controlled
>
  {(activeFacet, ctx) => (
    <FacetContentRouter
      facet={activeFacet}
      organizationId={ctx.organizationId}
      entrypointContext={ctx.entrypointContext}
      relationship={ctx.relationship}
    />
  )}
</OrganizationWorkspaceShell>
```

**El shell renderiza**:

- Header (logo, nombre, status, breadcrumb).
- KPI strip base (4 KPIs derivados del 360).
- Tab container (visibleTabs, activeFacet controlled).
- Action bar (allowedActions filtradas por facet).
- Drawer skeleton (puerta para que el facet content abra detalles).

**El shell NO renderiza**:

- Contenido específico de ningún facet.
- Lógica de negocio de ningún dominio.
- Queries a APIs de dominio.

**FacetContentRouter** (`src/components/greenhouse/organization-workspace/FacetContentRouter.tsx`):

```ts
const FACET_REGISTRY: Record<OrganizationFacet, ComponentType<FacetContentProps>> = {
  identity: dynamic(() => import('@/views/greenhouse/organizations/facets/IdentityFacet')),
  finance: dynamic(() => import('@/views/greenhouse/organizations/facets/FinanceFacet')),
  delivery: dynamic(() => import('@/views/greenhouse/organizations/facets/DeliveryFacet')),
  team: dynamic(() => import('@/views/greenhouse/organizations/facets/TeamFacet')),
  crm: dynamic(() => import('@/views/greenhouse/organizations/facets/CrmFacet')),
  services: dynamic(() => import('@/views/greenhouse/organizations/facets/ServicesFacet')),
  staffAug: dynamic(() => import('@/views/greenhouse/organizations/facets/StaffAugFacet')),
  spaces: dynamic(() => import('@/views/greenhouse/organizations/facets/SpacesFacet')),
  economics: dynamic(() => import('@/views/greenhouse/organizations/facets/EconomicsFacet')),
}
```

Lazy loading per-facet evita cargar Finance bundle cuando el usuario está en facet identity. Crítico para Scalability cuando el shell se popularize a más entrypoints.

### 4.6 Cache strategy

| Layer | Cache | TTL | Invalidation |
|---|---|---|---|
| Capabilities catalog | Module-load | proceso | restart |
| Capabilities registry DB | Memoize | 5 min | restart |
| Relationship lookup | Per-request memo | request | end-of-request |
| Projection result | In-memory map | 30s | TTL natural |
| 360 data | RSC fetch | request | revalidate |
| Rollout flag | TASK-780 reader | 30s | TTL natural |

**No hay materialización en BQ ni PG** — la projection es read-light y se computa en milisegundos. Materializar agrega drift sin payoff. Si en futuro el dashboard de Agency lista 1000 organizations con projection per-row, agregar `accessLevel: 'full' | 'partial' | 'none'` summary endpoint que devuelve solo el shape resumido (NO la projection completa).

## 5. Defense-in-depth (7-layer mapping a TASK-742)

| Capa | Implementación |
|---|---|
| **1. DB constraint** | `capabilities_registry` PK + CHECK; `entitlement_grants.capability_key` FK; `client_team_assignments` UNIQUE composite. |
| **2. Application guard** | `can(subject, 'organization.<facet>', 'read', scope)` en cada API route handler que renderiza el workspace. |
| **3. UI affordance** | Shell oculta tabs/actions no presentes en `projection.visibleFacets` / `allowedActions`. |
| **4. Reliability signal** | `identity.workspace_projection.facet_view_drift` (kind=`drift`, severity=`warning` si count>0). |
| **5. Audit log** | `entitlement_grant_audit_log` (TASK-404) cubre mutaciones de grants. Projection es read-only — no requiere audit log propio. |
| **6. Approval workflow** | Grants de capabilities `*_sensitive` requieren approval workflow del Admin Center (TASK-404). |
| **7. Outbox event** | `identity.entitlement.granted` v1 + `identity.entitlement.revoked` v1 (existentes TASK-404). |

## 6. Reliability signals

### Signal nuevo: `identity.workspace_projection.facet_view_drift`

- **Kind**: `drift`
- **Severity**: `warning` si count > 0
- **Steady state**: 0
- **Subsystem rollup**: `Identity & Access`
- **Reader**: `src/lib/reliability/queries/workspace-projection-drift.ts`
- **Detección**: cuenta `(subject_id, organization_id)` donde `projection.visibleFacets` incluye facet F cuya `viewCode` underlying NO está en `authorizedViews(subject)`. Detecta drift entre la capa fina (capabilities) y la capa broad (authorizedViews) — ambas coexisten en V1.
- **Sample query**:

```sql
WITH projection_visible AS (
  -- Computed from entitlement_grants × capability registry × facet_to_view_map
  SELECT subject_id, view_code, organization_id
  FROM greenhouse_serving.workspace_projection_facet_visibility -- materialized helper view
),
authorized AS (
  SELECT user_id AS subject_id, view_code
  FROM greenhouse_core.user_authorized_views_v
)
SELECT COUNT(*) AS drift_count
FROM projection_visible pv
LEFT JOIN authorized a USING (subject_id, view_code)
WHERE a.view_code IS NULL;
```

### Signal nuevo: `identity.workspace_projection.unresolved_relations`

- **Kind**: `data_quality`
- **Severity**: `error` si count > 0 sostenido > 7 días
- **Steady state**: 0
- **Detección**: cuenta `client_profiles` con `organization_id IS NULL` que tienen tráfico reciente en `/finance/clients/[id]`. Marca el path degradado de TASK-613 como cuantificado.

### Reliability module registration

Extender el módulo `identity` en `src/lib/reliability/registry.ts`:

```ts
expectedSignalKinds: ['runtime', 'incident', 'drift', 'data_quality'],
```

(O crear módulo nuevo `identity_workspace` si emerge necesidad de surface dedicada — decisión deferida a implementer en TASK-611 Slice 4.)

## 7. Rollout strategy

**Patrón canónico**: extender `home_rollout_flags` (TASK-780) o consumir `feature_rollout_flags` cuando esté materializado.

**Flag keys nuevos**:

- `organization_workspace_shell_agency` — controla `/agency/organizations/[id]` (V2 = shell, V1 = legacy).
- `organization_workspace_shell_finance` — controla `/finance/clients/[id]`.

**Rollout sequence**:

1. **Internal dogfood** (1 día): scope=`user`, lista de Efeonce admins.
2. **Tenant rollout staged** (1 semana): scope=`role`, primero `efeonce_admin`, luego `finance_admin`, luego `agency_lead`, luego `collaborator`.
3. **Default global enabled** (post-soak): scope=`global`, `enabled=true`.
4. **V1 retirement** (60+ días post-default): borrar legacy components, retirar flag.

**Reliability signal**: `home.rollout.drift` (TASK-780) cubre. Override per-user para incident response sin redeploy.

## 8. Domain boundaries

| Dominio | Owns | Not in V1 |
|---|---|---|
| **Identity** | Capabilities registry, projection helper, relationship resolver, reliability signals. | No write paths a entitlements (TASK-404). |
| **Agency** | `/agency/organizations/[id]` adopta el shell (TASK-612). Facet content de identity/team/spaces. | Listado `/agency/organizations` sigue V1. |
| **Finance** | `/finance/clients/[id]` adopta el shell (TASK-613). Facet content de finance/economics. | Listado `/finance/clients` sigue V1. |
| **Delivery** | Facet content de delivery (consume helpers ICO/projects existentes). | Sin endpoint nuevo. |
| **Commercial** | Facet content de crm/services/staffAug (consume HubSpot/services bridge). | Sin endpoint nuevo. |

## 9. Migration plan (slicing aligned a tasks)

### TASK-611 — Foundation (P1, Alto)

- **Slice 1**: `organization` module + 11 capabilities en TS catalog. Test paridad.
- **Slice 2**: `capabilities_registry` migration + seed + FK desde `entitlement_grants`. Verify DDL via `information_schema` (anti pre-up-marker bug).
- **Slice 3**: `relationship-resolver.ts` + tests con matriz personas (4 relations × 9 facets × 4 entrypoints = 144 assertions).
- **Slice 4**: `projection.ts` helper + cache TTL 30s + degraded mode + tests.
- **Slice 5**: Reliability signals (`facet_view_drift` + `unresolved_relations`) + admin docs.
- **Slice 6**: 4-pillar score block + Open Question cerrada en architecture spec.

### TASK-612 — Shell (P1, Alto, blocked by 611)

- **Slice 1**: Shell extraction (chrome only) en `src/components/greenhouse/organization-workspace/`.
- **Slice 2**: `FacetContentRouter` + facet registry con dynamic imports.
- **Slice 3**: `/agency/organizations/[id]` adopta el shell, gated por `organization_workspace_shell_agency`.
- **Slice 4**: Rollout flag CHECK extension + admin UI para flags.
- **Slice 5**: Playwright smoke por persona × entrypoint + visual snapshot pre/post.
- **Slice 6**: 4-pillar score block + downstream-verified marker.

### TASK-613 — Finance convergence (P1, Alto, blocked by 611+612)

- **Slice 0**: Caller inventory `/finance/clients/[id]` (grep + report). Lista enumerada en spec.
- **Slice 1**: `clientProfileId → organizationId` resolver canónico + degraded path UI spec (en es-CL tuteo, vía `greenhouse-ux-writing`).
- **Slice 2**: `/finance/clients/[id]` adopta el shell con `entrypointContext='finance'` + `defaultFacet='finance'`.
- **Slice 3**: Finance facet content enumerado: payment_orders, income, expenses, reconciliation, OTB, factoring, withholdings, FX exposure, account_balances. Contrato escrito.
- **Slice 4**: Compatibility deep-links + flag rollout.
- **Slice 5**: Playwright smoke + downstream-verified marker.
- **Slice 6**: 4-pillar score block.

## 10. Hard rules (NUNCA / SIEMPRE)

- **NUNCA** crear capability fuera del registry. CHECK + FK lo bloquea.
- **NUNCA** computar visibilidad de facet en cliente. La projection es server-only.
- **NUNCA** asumir relación subject↔org en código de presentación. Pasar siempre por `resolveSubjectOrganizationRelation`.
- **NUNCA** mezclar `entrypointContext` con `scope` de capability. Entrypoint es presentación, scope es autorización.
- **NUNCA** rendear facet content dentro del shell. Render-prop o registry — siempre.
- **NUNCA** materializar la projection en BQ/PG. Es read-light + cacheable.
- **NUNCA** branchear UI por `relationship.kind` inline. La projection ya filtró — el shell solo lee `visibleFacets`.
- **NUNCA** llamar `Sentry.captureException` directo en este path. Usar `captureWithDomain(err, 'identity', { extra })`.
- **NUNCA** romper deep-links durante migración. Compat path mandatorio en TASK-613.
- **NUNCA** colapsar `authorizedViews` en este V1. Coexisten — el reliability signal es el guardia. Colapso se evalúa post-soak ≥6 meses con drift=0 sostenido.
- **SIEMPRE** declarar el flag de rollout antes de cambiar comportamiento UI por defecto.
- **SIEMPRE** marcar `degradedMode=true` con `degradedReason` enumerado cuando la projection no puede resolverse — nunca crashear, nunca devolver `visibleFacets: []` silenciosamente.
- **SIEMPRE** invalidar cache via `clearProjectionCacheForSubject(subjectId)` cuando un grant/revoke se aplica al subject (consumer del outbox event de TASK-404).
- **SIEMPRE** cuando emerja un nuevo entrypoint organization-first, reusar el helper + shell. Cero composición ad-hoc.

## 11. 4-Pillar Score

### Safety

- **Authorization granular**: 11 capabilities `organization.<facet>.<action>`, `read_sensitive` separado de `read`.
- **Cross-tenant isolation**: enforced en query del `relationship-resolver`, no en TS — el WHERE clause filtra por tenant_id derivado del subject.
- **Server-only**: el projection helper es `import 'server-only'`. UI recibe sólo facets autorizados.
- **Blast radius**: `degraded_mode → visibleFacets: []`. Un usuario ve workspace vacío + mensaje. Cero cross-tenant leak posible.
- **Verified by**: matriz personas test (144 asserts), capability-FK test, cross-tenant isolation test, lint rule "no inline facet visibility check".
- **Residual risk**: drift entre `authorizedViews` legacy y projection — cuantificado por `facet_view_drift` signal. Aceptado en V1 con plan de retiro post-soak.

### Robustness

- **Idempotency**: pure function. Cache no afecta corrección.
- **Atomicity**: registry seed migration es transaction única (`-- Up Migration` marker validado). Grants atómicos vía TASK-404.
- **Race protection**: `entitlement_grants` UNIQUE `(subject_id, capability_key, scope_id)` rechaza duplicates. `client_team_assignments` UNIQUE composite. `capabilities_registry` PK.
- **Constraint coverage**: PK + FK + CHECK en registry; UNIQUE composite en assignments; CHECK en `flag_key` de rollout flags.
- **Bad input**: `organizationId` inválido → resolver devuelve `no_relation` → projection devuelve degraded. NULL/undefined: type-narrowed por TS, runtime guard server-only.
- **Verified by**: parity test TS↔DB, concurrency test grant+revoke simultáneo, fuzz test inputs inválidos, FK violation test.

### Resilience

- **Retry policy**: read-only path. No retries necesarios. Cache absorbe ráfagas.
- **Dead letter**: N/A (no async).
- **Reliability signals**: `identity.workspace_projection.facet_view_drift` (drift) + `identity.workspace_projection.unresolved_relations` (data_quality).
- **Audit trail**: TASK-404 `entitlement_grant_audit_log` cubre mutaciones (append-only triggers).
- **Recovery**: cache corrupto → próximo request recomputa. Resolver falla → `degraded_mode` honesto. Nunca crash.
- **Degradación honesta**: UI distingue `loading` / `empty` / `degraded` / `error` con copy en es-CL tuteo.
- **Verified by**: chaos test (DB lookup falla), Playwright smoke por relationship × entrypoint, dashboard `/admin/operations` con signals visibles.

### Scalability

- **Hot path Big-O**: O(log n) en resolver (composite index lookup), O(1) en cache hit, O(facets) = O(9) en projection compute.
- **Index coverage**: `client_team_assignments(member_user_id, organization_id, active_until)` parcial; `client_users(user_id, organization_id)` UNIQUE; `entitlement_grants(subject_id, capability_key)`.
- **Async paths**: ninguno necesario en V1 — projection es read-light. Cache invalidation reactiva via outbox events de TASK-404.
- **Cost at 10x**: linear en usuarios activos. Cache TTL 30s amortiza ráfagas. A 100x considerar materialización selectiva (NO en V1).
- **Pagination**: para listas (Agency directory con N orgs), NO computar projection completa per-row. Devolver `accessLevel: 'full' | 'partial' | 'none'` summary y lazy-resolve completa al click.
- **Verified by**: `EXPLAIN ANALYZE` en relationship resolver, load test 10x synthetic en `/agency/organizations/[id]`, p99 latency budget < 200ms server-side.

## 12. Tradeoffs explícitos

### Safety vs Scalability

**Tradeoff**: per-row capability check en hot path agrega latencia en listas grandes.
**Resolución**: en hot read path (lista), retornar summary `accessLevel`. Projection completa solo on-demand al detalle.

### Robustness vs Resilience

**Tradeoff**: strict atomicity de grants + projection invalidation puede retrasar propagación cross-tenant.
**Resolución**: cache TTL 30s da ventana de tolerancia natural. Outbox event invalida cache reactiva pero NO bloquea grant write.

### Resilience vs Safety

**Tradeoff**: en `degraded_mode`, ¿qué se muestra? Si muestras facets cacheadas potencialmente stale, riesgo de leak. Si muestras vacío, UX pobre durante incident.
**Resolución V1**: degraded → `visibleFacets: []` + mensaje. Conservador. Re-evaluar en V2 si UX feedback lo demanda.

### Scalability vs Robustness

**Tradeoff**: cache TTL 30s significa que un revoke puede tardar hasta 30s en propagar al UI.
**Resolución**: aceptable para read-only. Para mutaciones críticas (e.g. usuario despedido), consumer de outbox `identity.entitlement.revoked` invalida cache inmediatamente.

## 13. Patrones canónicos referenciados

| Patrón | Task fuente | Aplicado en este V1 |
|---|---|---|
| Defense-in-depth 7-layer | TASK-742 | §5 mapping completo |
| VIEW canónica + helper + reliability + lint | TASK-571/699/766/774 | §4.4 helper, §6 signal (sin VIEW + sin lint en V1 — projection no es aggregation con drift FX/settlement) |
| State machine + CHECK + audit | TASK-700/765 | §4.2 registry, audit trail vía TASK-404 |
| Capabilities granular | TASK-403/404 | §4.1 namespace `organization.*` |
| Declarative flag platform | TASK-780 | §7 rollout via `home_rollout_flags`/`feature_rollout_flags` |
| Read-then-write resolver pattern | TASK-784 | §4.3 relationship resolver |
| Degraded mode honesto | TASK-672 (Platform Health) | §4.4 `degradedMode` + §10 hard rule |
| Cache TTL 30s in-memory | TASK-780 | §4.6 cache strategy |
| Test paridad TS↔DB | TASK-700 (Luhn) | §4.2 registry parity test |

## 14. Open questions deliberadas

1. **Reliability module dedicado vs extender `identity`**: ¿`identity_workspace` como módulo nuevo, o extender `expectedSignalKinds` del módulo `identity`? Decisión deferida a implementer de TASK-611 Slice 5. Recomendación: extender `identity` en V1; si emerge surface admin dedicada (e.g. dashboard de drift workspace), promover a módulo separado en V2.

2. **Materialized helper view vs runtime computation**: ¿poblar `greenhouse_serving.workspace_projection_facet_visibility` para que el reliability signal corra eficiente, o computar en JOIN al runtime? Decisión deferida a Slice 5 con benchmark de cardinalidad real (subjects × organizations).

3. **Retiro de `authorizedViews` legacy**: NO en scope V1. Coexisten. Re-evaluar tras 6 meses con `facet_view_drift = 0` sostenido. Cuando se evalúe, abrir TASK-### derivado.

4. **Write capabilities por facet**: V1 cubre solo `read` y `read_sensitive`. Write actions (`update`, `approve`, `export`) sobre facet content siguen gobernadas por capabilities per-módulo existentes (e.g. `finance.expenses.update`). Si emerge necesidad de write transversal por facet (e.g. "actualizar identity de la organización desde cualquier entrypoint"), abrir TASK-### V1.1.

5. **Client portal scope**: V1 declara `entrypointContext='client_portal'` pero la implementación inicial cubre `agency` y `finance`. Activación de client portal queda como follow-up con security review específico (Globe — Sky, etc.).

## Apéndice A — Matriz capabilities × relationship × entrypoint

Resumen de cuándo cada relationship típicamente tiene cada capability (por defecto del catalog, no inviolable — Admin Center puede sobreescribir):

| Capability | internal_admin | assigned_member | client_portal_user | unrelated_internal |
|---|---|---|---|---|
| `organization.identity:read` | ✓ all | ✓ tenant | ✓ own | ✗ |
| `organization.identity_sensitive:read_sensitive` | ✓ all | ✗ | ✗ | ✗ |
| `organization.team:read` | ✓ all | ✓ tenant | ✓ own (subset) | ✗ |
| `organization.delivery:read` | ✓ all | ✓ tenant | ✓ own | ✗ |
| `organization.economics:read` | ✓ all | ✓ tenant | ✗ | ✗ |
| `organization.finance:read` | ✓ all | depends on role_in_account | ✗ | ✗ |
| `organization.finance_sensitive:read_sensitive` | ✓ all | ✗ | ✗ | ✗ |
| `organization.crm:read` | ✓ all | ✓ tenant if commercial | ✗ | ✗ |
| `organization.services:read` | ✓ all | ✓ tenant | ✓ own | ✗ |
| `organization.staff_aug:read` | ✓ all | ✓ tenant if staffing | ✗ | ✗ |
| `organization.spaces:read` | ✓ all | ✓ tenant | ✗ | ✗ |

`assigned_member` final access depende del `role_in_account` (lead, member, finance_contact, etc.) — gobernado por Admin Center grants, NO hardcodeado en código.

## Apéndice B — Mapeo facet ↔ viewCode (para reliability signal)

| Facet | viewCode underlying | routePath |
|---|---|---|
| `identity` | `gestion.organizaciones` | `/agency/organizations` |
| `spaces` | `gestion.spaces` | `/agency/spaces` |
| `team` | `gestion.organizaciones` | `/agency/organizations` |
| `delivery` | `gestion.agencia` | `/agency` |
| `finance` | `finance.clients` | `/finance/clients` |
| `economics` | `finance.clients` | `/finance/clients` |
| `crm` | `commercial.contacts` | `/agency/crm` |
| `services` | `gestion.servicios` | `/agency/services` |
| `staffAug` | `gestion.staff_augmentation` | `/agency/staff-augmentation` |

Mantenido en `src/lib/organization-workspace/facet-view-mapping.ts`. Cualquier cambio en este mapping requiere actualizar el reliability signal `facet_view_drift` query.

---

**Fin del spec V1.** Cualquier extensión (V1.1, V2) debe agregar sección `## Delta YYYY-MM-DD — TASK-###` al inicio del documento siguiendo el patrón de `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

## Delta 2026-05-08 — TASK-613 + Receta canónica para facets nuevos / dual-entrypoint

### Cómo agregar un facet nuevo a Organization Workspace

Cuando emerja la necesidad de un facet adicional (e.g. `marketing`, `legal`, `compliance`, `audit_trail`, `support_history`, etc.), seguir esta receta canónica end-to-end. Cero mezcla con plumbing técnico ad-hoc.

#### Paso 1 — Catálogo de facets

- Extender `OrganizationFacet` enum en `src/lib/organization-workspace/facet-capability-mapping.ts` agregando el nuevo key (ej. `'marketing'`).
- Declarar la capability requerida + label + descripción.
- Agregar el `viewCode` underlying en `src/lib/organization-workspace/facet-view-mapping.ts` (Apéndice B). Si el facet no tiene un viewCode legacy reutilizable, declarar uno nuevo en el mapping table de `views`.

#### Paso 2 — Capabilities granulares

- Seedear `organization.<facet>:read` (y `:read_sensitive` si aplica) en `capabilities_registry`.
- Declarar grants iniciales por relationship (ver Apéndice A) en el migration de seed.
- Documentar la matriz expected `relationship × capability → access` en este spec con un Delta nuevo.

#### Paso 3 — Facet content component (self-contained)

```tsx
// src/views/greenhouse/organizations/facets/MarketingFacet.tsx
'use client'

import type { FacetContentProps } from '@/components/greenhouse/organization-workspace/types'

const MarketingFacet = ({ organizationId, entrypointContext, fieldRedactions, projection }: FacetContentProps) => {
  // Self-fetch propio (no esperar props del shell). Drawers propios. NO renderizar
  // chrome (header, KPIs, tabs) — el shell ya lo hace.

  if (entrypointContext === 'marketing') {
    return <MarketingRichContent organizationId={organizationId} />
  }

  return <MarketingAgencyContent organizationId={organizationId} />
}

export default MarketingFacet
```

Reglas:

- El facet decide qué renderizar según `entrypointContext` (single-source dispatch).
- Self-contained: queries propias, drawers propios, mutations propias.
- Respetar `fieldRedactions[<facet>]` cuando aplique (e.g. censurar campos sensibles).
- NUNCA renderizar header, KPI strip, tab navigation — el shell lo hace.

#### Paso 4 — FacetContentRouter registry

Agregar entrada al `FACET_REGISTRY` en `src/components/greenhouse/organization-workspace/FacetContentRouter.tsx`:

```ts
const FACET_REGISTRY: Record<OrganizationFacet, FacetEntry> = {
  // ...existing...
  marketing: {
    Component: dynamic(() => import('@/views/greenhouse/organizations/facets/MarketingFacet'), {
      ssr: false,
      loading: FacetLoadingFallback
    })
  }
}
```

Lazy-loaded via `dynamic()` para mantener bundle del shell pequeño.

#### Paso 5 — Reliability signal (opcional pero recomendado para facets críticos)

Si el facet depende de un dataset que puede tener drift contra el modelo canónico 360, agregar un signal en `src/lib/reliability/queries/`:

- Reader: `getMarketingFacetSignal(): Promise<ReliabilitySignal>`.
- Wire en `get-reliability-overview.ts`.
- Test 4 paths: ok / warning / SQL anti-regresión / degraded.

### Cómo agregar un entrypoint nuevo (page con shell + projection)

Cuando un módulo necesite **renderear el Organization Workspace shell desde su propia ruta** (e.g. `/legal/organizations/[id]`, `/audit/clients/[id]`, `/marketing/accounts/[id]`):

#### Paso 1 — Extender `EntrypointContext`

Agregar el nuevo entrypoint al union type en `src/lib/organization-workspace/projection-types.ts`:

```ts
export type EntrypointContext = 'agency' | 'finance' | 'admin' | 'client_portal' | 'marketing'
```

#### Paso 2 — Rollout flag canónico

Agregar key al CHECK constraint de `home_rollout_flags` (migration nueva):

```sql
ALTER TABLE greenhouse_serving.home_rollout_flags
  DROP CONSTRAINT home_rollout_flags_key_check;

ALTER TABLE greenhouse_serving.home_rollout_flags
  ADD CONSTRAINT home_rollout_flags_key_check CHECK (
    flag_key IN (
      'home_v2_shell',
      'organization_workspace_shell_agency',
      'organization_workspace_shell_finance',
      'organization_workspace_shell_marketing'
    )
  );

INSERT INTO greenhouse_serving.home_rollout_flags
  (flag_key, scope_type, scope_id, enabled, reason)
VALUES
  ('organization_workspace_shell_marketing', 'global', NULL, FALSE, 'TASK-### staged rollout default');
```

Extender también el `WorkspaceShellScope` union en `src/lib/workspace-rollout/index.ts` y el `HomeRolloutFlagKey` en `src/lib/home/rollout-flags.ts`.

#### Paso 3 — Server page canónico

Mirror exacto del patrón Agency / Finance:

1. `requireServerSession` (prerender-safe).
2. `isWorkspaceShellEnabledForSubject(subject, '<scope>')` con `try/catch → false`.
3. Resolver canónico del módulo (Postgres-first + fallback). Devuelve `organizationId`.
4. Si no hay organizationId → render legacy view (zero-risk fallback).
5. `resolveOrganizationWorkspaceProjection({ subject, organizationId, entrypointContext: '<scope>' })`.
6. Render `<XxxOrganizationWorkspaceClient>`.

#### Paso 4 — Client wrapper

Mirror del Agency/Finance wrapper. Mismos slots: `kpis`, `adminActions`, `drawerSlot`, `children` render-prop. Mismo deep-link `?facet=`.

#### Paso 5 — Per-entrypoint facet dispatch (si necesario)

Si el nuevo entrypoint requiere que un facet cambie su contenido (e.g. el facet `services` debe verse distinto desde marketing vs agency), inspeccionar `entrypointContext` adentro del facet (mismo patrón que `FinanceFacet` documentado en TASK-613). NO crear facets paralelos.

### Reglas duras canónicas (organization-by-facets)

- **NUNCA** crear una vista de detalle organization-centric que NO use el Organization Workspace shell. Toda nueva surface organization-centric (clientes, prospects, partners, vendors, etc.) pasa por el shell.
- **NUNCA** componer la projection en el cliente. Server-side por construcción — el shell consume la projection prebuilt y la pasa down.
- **NUNCA** branchear `entrypointContext` afuera del facet. Si Finance vs Agency necesitan contenido distinto en la tab Finance, la decisión vive **adentro** del FinanceFacet, no en el page o el router.
- **NUNCA** modificar `OrganizationView` legacy (`src/views/greenhouse/organizations/OrganizationView.tsx`) sin migrar paralelamente al shell. Mantener legacy intacto durante el rollout.
- **NUNCA** seedear capabilities `organization.<facet>:*` sin agregar entry al spec table en Apéndice A. La matriz `relationship × capability → access` es contractual.
- **NUNCA** crear una flag `organization_workspace_shell_*` sin extender el CHECK constraint en `home_rollout_flags` + el `WorkspaceShellScope` union + el `HomeRolloutFlagKey`. Drift entre los 3 = falsos positivos en runtime.
- **NUNCA** mezclar dimensiones (e.g. "qué facet" + "qué entrypoint") en un solo enum. Son dos dimensiones ortogonales: `OrganizationFacet × EntrypointContext`.
- **NUNCA** computar la decisión `legacy fallback vs shell` en runtime sin envolver en `try/catch + captureWithDomain(...)`. Resilient defaults: en duda, legacy.
- **SIEMPRE** declarar `incidentDomainTag` en el module registry cuando un facet tiene dataset propio que puede generar incidents Sentry.
- **SIEMPRE** que un nuevo facet emerja con dataset que pueda quedar unlinked al canonical 360, agregar reliability signal análogo a `finance.client_profile.unlinked_organizations` (TASK-613).

### Patrón canónico de evolución (forward-compat)

1. **V1**: nuevo facet/entrypoint OFF por default. Solo pilot users.
2. **V1.1**: ramp-up por `roleCodes` o `tenant_type`.
3. **V2**: flip global cuando reliability signals estén en steady state ≥ 30 días.
4. **V3**: cleanup del legacy view (si existe) post 90 días sin reverts.

## Delta 2026-05-08 — TASK-613 V1.1 fase activa (Finance entrypoint pilot)

### Estado actual del rollout

`organization_workspace_shell_finance` está en **fase V1.1 (pilot)** desde 2026-05-08 21:30 UTC.

| Scope | Enabled | Activado | Razón |
|---|---|---|---|
| `global` | `false` | 2026-05-08 13:23 UTC | V1 default: staged rollout zero-risk cutover. |
| `user:user-efeonce-admin-julio-reyes` | `true` | 2026-05-08 21:30 UTC | V1.1 pilot — validar shell con 1 user antes de promover a role/global. |

Activación canónica via `POST /api/admin/home/rollout-flags` (TASK-780 platform). NO se activó vía SQL directo. La trazabilidad queda en `home_rollout_flags.reason` + audit log.

### Acceptance gates V1.1 → V2 (objetivos, no opinables)

Para promover a V2 (`scope_type='role', scope_id='efeonce_admin'`), TODAS las señales deben estar verdes durante **≥ 7 días consecutivos**:

| Gate | Signal / fuente | Steady state |
|---|---|---|
| 1 | `finance.client_profile.unlinked_organizations` | severity=ok, count=0 |
| 2 | `identity.workspace_projection.facet_view_drift` | severity=ok, count=0 |
| 3 | `identity.workspace_projection.unresolved_relations` | severity=ok, count=0 |
| 4 | `home.rollout.drift` | severity=ok |
| 5 | Sentry `domain=finance` con tag `source: 'finance_clients_detail_page'` | sin nuevos incidents |
| 6 | Playwright smoke (`finance-account-balances-fx-drift.spec.ts` y vecinos) | verde ≥ 48h |
| 7 | Pilot user feedback (Julio) | sin reportes de regresión funcional vs legacy `<ClientDetailView>` |

Si CUALQUIER gate falla → no se promueve. Se investiga la causa, se documenta en ISSUE, se fixea, se reinicia el contador de steady state.

### Acceptance gates V2 → V3 (global flip)

Mismas 7 gates verdes durante **≥ 30 días consecutivos** desde V2 activado. Esto garantiza que el role-scope (que cubre todos los `efeonce_admin`s, no solo el pilot) no expone bugs nuevos.

### Acceptance gates V3 → V4 (cleanup legacy `<ClientDetailView>`)

Mismas 7 gates verdes durante **≥ 90 días desde V3** sin reverts ni rollbacks. V4 elimina el componente legacy + el fallback path en `page.tsx`. La eliminación es irreversible — por eso el período mínimo es 3x V2→V3.

### Procedimiento de rollback (resilient < 30s)

Si emerge cualquier bug en cualquier fase, **1 UPDATE SQL revierte la fase**. El cache del resolver es TTL 30s in-memory → propaga automáticamente.

```sql
UPDATE greenhouse_serving.home_rollout_flags
SET enabled = FALSE, updated_at = NOW(),
    reason = 'Rollback V1.1 pilot: <descripción del issue>'
WHERE flag_key = 'organization_workspace_shell_finance'
  AND scope_type = 'user' AND scope_id = 'user-efeonce-admin-julio-reyes';
```

NO requiere deploy, NO requiere rebuild, NO requiere coordinación. Patrón canónico per TASK-780.

### Reglas operativas durante el rollout

- **NUNCA** modificar la flag directamente vía SQL en producción para activar (siempre usar el endpoint canónico). El endpoint persiste audit + emite outbox event que invalida el cache distribuido. SQL directo bypasea el audit.
- **SIEMPRE** declarar `reason` con prefix `TASK-613 V<fase> — <propósito>` para trazabilidad cross-phase.
- **NUNCA** promover a la siguiente fase si Playwright smoke está rojo, aunque la causa "no parezca relacionada" (caso real: ISSUE-069 estuvo rojo 14h por bug de cron, no por TASK-613, pero promover sin verde escondería regresiones reales).
- **SIEMPRE** que un agente o operador ejecute una fase, registrar en `Handoff.md` la transición + fecha + scope + reason.
