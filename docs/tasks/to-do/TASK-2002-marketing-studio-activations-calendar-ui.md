# TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI

## Delta 2026-10-04 (blog) — hoja de blog con SEO y AEO

El operador revisó en el canvas (página `v3.2 · Planificar y operar`) las hojas «Blog · antes de publicar» y «Blog ·
después de publicar», pidió ajustes por comentario (CMS del cliente, enlace al borrador y legibilidad) y quedaron
incorporados. Renders: `approved-v32-blogpre*.webp` y `approved-v32-blogpost*.webp`. Decisiones:

- La hoja de blog tiene dos pestañas de trabajo: **Antes de publicar** (gate de publicación arriba con «N de 18» y lo que
  falta; búsqueda e intención; metadata y snippet; fan-out y citabilidad; E-E-A-T y schema; enlaces y CTA) y **Después
  de publicar** (publicación e indexación; Search Console de 28 días; visibilidad en motores de IA; tráfico y
  conversión; frescura).
- La cabecera muestra **CMS** (el del cliente: WordPress, Drupal, Webflow, Modyo, HubSpot CMS u otro) separado de
  **Sitio**, y el enlace **«Borrador en Content Hub»** con el isotipo de Notion, porque los borradores se escriben ahí.
- Lectura antes que texto: indicadores en tarjetas con número grande, chips de estado (verde/ámbar con ícono, nunca sólo
  color), tablas enmarcadas con números alineados a la derecha y explicaciones de método plegadas («Cómo se obtiene»,
  «Cómo se mide»).
- Cada dato lleva su honestidad: «Estimado · tercero» con fuente y fecha, «Medido» para Search Console, el AI Visibility
  Grader y GA4, y «no medido» si no hay dato. «Sin medir» es distinto de «No aparece».
- Studio no publica: registra la autorización y lee la evidencia; el contrato de datos está en el delta «(blog)» de
  TASK-2001. El dossier SEO/AEO y su medición quedan como follow-up de contrato, así que esta UI muestra esas secciones
  vacías («no medido») hasta que exista.
- Decidido por el operador: volumen y dificultad desde el **SV360** («Estimado · SV360 · Chile · [fecha]»); panel de
  prompts **por clúster temático** («Medido · panel del clúster [nombre]»); el gate **sólo avisa** («N de 18 · M avisos»
  y «El gate avisa, no bloquea: se puede autorizar con avisos y quedan registrados en la autorización»). Renders
  actualizados.

## Delta 2026-10-04 (posterior) — dirección visual aprobada

El operador aprobó el 2026-10-04 todas las páginas del canvas — `v3 · Calendario de activaciones`, `v3.1 · Línea de
tiempo por plataforma`, `v3.2 · Planificar y operar` y `v3.3 · Siguiente iteración y después` — y las decisiones
propuestas: estados paid `delivering`/`ended`, tolerancia de 0 días, la pauta resumida en el mes, la línea de tiempo en
vez de canvas libre, isotipos en negativo (TASK-2004), dos tarjetas por día y «+N» desde la tercera, pantallas de
1440×1100, la evidencia owned (HubSpot para email; lector del WordPress del sitio público para blog y landing, en
TASK-2001) y los previews de email y web siempre en claro. Los renders aprobados viven en
`docs/ui/visual-sources/TASK-2002-marketing-studio-activations-calendar/approved-v3-*.webp`; el wireframe y el flow
quedaron conciliados y `UI ready` pasa a `yes`. Lo de v3.3 (trimestre, historial, comentarios, lote, exportar, vista de
cliente, propuesta por agente) sale de esta task: contrato en TASK-2005 y UI en TASK-2006.

## Delta 2026-10-04 — dirección visual v3 y decisiones del operador

Dirección visual en revisión en el [canvas «Efeonce Marketing Studio»](https://claude.ai/artifact/D6uwRFMzvnaHzGDtDLvxBi): página «v3 · Calendario de activaciones»
(mes, semana, Gantt alternativo, hoja, bandeja y «Vincular», estados, pauta y móvil, en claro y en oscuro) y página
«v3.1 · Línea de tiempo por plataforma». Decisiones del operador (2026-10-04):

- **Pauta en el mes:** una franja por campaña con el plan y, encima, el peor estado de sus líneas en texto
  («CMP-001 · Paid · 3 líneas · 1 vencida»). Las tres capas (plan, fechas en la herramienta, entrega observada) se leen sólo
  en la vista de pauta, la línea de tiempo y la hoja. Estados `delivering`/`ended` y tolerancia de 0 días: ver TASK-2001.
- **Vista por plataforma:** no un canvas libre, sino una línea de tiempo con ejes fijos (fechas arriba, filas a la izquierda),
  escala Día · Semana · Mes, grupos por platform con accounts plegables y conteo, sólo filas con actividad por defecto
  («Mostrar todas») y filas virtualizadas.
- **Marcas:** isotipos oficiales de AXIS para plataformas y herramientas, en color en tema claro y en negativo en oscuro;
  logotipo de Metricool donde cabe el nombre. Pendiente registrar en `@efeoncepro/axis-brand-assets` los negativos y los
  isotipos de Facebook y Threads (hoy tomados de @iconify/json, CC0); la UI los consume de ahí, nunca de copias.
- Pantallas de escritorio a 1440×1100, igual que v2.

## Decisión vigente 2026-10-04 (posterior) — escritura por MCP con TASK-2003

El operador decidió (2026-10-04, después de retirar TASK-1899) que Efeonce es agent-friendly y que todo lo de EPIC-049
nace Full API Parity con sus tools en el MCP, **escrituras incluidas**. La «nueva decisión» que dejaba pendiente la
retirada de TASK-1899 es **TASK-2003**: núcleo de escritura por MCP con identidad delegada (scope en Entra, canje por
capability exacta, persona como actor, gateway con escrituras `T1`), **sin** aprobaciones ni `proposalDigest`, que
siguen retirados en TASK-1899. Las escrituras `T1` de esta task se federan sobre TASK-2003 cuando esté vivo; las `T2`
siguen por CLI/UI. La implementa Codex.

**Sin bloqueo** (revisión de Codex aceptada por el operador, 2026-10-04): esta task **no espera** a TASK-2003. Se
construye en paralelo (API, CLI y UI) con todas sus tools en el manifiesto; sus escrituras se federan por MCP en cuanto
TASK-2003 esté vivo.

## Decisión vigente 2026-10-04 — desarrollo sin TASK-1899

El operador retiró TASK-1899 por la fricción que añadiría en esta etapa. Su diseño de escritura MCP deja de ser
prerrequisito de desarrollo y cierre del alcance API/CLI/UI de esta task. La federación de escrituras MCP y su
verificación se retiran del alcance actual, pendientes de una nueva decisión; nunca se declaran operativas por
cerrar ese alcance. Esta decisión prevalece sobre las referencias y criterios MCP de TASK-1899 conservados más
abajo. API-first, dependencias funcionales y controles de acceso existentes siguen vigentes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — Full API Parity y operación por MCP obligatorias (decisión del operador)

- **Regla:** esta UI no tiene lógica propia: cada acción que muestra (planificar, editar, reprogramar, cancelar, vincular, crear desde ejecución, ver la tracking URL) es un command o reader de TASK-2001 con ruta `/api/v1`, entrada en
  el registro con **tool** (exclusión sólo para transporte o metadatos, nunca para una capacidad de negocio) y **tool
  federada y operable por Efeonce MCP**, lecturas **y escrituras**, con la identidad delegada de la persona
  (carril de TASK-2003: clase `efeonce.mcp.marketing_studio.write`, canje por capability exacta, persona como actor;
  las aprobaciones `T2` siguen por CLI/UI mientras TASK-1899 esté retirada). La UI es un cliente más de esos commands.
- **Cierre:** la task no se cierra hasta que una **sesión MCP real** (token Entra humano) ejecuta cada operación nueva
  —leer, planificar y editar (las `T2` por CLI/UI mientras TASK-1899 esté retirada)— y la evidencia queda registrada. Manual servido
  (`docs/mcp/skills/marketing-studio/SKILL.md`) actualizado con las tools nuevas.
- **Orden:** no espera a TASK-2003. Toda operación nace con su tool en el manifiesto; las lecturas se federan y prueban al
  cerrar; las escrituras se federan y prueban por MCP cuando TASK-2003 esté vivo (si ya lo está al cerrar, se prueban ahí).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`
- Flow: `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno — dirección visual v3, v3.1 y v3.2 aprobada por el operador el 2026-10-04; wireframe y flow conciliados; espera el contrato de TASK-2001`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-2001 (activaciones, evidencia, avisos, eventos y reader del calendario) · TASK-1895 si sus primitives Sheet/ConfirmDialog no existen aún (si no, esta task las crea con el mismo contrato)`
- Branch: `efeonce-marketing-studio main (componentes y copy) · Greenhouse develop (docs, capturas, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el calendario de Studio (global `/calendar` y la pestaña Calendario de cada campaña) en el **calendario de
activaciones**: filtros por modality, family, platform, account y mercado; tarjetas con la miniatura de la pieza y el **estado de
ejecución** (Planificada, Programada, Fuera de plan, Publicada, Vencida, Cancelada); hoja de detalle con la evidencia de la
herramienta; y la bandeja **«Ejecución sin activación»** para vincular o crear la activación de lo que se programó en
Metricool sin pasar por Studio. Consume el contrato de TASK-2001.

## Why This Task Exists

- El operador decidió (ADR de estrategia §15, 2026-10-04) que el calendario es de Studio y que Metricool es evidencia de
  ejecución; la UI vigente sólo pinta vuelos y los posts importados, con la portada de la campaña como miniatura.
- Lo programado en Metricool sin catálogo (14 publicaciones del 4 al 20/10, 3 visibles en Studio) necesita un lugar
  visible para resolverse, nunca invisible.

## Goal

- Ver y filtrar el plan de salida de todas las campañas por las cuatro dimensiones.
- Leer en cada tarjeta si la salida está planificada, programada, fuera de plan, publicada o vencida.
- Resolver la ejecución sin activación con dos acciones (vincular o crear) sin salir del calendario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§15)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§8 Interfaz)
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (nodos `MS-N1`, `MS-N3`, `MS-N4`)

Reglas obligatorias:

- La UI sólo pinta readers y llama commands de TASK-2001; no calcula estados de ejecución.
- Programado nunca se muestra como publicado; estados siempre con texto.
- Copy en `apps/web/src/copy.ts`; dimensiones de canal en el spanglish decidido (Paid, Organic, Social, Search…).

## Normative Docs

- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`
- `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`

## Dependencies & Impact

### Depends on

- TASK-2001 (contrato), TASK-1905 (catálogo para los filtros), TASK-1999 (reproductor de video en la hoja).

### Blocks / Impacts

- TASK-1895: comparte `Sheet`/`ConfirmDialog` y el diálogo de conflicto.
- TASK-1911: su UI de calendario unificado queda cubierta aquí; experimentos se suman como capa después.

### Files owned

- `efeonce-marketing-studio/apps/web/src/app/calendar/page.tsx`
- `efeonce-marketing-studio/apps/web/src/components/{CalendarGrid,ActivationCard,ActivationSheet,ActivationFilters,UnlinkedExecutions}.tsx` `[verificar nombres al tomarla]`
- `efeonce-marketing-studio/apps/web/src/copy.ts` + `copy.test.ts`, `apps/web/src/styles/app.css`
- Greenhouse: wireframe, flow, capturas y scorecard de esta task

## Current Repo State

### Already exists

- Calendario mensual `/calendar?month=` (franjas de vuelo, tarjetas de post con hora y red, lateral «Sin fechas») y pestaña Calendario de la campaña; capturas `before-*` del 2026-10-04.
- Reproductor de video en el inspector (TASK-1999), reusable en la hoja.

### Gap

- Sin filtros por dimensión, sin estados de ejecución, sin hoja de activación, sin bandeja de ejecución sin activación, sin vista semana ni lista móvil.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-marketing-studio` — página de calendario y componentes de `apps/web`
- Future candidate home: `remain-shared`
- Boundary: consume readers y commands de TASK-2001 por `/api/v1`
- Server/browser split: la página arma el calendario en el servidor con el reader; los componentes cliente sólo llaman la API para escribir
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador de marketing, responsable de medios, community manager.
- Momento del flujo: revisión semanal y diaria de salidas (nodo `MS-N4`, pestaña Calendario de `MS-N3`).
- Resultado perceptible esperado: ver qué sale, dónde y cuándo, y si coincide con lo programado.
- Friccion que debe reducir: abrir Metricool para saber qué está programado y no ver lo que se programó fuera de Studio.
- No-goals UX: programar o publicar desde Studio; métricas de desempeño.

### Surface & system decision

- Surface: `/calendar` y `/campaigns/[campaignId]?tab=calendar`.
- Nav placement: `none` (destinos existentes).
- Composition Shell: `no aplica` — Studio usa su propio `Shell`.
- Primitive decision: `extend` — grilla, tarjetas y lateral vigentes; `Sheet`/`ConfirmDialog` de TASK-1895.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: `ActivationSheet` lateral (pantalla completa en móvil); `LinkExecutionDialog`; `ConfirmDialog` para cancelar.
- Copy source: `local one-off` en `apps/web/src/copy.ts` de Studio.
- Access impact: `none` (escritura según `permissions` del reader).

### State inventory

- Default: grilla del mes con chips de estado.
- Loading: esqueleto con la forma de la grilla; «Sigue cargando…» a los 10 s.
- Empty: «No hay activaciones en este período con estos filtros.» + «Limpiar filtros»; primer uso: «Todavía no hay activaciones» + «Planificar activación».
- Error: «No pudimos cargar el calendario.» + Reintentar.
- Degraded / partial: aviso de lectura de la herramienta atrasada.
- Permission denied: acciones `aria-disabled` con la razón.
- Long content: «+N» por día; nombres de campaña con elipsis.
- Mobile / compact: semana como lista por día; filtros en hoja; hoja de activación a pantalla completa; pauta como tarjetas con mini línea de tiempo.
- Keyboard / focus: roving tabindex en la grilla; flechas, Inicio/Fin, Re Pág/Av Pág, T (hoy), Entrar, Esc; foco al título de la hoja y de vuelta a la tarjeta (contrato en el artboard `V3-A11y`).
- Reduced motion: sin animación propia.

### Interaction contract

- Primary interaction: abrir la hoja de una activación.
- Hover / focus / active: tarjetas con `:focus-visible` vigente.
- Pending / disabled: «Guardando…» con `aria-busy`.
- Escape / click-away: Esc cierra la hoja (con confirmación si hay cambios).
- Focus restore: vuelve a la tarjeta de origen.
- Latency feedback: botón pendiente; la tarjeta se actualiza con la respuesta del command.
- Toast / alert behavior: región `aria-live` única del `Shell`.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: transición vigente de la hoja.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: el vigente de Studio.
- Reduced-motion fallback: sin transición.
- Non-goal motion: arrastrar tarjetas para reprogramar (follow-up).

### Implementation mapping

- Route / surface: `apps/web/src/app/calendar/page.tsx` y pestaña Calendario de la campaña.
- Primitive / variant / kind: grilla y tarjetas extendidas; `Sheet` `md`.
- Component candidates: `CalendarHeader`, `ActivationFilters`, `CalendarGrid`, `WeekBands`, `DayView`, `DayPopover`, `PlatformTimeline`, `SpanBar`, `PaidLines`, `ActivationCard`, `ActivationSheet`, `PiecePreview`, `ActivationForm`, `ReprogramDialog`, `LinkExecutionDialog`, `UnlinkedExecutions`, `ExecutionFreshnessBar`.
- Copy source: `apps/web/src/copy.ts` (`execution`, `activations`, `channels`).
- Data reader / command: `GET /api/v1/calendar` con filtros (incluye mercado); `getActivation` con evidencia, avisos y eventos; `listUnlinkedExecutions`; commands `planActivation`, `updateActivation`, `rescheduleActivation`, `cancelActivation`, `linkExecution`, `unlinkExecution`, `createActivationFromExecution` (TASK-2001).
- API parity: escritura sólo por `/api/v1`.
- Access / capability: `marketing_studio.campaign.write` en servidor.
- States to implement: ready, loading, empty, partial, error, denied.

### GVC scenario plan

- Scenario file: script Playwright (Chrome) contra `localhost:3100` sobre staging; versionado en el harness de TASK-1895 si ya existe.
- Route: `/calendar?month=2026-10`, `?view=week`, `?view=day`, `?view=timeline`, `?activation=<id>`, `/campaigns/CMP-001?tab=calendar`.
- Viewports: 1440×1100 y 390×844, claro y oscuro.
- Quality profile: `premium`
- Required steps: filtros; hoja programada, vencida, paid en curso y email; planificar; reprogramar con aviso; vincular; crear desde ejecución; cancelar; recorrido con teclado.
- Required captures: las 15 `after-*` del wireframe (mes claro y oscuro, semana, día, línea de tiempo, pauta, hojas, formularios, móvil).
- Required `data-capture` markers: `calendar-filters`, `calendar-grid`, `activation-card`, `activation-sheet`, `unlinked-executions`.
- Assertions: chip = estado del reader; ninguna «Publicada» sin `publishedAt`; miniatura de la pieza.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Reduced-motion / focus evidence: hoja con `reducedMotion: 'reduce'`; recorrido por teclado.
- Review dossier: capturas `after-*` + scorecard `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-activations`; línea base `approved-v3-*` (canvas versión `1791147930-57cf`).

### Design decision log

- Decision: el calendario vigente pasa a ser de activaciones, con filtros por dimensión, estados de ejecución, hoja y bandeja de no vinculados.
- Alternatives considered: espejo de Metricool (descartado por el operador); Gantt por plataforma en la semana (reemplazado por la línea de tiempo de v3.1); canvas libre con pan/zoom (descartado); baldosa blanca para isotipos (reemplazada por negativos); bandeja sólo en Hoy (descartado).
- Why this pattern: conserva la dirección aprobada y junta plan y ejecución.
- Reuse / extend / new primitive: extiende lo vigente; reusa primitives de TASK-1895.
- Open risks: dependencias de TASK-1905 y TASK-2001 (avisos, eventos, mercado, lector de la web); isotipos en negativo hasta TASK-2004.

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440×1100, 390×844.
- Required captures: `after-*` listadas.
- Required `data-capture` markers: los cinco del plan.
- Scroll-width check: sí.
- Accessibility/focus checks: grilla con nombres accesibles, foco en hoja, estados con texto.
- Before/after evidence: `before-*` (2026-10-04) vs `after-*`.
- Known visual debt: arrastrar para reprogramar (follow-up).
- Visual scorecard: `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección visual (hecho 2026-10-04)

- Páginas v3, v3.1 y v3.2 aprobadas por el operador; renders `approved-v3-*.webp`; wireframe y flow conciliados; `UI ready: yes`.

### Slice 2 — Calendario y filtros

- Grilla mes/semana/día, línea de tiempo por plataforma, tarjetas con pieza e isotipo y estado, franjas paid con resumen, vista de pauta, filtros (incluido mercado) en la URL, lista móvil, carga, primer uso y contrato de teclado.

### Slice 3 — Hoja y acciones

- `ActivationSheet` con preview por formato (video, carrusel, horizontal, grupo de recursos, email, blog, landing), copy literal, evidencia, avisos de pieza y editar/reprogramar/cancelar; formulario `Planificar`/`Editar`; diálogo `Reprogramar`; bandeja de ejecución sin activación con vincular y crear desde ejecución.
- Bloque **Tracking URL** en la hoja: la URL generada por TASK-2001 con botón copiar, sus parámetros legibles y las advertencias `tracking_missing` / `tracking_mismatch` / `tracking_frozen`; la UI nunca arma ni edita UTM.

### Slice 4 — Evidencia

- Capturas, scorecard, scroll y foco; manual de uso.

## Out of Scope

- Contrato y descubrimiento (TASK-2001); publicar o programar en herramientas; métricas; arrastrar para reprogramar; lo de v3.3 (trimestre, historial, comentarios, lote, exportar, vista de cliente, propuesta por agente: TASK-2005/2006).

## Detailed Spec

Ver wireframe y flow de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (dirección aprobada) antes de cualquier JSX; TASK-2001 en el mismo ambiente antes de Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Densidad ilegible con muchas activaciones | UI | medium | «+N» por día, vista semana y filtros | revisión de capturas |
| El estado pintado no coincide con el reader | UI | low | la UI no calcula estados; aserción en el escenario | aserciones Playwright |

### Feature flags / cutover

- Usa `STUDIO_ACTIVATIONS_ENABLED` de TASK-2001 (sin flag propio).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | sin runtime | — | sí |
| Slice 2–3 | flag OFF o revert + push | 5 min | sí |
| Slice 4 | sin runtime | — | sí |

### Production verification sequence

1. Local contra staging con capturas y aserciones.
2. Push de Studio `main` con autorización del operador y el flag ON en producción.

### Out-of-band coordination required

- Autorización de push del operador (la dirección visual ya está aprobada).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, wireframe y flow existentes; `UI ready` pasa a `yes` sólo con la dirección v3 aprobada y `pnpm task:lint --task TASK-2002` sin hallazgos.
- [ ] El calendario filtra por modality, family, platform, account, mercado, campaña y estado, con los filtros en la URL.
- [ ] Cada tarjeta muestra la pieza, la plataforma, la cuenta y el estado de ejecución con texto; ninguna «Publicada» sin fecha observada.
- [ ] La bandeja «Ejecución sin activación» permite vincular y crear activación, y baja su conteo al resolver.
- [ ] Copy en `apps/web/src/copy.ts` con test; sin voseo.
- [ ] Sin scroll horizontal de página en 1440 y 390; capturas y scorecard registrados.
- [ ] La hoja muestra la tracking URL de la activación (copiar) y sus advertencias; ninguna UTM se construye en el cliente.
- [ ] Cada acción de la UI tiene su equivalente probado en una sesión MCP real (mismo command, identidad delegada).
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

- TASK-2005 (contrato) y TASK-2006 (UI): trimestre, identidad de campaña, feriados, historial, resultados, comentarios, acciones en lote, exportar, vista de cliente y propuesta por agente.
- TASK-2004: isotipos en negativo en AXIS.
- Arrastrar tarjetas para reprogramar.
- Capa de ventanas de experimento (TASK-1911).
