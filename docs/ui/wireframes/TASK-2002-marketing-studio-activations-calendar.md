# TASK-2002 / Marketing Studio — Calendario de activaciones

## Meta

- Status: `draft`
- Owner task: `TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI`
- Product Design asset: docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/before-global-desktop.png (calendario vigente en producción, 2026-10-04; complementos `before-global-mobile.png` y `before-campaign-desktop.png`). Dirección de origen: canvas de Claude Design «Efeonce Marketing Studio», página `v2 · Claro y oscuro` (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi), artboards `Studio-Calendar`, `Studio-Campaign` y `Studio-Mobile`.
- Visual direction mode: `source-led`
- Intended consumers: operador de marketing de Efeonce (dueño de campaña), responsable de medios, community manager.
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (namespaces nuevos `activations`, `execution`, `channels`), cubierto por `copy.test.ts`.
- Primitive decision: `extend` — se extienden el calendario mensual vigente (`/calendar`, pestaña Calendario de la campaña), `.chip`, `.seg`, `.pill`, `.callout-*`; reusa `Sheet` y `ConfirmDialog` de TASK-1895 si ya existen, si no los crea con su mismo contrato.
- UI ready target: `no` — falta que el operador apruebe los artboards del calendario de activaciones (ver «Brecha de dirección visual»).

### Brecha de dirección visual (declarada, no inventada)

El canvas v2 aprobado dibuja un calendario de vuelos (franjas) y posts (miniatura + hora + red). No tiene filtros por
modalidad, familia, plataforma o cuenta, ni estados de ejecución, ni la hoja de una activación, ni la bandeja de
«ejecución sin activación». Este wireframe extiende las regiones y tokens aprobados; antes de `UI ready: yes`, el Slice 1
agrega al canvas una página `v3 · Calendario de activaciones` con los artboards `Calendar-Month`, `Calendar-Week`,
`Activation-Sheet`, `Unlinked-Executions`, `Calendar-Mobile` (claro y oscuro) y el operador los aprueba.

## Brief

- Primary user: quien planifica y ejecuta la campaña y necesita ver qué sale, dónde y cuándo, con la seguridad de que lo programado en las herramientas coincide con el plan.
- User moment: revisa la semana o el mes; detecta lo que está programado fuera de plan, lo vencido y lo que se programó en Metricool sin pasar por Studio.
- Job to be done: «Ver el plan de salida de todas mis campañas por canal y plataforma, y saber de un vistazo si cada salida está programada, salió o se atrasó.»
- Primary decision signal: el estado de ejecución de cada tarjeta (Planificada, Programada, Fuera de plan, Publicada, Vencida).
- Non-goals: programar o publicar en Metricool o en plataformas de ads (Studio no publica); métricas de desempeño (TASK-1892/1910); edición de piezas o copys (TASK-1895).

## Desktop Target — 1440×1000

Se conserva `Shell` (rail 76 px, topbar con ⌘K) y el encabezado del calendario («Octubre de 2026», flechas de mes).

1. **Barra de filtros** bajo el título: segmentado `Mes · Semana`; chips de **Modality** (Paid · Organic · Owned · Earned), **Family** (Social · Search · Display · Video · Email · Community · Creators & Influencers…), **Platform** (Instagram · LinkedIn · Facebook · Threads · Google · ChatGPT…) y **Account**; selector de campaña; estado de ejecución. Los filtros viajan en la URL.
2. **Grilla mensual**: las activaciones `span` (paid) son franjas por semana con el nombre de la campaña y su modalidad; las `point` (organic/owned) son tarjetas con miniatura de la **pieza** (no la portada de la campaña), hora, ícono de plataforma, cuenta y **chip de estado de ejecución**. Más de 3 por día ⇒ «+N» que abre el día.
3. **Columna derecha** (360 px): bloque «Ejecución sin activación» (lo programado en herramientas sin plan, con «Vincular» y «Crear activación»), y debajo «Sin fechas» (vigente).
4. **Hoja de activación** (`Sheet`, 560 px) al hacer clic en una tarjeta: campaña, dimensiones de canal, pieza y versión con su preview (y reproductor si es video, TASK-1999), copy literal, fecha planificada, **evidencia de ejecución** (herramienta, fecha programada allí, fecha publicada, permalink) y acciones `Editar`, `Reprogramar`, `Cancelar activación`, `Vincular ejecución`.

## Mobile Target — 390×844

- Vista por defecto **Semana como lista por día** (no grilla): cada día con sus tarjetas apiladas; franjas paid como encabezado del día.
- Filtros en una hoja «Filtros» con conteo de activos; la barra muestra sólo los chips activos.
- «Ejecución sin activación» como callout al inicio con conteo y enlace a su lista.
- Hoja de activación a pantalla completa; acciones al pie a ancho completo.

## Action Hierarchy

- Primary: abrir la hoja de una activación; en la hoja, `Guardar` / `Vincular`.
- Secondary: `Planificar activación` (botón del encabezado), `Reprogramar`, `Vincular ejecución`, `Crear activación` desde ejecución sin activación, filtros.
- Destructive: `Cancelar activación` (con `ConfirmDialog`; no borra la evidencia), `Desvincular ejecución`.
- Selection vs action: filtros, mes/semana y día son selección (URL); toda escritura es explícita en hoja o diálogo.
- Pending / disabled: sin permiso de escritura, las acciones van `aria-disabled` con la razón (`permissions.lockReason`).

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Franja rayada de vuelo propuesto (`before-global-desktop.png`) | franja vigente + chip de modalidad | paid como franja, con su estado de aprobación | convertir el vuelo en tarjetas diarias |
| Tarjeta de post con miniatura, hora y red | tarjeta vigente + chip de estado + cuenta | la salida se reconoce por su pieza | la portada de la campaña como miniatura |
| Columna «Sin fechas» | `.card` lateral vigente | lo pendiente vive al costado | un modal de pendientes |
| Estados con color + texto (`.callout-*`, `.pill`) | tonos `--ok`, `--warn`, `--err`, `--info` con etiqueta | el estado siempre se lee en texto | estados sólo por color |
| Claro y oscuro AXIS 0.2.5 | roles de `theme.generated.css` | mismo calendario en ambos temas | hex nuevos |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 1 | Encabezado | mes, navegación, `Planificar activación` | `CalendarHeader` | URL |
| 1 | Filtros | dimensiones y estado | `ActivationFilters` | catálogo de canales (TASK-1905) |
| 2 | Grilla / lista | activaciones por día | `CalendarGrid`, `ActivationCard`, `SpanBar` | `GET /api/v1/calendar` (TASK-2001) |
| 2 | Lateral | ejecución sin activación + sin fechas | `UnlinkedExecutions`, `UndatedList` | `listUnlinkedExecutions` + calendario |
| 3 | Superpuesta | detalle y edición | `ActivationSheet`, `LinkExecutionDialog`, `ConfirmDialog` | `getActivation`, commands de TASK-2001 |

## Copy Ledger

| Id | Texto | Uso |
|---|---|---|
| `execution.planned` | «Planificada» | chip |
| `execution.scheduled` | «Programada» | chip (con herramienta: «Programada · Metricool») |
| `execution.scheduledOffPlan(diff)` | «Fuera de plan · {diff}» | chip (ej. «Fuera de plan · +2 h») |
| `execution.published` | «Publicada» | chip; con permalink |
| `execution.overdue` | «Vencida» | chip; «Pasó la fecha sin evidencia de publicación» en la hoja |
| `execution.cancelled` | «Cancelada» | chip |
| `activations.unlinkedTitle` | «Ejecución sin activación» | lateral |
| `activations.unlinkedHint` | «Programado en una herramienta sin plan en Studio. Vincúlalo a una activación o crea una.» | lateral |
| `activations.plan` | «Planificar activación» | CTA |
| `activations.link` | «Vincular ejecución» | CTA |
| `activations.createFromExecution` | «Crear activación» | CTA |
| `activations.cancelConfirm` | «¿Cancelar esta activación? La evidencia de la herramienta se conserva.» | diálogo |
| `channels.modality.*` | «Paid», «Organic», «Owned», «Earned» | filtros (spanglish por decisión del operador) |
| `channels.family.*` | «Social», «Search», «Display», «Video», «Email», «Messaging», «Web & Content», «Community», «Creators & Influencers», «PR & Media», «Audio», «OOH/DOOH» | filtros |
| `activations.alwaysOn` | «Always On» | etiqueta de campaña |

## State Copy

| State | Copy visible | Recovery behavior |
|---|---|---|
| ready | grilla con activaciones y chips de estado | — |
| loading | esqueleto de la grilla del mes; filtros visibles | se resuelve solo |
| empty | «No hay activaciones en este período con estos filtros.» + «Limpiar filtros» / «Planificar activación» | limpiar filtros o planificar |
| partial | aviso «La ejecución de {herramienta} no está al día (última lectura {hace N})» sobre la grilla | se recupera con la próxima lectura del worker |
| error | «No pudimos cargar el calendario.» + «Reintentar» | reintento; si persiste, `/api/v1/health` |
| denied | acciones `aria-disabled` con «Este acceso es de sólo lectura» (o la razón de `lockReason`) | pedir acceso |

## Accessibility Contract

- Heading order: `h1` mes; `h2` por bloque lateral; en la hoja, título como nombre accesible del diálogo.
- Grilla: `role="grid"` con días como `gridcell` y nombre accesible «Lunes 5 de octubre, 2 activaciones»; tarjetas como botones con «Instagram · Los Sparks · 14:00 · Programada».
- Estados con texto siempre; tonos sólo acompañan.
- Teclado: flechas entre días, Enter abre el día o la tarjeta; foco atrapado en la hoja; Esc cierra y devuelve el foco.
- Lista de semana en móvil como lista semántica por día.

## Implementation Mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` (`?month=`, `?view=week`, filtros en la URL) y la pestaña Calendario de `apps/web/src/app/campaigns/[campaignId]/page.tsx` (mismo componente filtrado por campaña).
- Primitives: grilla y tarjetas vigentes extendidas; `Sheet`/`ConfirmDialog` de TASK-1895.
- Component candidates: `CalendarHeader`, `ActivationFilters`, `CalendarGrid`, `SpanBar`, `ActivationCard`, `ActivationSheet`, `LinkExecutionDialog`, `UnlinkedExecutions`.
- Copy source: `apps/web/src/copy.ts` (`execution`, `activations`, `channels`).
- Data reader / command: `GET /api/v1/calendar` con filtros, `listCampaignActivations`, `getActivation`, `listUnlinkedExecutions`; commands `planActivation`, `updateActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution` (TASK-2001).
- API parity: la UI escribe sólo por esos commands vía `/api/v1`.
- Access / capability: `marketing_studio.campaign.write` resuelto en el servidor; sin escritura antes de TASK-1898 en modo `open`.
- GVC markers: `data-capture="calendar-filters"`, `"calendar-grid"`, `"activation-card"`, `"activation-sheet"`, `"unlinked-executions"`.

## GVC Scenario Plan

Studio es una app aparte: la evidencia se produce con Playwright (Chrome) contra `http://localhost:3100` sobre staging,
con el rigor de GVC premium.

- Route: `/calendar?month=2026-10`, `?view=week`, filtros por modalidad y plataforma; `/campaigns/CMP-001?tab=calendar`.
- Viewports: 1440×1000 desktop y 390×844 mobile, claro y oscuro.
- Quality profile: `premium`
- Required steps: aplicar filtros; abrir una activación programada; abrir una vencida; vincular una ejecución sin activación; crear activación desde ejecución; cancelar con confirmación.
- Assertions: cada chip coincide con el estado del reader; ninguna tarjeta «Publicada» sin `publishedAt`; la miniatura es la de la pieza.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Review dossier: capturas `after-*` en `docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/` y scorecard `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`.
- Baseline decision: surface ID `studio-calendar-activations`; línea base tras aprobar `v3 · Calendario de activaciones`.

## Design Decision Log

- Decision: el calendario vigente pasa a ser el calendario de activaciones de Studio, con filtros por las cuatro dimensiones, estado de ejecución en cada tarjeta, hoja de detalle y bandeja lateral de ejecución sin activación.
- Alternatives considered: (a) espejo del calendario de Metricool — descartado por el operador (el calendario es de Studio); (b) vista por canal en filas tipo Gantt — candidata para la vista Semana en el canvas v3, no se decide sin dirección aprobada; (c) bandeja de no vinculados en «Hoy» solamente — descartado: debe verse también donde se planifica.
- Why this pattern: conserva la dirección aprobada y agrega lo mínimo para que plan y ejecución se lean juntos.
- Reuse / extend / new primitive: extiende grilla, tarjetas y lateral; reusa `Sheet`/`ConfirmDialog`.
- Open risks: dirección v3 sin aprobar; densidad con muchas activaciones por día; depende de TASK-1905 y TASK-2001.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives (no aplica).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for a scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
- [ ] Artboards `v3 · Calendario de activaciones` aprobados por el operador y este wireframe conciliado con ellos.
