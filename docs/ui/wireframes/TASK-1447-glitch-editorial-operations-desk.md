# TASK-1447 — Glitch Editorial Operations Desk Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1447 — Glitch Editorial Operations Desk`
- Product Design asset: `none — repo-native operational wireframe`
- Intended consumers: `Efeonce content strategist/editor, publication approver and operations owner`
- Copy source: `src/lib/copy/glitch.ts`
- Primitive decision: `reuse CompositionShell + DataTableShell/queue patterns + ContextualSidecar; no new primitive`
- UI ready target: `no`

## Brief

- Primary user: editor/a de contenidos Efeonce.
- User moment: supervisa la próxima edición, revisa candidatas y recupera runs sin perder evidencia.
- Job to be done: entender qué encontró/decidió el agente, intervenir sólo donde importa y confirmar promociones Glitch Flash con consecuencias claras.
- Primary decision signal: readiness de la Weekly o elegibilidad/evidencia de una candidata promovible.
- Non-goals: editar Gutenberg, reemplazar Notion, diseñar prompts, publicar automáticamente o construir analytics de audiencia.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Próxima edición, deadline, health y acción secundaria de abrir Notion | `GreenhouseBreadcrumbs`, page header, `GreenhouseChip` | Glitch edition/run reader |
| 1 | Lead | Selector Weekly/Candidates/Runs y resumen de excepciones | Tabs existentes + `OperationalPanel` | Glitch readers |
| 2 | Primary | Cola de candidatas o Top 8 de edición con selección única | `DataTableShell` / list-detail consumer | candidate/edition reader |
| 3 | Aside | Evidencia, claims, fuentes, historial y acciones contextuales | `ContextualSidecar variant='inspector' kind='glitchEvidence'` | candidate/evidence/promotion reader |
| 4 | Dock | Estado del run activo, pasos, retry/recovery cuando corresponda | `OperationalPanel` compacto | run reader/recovery command |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `content.glitch.desk.title` | Header | `Glitch Desk` | none | Nomenclatura de superficie |
| `content.glitch.desk.nextEdition` | Header | `Próxima edición: Glitch #{number}` | `number` | Sólo Weekly |
| `content.glitch.desk.health.ready` | Header | `Lista para revisión` | none | Estado, no publish |
| `content.glitch.desk.tabs.weekly` | Lead | `Edición semanal` | none | |
| `content.glitch.desk.tabs.candidates` | Lead | `Candidatas` | none | Daily/Flash internas |
| `content.glitch.desk.tabs.runs` | Lead | `Ejecuciones` | none | |
| `content.glitch.desk.candidate.promote` | Aside | `Proponer como Glitch Flash` | none | No ejecuta publish |
| `content.glitch.desk.promotion.confirm` | Aside | `Confirmar promoción` | none | Consecuencia: habilita private draft |
| `content.glitch.desk.promotion.help` | Aside | `Creará una noticia única sin número. WordPress seguirá en privado.` | none | Disclosure obligatorio |
| `content.glitch.desk.run.retry` | Dock | `Reintentar ejecución` | none | Consume recovery command |
| `content.glitch.desk.openNotion` | Header | `Abrir calendario en Notion` | none | Link secundario |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Edición lista para revisión` | `Las ocho historias tienen evidencia y draft privado.` | `Abrir borrador privado` | Nunca dice publicada |
| loading | `Cargando operación Glitch` | `Estamos reuniendo candidatas, evidencia y ejecuciones.` | none | skeletons |
| empty | `Todavía no hay candidatas en esta ventana` | `Daily aún no ha encontrado señales que superen el umbral.` | `Revisar ejecuciones` | No inventar actividad |
| partial | `Hay evidencia incompleta` | `{count} candidatas necesitan una fuente o fecha verificable.` | `Revisar pendientes` | Warning tonal |
| error | `No pudimos cargar Glitch Desk` | `La operación sigue registrada. Reintenta o revisa el run afectado.` | `Reintentar` | Sin raw error |
| denied | `No tienes acceso a la operación editorial` | `Pide acceso al owner de contenidos de Efeonce.` | `Volver` | |

## Accessibility Contract

- Heading order: un H1 de superficie; H2 para región activa y sidecar; rows no simulan headings.
- Chart/table alternatives: no charts V1; tablas/listas conservan caption sr-only y headers.
- Aria labels: estado de evidencia, abrir inspector, proponer/confirmar promoción y retry nombran candidata/run.
- Focus notes: selección lleva foco al heading del inspector; close/Escape restaura la row; confirm devuelve foco al status actualizado.
- Color-independent state labels: chips incluyen texto/icono; evidence completeness no depende de color.

## Implementation Mapping

- Route / surface: `/growth/glitch` en `src/app/(dashboard)/growth/glitch/page.tsx`.
- Primitives: `CompositionShell`, `GreenhouseBreadcrumbs`, `OperationalPanel`, `DataTableShell`, `ContextualSidecar`, `GreenhouseChip`, `GreenhouseButton`.
- Variants / kinds: Composition `leadPlusContext`, `fluidity='rich'`; sidecar `inspector` / `glitchEvidence`; cards usan shared card-density cuando corresponda.
- Component candidates: route-local `GlitchOperationsView`, `GlitchCandidateQueue`, `GlitchEditionWorkbench`, `GlitchRunDock` como consumers, no primitives.
- Copy source: `src/lib/copy/glitch.ts`.
- Data reader / command: readers TASK-1442/1444; promotion commands TASK-1448; run recovery TASK-1445.
- API parity: UI cliente del mismo contract que CLI/agente; cero state machine client-side.
- Access / capability: view/capabilities finales se congelan en backend discovery antes de `UI ready: yes`.
- Runtime consumers: portal operator; Notion/WordPress siguen integrations, no UI data stores.
- Print/email/PDF considerations: none.
- GVC markers: `glitch-desk`, `glitch-desk-header`, `glitch-candidate-queue`, `glitch-evidence-inspector`, `glitch-run-dock`, estados `glitch-desk-empty|partial|error`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/glitch-editorial-operations-desk.scenario.ts`.
- Route: `/growth/glitch`.
- Viewports: 2048x1280, 1440x900, 390x844.
- Required steps: ready Weekly; candidates; abrir/cerrar inspector; promotion proposed/confirm preview; run partial/retry; denied fixture.
- Required captures: first fold, Top 8, evidence inspector, Glitch Flash disclosure, partial state, mobile temporary sidecar.
- Required `data-capture` markers: los listados en Implementation Mapping.
- Assertions: H1 único, row/inspector seleccionados, disclosure visible antes de confirm, ningún control publish automático.
- Scroll-width checks: document `scrollWidth <= clientWidth` en desktop y 390; regiones densas usan scroll accesible local si aplica.
- Accessibility/focus checks: keyboard row -> inspector -> close/Escape -> row; focus visible y live status tras command.
- Reduced-motion evidence: rich choreography desactivada sin perder selección/estado; sidecar aparece sin transición espacial.

## Design Decision Log

- Decision: work queue + evidence inspector dentro de CompositionShell `leadPlusContext`, con run dock; Notion queda como calendario colaborativo.
- Alternatives considered: dashboard de métricas (no ayuda a decidir), editor Gutenberg embebido (duplica WordPress), tres páginas separadas (pierde contexto), drawer desktop (viola Adaptive Sidecar).
- Why this pattern: el trabajo dominante es triage y decisión contextual con evidencia, exactamente el patrón queue + inspector.
- Reuse / extend / new primitive: reuse; ningún primitive nuevo.
- Open risks: densidad de Top 8, nombre final de capabilities/view y si confirmación de promoción necesita Dialog adicional por riesgo.
- Follow-up: definir analytics/measurement sólo después de operación estable.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives (N/A — sin charts V1).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture`.
- [x] Design decision log explains reuse before JSX starts.

