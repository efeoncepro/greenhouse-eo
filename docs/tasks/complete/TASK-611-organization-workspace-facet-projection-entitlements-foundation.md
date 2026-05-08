# TASK-611 — Organization Workspace Facet Projection & Fine-Grained Entitlements Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `EPIC-008`
- Status real: `Cerrada 2026-05-08 (V1.1 — 7 slices entregados, 3588/3588 tests verdes)`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-611-organization-workspace-facet-projection-entitlements-foundation`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Crear la foundation canónica para que el Organization Workspace derive facets, tabs y acciones desde entitlements finos en vez de hardcodes por módulo. Esta task no colapsa rutas ni mezcla Agency/Finance todavía; establece el contrato reusable que permite hacerlo de forma segura y escalable.

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` (V1.1 con Delta 2026-05-08). Esta task implementa §4 (Modelo) y §5 (Defense-in-depth) y §6 (Reliability signals) del spec.

## Delta 2026-05-08 — Recalibración pre-execution

Discovery contra el repo reveló cinco divergencias entre el spec V1 y el estado real del código/PG. Detalle completo en `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` Delta 2026-05-08. Ajustes a esta task:

1. **`entitlement_grants` NO existe** → `capabilities_registry` se entrega SIN FK desde grants en V1; la TS↔DB parity test es el guardia.
2. **Eventos `identity.entitlement.granted/revoked` NO existen** → Slice 6 consume los 5 events canónicos: `access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `role.assigned`, `role.revoked`, `user.deactivated`. Los dos primeros se agregan a `REACTIVE_EVENT_TYPES` aquí.
3. **Columnas reales del relationship resolver** difieren del spec — Slice 3 query bridges via `greenhouse_core.spaces` (que tiene `client_id` + `organization_id`).
4. **5 categorías canónicas**, no 4 (la 5a es la rama base `no_relation`).
5. **Layer 5 audit log de TASK-404 está bloqueado por pre-up-marker bug** — fuera de scope de TASK-611. Se documenta en ISSUE separado en Slice 7.

## Why This Task Exists

Greenhouse ya tiene las piezas importantes, pero todavía no están alineadas:

- `Account 360` ya expone facets cross-domain
- `facet-authorization.ts` ya resuelve una primera política de visibilidad por facet
- el runtime de entitlements ya existe (`TASK-403`, `TASK-404`)
- las views del portal todavía se gobiernan en gran parte con `authorizedViews` y checks broad (`finance.workspace`, `agency.workspace`)

El gap actual es que todavía no existe una capa explícita que responda:

- qué facets de una organización puede ver un usuario
- qué tabs renderizar en cada entrypoint
- qué acciones habilitar por facet
- cómo mapear eso a `views` actuales sin duplicar lógica entre Agency y Finance

Sin esta foundation, cualquier intento de converger `Organizaciones` y `Clientes` termina en:

- tabs hardcodeados por ruta
- checks locales no reutilizables
- experiencias divergentes para la misma organización
- riesgo de abrir facets incorrectas al compartir un shell

## Goal

- Definir capabilities finas para facets del Organization Workspace.
- Crear una capa de proyección que derive tabs, KPIs y acciones desde entitlements + relación con la organización.
- Alinear esa capa con el `Account 360` y con `facet-authorization.ts` en vez de inventar un segundo modelo paralelo.
- Dejar una base reusable por Agency, Finance y futuros entrypoints organization-first.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` ← **spec canónico vinculante**
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md` (TASK-742 7-layer template)
- `docs/architecture/GREENHOUSE_FEATURE_FLAGS_ROLLOUT_PLATFORM_V1.md` (TASK-780 patrón flag)

Reglas obligatorias:

- `organization` sigue siendo la entidad B2B canónica; esta task no debe reintroducir `client_profile` como owner del workspace.
- `views` / `authorizedViews` siguen existiendo como surfaces de UI; **NO se retiran en V1**. Coexisten con la projection. Reliability signal `facet_view_drift` es el guardia.
- La autorización fina se expresa en `module + capability + action + scope`. **El namespace canónico es `organization.<facet>.<action>`** (cierra Open Question — ver §2 del spec V1). Entrypoint NO es dimensión de autorización.
- La visibilidad final de facets respeta `entitlements + relación + scope` derivados por el resolver canónico (§4.3 spec V1).
- **NO abrir un segundo modelo de facets paralelo al `Account 360`**; la projection consume `authorizeAccountFacets` existente como input para `fieldRedactions`.
- **Defense-in-depth obligatorio** (TASK-742 7-layer): DB constraint + app guard + UI affordance + reliability signal + audit log + approval workflow + outbox event. Cada uno wireado per §5 del spec V1.
- **Cache TTL 30s in-memory** (patrón TASK-780). NO materialización en BQ/PG.
- **Server-only** el projection helper (`import 'server-only'`).

## Normative Docs

- `docs/architecture/ACCOUNT_360_IMPLEMENTATION_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-403-entitlements-runtime-foundation-home-bridge.md`
- `docs/tasks/complete/TASK-404-entitlements-governance-admin-center.md`

## Dependencies & Impact

### Depends on

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/account-360/facet-authorization.ts`
- `src/lib/account-360/account-complete-360.ts`
- `src/types/account-complete-360.ts`
- `src/lib/admin/view-access-catalog.ts`

### Blocks / Impacts

- `TASK-612` shared shell de Organization Workspace
- `TASK-613` convergencia de `/finance/clients/[id]`
- futuros entrypoints organization-first fuera de Agency/Finance
- gobernanza de permisos desde Admin Center para vistas organization-centric

### Files owned

- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/account-360/facet-authorization.ts`
- `src/types/account-complete-360.ts`
- `src/lib/admin/view-access-catalog.ts`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `Account 360` ya expone 9 facets: `identity | spaces | team | economics | delivery | finance | crm | services | staffAug` (`src/types/account-complete-360.ts`).
- `facet-authorization.ts` ya implementa `authorizeAccountFacets(ctx) → { allowedFacets, deniedFacets, fieldRedactions }`.
- `entitlements-catalog.ts` ya tiene 10 modules y union de actions/scopes definidos. `runtime.ts` exporta `getTenantEntitlements`, `hasEntitlement`, `can`.
- Admin Center ya gobierna grants/overrides (TASK-403/404).
- `authorizedViews` y `routeGroups` siguen siendo surfaces broad del portal.
- Patrón `home_rollout_flags` (TASK-780) disponible para reusar.

### Gap

- No existe el módulo `organization` en el modules union — debe agregarse como namespace transversal de objeto canónico 360 (mismo patrón que `home`/`my_workspace`).
- No existen las 11 capabilities `organization.*` declaradas en §4.1 del spec V1.
- No existe `capabilities_registry` DB-backed con CHECK + FK desde `entitlement_grants` (defense-in-depth capa 1).
- No existe `relationship-resolver.ts` con las 4 categorías canónicas enumeradas.
- No existe el projection helper canónico (`resolveOrganizationWorkspaceProjection`).
- No existe el reliability signal `identity.workspace_projection.facet_view_drift`.
- Agency y Finance no comparten una proyección común del mismo objeto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Capability model + TS catalog

- Agregar `organization` al union de modules en `src/config/entitlements-catalog.ts`.
- Declarar las 11 capabilities canónicas `organization.<facet>.<action>` por §4.1 del spec V1 con `actions` y `defaultScope` por entry.
- Mapping canónico `OrganizationFacet → capability_key` en `src/lib/organization-workspace/facet-capability-mapping.ts`.
- Mapping canónico `OrganizationFacet → viewCode` en `src/lib/organization-workspace/facet-view-mapping.ts` (insumo del reliability signal).

### Slice 2 — Capabilities registry DB + FK enforcement

- Migration `migrations/<ts>_organization-capabilities-registry.sql`:
  - `CREATE TABLE greenhouse_core.capabilities_registry` con PK + CHECK + descripción + `introduced_at`/`deprecated_at`.
  - Seed con todas las capabilities `organization.*` desde el TS catalog.
  - `ALTER TABLE greenhouse_core.entitlement_grants ADD CONSTRAINT entitlement_grants_capability_key_fk FOREIGN KEY...` con NOT VALID + VALIDATE atomic (patrón TASK-708/728).
- Verificar DDL aplicado via `information_schema` (anti pre-up-marker bug TASK-768 Slice 1).
- Test paridad TS↔DB: `entitlementsCatalog.map(e => e.key).sort()` ≡ `SELECT capability_key FROM capabilities_registry WHERE deprecated_at IS NULL`. Romper build si drift.

### Slice 3 — Relationship resolver canónico

- Helper `src/lib/organization-workspace/relationship-resolver.ts` con type union `SubjectOrganizationRelation` (5 variantes per §4.3 spec V1).
- Single Postgres query con CTEs para resolver `internal_admin | assigned_member | client_portal_user | unrelated_internal | no_relation`.
- Cross-tenant isolation enforced en WHERE clause (no filtrado en TS).
- Indexes asegurados: `client_team_assignments(member_user_id, organization_id, active_until)` parcial; `client_users(user_id, organization_id)` UNIQUE.
- Test matriz personas: 5 relations × proxy organizations × edge cases (assignment expirado, multi-org client_portal_user, etc.).
- Test cross-tenant isolation: assert que un subject del tenant A no puede leer assignment del tenant B aunque `organizationId` apunte a tenant B.

### Slice 4 — Projection helper + cache + degraded mode

- Helper `src/lib/organization-workspace/projection.ts`:
  - `import 'server-only'` mandatorio.
  - Pure function: `resolveOrganizationWorkspaceProjection({ subject, organizationId, entrypointContext })` → `OrganizationWorkspaceProjection`.
  - Composición determinística por §4.4 spec V1 (orden de evaluación 1-7).
  - Absorbe `authorizeAccountFacets` existente como input para `fieldRedactions` (NO lo reemplaza).
  - Default facet por entrypoint según matriz §4.4.
- Cache in-memory TTL 30s keyed por `${subjectId}:${organizationId}:${entrypointContext}` (patrón TASK-780).
- `clearProjectionCacheForSubject(subjectId)` invocable por consumer del outbox event `identity.entitlement.granted/revoked` (TASK-404) → invalidación reactiva.
- Degraded mode: nunca throw, siempre `{ degradedMode: true, degradedReason: 'relationship_lookup_failed' | 'entitlements_lookup_failed' | 'no_facets_authorized', visibleFacets: [] }`.
- Tests: matriz personas × 4 entrypoints (5 × 9 facets × 4 = 180 assertions con snapshot table).

### Slice 5 — Reliability signals

- Reader `src/lib/reliability/queries/workspace-projection-drift.ts` con query §6 spec V1.
- Signal `identity.workspace_projection.facet_view_drift` (kind=`drift`, severity=`warning` si count>0, steady=0).
- Reader `src/lib/reliability/queries/workspace-projection-unresolved-relations.ts`.
- Signal `identity.workspace_projection.unresolved_relations` (kind=`data_quality`, severity=`error` si count>0 sostenido > 7d).
- Wire en `getReliabilityOverview` bajo subsystem `Identity & Access`.
- Decisión `identity_workspace` módulo dedicado vs extender `identity` → recomendado extender `identity` en V1 (Open Question §14 spec V1).

### Slice 6 — Outbox cache invalidation consumer

- Reactive consumer registrado para `identity.entitlement.granted` v1 + `identity.entitlement.revoked` v1.
- Consumer invoca `clearProjectionCacheForSubject(subjectId)` per-event.
- Idempotente.
- Reliability signal de dead_letter del consumer (mismo patrón TASK-771/773).

### Slice 7 — Lint rule + docs + 4-pillar verification

- Lint rule `greenhouse/no-inline-facet-visibility-check` (modo `error`): detecta patrones tipo `if (user.role === ... && organization.X)` en componentes UI. Override block para `src/lib/organization-workspace/`.
- Actualizar `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` con Delta `2026-MM-DD — TASK-611` enlazando al spec V1.
- Actualizar `docs/documentation/identity/sistema-identidad-roles-acceso.md` con sección "Facets de Organization Workspace" en lenguaje simple.
- Tests E2E: cualquier route que importe `projection.ts` debe pasar test cross-tenant + test degraded mode.
- 4-pillar score block (cierre formal — sección §11 espejo del spec V1).

## Out of Scope

- Migrar en esta task el layout o shell visual del detalle de organización.
- Converger todavía `/finance/clients/[id]` al workspace compartido.
- Eliminar `authorizedViews` o `routeGroups` del runtime.
- Rediseñar el sidebar completo del portal.

## Detailed Spec

**Spec canónico vinculante**: `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`. Esta task implementa §4 (Modelo) + §5 (Defense-in-depth) + §6 (Reliability signals) del spec.

### Decisiones cerradas (NO re-debatir)

1. **Namespace de capabilities**: `organization.<facet>.<action>` transversal. Entrypoint NO es dimensión de auth. (cierra Open Question original)
2. **`organization` se agrega al modules union** como namespace de objeto canónico 360 (mismo patrón que `home`/`my_workspace`).
3. **`facet-authorization.ts` se ABSORBE como input** del projection helper (consumido para `fieldRedactions`), NO se reemplaza.
4. **`authorizedViews` y `routeGroups` coexisten** en V1 — colapso queda como follow-up explícito post-soak ≥6 meses con `facet_view_drift = 0` sostenido.
5. **Cache TTL 30s in-memory** (patrón TASK-780). NO materialización en BQ/PG.
6. **Server-only** mandatorio en projection helper.

### Contrato de retorno (canónico)

```ts
type OrganizationWorkspaceProjection = {
  organizationId: string
  entrypointContext: 'agency' | 'finance' | 'admin' | 'client_portal'
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

### Regla de diseño (sigue vigente, ahora con anclaje)

1. `views` deciden por dónde entras (preservadas en V1).
2. `entitlements` deciden qué puedes ver/hacer (capabilities `organization.<facet>.<action>`).
3. La projection del workspace traduce eso a tabs/facets/acciones (helper canónico).
4. El `Account 360` sigue siendo el contrato de datos subyacente.

## 4-Pillar Score

### Safety

- **Authorization granular**: 11 capabilities `organization.<facet>.<action>`, `read_sensitive` separado de `read`.
- **Cross-tenant isolation**: enforced en query del `relationship-resolver` (WHERE clause filtra por tenant_id derivado del subject), no en TS.
- **Server-only**: projection helper con `import 'server-only'`. UI recibe sólo facets autorizados.
- **Blast radius**: degraded mode → `visibleFacets: []`. Cero cross-tenant leak posible.
- **Verified by**: matriz personas test (180 asserts), capability-FK test, cross-tenant isolation test, lint rule `no-inline-facet-visibility-check`.
- **Residual risk**: drift `authorizedViews` legacy ↔ projection — cuantificado por signal `facet_view_drift`. Aceptado en V1.

### Robustness

- **Idempotency**: pure function. Cache no afecta corrección.
- **Atomicity**: registry seed migration en transaction única (`-- Up Migration` marker). Grants atómicos vía TASK-404.
- **Race protection**: `entitlement_grants` UNIQUE composite, `client_team_assignments` UNIQUE composite, `capabilities_registry` PK + CHECK.
- **Constraint coverage**: PK + FK + CHECK en registry; UNIQUE composite en assignments; FK enforcement vía NOT VALID + VALIDATE atomic.
- **Bad input**: `organizationId` inválido → `no_relation` → degraded. NULL/undefined: type-narrowed por TS, runtime guard server-only.
- **Verified by**: parity test TS↔DB, concurrency test, fuzz test, FK violation test.

### Resilience

- **Retry policy**: read-only path. Cache absorbe ráfagas.
- **Dead letter**: N/A (read-only). El consumer del outbox para cache invalidation sí tiene dead_letter signal.
- **Reliability signals**: `identity.workspace_projection.facet_view_drift` + `identity.workspace_projection.unresolved_relations`.
- **Audit trail**: TASK-404 `entitlement_grant_audit_log` (append-only triggers).
- **Recovery**: cache corrupto → próximo request recomputa. Resolver falla → degraded honesto. Nunca crash.
- **Degradación honesta**: UI distingue `loading` / `empty` / `degraded` / `error` con copy en es-CL tuteo (greenhouse-ux-writing).

### Scalability

- **Hot path Big-O**: O(log n) en resolver (composite index), O(1) cache hit, O(9) projection compute.
- **Index coverage**: `client_team_assignments(member_user_id, organization_id, active_until)` parcial; `client_users(user_id, organization_id)` UNIQUE; `entitlement_grants(subject_id, capability_key)`.
- **Async paths**: cache invalidation reactiva via outbox events. Sin path blocking en hot path.
- **Cost at 10x**: linear en usuarios activos. Cache TTL 30s amortiza.
- **Pagination**: lista (Agency directory) NO ejecuta projection completa per-row. Endpoint summary `accessLevel` para listas.
- **Verified by**: `EXPLAIN ANALYZE` resolver, load test 10x synthetic, p99 latency < 200ms server-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `organization` agregado al modules union en `entitlements-catalog.ts` con las 11 capabilities canónicas.
- [ ] Tabla `greenhouse_core.capabilities_registry` materializada con seed + FK desde `entitlement_grants`.
- [ ] Test paridad TS↔DB pasa en CI (drift rompe build).
- [ ] `relationship-resolver.ts` resuelve las 5 categorías canónicas con cross-tenant isolation enforced en SQL.
- [ ] Helper `resolveOrganizationWorkspaceProjection` retorna el contrato canónico (incluyendo `degradedMode` honesto).
- [ ] Cache TTL 30s in-memory + invalidation reactiva via outbox events.
- [ ] Reliability signals `facet_view_drift` + `unresolved_relations` registrados y visibles en `/admin/operations`.
- [ ] Lint rule `greenhouse/no-inline-facet-visibility-check` activa en modo `error`.
- [ ] Tests: matriz personas (180 asserts) + cross-tenant isolation + degraded mode + FK violation.
- [ ] 4-pillar score block presente en este task file (espejo §11 spec V1).
- [ ] `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` actualizado con Delta enlazando al spec V1.
- [ ] Doc funcional `docs/documentation/identity/sistema-identidad-roles-acceso.md` actualizado con sección "Facets de Organization Workspace".

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm migrate:up` + verificación DDL via `information_schema` (anti pre-up-marker bug)
- `pnpm pg:doctor` post-migration
- Test paridad TS↔DB: nuevo script `pnpm test:capabilities-parity`
- Reliability signals visibles en `/admin/operations` post-deploy

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` quedo alineada con el contrato final

## Follow-ups

- `TASK-612` — shared shell del Organization Workspace
- `TASK-613` — convergencia de Finance Clients al workspace compartido

## Open Questions (cerradas)

### CERRADA — Namespace de capabilities

- **Decisión**: `organization.<facet>.<action>` transversal. `organization` se agrega al modules union como namespace de objeto canónico 360 (mismo patrón que `home`/`my_workspace`).
- **Rationale**: facets son una dimensión del objeto canónico, NO de un módulo. Mezclar con overlay por módulo (`agency.organization.finance`) introduce dimensiones ortogonales en un solo enum (anti-pattern overlay arch-architect). Entrypoint es presentación, NO autorización.
- **Anchor**: §2 + §4.1 del spec `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`.

## Open Questions (vivas, deferidas a slice de implementación)

1. **Reliability module dedicado vs extender `identity`**: Slice 5 decide. Recomendación V1: extender `identity` con `expectedSignalKinds` adicional. Promover a `identity_workspace` dedicado solo si emerge surface admin diferenciada.
2. **Materialized helper view vs runtime computation para reliability signal**: Slice 5 decide con benchmark de cardinalidad real (subjects × organizations). Si runtime JOIN tarda > 500ms, materializar.
3. **Activación de `entrypointContext='client_portal'`**: V1 declara el type union pero la implementación inicial cubre `agency` + `finance` + `admin`. Globe (Sky, etc.) requiere security review específico — abrir TASK-### derivado cuando se priorice.
