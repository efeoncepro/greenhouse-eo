# TASK-1060 — Organization Workspace Compact Signals Projection

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `En re-plan 2026-06-09 tras discovery runtime; ejecución sobre develop por instrucción del operador; NO cerrar hasta recuperar paridad de datos con tabs legacy`
- Rank: `TBD`
- Domain: `agency|organization|data|finance|delivery|api|reliability`
- Blocked by: `none`
- Branch: `develop` (excepción explícita del operador; no cambiar de rama por convivencia multi-agente)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un reader/projection server-side canónico `OrganizationWorkspaceCompactSignals` para el sidecar enterprise de Organization Workspace: salud de cuenta, readiness cross-facet, señales recientes, próximas acciones y procedencia compacta. El runtime TASK-1059 hoy deriva parte de esto en JSX/client fetches; esta task baja esa lógica a `src/lib/**`, la expone por Product API/app lane y deja degradación honesta por fuente.

## Why This Task Exists

El mockup aprobado y el runtime TASK-1059 necesitan un sidecar ejecutivo confiable: readiness, health, señales recientes, próximas acciones, linaje y frescura. Hoy el runtime compone datos desde `/api/organizations/[id]`, `/api/organization/[id]/360`, `/api/organizations/[id]/projects` y `/api/organizations/[id]/finance` en client-side, con lógica de derivación visual. Eso es suficiente para shippear el diseño, pero no es un contrato reusable para Finance, app first-party, MCP, Nexa ni consumidores futuros.

La causa raíz no es falta de UI: falta un read model compacto que componga fuentes canónicas con budgets por fuente, provenance, access model y payload estable. Esta task NO crea nueva semántica financiera/delivery ni materializa datos nuevos; primero ordena la composición sobre fuentes existentes.

## Goal

- Exponer `readOrganizationWorkspaceCompactSignals(...)` como reader server-side reusable y tenant-safe.
- Consolidar readiness, health, recent signals, next actions y provenance desde Account 360, Organization 360, Projects, Finance summary, lifecycle/onboarding y reliability signals existentes.
- Reducir el client-side fan-out del runtime TASK-1059 sin bloquear la UI si una fuente falla.
- Declarar y entregar un camino programático de full API parity para Product API y first-party app lane; MCP puede quedar como follow-up explícito si no entra en esta task.
- Mantener estados honestos: `ready | partial | empty | unavailable`, con `degradedSources[]`, timestamps y source freshness.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md`

Reglas obligatorias:

- Reutilizar `resolveOrganizationWorkspaceProjection(...)` como gate de access/facets; no recalcular capabilities en la UI ni en un endpoint paralelo.
- Reutilizar `getAccountComplete360(...)`, `getOrganizationDetail(...)`, `getOrganizationProjects(...)`, `getOrganizationFinanceSummary(...)` y `getActiveCaseForOrganization(...)` cuando apliquen.
- Usar `withSourceTimeout(...)` para cada fuente secundaria; una fuente lenta/fallida degrada el payload, no rompe la respuesta completa.
- No crear DDL/materialización nueva en Slice 1 salvo discovery pruebe que el read-on-demand es insuficiente.
- No inventar métricas financieras, AR aging, delivery materializers ni lifecycle state machine nuevos.
- No exponer datos sensitive si la projection no autoriza el facet/capability correspondiente.
- Product API y API Platform deben modelar el recurso `organization workspace compact signals`, no botones ni secciones visuales.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `project_context.md`
- `Handoff.md`
- `DESIGN.md` solo para verificar el consumo UI/GVC; esta task es principalmente backend/read-model.

## Dependencies & Impact

### Depends on

- TASK-1059 runtime promotion.
- TASK-1061 may refactor visual tokenization independently; this task must avoid merge conflicts by keeping UI changes minimal.
- `src/lib/organization-workspace/projection.ts`
- `src/lib/organization-workspace/projection-types.ts`
- `src/lib/organization-workspace/build-projection-subject.ts`
- `src/lib/account-360/account-complete-360.ts`
- `src/lib/account-360/organization-store.ts`
- `src/lib/account-360/organization-projects.ts`
- `src/lib/client-lifecycle/store.ts`
- `src/lib/platform-health/with-source-timeout.ts`
- `src/lib/api-platform/resources/organizations.ts`
- `src/app/api/organization/[id]/360/route.ts`
- `src/app/api/organizations/[id]/route.ts`
- `src/app/api/organizations/[id]/projects/route.ts`
- `src/app/api/organizations/[id]/finance/route.ts`

### Blocks / Impacts

- Runtime sidecar quality for `/agency/organizations/[id]`.
- Future convergence of `/finance/clients/[id]` and organization-first workspaces.
- First-party app compact organization detail resource.
- Future MCP/Nexa tool for account executive signals.
- Reliability visibility into stale/broken organization workspace source composition.

### Files owned

- `src/lib/organization-workspace/**`
- `src/app/api/organizations/[id]/**`
- `src/app/api/platform/app/**`
- `src/lib/api-platform/resources/**`
- `src/views/greenhouse/organizations/AgencyOrganizationWorkspaceClient.tsx`
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`
- `src/lib/reliability/queries/**`
- `src/lib/reliability/registry.ts`
- `docs/tasks/**`
- `docs/api/**` only if the app/API contract is documented in OpenAPI/Markdown during this task

## Current Repo State

### Already exists

- Canonical access projection: `resolveOrganizationWorkspaceProjection(...)` with `visibleFacets`, `fieldRedactions`, `allowedActions`, degraded mode and cache.
- Account 360 resolver: `getAccountComplete360(...)` with facet meta, errors, denied facets, cache status and warnings.
- Organization detail reader: `getOrganizationDetail(...)` over `greenhouse_serving.organization_360`.
- Projects reader: `getOrganizationProjects(...)`, currently looping spaces and degrading inside each space when delivery data fails.
- Finance summary reader: `getOrganizationFinanceSummary(...)`, currently may auto-compute missing client economics snapshots on access.
- Existing internal routes for detail, 360, projects and finance.
- API Platform organization list/detail resources under `src/lib/api-platform/resources/organizations.ts`.
- Platform source timeout helper `withSourceTimeout(...)`.
- Reliability query patterns and registry entries for workspace projection drift, services sync and finance/payment signals.
- TASK-1059 runtime sidecar currently derives readiness/recent signals from `detail`, `data360`, `projects` and `financeSummary`.

### Gap

- No single `OrganizationWorkspaceCompactSignals` DTO exists.
- No server-side composer currently consolidates sidecar data with source-level budgets and provenance.
- The runtime still performs client-side fan-out and derives sidecar sections in JSX.
- No Product API endpoint returns the compact sidecar payload.
- No first-party app resource exposes compact organization workspace signals.
- No reliability signal tracks compact signal source degradation/staleness.
- Current task spec was too thin: no schema/DTO, access model, reliability, app/API parity, rollout or closing protocol.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Discovery Snapshot — 2026-06-09 Re-plan

### Hallazgo central

La vista enterprise nueva no está "sin datos" porque Sky no tenga información. Está perdiendo datos porque el runtime TASK-1059 intentó centralizar varias tabs en un payload/proyección compacta antes de preservar todos los readers especializados que la vista anterior ya usaba.

La vista anterior sí mostraba datos porque cada tab consumía su fuente rica:

| Tab / área legacy | Reader / endpoint existente | Qué conserva |
|---|---|---|
| Equipo / personas | `GET /api/organizations/[id]/memberships` -> `getOrganizationMemberships(...)` | personas vinculadas, contactos, equipo Efeonce, contexto de `client_team_assignments`, `assignmentType`, FTE, staff augmentation context |
| Equipo summary | `GET /api/organization/[id]/360?facets=team` -> `fetchTeamFacet(...)` | total members, total FTE, paginación y miembros con assignment summary |
| Proyectos / delivery | `GET /api/organizations/[id]/projects` -> `getOrganizationProjects(...)` | proyectos por space, task counts, health, page URLs |
| Finance | `GET /api/organizations/[id]/finance` y/o Account 360 finance facet | client profiles, invoices, AR/outstanding, DTE coverage |
| Economics | `GET /api/organization/[id]/360?facets=economics` | period economics, trend y by-client profitability |
| ICO / delivery metrics | legacy ICO tab + Account 360 delivery facet | métricas materializadas por el engine; NO deben recalcularse en la vista |
| CRM / integrations | organization detail + HubSpot-related routes | company/contact/deal context y mappings |
| Services / Staff Aug | Account 360 services/staffAug facets | servicios activos, placements y costos/currencies |

La vista enterprise nueva usa principalmente:

- `detail` desde `getOrganizationDetail(...)` / `organization_360`
- `data360` desde `/api/organization/[id]/360?...`
- `projects` desde `/api/organizations/[id]/projects`
- `financeSummary` desde `/api/organizations/[id]/finance`
- `compactSignals` desde el nuevo endpoint de TASK-1060

El problema: algunas secciones enterprise están leyendo `detail.people` o summaries compactos donde la tab legacy usaba memberships/assignments completos. Eso deja fuera personas vinculadas a Sky, asignaciones, FTE/assignment context y otras filas reales.

### Evidencia runtime verificada

- Sky (`org-b9977f96-f7ef-4afb-bb26-7355d78c981f`) tiene proyectos reales en `greenhouse_delivery.projects` por `space_id`; el reader viejo de proyectos estaba cableado a un camino que devolvía vacío para `projectIds: []`.
- La ausencia de datos no es solo ICO. La pérdida se observa en varias facets porque el workspace enterprise todavía no replica el source map de las tabs anteriores.
- También se detectó que algunos datos históricos ICO existen en BQ con identificadores externos. Ese hallazgo queda como input de una task separada si hace falta resolver alias/materialización ICO; **TASK-1060 no debe cambiar semántica ni materializadores ICO**.

### Corrección de rumbo obligatoria

Durante discovery se exploró una posible lectura directa de métricas ICO por alias externo. Eso cruza una frontera de dominio demasiado sensible para esta task. La corrección de rumbo es:

- revertir/eliminar cualquier helper nuevo que lea BQ/ICO desde `account-360` para este propósito;
- no modificar `src/lib/ico-engine/**`, materializers, cron, BQ schema, bonus semantics ni `organization_operational_metrics` como parte de TASK-1060;
- documentar un follow-up separado si se confirma que el alias `organization_id` core vs `client_id` externo rompe la materialización serving de ICO.

## Audit — TASK-1060 Re-plan

### Supuestos correctos

- El workspace enterprise necesita un `OrganizationWorkspaceCompactSignals` server-side reusable, con provenance y degradación honesta.
- El composer debe usar `resolveOrganizationWorkspaceProjection(...)` como gate de access/facets.
- La UI no debe inventar métricas ni reemplazar readers de dominio.
- TASK-1061 debe encargarse de tokenización visual; TASK-1060 debe enfocarse en data-contract y paridad runtime.

### Supuestos desactualizados

- Spec original: "compact signals" como sidecar principalmente ejecutivo.
  - Realidad: la ejecución mostró que el runtime enterprise también necesita recuperar **paridad de contenido por facet** con las tabs anteriores.
  - Acción: ampliar TASK-1060 a un adapter/source-map por facet, no solo sidecar.
- Spec original: Account 360 + organization detail parecen suficientes para todas las secciones.
  - Realidad: `OrganizationPeopleTab` usa `/api/organizations/[id]/memberships`, que conserva datos que `organization_360.people` no necesariamente trae completos.
  - Acción: el runtime enterprise debe consumir/reutilizar el reader rico de memberships para Team/People.
- Spec original: projects reader existente estaba disponible.
  - Realidad: el reader podía devolver vacío para Sky por cableado legacy hacia un path de project IDs vacío.
  - Acción: reparar `getOrganizationProjects(...)` contra el source real `greenhouse_delivery.projects/tasks` por `space_id`, sin tocar materializers.

### Arquitectura / docs obligatorios

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` -> define que Organization 360 es agregación, no reemplazo de todos los readers ricos.
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md` -> gate de facets/entrypoint.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` -> Product/API path para compact signals.
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` -> no resolver con parches frágiles ni cálculos inline.
- `DESIGN.md` -> cualquier ajuste visible debe validarse con GVC.

### Código existente para reutilizar

- `src/lib/account-360/organization-store.ts`
  - `getOrganizationDetail(...)`
  - `getOrganizationMemberships(...)`
  - `getOrganizationFinanceSummary(...)`
- `src/lib/account-360/account-complete-360.ts`
  - `getAccountComplete360(...)`
- `src/lib/account-360/facets/team.ts`
  - team facet con memberships + assignments + FTE.
- `src/lib/account-360/organization-projects.ts`
  - projects reader a corregir/reutilizar.
- `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.tsx`
  - comportamiento legacy correcto para personas/memberships.
- `src/views/greenhouse/organizations/tabs/OrganizationProjectsTab.tsx`
  - comportamiento legacy correcto para proyectos/delivery.
- `src/lib/platform-health/with-source-timeout.ts`
  - budgets por source.

### Access model

- `routeGroups`: sin cambio nuevo; el endpoint vive bajo organization workspace ya protegido.
- `views`: sin nuevo view si solo se consume desde la ruta de organización existente.
- `entitlements`: el composer debe respetar visible facets; no exponer finance/staffAug si el projection gate no los autoriza.
- `startup policy`: no aplica.

### Riesgos / blast radius

- Pérdida silenciosa de datos si el workspace usa summaries en vez de readers ricos.
- Leak de finance/staffAug si el payload compacto mezcla facets sin gate por sección.
- Drift si se duplican queries de personas/proyectos en el runtime.
- Scope creep si se intenta resolver alias/materialización ICO dentro de esta task.

### Decisión

TASK-1060 debe convertirse en un **adapter robusto de fuentes por facet**:

- Sidecar compact signals sigue existiendo.
- Pero la ejecución no puede cerrarse hasta que las tabs enterprise recuperen paridad mínima con la vista anterior usando los readers ya existentes.
- Cualquier gap de backend/materialización que no exista hoy debe convertirse en follow-up explícito, no en cálculo local ni mock.

## Plan Completo — Ejecución Robusta

### Slice 0 — Higiene y rollback de scope incorrecto

Objetivo: volver al límite correcto de TASK-1060 antes de implementar.

Acciones:

- Eliminar `src/lib/account-360/organization-ico-metrics-source.ts` si existe.
- Restaurar `src/lib/account-360/get-organization-operational-serving.ts` a su contrato previo o a una versión que no lea BQ/ICO por alias desde esta task.
- No tocar `src/lib/ico-engine/**`, materializers, BQ schema, crons, bonus/OTD/FTR/RpA semantics.
- Documentar follow-up separado si se requiere resolver alias core org UUID <-> external HubSpot client id para serving ICO.

Verificación:

- `git diff -- src/lib/account-360/get-organization-operational-serving.ts src/lib/account-360/organization-ico-metrics-source.ts`
- Confirmar que no hay imports nuevos hacia BQ/ICO desde Account 360 por esta task.

### Slice 1 — Source map por facet, no por pantalla

Objetivo: declarar qué reader alimenta cada facet enterprise y evitar que el runtime elija fuentes débiles.

Acciones:

- Extender `OrganizationWorkspaceCompactSignals` o crear un contrato sibling interno con `facetDataSources`.
- Declarar source ids específicos:
  - `organization_detail`
  - `organization_memberships`
  - `account_360_team`
  - `account_360_delivery`
  - `organization_projects`
  - `organization_finance_summary`
  - `account_360_finance`
  - `account_360_economics`
  - `account_360_services`
  - `account_360_staff_aug`
  - `client_lifecycle`
  - `reliability_signals`
- Cada source debe exponer `status`, `recordCount`, `freshness`, `degradedReason`.

Archivos:

- `src/lib/organization-workspace/compact-signals-types.ts`
- `src/lib/organization-workspace/compact-signals.ts`
- `src/lib/organization-workspace/compact-signals-mappers.ts`
- tests existentes de compact signals.

No crear:

- nuevas tablas;
- nuevos materializers;
- cálculos de métricas ICO/finance/delivery inline.

### Slice 2 — Team/People parity

Objetivo: recuperar personas vinculadas, personas asignadas, assignment context y FTE como la vista anterior.

Acciones:

- El composer debe llamar `getOrganizationMemberships(organizationId)` con timeout propio.
- El runtime enterprise Team section debe preferir memberships ricos para filas.
- `data360.team` sigue siendo summary/FTE, no reemplazo de la tabla de personas.
- Mantener fallback honesto:
  - si memberships falla pero `data360.team.members` existe, usarlo y marcar source degraded;
  - si ambos fallan, mostrar empty state honesto con degraded source.

Archivos:

- `src/lib/organization-workspace/compact-signals.ts`
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`
- tests de compact signals y, si aplica, UI focused test.

Acceptance:

- Sky muestra personas/memberships equivalentes a `OrganizationPeopleTab`.
- Assignment type/FTE no se pierden cuando existen en `getOrganizationMemberships(...)`.

### Slice 3 — Projects/Delivery parity sin tocar ICO

Objetivo: recuperar proyectos y task counts reales de Sky desde delivery core.

Acciones:

- Corregir/revisar `getOrganizationProjects(...)` para que consulte `greenhouse_delivery.projects/tasks` por `space_id` activo de la organización.
- Usar status canonical helpers cuando se cuenten tareas, no literales locales.
- El workspace enterprise debe usar `projects` para tabla/listado de proyectos y `data360.delivery` solo para summary/ICO materializado.
- Si `data360.delivery.icoMetrics` está vacío, no inventar OTD/FTR/RpA; mostrar source/provenance honesta.

Archivos:

- `src/lib/account-360/organization-projects.ts`
- `src/lib/account-360/facets/delivery.ts` solo para corregir schema drift de columns legacy, no para recalcular ICO.
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`

Acceptance:

- Sky muestra sus proyectos reales.
- Las tarjetas de delivery no dicen "sin datos" cuando project/task data existe.
- OTD/FTR/RpA permanecen nulos si no hay serving materializado autorizado; eso se documenta como follow-up, no se calcula en la UI.

### Slice 4 — Finance/Economics/CRM/Services/StaffAug parity

Objetivo: que cada tab enterprise use su reader correcto y no se quede con placeholders.

Acciones:

- Finance:
  - usar `getOrganizationFinanceSummary(...)` + `account360.finance`.
  - no crear AR aging nuevo.
- Economics:
  - usar `account360.economics.currentPeriod`, `trend`, `byClient`.
- CRM:
  - usar `account360.crm` y organization detail mappings.
- Services:
  - usar `account360.services`.
- Staff Aug:
  - usar `account360.staffAug`.
  - si placements no existen, mostrar estado planned/empty con provenance, no mock.

Archivos:

- `src/lib/organization-workspace/compact-signals-mappers.ts`
- `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx`

Acceptance:

- Cada tab tiene tabla/sección alimentada por su facet/reader.
- Si una fuente no tiene filas, el empty state indica source y reason.

### Slice 5 — Product API / App lane

Objetivo: full API parity sin duplicar lógica.

Acciones:

- `GET /api/organizations/[id]/workspace/compact-signals` debe devolver:
  - health/readiness/recent/next/provenance;
  - `sourceMap` o equivalente para saber qué fuente alimenta cada facet;
  - degraded sources.
- App lane puede quedar como wrapper si no duplica queries.
- No exponer tablas completas sensitive en compact endpoint; datos tabulares ricos pueden seguir en endpoints existentes.

Archivos:

- `src/app/api/organizations/[id]/workspace/compact-signals/route.ts`
- `src/app/api/platform/app/organizations/[id]/compact-signals/route.ts` si se mantiene.
- `src/lib/api-platform/resources/app-organizations.ts`
- docs API/OpenAPI solo para contratos estables.

Acceptance:

- Endpoint devuelve partial/ready con provenance.
- Tests cubren denied facets, source failure, no org, ready payload.

### Slice 6 — Runtime integration con paridad visual

Objetivo: conservar el diseño aprobado pero con datos reales.

Acciones:

- `OrganizationEnterpriseWorkspaceRuntime` debe:
  - seguir usando el layout enterprise aprobado;
  - consumir compact signals para sidecar/provenance;
  - consumir readers/tab data ricos para tablas principales;
  - no degradar tabs legacy a summaries incompletos.
- Mantener cambios visuales mínimos; TASK-1061 tokeniza visual después.

Verificación visual:

- GVC scenario `organization-workspace-enterprise-detail-runtime`.
- Capturar desktop/laptop/mobile.
- Click/mark en todas las tabs.
- Revisar PNGs, no solo exit code.

Acceptance:

- En laptop no hay chart/table overflow roto.
- Team/People, Projects/Delivery y demás tabs muestran datos o empty states honestos.
- No hay copy de "sin datos" cuando el reader legacy sí devuelve filas.

### Slice 7 — Reliability/follow-ups

Objetivo: no declarar complete si quedan gaps reales.

Acciones:

- Registrar reliability signal solo si existe evidencia durable no ruidosa.
- Si no existe evidencia durable de per-request degradation, mantener TASK-1062 o crear follow-up específico.
- Crear follow-up separado para:
  - alias/materialización ICO organization UUID vs external client id, si se confirma que serving PG queda vacío aunque BQ tiene histórico;
  - cualquier backend missing para services/staffAug/CRM si no existe reader real.

Acceptance:

- TASK-1060 lista explícitamente qué quedó code-complete y qué queda bloqueado/follow-up.
- No se mueve a `complete` si alguna tab aprobada sigue sin datos por cableado.

### Slice 8 — Docs/closure

Acciones:

- Actualizar `Handoff.md` con:
  - excepción de rama `develop`;
  - convivencia multi-agente;
  - fuentes tocadas;
  - validaciones GVC/tests.
- Actualizar `changelog.md` solo si cambia comportamiento user-facing.
- Actualizar `docs/tasks/README.md` y registry según lifecycle.
- No hacer push salvo instrucción explícita del operador.

Verificación mínima antes de pedir cierre:

- `pnpm ops:lint --changed`
- `pnpm exec tsc --noEmit --pretty false`
- tests focales de compact signals/routes/readers tocados
- GVC runtime revisado visualmente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contract and source map

- Add `src/lib/organization-workspace/compact-signals-types.ts`.
- Define closed enums for source ids, readiness states, signal severity, action kind, provenance confidence and degraded reasons.
- Document the source map in code comments: `workspace_projection`, `account_360`, `organization_360`, `projects`, `finance_summary`, `client_lifecycle`, `reliability_signals`.
- Add tests that assert enum exhaustiveness and DTO shape for ready/partial/empty examples.

### Slice 2 — Composer reader

- Add `src/lib/organization-workspace/compact-signals.ts`.
- Implement `readOrganizationWorkspaceCompactSignals(input)` with this minimal input:
  - `subject`
  - `organizationId`
  - `entrypointContext`
  - `asOf`
  - `periodYear`
  - `periodMonth`
  - optional `limits`
- Compose existing readers using `withSourceTimeout(...)` per source.
- Always call `resolveOrganizationWorkspaceProjection(...)` first; if no facets are authorized, return a `status='unavailable'` payload with no sensitive sections.
- Return partial payload when secondary sources fail; never throw for secondary failures.
- Capture unexpected composer errors with `captureWithDomain(..., 'agency' | 'identity')` and sanitized error summaries only.

### Slice 3 — Readiness, health, recent signals and next actions

- Implement pure mappers under `src/lib/organization-workspace/compact-signals-mappers.ts`.
- Readiness categories:
  - `identity`
  - `dataCoverage`
  - `delivery`
  - `finance`
  - `services`
  - `staffAug`
  - `lifecycle`
- Health summary:
  - `overallState: good | watch | risk | blocked | unknown`
  - `score: number | null` only if derived from deterministic available inputs.
  - `drivers[]` with source/provenance per driver.
- Recent signals:
  - deterministic facts from Account 360 meta/warnings, finance outstanding amount, delivery/project health, services/staffAug counts, onboarding case status and relevant reliability findings.
  - no LLM/Nexa summarization in V1.
- Next actions:
  - deterministic, low-risk recommendations such as complete finance facet, verify Notion/project source, review overdue AR, resolve onboarding blocked, refresh HubSpot services, attach logo only if TASK-999 data exists.
  - actions are links/instructions only; no autonomous commands.

### Slice 4 — Product API endpoint

- Add `GET /api/organizations/[id]/workspace/compact-signals`.
- Auth: use tenant context, build `TenantEntitlementSubject` through the same canonical helper as server pages, and rely on the composer projection gate.
- Query params: `asOf`, `year`, `month`, optional `limit`.
- Response headers should include source timing/cache hints where safe, similar to 360 resolver headers.
- Return `404` only for missing organization; return `200 status='partial'|'unavailable'` for degraded data sources.
- Tests cover unauthorized, no facets authorized, ready, partial source failure and missing org.

### Slice 5 — First-party app API lane

- Add a first-party app resource shape for compact organization signals under `src/lib/api-platform/resources/organizations.ts` or a sibling resource module if cleaner.
- Add or extend a route under `src/app/api/platform/app/**` only if it can be done without overloading existing `/context`/`home`.
- The app lane must use the same composer; no duplicate queries.
- If implementing the app route is too large for this task, create an explicit follow-up task and document the Product API as the temporary programmatic path.

### Slice 6 — Runtime UI consumption

- Update `AgencyOrganizationWorkspaceClient` and/or `OrganizationEnterpriseWorkspaceRuntime` to consume the compact signals endpoint/reader with minimal visual churn.
- Preserve existing TASK-1059 visual output; this task is data-contract hardening, not redesign.
- Keep fallback to local derivation only during migration, behind a clearly documented temporary branch with removal condition.
- Re-run the TASK-1059 GVC scenario after UI wiring.

### Slice 7 — Reliability and observability

- Add a reliability query such as `organization.workspace.compact_signals_degraded` if the composer exposes durable degradation evidence without creating noisy per-request state.
- Preferred V1 signal: deterministic read-only query over existing source freshness/drift where possible; if per-request degradation cannot be observed durably, document the gap and add a follow-up for request log/event sampling.
- Register the signal in `src/lib/reliability/registry.ts` only if it has a stable steady state and low false-positive rate.
- Add unit tests for source degradation classification.

### Slice 8 — Docs and closure

- Update task lifecycle and handoff when taking/closing the task.
- Update API docs/OpenAPI only for stable endpoints delivered in this task.
- Update `project_context.md` only if a new durable contract/pattern is introduced beyond this task.
- Run `greenhouse-documentation-governor` before closure if docs beyond task files change.

## Out of Scope

- New ledger, AR aging or finance calculations.
- New delivery materializers, BigQuery drains or Notion schema changes.
- Creating autonomous actions or command execution from the sidecar.
- New DDL/materialized table unless discovery proves read-on-demand cannot satisfy latency/reliability.
- Reworking Organization Workspace visual tokens/layout; that belongs to TASK-1061.
- Brand asset discovery/review queue; that belongs to TASK-999.
- Public ecosystem API exposure unless a concrete external consumer and binding scope are defined.
- MCP adapter implementation unless it remains a small wrapper over the delivered Product/App API; otherwise create a follow-up.

## Detailed Spec

### DTO contract

Implement the DTO as a TS contract first. Suggested shape:

```ts
export type OrganizationWorkspaceCompactSignalsStatus =
  | 'ready'
  | 'partial'
  | 'empty'
  | 'unavailable'

export type OrganizationWorkspaceCompactSignals = {
  organizationId: string
  entrypointContext: EntrypointContext
  status: OrganizationWorkspaceCompactSignalsStatus
  computedAt: string
  asOf: string
  period: { year: number; month: number }
  projection: {
    visibleFacets: OrganizationFacet[]
    defaultFacet: OrganizationFacet | null
    degradedMode: boolean
    degradedReason: string | null
  }
  health: {
    overallState: 'good' | 'watch' | 'risk' | 'blocked' | 'unknown'
    score: number | null
    drivers: CompactSignalDriver[]
  }
  readiness: CompactReadinessItem[]
  recentSignals: CompactRecentSignal[]
  nextActions: CompactNextAction[]
  provenance: CompactSignalProvenance[]
  degradedSources: CompactSignalDegradedSource[]
  sourceFreshness: Record<string, string | null>
}
```

The implementation can refine names, but the payload must remain compact, serializable, explicit about provenance and safe for first-party app consumption.

### Source classification

| Source | Existing owner | Use |
|---|---|---|
| `workspace_projection` | `resolveOrganizationWorkspaceProjection` | access, visible facets, degraded auth/projection state |
| `organization_360` | `getOrganizationDetail` / `greenhouse_serving.organization_360` | identity, org metadata, spaces/people counts |
| `account_360` | `getAccountComplete360` | facet health, meta errors/warnings, finance/delivery/services/staffAug summary |
| `projects` | `getOrganizationProjects` | project/task health and delivery next actions |
| `finance_summary` | `getOrganizationFinanceSummary` | period revenue/margin/client economics fallback |
| `client_lifecycle` | `getActiveCaseForOrganization` | onboarding case status and lifecycle next actions |
| `reliability_signals` | `src/lib/reliability/queries/**` / overview reader if available | source drift and operational warnings |

### Access model

- `routeGroups`: endpoint can use internal tenant/session guard as broad web entry, but the composer must still gate data through `resolveOrganizationWorkspaceProjection`.
- `views`: no new view is required if the endpoint is consumed only by the already-authorized organization detail route. If a new route/surface appears, register reachability and view access separately.
- `entitlements`: no new capability needed for read-only compact signals if it only returns fields for already-visible facets. If the endpoint exposes cross-facet sensitive details, require existing `organization.*` or `organization.*_sensitive` checks per section.
- `startup policy`: not involved.

### Degradation policy

- Missing organization: `404`.
- Projection lookup failure: return `status='unavailable'`, `projection.degradedMode=true`, no facet-derived sensitive data.
- Secondary source failure/timeout: return `status='partial'`, populate `degradedSources[]`, keep other sections.
- No data but sources healthy: return `status='empty'`, not `partial`.
- No facet authorization: return `status='unavailable'` with `degradedReason='no_facets_authorized'`, not `403`, unless the route guard itself fails.

### Caching and freshness

- Use existing caches from Account 360/projection where present.
- Do not add persistent cache in V1.
- The Product API may set `Cache-Control: private, max-age=0, must-revalidate`.
- Include `sourceFreshness` based on available `updatedAt`, `_meta.resolvedAt`, source observedAt or null.

### MCP/API parity path

- Minimum: Product API endpoint + server-side reader.
- Better: first-party app route wrapping the same reader.
- MCP: acceptable as follow-up if documented with a concrete task; do not leave parity implied.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract) -> Slice 2 (composer) -> Slice 3 (mappers) -> Slice 4 (Product API) -> Slice 5 (app lane or follow-up) -> Slice 6 (runtime UI) -> Slice 7 (reliability) -> Slice 8 (docs/closure).
- Slice 6 must not start before the Product API/composer tests pass.
- Slice 7 must not register a reliability signal unless the signal has stable data and documented steady state.
- TASK-1061 may run in parallel, but both tasks must avoid editing the same runtime component at the same time without coordination in `Handoff.md`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Sensitive finance/staffAug data leaks through compact payload | access / finance / hr | medium | projection gate first; per-section visible facet checks; tests for denied facets | API test failure; manual payload review |
| Composer becomes slow due source fan-out | API / UI | medium | `withSourceTimeout` per source, compact limits, no blocking secondary source | source duration headers; degraded source timeout |
| Duplicate business logic diverges from Account 360 | data | medium | mappers derive from Account 360 fields and existing readers only; no new calculations | tests snapshot drift; source comments |
| Reliability signal becomes noisy | reliability | medium | register only if stable durable query exists; otherwise follow-up | signal non-steady after deploy |
| UI regression while changing data source | UI | medium | preserve visual structure; fallback during migration; GVC runtime scenario | GVC quality findings |
| Finance summary auto-compute on read surprises API latency | finance / API | low-medium | source timeout budget; document current behavior; do not expand compute scope | `finance_summary` timeout/degraded source |

### Feature flags / cutover

Sin flag obligatorio. The change is additive: introduce reader and API first, then switch runtime to consume it. If Slice 6 creates user-visible risk, keep a temporary fallback branch to TASK-1059 derivation and document removal condition.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert types/tests | <10 min | si |
| Slice 2 | Revert composer reader | <10 min | si |
| Slice 3 | Revert mappers | <10 min | si |
| Slice 4 | Remove endpoint route and tests | <10 min | si |
| Slice 5 | Remove app route/resource or keep follow-up only | <15 min | si |
| Slice 6 | Revert UI consumption to TASK-1059 derivation | <15 min | si |
| Slice 7 | Remove reliability registry entry/query | <15 min | si |
| Slice 8 | Revert docs-only updates if task remains open | <10 min | si |

### Production verification sequence

1. Run unit tests for compact signal types, composer and mappers.
2. Hit Product API locally for a known organization and inspect `ready/partial` payload manually.
3. Verify denied/no-facet scenario through tests or controlled mock.
4. Run `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local` after UI wiring.
5. If deployed to preview/staging, request `/api/organizations/<id>/workspace/compact-signals` and verify no sensitive data appears for unauthorized facets.
6. If reliability signal was added, confirm steady state and no false positives in `/admin/ops-health`.

### Out-of-band coordination required

N/A — repo-only read-model/API task. No migrations, env vars, secrets, external portal config or Cloud Run deploy required unless discovery changes the strategy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `OrganizationWorkspaceCompactSignals` DTO exists with closed enums, provenance, degraded sources and source freshness.
- [ ] `readOrganizationWorkspaceCompactSignals(...)` composes existing canonical readers and returns ready/partial/empty/unavailable without throwing for secondary source failures.
- [ ] Access is gated by `resolveOrganizationWorkspaceProjection(...)`; denied facets do not leak data.
- [ ] Product API endpoint `GET /api/organizations/[id]/workspace/compact-signals` exists and has tests for auth, missing org, ready, partial and no-facet cases.
- [ ] First-party app API path is implemented or an explicit follow-up task is created with Product API as temporary parity path.
- [ ] TASK-1059 runtime consumes the compact signals contract or has a documented migration path with temporary fallback.
- [ ] Source timeouts and degradation use `withSourceTimeout(...)`; payload includes `degradedSources[]`.
- [ ] Reliability signal is added only if stable, or a follow-up documents why request-level degradation needs durable sampling first.
- [ ] GVC runtime capture remains enterprise-grade with `qualityFindings=[]` after UI wiring.

## Verification

- `pnpm exec eslint src/lib/organization-workspace src/app/api/organizations src/app/api/platform/app src/lib/api-platform/resources src/views/greenhouse/organizations`
- `pnpm vitest run src/lib/organization-workspace src/app/api/organizations`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con branch/develop exception, payload/API path, GVC evidence y cualquier deuda
- [ ] `changelog.md` quedo actualizado si cambio comportamiento runtime/API visible
- [ ] API docs/OpenAPI quedaron actualizados si se entrego endpoint estable
- [ ] se ejecuto chequeo de impacto cruzado con TASK-1059, TASK-1061, TASK-999 y TASK-1010/1013 lifecycle
- [ ] follow-up MCP/app/reliability creado si no se entrega dentro de esta task

## Follow-ups

- MCP tool `get_organization_workspace_compact_signals` sobre el Product/App API si no entra en V1.
- Persistent request-level degradation sampling if reliability needs durable per-source failure rates.
- Finance/client detail convergence once `/finance/clients/[id]` consumes the same Organization Workspace sidecar.

## Delta 2026-06-09

- Spec robustecida tras revision de runtime y arquitectura real.
- Se corrigio el alcance: no es una materializacion nueva ni un sidecar JSX; es un reader/projection additive sobre `resolveOrganizationWorkspaceProjection`, Account 360 y fuentes existentes.
- Se agregaron contratos de DTO, source map, access model, API parity, reliability, rollout y closing protocol.

## Open Questions

- Durante Plan Mode, decidir si Slice 5 implementa app lane en esta misma task o crea follow-up separado. Criterio: hacerlo aqui solo si puede envolver el composer sin nuevo modelo de auth o rutas de navegacion.
- Durante Plan Mode, decidir si existe una reliability query durable para degradacion de compact signals o si corresponde primero instrumentar sampling/request logs como follow-up.
