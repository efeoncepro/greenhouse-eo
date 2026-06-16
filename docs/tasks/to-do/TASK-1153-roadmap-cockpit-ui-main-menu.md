# TASK-1153 — Roadmap cockpit UI (main menu, non-admin)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `roadmap|ui|platform|ops`
- Blocked by: `TASK-1152`
- Branch: `task/TASK-1153-roadmap-cockpit-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir una ruta visual `Roadmap` como entrada de menu principal, fuera de Admin, para que humanos puedan priorizar el backlog operativo completo sin abandonar los Markdown que usan los agentes. La superficie consume el indice read-only de `TASK-1152` y presenta epics, tasks, mini-tasks e issues como work items relacionados, con lanes, filtros, cards e inspector.

## Why This Task Exists

Admin ya esta demasiado grande y no debe absorber otra herramienta transversal. El Roadmap es una capacidad de producto/operacion, no un subpanel administrativo: necesita presencia propia en navegacion para que priorizacion, grooming, incidentes abiertos y ejecucion se vean como flujo operativo diario.

## Goal

- Agregar `/roadmap` como ruta dashboard de primer nivel y menu item top-level `Roadmap`, no bajo `/admin`.
- Mostrar el backlog como una experiencia visual filtrable por kind (`epic|task|mini_task|issue`), prioridad, lifecycle/status, dominio, readiness, bloqueo, UI/backend profile, environment y salud.
- Mantener Markdown como SSOT: la UI lee, enlaza y orienta; no edita tasks en V1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `DESIGN.md`

Reglas obligatorias:

- Roadmap vive como item principal del menu, no dentro de Admin.
- La pantalla nueva debe partir desde `CompositionShell` y declarar composicion/regions.
- La UI consume el reader/API de `TASK-1152`; no parsea Markdown client-side.
- Issues abiertos deben verse como incidentes/deuda runtime, no como tasks ejecutables. Epics deben verse como programas contenedores; mini-tasks como cambios acotados.
- Copy reusable vive en `src/lib/copy/*` o config canonica, no hardcodeado en JSX.
- GVC desktop + mobile y scroll-width check son parte del cierre.

## Normative Docs

- `docs/tasks/TASK_TEMPLATE.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`

## Dependencies & Impact

### Depends on

- `TASK-1152`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-navigation-copy.ts`
- `src/components/greenhouse/primitives/GreenhouseBreadcrumbs.tsx`
- `src/components/greenhouse/primitives/composition-shell/CompositionShell.tsx`
- `scripts/frontend/scenarios/`

### Blocks / Impacts

- Impacts human backlog planning, grooming and prioritization.
- May become the operating cockpit for future task lifecycle/ranking commands.

### Files owned

- `src/app/(dashboard)/roadmap/page.tsx`
- `src/views/greenhouse/roadmap/RoadmapCockpitView.tsx`
- `src/views/greenhouse/roadmap/components/*`
- `src/lib/copy/roadmap.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-navigation-copy.ts`
- `scripts/frontend/scenarios/roadmap-cockpit.scenario.ts`
- `docs/manual-de-uso/plataforma/roadmap-cockpit.md`

## Current Repo State

### Already exists

- Main navigation is composed in `src/components/layout/vertical/VerticalMenu.tsx`.
- `Design System` already exists as a standalone cross-cutting internal menu item outside Admin.
- `CompositionShell` and `GreenhouseBreadcrumbs` exist as platform primitives.
- GVC scenarios live under `scripts/frontend/scenarios/`.

### Gap

- There is no `/roadmap` route.
- There is no human visual cockpit for `docs/epics/**`, `docs/tasks/**`, `docs/mini-tasks/**` and `docs/issues/**`.
- Backlog prioritization requires reading many Markdown files manually.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno, founder/product owner, agente humano que prioriza backlog y revisa readiness.
- Momento del flujo: planificacion semanal, grooming, seleccion de proxima task, lectura rapida de bloqueos.
- Resultado perceptible esperado: el backlog se entiende en minutos por lanes visuales, filtros y un inspector claro que distingue programas, trabajo ejecutable, mini follow-ups e incidentes.
- Friccion que debe reducir: saltar Markdown por Markdown, perder contexto de bloqueos, mezclar prioridades con lifecycle y no ver salud de la task.
- No-goals UX: no editar Markdown, no reemplazar `TASK_PROCESS.md`, no convertir Admin en backlog manager.

### Surface & system decision

- Surface: `/roadmap` dashboard route + main vertical menu item `Roadmap`.
- Composition Shell: `aplica` — nueva pantalla con `leadPlusContext` o `split`: primary board/list, aside inspector, dock/filter actions when needed.
- Primitive decision: `reuse` — `CompositionShell`, `GreenhouseBreadcrumbs`, existing MUI/Vuexy inputs, Greenhouse cards/chips where available.
- Adaptive density / The Seam: `aplica` — task cards deben adaptarse a board/list/aside widths sin clipping.
- Floating/Sidecar/Dialog decision: inspector in-flow via Composition Shell aside; no modal para lectura normal.
- Copy source: `src/lib/copy/roadmap.ts`
- Access impact: `routeGroups|views|entitlements` — gated as internal roadmap surface; final capability aligned with `TASK-1152`.

### State inventory

- Default: cockpit con summary KPIs, lanes/list, filters and selected work item inspector.
- Loading: skeletons compactos para board/list and inspector.
- Empty: estado para no tasks o filtros sin resultados.
- Error: error canonico si `TASK-1152` falla.
- Degraded / partial: mostrar conteo y warnings si algunas tasks no parsean bien.
- Permission denied: usar superficie canonica de no autorizado.
- Long content: inspector scrollable, cards truncadas con details in inspector.
- Mobile / compact: layout single-column; filters collapse; inspector becomes route-local section or drawer only if primitive supports it.
- Keyboard / focus: filters tabbable, card selection keyboard-accessible, focus restore after inspector close/change.
- Reduced motion: no morph/stagger if prefers-reduced-motion.

### Interaction contract

- Primary interaction: filtrar backlog, seleccionar work item, abrir detalles, copiar comando aplicable (`/implement-task TASK-###` solo para tasks) or open Markdown path.
- Hover / focus / active: cards and filters expose focus ring and selected state.
- Pending / disabled: disabled only when reader/API is loading or permission missing.
- Escape / click-away: clears transient filters/panels only when no text input is active.
- Focus restore: selecting/closing inspector restores focus to originating card/filter.
- Latency feedback: loading state for initial fetch and filter refresh.
- Toast / alert behavior: toast only for copy-to-clipboard or recoverable API retry.

### Motion & microinteractions

- Motion primitive: `framer layout|CSS`
- Enter / exit: subtle list/card entrance using existing motion tokens where appropriate.
- Layout morph: Composition Shell region changes only.
- Stagger: optional small stagger for cards, not decorative.
- Timing / easing token: use canonical motion tokens, no hardcoded ms.
- Reduced-motion fallback: instant layout updates and no stagger.
- Non-goal motion: no hero animation, no marketing-style motion, no decorative background effects.

### Visual verification

- GVC scenario: `scripts/frontend/scenarios/roadmap-cockpit.scenario.ts`
- Viewports: desktop and mobile 390px.
- Required captures: default board/list, filtered empty, selected task inspector, degraded/parse warning state if fixture/API can simulate.
- Required `data-capture` markers: `roadmap-shell`, `roadmap-filters`, `roadmap-board`, `roadmap-inspector`, `roadmap-summary`.
- Scroll-width check: Playwright check `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at desktop and 390px.
- Accessibility/focus checks: keyboard selection, filter tab order, inspector focus restore.
- Before/after evidence: first implementation capture plus final adjusted capture.
- Known visual debt: none accepted at creation.

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

### Slice 1 — Route, nav and access framing

- Crear `src/app/(dashboard)/roadmap/page.tsx` y `RoadmapCockpitView`.
- Agregar item top-level `Roadmap` en `VerticalMenu.tsx`, fuera de Admin, siguiendo el precedente cross-cutting de Design System.
- Agregar copy canonico en `src/lib/copy/roadmap.ts` y navigation copy si aplica.
- Gated by internal/roadmap access aligned with `TASK-1152`.

### Slice 2 — Cockpit layout and summary

- Implementar Composition Shell con `primary` para board/list, `aside` para inspector and optional `lead` summary.
- Mostrar KPIs de backlog: total by kind, epics activos, ready tasks, blocked tasks, open issues, needs grooming, in-progress, recently complete/resolved.
- Implementar filtros por kind, lifecycle/status, domain, execution profile, UI/backend impact, priority, health, blocked state, issue environment and search.

### Slice 3 — Work item cards, lanes and inspector

- Crear cards adaptive-density ready para `epic`, `task`, `mini_task` e `issue` con tratamiento visual diferenciado.
- Lanes sugeridas: Programs, Ready to Execute, Blocked, Open Issues, Needs Grooming, In Progress, Recently Completed/Resolved.
- Inspector muestra summary, why/symptom/root cause when available, files owned, dependencies, related IDs, health warnings, path Markdown and copy command when applicable.

### Slice 4 — States, accessibility and GVC

- Cubrir loading, empty, error, degraded, permission denied, long content and mobile.
- Agregar GVC scenario desktop + mobile.
- Validar no horizontal page scroll and focus/keyboard behavior.

## Out of Scope

- Editar Markdown o crear epics/tasks/mini-tasks/issues desde la UI.
- Cambiar lifecycle/rank desde Roadmap.
- Crear DB persistence for prioritization.
- Meter Roadmap bajo `/admin`.
- Construir una landing/marketing page; la primera pantalla es el cockpit usable.

## Detailed Spec

La pantalla debe priorizar lectura operacional densa, no hero/marketing:

- Header compacto con `GreenhouseBreadcrumbs` y titulo `Roadmap`.
- Summary band con KPIs escaneables.
- Filter rail/toolbar con controles familiares.
- Board/list principal con cards de work item.
- Aside inspector para detalle sin abandonar el contexto.
- Acciones seguras: abrir Markdown, copiar ID, copiar `/implement-task TASK-###` solo para tasks ejecutables, ver blockers/related items.

La UI debe funcionar si el reader reporta work items con warnings: esos items se muestran como `Needs grooming`, no desaparecen.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1152` must ship before data-backed UI.
- Slice 1 (route/nav) -> Slice 2 (layout/summary) -> Slice 3 (cards/inspector) -> Slice 4 (states/GVC).
- Nav item should remain hidden or degraded until `TASK-1152` endpoint is available.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Roadmap termina dentro de Admin y agranda el problema original | UI/nav | low | Hard acceptance criterion: top-level menu item, not `/admin` | Manual nav review + GVC |
| UI crea un segundo source of truth | platform | medium | Read-only contract from `TASK-1152`; no PATCH/POST and no client-side Markdown parsing | Code review routes/actions |
| Issues se tratan como tareas ejecutables y confunden priorizacion | ops | medium | Kind-specific copy/actions; no `/implement-task` para `issue` salvo related task | GVC + inspector review |
| Cards densas generan overflow horizontal | UI/mobile | medium | Composition Shell + adaptive card density + mandatory scroll-width check | Playwright scrollWidth check |
| Backlog legacy se ve como error total | UI/data | medium | Degraded/partial state and needs-grooming lane | GVC degraded state / API warnings |
| Exponer Roadmap a usuarios no internos | access | low | route/menu gating aligned with endpoint capability | Permission denied smoke |

### Feature flags / cutover

Sin flag si el menu/route queda gated por acceso interno y el endpoint de `TASK-1152` esta estable. Si `TASK-1152` no esta listo al merge parcial, mantener route hidden or degraded behind access/feature guard until ready.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Remove nav item/route or gate access | <15 min | si |
| Slice 2 | Revert layout view | <20 min | si |
| Slice 3 | Revert cards/inspector components | <20 min | si |
| Slice 4 | Revert scenario/state additions | <15 min | si |

### Production verification sequence

1. Deploy to staging.
2. Log in as authorized internal user and confirm `Roadmap` appears as top-level menu item, not under Admin.
3. Open `/roadmap`; verify data from `TASK-1152`, filters by `epic|task|mini_task|issue`, lanes and inspector.
4. Run GVC desktop + mobile and review frames.
5. Run scroll-width check at desktop and 390px.
6. Verify unauthorized user cannot see or open the route.

### Out-of-band coordination required

N/A — repo-only change unless access capability requires production seed/entitlement assignment.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Roadmap` existe como item principal del menu, no bajo Admin.
- [ ] `/roadmap` usa `CompositionShell` y primitive decisions canonicas.
- [ ] La UI consume el contrato de `TASK-1152`; no parsea Markdown client-side ni crea writes.
- [ ] La UI distingue epics, tasks, mini-tasks e issues con acciones y copy apropiados por kind.
- [ ] Copy reusable vive en `src/lib/copy/roadmap.ts` o config canonica.
- [ ] Loading, empty, error, degraded, permission denied, long content, mobile and keyboard states are covered.
- [ ] GVC desktop + mobile fue capturado y mirado.
- [ ] No existe scroll horizontal de pagina en desktop ni mobile 390px.
- [ ] Unauthorized users cannot see/open the Roadmap surface.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm fe:capture roadmap-cockpit --env=local`
- Playwright scroll-width check desktop + mobile 390px
- Manual review of nav placement outside Admin

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/manual-de-uso/plataforma/roadmap-cockpit.md` quedo actualizado si la UI cambia flujo operacional

## Follow-ups

- Future backend task: governed commands to change rank/lifecycle through PR-backed Markdown edits, if desired.
- Future UI task: roadmap planning modes by quarter/initiative once visual read-only cockpit is adopted.

## Open Questions

- Definir en Plan Mode si el primer release usa only board, only list, or board+list toggle. Recomendacion inicial: board + inspector with list-density fallback on mobile.
