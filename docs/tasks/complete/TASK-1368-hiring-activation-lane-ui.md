# TASK-1368 — Hiring Activation Lane UI (People/HRIS)

## Delta 2026-07-13 — Staging post-push aprobado; lifecycle completo

- Commit remoto verificado: `f09fd7039 feat(hr): connect hiring activation master flow` desplegado en Vercel `staging` como `Ready` (`dpl_KG4KgUWcLcyc9AdmKBc8SbwJLqVD`; alias `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app` / `https://dev-greenhouse.efeoncepro.com`).
- Flags de staging verificados ON: `HIRING_HANDOFF_BRIDGES_ENABLED=true` y `HIRING_ACTIVATION_ENABLED=true`.
- Smoke API autenticado con sesión real y bypass de protección obtenido por el canal canónico de Vercel API, sin imprimir secretos: `GET /api/hr/hiring-activation?limit=5` respondió `HTTP 200` con `{ "enabled": true, "items": [] }`. La cola está vacía en staging, por lo que la evidencia de detalle/bridge/resolver con caso real sigue cubierta por fixture sintético local/staging-env ya limpiado.
- GVC staging post-push PASS: `pnpm fe:capture --route='/hr/onboarding?lane=hiring-activation' --env=staging --hold=3000 --ready='[data-capture="activation-lane"]' --task=TASK-1368` → `.captures/2026-07-13T12-08-35_inline-hr-onboarding-lane-hiring-activation`; `fe:capture:review` = `Apto para implementar`, 0 findings.
- Con la evidencia local + staging, TASK-1368 queda cerrada end-to-end como UI del nodo N11 del master flow EPIC-011.

## Delta 2026-07-13 — Master flow cableado N10→N11 + resolver blocker real

- Se corrigió el enfoque de navegación: TASK-1368 no queda como lane aislada; Application 360 ahora cablea el master flow EPIC-011 desde decisión `selected` + destino `internal_hire` hacia N11.
- En `/agency/hiring/applications/[applicationId]`, la pestaña **Decisión** lee `getHiringHandoffByApplicationId`, muestra el estado real del `HiringHandoff`, permite aprobar handoff pendiente con `POST /api/hiring/handoffs/[handoffId]/approve` cuando el actor tiene `hiring.handoff.approve`, y abre `/hr/onboarding?lane=hiring-activation&applicationId=...&handoffId=...` cuando corresponde.
- La Activation Lane soporta deep link por `handoffId`/`applicationId`, selecciona el caso correcto en la cola de 770 y muestra un estado honesto de "todavía no está en la cola" si N10 no materializó/aprobó el handoff; desde el detalle vuelve a Application 360 con `Ver postulación 360`.
- `Resolver blocker` ya no es placeholder: consume `POST /api/hr/hiring-activation/[id]/resolve-blocker` de TASK-1400 con `blockers[]` accionables, payload `reason`, estados `resolved|still_blocked|stale`, error stale con refresh del detail y surface alternativa para blockers manuales.
- Evidencia local nueva: `pnpm typecheck`, `pnpm lint`, Vitest focal hiring-activation 3 files/30 tests, `pnpm build`, `task:lint`/`ui:*` checks PASS; GVC `hiring-activation-lane` PASS en `.captures/2026-07-13T11-35-04_hiring-activation-lane`; Application 360 bridge PASS en `.captures/2026-07-13T11-38-59_inline-agency-hiring-applications-happ-ab583c21-13a5-4f21-af41-814528ee4452`; deep link N11 PASS en `.captures/2026-07-13T11-39-22_inline-hr-onboarding-lane-hiring-activation-applicationid-happ-ab583c21-13a5-4f21-af41-814528ee4452-handoffid-hhof-949edeaf-b1f1-46c0-a016-e76c9b40baf6`.
- Se usó fixture sintético local/staging-env para validar el seam y se limpió completo (`remaining=[0,0,0,0,0,0]`). El smoke staging post-push posterior cerró el gate de lifecycle.

## Delta 2026-07-13 — Microinteracciones del HTML fuente portadas con fidelidad alta

- Se auditó el HTML recién extraído en `/Users/jreye/Documents/carreers/Hiring-activation/Ejecutar tarea 1368/Hiring Activation Lane.dc.html` y se identificó su vocabulario real de motion: `ha-fade`, `ha-rise`, `ha-slide-right`, `ha-pop`, `ha-toast` y `ha-skel`.
- El runtime conserva el chrome global Greenhouse/Vuexy por instrucción del operador, pero porta el comportamiento visual del canvas Hiring Activation: entrada del hero/metrics/cola, stagger de filas, slide-in del detalle, skeleton pulse, dialog pop/backdrop fade, toast desde abajo y feedback inline en acciones pending.
- La implementación usa tokens Greenhouse (`motionCss`), `opacity`/`transform`, `data-motion` estable y `prefers-reduced-motion` explícito; no copia `support.js` ni valores crudos del HTML.
- Evidencia GVC nueva: `pnpm fe:capture hiring-activation-lane --env=local --task=TASK-1368` PASS con 28 frames en `.captures/2026-07-13T09-53-44_hiring-activation-lane`; incluye hover/keyboard/reduced-motion del tab "Contrataciones listas" y click/keyboard/reduced-motion del refresh de cola. Dossier `fe:capture:review` = `Apto para implementar`, 0 findings, enterprise rubric pass.
- Límite honesto: el ambiente local sigue flag-off, por lo que la captura valida shell/canvas/microfeedback no mutante; el smoke staging con flags/data reales debe validar selección de caso, acciones reales, detail sidecar con data y errores/rollback antes de mover la task a `complete`.

## Delta 2026-07-13 — Implementación Codex code-complete local, rollout pendiente

- Se implementó la lane en `/hr/onboarding?lane=hiring-activation` como consumer del bridge de TASK-770: hero propio, navegación Lifecycle sin `MuiTabs` scroll/translate en mobile, KPIs, cola/detalle con `CompositionShell`, journey/readiness, dialogs de acciones reales (`review`, `create-member`, `open-onboarding`, `complete`, `cancel`) y estado flag-off honesto.
- Se corrigió el shell visible de `HrOnboardingView` para no heredar la UI plana/fea del onboarding anterior: breadcrumbs canónicos, header gradient tokenizado, navegación segmented/wrapping, `LaneCard` con hover/reduced-motion y targets mobile estables.
- `Resolver blocker` queda deliberadamente no-simulado: la UI abre un dialog honesto con remediación/links y referencia a `TASK-1400`, que cubre el command/API con payloads ricos.
- People 360 ahora puede leer `getHiringJourneyForPerson` desde el contexto HR y mostrar el journey derivado dentro de `Lifecycle laboral`, sin card paralela.
- Se corrigió un bug global detectado por GVC: `ScrollToTop` desmonta el botón mientras está oculto para no dejar un target interactivo de 0px en el DOM.
- Evidencia local: `pnpm fe:capture hiring-activation-lane --env=local --task=TASK-1368` PASS desktop/mobile en `.captures/2026-07-13T09-21-19_hiring-activation-lane`; polish de fidelidad/microinteracciones PASS en `.captures/2026-07-13T09-53-44_hiring-activation-lane`; dossier `fe:capture:review` = `Apto para implementar`, 0 findings, enterprise rubric pass.
- Estado honesto: **code complete local; task permanece `in-progress`** hasta smoke en staging con flags/data reales o decisión explícita de cerrar la UI con evidencia local flag-off.

## Delta 2026-07-13 — Ejecución Codex: route y fuente UI reconciliadas antes de código

- TASK tomada en `develop` por instrucción del operador, sin subagentes; push remoto autorizado solo al cierre final.
- Drift verificado: `/hr/workforce/activation` ya es Workforce Activation canónico (`equipo.workforce_activation`) y no debe pisarse. La fuente UI de TASK-1368 corresponde visualmente a `HR > Onboarding & Offboarding`; el target de implementación se normaliza a `/hr/onboarding?lane=hiring-activation` bajo `equipo.onboarding`, con deep links a Workforce Activation solo cuando exista `memberId`/ficha pendiente.
- Fuente visual revisada en `/Users/jreye/Documents/carreers/Hiring-activation/Ejecutar tarea 1368.zip`; `support.js` es runtime genérico de Design Component y no se porta. El comportamiento de dominio se toma del script embebido del HTML y se reimplementa sobre APIs reales de TASK-770.
- El botón/flujo real de `resolver blocker` queda split a `TASK-1400`; TASK-1368 no debe simular esa resolución en cliente hasta que exista el command backend.
- Plan formal: `docs/tasks/plans/TASK-1368-plan.md`; pendiente checkpoint humano P1 antes de escribir UI funcional.

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
- **Extiende surface existente**, no greenfield: `HrOnboardingView` / `/hr/onboarding?lane=hiring-activation`. Alineada al **mockup aprobado de TASK-763** (`docs/mockups/onboarding-module-mockup.html`): first-fold dominante, lanes reales, list-detail, motion mínima, copy operacional honesta. `/hr/workforce/activation` queda intacta como Workforce Activation canónico.
- **Cliente delgado de 770:** cero lógica de activación en la UI; readiness/activación reusan los primitives workforce vía los readers/commands de 770.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Status real: `Complete; master flow N10→N11 + resolver real cableados; staging deploy Ready + API/GVC smoke post-push PASS`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

La cara People Ops del cierre del pipeline de Hiring: una lane **"Contrataciones listas"** en `HR > Onboarding & Offboarding` (extiende `HrOnboardingView`; target `/hr/onboarding?lane=hiring-activation`) que muestra la cola de handoffs `internal_hire` aprobados, el journey, el readiness checklist y las acciones de activación — **todo cliente delgado de los readers/commands de TASK-770** (crear colaborador, abrir onboarding, activar). Nada de lógica de activación en la UI. `/hr/workforce/activation` se conserva como workbench canónico de Workforce Activation.

## Why This Task Exists

TASK-770 deja el bridge de activación gobernado (readers + commands), pero un/a People Ops necesita **operarlo desde una superficie**: ver qué contrataciones están listas, revisar readiness, resolver blockers y activar. Sin esta task, el cierre del pipeline queda sin cara visible y el hire no puede convertirse en colaborador desde el portal (solo por API/Nexa). Es el nodo final del funnel de EPIC-011.

## Goal

- Renderizar la cola de activación (`listHiringActivationQueue`, 770) en list-detail + KPIs `LaneCard`.
- Mostrar el journey (selección → handoff → member/onboarding → activo) y el readiness checklist honesto (✓/⚠/✗).
- Exponer las acciones de 770 (crear colaborador, abrir onboarding, activar) y el resolver de TASK-1400 con **Activar gated por readiness** (disabled-con-motivo, no botón mudo).
- Cablear Application 360 → handoff approval → Activation Lane según el master flow EPIC-011; no abrir N11 fuera de N10 salvo entrada directa a la cola.
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
- `docs/tasks/complete/TASK-770-hiring-to-hris-collaborator-activation.md`

## Dependencies & Impact

### Depends on

- `TASK-770` — readers (`listHiringActivationQueue`, `getHiringActivationDetail`, `getHiringJourneyForPerson`) + commands (`POST /api/hr/hiring-activation/[id]/*`) + `resolveWorkforceActivationReadiness` reuse.
- `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx` + lane `Contrataciones listas` (surface a extender).
- `CompositionShell` (`src/components/greenhouse/primitives/composition-shell/`).
- `src/lib/person-legal-profile/` (reveal PII).

### Blocks / Impacts

- Cierra el funnel visible de EPIC-011 (nodo N11).
- Impacta `HrOnboardingView`, `(dashboard)/hr/onboarding`, People 360; no reemplaza `(dashboard)/hr/workforce/activation`.

### Files owned

- `src/app/(dashboard)/hr/onboarding/page.tsx` (query lane selector + deep links)
- `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx` (handoff prefetch + capability)
- `src/views/greenhouse/hiring/Application360View.tsx` (bridge card N10→N11)
- `src/views/greenhouse/hr-onboarding/**` (solo la lane "Contrataciones listas")
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringActivation.ts`
- `src/lib/person-360/**` solo para la card derivada del journey (consumiendo reader de 770)

## Current Repo State

### Already exists

- `src/views/greenhouse/hr-onboarding/HrOnboardingView.tsx` (lanes + `LaneCard` + list-detail) + ruta `(dashboard)/hr/onboarding`; `(dashboard)/hr/workforce/activation` existe pero pertenece a Workforce Activation.
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

- Surface: lane "Contrataciones listas" en `HR > Onboarding & Offboarding` / `/hr/onboarding?lane=hiring-activation`
- Composition Shell: `aplica` — regiones cola/detalle bajo el shell existente
- Primitive decision: `reuse` — `LaneCard`, list-detail existente, dialogs, `CompositionShell`
- Adaptive density / The Seam: `aplica` — cards de cola adaptables a su ancho
- Floating/Sidecar/Dialog decision: detalle dentro de la lane; resolver-blocker + activar = dialog; Application 360 bridge como card inline
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

- Primary interaction: Application 360 selected/internal_hire → aprobar handoff si aplica → abrir Activation Lane → revisar cola/detalle → crear colaborador → abrir onboarding → resolver blockers → activar
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

- Route / surface: `src/app/(dashboard)/hr/onboarding/page.tsx` + `src/views/greenhouse/hr-onboarding/**`
- Primitive / variant / kind: `CompositionShell` + `LaneCard` + list-detail + dialogs (reuse)
- Component candidates: `HrOnboardingView` extendido; detalle nuevo
- Copy source: `getMicrocopy(locale).hiringActivation`
- Data reader / command: readers + `POST /api/hr/hiring-activation/[id]/*` (TASK-770), `POST /api/hr/hiring-activation/[id]/resolve-blocker` (TASK-1400), `POST /api/hiring/handoffs/[id]/approve` (TASK-356)
- API parity: consume commands gobernados de 770 (Nexa opera lo mismo por parity)
- Access / capability: reusa `workforce.member.*` + `hiring.activation.review` (770); PII reveal `person.legal_profile.reveal_sensitive`
- States to implement: los del State inventory

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/hiring-activation-lane.scenario.ts` (nuevo)
- Route: `/hr/onboarding?lane=hiring-activation`
- Viewports: 1440 + 390
- Required steps: cola → detalle → readiness (con blocker) → resolver → activar (confirmación)
- Required captures: lane (loaded/empty/blocked), detalle (journey + readiness + Activar disabled-con-motivo), resolver-blocker, people-360 journey, Application 360 handoff bridge
- Required `data-capture` markers: `data-capture="activation-lane"`, `"activation-detail"`, `"hiring-application-handoff-bridge"`
- Assertions: `scrollWidth==clientWidth`, consola limpia, a11y (tabs/dialogs/Activar no-mudo), foco
- Scroll-width checks: desktop 1440 + 390px
- Reduced-motion / focus evidence: capturar reduced-motion + foco de dialog

### Design decision log

- Decision: extender la surface HR existente con una lane, no crear módulo nuevo
- Alternatives considered: página dedicada nueva (rechazada — duplica surface + rompe el mockup 763)
- Why this pattern: alineación al mockup aprobado + reuse máximo + cliente delgado de 770
- Reuse / extend / new primitive: reuse (`LaneCard`, list-detail, dialogs, CompositionShell)
- Open risks: validar en staging post-push que los flags de 770/356 siguen ON en el deployment nuevo y que el seam Desk→Lane responde con sesión real; el contrato de readers/commands ya está disponible.

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
- Consumen `POST /api/hr/hiring-activation/[id]/*` (770) y `POST /api/hr/hiring-activation/[id]/resolve-blocker` (1400); errores canónicos es-CL; rollback honesto.

### Slice 4 — Master flow seam + People 360 + GVC

- Application 360 bridge N10→N11: handoff real, approve command y deep link a Activation Lane por `applicationId`/`handoffId`.
- Card derivada de journey de contratación en People 360 (`getHiringJourneyForPerson`), sin card paralela.
- Loop GVC desktop+mobile hasta enterprise; scenario nuevo.

## Out of Scope

- El bridge/service de activación, creación de member, readiness, onboarding, API, eventos → **TASK-770**.
- Reacción/handoff backend (356), desk base (355), careers (354), assessment (1360-1363).
- Payroll/compensation.

## Detailed Spec

Ver wireframe + flow declarados. La UI refleja la state-machine de 770 (`pending_hr_review → member_created → onboarding_open → ready_to_activate → active`; `blocked`/`cancelled`); **Activar** solo en `ready_to_activate`. Cero lógica de activación en la UI.

## Rollout Plan & Risk Matrix

Additive UI change, sin migración ni flag propio (hereda `HIRING_ACTIVATION_ENABLED` y `HIRING_HANDOFF_BRIDGES_ENABLED`). Consume contratos de 356/770/1400. Rollback = revert PR. Riesgo vivo: staging/prod pueden tener flags OFF en el deployment nuevo o no tener data de handoff para smoke real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Lane "Contrataciones listas" en `HR > Onboarding & Offboarding`/`/hr/onboarding?lane=hiring-activation` (deep link, bilingüe, extiende la view existente, `CompositionShell`).
- [x] Application 360 cablea selected/internal_hire → handoff bridge → approve → Activation Lane según EPIC-011.
- [x] Cola (`listHiringActivationQueue`) list-detail + KPIs `LaneCard`; empty/error/flag-off honestos.
- [x] Detalle: journey + readiness ✓/⚠/✗ (reusa resolvers de 770); anti silent-catch.
- [x] Acciones vía commands de 770; **Activar** solo con readiness OK (disabled-con-motivo, no botón mudo); confirmación accesible.
- [x] Resolver-blocker dialog accesible y honesto; command real de `TASK-1400` cableado.
- [x] People 360 muestra journey derivado sin card paralela.
- [x] Copy desde `hiringActivation` dictionary; tokens AXIS; PII masked/reveal (sin revelar PII desde esta lane).
- [x] GVC desktop+mobile mirado; `scrollWidth==clientWidth` (1440+390); consola limpia; motion no decorativa/reduced-motion por CSS.
- [x] `UI ready: yes` conservado con `pnpm task:lint --task TASK-1368` sin findings.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm exec vitest run src/lib/workforce/hiring-activation/service.test.ts src/lib/workforce/hiring-activation/boundary.test.ts 'src/app/api/hr/hiring-activation/[id]/[action]/route.test.ts'`
- `pnpm task:lint --task TASK-1368`
- `pnpm ui:wireframe-check --task TASK-1368` · `pnpm ui:flow-check --task TASK-1368` · `pnpm ui:motion-check --task TASK-1368` · `pnpm ui:readiness-check --task TASK-1368`
- `pnpm build`
- `pnpm fe:capture hiring-activation-lane --env=local --task=TASK-1368` + inline captures de Application 360 bridge y deep link Activation Lane; frames mirados.
- `pnpm staging:request '/api/hr/hiring-activation?limit=5' --pretty` contra staging con flags ON y sesión real → `HTTP 200`, `enabled:true`, cola vacía.
- `pnpm fe:capture --route='/hr/onboarding?lane=hiring-activation' --env=staging --hold=3000 --ready='[data-capture="activation-lane"]' --task=TASK-1368` → `.captures/2026-07-13T12-08-35_inline-hr-onboarding-lane-hiring-activation`, review dossier `Apto para implementar`, 0 findings.

## Closing Protocol

- [x] `Lifecycle`/carpeta sincronizados tras staging smoke post-push; `README.md`; `Handoff.md`; `changelog.md`
- [x] `## Delta` al master flow EPIC-011 (N11) si cambia un nodo/regla
- [x] doc funcional + manual HR (lane de activación) actualizados si cambia comportamiento visible
- [x] skills Codex/Claude del dominio talent/people sincronizadas con TASK-1368 + TASK-1400
- [x] Smoke staging post-push con flags ON y sesión real antes de mover a `complete/`

## Follow-ups

- Staff Augmentation activation lane (destino `staff_augmentation`), si se cierra simétrico.
- Métricas time-to-active en la lane (consumiendo analytics de 770).
