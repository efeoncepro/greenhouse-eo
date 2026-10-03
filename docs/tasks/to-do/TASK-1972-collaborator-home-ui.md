# TASK-1972 — Homes por rol · H: Home de colaboradores (Mi Greenhouse en `/my`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1972-collaborator-home-ui.md`
- Flow: `docs/ui/flows/TASK-1969-portal-chrome-and-greeting-elio-flow.md`
- Motion: `docs/ui/motion/TASK-1969-portal-chrome-and-greeting-elio-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseño aprobado en canvas 2026-10-02 (artboard Colaborador.dc.html); wireframe escrito; sin implementación`
- Rank: `5`
- Domain: `ui|platform|hr`
- Blocked by: `TASK-1969, TASK-1970`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza `MyDashboardView` en `/my` por la Home de colaboradores aprobada en el canvas (`Colaborador.dc.html`): Mi desempeño (ICO personal y piezas por semana), Tu foco hoy, Mis tareas, y a la derecha novedades, mis asignaciones y mi ficha (vacaciones, próxima liquidación, objetivos, evaluación). La ruta y la política de inicio no cambian (decisión del operador). Monta el saludo y el chrome de `TASK-1969` y consume sólo la API de `TASK-1970`.

## Why This Task Exists

Hoy `/my` muestra cinco KPIs sueltos y las últimas notificaciones (`src/views/greenhouse/my/MyDashboardView.tsx`), sin tareas del día, sin serie de desempeño y sin manejo canónico de errores. El operador aprobó una Home personal que le dice al colaborador qué entregar hoy, cómo va contra sus metas y el estado de su ficha.

## Goal

- Home de colaboradores en `/my` con la jerarquía aprobada.
- Ningún costo, tarifa ni monto de nómina visible.
- Manejo canónico de `member_identity_not_linked` mientras `TASK-878` siga abierta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La vista sólo lee el snapshot de la Home con audiencia `collaborator`; nunca llama `/api/my/*` directo.
- Nómina y permisos sólo como fechas y saldos materializados; nunca montos.
- Errores con `throwIfNotOk` y `actionable` (sin «Reintentar» cuando no aplica).

## Normative Docs

- `docs/tasks/to-do/TASK-1967-role-homes-redesign-program.md`
- Canvas aprobado: https://claude.ai/artifact/4Qbk74gjXBkBddx1fjQgQU (artboard `Colaborador.dc.html`)
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1969` (chrome, saludo, novedades).
- `TASK-1970` (bloques `my-performance`, `my-focus`, `my-tasks`, `my-assignments`, `my-profile-stats`, `announcements`).
- `TASK-1971` (reutiliza `TeamPerformancePanel` y `ThroughputChart`; si esta task llega antes, crea esas primitives y `TASK-1971` las reutiliza).

### Blocks / Impacts

- `TASK-1967` (hija H).
- `TASK-878` (self-heal de identidad): mientras siga abierta, esta Home maneja `member_identity_not_linked`.

### Files owned

- `src/app/(dashboard)/my/page.tsx`
- `src/views/greenhouse/home/role-homes/collaborator/**` (nuevo)
- `src/lib/copy/home.ts` (sección colaborador)
- `scripts/frontend/scenarios/home-collaborator-role.scenario.ts`
- `docs/ui/wireframes/TASK-1972-collaborator-home-ui.md`

## Current Repo State

### Already exists

- `/my` con `MyDashboardView` y la vista `mi_ficha.mi_inicio`.
- Endpoints `/api/my/*` y guard `requireMyTenantContext()` con el error canónico `member_identity_not_linked`.

### Gap

- Sin tareas del día, sin serie personal, sin Mi ficha resumida.
- `MyDashboardView` no usa `throwIfNotOk`.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/app/(dashboard)/my` y `src/views/greenhouse/my/**`
- Future candidate home: `portal`
- Boundary: consume el snapshot de la Home (`TASK-1970`) con audiencia `collaborator` y las primitives de `TASK-1969`/`TASK-1971`
- Server/browser split: la página resuelve el snapshot en el servidor; los componentes son client components sin stores
- Build impact: none
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: colaborador de Efeonce (rol `collaborator`)
- Momento del flujo: inicio del día y vuelta durante la jornada
- Resultado perceptible esperado: saber qué entregar hoy, qué volvió con feedback y cómo va contra sus metas
- Friccion que debe reducir: abrir Mi Delivery, Mi Desempeño y Mis Permisos por separado
- No-goals UX: reemplazar esas vistas de detalle; mostrar montos

### Surface & system decision

- Surface: `/my`
- Nav placement: `none` — no agrega destinos (la ruta ya existe)
- Composition Shell: `aplica` — header = saludo; primary = Mi desempeño, Tu foco hoy, Mis tareas; aside = Novedades, Mis asignaciones, Mi ficha
- Primitive decision: `reuse` — `TeamPerformancePanel`, `ThroughputChart`, `FocusTodayCard`, primitives de `TASK-1969`; `new` — `MyTasksList`, `MyAssignmentsCard`, `MyProfileStatsCard`
- Adaptive density / The Seam: `aplica` — KPIs de 4 a 2 columnas; una columna bajo 760 px
- Floating/Sidecar/Dialog decision: none
- Copy source: `src/lib/copy/home.ts` + `GH_MY_NAV`
- Access impact: `none` — vista `mi_ficha.mi_inicio` existente

### State inventory

- Default: mes en curso, tareas del día
- Loading: skeleton por bloque
- Empty: sin tareas hoy → «No tienes entregas para hoy» con enlace a Mi Delivery
- Error: `fallback` del bloque
- Degraded / partial: métricas suprimidas como «Sin datos confiables» con `asOf`; próxima liquidación «por confirmar» si no hay orden de pago
- Permission denied: `member_identity_not_linked` con CTA a People Ops y sin «Reintentar»
- Long content: nombres de pieza con elipsis
- Mobile / compact: una columna
- Keyboard / focus: tareas como enlaces; orden de tabulación natural
- Reduced motion: el del motion compartido

### Interaction contract

- Primary interaction: abrir una tarea o la lista completa
- Hover / focus / active: filas con fondo suave; foco visible
- Pending / disabled: skeleton
- Escape / click-away: N/A
- Focus restore: N/A
- Latency feedback: skeleton por bloque
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS` (el motion del saludo vive en `TASK-1969`)
- Enter / exit: none propio
- Layout morph: none
- Stagger: none
- Timing / easing token: tokens de `MOTION.md`
- Reduced-motion fallback: gráfico sin animación de entrada
- Non-goal motion: contadores animados

### Implementation mapping

- Route / surface: `/my` (variante Homes por rol, audiencia `collaborator`)
- Primitive / variant / kind: ver Surface & system decision
- Component candidates: `TeamPerformancePanel` (scope persona), `ThroughputChart`, `FocusTodayCard`, `MyTasksList`, `MyAssignmentsCard`, `MyProfileStatsCard`
- Copy source: `src/lib/copy/home.ts`
- Data reader / command: snapshot de la Home (`TASK-1970`)
- API parity: la vista sólo lee; las acciones navegan a Mi Delivery, Mi Desempeño, Mis Permisos, Mi Nómina, Mis Objetivos y Mis Evaluaciones
- Access / capability: vista `mi_ficha.mi_inicio` + capabilities de los bloques
- States to implement: los del State inventory

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/home-collaborator-role.scenario.ts`
- Route: `/my`
- Viewports: 1440 × 900 y 390 × 844
- Quality profile: `premium`
- Required steps: fold → Mis tareas → aside; caso sin `memberId`
- Required captures: `my-fold`, `my-tasks`, `my-aside`, `my-identity-not-linked`
- Required `data-capture` markers: `my-performance`, `my-focus-today`, `my-tasks`, `my-assignments`, `my-profile-stats`
- Assertions: sin costos ni montos visibles; sin scroll horizontal; CTA de People Ops sin «Reintentar» en el caso sin identidad
- Scroll-width checks: sí, ambos viewports
- Reduced-motion / focus evidence: captura reduced motion y recorrido con Tab
- Review dossier: `pnpm fe:capture:review home-collaborator-role`
- Baseline decision / surface ID: nueva baseline `home-collaborator-role`

### Design decision log

- Decision: Home personal centrada en entregas del día, desempeño y ficha
- Alternatives considered: mantener `MyDashboardView`; mover al colaborador a `/home`
- Why this pattern: el operador aprobó el artboard y decidió mantener `/my`
- Reuse / extend / new primitive: reuse del panel de performance con scope persona; new para tareas, asignaciones y ficha
- Open risks: reader de tareas por persona aún por crear en `TASK-1970`

### Visual verification

- GVC scenario: `home-collaborator-role`
- Viewports: 1440 × 900, 390 × 844
- Required captures: las del GVC scenario plan
- Required `data-capture` markers: los del GVC scenario plan
- Scroll-width check: sí
- Accessibility/focus checks: tareas, anillo, gráfico y estado sin identidad
- Before/after evidence: `MyDashboardView` actual vs nueva
- Known visual debt: ninguna declarada
- Visual scorecard: `docs/ui/reviews/TASK-1972-collaborator-home-ui.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Layout en `/my` y variante

- Composition Shell con el saludo de `TASK-1969` detrás de la clave de variante en `home_rollout_flags` para `collaborator`; `MyDashboardView` queda como fallback.

### Slice 2 — Mi desempeño

- `TeamPerformancePanel` con scope persona y la frase de brecha contra la meta.

### Slice 3 — Tu foco hoy y Mis tareas

- Anillo de avance del día, chips y acciones; lista de tareas por fecha con badges.

### Slice 4 — Columna derecha

- Novedades, Mis asignaciones (sin costos) y Mi ficha (2 × 2).

### Slice 5 — Estados, GVC y docs

- Estado sin identidad, GVC desktop y móvil, scorecard y manual de uso.

## Out of Scope

- Readers y datos (`TASK-1970`); chrome y saludo (`TASK-1969`).
- Cambiar la política de inicio (decisión del operador: sigue en `/my`).
- Mostrar montos de nómina o costos.

## Detailed Spec

- La frase de brecha («Te falta subir 2 puntos de FTR para la meta») se arma desde el DTO del bloque (valor, meta y dirección); la vista no calcula metas.
- «Próxima liquidación» muestra la fecha `scheduled_for` de la orden de pago si existe; si no, «por confirmar». Nunca deriva una fecha de pago del calendario.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1969` y `TASK-1970` cerradas → Slice 1 → Slices 2, 3 y 4 → Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Mostrar costos o montos al colaborador | payroll / finance | low | DTO sin esos campos + assertion GVC | escenario rojo |
| Colaborador sin `memberId` ve error crudo | identity | medium | `throwIfNotOk` + CTA sin Reintentar | `identity.workforce.unlinked_internal_user` |
| Colaboradores pierden la vista actual sin aviso | UI | medium | Activación usuario → rol → global | feedback |

### Feature flags / cutover

- Clave de variante en `greenhouse_serving.home_rollout_flags` para `collaborator`; `MyDashboardView` queda como fallback. Revert: apagar la fila (≤ 30 s).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | apagar la flag | < 1 min | sí |
| Slices 2–4 | apagar la flag o revert PR | < 15 min | sí |
| Slice 5 | N/A | — | sí |

### Production verification sequence

1. Staging con la flag sólo para el usuario agente colaborador: GVC desktop y móvil, incluido el caso sin identidad.
2. Activar para un grupo de colaboradores y revisar con el operador.
3. Producción: usuario agente → grupo → todos los colaboradores.

### Out-of-band coordination required

- Aviso a colaboradores cuando la vista cambie para todos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact: layout`.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-1972`.
- [ ] El wireframe declarado existe; flow y motion compartidos de `TASK-1969` existen.
- [ ] `/my` muestra Mi desempeño, Tu foco hoy, Mis tareas, Novedades, Mis asignaciones y Mi ficha desde el snapshot.
- [ ] Ningún costo, tarifa ni monto de nómina es visible.
- [ ] El caso `member_identity_not_linked` muestra el CTA de People Ops sin «Reintentar».
- [ ] El copy visible reusable vive en `src/lib/copy/*`.
- [ ] Los estados loading/empty/error/degraded/permission/mobile quedan cubiertos.
- [ ] GVC desktop + mobile fue capturado y mirado.
- [ ] Se midio que no existe scroll horizontal de pagina en desktop ni mobile 390px.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm local:check:ui`
- `pnpm fe:capture home-collaborator-role --env=staging`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1967` marca la hija H como cerrada

## Follow-ups

- Retirar `MyDashboardView` cuando la variante quede global.
