# TASK-1766 — Superficie del desenlace en el kanban de Hiring

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
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1766-hiring-pipeline-outcome-surface.md`
- Flow: `docs/ui/flows/TASK-1766-hiring-pipeline-outcome-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1766-hiring-pipeline-outcome-surface-motion.md`
- Backend impact: `none`
- Epic: `EPIC-011`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `TASK-1765`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El kanban de Hiring hace visible el segundo eje del modelo: **la tarjeta en «Cerrado» muestra su chip de
desenlace**, y **soltar una tarjeta en «Cerrado» abre un diálogo de decisión** en vez de escribir una etapa.
La causa es obligatoria cuando el desenlace es «Sin selección», cancelar no escribe nada, y la columna
«Evaluación» declara antes de soltar que ese movimiento asigna la prueba. Es la proyección a superficie del
vocabulario que fijó el ADR; el eje de datos y su `CHECK` son de `TASK-1765`.

## Why This Task Exists

La columna «Cerrado» absorbe hoy cinco estados terminales y **no dice cuál fue**. Un operador que mira el
tablero no distingue una selección de un descarte, ni un retiro de un silencio. El ADR lo declara regla dura:
*«NUNCA mostrar una tarjeta en «Cerrado» sin su chip de desenlace»* (§12), porque una columna terminal muda
recrea exactamente el colapso que el trabajo viene a cerrar.

Y el gesto que lleva ahí está mal modelado. Hoy soltar en «Cerrado» es un `PATCH {stage:'closed'}` idéntico a
mover de Sourced a Screening (`PipelineDeskView.tsx:243-256`), cuando **cerrar es decidir**: manda un correo
irreversible a una persona real y arranca el reloj de retención de sus documentos. Cuando `TASK-1765` instale
el `CHECK` `stage='closed' ⟺ desenlace declarado`, ese `PATCH` empezará a ser rechazado y el tablero mostrará
«No se pudo mover, se revirtió» sin explicar por qué. Esta task es lo que convierte ese rechazo en la pregunta
correcta.

Hay además una deuda vecina que se paga en el mismo gesto. La tarjeta **no usa la primitive canónica de chips**:
el tag «Test asignado/entregado» es un `<Box>` con `sx` inline y `fontSize: 12` literal
(`PipelineDeskView.tsx:408`), y **decide su tono comparando el string de copy**
(`testTag === copy.pipeline.tagDelivered`). En `en-US` esa comparación falla —el copy ya no es el mismo
string— y la etiqueta se pinta con el tono equivocado **en silencio**, sin romper el build. Si el chip de
desenlace nace bien y el tag de al lado se queda así, la misma tarjeta muestra dos etiquetas vecinas con
acabados distintos.

## Goal

- Toda tarjeta en «Cerrado» muestra su desenlace con `GreenhouseChip`, y la causa cuando el desenlace es
  «Sin selección».
- Soltar en «Cerrado» —por arrastre **y** por el menú `⋮`— abre el diálogo de desenlace y no escribe nada
  hasta que una persona confirma; la causa es obligatoria en «Sin selección» y cancelar no deja rastro.
- La columna «Evaluación» declara su efecto antes de soltar, porque esa etapa dispara la asignación de prueba.
- El tag de assessment deja de ser un `<Box>` con tono decidido por comparación de strings y pasa a la misma
  primitive, con el mismo mapa de tono declarado una sola vez.
- Las 6 etiquetas de desenlace y las 3 causas viven en `hiringDesk.ts` con mirror `en-US` real y un guard que
  impida que el inglés herede castellano.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md` — **normativo**
  (§7 vocabulario visible, §8 contrato de interacción del kanban, §12 reglas duras)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- **NUNCA** una tarjeta en «Cerrado» sin su chip de desenlace (ADR §12). Si el desenlace no se puede resolver,
  la tarjeta declara el vacío como anomalía visible, no lo esconde.
- **NUNCA** exponer el identificador interno del desenlace ni el de su causa a la persona candidata: la causa
  vive sólo en superficie interna y ningún prop candidate-facing la recibe (ADR §12).
- **NUNCA** etiquetar a la persona con el estado de la vacante: cupo lleno, búsqueda cerrada y proceso
  cancelado son **causas** de «Sin selección», nunca desenlaces (ADR §12).
- **NUNCA** nace un `HiringOutcomeChip`. El contrato de UI Platform es explícito: *«Nuevos kinds deben mapear
  un uso semántico hacia una variant existente antes de crear componentes locales como `FooStatusChip`»*
  (`docs/architecture/ui-platform/HISTORIAL.md:804`). Se reusa `GreenhouseChip`.
- **NUNCA** decidir el tono de un chip comparando el string de copy visible, ni con un ternario por pantalla.
  El tono sale de un `Record` único, como ya lo fija el docstring de `scoreTone`
  (`src/views/greenhouse/hiring/hiring-client.ts:44-47`): *«única fuente para chips/etiquetas… no duplicar
  umbrales por pantalla»*.
- **NUNCA** `fontSize` literal en texto ni HEX crudo: tipografía por variante/token, color por
  `theme.palette.*`.
- **NUNCA** copy visible literal en JSX: todo sale de `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`.
- **NUNCA** escribir el desenlace desde el componente: la UI es cliente del command canónico de decisión, igual
  que Nexa y MCP (Full API Parity). Esta task no crea contrato nuevo; consume el de `TASK-1765`.
- **SIEMPRE** declarar en el punto de decisión que soltar en «Evaluación» dispara la prueba (ADR §12).

## Normative Docs

- `docs/ui/wireframes/TASK-1754-hiring-stage-vocabulary.md` — **mapa del vocabulario**. Contiene el chip y el
  contrato de interacción del kanban porque sin ellos ese mapa no se entiende. **Se consume, no se
  contradice ni se duplica:** ese wireframe es el del vocabulario; el de esta task es el de la superficie.
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — 30 hallazgos verificados.
- `docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md` — enmendado por el ADR §9: el
  desenlace de una cohorte cerrada por capacidad es `not_selected`, no `rejected`.
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`, `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.

## Dependencies & Impact

### Depends on

- **`TASK-1765` (bloqueante).** Aporta el eje de desenlace: los 6 literales de `HIRING_DECISIONS`
  (`unresponsive` y `backup_selected` no existen hoy en la forma final), el enum gobernado de causa, el `CHECK`
  `stage='closed' ⟺ desenlace`, y la forma final del command de decisión. Sin eso, esta superficie no tiene
  qué pintar ni a qué endpoint hablarle.
- `POST /api/hiring/applications/[id]/decide` (`src/app/api/hiring/applications/[id]/decide/route.ts`) —
  command existente, gateado por la capability `hiring.application.decide`.
- `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:168-212`) — la tarjeta ya recibe
  `application: HiringApplication`, que **ya incluye `decision`** (`src/types/hiring.ts:260`). La causa la
  agrega `TASK-1765`.
- `GreenhouseChip` (`src/components/greenhouse/primitives/GreenhouseChip.tsx`) — 74 archivos del repo ya la
  consumen. `PipelineDeskView.tsx` **no está entre ellos**: ni siquiera la importa.

### Blocks / Impacts

- **`TASK-1763`** (cierre por capacidad en Application 360) — **consume** las etiquetas de desenlace y causa
  que esta task define; su propio doc ya lo declara así. No las duplica.
- **`TASK-1754`** — colapsa el enum de etapas y toca el mismo `PipelineDeskView.tsx` y el mismo diccionario.
  Ver el orden de merge más abajo: **1754 primero**.
- `TASK-1747` — trabaja `hiringDesk.ts` con sesión activa; cierra antes que todas.
- **`TASK-1768`** (chip de avance de entrevista en la misma tarjeta) — hereda el slot de chips que esta task
  normaliza y el mapa de tono en fuente única. Va después.
- `TASK-1767` — el embudo de equidad ramifica por desenlace **y causa**; consume el mismo vocabulario, no
  la superficie.
- `TASK-1721` / `TASK-1722` — el journey gobernado de selección lee el mismo vocabulario visible.
- Documentación funcional de Hiring y manual del Hiring Desk.

### Files owned

- `src/views/greenhouse/hiring/PipelineDeskView.tsx` — **sólo** la tarjeta (chip + tag de assessment), el
  handler de drop de la columna «Cerrado», el ítem «Cerrado» del menú `⋮` y el aviso de «Evaluación».
  **`LaneDefinition` y sus tres campos de etapa son de `TASK-1754`** (Slice E) — esta task no los toca.
- `src/views/greenhouse/hiring/PipelineOutcomeDialog.tsx` — nuevo, local a la vista.
- `src/views/greenhouse/hiring/hiring-client.ts` — **sólo** el mapa de tono de desenlace, junto a `scoreTone`.
- `src/views/greenhouse/hiring/pipeline-outcome-contract.test.ts` — nuevo. Fija el invariante de esta task
  (cobertura del mapa de tono + chip obligatorio en «Cerrado» + paridad de locale del bloque de desenlace).
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` — **sólo** las claves `outcome.labels.*`,
  `outcome.causes.*`, `pipeline.outcomeDialog.*` y `pipeline.assessmentLaneNotice`.
- `src/lib/copy/types.ts` — **sólo** el bloque `outcome` de `HiringDeskCopy` y `pipeline.outcomeDialog`.
- `src/app/(dashboard)/agency/hiring/pipeline/page.tsx` — **sólo** el paso de la capability de decisión a la
  vista y el switch de captura no productivo.
- `scripts/frontend/scenarios/hiring-pipeline-outcome-surface.scenario.ts` — nuevo.
- `docs/ui/wireframes/TASK-1766-*.md`, `docs/ui/flows/TASK-1766-*.md`, `docs/ui/motion/TASK-1766-*.md`,
  `docs/ui/reviews/TASK-1766-*.scorecard.json`.

**Explícitamente NO owned:** `src/types/hiring.ts` (`HIRING_DECISIONS`, enum de causa),
`src/lib/hiring/decide.ts`, `src/lib/hiring/store.ts` y la migración del `CHECK` son de `TASK-1765`;
`src/views/greenhouse/hiring/Application360View.tsx` es de `TASK-1747` y `TASK-1763`;
`src/views/greenhouse/hiring/pipeline-lane-contract.test.ts` lo **borra** `TASK-1754`.

**Coordinación de `hiringDesk.ts` — cinco escritores concurrentes.** El diccionario lo escriben a la vez
`TASK-1747` (claves de la card de assessment), `TASK-1754` (claves de `stages`), `TASK-1763` (claves de
capacity closure), `TASK-1768` (claves del avance de entrevista) y esta task (desenlace y causa). **Se
particiona por CLAVE, no por archivo.** Orden de merge declarado: **`TASK-1747` (in-progress, sesión activa)
→ `TASK-1754` → `TASK-1766` → `TASK-1763` → `TASK-1768`.** Esta task rebasa sobre las dos primeras y no
renombra ni borra claves ajenas.

**Colisión en `PipelineDeskView.tsx` — tres escritores.**

- `TASK-1754` lo declara en sus `Files owned` y en su Slice E borra `pipeline-lane-contract.test.ts` y reduce
  `LaneDefinition` a una etapa por carril. **Orden explícito: 1754 primero, 1766 después.** Al revés, esta
  task escribiría sobre una `LaneDefinition` que está por desaparecer.
- `TASK-1768` reclama la función `card` y su *slot de chips* para el chip de avance de entrevista, y declara
  que sólo necesita coordinar orden de merge. **Va después de 1766**: esta task es la que normaliza ese slot
  —migra el tag de assessment a `GreenhouseChip` y deja el mapa de tono en una fuente única—, así que 1768
  aterriza su chip sobre un slot ya canónico en vez de sumar un tercer acabado a la misma tarjeta.

## Current Repo State

### Already exists

- El kanban completo con seis columnas, arrastre, menú `⋮` por teclado, rollback optimista, live region y
  toast: `src/views/greenhouse/hiring/PipelineDeskView.tsx` (745 líneas).
- El command de decisión, idempotente y auditado: `src/lib/hiring/decide.ts` + su ruta, con capability
  `hiring.application.decide` concedida a `efeonce_admin`, `hr_manager` y `efeonce_operations`
  (`src/lib/entitlements/runtime.ts:590-604`).
- `GreenhouseChip` con `kind='status'`, `variant='label'`, `size='small'`, tonal AA vía
  `theme.greenhouseSemantic`, focus ring, `prefers-reduced-motion` y `data-capture` propios.
- El precedente de mapa único de tono: `scoreTone` (`hiring-client.ts:44-53`), con su doctrina en el docstring.
- El precedente más fuerte —tono resuelto server-side en la projection— en
  `src/lib/contractor-engagements/hr-workbench-projection.ts:109-160` (`statusTone` viaja en el VM).
- GVC del tablero ya existente: `scripts/frontend/scenarios/task355-hiring-pipeline-board.scenario.ts`, con
  el precedente del switch de captura no productivo (`?captureFailure=stage`, gateado por `NODE_ENV`).

### Gap

- La columna «Cerrado» no distingue los cinco estados terminales que agrupa: no hay chip, ni causa, ni nada.
- Soltar en «Cerrado» es un cambio de etapa como cualquier otro (`PipelineDeskView.tsx:243-256`). No pregunta
  nada, no advierte del correo, y no puede recoger la causa.
- **El menú `⋮` tiene el mismo agujero.** `LANES.filter((lane) => lane.destination)` incluye «Cerrado», y su
  `onClick` llama `persistStage(menu.application, 'closed')` (`:714-725`). Interceptar sólo el arrastre deja
  al operador que navega por teclado escribiendo `closed` directo — y, después de `TASK-1765`, recibiendo un
  error canónico en vez de la pregunta.
- La tarjeta no usa `GreenhouseChip`. El tag de assessment es un `<Box>` con `sx` inline, `fontSize: 12`
  literal, y **el tono decidido por `testTag === copy.pipeline.tagDelivered`** (`:262` y `:408`): en `en-US`
  la comparación falla y pinta el tono equivocado sin romper el build.
- `stages` está tipado como `Record<string, string>` (`src/lib/copy/types.ts:546`), así que **el tipo no
  obliga a nada**. Sumado a que `en-US` hace `...esCL` en el nivel raíz y otra vez en `pipeline`
  (`dictionaries/en-US/hiringDesk.ts:6` y `:47`), una clave nueva definida sólo en castellano **compila y se
  renderiza en castellano dentro del diccionario en inglés**. Es el mismo defecto que el wireframe de
  `TASK-1754` ya señala para `stages`, y hay que no repetirlo con el vocabulario de desenlace.
- La vista no sabe si quien mira tiene `hiring.application.decide`: la page sólo verifica `*.read`
  (`src/app/(dashboard)/agency/hiring/pipeline/page.tsx:28-33`).

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/PipelineDeskView.tsx`, `PipelineOutcomeDialog.tsx` nuevo, `hiring-client.ts` y `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`
- Future candidate home: `portal`
- Boundary: consume el snapshot `HiringDeskSnapshot` y el command de decisión de `TASK-1765` a través de `hiringRequest`; no importa stores, no arma SQL y no reimplementa autorización
- Server/browser split: la page server resuelve sesión, capability y snapshot; la vista y el diálogo son Client Components que reciben DTOs browser-safe; el mapa de tono es un módulo sin `server-only`
- Build impact: none — sin dependencia nueva, sin entrada de filesystem, sin entrypoint global
- Extraction blocker: none — la superficie ya es un consumidor delgado del command canónico

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de Talento/People con `hiring.application.decide` (`efeonce_admin`, `hr_manager`,
  `efeonce_operations`). Los demás roles internos ven el tablero y el chip, pero no pueden cerrar.
- Momento del flujo: el proceso de una persona terminó y hay que declarar **cómo** terminó; o el tablero se
  lee para saber qué pasó con quienes ya salieron.
- Resultado perceptible esperado: la columna «Cerrado» se vuelve legible de un vistazo, y cerrar deja de ser
  un gesto silencioso para volverse una decisión declarada.
- Fricción que debe reducir: hoy hay que abrir cada postulación para saber si fue selección o descarte; y el
  operador manda un correo irreversible sin que nada se lo diga.
- No-goals UX: no se rediseña el tablero, ni la tarjeta, ni la navegación; no se agrega filtro por desenlace;
  no se celebra una contratación con motion; no se agrega un destino nuevo al sidebar.

### Surface & system decision

- Surface: `/agency/hiring/pipeline` — columna «Cerrado», tarjeta de postulación y diálogo de desenlace.
- Nav placement: `none` — la superficie ya es alcanzable desde `Agencia → Hiring → Pipeline`; no nace destino.
- Composition Shell: `no aplica` — la vista ya compone con `HiringDeskFrame`, que es su shell vigente.
- Primitive decision: `reuse` — `GreenhouseChip` con `kind='status'`, `variant='label'`, `size='small'`. **No
  nace un `HiringOutcomeChip`**: el contrato lo prohíbe explícitamente
  (`docs/architecture/ui-platform/HISTORIAL.md:804`). El diálogo es composición de `Dialog` + `RadioGroup` +
  `GreenhouseButton`, no una primitive nueva.
- Adaptive density / The Seam: `no aplica` — la tarjeta del kanban tiene ancho fijo de columna (264 px) y no
  cambia de densidad por ancho disponible.
- Floating/Sidecar/Dialog decision: **Dialog modal**, no sidecar. Es una decisión bloqueante e irreversible
  sobre una persona: el foco debe quedar atrapado y no debe poder descartarse por click fuera.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`
- Access impact: `entitlements` — la capability `hiring.application.decide` decide si el destino «Cerrado»
  acepta el gesto. La ruta y sus `views` no cambian.

### State inventory

- Default: tarjetas en «Cerrado» con su chip; en «Sin selección», la causa en texto secundario bajo el chip.
- Loading: el diálogo abre con las opciones ya presentes (son un enum, no una lectura remota). No hay skeleton.
- Empty: columna «Cerrado» sin tarjetas — se conserva el empty state existente («Suelta una postulación aquí»).
- Error: el command falla; el diálogo permanece abierto con el error canónico es-CL, sin reintento ofrecido
  cuando `actionable=false`, y la tarjeta **no se movió** porque nunca se movió antes de escribir.
- Degraded / partial: la postulación está en `closed` y el desenlace no se puede resolver (fila anterior al
  `CHECK`). La tarjeta muestra un chip neutro «Sin desenlace registrado» y la fila queda observable: **no se
  esconde**, porque el vacío es justamente lo que el ADR viene a hacer imposible.
- Permission denied: sin `hiring.application.decide`, la columna «Cerrado» no acepta el drop, el ítem
  «Cerrado» del menú `⋮` no aparece, y el mensaje explica quién puede hacerlo. Sin botón «Reintentar».
- Long content: nombres largos ya se recortan a dos líneas; la causa se recorta a una con `title` completo.
  Las etiquetas de desenlace son cortas por diseño (sustantivo simple).
- Mobile / compact: a 390 px el tablero conserva su scroll horizontal contenido; el diálogo pasa a
  `fullWidth` con las seis opciones en una columna y las acciones apiladas al pie.
- Keyboard / focus: el diálogo atrapa el foco; `Escape` cancela **antes** de enviar; al cerrar, el foco vuelve
  al elemento que lo abrió (la tarjeta o el ítem del menú `⋮`).
- Reduced motion: sin animación de entrada del diálogo, sin pulso de la columna, sin animación de llegada de
  la tarjeta; mismo estado final y mismo anuncio en la live region.

### Interaction contract

- Primary interaction: soltar la tarjeta en «Cerrado» abre el diálogo. **La tarjeta no se mueve todavía**: se
  queda en su columna hasta que el command confirma. Es la diferencia con las otras cinco columnas, donde el
  movimiento optimista es correcto porque el cambio es reversible.
- Hover / focus / active: sin cambio respecto del comportamiento actual de la tarjeta.
- Pending / disabled: durante el envío, ambos botones quedan deshabilitados y el CTA reserva su ancho para no
  desplazar acciones; la clave de idempotencia se genera **al abrir** el diálogo, así que un doble envío no
  produce dos decisiones.
- Escape / click-away: `Escape` cancela mientras no se haya enviado. **Click fuera no cierra** (`disableEscapeKeyDown`
  queda en `false`, `onClose` ignora `backdropClick`): el gesto manda un correo irreversible.
- Focus restore: al confirmar o cancelar, el foco vuelve al origen. Tras confirmar, la live region anuncia
  `«{nombre}: {desenlace}»`.
- Latency feedback: el CTA muestra estado de envío; la tarjeta permanece con su aspecto normal hasta que llega
  la confirmación, y recién entonces se mueve a «Cerrado».
- Toast / alert behavior: se reusa el `Snackbar` existente. El mensaje de éxito nombra el desenlace, no dice
  «Etapa actualizada» — porque no fue una etapa.

### Motion & microinteractions

- Motion primitive: `CSS` — se reusan los keyframes ya existentes de la vista (`ghHiringCardIn`,
  `ghHiringMoved`, `ghHiringDropPulse`) y la transición canónica del `Dialog`.
- Enter / exit: el diálogo entra con la transición canónica del `Dialog`; el chip entra con la tarjeta, sin
  acento propio.
- Layout morph: **ninguno**. El bloque de causa aparece sin morph de altura que desplace el CTA bajo el
  cursor; se revela y el foco se mueve al primer radio.
- Stagger: ninguno dentro del diálogo.
- Timing / easing token: los ya presentes en la vista y en el tema; no se introducen milisegundos literales
  nuevos.
- Reduced-motion fallback: `prefers-reduced-motion: reduce` llega al mismo estado final, mismo foco y mismo
  anuncio.
- Non-goal motion: sin confeti ni celebración en `selected`, sin pulso ni color de alarma en `not_selected`,
  sin auto-dismiss del diálogo, sin animación de «drop» en «Cerrado» antes de que exista la escritura.

### Implementation mapping

- Route / surface: `/agency/hiring/pipeline` — `src/app/(dashboard)/agency/hiring/pipeline/page.tsx` →
  `src/views/greenhouse/hiring/PipelineDeskView.tsx`.
- Primitive / variant / kind: `GreenhouseChip` `kind='status'` `variant='label'` `size='small'`, con
  `dataCapture='hiring-outcome-chip'` y `dataCapture='hiring-assessment-tag'`.
- Component candidates: `PipelineOutcomeDialog.tsx` (nuevo, local); `Dialog`, `DialogTitle`, `DialogContent`,
  `DialogActions`, `RadioGroup`, `FormControlLabel`, `FormHelperText`, `TextField` de MUI;
  `GreenhouseButton` para las acciones.
- Copy source: `hiringDesk.outcome.labels.*`, `hiringDesk.outcome.causes.*`,
  `hiringDesk.pipeline.outcomeDialog.*`, `hiringDesk.pipeline.assessmentLaneNotice`.
- Data reader / command: lectura desde `getHiringDeskSnapshot` (el VM ya trae `application.decision`);
  escritura vía `POST /api/hiring/applications/[id]/decide` con `hiringRequest`, en la forma final que declare
  `TASK-1765`.
- API parity: **no nace contrato nuevo**. El diálogo es un cliente del command canónico de decisión, el mismo
  que consumen Application 360 y el carril programático. Si el diálogo necesitara un campo que el command no
  acepta, eso es trabajo de `TASK-1765`, no de esta superficie.
- Access / capability: `hiring.application.decide` resuelta en la page server y pasada como
  `canDecide: boolean` a la vista. La vista **no** llama `can()` ni interpreta roles.
- States to implement: default, degraded (cerrado sin desenlace), error, permission denied, pending, mobile,
  keyboard/focus, reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/hiring-pipeline-outcome-surface.scenario.ts`
- Route: `/agency/hiring/pipeline?captureOutcomes=all`
- Viewports: `1440x900` (desktop) y `390x844` (mobile)
- Quality profile: `premium`
- Required steps: abrir el tablero → marcar la columna «Cerrado» con las seis variantes de chip → arrastrar
  con teclado por el menú `⋮` hasta «Cerrado» → marcar el diálogo por defecto → elegir «Sin selección» →
  intentar confirmar sin causa y marcar el error → elegir causa → marcar el estado de envío → confirmar y
  marcar la tarjeta ya movida → repetir con reduced motion.
- Required captures: `outcome-column-chips`, `outcome-dialog-default`, `outcome-dialog-cause-required`,
  `outcome-dialog-cause-error`, `outcome-dialog-pending`, `outcome-card-settled`, `assessment-lane-notice`,
  `outcome-dialog-reduced-motion`, `outcome-permission-denied`.
- Required `data-capture` markers: `hiring-outcome-chip`, `hiring-outcome-cause`, `hiring-assessment-tag`,
  `hiring-outcome-dialog`, `hiring-outcome-cause-group`, `hiring-lane-notice-shortlist`,
  `hiring-lane-outcome`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, `failOnConsoleError`, layout gate con
  `allowHorizontalScrollSelectors` limitado al tablero y a las tabs (igual que el scenario vigente).
- Scroll-width checks: sin scroll horizontal de página en desktop ni en 390 px; el scroll del tablero queda
  contenido y sigue siendo el único permitido.
- Reduced-motion / focus evidence: secuencia completa repetida con `prefers-reduced-motion: reduce`, más
  captura del anillo de foco en el primer radio y en el CTA.
- Review dossier: `pnpm fe:capture:review hiring-pipeline-outcome-surface`
- Baseline decision / surface ID: superficie nueva `hiring-pipeline-outcome` — nace sin baseline previa; la
  primera corrida la establece y se declara en el dossier. El scenario existente
  `task355-hiring-pipeline-board` **conserva su baseline** y sirve de before/after de la tarjeta.

### Design decision log

- Decision: reusar `GreenhouseChip` para el desenlace **y migrar el tag de assessment a la misma primitive en
  el mismo paso**, con un `Record` único de tono; y modelar el cierre como diálogo modal bloqueante en vez de
  arrastre directo.
- Alternatives considered:
  1. **`HiringOutcomeChip` local** — rechazado: el contrato de UI Platform lo prohíbe por nombre
     (`HISTORIAL.md:804`), y habría nacido con la misma deuda que el tag actual.
  2. **Dejar el tag de assessment como está y sólo agregar el chip nuevo** — rechazado: deja dos etiquetas
     vecinas en la misma tarjeta con acabados distintos, y **conserva vivo** el bug de tono por comparación
     de strings en `en-US`.
  3. **Resolver el tono server-side en la projection**, como `statusTone` en
     `contractor-engagements/hr-workbench-projection.ts` — es el precedente más fuerte y la dirección
     correcta a mediano plazo, pero **exige tocar `HiringDeskApplicationSummary`, que es territorio de
     `TASK-1765`**. Se difiere y se declara como follow-up: el `Record` de esta task queda en un módulo único
     y browser-safe, listo para moverse al VM sin reescribir consumidores.
  4. **Sidecar o popover en vez de modal** — rechazado: el gesto manda un correo irreversible a una persona;
     una superficie descartable por click fuera es la forma incorrecta.
  5. **Mover la tarjeta optimistamente y revertir si el diálogo se cancela** — rechazado: cancelar no debe
     escribir **ni parecer** que escribió. La tarjeta se queda quieta hasta que el command confirma.
- Why this pattern: el ADR modela cerrar como **decisión**, no como posición; la superficie tiene que
  declararlo en el punto de decisión, que es el corolario 1 del patrón canónico §9.
- Reuse / extend / new primitive: `reuse` en el chip; composición local en el diálogo; ninguna primitive nueva.
- Open risks: el reparto de tonos entre los seis desenlaces se decide en este doc y necesita mirada de diseño
  sobre el frame real antes de `UI ready: yes`; y el campo de nota depende de la forma final que `TASK-1765`
  le dé al command.

### Visual verification

- GVC scenario: `hiring-pipeline-outcome-surface`
- Viewports: `1440x900`, `390x844`
- Required captures: los nueve marcadores listados arriba.
- Required `data-capture` markers: los siete listados arriba.
- Scroll-width check: desktop y 390 px, sin scroll horizontal de página.
- Accessibility/focus checks: foco atrapado en el diálogo, `aria-labelledby` en el título, causa con
  `aria-required` y error asociado por `aria-describedby`, chip dentro del nombre accesible de la tarjeta,
  aviso de «Evaluación» asociado por `aria-describedby` y no sólo por hover.
- Before/after evidence: `task355-hiring-pipeline-board` antes y después, para probar que la tarjeta no
  cambió de altura ni introdujo scroll.
- Known visual debt: la tarjeta sigue mezclando `sx` inline con tokens; esta task sólo normaliza las dos
  etiquetas, no la tarjeta completa.
- Visual scorecard: `docs/ui/reviews/TASK-1766-hiring-pipeline-outcome-surface.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

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

### Slice 1 — Vocabulario visible y guard de locale

- Bloque nuevo de primer nivel `hiringDesk.outcome` en `es-CL` y `en-US`: `labels` con los seis desenlaces
  (`Selección`, `Reserva`, `Sin selección`, `Descarte`, `Retiro`, `Sin respuesta`) y `causes` con las tres
  causas (`El cupo lo tomó otra persona`, `Se cerró la búsqueda`, `Se canceló el proceso`).
- Bloque `hiringDesk.pipeline.outcomeDialog` con el chrome del diálogo, y
  `hiringDesk.pipeline.assessmentLaneNotice` con el aviso de la columna «Evaluación».
- `src/lib/copy/types.ts`: ambos bloques con **claves literales**, no `Record<string, string>`. El tipo suelto
  de `stages` es justamente lo que dejó pasar el drift; el nuevo obliga a nombrar cada clave.
- Test de paridad de locale para el bloque de desenlace: cada etiqueta y cada causa del diccionario `en-US`
  debe diferir de su par en castellano. Es el guard que el tipado **no** puede dar, porque `en-US` hace
  `...esCL` en el nivel raíz y otra vez dentro de `pipeline`.

### Slice 2 — El chip en la tarjeta, y el tag de assessment con él

- La tarjeta en «Cerrado» renderiza `GreenhouseChip` con la etiqueta del desenlace; en «Sin selección»
  agrega la causa como texto secundario bajo el chip.
- El tag «Test asignado/entregado» pasa a la misma primitive y **deja de decidir su tono comparando el string
  de copy**: el estado se deriva de `item.application.score != null`, que es el dato, no la etiqueta.
- Un único `Record` de tono por desenlace en `hiring-client.ts`, junto a `scoreTone` y bajo su misma doctrina.
- El chip entra al nombre accesible de la tarjeta.
- Estado degradado: `stage='closed'` sin desenlace resoluble muestra un chip neutro explícito.

### Slice 3 — Cerrar es decidir (bloqueado por `TASK-1765`)

- El drop en la columna «Cerrado» deja de llamar el camino de etapa y abre `PipelineOutcomeDialog`.
- **El ítem «Cerrado» del menú `⋮` hace exactamente lo mismo**: es el mismo agujero por el carril de teclado.
- El diálogo pide desenlace; con «Sin selección» exige causa; genera su clave de idempotencia al abrir;
  bloquea las acciones mientras envía; y **cancelar no escribe nada**.
- Al confirmar, la tarjeta se mueve a «Cerrado» y la live region anuncia el desenlace.
- La columna «Cerrado» rechaza el gesto con mensaje explicativo cuando falta la capability.

### Slice 4 — El aviso de «Evaluación»

- La columna «Evaluación» declara de forma persistente que soltar ahí asigna la prueba, asociado por
  `aria-describedby` y reforzado mientras se arrastra encima. No es un tooltip sólo-hover.

### Slice 5 — Evidencia y documentación

- Scenario GVC nuevo, con el switch de captura no productivo que permite ver las seis variantes de chip.
- Dossier de review, scorecard y before/after contra el scenario vigente del tablero.
- Documentación funcional de Hiring y manual del Hiring Desk actualizados con el gesto nuevo.

## Out of Scope

- **El eje de desenlace, el enum de causa y el `CHECK` `stage='closed' ⟺ desenlace` son `TASK-1765`.** Esta
  task no toca `HIRING_DECISIONS`, ni `decide.ts`, ni `store.ts`, ni escribe migraciones.
- **El diálogo de cierre por capacidad en Application 360 es `TASK-1763`.** Aquel confirma el cierre de una
  cohorte completa desde otra superficie; éste declara el desenlace de una persona en el tablero. Comparten
  vocabulario, no componente.
- **El colapso del enum de etapas y el retiro de `qualified`/`client_review`/`handoff_ready` es `TASK-1754`**,
  junto con `LaneDefinition` y el borrado de `pipeline-lane-contract.test.ts`.
- El `EmailType` nuevo de `not_selected`, su cuerpo por causa y su perfil de footer: ADR §7.3 + `TASK-1764`.
- La población del Talent Pool a partir de `not_selected`, el embudo de equidad y la escalera de retención.
- El rename físico de la columna `decision` a `outcome` (deferido con su propia migración, ADR §15).
- La derivación automática de `unresponsive` tras N días de silencio (pregunta abierta del ADR §15).
- El rediseño de la tarjeta o del tablero, y cualquier filtro por desenlace.

## Detailed Spec

### El chip, y por qué no nace un componente nuevo

```tsx
<GreenhouseChip
  kind='status'
  variant='label'
  size='small'
  tone={HIRING_OUTCOME_TONE[outcome]}
  label={copy.outcome.labels[outcome]}
  dataCapture='hiring-outcome-chip'
/>
```

El contrato de UI Platform no deja espacio a interpretación: *«Nuevos kinds deben mapear un uso semántico
hacia una variant existente antes de crear componentes locales como `FooStatusChip`»*
(`docs/architecture/ui-platform/HISTORIAL.md:804`). `kind='status'` ya existe, `variant='label'` ya existe, y
la primitive ya resuelve altura, radio AXIS, anillo de foco, contraste AA tonal y `prefers-reduced-motion`.
Un chip local perdería las cinco cosas y habría que reponerlas a mano.

### El mapa de tono — uno, no un ternario por pantalla

```ts
/**
 * Semáforo canónico del desenlace de una postulación → tono semántico Greenhouse.
 * Única fuente para chips/etiquetas de desenlace: no duplicar el mapeo por pantalla.
 */
export const HIRING_OUTCOME_TONE: Record<HiringDecision, GreenhouseChipTone> = { … }
```

Reparto propuesto, con su razón:

| Desenlace | Etiqueta | Tono | Por qué |
|---|---|---|---|
| `selected` | Selección | `success` | Es el único desenlace celebrable, y el verde ya significa eso en el portal |
| `backup_selected` | Reserva | `info` | Compromiso vigente, no cerrado: azul de estado, no de resultado |
| `not_selected` | Sin selección | `default` | **Neutro a propósito.** Es la población del Talent Pool; pintarla de rojo la vuelve un descarte a la vista, que es exactamente lo que el ADR §4.2 separa |
| `rejected` | Descarte | `warning` | Juicio desfavorable **para este rol**, no una falla del sistema |
| `withdrawn` | Retiro | `default` | La persona puso fin: no hay juicio de Efeonce que colorear |
| `unresponsive` | Sin respuesta | `default` | Nadie puso fin. Atribuir tono es atribuir conducta |

Tres desenlaces comparten `default` a propósito: **el color no es el discriminante, la etiqueta lo es** —el
wireframe de `TASK-1754` lo pide explícito— y `error` queda reservado para fallas del sistema, nunca para una
persona. El reparto necesita una mirada de diseño sobre el frame real antes de `UI ready: yes`.

**Precedente que se sigue:** `scoreTone` (`src/views/greenhouse/hiring/hiring-client.ts:44-53`) ya fija la
doctrina en su docstring. **Precedente que se difiere:** `statusTone` viajando dentro del VM
(`src/lib/contractor-engagements/hr-workbench-projection.ts:109-160`) es más fuerte, pero exige tocar
`HiringDeskApplicationSummary`, que es de `TASK-1765`.

### El tag de assessment, y el bug que se lleva por delante

Hoy:

```tsx
const testTag = assessment ? (item.application.score != null ? copy.pipeline.tagDelivered : copy.pipeline.tagAssigned) : null
// …
color: testTag === copy.pipeline.tagDelivered ? 'info.dark' : 'warning.dark'
```

El tono se decide **comparando el string visible**. En `en-US` el copy es otro, la comparación cae siempre al
lado `false`, y la etiqueta «Test entregado» se pinta con el tono de «asignado» sin que nada falle. Después:

```tsx
const assessmentState = assessment ? (item.application.score != null ? 'delivered' : 'assigned') : null
```

El estado se deriva del **dato**, y la etiqueta y el tono salen de él. Es la misma clase de defecto que el
mapa de tono de desenlace viene a prevenir, así que se corrige en el mismo paso o queda un vecino roto.

### El diálogo — regiones reales

```
┌─ Cerrar el proceso de Roxana Lezama ───────────────────────────┐
│                                                                │
│  ¿Cómo terminó?                                     (fieldset) │
│   ( ) Selección        ( ) Reserva        (•) Sin selección    │
│   ( ) Descarte         ( ) Retiro         ( ) Sin respuesta    │
│                                                                │
│  ── sólo con «Sin selección» ───────────────────────────────── │
│  Causa (obligatoria)                            (aria-required)│
│   ( ) El cupo lo tomó otra persona                             │
│   ( ) Se cerró la búsqueda                                     │
│   ( ) Se canceló el proceso                                    │
│   ⚠ Elige la causa para poder cerrar el proceso.               │
│                                                                │
│  Nota de respaldo                                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  ⓘ Se enviará un correo a la persona, salvo «Sin respuesta».   │
│                                                                │
│                             [ Cancelar ]  [ Cerrar proceso ]   │
└────────────────────────────────────────────────────────────────┘
```

Cuatro regiones: **desenlace** (obligatorio, seis radios), **causa** (condicional y obligatoria),
**nota de respaldo** y **aviso de correo**. El aviso es parte del contrato, no cortesía: el operador tiene
que saber que el gesto manda un mensaje irreversible a una persona real **antes** de confirmarlo.

**La nota de respaldo existe porque el command la exige.** `decideHiringApplication` valida hoy
`reason.summary` con un mínimo de 8 caracteres y un máximo de 1600 (`src/lib/hiring/decide.ts:38-53`), y
lanza `hiring_decision_reason_required` si falta. Mientras `TASK-1765` no declare otra cosa, el campo es
obligatorio en el diálogo. Si `TASK-1765` lo vuelve opcional para los desenlaces sin juicio
(`unresponsive`, `withdrawn`), el diálogo sigue esa forma sin discutirla — **el contrato es del command, no de
la pantalla**.

`idempotencyKey` se genera **al abrir** el diálogo y se conserva mientras esté abierto: un doble click, o un
reintento tras un error de red, replayea la misma decisión en vez de crear una segunda.

### El menú `⋮` tiene el mismo agujero que el arrastre

`LANES.filter((lane) => lane.destination)` incluye la columna «Cerrado», y su `onClick` llama
`persistStage(menu.application, 'closed')` (`PipelineDeskView.tsx:714-725`). **Interceptar sólo el `onDrop`
deja el carril de teclado escribiendo `closed` directo.** Después de `TASK-1765` eso deja de fallar en
silencio y pasa a fallar en voz alta: el `CHECK` lo rechaza y el operador que navega por teclado recibe un
error canónico donde debería haber recibido la pregunta. Los dos caminos entran al mismo diálogo.

### El aviso de «Evaluación»

Soltar en «Evaluación» dispara la policy de assessment: la persona recibe una prueba. El ADR §12 obliga a
declararlo **en el punto de decisión** (`SIEMPRE`). El aviso vive en la cabecera de la columna de forma
persistente —no como tooltip sólo-hover, que el wireframe de `TASK-1754` descarta explícitamente— se asocia
por `aria-describedby` a la región de la columna, y se refuerza mientras se arrastra por encima.

### Copy — partición por clave

| Clave | Dueño | Consumidores |
|---|---|---|
| `hiringDesk.outcome.labels.*` | `TASK-1766` | tarjeta del kanban, diálogo, Application 360, `TASK-1763` |
| `hiringDesk.outcome.causes.*` | `TASK-1766` | diálogo, tarjeta, `TASK-1763` |
| `hiringDesk.pipeline.outcomeDialog.*` | `TASK-1766` | sólo el kanban |
| `hiringDesk.pipeline.assessmentLaneNotice` | `TASK-1766` | sólo el kanban |
| `hiringDesk.pipeline.stages.*` | `TASK-1754` | — |
| `hiringDesk.application.capacityClosure.*` | `TASK-1763` | — |

`outcome` es de **primer nivel** justamente porque lo consumen dos superficies: el kanban y Application 360.
Meterlo dentro de `pipeline` obligaría a `TASK-1763` a importar vocabulario desde una superficie ajena.

**El tipado no garantiza el mirror en inglés, y hay que decirlo.** `en-US` hace `...esCL` en el nivel raíz
(`dictionaries/en-US/hiringDesk.ts:6`) y otra vez dentro de `pipeline` (`:47`): una clave nueva definida sólo
en castellano **compila** y se renderiza en castellano dentro del diccionario inglés. Agregarla a
`src/lib/copy/types.ts` sí es obligatorio —sin eso el consumidor no compila— pero **no** fuerza la
traducción. Por eso el guard es un test, y por eso las claves nuevas se tipan con nombres literales en vez de
`Record<string, string>`.

Si `TASK-1754` aterriza antes un guard de paridad de locale más amplio para el diccionario completo, **este
test se pliega a él en vez de duplicarlo**.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **`TASK-1754` merge → `TASK-1766` empieza.** Al revés, esta task escribe sobre una `LaneDefinition` que
  `TASK-1754` está por reducir a un campo, y sobre un test que está por borrar.
- **`TASK-1766` merge → `TASK-1768` empieza.** El chip de avance de entrevista aterriza sobre el slot de
  chips ya normalizado por esta task, no sobre la mezcla de `<Box>` con `sx` inline que existe hoy.
- Slice 1 (copy + tipos + guard) → Slice 2 (chip) → Slice 3 (diálogo) → Slice 4 (aviso) → Slice 5 (evidencia).
- **Slice 3 NO se ejecuta hasta que `TASK-1765` esté verificada en producción.** Sin el eje de desenlace no
  hay qué enviar, y sin el `CHECK` el diálogo sería una cortesía que el `PATCH` puede seguir esquivando.
- Slices 1, 2 y 4 pueden mergear antes que `TASK-1765`: el chip pinta `application.decision`, que ya existe
  hoy, y el aviso de «Evaluación» es independiente del eje de desenlace.
- Slice 5 corre al final, cuando hay las seis variantes que capturar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ventana entre `TASK-1765` y el Slice 3: el `CHECK` rechaza el `PATCH` y el tablero muestra «No se pudo mover, se revirtió» sin explicar por qué | UI | high | Slice 3 sale pegado a `TASK-1765`; mientras tanto la columna «Cerrado» rechaza el drop con el mensaje canónico correcto en vez del rollback genérico | toast de rollback + `captureWithDomain` en `application_stage` |
| Una tarjeta queda en «Cerrado» sin chip (viola ADR §12) | UI | medium | `pipeline-outcome-contract.test.ts` cubre los seis desenlaces + el caso degradado; el GVC captura la columna entera | test rojo en CI; frame del GVC |
| Un click accidental manda un correo irreversible a una persona real | correo / candidato | medium | diálogo modal no descartable por click fuera, aviso de correo visible antes de confirmar, sin auto-submit, sin acción por defecto preseleccionada | ledger de envío `hiring_decision_*` |
| Doble envío crea dos decisiones | command de decisión | low | clave de idempotencia generada al abrir el diálogo + acciones deshabilitadas mientras envía; el command ya es idempotente y devuelve `idempotentReplay` | `idempotentReplay=true` inesperado |
| `en-US` hereda las etiquetas en castellano (bug class ya vivo en `stages`) | copy | high | claves literales en `types.ts` + test de paridad del bloque de desenlace | test rojo en CI |
| Colisión de merge en `hiringDesk.ts` con cinco escritores, y en `PipelineDeskView.tsx` con tres | copy / UI | high | partición por clave, no por archivo, y orden de merge declarado: 1747 → 1754 → 1766 → 1763 → 1768 | conflicto en el rebase |
| Migrar el tag de assessment cambia la altura de la tarjeta y desplaza el tablero | UI | medium | before/after contra `task355-hiring-pipeline-board` + layout gate del GVC con `minTargetSize` | diff de layout en el gate |
| La causa se filtra a superficie candidate-facing | privacidad / candidato | low | la causa sólo se pasa a componentes internos; ningún prop candidate-facing la recibe; el correo lo compone el dominio, no la pantalla | revisión del diff + ADR §12 |
| El tono elegido lee como castigo sobre el nombre de una persona | UX / marca empleadora | medium | `not_selected` en neutro, `error` reservado a fallas del sistema, revisión de diseño sobre el frame real antes de `UI ready: yes` | scorecard de revisión visual |

### Feature flags / cutover

**Sin flag de variable de entorno — no se agrega ningún `*_ENABLED`, así que no corresponde fila en
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.** El gating real es la capability
`hiring.application.decide`, que ya existe y ya está concedida a `efeonce_admin`, `hr_manager` y
`efeonce_operations` (`src/lib/entitlements/runtime.ts:590-604`): quien no la tiene no ve el destino
«Cerrado» ni el diálogo. El cutover efectivo lo gobierna el orden de slices, no un interruptor.

El único switch nuevo es de **captura**, no de producto: `?captureOutcomes=all` en la page, gateado por
`process.env.NODE_ENV !== 'production'`, siguiendo exactamente el precedente de `?captureFailure=stage`
(`src/app/(dashboard)/agency/hiring/pipeline/page.tsx:19` y `:50`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — copy + tipos + guard | revert del PR; aditivo, ninguna clave existente cambia de nombre ni desaparece | < 5 min | sí |
| Slice 2 — chip + tag | revert del PR; el chip es de render, no escribe nada | < 5 min | sí |
| Slice 3 — diálogo | revert del PR. **No revierte decisiones ya escritas** —el command es append-only y ya mandó correo—; el rollback devuelve la superficie, no el efecto | < 5 min para la UI; los envíos ya emitidos no se deshacen | parcial |
| Slice 4 — aviso | revert del PR | < 5 min | sí |
| Slice 5 — evidencia | revert del PR; el scenario no toca runtime de producto | < 5 min | sí |

### Production verification sequence

1. Confirmar que `TASK-1754` está mergeada y que `LaneDefinition` ya quedó con un valor por carril.
2. Mergear Slices 1, 2 y 4; verificar en local con `pnpm dev` que la columna «Cerrado» muestra el chip para
   la única fila terminal real del sistema (1 `rejected`, ADR §13) y que el tag de assessment conserva su
   tono correcto **en los dos locales**.
3. GVC desktop + 390 px; mirar los frames, no sólo el exit code.
4. Confirmar que `TASK-1765` está verificada en producción: el `CHECK` rechaza un `closed` sin desenlace y el
   `PATCH` de etapa no lo puede escribir.
5. Mergear el Slice 3. Ejercitar el flujo completo en staging con una postulación sintética: los dos carriles
   (arrastre y menú `⋮`), la causa obligatoria, el cancelar sin efecto, y el envío con doble click.
6. Verificar en el ledger de correo que el envío salió con el tipo correcto y **una sola vez**.
7. Repetir en producción con acuerdo previo de Talento, sobre una postulación real elegida por el equipo.
8. Observar el tablero durante una semana: ninguna tarjeta en «Cerrado» sin chip.

### Out-of-band coordination required

- **Talento / People Ops:** el gesto pasa a mandar correos con vocabulario nuevo. El copy de las seis
  etiquetas y las tres causas necesita revisión de Talento antes del merge del Slice 1, y aviso al equipo
  antes del Slice 3 —porque el tablero cambia de comportamiento en un gesto que ya usan.
- **Sin coordinación de infraestructura:** no hay secretos, ni variables de entorno, ni cambios en Azure,
  HubSpot, Notion o Cloud Run. Cambio de repo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Ninguna tarjeta en la columna «Cerrado» se renderiza sin chip de desenlace, incluido el caso degradado
      de una fila anterior al `CHECK`, que muestra un chip neutro explícito.
- [ ] El chip usa `GreenhouseChip` con `kind='status'`, `variant='label'`, `size='small'`. **No existe ningún
      `HiringOutcomeChip`** ni componente local equivalente en el diff.
- [ ] El tag de assessment usa la misma primitive y **su tono ya no se decide comparando strings de copy**;
      se verifica renderizando el tablero con locale `en-US`.
- [ ] Existe un único `Record` de tono por desenlace y ninguna pantalla lo duplica con ternarios.
- [ ] Soltar en «Cerrado» abre el diálogo y **no escribe nada** antes de confirmar; cancelar deja la tarjeta
      en su columna y la base sin cambios.
- [ ] El ítem «Cerrado» del menú `⋮` abre el mismo diálogo y no llama al camino de cambio de etapa.
- [ ] Con «Sin selección», el diálogo no deja confirmar sin causa; el error se anuncia con `aria-required` +
      `aria-describedby`.
- [ ] El diálogo declara que se enviará un correo, salvo «Sin respuesta», antes de confirmar.
- [ ] La columna «Evaluación» declara de forma persistente que soltar ahí asigna la prueba, asociado por
      `aria-describedby` y no sólo por hover.
- [ ] El chip forma parte del nombre accesible de la tarjeta.
- [ ] Sin `hiring.application.decide`, la columna «Cerrado» rechaza el gesto con mensaje explicativo y sin
      botón «Reintentar».
- [ ] Las seis etiquetas y las tres causas existen en `es-CL` y en `en-US` con valores distintos, y el test de
      paridad lo prueba.
- [ ] Todo el copy visible nuevo sale de `hiringDesk.ts`; el diff no contiene literales en JSX.
- [ ] GVC desktop y 390 px capturado **y mirado**, con los nueve marcadores, sin scroll horizontal de página
      y con la secuencia repetida en reduced motion.
- [ ] Ningún identificador interno de desenlace ni de causa aparece en superficie candidate-facing.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/views/greenhouse/hiring src/lib/copy`
- `pnpm design:lint`
- `pnpm fe:capture hiring-pipeline-outcome-surface --env=local` + `pnpm fe:capture:review hiring-pipeline-outcome-surface`
- `pnpm ui:visual-gate` y `pnpm ui:quality`
- `pnpm task:lint --task TASK-1766` y `pnpm ops:lint --changed`
- `pnpm test` (suite completa) y `pnpm build` como gate de cierre, **pidiendo autorización antes del build**:
  la corrida completa es cara en memoria en este equipo.
- Validación manual con `pnpm dev` en `/agency/hiring/pipeline`, en los dos locales, entregando la URL
  `localhost` exacta al operador.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1763` quedo notificada de que las claves de desenlace y causa ya existen, para que las consuma en
      vez de duplicarlas
- [ ] la documentación funcional de Hiring y el manual del Hiring Desk describen el gesto nuevo: cerrar es
      decidir, y manda un correo

## Follow-ups

- Mover el mapa de tono al VM del snapshot, como `statusTone` en
  `src/lib/contractor-engagements/hr-workbench-projection.ts`, una vez que `TASK-1765` haya estabilizado
  `HiringDeskApplicationSummary`. El `Record` de esta task nace en un módulo único para que ese movimiento no
  toque consumidores.
- Filtro por desenlace en el tablero, si el volumen de la columna «Cerrado» lo pide.
- Normalizar el resto de la tarjeta del kanban: sigue mezclando `sx` inline con tokens.
- Unificar el guard de paridad de locale del diccionario completo de `hiringDesk`, si `TASK-1754` no lo
  entregó antes.

## Delta 2026-08-22

- `TASK-1765` (eje de desenlace), `TASK-1767` (embudo de equidad) y `TASK-1768` (chip de avance de entrevista)
  se registraron el mismo día, en sesiones paralelas, después de redactada esta task. Verificado contra el
  filesystem: `TASK-1765` **cede explícitamente** a ésta *«el chip de desenlace, el diálogo de cierre del
  kanban y `PipelineDeskView.tsx`»*, así que el reparto se sostiene sin cambios.
- `TASK-1768` sí agrega un escritor nuevo a los dos archivos calientes: la función `card` de
  `PipelineDeskView.tsx` y el diccionario `hiringDesk.ts`. Se actualizaron en consecuencia la coordinación de
  `Files owned`, la fila de riesgo de merge y el orden de slices: **1768 va después de 1766**, para que su
  chip nazca sobre un slot ya canónico.

## Open Questions

- **El reparto de tonos.** Tres desenlaces comparten `default` porque el color no es el discriminante. Falta
  la mirada de diseño sobre el frame real: si la columna queda plana, la alternativa es dar a `withdrawn` y
  `unresponsive` una variant `outlined` en lugar de otro tono. Se resuelve antes de `UI ready: yes`.
- **La nota de respaldo.** Hoy el command la exige siempre (mínimo 8 caracteres). Falta que `TASK-1765`
  declare si sigue siendo obligatoria para `unresponsive` y `withdrawn`, donde no hay juicio de Efeonce que
  fundamentar. El diálogo sigue lo que decida el command.
- **`backup_selected` y su correo.** El ADR §7.2 deja el `EmailType` de «Reserva» a decidir en su propia
  task; hasta que exista, el aviso de correo del diálogo tiene que decir la verdad sobre ese desenlace.
