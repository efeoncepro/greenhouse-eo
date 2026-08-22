# TASK-1768 / Hiring Desk — Pipeline — Eje de progreso de la columna «Entrevista»

## Meta

- Status: `draft`
- Owner task: `docs/tasks/to-do/TASK-1768-hiring-interview-stage-progress-axis.md`
- Product Design asset: pendiente — la dirección visual dura de la tarjeta del pipeline no existe todavía como archivo en el repo. Este wireframe se apoya en el runtime vigente (`src/views/greenhouse/hiring/PipelineDeskView.tsx:405`, chip de test) como referencia verificable, y por eso la task queda en `UI ready: no`.
- Visual direction mode: `repo-native-benchmark` — el benchmark es el chip de test que YA vive en la misma tarjeta; el eje nuevo se pinta como su hermano, no como una pieza inventada.
- Intended consumers: Hiring Desk → Pipeline (`/agency/hiring/pipeline`), consumidores del reader `getHiringDeskSnapshot` (`GET /api/hiring/desk`, Nexa/MCP por construcción).
- Copy source: `src/lib/copy/types.ts` (`HiringDeskCopy.pipeline`) + `src/lib/copy/dictionaries/es-CL/hiringDesk.ts` + `src/lib/copy/dictionaries/en-US/hiringDesk.ts`.
- Primitive decision: `reuse` — `GreenhouseChip kind='status'` (`src/components/greenhouse/primitives/GreenhouseChip.tsx:17`), el mismo que `TASK-1766` introduce en la tarjeta para el desenlace.
- UI ready target: `no` hasta que exista la dirección visual dura y `TASK-1766` haya fijado el chip en la tarjeta.

## Brief

- Primary user: reclutador / People Ops operando el tablero (`efeonce_admin`, `hr_manager`, `efeonce_operations`), con `hiring.opening.read` + `hiring.application.read`.
- User moment: barrido diario del tablero. El operador mira la columna «Entrevista» y quiere saber, sin abrir la postulación, si esa entrevista ya tiene evidencia evaluada o sigue esperando a alguien.
- Job to be done: distinguir «está en la columna Entrevista» de «la entrevista ya fue evaluada». Hoy las dos se ven exactamente igual.
- Primary decision signal: el estado del `interviewer_scorecard` de esa postulación — abierto, cerrado, o inexistente.
- Non-goals: mostrar puntaje, banda, rúbrica, nombre del evaluador o cualquier rating; agendar; recordar; escribir.

## Desktop Target — 1440×1000

El tablero no cambia de forma: seis columnas con scroll interno, tarjetas de ancho de columna. El cambio vive **dentro** de la tarjeta, en el slot condicional que hoy ya ocupa el chip de test.

Orden de lectura de la tarjeta, de arriba hacia abajo (verificado contra el runtime):

1. **Región A — menú de etapa** (`data-capture="hiring-card-stage-menu"`), esquina superior derecha, absoluta. No cambia.
2. **Región B1 — identidad**: avatar de 34 px con iniciales + nombre a dos líneas máximo + origen del candidato con su ícono. No cambia.
3. **Región B2 — ejes de progreso** (el slot que esta task ocupa). Hoy es un único chip condicional de test. Pasa a ser una fila con **como máximo dos chips**, en este orden: primero el del test (evidencia que produce el candidato), después el de la entrevista (evidencia que produce el equipo). Si sólo hay uno, la fila se ve idéntica a hoy.
4. **Región B3 — pie**: «Postuló hace N días» a la izquierda y el indicador «Guardando cambio…» a la derecha. No cambia.

La fila B2 es la única región con densidad variable. En una columna de ancho normal los dos chips caben en una línea; si no caben, la fila envuelve a una segunda línea antes de truncar. **Nunca se trunca el texto del estado**: el chip es la única señal de color-independiente que tiene la tarjeta, y un «Entrevista en eva…» es peor que dos líneas.

Regla de economía dura: **un chip por eje, jamás dos chips del mismo eje**. Si una postulación tiene tres scorecards, el eje resuelve a UN estado agregado, no a tres chips.

## Mobile Target — 390×844

En 390 px el tablero ya opera con scroll horizontal declarado y permitido en el contenedor `[data-capture="hiring-pipeline-board"]`. La tarjeta ocupa el ancho de su columna y **no gana scroll horizontal propio**: la fila B2 envuelve.

La composición no se limita a encogerse:

- Con dos chips, la fila B2 pasa a dos líneas apiladas al inicio (`flex-wrap`), manteniendo el orden test → entrevista.
- El área táctil no cambia: los chips **no son interactivos**, así que no compiten con el cuerpo clickeable de la tarjeta ni con el menú ⋮ de 26 px. Ese es el motivo principal de que el eje se exprese como chip y no como botón.
- La densidad del pie (B3) se conserva; el chip nunca desplaza «Postuló hace N días» fuera de la primera pantalla de la tarjeta.

## Action Hierarchy

- Primary: abrir la postulación (el cuerpo de la tarjeta ya es un `button` que lleva a Application 360). El eje nuevo **no compite**: informa y no ofrece acción.
- Secondary: el menú ⋮ de cambio de etapa. Sin cambios.
- Destructive: ninguna en esta superficie.
- Selection vs action: el chip es lectura pura. No es filtro, no es toggle, no es link.
- Pending / disabled: mientras la tarjeta guarda un cambio de etapa (`aria-busy`, opacidad 0.5) el chip se atenúa con el resto de la tarjeta y **conserva su texto**: un estado que desaparece mientras se guarda haría dudar de si se perdió.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Chip de test vigente (`Box` inline con `warning.lightOpacity` / `info.lightOpacity`) | `GreenhouseChip kind='status' size='small'` | «hay evidencia y está en tal estado», leído de un vistazo | Reproducir el `Box` inline con sus `px: 0.875 / py: 0.25` y su `fontSize: 12` a mano |
| Estado abierto (alguien debe evaluar todavía) | `tone='warning'` | urgencia sin alarma; espeja «Test asignado» | Cualquier HEX o `#ED6C02` literal |
| Estado cerrado (la evidencia ya está) | `tone='info'` | hecho consumado, no éxito de negocio; espeja «Test entregado» | `tone='success'`, que en este tablero pertenece a la columna «Cerrado» |
| Ícono de estado | `tabler-user-check` (cerrado) / `tabler-user-question` (abierto) | familia visual del par `tabler-flag-check` / `tabler-flag` ya presente | Ícono decorativo sin correlato semántico |
| Radio y sombra del chip | tokens del propio `GreenhouseChip` | consistencia con el chip de desenlace de `TASK-1766` | `borderRadius` calculado en la vista |

**El mapa de tonos de desenlace de `TASK-1766` NO se aplica acá.** Aquel mapea seis desenlaces terminales; éste mapea un eje de progreso con dos estados. Lo que se reusa es la primitive, su tamaño, su ubicación y la regla de un chip por eje — no la tabla de tonos.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| A | Menú de etapa | Mover de etapa por teclado | `IconButton` (`hiring-card-stage-menu`) | `LANES` (`PipelineDeskView.tsx:70`) |
| B1 | Identidad | Quién es y por dónde llegó | `Avatar` + `Typography` | `candidateName`, `candidateInitials`, `application.source` |
| B2.1 | Chip de test | Evidencia del candidato | `GreenhouseChip kind='status'` | `application.explainability.assessment` + `application.score` |
| **B2.2** | **Chip de entrevista** | **Evidencia del equipo evaluador** | **`GreenhouseChip kind='status'`** | **`interviewScorecardProgress` (campo nuevo del DTO del desk)** |
| B3 | Pie | Antigüedad + guardado | `Typography` | `application.createdAt`, estado local `savingIds` |

## Copy Ledger

| Copy id | Region | Text (es-CL) | Dynamic values | Notes |
|---|---|---|---|---|
| `hiringDesk.pipeline.tagInterviewOpen` | B2.2 | `Entrevista en evaluación` | — | Hay al menos un scorecard sin cerrar |
| `hiringDesk.pipeline.tagInterviewClosed` | B2.2 | `Entrevista evaluada` | — | Todos los scorecards de la postulación están `submitted` o `scored` |
| `hiringDesk.pipeline.tagInterviewOwnPending` | B2.2 | `Tu evaluación pendiente` | — | El operador que mira tiene scorecard propio abierto; gana sobre los dos anteriores |
| `hiringDesk.pipeline.tagInterviewUnknown` | B2.2 | `Entrevista sin dato` | — | Sólo si el agregado degrada; nunca se pinta como ausencia |
| `hiringDesk.pipeline.interviewProgressAria` | B2.2 | `Entrevista: {state} · {closed} de {total} evaluaciones cerradas` | `{state}`, `{closed}` (0-n), `{total}` (1-n) | Va al `title` del chip y al nombre accesible de la tarjeta |
| `hiringDesk.pipeline.interviewProgressAriaOwn` | B2.2 | `Entrevista: tu evaluación está pendiente` | — | Variante sin conteo para el evaluador con scorecard propio abierto |

Paridad obligatoria en `src/lib/copy/dictionaries/en-US/hiringDesk.ts`: `Interview in review` · `Interview reviewed` · `Your review is pending` · `Interview status unavailable`. El tipo `HiringDeskCopy.pipeline` (`src/lib/copy/types.ts:451`) es el que fuerza esa paridad en compilación.

Registro y tono: tuteo es-CL, sustantivo neutro, **nunca** género concordado con la persona candidata. «Entrevista evaluada» describe el proceso; «Candidata evaluada» describiría a la persona y está prohibido por la misma razón que el ADR fija los sustantivos neutros del desenlace.

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Entrevista evaluada` / `Entrevista en evaluación` | — (el chip es la única superficie de texto) | Abrir la postulación para ver el detalle | Estado nominal; un solo chip |
| loading | — | — | — | La tarjeta no tiene carga propia: el snapshot llega resuelto desde el server component. Durante un cambio de etapa la tarjeta ya muestra «Guardando cambio…» y el chip **se mantiene visible** |
| empty | (sin chip) | — | — | Ninguna evaluación de entrevista asignada. Es el estado NORMAL y mayoritario hoy: ausencia de chip significa «no hay eje que reportar», nunca «falla» |
| partial | `Entrevista en evaluación` | `title`: «2 de 3 evaluaciones cerradas» | Abrir la postulación | Hay más de un evaluador y sólo algunos cerraron. El conteo vive en `title`/aria, no en la etiqueta visible |
| error | `Entrevista sin dato` | — | Recargar el tablero | Sólo si el agregado degrada de forma observable. **Prohibido** pintar el fallo como ausencia de chip: sería indistinguible de «no hay evaluación asignada», que es el bug class que este dominio ya pagó |
| denied | (no aplica dentro de la tarjeta) | — | — | Sin `hiring.application.read` la ruta redirige a `/401` antes de renderizar el tablero; no existe una tarjeta a medio permiso |

## Accessibility Contract

- **Hallazgo verificado y bloqueante:** el cuerpo de la tarjeta es un `button` con `aria-label={candidateName · openApplication}` (`PipelineDeskView.tsx:350`). Un `aria-label` **reemplaza** el contenido para tecnología asistiva, así que el chip de test que hoy vive dentro de ese botón **no se anuncia**. Agregar un segundo chip sin corregirlo duplicaría un defecto existente.
- Remedio dentro del alcance: componer el nombre accesible de la tarjeta con los estados de ambos ejes — `{candidateName} · {tagTest} · {tagInterview} · {openApplication}` — usando las claves del copy ledger. No se toca la estructura del botón.
- Heading order: sin cambios; la tarjeta no introduce headings.
- Aria labels: el chip es decorativo-informativo, sin rol propio (`aria-hidden` en el ícono, texto real en el DOM). No se le agrega `role='status'`: no es una región viva, y el `aria-live` del tablero ya anuncia los cambios de etapa.
- Focus notes: el chip **no es focusable**. No se agregan `tabIndex`, `title` interactivo ni tooltip con foco: eso metería un elemento interactivo dentro de un `button`, que es HTML inválido y rompe el orden de tabulación.
- Color-independent state labels: cada estado tiene texto propio e ícono propio. El tono nunca es el único portador del significado — requisito duro, porque abierto y cerrado son warning/info y esos dos tonos son cercanos en modo oscuro.
- Contraste: los tonos salen de `GreenhouseChip`, que ya resuelve AA sobre `lightOpacity`. Se verifica en la pasada GVC de accesibilidad, no se asume.

## Implementation Mapping

- Route / surface: `/agency/hiring/pipeline` → `src/app/(dashboard)/agency/hiring/pipeline/page.tsx` → `src/views/greenhouse/hiring/PipelineDeskView.tsx` (función `card`, línea 258).
- Primitives: `GreenhouseChip` (`src/components/greenhouse/primitives/GreenhouseChip.tsx`).
- Variants / kinds: `kind='status'`, `variant='label'`, `size='small'`, `tone='warning'|'info'|'default'`.
- Component candidates: un helper local `interviewProgressChip(item)` dentro de `PipelineDeskView`, hermano del `testTag` vigente. No nace componente nuevo: dos chips en una tarjeta no justifican una primitive.
- Copy source: `src/lib/copy/types.ts` (`HiringDeskCopy.pipeline`) + los dos diccionarios. Cero literales en JSX.
- Data reader / command: `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:81`) gana un agregado batcheado sobre `greenhouse_hiring.hiring_assessment` filtrando `method = 'interviewer_scorecard'` y agrupando por `application_id`. **Nunca** `listAssessmentsForApplication` en bucle: ese reader es por postulación y produciría N+1 sobre 120 tarjetas.
- Predicado propio: `getOwnScorecardStateForApplication` (`src/lib/hiring/assessment/instances.ts:673`) ya existe y ya define qué es «cerrado» (`submitted`/`scored`). Se reusa; **no** se reescribe el literal de estados en la vista.
- API parity: el campo viaja en el mismo DTO que sirve `GET /api/hiring/desk` (`src/app/api/hiring/desk/route.ts`), así que Nexa y MCP lo leen por construcción. No se crea endpoint.
- Access / capability: sin capability nueva. `hiring.opening.read` + `hiring.application.read`, ya exigidas por la ruta y por la API.
- Runtime consumers: vista del pipeline + `GET /api/hiring/desk`.
- Print/email/PDF considerations: ninguna. El eje es interno y nunca cruza al candidato ni a un correo.
- GVC markers: `data-capture="hiring-card-interview-progress"` en el chip; el contenedor `hiring-application-card` ya existe y se usa como `clipSelector`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/task355-hiring-pipeline-board.scenario.ts` (existe). Se extiende con un `mark` nuevo; no se crea escenario paralelo.
- Route: `/agency/hiring/pipeline?captureFailure=stage`
- Viewports: `desktop 1440×900` y `mobile 390×844` (ambos ya declarados en el escenario).
- Quality profile: `premium`
- Required steps: `press Escape` → `sleep 250` → `mark pipeline-default` → **`mark pipeline-card-progress-axes` con `clipSelector: '[data-capture="hiring-application-card"]'`** → el resto del escenario vigente (menú de etapa + rollback) sin cambios.
- Required captures: tarjeta con un solo eje; tarjeta con los dos ejes; tarjeta sin ningún eje; los tres en desktop y en 390 px.
- Required `data-capture` markers: `hiring-application-card`, `hiring-card-interview-progress`, `hiring-pipeline-board`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, `failOnConsoleError`; `quality.layout.failOnViolations: true` ya activo.
- Scroll-width checks: el `allowHorizontalScrollSelectors` del escenario permite scroll en `[data-capture="hiring-pipeline-board"]` y en `[data-capture="hiring-tabs"]`. La aserción de esta task es que **`hiring-application-card` no aparezca nunca en esa lista**: si la tarjeta necesita scroll horizontal para caber, el diseño está mal, no el gate.
- Accessibility/focus checks: `quality.accessibility` sobre `body`; además, comprobación manual de que el nombre accesible de la tarjeta ya incluye los estados de ambos ejes.
- Reduced-motion evidence: no aplica — el eje no introduce ni movimiento ni retardo. La tarjeta conserva su `@media (prefers-reduced-motion: reduce)` vigente.
- Review dossier: `required` — `pnpm fe:capture:review task355-hiring-pipeline-board`.
- Baseline: `surfaceId hiring-pipeline-board`; la comparación before/after se hace con `pnpm fe:capture:diff` contra la captura previa al cambio.

## Design Decision Log

- Decision: exponer el estado del `interviewer_scorecard` como un **chip de estado** en el mismo slot donde ya vive el chip de test, con etiqueta textual y un chip por eje.
- Alternatives considered:
  1. **Sub-valores de la etapa `interview`** (un enum `interview_scheduled` / `interview_done`): rechazada. Duplica un dato que ya existe en `hiring_assessment` y repite exactamente el error que produjo cuatro etapas terminales espejo del desenlace.
  2. **Un badge numérico** («2/3»): rechazada. Sin etiqueta no se entiende de qué son esos números, y el conteo pierde sentido en el caso mayoritario de un solo evaluador.
  3. **Un ícono sin texto**: rechazada por la regla de estado color-independiente y porque el ícono solo no distingue «pendiente» de «sin asignar».
  4. **Mostrarlo sólo en la columna «Entrevista»**: rechazada. El scorecard sobrevive al cambio de etapa; ocultarlo en «Decisión» borraría justo la evidencia que sostiene esa decisión.
  5. **Incluir el conteo en la etiqueta visible**: rechazada por densidad. La tarjeta ya carga cuatro filas de información; el conteo vive en `title` y en el nombre accesible.
- Why this pattern: la tarjeta ya enseñó al operador que «un chip pequeño arriba del pie = estado de una evidencia». El eje nuevo entra en un vocabulario existente en vez de inventar uno.
- Reuse / extend / new primitive: `reuse` de `GreenhouseChip kind='status'`. Cero primitives nuevas.
- Open risks:
  - **Anclaje entre evaluadores.** Aunque el chip no lleva rating, saber que los demás ya cerraron puede empujar a alinearse. Mitigación propuesta: cuando el operador tiene scorecard propio abierto, la tarjeta muestra `Tu evaluación pendiente` **sin** el agregado de los demás, reusando `getOwnScorecardStateForApplication`. Es la misma decisión que el Expediente de Evaluación ya tomó.
  - **Alcance real de `UI impact`.** La task declara `copy` porque el slot B2 ya existe. Si la implementación necesita introducir un contenedor de fila nuevo con envoltura, el agente que ejecuta debe re-declarar `UI impact: layout` **antes** de escribir JSX, no después.
  - **Dirección visual dura ausente.** Por eso `UI ready: no`. El benchmark repo-native alcanza para fijar el contrato, no para declarar la superficie lista.
- Follow-up: el agendamiento de entrevistas **no es de esta task** — lo posee `TASK-1769` (`docs/tasks/to-do/TASK-1769-hiring-interview-scheduling-graph.md`), que agenda por Microsoft Graph y guarda la referencia del evento sin ser dueño del calendario. Este mismo slot B2 es el que recibiría esa referencia cuando exista, y por eso el eje se diseña como agregado extensible y no como un booleano. Nada de eso se adelanta acá: ni campo, ni estado, ni copy.

## Acceptance Checklist

- [ ] Todas las cadenas visibles están en el copy ledger y en los dos diccionarios.
- [ ] Los valores dinámicos (`{state}`, `{closed}`, `{total}`) están nombrados y acotados.
- [ ] Los estados parcial y degradado son explícitos y distinguibles de la ausencia.
- [ ] Ninguna etiqueta afirma un resultado de la evaluación: el eje reporta progreso, nunca juicio.
- [ ] El chip no es focusable y el nombre accesible de la tarjeta ya incluye ambos ejes.
- [ ] El plan GVC es ejecutable con `pnpm fe:capture task355-hiring-pipeline-board`.
- [ ] El log de decisión explica reuso antes de que empiece el JSX.
