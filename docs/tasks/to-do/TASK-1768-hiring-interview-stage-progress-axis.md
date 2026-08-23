# TASK-1768 — La columna «Entrevista» es la única sin eje de progreso, y el que ya existe no se ve

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `copy`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1768-hiring-interview-stage-progress.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-011`
- Status real: `Diseno — cero codigo. El scorecard de entrevista YA existe en el dominio y NO se pinta en la tarjeta; el agendamiento no existe en absoluto y queda tras una pregunta abierta`
- ADR: `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- Rank: `TBD`
- Domain: `hr|ui`
- Blocked by: `TASK-1766`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hacer visible en la tarjeta del pipeline el estado del `interviewer_scorecard` que **ya existe** en el
dominio, con el mismo chip de estado que `TASK-1766` introduce para el desenlace. Y dejar escrito, como
contrato del dominio, por qué las demás columnas **no** reciben sub-enums propios: cada una ya tiene su eje
de progreso en un campo aparte, y convertir esos ejes en sub-valores de la etapa repetiría el error que
produjo cuatro etapas terminales redundantes.

## Why This Task Exists

Al revisar el ADR del vocabulario surgió una pregunta legítima: si la etapa terminal tiene desenlace,
¿las demás etapas también tienen categorías? La respuesta, verificada contra el repositorio, es que
**casi todas ya lo tienen — y ninguno de esos ejes es un sub-valor de la etapa**:

| Columna | Su eje de progreso | ¿Existe? |
|---|---|---|
| Sourced | `source` — 7 valores en `CANDIDATE_SOURCES` (`src/types/hiring.ts:89`), campo propio de la postulación | **sí** |
| Evaluación | el estado del assessment del candidato | **sí**, y ya se pinta en la tarjeta (`PipelineDeskView.tsx:262`) |
| Decisión | la pausa `on_hold`, que el ADR sacó del enum de desenlaces justo para que viva acá (`src/lib/hiring/decide.ts:32` la mapea a `decision_pending`) | **sí** |
| **Entrevista** | — | **NO** |

La distinción que hace que esto no sea simetría decorativa:

> **El desenlace es terminal, único, obligatorio y final. El progreso es transitorio, puede ser múltiple,
> es opcional y se resuelve avanzando.**

Un desenlace cierra el recorrido y obliga a declararlo (`stage = 'closed' ⟺ desenlace declarado`). Un eje
de progreso no cierra nada: describe en qué va algo que sigue en movimiento, admite varios valores a la vez
(tres evaluadores, tres scorecards) y desaparece solo cuando la postulación avanza.

Por eso **un eje de progreso no se modela como sub-valor de la etapa**: duplicaría un dato que ya vive en su
propio campo. Ese es exactamente el error que el ADR corrigió — `selected`, `backup`, `rejected` y
`withdrawn` eran etapas que espejaban el desenlace, y el command escribía el mismo valor en dos columnas
sin que la etapa aportara un bit.

Y hay un hueco real detrás de la simetría: la mitad evaluativa de la entrevista **ya existe y no se ve**.
`interviewer_scorecard` es uno de los dos métodos de assessment (`src/types/hiring-assessment.ts:24`), se
asigna con `assignInterviewerScorecard` naciendo en estado `in_progress`, y tiene su predicado anti-anclaje
propio (`getOwnScorecardStateForApplication`, `src/lib/hiring/assessment/instances.ts:673`). Pero la tarjeta
del pipeline sólo pinta el chip del test del candidato. El operador que barre la columna «Entrevista» ve
seis tarjetas idénticas y no puede distinguir cuál ya tiene evidencia evaluada.

## Goal

- La tarjeta del pipeline muestra el estado del `interviewer_scorecard` de la postulación, con etiqueta
  textual, tono e ícono, reusando el chip de estado que `TASK-1766` fija en esa misma tarjeta.
- El estado sale del reader canónico del desk, así que `GET /api/hiring/desk` y sus consumidores
  programáticos lo reciben por construcción, sin endpoint nuevo.
- Queda escrito en la arquitectura del dominio el criterio que impide agregar sub-enums por columna por
  imitación, con su regla verificable.
- Queda declarado dónde vive el agendamiento de entrevistas: es de `TASK-1769`, no de esta task. Acá sólo
  se deja el consumo futuro de su referencia, sin adelantar ni un campo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **NUNCA** convertir un eje de progreso en sub-valor de la etapa. La etapa dice dónde va la persona; el
  progreso dentro de esa etapa vive en su propio campo, que en el caso de la entrevista ya existe.
- **NUNCA** un eje nuevo sin ramificación real. Regla del dominio, verificable en revisión:

  > **Un eje nuevo se justifica sólo si el sistema ramifica por él. Si nadie ramifica, es una nota, no un
  > enum.**

- **NUNCA** exponer puntaje, banda, rúbrica, rating ni identidad del evaluador en la tarjeta. El eje reporta
  progreso, jamás juicio.
- **NUNCA** reimplementar el predicado anti-anclaje en el cliente. `getOwnScorecardStateForApplication` es
  server-only y es el único que define qué cuenta como scorecard cerrado (`submitted`/`scored`).
- **NUNCA** resolver el estado con un reader por postulación dentro de un bucle: el tablero carga hasta 120
  tarjetas y `listAssessmentsForApplication` produciría N+1.
- **NUNCA** pintar un fallo del agregado como ausencia de chip: ausencia significa «no hay evaluación
  asignada», y confundirlo con «no pude leerlo» es el bug class que este dominio ya pagó con los cuatro
  estados de escaneo colapsados en un solo mensaje.
- **SIEMPRE** el copy visible sale de `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`; cero literales
  en JSX.

## Normative Docs

- `docs/ui/wireframes/TASK-1768-hiring-interview-stage-progress.md` — contrato visible, copy ledger, estados,
  accesibilidad y plan GVC de esta task.
- `docs/audits/hiring/GREENHOUSE_HIRING_STAGE_VOCABULARY_AUDIT_2026-08-22.md` — evidencia de los 30 hallazgos
  que sostienen el ADR.
- `.claude/skills/greenhouse-talent-people-operator/SKILL.md` — doctrina de entrevista estructurada y
  anti-anclaje; se carga antes de tocar cualquier superficie de evaluación.

## Dependencies & Impact

### Depends on

- `TASK-1766` — introduce el `GreenhouseChip kind='status'` en la tarjeta y su ubicación. Esta task reusa esa
  primitive y esa ubicación; empezar antes obligaría a inventar el chip dos veces.
- `greenhouse_hiring.hiring_assessment` con `method = 'interviewer_scorecard'` — ya existe, con datos.
- `getOwnScorecardStateForApplication` (`src/lib/hiring/assessment/instances.ts:673`) — ya existe.
- `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:81`) — reader canónico del tablero.

### Blocks / Impacts

- `TASK-1754` — colapsa el enum de etapas. No hay conflicto de superficie: 1754 toca `LANES` y el enum;
  esta task toca el interior de la tarjeta. Coordinar sólo el orden de merge sobre `PipelineDeskView.tsx`.
- `TASK-1765` / `TASK-1766` — desenlace y su causa. Esta task **no** los toca; sólo consume el chip.
- `TASK-1769` — agendamiento de entrevistas por Microsoft Graph
  (`docs/tasks/to-do/TASK-1769-hiring-interview-scheduling-graph.md`). **Impacto futuro, no bloqueo.** Cuando
  esa task produzca la referencia del evento —identificador, enlace de reunión y cuándo—, la tarjeta del
  pipeline la consume en el mismo eje que esta task abre. El slice ejecutable de acá (hacer visible el
  scorecard que ya existe) **no depende** de que 1769 exista: por eso `Blocked by` sigue siendo sólo
  `TASK-1766`.

### Files owned

- `docs/tasks/to-do/TASK-1768-hiring-interview-stage-progress-axis.md`
- `docs/ui/wireframes/TASK-1768-hiring-interview-stage-progress.md`
- `src/views/greenhouse/hiring/PipelineDeskView.tsx` (función `card`, slot de chips)
- `src/lib/hiring/desk.ts` (agregado del eje de entrevista)
- `src/types/hiring.ts` (`HiringDeskApplicationSummary`)
- `src/lib/copy/types.ts` (`HiringDeskCopy.pipeline`)
- `src/lib/copy/dictionaries/es-CL/hiringDesk.ts`
- `src/lib/copy/dictionaries/en-US/hiringDesk.ts`
- `scripts/frontend/scenarios/task355-hiring-pipeline-board.scenario.ts`

## Current Repo State

### Already exists

- **El método de evaluación por entrevista.** `ASSESSMENT_METHODS = ['candidate_test', 'interviewer_scorecard']`
  (`src/types/hiring-assessment.ts:24`). El scorecard se crea con `assignInterviewerScorecard`
  (`src/lib/hiring/assessment/instances.ts:419`) y nace directamente en `in_progress`: no pasa por
  `assigned`/`sent`, porque esos dos estados pertenecen al envío de un test al candidato.
- **La definición de «cerrado».** `CLOSED_SCORECARD_STATUSES = ['submitted', 'scored']`
  (`instances.ts:663`), consumida por `getOwnScorecardStateForApplication`, por `listResponses` y por el
  filtro del Expediente de Evaluación. Es el predicado anti-anclaje del dominio y ya está probado.
- **El precedente visual exacto.** La tarjeta ya pinta el chip del test del candidato
  (`PipelineDeskView.tsx:262` lo calcula, `:405` lo renderiza) con dos estados, dos tonos y dos íconos.
  El eje de entrevista es su hermano.
- **El reader canónico del tablero.** `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:81`) ya batchea
  identidades y facets con `= ANY($1::text[])`, y ya aplica el filtro de procedencia. El agregado nuevo
  entra en ese mismo patrón.
- **La ruta programática.** `GET /api/hiring/desk` (`src/app/api/hiring/desk/route.ts`) sirve el mismo DTO
  bajo `hiring.opening.read` + `hiring.application.read`.

### Gap

- **La tarjeta no dice nada de la entrevista.** `HiringDeskApplicationSummary` (`src/types/hiring.ts:305`)
  no tiene ningún campo de scorecard, y `explainability.assessment` sólo lo escribe el rollup de
  competencias del test (`src/lib/hiring/assessment/scoring.ts:372`). Una postulación con tres scorecards
  cerrados se ve idéntica a una sin ninguno.
- **El agendamiento no existe en absoluto, y ya tiene dueña.** Cero archivos con `interview_scheduled`,
  `scheduled_at`, `interview_date` o equivalentes bajo `src/lib/hiring/`. No hay fecha, no hay entrevistador
  citado, no hay recordatorio. No es que esté a medias: no está. Construirlo es `TASK-1769`; esta task no
  crea ni uno de esos campos.
- **El chip existente no se anuncia.** El cuerpo de la tarjeta es un `button` con
  `aria-label={candidateName · openApplication}` (`PipelineDeskView.tsx:350`), y un `aria-label` reemplaza el
  contenido para tecnología asistiva. El chip de test que vive dentro de ese botón es invisible para lectores
  de pantalla desde que se creó. Agregar un segundo chip sin corregirlo duplica el defecto.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/desk.ts` (agregado), `src/views/greenhouse/hiring/PipelineDeskView.tsx` (chip) y `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts` (copy)
- Future candidate home: `portal`
- Boundary: el primitive es el reader `getHiringDeskSnapshot`; la vista del pipeline y `GET /api/hiring/desk` son consumidores y no recomputan el estado
- Server/browser split: la agregación SQL y el predicado de scorecard propio corren server-only en `src/lib/hiring/**`; `PipelineDeskView` es Client Component y recibe el DTO ya resuelto, sin importar stores ni acceso a base de datos
- Build impact: none — sin dependencias nuevas ni entradas de filesystem
- Extraction blocker: none — lectura pura sobre un schema del propio dominio, sin transacción compartida ni provider externo

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: reclutador y People Ops en el tablero (`efeonce_admin`, `hr_manager`, `efeonce_operations`).
- Momento del flujo: barrido diario de la columna «Entrevista» antes de decidir a quién empujar.
- Resultado perceptible esperado: distinguir de un vistazo una entrevista ya evaluada de una que sigue
  esperando a alguien.
- Fricción que debe reducir: abrir postulación por postulación para averiguar si el scorecard ya se cerró.
- No-goals UX: mostrar puntaje o banda; nombrar al evaluador; ofrecer una acción desde la tarjeta.

### Surface & system decision

- Surface: tarjeta del pipeline en `/agency/hiring/pipeline`.
- Nav placement: `none` — no agrega destino nuevo.
- Composition Shell: `no aplica` — el tablero y la tarjeta ya existen; el cambio ocurre dentro de un slot vigente.
- Primitive decision: `reuse` — `GreenhouseChip kind='status' size='small'`.
- Adaptive density / The Seam: `aplica` — la fila de chips envuelve antes de truncar; el texto del estado nunca se corta.
- Floating/Sidecar/Dialog decision: no aplica; el eje es lectura pura sin superficie flotante.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringDesk.ts`
- Access impact: `none` — sin capability nueva.

### State inventory

- Default: un chip con el estado agregado del scorecard.
- Loading: la tarjeta no tiene carga propia; el snapshot llega resuelto del server component.
- Empty: sin scorecard asignado, sin chip. Es el estado normal y mayoritario hoy.
- Error: si el agregado degrada, `Entrevista sin dato`; prohibido pintarlo como ausencia.
- Degraded / partial: varios evaluadores con sólo algunos cerrados, con el conteo en `title` y aria.
- Permission denied: la ruta ya redirige a `/401`; no hay tarjeta a medio permiso.
- Long content: nombre largo a dos líneas y fila de chips envolviendo; sin scroll horizontal en la tarjeta.
- Mobile / compact: 390 px con la fila de chips apilada.
- Keyboard / focus: el chip no es focusable; el foco sigue siendo cuerpo de tarjeta y menú ⋮.
- Reduced motion: sin cambios; la tarjeta conserva su regla vigente de preferencia reducida.

### Interaction contract

- Primary interaction: abrir la postulación; el chip informa y no compite.
- Hover / focus / active: sin estado propio del chip; hereda el de la tarjeta.
- Pending / disabled: durante el guardado de etapa el chip se atenúa con la tarjeta y conserva su texto.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: el indicador «Guardando cambio…» vigente.
- Toast / alert behavior: sin cambios.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin efecto propio; el chip aparece con la tarjeta.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: la regla vigente de la tarjeta ya cubre la preferencia reducida.
- Non-goal motion: nada parpadea, nada pulsa. Un estado de evaluación no es una notificación.

### Implementation mapping

- Route / surface: `/agency/hiring/pipeline` → `PipelineDeskView.tsx`, función `card`.
- Primitive / variant / kind: `GreenhouseChip` · `variant='label'` · `kind='status'` · `size='small'`.
- Component candidates: helper local hermano de `testTag`; sin componente nuevo.
- Copy source: `HiringDeskCopy.pipeline` en los dos diccionarios.
- Data reader / command: `getHiringDeskSnapshot` con agregado batcheado sobre `hiring_assessment`.
- API parity: el campo viaja en el DTO que ya sirve `GET /api/hiring/desk`.
- Access / capability: `hiring.opening.read` + `hiring.application.read`, sin capability nueva.
- States to implement: default, empty, partial, degradado, y el nombre accesible corregido.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task355-hiring-pipeline-board.scenario.ts`
- Route: `/agency/hiring/pipeline?captureFailure=stage`
- Viewports: `1440×900` y `390×844`
- Quality profile: premium
- Required steps: marca nueva `pipeline-card-progress-axes` con `clipSelector` sobre la tarjeta, antes de los pasos vigentes del menú de etapa.
- Required captures: tarjeta con un eje, con dos ejes y sin ninguno, en ambos viewports.
- Required `data-capture` markers: `hiring-application-card`, `hiring-card-interview-progress`.
- Assertions: `noLoginRedirect`, `noErrorBoundary`, sin errores de consola.
- Scroll-width checks: `hiring-application-card` nunca entra en `allowHorizontalScrollSelectors`.
- Reduced-motion / focus evidence: comprobación de que el chip no toma foco y de que el nombre accesible de la tarjeta incluye ambos ejes.
- Review dossier: `pnpm fe:capture:review task355-hiring-pipeline-board`
- Baseline decision / surface ID: `hiring-pipeline-board`, comparación before/after con `pnpm fe:capture:diff`.

### Design decision log

- Decision: chip de estado en el slot de chips vigente, un chip por eje.
- Alternatives considered: sub-enum de etapa; badge numérico sin etiqueta; ícono sin texto; mostrarlo sólo en la columna «Entrevista».
- Why this pattern: la tarjeta ya enseñó que un chip pequeño sobre el pie es el estado de una evidencia.
- Reuse / extend / new primitive: `reuse`.
- Open risks: anclaje entre evaluadores; que la fila de chips necesite un contenedor nuevo y el alcance real supere `copy`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment` filtrado por `method = 'interviewer_scorecard'`
- Consumidores afectados: vista del pipeline, `GET /api/hiring/desk`, y por construcción Nexa/MCP
- Runtime target: `local` y `staging` antes de producción; sin worker ni cron

### Contract surface

- Contrato existente a respetar: `getHiringDeskSnapshot` (`src/lib/hiring/desk.ts:81`), `HiringDeskApplicationSummary` (`src/types/hiring.ts:305`), `getOwnScorecardStateForApplication` (`src/lib/hiring/assessment/instances.ts:673`)
- Contrato nuevo o modificado: campo aditivo `interviewScorecardProgress` en el DTO de la postulación del desk, con estado agregado, conteo cerrado/total y marca de scorecard propio abierto
- Backward compatibility: `compatible` — campo aditivo; un consumidor que lo ignore sigue funcionando igual
- Full API parity: la regla vive en el reader del dominio, no en el componente. La vista lo pinta y la API lo sirve del mismo objeto; ningún consumidor recalcula el estado

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_assessment` (sólo lectura)
- Invariantes que no se pueden romper:
  - «Cerrado» es exactamente `submitted` o `scored`; el literal vive en `CLOSED_SCORECARD_STATUSES` y no se reescribe en otro archivo.
  - El agregado nunca expone puntaje, respuesta, rúbrica ni identidad del evaluador; sólo cuenta estados.
  - Un solo `= ANY($1::text[])` sobre las postulaciones ya cargadas; jamás una consulta por tarjeta.
  - El filtro de procedencia se hereda por JOIN desde la postulación, que ya viene filtrada; no se agrega columna de procedencia al assessment.
- Write-target allowlist: N/A — la task no escribe en ninguna tabla, así que no agrega destinos al allowlist de `src/lib/hiring/boundary-domain.test.ts`
- Tenant/space boundary: el tablero es interno; la ruta ya exige contexto de tenant interno y las dos capabilities de lectura
- Idempotency/concurrency: N/A — camino de lectura sin efectos
- Audit/outbox/history: none — leer un estado agregado no es un hecho auditable; el ciclo de vida del scorecard ya emite sus propios eventos

### Migration, backfill and rollout

- Migration posture: `none` — la tabla y sus estados ya existen
- Default state: `enabled with rationale` — el campo es aditivo y su ausencia de datos se traduce en ausencia de chip, que es el comportamiento actual exacto
- Backfill plan: none — no hay dato que rellenar
- Rollback path: revertir el PR; el campo desaparece del DTO y la tarjeta vuelve a un solo chip
- External coordination: none

### Security and access

- Auth/access gate: sesión interna + `hiring.opening.read` + `hiring.application.read`, ya exigidas por la ruta y por la API
- Sensitive data posture: sin PII nueva. El agregado son conteos de estado; no viaja nombre de evaluador ni respuesta
- Error contract: la API del desk ya usa el contrato canónico de errores; el agregado no introduce códigos nuevos
- Abuse/rate-limit posture: none con razón — superficie interna autenticada, ya acotada por los límites del snapshot

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/hiring`, `pnpm local:check`
- DB/runtime checks: consulta de sólo lectura contra PG por el proxy para confirmar la distribución real de estados de `interviewer_scorecard` antes de fijar los estados del chip
- Integration checks: `GET /api/hiring/desk` en local devolviendo el campo nuevo
- Reliability signals/logs: ninguna señal nueva; el eje no tiene estado estable que vigilar
- Production verification sequence: abrir el tablero en staging con una postulación que tenga scorecard cerrado y otra sin ninguno, y comprobar que las dos se ven distintas

### Acceptance criteria additions

- [ ] La fuente de verdad, el contrato y los consumidores están nombrados con rutas reales.
- [ ] El predicado de «cerrado» se reusa y no se reescribe.
- [ ] La consulta es batcheada y se demuestra que no hay una consulta por tarjeta.
- [ ] La task no agrega destinos de escritura, y eso queda declarado explícitamente.

## Hybrid Execution Justification

- Why not split: el trabajo backend es un campo aditivo en un reader que ya existe, con una sola consulta
  agregada y sin migración, sin escritura y sin evento. Partirlo dejaría una task backend cuyo único
  consumidor es esta misma tarjeta, y cuyo valor no se puede verificar sin la pantalla. El riesgo real no
  está en el dato sino en la superficie: qué se muestra, con qué palabras y sin anclar al evaluador.
- Primary execution profile: `ui-ux`. El backend es el insumo mínimo de la superficie.
- Contract boundary: el reader `getHiringDeskSnapshot` es el primitive; `PipelineDeskView` y
  `GET /api/hiring/desk` lo consumen. La vista no consulta la base ni deriva el estado.
- Risk controls: cambio aditivo y reversible con un revert; sin migración, sin escritura, sin flag; el orden
  interno de ejecución está fijado en `Slice ordering hard rule` — primero el reader con su prueba, después
  la superficie con su evidencia GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El eje viaja en el reader

- Agregado batcheado en `getHiringDeskSnapshot` sobre `greenhouse_hiring.hiring_assessment`, filtrando
  `method = 'interviewer_scorecard'` y agrupando por `application_id`, sobre las postulaciones ya cargadas.
- Campo aditivo `interviewScorecardProgress` en `HiringDeskApplicationSummary`, con estado agregado, conteo
  de cerrados y total, y marca de scorecard propio abierto derivada del predicado vigente.
- Prueba de que el reader emite un solo agregado y no una consulta por postulación.

### Slice 2 — El eje se ve en la tarjeta

- Chip de estado en el slot de chips de la tarjeta, reusando la primitive que `TASK-1766` fija ahí.
- Claves de copy nuevas en `HiringDeskCopy.pipeline` y en los diccionarios es-CL y en-US.
- Nombre accesible de la tarjeta compuesto con los estados de ambos ejes, para cerrar el defecto de
  `aria-label` que hoy silencia también al chip de test.
- Marca `data-capture="hiring-card-interview-progress"` y paso nuevo en el escenario GVC vigente.

### Slice 3 — La regla queda escrita

- Delta en `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` con la tabla de ejes por columna, la
  distinción desenlace/progreso y la regla de ramificación.
- Delta funcional en `docs/documentation/hr/hiring-desk.md` explicando qué significa cada estado del chip.

## Out of Scope

- **El desenlace y su causa.** Son `TASK-1765` y `TASK-1766`. Esta task no toca el enum de desenlaces, ni la
  causa gobernada, ni el chip de la columna «Cerrado» más allá de reusar su primitive.
- **El scorecard como instrumento de evaluación.** El método, la rúbrica, los ratings, el anti-anclaje y el
  Expediente de Evaluación ya existen y no se rediseñan. Esta task los muestra, no los cambia.
- **El agendamiento de entrevistas: es de `TASK-1769`.** No es «bloqueado hasta decidir» — la decisión ya
  se tomó y el trabajo salió con identificador propio
  (`docs/tasks/to-do/TASK-1769-hiring-interview-scheduling-graph.md`). Ningún slice de esta task crea fecha,
  invitación, enlace de reunión, recordatorio ni integración de calendario, y ningún agente debe adelantar
  aquí un campo que pertenece a esa task.
- **El colapso del enum de etapas.** Es `TASK-1754`.
- **Sub-enums para las columnas Sourced, Evaluación y Decisión.** Sus ejes ya existen en campos propios;
  crearlos sería la duplicación que esta task viene justamente a impedir.

## Detailed Spec

### El agregado

Una consulta, con las postulaciones ya cargadas por el snapshot:

```sql
SELECT application_id,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status IN ('submitted', 'scored'))::int AS closed
FROM greenhouse_hiring.hiring_assessment
WHERE method = 'interviewer_scorecard'
  AND application_id = ANY($1::text[])
GROUP BY application_id
```

Los dos literales de estado no se escriben a mano en ese SQL: salen de `CLOSED_SCORECARD_STATUSES`
(`src/lib/hiring/assessment/instances.ts:663`), que es la definición canónica de «cerrado» que ya consumen el
Expediente de Evaluación y el filtro de ratings ajenos.

### El estado agregado

| Situación | Estado | Copy | Tono |
|---|---|---|---|
| `total = 0` | ausencia | sin chip | — |
| El operador tiene scorecard propio abierto | `own_pending` | `Tu evaluación pendiente` | `warning` |
| `closed < total` | `open` | `Entrevista en evaluación` | `warning` |
| `closed = total` y `total > 0` | `closed` | `Entrevista evaluada` | `info` |
| El agregado degradó | `unknown` | `Entrevista sin dato` | `default` |

`own_pending` gana sobre los demás: es la variante anti-anclaje. Cuando el operador que mira tiene su propio
scorecard abierto, la tarjeta le muestra su estado y **no** el agregado de sus pares, para no empujarlo a
alinearse con quienes ya cerraron. Es la misma decisión que ya tomó el Expediente de Evaluación, y por eso
se resuelve con el mismo predicado (`getOwnScorecardStateForApplication`) y no con una regla paralela.

El conteo `closed` de `total` viaja al `title` del chip y al nombre accesible de la tarjeta, nunca a la
etiqueta visible: la tarjeta ya carga cuatro filas de información y un «2/3» sin contexto no se entiende.

### Por qué las otras tres columnas no reciben nada

| Columna | Eje | Dónde vive | Por qué no se toca |
|---|---|---|---|
| Sourced | `source` | `hiring_application.source`, 7 valores | Campo propio y ya visible en la tarjeta con su ícono |
| Evaluación | estado del test del candidato | `hiring_assessment` con `method = 'candidate_test'` | Ya se pinta como chip |
| Decisión | la pausa | `decision = 'on_hold'`, mapeada a `decision_pending` | El ADR la sacó del enum de desenlaces precisamente para que viviera acá |
| Entrevista | scorecard del evaluador | `hiring_assessment` con `method = 'interviewer_scorecard'` | Existe y no se ve — es el hueco que esta task cierra |

La prueba que decide si un eje merece existir es siempre la misma: **si el sistema ramifica por él, es un
enum gobernado; si nadie ramifica, es una nota**. El desenlace ramifica correo, retención, Talent Pool y
embudo de equidad, por eso es enum. La causa de `not_selected` ramifica el cuerpo del correo y el conteo del
embudo, por eso también. El progreso de la entrevista, hoy, ramifica **la lectura del operador y nada más**:
por eso es un chip derivado de un estado que ya existe, y no una etapa nueva ni una columna nueva.

El agendamiento es el contraejemplo que confirma la regla: **sí ramifica** —una llamada a Microsoft Graph,
un enlace de reunión que se le manda al candidato, un evento que puede moverse o caerse— y por eso obtuvo
task propia (`TASK-1769`) en vez de convertirse en un sub-valor de la etapa `interview`. La misma prueba que
impide crear sub-enums decorativos es la que autoriza un aggregate cuando la ramificación es real.

## Rollout Plan & Risk Matrix

Cambio aditivo y de superficie pequeña: un campo de lectura, un chip y claves de copy. Aun así, la sección se
puebla con razón declarada, porque toca la tarjeta que el equipo de Hiring mira todos los días y porque el
eje roza el anti-anclaje entre evaluadores, que es una garantía de fairness del dominio, no un detalle
visual.

### Slice ordering hard rule

- Slice 1 (reader) → Slice 2 (superficie) → Slice 3 (documentación).
- Slice 2 **no puede empezar antes** de que `TASK-1766` haya fijado el chip en la tarjeta: si empieza antes,
  esta task inventa su propia expresión visual del chip y `TASK-1766` la reescribe.
- Slice 3 cierra después de Slice 2, porque la regla escrita cita el comportamiento real ya visible.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El chip ancla al evaluador con scorecard propio abierto y lo empuja a alinearse | UI / fairness de selección | medium | La variante `own_pending` gana sobre el agregado y oculta el estado de los pares, reusando el predicado vigente | No hay señal automática; se verifica en revisión con una postulación de dos evaluadores |
| Consulta por tarjeta en vez de agregado, con 120 tarjetas por carga | UI / lectura de base | medium | Un solo `= ANY(...)` en el mismo `Promise.all` del snapshot, con prueba que lo fija | Tiempo de respuesta del tablero y de `GET /api/hiring/desk` |
| Un fallo de lectura se ve como «no hay evaluación» | UI | low | Estado `unknown` con copy propio; prohibido degradar a ausencia de chip | Error del snapshot en el registro de la ruta |
| La fila de chips desborda a 390 px y la tarjeta gana scroll horizontal | UI | medium | Envoltura antes de truncar; `hiring-application-card` fuera de `allowHorizontalScrollSelectors`; el gate de layout del escenario ya falla ante violaciones | `pnpm fe:capture` sobre el escenario del tablero |
| El alcance real supera `copy` al necesitar un contenedor de fila nuevo | Proceso | medium | El agente re-declara `UI impact: layout` antes de escribir JSX, no después | Revisión del PR |

### Feature flags / cutover

Sin flag, con razón: el campo es aditivo y su ausencia de datos produce exactamente el comportamiento actual
(sin chip). Un flag para «mostrar un chip» agregaría una fila al ledger y un estado más que mantener sin
reducir ningún riesgo — y el ledger existe para los flags que sí protegen algo. El corte es inmediato al
merge y el revert es un revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `git revert` del PR; el campo desaparece del DTO y ningún consumidor lo requiere | minutos | sí |
| Slice 2 | `git revert` del PR; la tarjeta vuelve a un solo chip y el copy nuevo queda huérfano hasta el siguiente intento | minutos | sí |
| Slice 3 | revertir el delta documental | minutos | sí |

### Production verification sequence

1. En local, `GET /api/hiring/desk` devuelve el campo nuevo con conteos coherentes contra una consulta de sólo lectura sobre PG.
2. En local, el tablero muestra tres tarjetas distinguibles: sin evaluación, con evaluación abierta y con evaluación cerrada.
3. `pnpm fe:capture task355-hiring-pipeline-board` en desktop y 390 px, mirando los frames y no sólo el resultado del gate.
4. En staging, repetir 1 y 2 con datos reales y confirmar que ninguna tarjeta muestra puntaje.
5. En producción, comprobar el tablero con la vacante viva de mayor cohorte y confirmar que el tiempo de carga no se degradó.

### Out-of-band coordination required

N/A — cambio contenido en el repositorio, sin secretos, sin variables de entorno, sin proveedor externo. Se
avisa al equipo de Hiring que la tarjeta suma una señal, porque cambia lo que ven todos los días.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `HiringDeskApplicationSummary` expone el estado agregado del scorecard de entrevista y `GET /api/hiring/desk` lo sirve sin endpoint nuevo.
- [ ] El agregado se resuelve con una sola consulta batcheada; existe una prueba que lo fija.
- [ ] La definición de «cerrado» se reusa de `CLOSED_SCORECARD_STATUSES`; el literal no se repite en otro archivo.
- [ ] La tarjeta muestra el chip con etiqueta textual, ícono y tono, y nunca puntaje, banda, rúbrica ni evaluador.
- [ ] Con scorecard propio abierto, la tarjeta muestra la variante propia y oculta el agregado de los pares.
- [ ] Ausencia de evaluación se ve distinta de fallo de lectura.
- [ ] El copy visible vive en los diccionarios es-CL y en-US; cero literales en JSX.
- [ ] El nombre accesible de la tarjeta incluye los estados de ambos ejes, cerrando también el silencio del chip de test.
- [ ] Evidencia GVC en 1440 y en 390 px, mirada y no sólo ejecutada, sin scroll horizontal en la tarjeta.
- [ ] La arquitectura del dominio queda con la tabla de ejes por columna y con la regla de ramificación escrita.
- [ ] El documento declara que el agendamiento es de `TASK-1769` y no crea ningún campo de fecha, enlace de reunión ni evento.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/hiring`
- `pnpm fe:capture task355-hiring-pipeline-board` + `pnpm fe:capture:review task355-hiring-pipeline-board`
- Consulta de sólo lectura sobre `greenhouse_hiring.hiring_assessment` para contrastar los conteos del tablero contra la base
- Revisión manual del tablero en local con las tres situaciones del chip, en escritorio y en 390 px

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Se revisó `TASK-1769` al cerrar: si ya produjo la referencia del evento, se registró acá el impacto cruzado; si no, queda declarado como consumo pendiente.

## Follow-ups

- Cuando `TASK-1769` entregue la referencia del evento, esta tarjeta la consume en el mismo eje: el chip de
  progreso pasa a poder decir también «entrevista agendada», sin crear una columna ni una etapa nueva.
- El silencio del `aria-label` de la tarjeta es un defecto anterior a esta task. Si el equipo prefiere
  cerrarlo aparte, se extrae como issue propio antes de Slice 2.

## Open Questions

### Resuelta — el agendamiento no es pregunta de esta task

La pregunta con la que nació esta task era «¿Greenhouse agenda entrevistas, o sólo registra que ocurrieron?».
**Ya está respondida, y no como indefinición:** hoy Greenhouse **no agenda**, y se decidió que **sí debe
hacerlo**. La duda era tecnológica y quedó cerrada — el enlace de Teams sale de una sola llamada a Microsoft
Graph (`POST /users/{organizerId}/events` con `isOnlineMeeting` y proveedor `teamsForBusiness`, cuya respuesta
trae el `joinUrl`), y el repositorio ya tiene el cliente y la suscripción de notificaciones de cambio en
`src/lib/entra/`.

**Ese trabajo lo posee `TASK-1769`**
(`docs/tasks/to-do/TASK-1769-hiring-interview-scheduling-graph.md`). No se decide, no se diseña y no se
adelanta aquí.

La pregunta abierta que de verdad importa —**quién es la fuente de verdad del calendario**— vive en
`TASK-1769`, no acá. La dirección propuesta allá es que **Greenhouse agende pero no sea dueño del
calendario**: guarda la referencia (identificador del evento, enlace de reunión, cuándo) y el calendario
manda. Se referencia y no se duplica: resolverla en dos documentos es exactamente cómo dos verdades empiezan
a divergir.

### No bloqueante

- ¿El eje de entrevista debe seguir visible cuando la postulación ya avanzó a «Decisión»? El diseño actual
  dice que sí, porque la decisión se apoya en esa evidencia; conviene confirmarlo con el equipo de Hiring.
- ¿Un scorecard `cancelled` cuenta en el total? El estado existe en el enum de assessments; hay que
  confirmar contra datos reales si algún `interviewer_scorecard` lo alcanza alguna vez.
- Cuando llegue la referencia de `TASK-1769`: ¿el eje muestra un tercer estado propio («agendada») o el
  agendamiento se lee como un chip aparte? Se decide con el dato real en pantalla, no antes.
