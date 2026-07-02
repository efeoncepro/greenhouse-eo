# TASK-1309 — Growth SEO: Site Audit UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1309-growth-seo-site-audit-ui.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ui|data`
- Blocked by: `TASK-1306, TASK-1304`
- Branch: `task/TASK-1309-growth-seo-site-audit-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la ruta operador `/admin/growth/seo/audit` (+ drill `?issueGroup=`): **health KPIs** (score + críticos + warnings + páginas) con **freshness explícito** del último crawl + una **lista de issues priorizados por impacto×esfuerzo** (severidad icono+label+color, no solo color; #páginas afectadas) + drill del grupo con las URLs afectadas. Cliente puro de `readSiteAuditReport`; "Correr auditoría" = command gobernado `queueSiteAudit` (OnPage async). Site audit es soporte del pitch (arch §11), pero es donde el operador diagnostica salud técnica del ecommerce del cliente (caso Berel).

## Why This Task Exists

El módulo SEO (EPIC-022) tiene el reader `readSiteAuditReport` (TASK-1304) pero sin superficie, el operador no puede leer la salud técnica de un dominio ni priorizar issues. Sin freshness explícito + priorización por impacto×esfuerzo, un audit crudo es una tabla plana ilegible que esconde la señal "ataca esto primero" y no distingue un crawl viejo de uno fresco.

## Goal

- Crear `/admin/growth/seo/audit` alcanzable desde **Growth → Search Visibility → SEO**, con health KPIs + lista priorizada + drill de grupo.
- Exponer la señal decisoria: severidad (⛔/⚠/ⓘ icono+label+color) × #páginas afectadas + **freshness** ("Último crawl: hace 2 días").
- Distinguir honestamente los estados de crawl (running / succeeded-0-findings / degraded / failed) y disparar "Correr auditoría" vía el command gobernado `queueSiteAudit`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §3 (site audit / OnPage), §6 (OnPage task-based async, honest degradation: `succeeded` 0 findings ≠ `failed`), §7 (`readSiteAuditReport`, command `queueSiteAudit`), §8 (signals `seo.audit.stuck_tasks`), §10.4 (dataviz: health radialBar), §11 (caso Berel: site audit del ecommerce).
- `docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md` — nodo **S4** del master flow.
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities `growth.seo.*` per-org.

Reglas obligatorias:

- **NUNCA** fabricar snapshot: un crawl `succeeded` con 0 findings ≠ uno `failed` (arch §6). Renderizarlos como estados distintos + honest.
- **Severidad = icono + label + color**, nunca solo color (⛔ Crítico / ⚠ Atención / ⓘ Info) — a11y hard rule.
- Issues como **lista priorizada por impacto×esfuerzo**, NO tabla plana (la lista jerárquica preserva la señal "ataca esto primero"; el `DataTableShell` solo para el drill de URLs).
- **"Correr auditoría"** = command gobernado `queueSiteAudit` (arch §6/§7, OnPage async → ops-worker; poll idempotente por `provider_task_id`), gateado por `growth.seo.audit.run` + quota cap `enforceSeoRunEntitlement` (gate de costo).
- Drill vía `?issueGroup=` query param (arch §10.1), no segmento dinámico paralelo (back button + share simples).
- Freshness explícito del último crawl (arch §10.5); sin crawl → "Sin auditoría reciente" + CTA (nunca ceros).
- Toda `page.tsx` nueva → `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV` (lección TASK-1247).
- Copy en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`, es-CL, `greenhouse-ux-writing`).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `DESIGN.md`
- `docs/ui/wireframes/TASK-1309-growth-seo-site-audit-ui.md`

## Dependencies & Impact

### Depends on

- `TASK-1306` — SEO Overview operador (shell de sección, nav, viewCode `internal`, Space picker). **[verificar]** viewCode canónico.
- `TASK-1304` — reader `readSiteAuditReport(targetId, auditRunId?)` + command `queueSiteAudit` (OnPage queue+poll). **[verificar]** existencia en `src/lib/growth/seo/`.
- `TASK-1301` — capabilities `growth.seo.*` + `enforceSeoRunEntitlement`.

### Blocks / Impacts

- Diagnóstico técnico del ecommerce del cliente (arch §11, caso Berel) — material de conversación de SOWs.

### Files owned

- `src/app/(dashboard)/admin/growth/seo/audit/page.tsx` [verificar route group] (drill vía `?issueGroup=` en la misma page)
- `src/views/greenhouse/admin/growth/seo/audit/SiteAuditView.tsx`
- `src/views/greenhouse/admin/growth/seo/audit/SiteAuditHealthGauge.tsx`
- `src/views/greenhouse/admin/growth/seo/audit/SiteAuditIssueGroupDrill.tsx`
- `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`)
- `route-reachability-manifest.ts` (registro de alcanzabilidad de rutas, TASK-982)
- `scripts/frontend/scenarios/growth-seo-audit.*` [verificar DSL]

## Current Repo State

### Already exists

- Primitives: `GreenhouseKpiDelta`, `GreenhouseChip`, `GreenhouseBreadcrumbs`, `EmptyState`, `GreenhouseAsyncActionButton`, `DataTableShell`, CompositionShell.
- ApexCharts en el repo (2.º tier oficial, para el health radialBar — arch §10.4).

### Gap

- No existe `src/lib/growth/seo/**` (readers/commands — dependencia TASK-1299/1304).
- No existe la ruta `/admin/growth/seo/audit` ni la sección SEO en nav (TASK-1306 la establece).

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno Growth/AM diagnosticando salud técnica de un dominio.
- Momento del flujo: revisando el último crawl semanal; decide qué issues atacar primero.
- Resultado perceptible esperado: entiende health + volumen de issues, escanea los priorizados, y hace drill al grupo para ver URLs.
- Friccion que debe reducir: leer un audit crudo como tabla plana ilegible; confiar en un diagnóstico viejo sin saberlo.
- No-goals UX: arreglar issues, configurar reglas de crawl, correr auditorías ad-hoc ilimitadas.

### Surface & system decision

- Surface: `/admin/growth/seo/audit` (+ drill `?issueGroup=`) — **ruta interna** → viewCode routeGroup `internal`, NUNCA `client_*`.
- Composition Shell: `aplica` — composición `single` (health strip + lista de issues; drill como panel/expand in-flow o navegación en mobile).
- Primitive decision: `reuse` (KPI cards, GreenhouseChip severidad, GreenhouseBreadcrumbs, EmptyState, GreenhouseAsyncActionButton, DataTableShell para el drill de URLs) + `new` acotado (health radialBar ApexCharts, config).
- Adaptive density / The Seam: `aplica` — la lista de issues condensa en mobile; el drill de URLs usa `DataTableShell` card-density.
- Floating/Sidecar/Dialog decision: drill = panel/expand in-flow (desktop) o navegación con back (mobile); sin modal.
- Copy source: `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`) + `getMicrocopy()` estados/aria.
- Access impact: `views|entitlements` — viewCode SEO `internal` (TASK-1306) + capability `growth.seo.observation.read` (ver) / `growth.seo.audit.run` ("Correr auditoría").

### State inventory

- Default: health KPIs + lista de issues priorizada.
- Loading: KPI + lista skeleton.
- Empty: sin auditoría ("Sin auditoría reciente" + CTA "Correr auditoría").
- Running: crawl en curso ("Auditoría en curso" — OnPage async, poll idempotente).
- Succeeded-0-findings: crawl OK sin issues ("Sin issues detectados") — distinto de `failed`.
- Error: `failed` ("La auditoría falló" + Reintentar) / reader falla ("No pudimos cargar la auditoría" + Reintentar).
- Degraded / partial: crawl `degraded` → banner "terminó parcialmente"; nunca fabricar snapshot.
- Permission denied: sin `growth.seo.observation.read` → "Sin acceso" (NO reintentar).
- Long content: lista de issues + drill scroll interno; sin scroll horizontal.
- Mobile / compact: KPIs apilados; lista condensa; drill = navegación con back.
- Keyboard / focus: drill → foco al header del grupo; back → foco a la fila del grupo.
- Reduced motion: gauge sin animación de entrada; drill sin transición obligatoria.

### Interaction contract

- Primary interaction: leer health → escanear issues → drill `[Ver →]` a un grupo → volver.
- Hover / focus / active: hover/focus visible en filas de issue y CTAs.
- Pending / disabled: "Correr auditoría" con `aria-busy` mientras el enqueue ejecuta.
- Escape / click-away: drill panel (desktop) cierra con Escape restaurando foco.
- Focus restore: back del drill → foco a la fila del grupo.
- Latency feedback: estado `running` visible tras "Correr auditoría" (OnPage async, no bloqueante).
- Toast / alert behavior: confirmación de "Correr auditoría" iniciada; sin toast efímero para el resultado (es async, se refleja en el estado).

### Motion & microinteractions

- Motion primitive: `CSS` + entrada nativa de ApexCharts (gauge)
- Enter / exit: entrada ligera del gauge; drill expand/collapse suave.
- Layout morph: Composition Shell si el drill es expand in-flow.
- Stagger: opcional en la lista, no requerido.
- Timing / easing token: tokens del design system.
- Reduced-motion fallback: gauge sin animación; drill sin transición.
- Non-goal motion: animación decorativa.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/audit/page.tsx` + drill vía `searchParams.issueGroup` (server guard: viewCode SEO `internal` + `can(tenant, 'growth.seo.observation.read', 'read', 'tenant')`).
- Primitive / variant / kind: CompositionShell `single`; radialBar ApexCharts (health); lista priorizada (cards/rows); `DataTableShell` (drill de URLs).
- Component candidates: `SiteAuditView.tsx` + `SiteAuditHealthGauge.tsx` + `SiteAuditIssueGroupDrill.tsx`.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_AUDIT`.
- Data reader / command: `readSiteAuditReport(targetId, auditRunId?)` (TASK-1304 [verificar]); `queueSiteAudit(targetId, actor)` (OnPage async, arch §6) vía route handler admin.
- API parity: UI cliente del reader/command; "Correr auditoría" gobernada (capability + quota cap). Nexa opera `queueSiteAudit`.
- Access / capability: `growth.seo.observation.read` (ver) + `growth.seo.audit.run` ("Correr auditoría").
- States to implement: default, loading, empty, running, succeeded-0, degraded, error(failed+reader), permission.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-audit.scenario.ts` (+ `.mobile`) [verificar DSL].
- Route: `/admin/growth/seo/audit` (+ `?issueGroup=indexability`).
- Viewports: desktop 1440×900 + 390×844.
- Required steps: cargar (agent auth operador) → mirar health + lista → click `[Ver →]` → drill URLs → back.
- Required captures: default, drill, empty, running, succeeded-0-findings.
- Required `data-capture` markers: `seo-audit-health`, `seo-audit-issues`, `seo-audit-drill`, `seo-audit-empty`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, health gauge `role=img`, severidad con label textual.
- Scroll-width checks: `scrollWidth==clientWidth` desktop + 390px.
- Reduced-motion / focus evidence: gauge sin animación; foco al drill + back.

### Design decision log

- Decision: issues como lista priorizada por impacto×esfuerzo, NO tabla plana. Alternatives considered: `DataTableShell` con columnas ordenables (rechazado — esconde la prioridad). Why this pattern: state-design + info-architecture (priorización, no exploración); `DataTableShell` solo para el drill de URLs.
- Decision: severidad = icono + label + color. Why: modern-ui a11y floor + 8% daltonismo.
- Decision: freshness explícito. Why: state-design — un audit viejo es engañoso; sin crawl → empty accionable.
- Decision: `succeeded` 0 findings ≠ `failed`. Why: arch §6 honest degradation.
- Decision: drill vía `?issueGroup=`. Why: info-architecture (back/share simples).
- Decision: radialBar ApexCharts (no ECharts). Why: arch §10.4 lo especifica; un gauge simple no justifica ECharts.
- Reuse / extend / new primitive: reuse; radialBar ApexCharts = config. Open risks: `readSiteAuditReport` (TASK-1304) debe existir; OnPage async puede stall (poll idempotente + estado honesto).

### Visual verification

- GVC scenario: `growth-seo-audit`
- Viewports: desktop + 390px.
- Required captures: default, drill, empty, running, succeeded-0.
- Required `data-capture` markers: `seo-audit-health`, `seo-audit-issues`, `seo-audit-drill`, `seo-audit-empty`.
- Scroll-width check: `scrollWidth==clientWidth` desktop + 390px.
- Accessibility/focus checks: gauge `role=img`; severidad label textual; foco al drill+back; freshness visible.
- Before/after evidence: N/A página nueva.
- Known visual debt: depende del shell de sección SEO (TASK-1306).

## Backend/Data Contract

`Backend impact: none` — rationale. Esta task es una **superficie UI cliente pura**: consume el reader/command gobernados que ya define el backend SEO (EPIC-022: `readSiteAuditReport` + `queueSiteAudit` en TASK-1304). NO crea ni modifica ningún contrato server-side, schema, migración, reader, command, ruta API, sync, cron ni webhook. El `Domain` incluye `data` solo porque la superficie **presenta** el reporte de auditoría (dataviz + lista priorizada), no porque produzca un contrato de datos.

- Source of truth: ninguno nuevo. `seo_site_audit_runs` + `seo_site_audit_findings` (SoT del backend, TASK-1299/1304) — esta task solo lee su proyección vía `readSiteAuditReport` y dispara el enqueue vía `queueSiteAudit`.
- Contract surface: consume el reader/command existentes; sin contrato nuevo.
- Invariante: la UI es cliente del primitive (Full API Parity), NUNCA fabrica un snapshot ni deriva salud en cliente — el estado (`running`/`succeeded`/`degraded`/`failed`) viene del backend honesto (arch §6).
- Migration/backfill/rollback: `none` (revert route/nav + flag OFF).
- Runtime evidence: focal/UI tests + GVC; el write real (`queueSiteAudit`) se verifica contra el estado `running` + poll idempotente por `provider_task_id` (signal `seo.audit.stuck_tasks`).

Si durante Discovery se descubre que la UI necesita un reader/command que aún no existe con la shape correcta, **cambiar a `Backend impact: reader/command` y partir el trabajo** (backend-data foundation + ui-ux consumer), NO agregar lógica de negocio al componente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Ruta + shell + health KPIs + estados

- Crear `/admin/growth/seo/audit` con page-guard (viewCode SEO `internal` + capability `observation.read`).
- Header (breadcrumb + Space picker + freshness "Último crawl: hace N días" + `[Correr auditoría]`).
- Health strip: radialBar (ApexCharts) + KPI cards (críticos/warnings/páginas), consumiendo `readSiteAuditReport`.
- Estados loading/empty/running/succeeded-0/degraded/error/permission honestos.
- Registrar en `route-reachability-manifest.ts` + key nav.

### Slice 2 — Lista de issues priorizada

- Lista (cards/rows) ordenada por impacto×esfuerzo: severidad (⛔/⚠/ⓘ icono+label+color) · nombre issue · #págs afectadas · `[Ver →]`.
- Copy y severidad tokenizados; nunca color solo.

### Slice 3 — Drill del grupo (`?issueGroup=`)

- `?issueGroup=<type>` → panel/página con las URLs afectadas + `detail` bounded, usando `DataTableShell`.
- Foco al header del grupo; back restaura foco a la fila.

### Slice 4 — "Correr auditoría" + GVC + a11y

- `[Correr auditoría]` = `GreenhouseAsyncActionButton` → `queueSiteAudit` (OnPage async, estado `running`).
- Scenario GVC desktop/mobile; scroll-width; foco; respeto a movimiento reducido (WCAG 2.3.3); severidad label textual.

## Out of Scope

- Backend del SEO (readers/commands OnPage: TASK-1299/1304).
- Keyword opportunities (TASK-1308), rank performance (TASK-1307), cliente/report (TASK-1310).
- Arreglar issues; configurar reglas de crawl; auditorías ad-hoc ilimitadas.

## Detailed Spec

La UI es cliente del contrato SEO (arch §7): lee `readSiteAuditReport`, dispara `queueSiteAudit`. La lista de issues responde "¿qué arreglo primero?" — por eso es una **lista priorizada por impacto×esfuerzo**, no una tabla plana (state-design: priorización > exploración). Severidad con icono+label+color (a11y). El **freshness** dice si confiar en el diagnóstico. Un crawl `succeeded` con 0 findings es buena noticia, no un error (arch §6): estados honestos distintos para running/succeeded-0/degraded/failed. "Correr auditoría" es OnPage async (queue+poll → ops-worker), gobernado + gateado por cuota (gate de costo DataForSEO).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (ruta+health+estados) → Slice 2 (lista) → Slice 3 (drill) → Slice 4 ("Correr auditoría"+GVC). No conectar "Correr auditoría" antes de tener el estado `running` (Slice 1).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confundir `succeeded` 0 findings con `failed` (fabricar snapshot) | data quality | medium | estados honestos distintos (arch §6); nunca inventar snapshot | code review/GVC |
| Severidad color-only (a11y) | a11y | medium | icono + label + color; hard rule del brief | GVC/axe |
| Tabla plana esconde prioridad | UX | medium | lista priorizada por impacto×esfuerzo; `DataTableShell` solo en drill | GVC |
| "Correr auditoría" sin gate de costo | cost | medium | `queueSiteAudit` gateado por `audit.run` + quota cap | `seo.provider.cost_over_budget` |
| OnPage async stall (sin feedback) | resiliencia | medium | estado `running` honesto + poll idempotente por `provider_task_id` | `seo.audit.stuck_tasks` |
| Overflow mobile (health + lista + drill) | UI | medium | CompositionShell + card-density + scroll-width | GVC |

### Feature flags / cutover

- Gated por `GROWTH_SEO_ENABLED` (default OFF, fila en `FEATURE_FLAG_STATE_LEDGER.md`) + capability `growth.seo.observation.read` per-org. Oculto de nav hasta que el backend SEO esté desplegado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert route/nav + flag OFF | <5 min | si |
| Slice 2 | revert lista de issues | <5 min | si |
| Slice 3 | revert drill | <5 min | si |
| Slice 4 | remove acción "Correr auditoría" | <5 min | si |

### Production verification sequence

1. Staging con `GROWTH_SEO_ENABLED=true` + un target con un `seo_site_audit_runs` (o fixture) en varios estados.
2. Operador con capability ve health + lista; drill muestra URLs; freshness visible.
3. "Correr auditoría" → estado `running`; poll idempotente completa (verificar `seo.audit.stuck_tasks` steady).
4. Verificar estados succeeded-0 / degraded / failed honestos.
5. GVC desktop/mobile mirado.

### Out-of-band coordination required

- N/A — repo-only change (depende del rollout del backend SEO + Cloud Scheduler `seo-audit-*`, coordinado en EPIC-022).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] Ruta `/admin/growth/seo/audit` (+ drill `?issueGroup=`) alcanzable desde **Growth → Search Visibility → SEO** (routeGroup `internal`), en `route-reachability-manifest.ts` + key en `GH_INTERNAL_NAV`.
- [ ] UI consume `readSiteAuditReport` (read) + `queueSiteAudit` (command gobernado OnPage async), sin lógica de negocio en el componente.
- [ ] Health KPIs (radialBar + críticos/warnings/páginas) + **freshness explícito** del último crawl.
- [ ] Issues como **lista priorizada por impacto×esfuerzo** (NO tabla plana); severidad **icono + label + color** (nunca color solo); #páginas afectadas.
- [ ] Drill `?issueGroup=` muestra las URLs afectadas (`DataTableShell`); foco al grupo + back restaura.
- [ ] Estados running / succeeded-0-findings / degraded / failed / reader-error distintos y honestos (arch §6: 0 findings ≠ failed); sin crawl → "Sin auditoría reciente" + CTA (nunca ceros).
- [ ] "Correr auditoría" gateada por `growth.seo.audit.run` + quota cap; estado `running` visible.
- [ ] Copy reusable en `src/lib/copy/growth.ts` (`GH_GROWTH_SEO_AUDIT`, es-CL, `greenhouse-ux-writing`).
- [ ] GVC desktop+mobile capturado y mirado **en loop**; `scrollWidth==clientWidth`; gate axe verde.
- [ ] Focus/keyboard y respeto a movimiento reducido (WCAG 2.3.3) validados.
- [ ] `UI ready` pasa a `yes` solo cuando `pnpm task:lint --task TASK-1309` queda sin findings.

## Verification

- `pnpm local:check:ui`
- `pnpm test`
- `pnpm fe:capture growth-seo-audit --env=staging`
- `pnpm task:lint --task TASK-1309`
- `pnpm ui:wireframe-check --task TASK-1309`
- `pnpm ui:readiness-check --task TASK-1309`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] route/nav/reachability actualizados
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja `GROWTH_SEO_ENABLED` si la task lo toca

## Follow-ups

- Notificación al operador cuando un audit run termina (el estado `running` cubre el interino).
- Exponer el diagnóstico técnico al cliente vía el report artifact (TASK-1310) si el pitch lo requiere.

## Delta 2026-07-01 — conectada al Master UI Flow del programa Search Visibility 360

- Esta task es el nodo **S4** (Site audit) del flujo cross-surface del módulo SEO. Su UI se conecta con Overview (S1), Rank performance (S2), Keywords (S3) y Cliente/Report (S5–S7) en el doc maestro **`docs/ui/flows/EPIC-022-search-visibility-360-UI-FLOW.md`**. "Correr auditoría" mapea al command gobernado `queueSiteAudit` (Full API Parity → Nexa por construcción); el freshness/degradación enlaza a `seo.audit.stuck_tasks` sin computar salud en cliente.

## Open Questions

1. ¿El drill del grupo es un panel expand in-flow (desktop) o navegación a una sub-vista? Propuesta: expand in-flow con `?issueGroup=` en desktop, navegación con back en mobile.
