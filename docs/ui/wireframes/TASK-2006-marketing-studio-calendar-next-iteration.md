# TASK-2006 / Marketing Studio — Calendario: siguiente iteración

## Meta

- Status: `approved`
- Owner task: `TASK-2006 — Marketing Studio: calendario, siguiente iteración en la UI`
- Product Design asset: docs/ui/visual-sources/TASK-2006-marketing-studio-calendar-next-iteration-ui/approved-v33-quarter.webp — dirección aprobada por el operador el 2026-10-04 en el canvas «Efeonce Marketing Studio» (https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi, versión `1791147930-57cf`), página `v3.3 · Siguiente iteración y después`; complementos `approved-v33-sheetmore.webp`, `approved-v33-bulk.webp` y `approved-v33-later.webp`. Base: el calendario de TASK-2002 (`approved-v3-*.webp`).
- Visual direction mode: `source-led`
- Intended consumers: operador de marketing, responsable de medios y community manager; en sólo lectura, la persona del cliente (SKY, Berel).
- Copy source: `apps/web/src/copy.ts` del repo `efeonce-marketing-studio` (namespaces `calendar`, `activations`, `comments`, `export`, `client`, `proposals`), cubierto por `copy.test.ts`.
- Primitive decision: `extend` — sobre los componentes de TASK-2002 (`CalendarHeader`, `ActivationFilters`, `ActivationSheet`, `ActivationCard`); nuevos: `QuarterTimeline`, `CampaignIdentity`, `CalendarMarkers`, `SheetTabs`, `ActivityTimeline`, `CommentThread`, `BulkActionBar`, `ExportMenu`, `ProposalCard`, `ClientCalendar`.
- UI ready target: `yes` — dirección aprobada; depende del contrato de TASK-2005.

## Brief

- Primary user: quien planifica a más de un mes y coordina con el equipo y el cliente.
- User moment: revisa el trimestre, comenta una activación, mueve varias a la vez, comparte el plan o revisa lo que propuso un agente.
- Job to be done: «Ver el trimestre con contexto (feriados y fechas comerciales), coordinar sobre cada salida y compartir el plan sin abrir otras herramientas.»
- Primary decision signal: la campaña reconocible por su portada, el estado de cada salida y las fechas que importan del mercado.
- Non-goals: calcular métricas (TASK-1892/1910); que un agente planifique sin persona; editar desde la vista de cliente.

## Desktop Target — 1440×1100

1. **Trimestre** (`approved-v33-quarter.webp`): fila de título «4.º trimestre de 2026» con `Mes · Trimestre`; grilla con filas por campaña (columna de 270 px con portada 32 px o monograma, código, nombre y resumen «7 organic · 2 owned · 1 paid propuesto») y 92 días agrupados por mes con números de semana; franja paid, puntos de activación con el color del estado y su detalle al pasar o abrir; feriados en `--chip`, fechas comerciales en `--warn-bg`; línea de «ahora»; leyenda y nota de fuente («calendario operativo de Greenhouse»).
2. **Hoja ampliada** (`approved-v33-sheetmore.webp`): la hoja de TASK-2002 gana pestañas `Detalle · Resultados · Historial · Comentarios · N`; Resultados con alcance, interacciones y clics (fuente y frescura visibles); Historial como línea de tiempo vertical (qué, detalle, cuándo, quién); Comentarios con avatar, autor, fecha y campo «Escribe un comentario» + «Comentar».
3. **Acciones en lote** (`approved-v33-bulk.webp`): selección en la semana con casilla y contorno `info` por tarjeta; barra flotante «3 seleccionadas · Mayús + clic para un rango» con «Reprogramar», «Vincular» (deshabilitado si no aplica, con la razón), «Cancelar» y «Quitar selección».
4. **Para más adelante** (`approved-v33-later.webp`): menú «Exportar y compartir» (Suscribirse iCal, Descargar CSV, Copiar enlace con filtros); hilo de comentarios con contador en la tarjeta; tarjeta «Propuesta por agente · {rol}» con motivo, fuente y «Aceptar · Editar · Descartar»; vista de cliente de sólo lectura con banner «Vista de cliente · {cliente} · sólo lectura» y estados «Planificada»/«Publicada».

## Mobile Target — 390×844

- Trimestre como lista por campaña con mini línea de tiempo de 92 días a todo el ancho y feriados marcados; sin scroll horizontal.
- Pestañas de la hoja como segmentado desplazable de 44 px; comentarios con campo fijo al pie.
- Selección en lote con pulsación larga; barra de acciones fija abajo con objetivos de 44 px.
- Exportar en una hoja inferior; vista de cliente como la lista semanal de TASK-2002 sin acciones.

## Action Hierarchy

- Primary: «Comentar»; en la barra de lote, «Reprogramar»; en una propuesta, «Aceptar».
- Secondary: cambiar a Trimestre, pestañas de la hoja, «Exportar», «Editar» una propuesta, «Quitar selección».
- Destructive: «Cancelar» en lote (diálogo con el conteo: «¿Cancelar 3 activaciones? La evidencia de las herramientas se conserva.»); «Descartar» una propuesta; borrar un comentario propio.
- Selection vs action: seleccionar no escribe; cada acción del lote abre su diálogo con el resultado por ítem.
- Pending / disabled: «Vincular» en lote deshabilitado salvo con ejecuciones sin activación; la vista de cliente no muestra acciones.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Portada o monograma por campaña (`approved-v33-quarter.webp`) | miniatura de la pieza de portada; monograma en `--raised` | la campaña se reconoce sin color propio | un color inventado por campaña |
| Feriado vs. fecha comercial | `--chip` y `--warn-bg` con leyenda en texto | el contexto del mercado se ve sin competir con las salidas | marcadores sólo por color |
| Puntos de estado en el trimestre | color del estado + detalle en texto al abrir | densidad legible en 92 días | tarjetas completas en el trimestre |
| Línea de tiempo vertical del historial | puntos `info` y `ok`, línea `--line2` | se lee quién hizo qué y cuándo | una tabla de auditoría cruda |
| Barra flotante del lote | `--paper`, `--shadow-lg`, botones de TASK-2002 | la acción sigue a la selección | acciones escondidas en un menú |
| Propuesta por agente con borde punteado `--info-line` | tarjeta con marca «Propuesta por agente» | una propuesta no parece una activación | pintarla igual que una planificada |

## Copy Ledger

| Id | Texto | Uso |
|---|---|---|
| `calendar.quarterTitle(n, year)` | «{n}.º trimestre de {año}» | título |
| `calendar.view.quarter` | «Trimestre» | segmentado |
| `calendar.markers.holiday` | «Feriado {país}» | leyenda |
| `calendar.markers.commercial` | «Fecha comercial» · «fecha por confirmar» | leyenda |
| `calendar.markers.source` | «Feriados desde el calendario operativo de Greenhouse.» | nota |
| `activations.tabs` | «Detalle», «Resultados», «Historial», «Comentarios · {n}» | pestañas |
| `activations.results.source(tool, ago)` | «{herramienta} · leído {hace N}» | resultados |
| `activations.history.*` | «Planificada por {persona}», «Copy cambiado», «Programada en {herramienta} (descubierta)», «Publicada (observada)», «Reprogramada», «Cancelada» | historial |
| `comments.placeholder` | «Escribe un comentario» | campo |
| `comments.submit` | «Comentar» | botón |
| `bulk.selected(n)` | «{n} seleccionadas» | barra |
| `bulk.rangeHint` | «Mayús + clic para un rango» | barra |
| `bulk.cancelConfirm(n)` | «¿Cancelar {n} activaciones? La evidencia de las herramientas se conserva.» | diálogo |
| `bulk.partial(ok, total)` | «Se aplicó a {ok} de {total}. Revisa las que no se pudieron.» | resultado |
| `export.subscribe` | «Suscribirse (iCal)» + «URL privada que se actualiza sola» | menú |
| `export.csv` | «Descargar CSV» + «Con los filtros actuales» | menú |
| `export.copyLink` | «Copiar enlace con filtros» | menú |
| `proposals.badge(role)` | «Propuesta por agente · {rol}» | tarjeta |
| `proposals.actions` | «Aceptar», «Editar», «Descartar» | tarjeta |
| `client.banner(name)` | «Vista de cliente · {cliente} · sólo lectura» | banner |

## State Copy

| State | Copy visible | Recovery behavior |
|---|---|---|
| ready | trimestre con campañas, marcadores y estados; hoja con pestañas | — |
| loading | esqueleto de filas por campaña; pestañas con esqueleto de contenido | se resuelve solo |
| empty | Trimestre sin activaciones: «No hay activaciones en este trimestre con estos filtros.»; Comentarios: «Todavía no hay comentarios.»; Historial nunca vacío (al menos «Planificada») | limpiar filtros o comentar |
| partial | «Los resultados de {herramienta} no están al día (última lectura {hace N})»; lote: «Se aplicó a {ok} de {total}.» | reintentar los ítems fallidos |
| error | «No pudimos cargar el trimestre.» + «Reintentar»; comentario no enviado: «No se envió. Reintentar» | reintento conservando el texto |
| denied | sin permiso: acciones del lote y «Comentar» deshabilitados con «Este acceso es de sólo lectura»; cliente: sólo lectura por diseño | pedir acceso |

## Accessibility Contract

- Trimestre: `role="grid"` con filas por campaña y celdas por semana; cada punto es un enlace con «{fecha}, {platform}, {pieza}, {estado}».
- Pestañas con `role="tablist"`, flechas entre pestañas y panel con nombre.
- Lote: `aria-selected` en tarjetas, Espacio alterna la selección, Mayús + flechas extiende el rango; la barra es `role="toolbar"` y anuncia «3 seleccionadas».
- Comentarios: lista con autor y fecha legibles; el campo tiene etiqueta.
- Propuesta: el estado «Propuesta por agente» va en texto.

## Implementation Mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` (`?view=quarter`), hoja de TASK-2002 (`?activation=<id>&tab=history|results|comments`), `apps/web/src/app/client/calendar/page.tsx` para la vista de cliente `[verificar ruta con TASK-1898]`.
- Primitive / variant / kind: extiende los componentes de TASK-2002; `Sheet` con pestañas.
- Component candidates: `QuarterTimeline`, `CampaignIdentity`, `CalendarMarkers`, `SheetTabs`, `ActivityTimeline`, `CommentThread`, `BulkActionBar`, `ExportMenu`, `ProposalCard`, `ClientCalendar`.
- Copy source: `apps/web/src/copy.ts`.
- Data reader / command: `GET /api/v1/calendar?view=quarter`, `listCalendarMarkers`, `getActivation` (eventos), `listActivationComments`, `addActivationComment`, `bulkRescheduleActivations`, `bulkCancelActivations`, `exportCalendar`, `createCalendarFeed`, `revokeCalendarFeed`, `listActivationProposals`, `acceptActivationProposal`, `discardActivationProposal`, `getClientCalendar` (TASK-2005).
- API parity: la UI escribe sólo por esos commands; cada uno con tool MCP.
- Access / capability: `marketing_studio.campaign.write` para escribir; `marketing_studio.calendar.client_read` para la vista de cliente.
- GVC markers: `data-capture="quarter-timeline"`, `"sheet-tabs"`, `"bulk-action-bar"`, `"export-menu"`, `"proposal-card"`, `"client-calendar"`.

## GVC Scenario Plan

Playwright (Chrome) contra `http://localhost:3100` sobre staging, con el rigor de GVC premium.

- Route: `/calendar?view=quarter&quarter=2026-Q4`, `/calendar?activation=<id>&tab=history`, selección en `?view=week`, menú de exportar, `/client/calendar`.
- Viewports: 1440×1100 desktop y 390×844 mobile, claro y oscuro.
- Quality profile: `premium`
- Required steps: abrir el trimestre y un punto; cambiar de pestaña en la hoja y comentar; seleccionar tres y reprogramar con resultado por ítem; exportar CSV y crear y revocar el feed; aceptar y descartar una propuesta; entrar como cliente.
- Required captures: `after-quarter`, `after-sheet-history`, `after-sheet-results`, `after-comments`, `after-bulk`, `after-export`, `after-proposal`, `after-client`, `after-mobile-quarter`, `after-mobile-bulk`.
- Assertions: la vista de cliente no muestra evidencia ni herramientas; los feriados coinciden con el calendario operativo; una propuesta aceptada aparece como «Planificada» con actor persona.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390 (la fuente aprobada mide 1440/1440).
- Reduced-motion / focus evidence: barra de lote y pestañas con teclado; `reducedMotion: 'reduce'`.
- Review dossier: capturas `after-*` junto a `approved-v33-*` y scorecard `docs/ui/reviews/TASK-2006-marketing-studio-calendar-next-iteration.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-next-iteration`; línea base `approved-v33-*`.

## Design Decision Log

- Decision: el trimestre se lee por campaña con puntos de estado y marcadores del mercado; la hoja suma resultados, historial y comentarios en pestañas; el lote, exportar, propuestas y vista de cliente se agregan sin cambiar la base de TASK-2002.
- Alternatives considered: trimestre como tres meses apilados (descartado: no se ve la continuidad de los flights); colores por campaña (descartado: inventa colores fuera de AXIS); comentarios en un panel aparte (descartado: separa la conversación de la activación); propuestas mezcladas como activaciones planificadas (descartado: el agente no planifica sin persona).
- Why this pattern: mantiene una sola hoja por activación y una sola barra de acciones, y respeta propose → confirm → execute.
- Reuse / extend / new primitive: extiende TASK-2002; los componentes nuevos viven en Studio.
- Open risks: depende de TASK-2005 (contrato), TASK-1913 (agentes) y TASK-1898 (acceso del cliente); las métricas dependen de TASK-1892/1910.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded.
- [x] Partial/degraded states are explicit.
- [x] No copy implies a guarantee when data is estimated.
- [x] Charts have table/text alternatives (el trimestre tiene la lista equivalente en móvil y la hoja).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for a scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
- [x] Página `v3.3` aprobada por el operador (2026-10-04) y este wireframe conciliado con ella.
