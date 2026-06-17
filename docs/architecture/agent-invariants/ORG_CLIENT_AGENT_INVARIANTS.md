# Invariantes operativos para agentes — Organization Workspace + Client Portal (TASK-611, 613, 822)

---

## Invariantes operativos para agentes — Organization Workspace + Client Portal (TASK-611, 613, 822)

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim.** Contrato: `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (611/613), `GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` (822). Dedup = Slice 4.

### Organization Workspace projection invariants (TASK-611)

Toda surface que renderice el detalle de una organización (`/agency/organizations/[id]`, `/finance/clients/[id]`, futuros entrypoints organization-first) **debe** consumir el helper canónico:

```ts
import { resolveOrganizationWorkspaceProjection } from '@/lib/organization-workspace/projection'

const projection = await resolveOrganizationWorkspaceProjection({
  subject,           // TenantEntitlementSubject completo (userId + tenantType + roleCodes + ...)
  organizationId,
  entrypointContext  // 'agency' | 'finance' | 'admin' | 'client_portal'
})
```

El helper devuelve un contrato versionado con `visibleFacets`, `visibleTabs`, `defaultFacet`, `allowedActions`, `fieldRedactions`, `degradedMode`, `degradedReason`. Composición determinística per spec V1.1 §4.4 (5 categorías canónicas de relación × 9 facets × 4 entrypoints), cache TTL 30s in-memory.

**Single source of truth runtime**: `src/config/entitlements-catalog.ts` declara las 11 capabilities `organization.<facet>.<action>`. **Reflexión declarativa DB**: `greenhouse_core.capabilities_registry` (TASK-611 Slice 2). Parity test runtime (`src/lib/capabilities-registry/parity.ts` + `parity.live.test.ts`) rompe build si emerge drift TS↔DB.

**5 relaciones canónicas** (resueltas por `relationship-resolver.ts` con un solo CTE PG, cross-tenant isolation enforced en SQL):

- `internal_admin` — efeonce_admin role
- `assigned_member` — `client_team_assignments` matched para esta org via `spaces` bridge
- `client_portal_user` — `client_users.tenant_type='client'` + `client_id` resolves to org via `spaces`
- `unrelated_internal` — internal sin admin ni assignment
- `no_relation` — base case

**Bridge canónico user ↔ organization**: `client_team_assignments.client_id` ⇄ `greenhouse_core.spaces.client_id` ⇄ `spaces.organization_id`. La tabla `clients` NO tiene `organization_id` directo — el puente es `spaces`.

**Reactive cache invalidation**: el consumer `organizationWorkspaceCacheInvalidationProjection` (`src/lib/sync/projections/organization-workspace-cache-invalidation.ts`) responde a 5 events canónicos (`access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `role.assigned`, `role.revoked`, `user.deactivated`) y droppa el cache scoped al subject afectado. Idempotente.

**Reliability signals canónicos** (subsystem `Identity & Access`):

- `identity.workspace_projection.facet_view_drift` (drift, warning si > 0). Detecta drift estructural FACET_TO_VIEW_CODE × VIEW_REGISTRY (rename de viewCode sin update del mapping). Steady=0.
- `identity.workspace_projection.unresolved_relations` (data_quality, error si > 0). Cuenta `client_users` activos con `tenant_type='client'` que no resolverán a ninguna org via spaces. Steady=0.

**⚠️ Reglas duras**:

- **NUNCA** computar visibilidad de facet en cliente. La projection es server-only (`import 'server-only'` en `projection.ts`).
- **NUNCA** mencionar literalmente capabilities `organization.<facet>` ni importar `hasEntitlement`/`can` desde `@/lib/entitlements/runtime` en componentes UI bajo `src/components/`, `src/views/`, `src/app/`. La lint rule `greenhouse/no-inline-facet-visibility-check` (modo `error`) bloquea. Override block exime los archivos canónicos en `src/lib/organization-workspace/`, `src/lib/capabilities-registry/`, `src/lib/entitlements/`.
- **NUNCA** asumir relación subject↔org en código de presentación. Toda decisión pasa por `resolveSubjectOrganizationRelation`.
- **NUNCA** mezclar `entrypointContext` con `scope` de capability. Entrypoint es presentación (default tabs, copy en es-CL); scope es autorización (own/tenant/all).
- **NUNCA** branchear UI por `relationship.kind` inline. La projection ya filtró — el shell solo lee `visibleFacets` / `allowedActions`.
- **NUNCA** materializar la projection en BQ/PG. Es read-light + cacheable. Si en futuro emerge listado >100 orgs con projection per-row, agregar `accessLevel` summary endpoint (no projection completa).
- **NUNCA** llamar `Sentry.captureException()` directo en este path. Usar `captureWithDomain(err, 'identity', { tags: { source: 'workspace_projection_*' }, extra })`.
- **NUNCA** persistir un grant fino sin pasar por `capabilities_registry`. Cuando emerja `entitlement_grants` (cleanup ISSUE-068 / TASK-404), agregar FK al registry.
- **NUNCA** crear capability nueva en TS sin migration que la seedee en `capabilities_registry`. La parity test rompe el build.
- **SIEMPRE** marcar `degradedMode=true` con `degradedReason` enumerado (`relationship_lookup_failed | entitlements_lookup_failed | no_facets_authorized`) cuando la projection no puede resolverse — nunca crashear, nunca devolver `visibleFacets: []` silenciosamente.
- **SIEMPRE** invalidar cache vía `clearProjectionCacheForSubject(subjectId)` cuando un grant/revoke se aplica al subject (consumer del outbox event ya maneja esto para los 5 events canónicos).
- **SIEMPRE** que emerja un nuevo entrypoint organization-first, reusar el helper + shell. Cero composición ad-hoc.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (V1.1 con Delta 2026-05-08). Doc funcional: `docs/documentation/identity/sistema-identidad-roles-acceso.md` sección "Facets de Organization Workspace". ISSUE asociado: `docs/issues/open/ISSUE-068-task-404-pre-up-marker-bug-governance-tables-never-created.md`.

### Client Portal BFF / Anti-Corruption Layer invariants (TASK-822, desde 2026-05-12)

`src/lib/client-portal/` es un **Backend-for-Frontend / Anti-Corruption Layer** del route group `client`. NO es un dominio productor. Surfaces curated re-exports de readers que viven (y son owned por) producer domains (`account-360`, `agency`, `ico-engine`, `commercial`, `finance`, `delivery`, `identity`). El módulo es **hoja del DAG** de dominios: producer domains NUNCA importan de él.

**Module classification dual** (mutuamente excluyente, spec §3.1):

- `readers/curated/` — re-export puro de un reader que vive en un producer domain. `ownerDomain` non-null. La firma sigue exacta al upstream; si el upstream cambia, el re-export refleja el cambio automáticamente.
- `readers/native/` — nacido en `client_portal` porque no hay producer domain que lo posea. `ownerDomain: null`. V1.0 ships ZERO native readers; primer candidato emerge con TASK-825 (resolver de `modules`).

**Metadata canónica obligatoria** (`src/lib/client-portal/dto/reader-meta.ts`):

```ts
export interface ClientPortalReaderMeta {
  readonly key: string                                          // matchea el filename
  readonly classification: 'curated' | 'native'
  readonly ownerDomain: ClientPortalReaderOwnerDomain | null   // null SOLO en native
  readonly dataSources: readonly ClientPortalDataSource[]      // non-empty
  readonly clientFacing: boolean
  readonly routeGroup: 'client' | 'agency' | 'admin'
}
```

Cada archivo bajo `readers/{curated,native}/` exporta un `*Meta: ClientPortalReaderMeta`. `assertReaderMeta()` enforce invariantes en runtime (usado en tests anti-regresión).

**Sentry domain canónico** `client_portal` agregado al `CaptureDomain` union de `captureWithDomain` (TASK-822 Slice 2). Reliability rollup completo emerge con TASK-829 (subsystem `Client Portal Health`).

**Domain import direction enforced** (spec §3.2, hoja del DAG):

- Permitido: `src/lib/client-portal/**` → `src/lib/{account-360,agency,ico-engine,commercial,finance,delivery,identity}/**`
- Permitido: `src/{app,views,components}/**` → `src/lib/client-portal/**`
- **Prohibido**: `src/lib/{producer-domain}/**` → `src/lib/client-portal/**`

**Defense in depth** (3 capas):

1. ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` modo `error` (TASK-822 Slice 3). Cubre 4 shapes: static ESM, dynamic `import()`, `require()`, relative `../client-portal/`. Override block en `eslint.config.mjs` exime `src/lib/client-portal/**` + el rule + sus tests fixtures.
2. Grep negativo en code review: `rg "from '@/lib/client-portal" src/lib/{agency,finance,hr,account-360,ico-engine,identity,delivery,commercial}/` debe estar vacío.
3. Doctrina canonizada acá (CLAUDE.md) — cuando emerja un patrón análogo (`partner_portal`, `vendor_portal`, `internal_admin_portal`) replicar verbatim.

**⚠️ Reglas duras**:

- **NUNCA** mover físicamente un reader de su producer domain a `src/lib/client-portal/readers/curated/`. La curated layer es un puntero, NO una mudanza. El reader sigue owned por el producer domain.
- **NUNCA** clasificar como `curated` un reader que aplica thin adaptation (e.g. agrega un parámetro `clientPortalContext`). Si adapta, es `native` con `ownerDomain` documentando la fuente original — pero antes de crear native, evaluar si la adaptation pertenece al producer domain (extender API upstream suele ser correcto).
- **NUNCA** importar `@/lib/client-portal/*` desde un producer domain. La rule lo bloquea; si emerge la tentación, el caller está en la capa equivocada (debería estar bajo `src/app/`, `src/views/`, `src/components/`) o el reader que se quiere reusar está en el lugar equivocado (sacarlo del client_portal al producer correspondiente).
- **NUNCA** mezclar dimensiones: `classification` (curated/native) y `ownerDomain` son ortogonales. Curated siempre tiene `ownerDomain` non-null; native siempre tiene `ownerDomain: null`. El runtime invariant en `assertReaderMeta()` rompe el test si emerge drift.
- **NUNCA** crear un reader curated sin `dataSources[]` non-empty. La whitelist `ClientPortalDataSource` enumera los producer surfaces; si emerge una nueva, agregarla al type union + coordinar con TASK-824 para mantener parity con `greenhouse_client_portal.modules.data_sources[]` en DB.
- **NUNCA** invocar `Sentry.captureException()` directo en code paths de `src/lib/client-portal/`. Usar `captureWithDomain(err, 'client_portal', { extra })`.
- **NUNCA** crear carpeta `commands/` ni helpers nuevos en `client_portal` sin consumer real demostrado. La regla "Don't add abstractions beyond what the task requires" aplica fuerte acá — placeholder files = drift.
- **NUNCA** desactivar la ESLint rule via `// eslint-disable-next-line`. Si emerge un caso legítimo, agregarlo al override block en `eslint.config.mjs` con comentario justificando.
- **SIEMPRE** que un dominio adicional con shape BFF emerja (partner portal, vendor portal, etc.), replicar el patrón: hoja del DAG + lint rule canónica + classification curated/native + metadata tipada. NO inventar primitiva nueva.

**Spec canónica**: `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` V1.1 §3.1 + §3.2 + §10 patrón aplicable. Module README: `src/lib/client-portal/README.md`. Doctrine source pattern: TASK-611 (organization workspace projection — domain boundary lint rule canonical sibling).

### Organization-by-facets — receta canónica para extender (TASK-613)

Patrón canónico cuando emerja la necesidad de un **facet nuevo** (e.g. `marketing`, `legal`, `compliance`) o un **entrypoint nuevo** que renderee el Organization Workspace shell desde su propia ruta (e.g. `/legal/organizations/[id]`, `/marketing/accounts/[id]`):

#### Para agregar un facet nuevo (5 pasos canónicos)

1. **Catálogo**: extender `OrganizationFacet` enum en `src/lib/organization-workspace/facet-capability-mapping.ts` + agregar `viewCode` underlying en `src/lib/organization-workspace/facet-view-mapping.ts`.
2. **Capabilities**: seedear `organization.<facet>:read` (+ `:read_sensitive` si aplica) en `capabilities_registry` con migration. Documentar matriz `relationship × capability → access` en spec V1.
3. **Facet content** (`src/views/greenhouse/organizations/facets/<Name>Facet.tsx`): self-contained, queries propias, drawers propios. NUNCA renderiza chrome (header, KPIs, tabs) — el shell ya lo hace. Si necesita divergir per-entrypoint, inspeccionar `entrypointContext` adentro del facet (NO crear facets paralelos).
4. **Registry**: agregar entry al `FACET_REGISTRY` en `src/components/greenhouse/organization-workspace/FacetContentRouter.tsx` con `dynamic()` lazy load.
5. **Reliability signal** (recomendado para facets críticos): reader en `src/lib/reliability/queries/<facet>-*.ts` siguiendo el patrón TASK-613 `finance-client-profile-unlinked.ts` (5 tests: ok / warning / SQL anti-regresión / degraded / pluralización).

#### Para agregar un entrypoint nuevo (5 pasos canónicos)

1. **Type union**: extender `EntrypointContext` en `src/lib/organization-workspace/projection-types.ts`.
2. **Rollout flag**: migration que extienda CHECK constraint `home_rollout_flags_key_check` con `organization_workspace_shell_<scope>` + INSERT global `enabled=FALSE` por default. Extender también `WorkspaceShellScope` en `src/lib/workspace-rollout/index.ts` y `HomeRolloutFlagKey` en `src/lib/home/rollout-flags.ts` — drift entre los 3 = falsos positivos en runtime.
3. **Server page** (`src/app/(dashboard)/<scope>/.../[id]/page.tsx`): mirror exacto de `agency/organizations/[id]/page.tsx` o `finance/clients/[id]/page.tsx`:
   - `requireServerSession` (prerender-safe)
   - `isWorkspaceShellEnabledForSubject(subject, '<scope>')` con `try/catch → false` (resilient default a legacy)
   - Resolver canónico del módulo (Postgres-first + fallback) → devuelve `organizationId` o `null`
   - Si flag disabled OR sin organizationId → render legacy view (zero-risk fallback)
   - `resolveOrganizationWorkspaceProjection({ subject, organizationId, entrypointContext: '<scope>' })`
   - Errores en cualquier step → `captureWithDomain(err, '<domain>', ...)` y degradar a legacy.
4. **Client wrapper** (`<ScopeOrganizationWorkspaceClient>`): mirror del Agency/Finance wrapper. Mismos slots: `kpis`, `adminActions`, `drawerSlot`, `children` render-prop. Mismo deep-link `?facet=` con URL sync via `useSearchParams + router.replace`.
5. **Per-entrypoint dispatch** (si aplica): si un facet existente debe cambiar contenido para el nuevo entrypoint, agregar branch dentro del facet inspeccionando `entrypointContext` (patrón canónico `FinanceFacet` desde TASK-613).

#### ⚠️ Reglas duras canónicas (organization-by-facets)

- **NUNCA** crear una vista de detalle organization-centric que NO use el Organization Workspace shell. Toda nueva surface (clientes, prospects, partners, vendors, etc.) pasa por el shell.
- **NUNCA** componer la projection en el cliente. Server-side por construcción — el shell consume la projection prebuilt y la pasa down.
- **NUNCA** branchear `entrypointContext` afuera del facet. Si Finance vs Agency necesitan contenido distinto en la tab Finance, la decisión vive **adentro** del FinanceFacet, no en el page o el router.
- **NUNCA** modificar `OrganizationView` legacy (`src/views/greenhouse/organizations/OrganizationView.tsx`) sin migrar paralelamente al shell. Mantener legacy intacto durante el rollout.
- **NUNCA** seedear capabilities `organization.<facet>:*` sin agregar entry al spec table en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Apéndice A. La matriz `relationship × capability → access` es contractual.
- **NUNCA** crear una flag `organization_workspace_shell_*` sin extender los 3 lugares (CHECK constraint + `WorkspaceShellScope` + `HomeRolloutFlagKey`). Drift entre los 3 = falsos positivos en runtime.
- **NUNCA** mezclar dimensiones (e.g. "qué facet" + "qué entrypoint") en un solo enum. Son ortogonales: `OrganizationFacet × EntrypointContext`.
- **NUNCA** computar la decisión `legacy fallback vs shell` en runtime sin envolver en `try/catch + captureWithDomain(...)`. Resilient defaults: en duda, legacy.
- **NUNCA** modificar la flag `organization_workspace_shell_*` directamente vía SQL. Toda mutación pasa por el admin endpoint `POST /api/admin/home/rollout-flags` (TASK-780).
- **SIEMPRE** declarar `incidentDomainTag` en el module registry cuando un facet tiene dataset propio que puede generar incidents Sentry.
- **SIEMPRE** que un nuevo facet emerja con dataset que pueda quedar unlinked al canonical 360, agregar reliability signal análogo a `finance.client_profile.unlinked_organizations` (TASK-613).
- **SIEMPRE** seguir el rollout staged: V1 OFF default → V1.1 pilot users → V2 flip global con steady-state ≥30 días → V3 cleanup legacy ≥90 días sin reverts.

#### Patrón canónico per-entrypoint dispatch en facet (TASK-613 reference)

```tsx
// src/views/greenhouse/organizations/facets/FinanceFacet.tsx
const FinanceFacet = ({ organizationId, entrypointContext }: FacetContentProps) => {
  if (entrypointContext === 'finance') {
    return <FinanceClientsContent lookupId={organizationId} />
  }

  return <FinanceFacetAgencyContent organizationId={organizationId} />
}
```

El facet sigue siendo self-contained: queries propias, drawers propios. NO renderiza chrome — el shell ya lo hace. Es el patrón de referencia cuando un facet necesite divergir per-entrypoint sin fragmentar el FACET_REGISTRY.

**Spec canónica**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08 (receta detallada). Tasks de referencia: TASK-611 (foundation), TASK-612 (shell + Agency entrypoint), TASK-613 (Finance entrypoint + dual-dispatch pattern).
