# TASK-1368 — Hiring Activation Lane UI (People/HRIS)

## Delta 2026-07-12 — UI design ready for implementation

- La fuente visual de Hiring Activation fue revisada junto con su wireframe, flow y motion contract. El list-detail, estados, interaction contract, implementation mapping, GVC scenario plan y design decision log son ejecutables.
- TASK-770 está `complete` y sus readers/commands ya existen en `develop`; por tanto `Blocked by` pasa a `none` y `UI ready` a `yes` para iniciar la implementación UI.
- Este estado no sustituye la evidencia de runtime: GVC desktop/390px, focus, reduced motion, flags OFF y commands reales siguen siendo gates de cierre de esta task.

## Delta 2026-07-10 — TASK-770 completada: el backend del bridge YA existe

- **Desbloqueada por TASK-770** (implementada local-first en `develop`). Consumir, no reconstruir:
  - Cola merged: `listHiringActivationQueue()` / detail con readiness LIVE: `getHiringActivationDetail(handoffId)` (`src/lib/workforce/hiring-activation/readers.ts`) — `readyToActivate` viene derivado del resolver workforce; NUNCA persistirlo ni recomputarlo en UI.
  - Commands por API: `POST /api/hr/hiring-activation/[id]/(review|create-member|open-onboarding|complete|cancel)`. Capabilities: `hiring.activation.review` (cola/review/complete/cancel), `workforce.member.intake.update` (create-member), `hr.onboarding_instance` (open-onboarding).
  - Estados del request: `pending_hr_review|blocked|member_created|onboarding_open|active|cancelled` + `blockedReason` con código estable (`ambiguous_identity|member_conflict|member_already_active|onboarding_template_missing|handoff_not_approved|legal_data_missing`) — falta declarar el copy es-CL de estos códigos (extender `src/lib/copy/hiring.ts`).
  - Doble flag: `HIRING_ACTIVATION_ENABLED` (770) + `HIRING_HANDOFF_BRIDGES_ENABLED` (356) — la UI debe manejar `enabled:false` explícito.
  - El paso "completar ficha" NO es de esta UI: enlaza a Workforce Activation existente (`/hr/workforce/activation`); `complete` del bridge solo cierra con evidencia.


## Delta 2026-07-08

- **Split de TASK-770** (decisión operador 2026-07-08): 770 quedó backend-data (bridge de activación); esta task es su **consumer ui-ux** = la activation lane que People Ops opera. Patrón 354(UI)/1367(backend).
- **Extiende surface existente**, no greenfield: `HrOnboardingView` / `(dashboard)/hr/workforce/activation`. Alineada al **mockup aprobado de TASK-763** (`docs/mockups/onboarding-module-mockup.html`): first-fold dominante, lanes reales, list-detail, motion mínima, copy operacional honesta.
- **Cliente delgado de 770:** cero lógica de activación en la UI; readiness/activación reusan los primitives workforce vía los readers/commands de 770.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Backend impact: `none`
- Wireframe: `docs/ui/wireframes/TASK-1368-hiring-activation-lane.md`
- Flow: `docs/ui/flows/TASK-1368-hiring-activation-lane-flow.md`
- Motion: `docs/ui/motion/TASK-1368-hiring-activation-lane-motion.md`
- Epic: `EPIC-011`
- Status real: `UI design ready for implementation; backend contract TASK-770 available`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `task/TASK-1368-hiring-activation-lane-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La cara People Ops del cierre del pipeline de Hiring: una lane **"Contrataciones listas"** en `HR > Onboarding & Offboarding` (extiende `HrOnboardingView`/`hr/workforce/activation`) que muestra la cola de handoffs `internal_hire` aprobados, el journey, el readiness checklist y las acciones de activación — **todo cliente delgado de los readers/commands de TASK-770** (crear colaborador, abrir onboarding, activar). Nada de lógica de activación en la UI.

## Why This Task Exists

TASK-770 deja el bridge de activación gobernado (readers + commands), pero un/a People Ops necesita **operarlo desde una superficie**: ver qué contrataciones están listas, revisar readiness, resolver blockers y activar. Sin esta task, el cierre del pipeline queda sin cara visible y el hire no puede convertirse en colaborador desde el portal (solo por API/Nexa). Es el nodo final del funnel de EPIC-011.

## Goal

- Renderizar la cola de activación (`listHiringActivationQueue`, 770) en list-detail + KPIs `LaneCard`.
- Mostrar el journey (selección → handoff → member/onboarding → activo) y el readiness checklist honesto (✓/⚠/✗).
- Exponer las acciones de 770 (crear colaborador, abrir onboarding, resolver blocker, activar) con **Activar gated por readiness** (disabled-con-motivo, no botón mudo).
- Reflejar el estado derivado en People 360 sin card paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `docs/architecture/ui-platform/*`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/tasks/complete/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md` (mockup aprobado)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N11)

Reglas obligatorias:

- **Composition Shell base**; cards Adaptive (`density=auto`). NO shell hand-rolled.
- Copy visible desde `getMicrocopy(locale)` / `src/lib/copy/*`; bilingüe es-CL + en-US; NUNCA literal en JSX.
- Tokens `theme.palette.*`/`theme.axis.*`; sin HEX/px/`fontSize` inline.
- Cliente delgado: cero lógica de activación en la UI (reusa readers/commands de 770).
- **Activar** solo habilitado con readiness OK (disabled-con-motivo); nada se activa por side effect visual.
- PII masked/reveal con capability+reason+audit (reusa person-legal-profile); nunca `value_full` en cliente.
- Motion mínima (mockup 763); reduced-motion respetado.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/ui/wireframes/TASK-1368-hiring-activation-lane.md`
- `docs/ui/flows/TASK-1368-hiring-activation-lane-flow.md`
- `docs/tasks/to-do/TASK-770-hiring-to-hris-collaborator-activation.md`

## Dependencies & Impact

### Depends on

- `TASK-770` — readers (`listHiringActivationQueue`, `getHiringActivationDetail`, `getHiringJourneyForPerson`) + commands (`POST /api/hr/hiring-activation/[id]/*`) + `resolveWorkforceActivationReadiness` reuse.
- `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx` + `LaneCard` (surface a extender).
- `CompositionShell` (`src/components/greenhouse/primitives/composition-shell/`).
- `src/lib/person-legal-profile/` (reveal PII).

### Blocks / Impacts

- Cierra el funnel visible de EPIC-011 (nodo N11).
- Impacta `HrOnboardingView`, `(dashboard)/hr/workforce/activation`, People 360.

### Files owned

- `src/app/(dashboard)/hr/workforce/activation/**` (lane + detalle)
- `src/views/greenhouse/hr-onboarding/**` (solo la lane "Contrataciones listas")
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringActivation.ts`
- `src/lib/person-360/**` solo para la card derivada del journey (consumiendo reader de 770)

## Current Repo State

### Already exists

- `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx` (lanes + `LaneCard` + list-detail) + rutas `(dashboard)/hr/onboarding`, `(dashboard)/hr/workforce/activation`.
- Mockup aprobado TASK-763 (SoT visual).
- `CompositionShell`, `LaneCard`, `GreenhouseDatePicker`, dialogs canónicos.
- Los readers/commands de 770 (dependencia — deben existir antes de implementar).

### Gap

- No existe la lane "Contrataciones listas" ni su detalle.
- No existe el dictionary `hiringActivation`.
- No existe la card derivada de journey de contratación en People 360.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: HR / People Ops (interno)
- Momento del flujo: cierre del pipeline — un hire aprobado debe convertirse en colaborador
- Resultado perceptible esperado: ver qué contrataciones están listas, entender el readiness, activar con confianza (o saber exactamente qué falta)
- Friccion que debe reducir: "el hire está aprobado pero no sé cómo/si puedo activarlo, ni qué falta"
- No-goals UX: no reimplementar activación en la UI; no crear una surface HR nueva; no activar por side effect

### Surface & system decision

- Surface: lane "Contrataciones listas" en `HR > Onboarding & Offboarding` / `hr/workforce/activation`
- Composition Shell: `aplica` — regiones cola/detalle bajo el shell existente
- Primitive decision: `reuse` — `LaneCard`, list-detail existente, dialogs, `CompositionShell`
- Adaptive density / The Seam: `aplica` — cards de cola adaptables a su ancho
- Floating/Sidecar/Dialog decision: detalle como ruta hija `[id]` o sidecar; resolver-blocker + activar = dialog
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringActivation.ts`
- Access impact: `views` (viewCode `hr` existente / lane; seed si se agrega ruta alcanzable nueva, TASK-827/982)

### State inventory

- Default: cola loaded (list-detail)
- Loading: skeletons
- Empty: "Sin contrataciones pendientes de activar"
- Error: canónico es-CL
- Degraded / partial: journey/facet que falla → bloque degradado honesto (anti silent-catch)
- Permission denied: acciones ocultas/deshabilitadas sin capability
- Long content: cola paginada server-side
- Mobile / compact: list-detail colapsa; `scrollWidth==clientWidth` en 390px
- Keyboard / focus: tabs APG, foco al `<h1>` del detalle, dialogs con foco atrapado
- Reduced motion: motion mínima → estático

### Interaction contract

- Primary interaction: revisar cola → abrir detalle → crear colaborador → abrir onboarding → resolver blockers → activar
- Hover / focus / active: claros (mockup 763)
- Pending / disabled: **Activar disabled-con-motivo** hasta readiness OK; botones "Creando…/Activando…"
- Escape / click-away: cierra dialogs
- Focus restore: al cerrar dialog vuelve el foco al trigger
- Latency feedback: estado de carga en botones + confirmación
- Toast / alert behavior: éxito/errores canónicos; rollback honesto si el command falla

### Motion & microinteractions

- Motion primitive: `none` (motion mínima del mockup 763; hover/focus vía tokens)
- Enter / exit: cross-fade breve de tabs/detalle (CSS tokenizado)
- Reduced-motion fallback: corte directo
- Non-goal motion: sin loaders apilados ni motion decorativa

### Implementation mapping

- Route / surface: `src/app/(dashboard)/hr/workforce/activation/**`
- Primitive / variant / kind: `CompositionShell` + `LaneCard` + list-detail + dialogs (reuse)
- Component candidates: `HrOnboardingView` extendido; detalle nuevo
- Copy source: `getMicrocopy(locale).hiringActivation`
- Data reader / command: readers + `POST /api/hr/hiring-activation/[id]/*` (TASK-770)
- API parity: consume commands gobernados de 770 (Nexa opera lo mismo por parity)
- Access / capability: reusa `workforce.member.*` + `hiring.activation.review` (770); PII reveal `person.legal_profile.reveal_sensitive`
- States to implement: los del State inventory

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/hiring-activation-lane.scenario.ts` (nuevo)
- Route: `/hr/workforce/activation`
- Viewports: 1440 + 390
- Required steps: cola → detalle → readiness (con blocker) → resolver → activar (confirmación)
- Required captures: lane (loaded/empty/blocked), detalle (journey + readiness + Activar disabled-con-motivo), resolver-blocker, people-360 journey
- Required `data-capture` markers: `data-capture="activation-lane"`, `"activation-detail"`
- Assertions: `scrollWidth==clientWidth`, consola limpia, a11y (tabs/dialogs/Activar no-mudo), foco
- Scroll-width checks: desktop 1440 + 390px
- Reduced-motion / focus evidence: capturar reduced-motion + foco de dialog

### Design decision log

- Decision: extender la surface HR existente con una lane, no crear módulo nuevo
- Alternatives considered: página dedicada nueva (rechazada — duplica surface + rompe el mockup 763)
- Why this pattern: alineación al mockup aprobado + reuse máximo + cliente delgado de 770
- Reuse / extend / new primitive: reuse (`LaneCard`, list-detail, dialogs, CompositionShell)
- Open risks: validar en runtime los flags de 770/356 y los estados `enabled:false`; el contrato de readers/commands ya está disponible.

### Visual verification

- GVC desktop + mobile en loop hasta enterprise; frames mirados; `scrollWidth==clientWidth`; consola limpia; reduced-motion + foco verificados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dictionary + lane shell

- `hiringActivation` dictionary (es-CL + en-US).
- Tab/lane "Contrataciones listas" en `HrOnboardingView` (deep link) + KPIs `LaneCard` (`listHiringActivationQueue` agregados).

### Slice 2 — Cola list-detail + detalle (journey + readiness)

- Cola list-detail (patrón existente) consumiendo `listHiringActivationQueue`.
- Detalle: journey timeline + readiness checklist ✓/⚠/✗ (`resolveWorkforceActivationReadiness` + `assessPersonLegalReadiness` vía 770), anti silent-catch.

### Slice 3 — Acciones + dialogs (crear / onboarding / resolver / activar)

- Botones + dialogs (`react-hook-form`): crear colaborador, abrir onboarding, resolver blocker, **activar** (gated por readiness, disabled-con-motivo, confirmación `alertdialog`).
- Consumen `POST /api/hr/hiring-activation/[id]/*` (770); errores canónicos es-CL; rollback honesto.

### Slice 4 — People 360 card derivada + GVC

- Card derivada de journey de contratación en People 360 (`getHiringJourneyForPerson`), sin card paralela.
- Loop GVC desktop+mobile hasta enterprise; scenario nuevo.

## Out of Scope

- El bridge/service de activación, creación de member, readiness, onboarding, API, eventos → **TASK-770**.
- Reacción/handoff (356), desk (355), careers (354), assessment (1360-1363).
- Payroll/compensation.

## Detailed Spec

Ver wireframe + flow declarados. La UI refleja la state-machine de 770 (`pending_hr_review → member_created → onboarding_open → ready_to_activate → active`; `blocked`/`cancelled`); **Activar** solo en `ready_to_activate`. Cero lógica de activación en la UI.

## Rollout Plan & Risk Matrix

N/A — additive UI change, sin runtime backend nuevo (consume contratos de 770). Sin migración, sin flag propio (hereda el flag de 770 `HIRING_ACTIVATION_ENABLED`: la lane no muestra data hasta que 770 esté activo). Rollback = revert PR. Riesgo principal: implementar la UI antes de que 770 exponga los readers/commands → **Blocked by TASK-770** lo previene.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Lane "Contrataciones listas" en `HR > Onboarding & Offboarding`/`hr/workforce/activation` (deep link, bilingüe, extiende la view existente, `CompositionShell`).
- [ ] Cola (`listHiringActivationQueue`) list-detail + KPIs `LaneCard`; empty/error honestos.
- [ ] Detalle: journey + readiness ✓/⚠/✗ (reusa resolvers de 770); anti silent-catch.
- [ ] Acciones vía commands de 770; **Activar** solo con readiness OK (disabled-con-motivo, no botón mudo); confirmación accesible.
- [ ] Resolver-blocker drawer/dialog (forms-ux) accesible.
- [ ] People 360 muestra journey derivado sin card paralela.
- [ ] Copy desde `hiringActivation` dictionary; tokens AXIS; PII masked/reveal.
- [ ] GVC desktop+mobile mirado; `scrollWidth==clientWidth` (1440+390); consola limpia; reduced-motion + foco.
- [ ] `UI ready: yes` solo con lo anterior + `pnpm task:lint --task TASK-1368` sin findings.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` · `pnpm local:check:ui`
- `pnpm ui:wireframe-check --task TASK-1368` · `pnpm ui:flow-check --task TASK-1368`
- `pnpm fe:capture hiring-activation-lane --env=staging` (desktop+mobile) + frames mirados
- Gates Figma (token-mapping + primitive lookup)

## Closing Protocol

- [ ] `Lifecycle`/carpeta sincronizados; `README.md`; `Handoff.md`; `changelog.md`
- [ ] `## Delta` al master flow EPIC-011 (N11) si cambia un nodo/regla
- [ ] doc funcional + manual HR (lane de activación) actualizados si cambia comportamiento visible
- [ ] `## Delta` a TASK-770 si el consumo de readers/commands cambia supuestos

## Follow-ups

- Staff Augmentation activation lane (destino `staff_augmentation`), si se cierra simétrico.
- Métricas time-to-active en la lane (consumiendo analytics de 770).
