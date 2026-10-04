# TASK-2006 — Marketing Studio: calendario, siguiente iteración en la UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2006-marketing-studio-calendar-next-iteration.md`
- Flow: `docs/ui/flows/TASK-2006-marketing-studio-calendar-next-iteration-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno — página v3.3 aprobada por el operador el 2026-10-04; wireframe y flow listos; espera TASK-2002 y el contrato de TASK-2005`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-2002 (calendario base) · TASK-2005 (contrato) · TASK-1913 para propuestas de agente · TASK-1898 para la vista de cliente`
- Branch: `efeonce-marketing-studio main (componentes y copy) · Greenhouse develop (docs, capturas, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva a Studio la siguiente iteración del calendario aprobada en el canvas: vista Trimestre con identidad de campaña,
feriados y fechas comerciales; hoja con pestañas de resultados, historial y comentarios; acciones en lote; exportar y
compartir; tarjetas de propuestas de agentes; y una vista de cliente de sólo lectura. Consume el contrato de TASK-2005.

## Why This Task Exists

El operador aprobó la página «v3.3 · Siguiente iteración y después» y decidió hacer las cuatro funciones «para más
adelante» (exportar, comentarios, propuesta por agente, vista de cliente). TASK-2002 se queda con el calendario base para
no crecer sin control; esta task agrega lo demás sobre esa base.

## Goal

- Ver el trimestre con contexto del mercado y reconocer cada campaña sin colores inventados.
- Coordinar y revisar cada activación (comentarios, historial, resultados) sin salir de su hoja.
- Mover varias activaciones a la vez, compartir el plan y decidir propuestas de agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§8 Interfaz)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md`

Reglas obligatorias:

- La UI sólo pinta readers y llama commands de TASK-2005; no calcula filas de exportación ni lo que ve el cliente.
- Estados siempre con texto; sin colores por campaña fuera de los roles de AXIS.
- Copy en `apps/web/src/copy.ts`, español neutro sin voseo.

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-2006-marketing-studio-calendar-next-iteration.md`
- `docs/ui/flows/TASK-2006-marketing-studio-calendar-next-iteration-flow.md`
- `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md` (base)

## Dependencies & Impact

### Depends on

- TASK-2002 (componentes y hoja base), TASK-2005 (contrato), TASK-1913 (propuestas), TASK-1898 (acceso del cliente), TASK-1892/1910 (resultados).

### Blocks / Impacts

- Nodo `MS-N1` Hoy: menciones y propuestas como ítems de atención.

### Files owned

- `efeonce-marketing-studio/apps/web/src/components/{QuarterTimeline,CampaignIdentity,CalendarMarkers,SheetTabs,ActivityTimeline,CommentThread,BulkActionBar,ExportMenu,ProposalCard,ClientCalendar}.tsx` `[verificar nombres al tomarla]`
- `efeonce-marketing-studio/apps/web/src/copy.ts` + `copy.test.ts`
- Greenhouse: wireframe, flow, capturas y scorecard de esta task

## Current Repo State

### Already exists

- Dirección aprobada: `docs/ui/visual-sources/TASK-2006-marketing-studio-calendar-next-iteration-ui/approved-v33-{quarter,sheetmore,bulk,later}.webp`.
- Calendario base especificado y listo para construir en TASK-2002.

### Gap

- Sin vista Trimestre, pestañas en la hoja, lote, exportar, propuestas ni vista de cliente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-marketing-studio` — página de calendario y componentes de `apps/web`
- Future candidate home: `remain-shared`
- Boundary: consume readers y commands de TASK-2005 por `/api/v1`
- Server/browser split: la página arma el calendario en el servidor; los componentes cliente sólo llaman la API para escribir
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de marketing, responsable de medios, community manager; persona del cliente en sólo lectura.
- Momento del flujo: planificación trimestral, coordinación diaria y revisión con el cliente (nodos `MS-N4` y `MS-N1`).
- Resultado perceptible esperado: ver el trimestre con contexto, coordinar sobre cada salida y compartir el plan.
- Friccion que debe reducir: hilos de coordinación fuera de Studio, exportar a mano y mover salidas una por una.
- No-goals UX: métricas propias; que un agente planifique sin persona; edición desde la vista de cliente.

### Surface & system decision

- Surface: `/calendar?view=quarter`, hoja de activación con pestañas, selección en la semana, menú de exportar, `/client/calendar`.
- Nav placement: `none` (destinos existentes; la vista de cliente entra por su propio acceso de TASK-1898).
- Composition Shell: `no aplica` — Studio usa su propio `Shell`.
- Primitive decision: `extend` — componentes de TASK-2002 y `Sheet` con pestañas.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: hoja con pestañas; barra flotante de lote con diálogos; menú de exportar como popover.
- Copy source: `local one-off` en `apps/web/src/copy.ts` de Studio.
- Access impact: `entitlements` — `marketing_studio.calendar.client_read` (TASK-2005) para la vista de cliente.

### State inventory

- Default: trimestre con campañas, marcadores y puntos de estado.
- Loading: esqueleto de filas por campaña y de pestañas.
- Empty: «No hay activaciones en este trimestre con estos filtros.»; «Todavía no hay comentarios.»
- Error: «No pudimos cargar el trimestre.» + «Reintentar»; comentario no enviado conserva el texto.
- Degraded / partial: resultados atrasados con su fuente; lote «Se aplicó a {ok} de {total}».
- Permission denied: lote y comentar deshabilitados con «Este acceso es de sólo lectura».
- Long content: comentarios largos con «Ver más»; historial paginado.
- Mobile / compact: trimestre como lista con mini línea de tiempo; pestañas desplazables; barra de lote fija abajo.
- Keyboard / focus: grilla del trimestre con roving tabindex; pestañas con flechas; selección con Espacio y Mayús + flechas.
- Reduced motion: sin animación propia.

### Interaction contract

- Primary interaction: abrir un punto del trimestre; comentar; aplicar una acción de lote.
- Hover / focus / active: `:focus-visible` vigente; el detalle del punto aparece al enfocar, no sólo al pasar el mouse.
- Pending / disabled: «Enviando…» en comentarios; lote con `aria-busy` hasta el resultado por ítem.
- Escape / click-away: Esc cierra la hoja, el menú y quita la selección.
- Focus restore: vuelve a la tarjeta o al punto de origen; tras el lote, al primer ítem que falló.
- Latency feedback: botón pendiente y resultado por ítem.
- Toast / alert behavior: región `aria-live` única del `Shell`.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: transición vigente de la hoja y de la barra.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: el vigente de Studio.
- Reduced-motion fallback: sin transición.
- Non-goal motion: arrastrar para reprogramar (follow-up).

### Implementation mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` (`?view=quarter`), hoja de TASK-2002 con `?tab=`, `apps/web/src/app/client/calendar/page.tsx` (ruta a confirmar con TASK-1898).
- Primitive / variant / kind: componentes de TASK-2002 extendidos; `Sheet` `md` con pestañas.
- Component candidates: `QuarterTimeline`, `CampaignIdentity`, `CalendarMarkers`, `SheetTabs`, `ActivityTimeline`, `CommentThread`, `BulkActionBar`, `ExportMenu`, `ProposalCard`, `ClientCalendar`.
- Copy source: `apps/web/src/copy.ts` (`calendar`, `activations`, `comments`, `export`, `client`, `proposals`).
- Data reader / command: operaciones de TASK-2005 (`listCalendarMarkers`, comentarios, lote, exportar, feed, propuestas, `getClientCalendar`) y `getActivation` con eventos (TASK-2001).
- API parity: escritura sólo por `/api/v1`; cada operación con tool MCP.
- Access / capability: `marketing_studio.campaign.write` y `marketing_studio.calendar.client_read` en servidor.
- States to implement: ready, loading, empty, partial, error, denied.

### GVC scenario plan

- Scenario file: script Playwright (Chrome) contra `localhost:3100` sobre staging, en el mismo harness de TASK-2002.
- Route: `/calendar?view=quarter`, `?activation=<id>&tab=history`, selección en `?view=week`, menú de exportar, `/client/calendar`.
- Viewports: 1440×1100 y 390×844, claro y oscuro.
- Quality profile: `premium`
- Required steps: trimestre y un punto; comentar; historial y resultados; lote con un ítem que falla; CSV y feed; aceptar y descartar una propuesta; cliente.
- Required captures: las 10 `after-*` del wireframe.
- Required `data-capture` markers: `quarter-timeline`, `sheet-tabs`, `bulk-action-bar`, `export-menu`, `proposal-card`, `client-calendar`.
- Assertions: cliente sin herramientas ni evidencia; feriados iguales al calendario operativo; propuesta aceptada con actor persona.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Reduced-motion / focus evidence: pestañas y lote con teclado; `reducedMotion: 'reduce'`.
- Review dossier: capturas `after-*` + scorecard `docs/ui/reviews/TASK-2006-marketing-studio-calendar-next-iteration.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-next-iteration`; línea base `approved-v33-*`.

### Design decision log

- Decision: trimestre por campaña con puntos y marcadores; hoja con pestañas; barra de lote; exportar como menú; propuestas como tarjeta distinta; vista de cliente como ruta aparte de sólo lectura.
- Alternatives considered: tres meses apilados; colores por campaña; panel de comentarios aparte; propuestas pintadas como planificadas; calendario interno con permisos para el cliente — todos descartados (ver wireframe).
- Why this pattern: una sola hoja por activación y propose → confirm → execute para agentes.
- Reuse / extend / new primitive: extiende TASK-2002.
- Open risks: TASK-1913, TASK-1898 y TASK-1892/1910 condicionan propuestas, cliente y resultados.

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440×1100, 390×844.
- Required captures: `after-*` listadas en el wireframe.
- Required `data-capture` markers: los seis del plan.
- Scroll-width check: sí.
- Accessibility/focus checks: trimestre, pestañas, lote y propuestas con teclado; estados con texto.
- Before/after evidence: `approved-v33-*` vs `after-*`.
- Known visual debt: arrastrar para reprogramar (follow-up).
- Visual scorecard: `docs/ui/reviews/TASK-2006-marketing-studio-calendar-next-iteration.scorecard.json`
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

### Slice 1 — Trimestre, identidad y marcadores

- `QuarterTimeline`, `CampaignIdentity` y `CalendarMarkers` con su versión móvil.

### Slice 2 — Hoja con pestañas

- `SheetTabs` con Resultados, Historial y Comentarios; menciones hacia Hoy.

### Slice 3 — Lote y exportar

- `BulkActionBar` con diálogos y resultado por ítem; `ExportMenu` con CSV, feed y enlace.

### Slice 4 — Propuestas y vista de cliente

- `ProposalCard` en Hoy y calendario; `ClientCalendar` de sólo lectura.

### Slice 5 — Evidencia

- Capturas, scorecard, scroll y foco; manual de uso.

## Out of Scope

- Contrato (TASK-2005); métricas (TASK-1892/1910); arrastrar para reprogramar; el calendario base (TASK-2002).

## Detailed Spec

Ver wireframe y flow de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-2002 desplegada y TASK-2005 en el mismo ambiente antes del Slice 1; Slice 4 espera TASK-1913 (propuestas) y TASK-1898 (cliente).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La vista de cliente muestra algo interno | identity / UI | low | sólo pinta `getClientCalendar`; aserción en el escenario | aserción Playwright |
| El lote confunde con resultados parciales | UI | medium | resultado por ítem y foco al primero que falló | revisión de capturas |
| Densidad del trimestre | UI | medium | puntos + detalle al abrir; filtros | revisión de capturas |

### Feature flags / cutover

- Usa `STUDIO_CALENDAR_COLLAB_ENABLED` de TASK-2005 (sin flag propio).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–4 | flag OFF o revert + push | 5 min | si |
| Slice 5 | sin runtime | — | si |

### Production verification sequence

1. Local contra staging con capturas y aserciones.
2. Push de Studio `main` con autorización del operador y el flag ON en producción.

### Out-of-band coordination required

- Autorización de push del operador; acceso del cliente (TASK-1898).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `UI ready: yes` con `pnpm task:lint --task TASK-2006` sin hallazgos; wireframe y flow existentes.
- [ ] La vista Trimestre muestra campañas con portada o monograma, feriados y fechas comerciales, sin colores inventados.
- [ ] La hoja tiene pestañas de Resultados, Historial y Comentarios conectadas a sus readers.
- [ ] El lote aplica, informa el resultado por ítem y devuelve el foco al primero que falló.
- [ ] Exportar descarga el CSV con los filtros, crea y revoca el feed iCal y copia el enlace con filtros.
- [ ] Una propuesta de agente se acepta, edita o descarta, y sólo al aceptarla aparece como «Planificada».
- [ ] La vista de cliente no muestra herramientas, evidencia ni acciones.
- [ ] Copy en `apps/web/src/copy.ts` con test; sin voseo; sin scroll horizontal en 1440 y 390; capturas y scorecard registrados.
- [ ] `pnpm check` y `pnpm build` de Studio verdes.

## Verification

- `pnpm check` y `pnpm build` (Studio)
- Escenario Playwright contra `localhost:3100`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Manual de uso y documentación funcional de Marketing Studio actualizados

## Follow-ups

- Arrastrar tarjetas para reprogramar.
