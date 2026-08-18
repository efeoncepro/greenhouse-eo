# TASK-1737 — Application 360: tab Expediente (consumer UI del Evaluation Dossier)

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
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1737-application-360-expediente-tab.md`
- Flow: `docs/ui/flows/TASK-1737-application-360-expediente-tab-flow.md`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-011`
- Status real: `Code complete, rollout gated`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Superficie del **Expediente de Evaluación** (TASK-1735) en la Application 360: el tab sintético
`activity` se convierte en el tab **Expediente** — timeline de notas tipadas persistidas (kind
badges, autor, source human/agent con provenance) intercaladas con los eventos de etapa, composer
de nota manual, y el flujo agéntico completo (Generar análisis → revisar borrador con evidencia
citada → editar → confirmar/rechazar). Incluye el **gate anti-anclaje BLOQUEANTE** del Delta (3)
de TASK-1735: el evaluador con scorecard propio abierto no ve el análisis con scores, y esa
ceguera la garantiza el reader (server), no la UI.

## Why This Task Exists

TASK-1735 dejó el backend completo (notas append-only + dossier propose/confirm + API + capability)
y declaró explícito que el consumer UI es follow-up sin dueño: hoy el flujo solo opera por API
(`staging:request`/agente en sesión). El operador no puede leer el expediente en la ficha, ni
registrar notas, ni disparar/confirmar el análisis sin salir del portal — el criterio de
evaluación sigue viviendo en chats. Además, el Delta (3) de 1735 dejó un gate BLOQUEANTE
pendiente de resolver en la superficie: un entrevistador con `hiring.application.read` puede
leer el dossier con scores ANTES de rendir su propio scorecard, debilitando el invariante
anti-anclaje de TASK-1360.

## Goal

- Tab Expediente operativo en la Application 360: timeline de notas + eventos de etapa, composer
  tipado, y flujo propose → editar → confirmar/rechazar del dossier, con estados honestos
  (flag OFF, CV no listo, propuesta stale, error canónico).
- Gate anti-anclaje resuelto server-side: el evaluador con scorecard propio abierto no recibe en
  el payload el análisis IA ni notas score-bearing ajenas; la UI muestra el estado bloqueado
  honesto con salida a su scorecard.
- Copy es-CL/en-US tokenizado en namespace nuevo `hiringDesk.application.expediente.*`; cero
  strings inline.
- GVC premium desktop 1440 + mobile 390 con evidencia de la ceguera (assertion sobre el DOM).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Expediente de Evaluación)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La UI es cliente delgado de los primitives de TASK-1735 (`src/lib/hiring/application-notes.ts`,
  `src/lib/hiring/dossier-ai/`); cero lógica de negocio en el componente.
- Internal-only por contrato: nada del expediente llega a superficie candidate-facing, email ni al
  review packet MCP de TASK-1718 (esta task no toca esos boundaries; sus tests siguen verdes).
- Anti-anclaje server-enforced: el filtro viewer-aware vive en `listHiringApplicationNotes` +
  `GET /dossier` con el MISMO predicado de `listResponses`/`listPeerScorecardResults`
  (`src/lib/hiring/assessment/instances.ts:485-560`); prohibido implementarlo como filtro
  client-side.
- Append-only visible: la UI no ofrece editar/borrar notas; corrección = nota nueva.
- Copy vía `getMicrocopy(locale).hiringDesk` (TASK-265); errores vía contrato canónico
  (`code` + `actionable` deciden el CTA Reintentar).
- Hook de diseño UI obligatorio (`greenhouse-ai-design-studio` + skills product-design) antes de
  JSX nuevo; `UI ready` sube a `yes` solo con dirección visual persistida.

## Normative Docs

- `docs/tasks/complete/TASK-1735-hiring-application-evaluation-dossier.md` (§Superficie UI del
  consumer + Delta (3) gate anti-anclaje + Open Questions)
- `docs/documentation/hr/expediente-de-evaluacion.md` (funcional)
- `docs/manual-de-uso/hr/operar-expediente-de-evaluacion.md` (operación por API vigente)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N5)
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1735 (complete): tabla `greenhouse_hiring.hiring_application_note` + ledger
  `hiring_application_dossier_proposal`, commands `recordHiringApplicationNote` /
  `proposeEvaluationDossier` / `confirmEvaluationDossier`, reader `listHiringApplicationNotes`,
  rutas `GET/POST /api/hiring/applications/[id]/{notes,dossier}`, capability
  `hiring.application.annotate`.
- Predicado anti-anclaje existente: `src/lib/hiring/assessment/instances.ts` (métodos
  `listResponses` / `listPeerScorecardResults`, TASK-1383).
- Vista anfitriona: `src/views/greenhouse/hiring/Application360View.tsx` (tabs + patrón
  `CandidateDocumentsPanel` de TASK-1715).
- Copy infra: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` + `src/lib/copy/types.ts`.

### Blocks / Impacts

- Resuelve la Open Question de TASK-1735 sobre `interview_note` cross-evaluador pre-submit
  (ocultamiento conservador hasta cerrar el scorecard propio) — dejar Delta en 1735 al cerrar.
- TASK-1721 (selection journey) podrá enlazar el expediente como insumo del debrief (solo lectura;
  sin archivos compartidos).
- TASK-1732/1733 (People 360): la historia person-scoped ENLAZA a expedientes por application;
  esta task no crea proyección person-scoped.
- No toca TASK-1718 (packet MCP) ni TASK-1734 (runs) — fronteras ya declaradas en 1735.

### Files owned

- `docs/ui/wireframes/TASK-1737-application-360-expediente-tab.md`
- `docs/ui/flows/TASK-1737-application-360-expediente-tab-flow.md`
- `src/views/greenhouse/hiring/ApplicationDossierPanel.tsx` (nuevo)
- `src/views/greenhouse/hiring/Application360View.tsx` (delta: tab rename + wiring)
- `src/app/(dashboard)/agency/hiring/applications/[applicationId]/page.tsx` (delta: notas
  server-fed + props de capability)
- `src/lib/hiring/application-notes.ts` (delta: parámetro `viewerUserId` + filtro anti-anclaje)
- `src/app/api/hiring/applications/[id]/notes/route.ts` + `.../dossier/route.ts` (delta:
  viewer-aware en GET)
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` + `src/lib/copy/types.ts` (delta:
  namespace `application.expediente.*`)
- `scripts/frontend/scenarios/task1737-application-expediente.scenario.ts` (nuevo)
- `docs/ui/visual-directions/TASK-1737-application-expediente-direction.md` (nuevo — dirección versionada)
- `docs/ui/reviews/TASK-1737-application-360-expediente-tab.scorecard.json` (nuevo — scorecard visual)

## Current Repo State

### Already exists

- Backend completo de TASK-1735 (ver Depends on) con flag `HIRING_EVALUATION_DOSSIER_AI_ENABLED`
  default OFF registrado en el ledger; propose idempotente por digest; confirm terminal-once que
  materializa nota `source='agent'` con provenance en `context_json`.
- Tab `activity` sintético en `Application360View.tsx:1253-1268` (timeline derivado, sin
  persistencia) — el punto de anclaje declarado por 1735.
- Patrón de panel route-local extraído: `CandidateDocumentsPanel` (TASK-1715).
- Predicado anti-anclaje de scorecards en `instances.ts` (independent-before-debrief).
- Copy dictionaries `hiringDesk` es-CL + en-US con namespace `application.*`.

### Gap

- Ninguna superficie consume `listHiringApplicationNotes` ni `/dossier`; el tab `activity` no
  muestra notas persistidas; no existe el gate anti-anclaje sobre el expediente (el GET de notas
  entrega el contenido completo a cualquier viewer con `hiring.application.read`); no existe
  copy `expediente.*`; no hay dirección visual del design studio para esta superficie.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/** + src/app/(dashboard)/agency/hiring/** (runtime portal Vercel)`
- Future candidate home: `portal`
- Boundary: `consume recordHiringApplicationNote/listHiringApplicationNotes/proposeEvaluationDossier/confirmEvaluationDossier via las rutas notes y dossier de /api/hiring/applications/:id; consumers autorizados: Application 360 y los mismos contratos para Nexa/MCP`
- Server/browser split: `notas y filtro anti-anclaje se resuelven server-side (page + reader 'server-only'); el client component solo renderiza DTOs y llama rutas API`
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: reclutador / hiring manager / People Ops interno (`hiring.application.read`);
  anotar/proponer/confirmar exige `hiring.application.annotate` (tier gobernanza).
- Momento del flujo: post-assessment corregido o pre-entrevista/decisión, dentro de la
  Application 360.
- Resultado perceptible esperado: el análisis CV↔assessment confirmado y las notas del proceso
  viven en la ficha; la entrevista/decisión los hereda sin re-armar nada a mano.
- Friccion que debe reducir: el criterio de evaluación se pierde en chats efímeros; el flujo
  dossier solo opera por API.
- No-goals UX: editar/borrar notas; superficie candidate-facing; scoring; trigger automático del
  propose; proyección person-scoped.

### Surface & system decision

- Surface: `/agency/hiring/applications/[applicationId]` tab `expediente` (rename de `activity`,
  alias `?tab=activity` preservado).
- Nav placement: `none` — no agrega destino de navegación nuevo (tab interno de una vista
  existente ya alcanzable).
- Composition Shell: `no aplica` — la vista anfitriona ya define su frame y tabs (TASK-355); el
  tab compone regiones dentro del canvas existente.
- Primitive decision: `reuse` — `Paper variant='outlined'`, `GreenhouseChip kind='status'`,
  `GreenhouseButton`, `CustomTextField`, `Dialog`, `Alert`, `Snackbar`, `Skeleton`; panel
  route-local `ApplicationDossierPanel` (patrón TASK-1715), sin primitives nuevas.
- Adaptive density / The Seam: `no aplica` — timeline de lectura larga, no card adaptable en grid.
- Floating/Sidecar/Dialog decision: dialog solo para el rechazo del borrador (decisión terminal
  puntual); el borrador se revisa inline (lectura larga, no drawer).
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` → namespace nuevo
  `application.expediente.*` (declarado en el wireframe con ledger completo).
- Access impact: `none` — reusa viewCode `gestion.hiring_application_detail` + capabilities
  existentes de TASK-1735; no crea views/routeGroups/capabilities nuevas.

### State inventory

- Default: timeline + composer (+ panel si hay propuesta `proposed`).
- Loading: skeleton con forma de 3 cards de nota (Suspense del tab).
- Empty: `expediente.empty` + composer visible (o `emptyReadOnly` sin capability).
- Error: Alert canónico con Reintentar solo si `actionable=true`; nunca "sin notas" si el reader
  falló.
- Degraded / partial: `ai-off` (flag OFF: caption, CTA propose ausente) · `cv-not-ready` (409
  canónico con Alert info) · `stale-proposal` (banner, propose nuevo disponible).
- Permission denied: sin `annotate` → composer/CTAs no se dibujan; 403 en vuelo → Alert
  `actionable=false` sin Reintentar. Estado `blind-locked` (anti-anclaje) con contador y salida.
- Long content: notas colapsadas con "Ver más" accesible.
- Mobile / compact: 390px — header apilado, composer con Select, cards full-width, sin scroll
  horizontal.
- Keyboard / focus: dialog con trap y restore; colapsos fuera del tab order; detalles en el flow.
- Reduced motion: transiciones de Dialog/Collapse desactivadas bajo `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: Generar análisis → revisar/editar borrador → Confirmar y agregar (write
  gobernado); Agregar nota (write directo).
- Hover / focus / active: estados de foco visibles en CTAs y triggers de colapso (anillo de foco
  explícito, patrón TASK-1715).
- Pending / disabled: CTAs con `aria-busy` durante propose/confirm/reject; Agregar nota disabled
  con cuerpo vacío o >8000.
- Escape / click-away: dialog de rechazo cierra con Esc salvo request en vuelo.
- Focus restore: al cerrar dialog/edición, el foco vuelve al disparador.
- Latency feedback: propose muestra CTA busy + skeleton del panel; sin optimistic UI en writes
  gobernados (DDL-6 del flow).
- Toast / alert behavior: Snackbar para nota agregada/confirmado/rechazado; Alerts inline para
  estados del carril LLM.

### Motion & microinteractions

- Motion primitive: `CSS` (transiciones por defecto de Dialog/Collapse de MUI).
- Enter / exit: default del Dialog; sin entrance animada del borrador IA (prohibido en el
  fidelity mapping).
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: defaults del tema.
- Reduced-motion fallback: guard existente del frame desactiva las transiciones.
- Non-goal motion: celebraciones, animación del contenido IA, timeline animado.

### Implementation mapping

- Route / surface: `/agency/hiring/applications/[applicationId]` tab `expediente` — page + view +
  `ApplicationDossierPanel` route-local.
- Primitive / variant / kind: reuse total (ver Surface & system decision).
- Component candidates: `ApplicationDossierPanel` (client) + render markdown sanitizado (helper
  existente del repo si lo hay; confirmar en Discovery).
- Copy source: `getMicrocopy(locale).hiringDesk.application.expediente`.
- Data reader / command: notas server-fed vía `listHiringApplicationNotes(applicationId,
  viewerUserId)` (extensión de esta task); `GET/POST /api/hiring/applications/[id]/dossier`;
  `POST .../notes`.
- API parity: UI cliente delgado; el gate anti-anclaje vive en el reader compartido por
  cualquier consumer.
- Access / capability: `hiring.application.read` (page) + `hiring.application.annotate`
  (server-resolved prop).
- States to implement: los 15 del State inventory + `proposal-active`/`editing`/`deciding`.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1737-application-expediente.scenario.ts`
- Route: `/agency/hiring/applications/[applicationId]?tab=expediente` con seed determinista
  (notas humanas + nota agent + propuesta `proposed` + sesión de evaluador bloqueado).
- Viewports: 1440×900 + 390×844.
- Quality profile: `premium`
- Required steps: tab → panel → edición → cancelar → dialog rechazo → Esc → composer → sesión
  blind-locked → mobile.
- Required captures: `expediente-full`, `proposal-panel`, `proposal-edit`, `reject-dialog`,
  `composer`, `blind-lock`, `mobile-expediente`.
- Required `data-capture` markers: `hiring-expediente-tab`, `hiring-expediente-proposal`,
  `hiring-expediente-composer`, `hiring-expediente-timeline`, `hiring-expediente-blind-lock`.
- Assertions: DOM de la sesión bloqueada sin notas score-bearing ajenas ni bloque proposal;
  `?tab=activity` renderiza el Expediente; sin errores de consola.
- Scroll-width checks: tab base, edición y dialog abierto en 1440 y 390.
- Reduced-motion / focus evidence: captura `prefers-reduced-motion: reduce` + ciclo
  dialog→Esc→foco.
- Review dossier: `pnpm fe:capture:review task1737-application-expediente`.
- Baseline decision / surface ID: baseline nuevo para el tab Expediente; el resto de la vista
  conserva el suyo.

### Design decision log

- Decision: convertir `activity` en el Expediente real (timeline persistido + eventos sintéticos
  como contexto); bloqueo anti-anclaje fino y server-enforced.
- Alternatives considered: tab nuevo adicional; drawer de notas; bloqueo total del tab; filtro
  anti-anclaje client-side — descartadas con razones en el wireframe/flow (DDL-1..DDL-6).
- Why this pattern: vocabulario ya aprobado (decisionHistory + patrón "Sugerencia de IA" del
  drawer de corrección); el operador no aprende nada nuevo.
- Reuse / extend / new primitive: reuse total; panel route-local.
- Open risks: resolución de display name del autor; sanitización del markdown (texto no
  confiable); alias `?tab=activity` cubierto con test.

### Visual verification

- GVC scenario: `task1737-application-expediente`
- Viewports: 1440×900 + 390×844
- Required captures: las 7 del GVC scenario plan
- Required `data-capture` markers: los 5 declarados
- Scroll-width check: `scrollWidth == clientWidth` en ambos viewports (tab, edición, dialog)
- Accessibility/focus checks: focus trap + restore del dialog; `aria-expanded` en colapsos;
  anuncios `aria-live` de propose/confirm
- Before/after evidence: captura del tab `activity` actual vs tab Expediente
- Known visual debt: **ninguna bloqueante.** La dirección visual quedó versionada
  (`docs/ui/visual-directions/TASK-1737-application-expediente-direction.md`, 3 direcciones
  comparadas → "documento de decisión"). Deuda declarada y aceptada: `visualImpact` 4,0 queda
  bajo el sub-piso premium 4,5 por razón **estructural** (tab de lectura larga dentro de una
  vista anfitriona que ya define frame, tabs y momento visual dominante; el fidelity mapping
  prohíbe dramatizar el contenido IA). Pendiente de staging: capturas `proposal-panel`,
  `proposal-edit`, `reject-dialog` y `blind-lock` (requieren flag dossier ON + propuesta real +
  persona evaluadora con scorecard abierto).
- Visual scorecard: `docs/ui/reviews/TASK-1737-application-360-expediente-tab.scorecard.json`
  (promedio 4,54 · piso 4,0 · fidelidad 4,6 · resistencia a template 4,5 · verdict `pass`)
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4` — cumplido.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_hiring.hiring_application_note` (solo lectura; el filtro
  viewer-aware NO cambia lo persistido)
- Consumidores afectados: `UI Application 360; los mismos GET de notes/dossier para cualquier
  consumer (Nexa/MCP futuros heredan el filtro)`
- Runtime target: `local → staging → production (portal Vercel)`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/application-notes.ts` +
  `src/app/api/hiring/applications/[id]/{notes,dossier}/route.ts` + predicado de
  `src/lib/hiring/assessment/instances.ts:485-560` (un solo predicado, no dos implementaciones)
- Contrato nuevo o modificado: `listHiringApplicationNotes(applicationId, viewerUserId?)` filtra
  score-bearing ajeno + `source='agent'` bajo el predicado; `GET /dossier` responde
  `proposal: null` + `viewerBlindUntilScorecardSubmitted: true` + `hiddenNoteCount` bajo el mismo
  predicado; sin `viewerUserId` (llamadas server-internas) no filtra (espejo de `listResponses`)
- Backward compatibility: `compatible` (parámetro opcional; payload agrega campos, no quita para
  viewers no bloqueados)
- Full API parity: `el filtro vive en el reader canónico; UI, Nexa y MCP reciben el mismo
  contrato — la ceguera no es de la pantalla`

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migración; lectura de
  `greenhouse_hiring.hiring_application_note` + `hiring_assessment` (predicado)
- Invariantes que no se pueden romper:
  - Un viewer con scorecard propio abierto NUNCA recibe notas `kind ∈ {cv_analysis,
    assessment_review, interview_note}` de otros autores ni notas `source='agent'` ni el bloque
    `proposal` del dossier.
  - Las notas propias del viewer y las `general` ajenas SIEMPRE pasan.
  - El predicado es idéntico al de `listResponses` (un solo lugar; extraer helper compartido).
  - Append-only intacto: cero UPDATE/DELETE; el POST de notas sigue forzando `source='human'`.
- Tenant/space boundary: `requireInternalTenantContext` + capability existentes (sin cambios)
- Idempotency/concurrency: solo lecturas; los writes reusan los commands de TASK-1735 sin cambios
- Audit/outbox/history: sin eventos nuevos; los existentes de TASK-1735 no cambian

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `filtro activo desde el deploy (protección por defecto, no feature); sin flag
  propio`
- Backfill plan: `none`
- Rollback path: `revert PR (el filtro es aditivo en código; los datos no cambian)`
- External coordination: `none — repo-only`

### Security and access

- Auth/access gate: capabilities existentes `hiring.application.read` / `hiring.application.annotate`
- Sensitive data posture: el filtro REDUCE exposición de datos de evaluación (PII de candidato);
  nada nuevo sale al cliente
- Error contract: `canonicalErrorResponse`/`toHiringErrorResponse` existentes; sin códigos nuevos
  salvo los ya definidos por TASK-1735
- Abuse/rate-limit posture: sin cambios (superficie interna capability-gated)

### Runtime evidence

- Local checks: vitest focal del filtro (viewer bloqueado / viewer sin scorecard / notas propias /
  `general` ajenas / server-internal sin viewerUserId) + tests existentes de notes/dossier verdes
- DB/runtime checks: `pnpm staging:request GET .../notes` con persona evaluadora de scorecard
  abierto vs persona reclutadora — payloads distintos verificados
- Integration checks: GVC assertion sobre el DOM de la sesión bloqueada
- Reliability signals/logs: sin signal nuevo (lectura interna; rationale: sin SLA propio)
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Hybrid Execution Justification

- Why not split: el único backend es un filtro viewer-aware sobre un reader existente (sin
  migración, sin capability nueva, sin command nuevo); una task `backend-data` separada agregaría
  ceremonia sin reducir riesgo, y el gate BLOQUEANTE de 1735 exige que la superficie y su
  protección shippeen juntas (una UI sin el filtro re-abre el anclaje).
- Primary execution profile: `ui-ux`
- Contract boundary: la UI consume solo rutas API; el filtro vive en
  `src/lib/hiring/application-notes.ts` + GET de dossier con el predicado compartido de
  `instances.ts`.
- Risk controls: slice de filtro PRIMERO (Slice 1) con tests focales antes de cualquier JSX;
  revert = revert PR; datos intactos (solo lectura).

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

### Slice 1 — Filtro anti-anclaje en el reader (server)

- Extraer helper compartido del predicado scorecard-abierto (reusado por `listResponses` y este
  filtro) en `src/lib/hiring/assessment/instances.ts` o módulo vecino.
- `listHiringApplicationNotes(applicationId, viewerUserId?)`: bajo el predicado, omitir notas
  score-bearing ajenas + `source='agent'`; retornar `hiddenNoteCount` utilizable por la ruta.
- `GET /notes` y `GET /dossier` pasan `tenant.userId` como viewer; `GET /dossier` agrega
  `viewerBlindUntilScorecardSubmitted` + `hiddenNoteCount` y anula `proposal` bajo el predicado.
- Tests focales de los 5 casos (bloqueado / libre / propias / general ajena / server-internal).

### Slice 2 — Copy + dirección visual

- Namespace `application.expediente.*` en `hiringDesk` es-CL + en-US + tipo (`greenhouse-ux-writing`).
- Sesión `greenhouse-ai-design-studio`: 2–3 direcciones comparadas sobre el wireframe, persistir
  asset en `docs/ui/visual-directions/`, completar Visual Direction Contract del wireframe y
  subir `UI ready` a `yes` (con `pnpm task:lint --task TASK-1737` limpio).

### Slice 3 — Tab Expediente: timeline + composer

- Rename `activity` → `expediente` en `TAB_KEYS` con alias de deep-link; page server-fed con
  notas + props de capability.
- `ApplicationDossierPanel`: timeline (notas + eventos sintéticos), chips de kind/source,
  provenance popover de notas agent, colapso accesible, composer tipado con contador, estados
  empty/error/permission/blind-locked.

### Slice 4 — Flujo dossier: propose → editar → confirmar/rechazar

- CTA Generar análisis flag-aware (`aiEnabled` del GET) con estados `cv-not-ready` /
  provider-error / stale; panel REGION 1 con secciones del draft y evidencia citada; modo
  edición precargado con `renderEvaluationDossierMarkdown`; dialog de rechazo; manejo 409
  idempotente/terminal-once.

### Slice 5 — GVC premium + cierre

- Scenario `task1737-application-expediente.yaml`; capturas desktop+390; assertions de ceguera
  sobre el DOM; scorecard visual ≥ threshold; smoke staging con las dos personas agente;
  docs (funcional + manual delta "operar desde la ficha") + Delta en TASK-1735 (Open Question
  resuelta) + registry/README/EPIC-011/Handoff/changelog.

## Out of Scope

- Editar/borrar notas; retención/redacción legal del expediente (Open Question de 1735 con
  `legal-privacy-ip-operator`).
- Cualquier superficie candidate-facing, email o notificación.
- Exponer notas en lanes `api/platform/*`/MCP (decisión futura con audit propio).
- Trigger reactivo del propose (follow-up declarado en 1735).
- Proyección person-scoped / People 360 (TASK-1732/1733).
- Cambios al motor de scoring o al run de TASK-1734/1738.
- Migraciones de schema o capabilities nuevas.

## Detailed Spec

El detalle vive en el wireframe y el flow (Files owned) — regiones, copy ledger completo,
máquina de estados, fronteras de datos, failure paths y decisiones. Este markdown no lo duplica.
Contratos backend consumidos: ver `docs/tasks/complete/TASK-1735-hiring-application-evaluation-dossier.md`
§Detailed Spec y el código real (`application-notes.ts`, `dossier-ai/`, rutas `notes`/`dossier`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (filtro server) → Slice 3/4 (UI). Prohibido mergear JSX del expediente sin el filtro
  del Slice 1 en el mismo estado de develop: una UI sin filtro re-abre el anclaje que el gate
  BLOQUEANTE de 1735 exige cerrar.
- Slice 2 (copy + dirección) puede correr en paralelo con Slice 1; Slice 3 requiere ambos.
- Slice 4 requiere Slice 3; Slice 5 cierra.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI muestra análisis con scores a evaluador pre-scorecard (anclaje) | hiring / UI | medium | filtro server-side Slice 1 + GVC assertion sobre DOM + test focal del predicado | no signal — gate de tests + GVC |
| Filtro rompe llamadas server-internas (confirm del dossier lee notas) | hiring | low | `viewerUserId` opcional; sin viewer no filtra (espejo `listResponses`) + test | test rojo |
| Rename del tab rompe deep-links `?tab=activity` | UI | low | alias en `TAB_KEYS` + test | GVC assertion |
| Markdown de nota renderiza contenido no confiable | UI / privacy | medium | sanitizado obligatorio + test con payload adversarial | test rojo |
| Doble confirm/reject por carrera entre operadores | hiring | low | terminal-once ya en backend (1735); UI re-fetch en 409 | 409 observable |
| Copy inline sin tokenizar | UI | low | lint `greenhouse/no-untokenized-copy` + ledger del wireframe | lint warning |

### Feature flags / cutover

- Sin flag propio — additive UI; el carril LLM sigue gateado por
  `HIRING_EVALUATION_DOSSIER_AI_ENABLED` (dueño TASK-1735, ledger vigente; esta task NO lo
  prende ni lo toca — la UI muestra el estado honesto `ai-off` cuando está OFF).
- El "flag" efectivo de escritura es la capability `hiring.application.annotate` (revocable vía
  entitlements governance sin deploy).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (filtro aditivo, sin datos mutados) | <10 min | si |
| Slice 2 | revert de copy/docs | <5 min | si |
| Slice 3 | revert PR (el tab vuelve a `activity` sintético) | <10 min | si |
| Slice 4 | revert PR (el flujo dossier vuelve a operar solo por API) | <10 min | si |
| Slice 5 | revert de docs/escenario | <5 min | si |

### Production verification sequence

1. Deploy a staging; `pnpm staging:request GET /api/hiring/applications/<id>/notes` con persona
   superadmin (todo visible) vs persona evaluadora con scorecard abierto sintético (payload
   filtrado + `hiddenNoteCount`).
2. GVC premium contra staging: capturas + assertion de DOM en sesión bloqueada.
3. Flujo completo en staging con flag dossier ON (staging ya lo permite): propose → editar →
   confirmar → la nota agent aparece en el timeline con provenance; rechazar una segunda
   propuesta → panel desaparece.
4. Promoción vía release control plane; smoke en producción con application de prueba (flag prod
   del dossier puede seguir OFF: la UI debe mostrar `ai-off` honesto y notas manuales operables).
5. Monitorear Sentry (domain hiring) 48h post-deploy.

### Out-of-band coordination required

N/A — repo-only change (sin secrets, sin flags nuevos, sin migraciones; el flip del flag dossier
en producción sigue siendo decisión del dueño TASK-1735/operador, no de esta task).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] **Gate anti-anclaje (BLOQUEANTE, binario):** con una persona evaluadora cuyo
  `interviewer_scorecard` propio de la application está en estado distinto de
  `submitted`/`scored`, el payload de `GET .../notes` NO contiene notas
  `cv_analysis`/`assessment_review`/`interview_note` de otros autores ni notas `source='agent'`,
  y `GET .../dossier` responde `proposal: null` con `viewerBlindUntilScorecardSubmitted: true`;
  tras enviar su scorecard, el mismo GET entrega el contenido completo. Verificado por test focal
  + smoke staging + assertion GVC sobre el DOM.
  **Estado:** test focal verde (5 casos: bloqueado / propias / `general` ajena / libre /
  server-internal) + predicado ÚNICO compartido con `listResponses`
  (`getOwnScorecardStateForApplication`) + `GET /dossier` devolviendo `proposal: null`.
  **Pendiente:** smoke staging con las dos personas agente (requiere seed).
- [x] El tab `expediente` reemplaza a `activity` (label "Expediente") y `?tab=activity` sigue
  resolviendo al mismo tab. **Verificado por el GVC:** el scenario entra por `?tab=activity` y
  asserta el tab `expediente` visible.
- [x] El timeline renderiza notas persistidas (kind badge + autor + fecha + source con provenance
  para `agent`) intercaladas con eventos sintéticos de etapa, más reciente primero.
- [x] El composer crea notas vía `POST .../notes` (contador 8000, tipos válidos) y la nota aparece
  al responder 200 (sin optimistic UI).
- [x] "Generar análisis" solo se dibuja con capability `annotate` y `aiEnabled=true`; flag OFF
  muestra `ai-off`; CV no listo muestra `cv-not-ready` (409 `hiring_dossier_cv_not_ready`); los
  errores de provider distinguen `actionable` para el CTA Reintentar.
- [x] El panel de propuesta muestra las 5 secciones del draft (incluida "No verificable con las
  fuentes"), permite editar antes de confirmar y confirma/rechaza terminal-once (409 de carrera
  manejado con re-fetch). **Pendiente de evidencia visual:** con datos reales solo en staging.
- [x] La nota confirmada aparece como `source='agent'` con provenance (modelo/prompt/digest/
  confirmador) legible en la UI.
- [x] Todo el copy visible sale de `hiringDesk.application.expediente.*` (es-CL + en-US); lint
  `no-untokenized-copy` sin findings nuevos. **Verificado:** 56 claves con parity exacta entre
  diccionarios; cero literales visibles en `ApplicationDossierPanel.tsx`.
- [x] `UI ready` sube a `yes` con dirección visual persistida + mapping/GVC/decision log
  completos; `pnpm task:lint --task TASK-1737` pasa sin findings.
- [x] GVC premium desktop 1440 + mobile 390 capturado y revisado; sin scroll horizontal de página
  en ninguno; scorecard 4,54 ≥ threshold 4,2 declarado.
- [x] Estados loading/empty/error/degraded/permission/mobile cubiertos según State inventory.
- [x] El ajuste del sistema para reducir movimiento se respeta en diálogos y colapsos (evidencia GVC).
- [x] El review packet de TASK-1718 sigue sin exponer notas (sus tests intactos, sin modificación).
  **Verificado:** los únicos consumers de `listHiringApplicationNotes`/`dossier-ai` son las dos
  rutas API internas, la page del 360, el panel y el store del run de scoring (TASK-1738).

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/lib/hiring src/views/greenhouse/hiring` (focal)
- `pnpm task:lint --task TASK-1737`
- `pnpm fe:capture task1737-application-expediente --env=staging` + review dossier
- `pnpm staging:request` (secuencia del Rollout Plan)
- `pnpm test` + `pnpm build` como gate final de cierre (TASK_CLOSING_QUALITY_GATE_V1; pedir
  autorización del operador antes del build completo)

## Delta 2026-08-16 — cierre (`code complete, rollout gated`)

Auditoría de cierre (lente talent + a11y + gate BLOQUEANTE), ejecutada sobre el código real:

- **Anti-anclaje server-enforced: CUMPLE.** El predicado vive en UN solo lugar
  (`getOwnScorecardStateForApplication`, `src/lib/hiring/assessment/instances.ts`) y lo consumen
  `listResponses`, `listPeerScorecardResults` y `isViewerBlindForApplicationEvaluation`. El
  reader `listHiringApplicationNotes(applicationId, viewerUserId?)` filtra en servidor; el
  `GET /dossier` corta el bloque `proposal` a `null` ANTES de leer la propuesta. Sin
  `viewerUserId` (llamadas server-internas) no filtra. 11 tests focales verdes.
- **Cero superficie candidate-facing nueva: CUMPLE.** Los únicos consumers de los primitives son
  las dos rutas API internas capability-gated, la page del 360, el panel y el store del run de
  scoring (TASK-1738). El review packet MCP de TASK-1718 no se tocó.
- **Copy tokenizado: CUMPLE.** 56 claves en `application.expediente.*` con parity exacta es-CL /
  en-US; cero literales visibles en el panel.
- **Evidencia GVC: CUMPLE con gap declarado.** `.captures/2026-08-16T23-49-12_task1737-application-expediente/`
  — perfil `premium`, `exitCode 0`, 0 quality findings, rubric enterprise `pass`, desktop 1440 +
  iPhone 13. **Gap honesto:** las capturas `proposal-panel`, `proposal-edit`, `reject-dialog` y
  `blind-lock` NO existen localmente porque requieren seed determinista en staging (flag dossier
  ON + propuesta real + persona evaluadora con scorecard abierto). Declaradas en el paso 2 de la
  Production verification sequence.
- **Degradación honesta: CUMPLE.** La page observa el fallo del reader con `captureWithDomain`
  y pasa `notesFailed` — `null` (reader falló) nunca se confunde con expediente vacío.
- **Drift corregido en este cierre:** el scenario GVC estaba declarado como `.yaml` cuando el DSL
  del repo es `.scenario.ts`; y el scorecard visual estaba declarado pero no existía. Ambos
  quedan materializados.

**Qué queda gated (no bloquea el cierre de código, sí el "operativamente completo"):**

1. `HIRING_EVALUATION_DOSSIER_AI_ENABLED` sigue **OFF** en producción (dueño: TASK-1735). Con el
   flag OFF la UI muestra el estado honesto `ai-off` y el carril de notas manuales opera normal.
2. Evidencia visual del panel de propuesta con datos reales — pendiente de staging.
3. Smoke `staging:request` con las dos personas agente (superadmin vs evaluadora bloqueada).

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Delta registrado en TASK-1735 (Open Question de `interview_note` resuelta por esta task)
- [x] EPIC-011 actualizado con el estado de esta task
- [x] Docs funcional/manual del expediente actualizados con la operación desde la ficha

## Follow-ups

- Anclas/deep-link por nota individual si la operación diaria lo pide.
- Métrica de delta de edición humana (propuesta vs nota confirmada) visible en la UI cuando
  TASK-1735 materialice su follow-up de calidad del borrador.
- Enlace desde People 360 (TASK-1733) a los expedientes por application.

## Open Questions

- Resolución del display name del autor de la nota (`author_user_id` → nombre): confirmar en
  Discovery qué reader de identidad ya consume la page; fallback honesto al id.
