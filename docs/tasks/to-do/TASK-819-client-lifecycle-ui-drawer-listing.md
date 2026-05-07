# TASK-819 — Client Lifecycle UI — Drawer + Listing Global + Banner

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `commercial / ui`
- Blocked by: `TASK-818`
- Branch: `task/TASK-819-client-lifecycle-ui`

## Summary

Construye las 4 surfaces UI del módulo Client Lifecycle V1: (1) drawer principal en `/admin/clients/[orgId]/lifecycle` con header + checklist agrupado por owner_role + timeline de eventos + acciones, (2) listing global en `/admin/clients/lifecycle` con filtros + cursor pagination, (3) banner contextual en `/admin/clients/[orgId]` con CTA, (4) tile dashboard en `/admin/operations`. Incluye mockup builder paso previo + densidad operacional + diseño tokens-only.

## Why This Task Exists

Sin UI los endpoints de TASK-818 son inaccesibles para el operador comercial — la única forma de gestionar onboarding/offboarding queda como SQL directo o scripts ad-hoc, regresión inmediata al estado pre-V1. El drawer es la narrativa unificada: hoy el operador navega 4-5 surfaces (HubSpot company, services, engagement_phases, team_assignments, finance) sin saber dónde está parado en el ciclo. Una sola surface compone todo y declara estado canónico.

## Goal

- Mockup builder iterado y aprobado por usuario ANTES de implementar
- Drawer `/admin/clients/[orgId]/lifecycle` con: header status + banner blockers + checklist por owner_role + timeline lateral + 3 acciones (activar / resolver / cancelar)
- Listing global `/admin/clients/lifecycle` con filtros (status, kind, owner, overdue) + cursor pagination + KPI tiles
- Banner en `/admin/clients/[orgId]` con CTA "Ver progreso de lifecycle" si hay caso activo
- 4 KPI tiles en `/admin/operations`: onboardings_in_progress, onboardings_overdue, offboardings_blocked, completed_30d
- 100% Vuexy primitives + tokens canónicos (CERO hex, CERO border-radius off-scale)
- Microcopy via skill `greenhouse-ux-writing` (es-CL tuteo) o `src/lib/copy/`
- Visual regression test al cierre

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §12 (UI Surfaces)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI canónico
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` — tokens obligatorios
- `docs/architecture/GREENHOUSE_OPERATIONAL_TABLE_PLATFORM_V1.md` — densidad para listing (TASK-743)
- `DESIGN.md` — contrato visual compacto (CI gate activo)
- `CLAUDE.md` sección "Microcopy / UI copy — regla canónica (TASK-265)"
- `CLAUDE.md` sección "Charts — política canónica" (no aplica acá pero relevante para tiles)

Reglas obligatorias:

- Skill `greenhouse-ux` para layout + componentes ANTES de implementar
- Skill `greenhouse-mockup-builder` para producir mockup paso previo
- Skill `greenhouse-ui-review` ANTES de commit final
- Skill `greenhouse-ux-writing` para todo string visible
- Skill `greenhouse-microinteractions-auditor` para revisar feedback/loading/empty/error states
- Tokens-only: `customColors` + `theme.spacing` + `customBorderRadius`. NUNCA hex literal, NUNCA `borderRadius: 12`
- Densidad operacional aplicada al listing si > 8 columnas (TASK-743 contract)
- Auth en pages: `requireServerSession` + `dynamic = 'force-dynamic'`
- Drawer compose Vuexy `Drawer` component; listing compose `DataTableShell` + `DataTable`
- Estados visibles distinguibles: `loading | empty | error | degraded | success` — nunca ambiguo
- Chips de status con tokens (`customColors.success/warning/error/info`)
- Evidence upload via `<GreenhouseFileUploader contextType='client_lifecycle_evidence_draft'>` (TASK-721 canonical)

## Normative Docs

- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` §12
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `DESIGN.md`

## Dependencies & Impact

### Depends on

- TASK-818 (API endpoints)
- TASK-721 evidence uploader (`GreenhouseFileUploader`) ✅ existe
- TASK-743 operational table density contract ✅ existe
- Vuexy primitives ✅ existe
- `src/lib/copy/` microcopy infrastructure (TASK-265) ✅ existe

### Blocks / Impacts

- TASK-820 reliability tiles consume el listing
- TASK-821 banner debe alertar cuando draft case existe esperando activación

### Files owned

- `src/app/(dashboard)/admin/clients/[organizationId]/lifecycle/page.tsx`
- `src/app/(dashboard)/admin/clients/lifecycle/page.tsx`
- `src/app/(dashboard)/admin/clients/lifecycle/mockup/page.tsx` (mockup builder)
- `src/views/greenhouse/admin/clients/lifecycle/LifecycleDrawerView.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/LifecycleListingView.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/CaseHeader.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/BlockerBanner.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/ChecklistByOwner.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/CaseTimeline.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/CaseActionsBar.tsx`
- `src/views/greenhouse/admin/clients/lifecycle/components/LifecycleStatusBanner.tsx` (banner contextual en página principal cliente)
- `src/views/greenhouse/admin/operations/tiles/LifecycleHealthTiles.tsx`
- `src/lib/copy/dictionaries/es-CL/client-lifecycle.ts` (microcopy canonizada)
- `tests/visual/client-lifecycle.spec.ts` (visual regression)

## Current Repo State

### Already exists

- Vuexy `Drawer`, `DataTable`, `Chip`, `Stepper` componentes
- `<GreenhouseFileUploader>` (TASK-721)
- `<DataTableShell>` (TASK-743)
- Páginas admin existentes para clientes en `/admin/clients/*`
- API endpoints (TASK-818)
- Microcopy infrastructure `src/lib/copy/` (TASK-265)

### Gap

- No existen surfaces UI para lifecycle
- No hay mockup canónico aprobado
- No hay microcopy específico de lifecycle declarado

## Scope

### Slice 1 — Mockup builder + UX validation

- Invocar skill `greenhouse-mockup-builder` para construir `/admin/clients/lifecycle/mockup` con mock data tipada
- 3 estados del drawer: onboarding in_progress + offboarding blocked + reactivation completed
- 1 estado del listing con datos mixtos
- 1 estado del banner contextual en página de cliente
- Iterar con usuario ANTES de implementar real
- Aprobado documentado en commit message: `[mockup-approved-by-user]`

### Slice 2 — Microcopy declaración

- Crear `src/lib/copy/dictionaries/es-CL/client-lifecycle.ts` con TODOS los strings:
  - Status labels: `Borrador`, `En curso`, `Bloqueado`, `Completado`, `Cancelado`
  - Action CTAs: `Activar caso`, `Resolver caso`, `Cancelar caso`, `Avanzar item`, `Marcar bloqueado`, `Subir evidencia`
  - Empty states: `Sin casos activos para este cliente`, `Sin items pendientes`
  - Loading: `Cargando lifecycle...`, `Guardando...`, `Resolviendo caso...`
  - Errors: `No se pudo cargar el caso`, `No tienes permiso para esta acción`
  - Tooltips: explicaciones de blocker codes
- Skill `greenhouse-ux-writing` valida tono es-CL tuteo

### Slice 3 — Drawer principal

- Layout: header (status chip, kind, effective_date, days_open, owner) + banner blockers (si aplica) + tabs Items/Timeline + actions footer
- ChecklistByOwner: agrupa items por `owner_role`, cada grupo collapsible, items con status chip, evidence upload inline cuando `requires_evidence=TRUE`
- CaseTimeline: lista los últimos 20 `client_lifecycle_case_events` con icon + actor + occurred_at relative
- ActionsBar: 3 botones contextual por status:
  - draft → "Activar"
  - in_progress → "Resolver" + "Agregar bloqueador"
  - blocked → "Resolver bloqueador" + "Resolver con override" (si capability)
  - completed/cancelled → readonly con badge
- ConfirmationDialog para resolver / override / cancelar
- Tokens-only, microinteractions audit pasa

### Slice 4 — Listing global

- Filtros: status, kind, owner_role, overdue (boolean), date range
- Cursor pagination (no OFFSET)
- 4 KPI tiles arriba: open_total, overdue, blocked, completed_30d
- Click en row → drawer opens (in-place o navega a `/admin/clients/[orgId]/lifecycle`)
- DataTableShell + DataTable con densidad `comfortable`
- Sort por `created_at DESC` default

### Slice 5 — Banner contextual

- En `/admin/clients/[orgId]` (página principal del cliente), mostrar banner si hay caso activo:
  - Onboarding: "Onboarding en progreso desde X (Y/Z items completados)"
  - Offboarding blocked: "Offboarding bloqueado: <reason_codes>"
  - Reactivation: "Reactivation en progreso"
- CTA "Ver progreso" → drawer

### Slice 6 — Operations dashboard tiles

- En `/admin/operations`, agregar 4 KPI tiles
- Reuse subsystem `Commercial Health` existente (TASK-820 agregará reliability signals)
- Skeleton loading + error state honesto

### Slice 7 — Tests + UI review

- Visual regression test cubriendo 5 estados drawer + 1 listing
- Smoke E2E con Playwright + agent auth: open onboarding case → advance 3 items → resolve case → verify completed
- Skill `greenhouse-ui-review` audit
- Skill `greenhouse-microinteractions-auditor` audit

## Out of Scope

- Cliente portal surfaces (este es admin-tenant) — V1.2
- Notion/Teams UI integration — V1.1
- Multi-space drawer — V1.2
- Real-time websocket updates (V1.0 polling on action complete)
- HubSpot trigger UI (banner para draft cases pendientes) — TASK-821 lo agrega

## Detailed Spec

Mockup obligatorio antes de implementar real (slice 1). Layout reference §12 del spec.

Componentes Vuexy esperados:
- `Drawer` para drawer principal
- `Card` + `CardContent` para grupos del checklist
- `Stepper` opcional para visualización de fases
- `Chip` para status (con `customColors` tokens)
- `Avatar` para actor en timeline
- `LinearProgress` para % completado del checklist
- `Alert` para banner blockers (severity tokens)
- `Skeleton` para loading
- `Tooltip` para blocker code explanations

Microinteractions:
- Smooth slide-in del drawer (200-280ms ease-in-out)
- Optimistic update al avanzar item (rollback si API falla)
- Confirmation dialog para acciones destructivas (cancel, override)
- Toast notification post-success (3s, dismissible)

## Acceptance Criteria

- [ ] Mockup aprobado por usuario antes de implementar real
- [ ] Drawer renderiza en `/admin/clients/[orgId]/lifecycle` para caso activo
- [ ] Drawer renderiza estado vacío honesto si no hay caso activo
- [ ] Listing global con filtros + cursor pagination + 4 KPI tiles
- [ ] Banner contextual en `/admin/clients/[orgId]` cuando caso activo
- [ ] 4 KPI tiles en `/admin/operations` con datos reales
- [ ] CERO hex literal en archivos owned (eslint rule passes)
- [ ] CERO `borderRadius` off-scale (lint passes)
- [ ] Microcopy 100% via `client-lifecycle.ts` dictionary; skill `greenhouse-ux-writing` validó
- [ ] Visual regression test pasa con 5+ estados
- [ ] Skill `greenhouse-ui-review` checklist passes
- [ ] Skill `greenhouse-microinteractions-auditor` review passes
- [ ] E2E Playwright: open → advance → resolve happy path passes
- [ ] DESIGN.md CI gate `pnpm design:lint` strict verde
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test` verde

## Verification

- `pnpm dev` + open `/admin/clients/lifecycle/mockup` para iterate
- `pnpm playwright test tests/visual/client-lifecycle.spec.ts`
- `pnpm playwright test tests/e2e/smoke/client-lifecycle.spec.ts --project=chromium` (con `AGENT_AUTH_SECRET`)
- `pnpm design:lint`
- `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`
- Skills: `greenhouse-ux`, `greenhouse-ui-review`, `greenhouse-microinteractions-auditor`, `greenhouse-ux-writing`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con learnings UX
- [ ] `changelog.md` actualizado
- [ ] Chequeo cruzado: TASK-820 puede tomar (UI estable)
- [ ] Mockup aprobado documentado
- [ ] Visual regression baseline capturado y subido al repo

## Follow-ups

- Notion/Teams provisioning UI integration (V1.1)
- Cliente portal surfaces (V1.2)
- Real-time updates si emerge necesidad
- Métricas de uso (cuántos cases se abren/cierran por semana, conversion rate de draft → in_progress)

## Open Questions

- ¿Drawer es modal full-screen en mobile o slide-in lateral? Recomendación: slide-in lateral en desktop, full-screen en < 768px.
- ¿Listing tiene export CSV en V1.0? Recomendación: NO V1.0; agregar en V1.1 si stakeholder lo pide.
- ¿KPI tiles en operations linkean al listing filtrado? Recomendación: sí (UX estándar).
