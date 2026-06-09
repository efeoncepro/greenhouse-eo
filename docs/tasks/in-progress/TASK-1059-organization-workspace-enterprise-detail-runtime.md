# TASK-1059 — Organization Workspace Enterprise Detail Runtime

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `code complete local; rollout/commit pendiente por checkout compartido`
- Rank: `TBD`
- Domain: `agency|ui|data|finance|delivery`
- Blocked by: `none`
- Branch: `develop` (operator override: shared checkout, no branch switch)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Promover el mockup aprobado de Organization Workspace enterprise detail al runtime real de la vista individual de organización (`/agency/organizations/[organizationId]`). El resultado debe reemplazar la superficie actual green-heavy por un command center sobrio, moderno, facet-driven y consistente con los consumidores de Agency, Finance, Delivery, CRM, Services, Team y Staff Augmentation.

## Why This Task Exists

La vista individual actual de organización no comunica madurez enterprise: abusa de verdes, repite patrones visuales poco densos y no expresa bien que distintos consumers renderizan la organización por facets. El mockup aprobado en `/agency/organizations/mockup/enterprise-detail` resolvió la dirección visual y de arquitectura de información, pero aún vive como prototipo aislado y no gobierna el runtime real ni sus datos.

## Goal

- Sustituir la vista runtime individual de organización por el layout enterprise aprobado, preservando acceso, rutas y data contracts actuales.
- Modelar las facets como navegación real y consistente para Agency, Finance, Delivery, CRM, Services, Team, Spaces, Identity, Economics y Staff Augmentation.
- Mantener paridad con Finance Clients y otros consumers: la vista de Organization debe resumir y puentear, no duplicar fuentes de verdad ni lógica financiera.
- Validar visualmente desktop, laptop y mobile con GVC, incluyendo capture dedicado para charts/sections densas.

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

Reglas obligatorias:

- La UI runtime debe consumir readers/projections/helpers existentes o crear/planificar contratos programáticos equivalentes; no mover lógica de negocio a JSX.
- Finance facet resume y enlaza hacia Finance Clients cuando haga falta operación profunda; no reimplementa ledger, aging ni estados financieros como lógica local de Organization.
- Cualquier tabla operacional densa debe usar `DataTableShell` o primitive equivalente; no tablas crudas que rompan overflow.
- Charts deben consumir tokens/Chart SoT y deben tener captura GVC dedicada si el layout es sensible.
- Todo cambio visible debe usar skills UI/product design aplicables y GVC en loop hasta que desktop, laptop y mobile sean enterprise-grade.
- No crear una primitive paralela si puede extenderse una Greenhouse primitive existente.

## Normative Docs

- `DESIGN.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Mockup aprobado: `src/app/(dashboard)/agency/organizations/mockup/enterprise-detail/page.tsx`
- Mockup view: `src/views/greenhouse/organizations/mockup/OrganizationWorkspaceEnterpriseDetailMockupView.tsx`
- Mock data/reference: `src/views/greenhouse/organizations/mockup/organization-workspace-enterprise-detail-data.ts`
- Reference asset: `public/images/greenhouse/mockups/organization-workspace-enterprise-command-center-reference.png`
- GVC scenario/baseline evidence: `scripts/frontend/scenarios/organization-workspace-enterprise-detail-mockup.scenario.ts`
- Related approved list/workbench direction: `docs/tasks/complete/TASK-1016-organization-list-enterprise-prototype.md`
- Brand asset enrichment dependency for real logos: `docs/tasks/in-progress/TASK-999-organization-brand-asset-enrichment.md`

### Blocks / Impacts

- Runtime route `/agency/organizations/[organizationId]`
- Organization Workspace tabs/facets rendered by Agency and downstream consumers
- Finance summary experience inside Organization detail
- GVC scenarios and future visual baseline for Organization Workspace

### Files owned

- `src/app/(dashboard)/agency/organizations/[organizationId]/**`
- `src/views/greenhouse/organizations/**`
- `src/lib/**/organizations/**`
- `src/components/greenhouse/**` only if an existing primitive must be extended
- `scripts/frontend/scenarios/organization-workspace-*.scenario.ts`
- `docs/tasks/**`

## Current Repo State

### Already exists

- Approved mockup route at `/agency/organizations/mockup/enterprise-detail`.
- Approved GVC capture with 0 findings: `.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup`.
- Dedicated CSC chart GVC frame validates the laptop failure case was fixed in the mockup scenario.
- Runtime route `/agency/organizations/[organizationId]` exists and must be analyzed before promotion.

### Gap

- Runtime Organization Workspace still has the older visual/system behavior.
- Approved mockup data is static and must be mapped to real readers/projections.
- Facet-level data ownership and empty/degraded states need real contracts.
- Runtime GVC scenario for the actual organization route must be created or updated once promotion starts.

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

### Slice 1 — Runtime discovery and data mapping

- Audit current `/agency/organizations/[organizationId]` route, readers, facets, tabs, access guards and consumers.
- Map each approved mockup region to real data source, projection, helper or explicit gap.
- Identify whether any missing reader/API contract needs a small local helper or a separate follow-up task.

### Slice 2 — Shell and masthead promotion

- Promote the approved masthead/KPI rail/facet rail layout to runtime using real organization identity, logo/avatar, source provenance and core metrics.
- Preserve route access, tenant-safe checks and current navigation semantics.
- Keep fallback states honest for missing logo, missing data, stale source and partial sync.

### Slice 3 — Facet runtime canvases

- Implement Delivery, Finance and Identity as first-class runtime facets.
- Implement remaining facets with real summary/provenance/degraded states, not static placeholder content.
- Add bridges between facets so Finance, Delivery, Services, Team and CRM context is visible without duplicating domain logic.

### Slice 4 — Dense components, charts and tables

- Promote delivery pipeline and CSC distribution chart using Chart SoT/tokens and stable responsive layout.
- Promote project/invoice tables with `DataTableShell`, safe overflow and accessible labels.
- Validate laptop and mobile explicitly; chart cards must not clip, overflow or collapse labels.

### Slice 5 — GVC contract and rollout

- Add/update runtime GVC scenario for `/agency/organizations/{known-fixture-id}` across desktop, laptop and mobile.
- Include dedicated marks for masthead, facet rail, finance facet, identity facet, CSC chart, sidecar and full-page delivery.
- Compare approved mockup to runtime with visual diff or documented parity review.
- Update task closure docs and handoff.

## Out of Scope

- Building new finance ledger, AR aging, invoicing or payment order logic inside Organization Workspace.
- Replacing Finance Clients surfaces.
- Implementing TASK-999 logo enrichment runtime changes beyond consuming the current logo/avatar source if available.
- Changing organization schema, tenant model, entitlements, HubSpot/Notion sync or lifecycle source of truth unless discovered as a blocker and split into a separate task/ADR.

## Detailed Spec

Approved visual reference:

- URL: `/agency/organizations/mockup/enterprise-detail`
- Reference asset: `public/images/greenhouse/mockups/organization-workspace-enterprise-command-center-reference.png`
- Mockup implementation: `src/views/greenhouse/organizations/mockup/OrganizationWorkspaceEnterpriseDetailMockupView.tsx`
- Final approved GVC: `.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup`
- Dossier: `.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup/review-dossier.md`

Runtime implementation must preserve the approved information architecture:

- Header: organization identity, logo/avatar, status, country, industry, organization code, website, source provenance and actions.
- KPI rail: revenue/margin/FTE/spaces or closest real equivalents, with honest unavailable states.
- Facet rail: identity, spaces, team, economics, delivery, finance, CRM, services, staff augmentation.
- Main canvas: facet-specific heading, summary, metrics, tables/charts and evidence map.
- Sidecar: account health, blockers, readiness, provenance, recent signals and upcoming actions.

If a facet lacks real data, render a degraded/partial state with provenance and owner instead of fabricated completeness.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (discovery/data mapping) MUST complete before any runtime JSX replacement.
- Slice 2 (shell/masthead) -> Slice 3 (facet canvases) -> Slice 4 (dense components/charts/tables) -> Slice 5 (GVC/runtime rollout).
- Finance facet cannot ship with local financial calculations; it must consume existing finance readers/projections or declare follow-up.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Runtime UI muestra datos mock o completos cuando el source real esta parcial | UI/data | medium | Trace every region to source/provenance; add degraded states | GVC screenshot + reviewer audit |
| Finance facet duplica semantica financiera o contradice Finance Clients | finance/ui | medium | Use finance readers/projections; deep link for full operation | Manual finance review |
| Charts/tables rompen laptop/mobile como el CSC mockup inicial | UI | medium | Dedicated GVC marks for chart/table sections across viewports | `quality.layout` findings |
| Route access/navigation regresses | identity/access | low | Preserve existing route guards and view_code behavior; run route/access checks | route reachability / noLoginRedirect |
| Scope grows into backend/schema changes | platform/data | medium | Split missing contracts into follow-up tasks/ADR unless essential | Task plan drift |

### Feature flags / cutover

Sin flag inicial si el runtime replacement is additive/safe inside the existing route after GVC approval. If discovery finds risk for operators, introduce a local feature flag for the redesigned Organization Workspace and ship old/new behind a guarded toggle.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Docs-only/data mapping; revert commit | <10 min | si |
| Slice 2 | Revert runtime shell commit or disable feature flag if introduced | <15 min | si |
| Slice 3 | Revert facet canvases or fallback to previous tab renderer | <20 min | si |
| Slice 4 | Revert dense components/charts; keep shell if independent | <20 min | si |
| Slice 5 | Remove/promote GVC scenario changes only if blocking incorrectly | <10 min | si |

### Production verification sequence

1. Validate locally with lint/tsc and GVC runtime scenario.
2. Validate preview/staging route with a known organization fixture.
3. Compare approved mockup vs runtime for desktop, laptop and mobile.
4. Verify no console/page/hydration/http failures.
5. Verify Finance/Delivery/Identity facets use real data or honest degraded states.
6. Monitor visual/access findings and operator feedback after deploy.

### Out-of-band coordination required

N/A — repo-only change unless discovery finds a missing external source or feature flag provisioning requirement.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Runtime `/agency/organizations/[organizationId]` renders the approved enterprise detail shell with real organization data.
- [x] Facet navigation supports Delivery, Finance and Identity as real canvases and renders remaining facets with honest partial/degraded states.
- [x] CSC distribution chart and other dense chart/table regions do not clip, overflow or collapse labels on laptop/mobile.
- [x] Runtime GVC scenario captures desktop, laptop and mobile with 0 blocking runtime/layout findings.
- [x] Finance facet links/summarizes existing finance consumer behavior without duplicating finance source-of-truth logic.
- [x] Approved mockup route remains available until runtime parity is accepted or is intentionally retired with documentation.

## Verification

- `pnpm exec eslint <touched files>`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture organization-workspace-enterprise-detail-runtime --env=local`
- `pnpm fe:capture:review <runtime-capture-dir>`
- Manual visual review of desktop, laptop and mobile frames, including CSC distribution and finance facet.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] GVC final runtime y mockup approval evidence quedaron linkeados en el cierre de la task

## Follow-ups

- Split missing backend/readers/API parity into child tasks if Slice 1 finds data gaps.
- Coordinate with `TASK-999` for real organization logo coverage once brand asset enrichment ships.
- Consider promoting reusable Organization facet primitives only after the runtime implementation proves repeated cross-surface use.

## Delta 2026-06-09

Task creada despues de aprobacion visual del mockup enterprise detail. Evidence base: `.captures/2026-06-09T01-42-45_organization-workspace-enterprise-detail-mockup`.

## Implementation Delta 2026-06-09

- Runtime cutover local aplicado en `src/app/(dashboard)/agency/organizations/[id]/page.tsx`: Agency organization detail entra directo al enterprise runtime, manteniendo `resolveOrganizationWorkspaceProjection()` como gate de acceso/facets y sin tocar Finance Clients.
- Nueva vista runtime `src/views/greenhouse/organizations/OrganizationEnterpriseWorkspaceRuntime.tsx` cablea el mockup aprobado a datos reales disponibles: organization detail, Account 360 (`/api/organization/[id]/360`), projects (`/api/organizations/[id]/projects`) y finance summary (`/api/organizations/[id]/finance`).
- Delivery, Finance e Identity quedan como canvases reales; las demas facets renderizan readiness/provenance/degraded states honestos desde 360/detail.
- CSC distribution se renderiza con SVG responsive y marker GVC dedicado `organization-enterprise-csc-distribution`; laptop/mobile no clippean ni colapsan labels.
- Gap backend identificado y separado en `docs/tasks/to-do/TASK-1060-organization-workspace-compact-signals-projection.md`: sidecar compact signals/next actions/readiness cross-facet como projection programatica, para no inventar source-of-truth en JSX.
- Runtime GVC final: `.captures/2026-06-09T02-15-20_organization-workspace-enterprise-detail-runtime` (desktop, laptop, mobile; 24 frames; `qualityFindings=[]`; dossier `review-dossier.md` generado).
- Estado de cierre: `code complete local`; no se movio a `complete/` ni se hizo push por instruccion explicita del operador de no cambiar rama/coordinar con Claude en el checkout compartido.

## Facet Wiring Hardening Delta 2026-06-09 (Claude)

Los tabs del runtime salian vacios (Equipo, Entrega/ICO, Economia) aunque el legacy tenia datos. Causa raiz: los readers canonicos del 360 ocultaban drift de schema/scope tras `.catch(() => [])` (indistinguible de "sin datos"). Fixes en la capa canonica (todo consumer del 360 se beneficia):

- **team** (`facets/team.ts`): filtro temporal NULL-safe — los contactos HubSpot tienen `start_date NULL` y `start_date <= asOf` los borraba.
- **delivery** (`facets/delivery.ts`): join `project_record_id`; conteo de tareas por `task-status-canonical` (`task_status` en español, no `status='completed'`); **fallback ICO a BigQuery `ico_engine.metrics_by_organization`** (keyed por `spaces.client_id`, no org_id; tablas serving PG vacias).
- **economics** (`facets/economics.ts`): `period_closure_status.period_closed` no existe → derivar de `closure_status='closed'`.
- **ico-source resolver** (`organization-ico-metrics-source.ts`): columnas inexistentes (`organization_360.source_id`, `spaces.external_source_id`) → `spaces.client_id`.
- **Endurecimiento (causa raiz):** nuevo `facet-observability.ts` (`observeAndRethrow` primario → `_meta.errors` + Sentry; `observeAndDegrade` enriquecimiento) — destapo 2 drifts mas ocultos (`period_closed`, `tasks.status`). Guard live `account-complete-360.live.test.ts`.
- **Verificado live (Sky):** 9 facets, 0 errores, team=21, delivery tasks=4208 + ICO rpa/otd/ftr, economics presente; org sin data degrada honesto. tsc 0 · lint 0 · diseño visual intacto. GVC frames delivery+team con datos reales.
- Contrato canonico pinneado en CLAUDE.md "Account 360 facet readers — anti silent-catch contract". Pendiente commit/push por checkout compartido.

## Open Questions

- Canonical local GVC fixture usado: `org-b9977f96-f7ef-4afb-bb26-7355d78c981f` (`Sky Airline`).
- Cutover local directo aprobado para Agency route; el legacy shell no se conserva como fallback en esta ruta. Rollout remoto queda pendiente de commit/push/deploy humano por checkout compartido.
