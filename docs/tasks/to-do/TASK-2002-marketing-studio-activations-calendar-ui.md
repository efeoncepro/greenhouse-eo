# TASK-2002 — Marketing Studio: calendario de activaciones y ejecución en la UI

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

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2002-marketing-studio-activations-calendar.md`
- Flow: `docs/ui/flows/TASK-2002-marketing-studio-activations-calendar-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-10-04; consumidora de TASK-2001; falta la dirección visual v3 aprobada`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-2001 (activaciones, evidencia y reader del calendario) · aprobación de los artboards «v3 · Calendario de activaciones» · TASK-1895 si sus primitives Sheet/ConfirmDialog no existen aún (si no, esta task las crea con el mismo contrato)`
- Branch: `efeonce-marketing-studio main (componentes y copy) · Greenhouse develop (docs, capturas, scorecard); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte el calendario de Studio (global `/calendar` y la pestaña Calendario de cada campaña) en el **calendario de
activaciones**: filtros por modality, family, platform y account; tarjetas con la miniatura de la pieza y el **estado de
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
- Loading: esqueleto de grilla.
- Empty: «No hay activaciones en este período con estos filtros.»
- Error: «No pudimos cargar el calendario.» + Reintentar.
- Degraded / partial: aviso de lectura de la herramienta atrasada.
- Permission denied: acciones `aria-disabled` con la razón.
- Long content: «+N» por día; nombres de campaña con elipsis.
- Mobile / compact: semana como lista por día; filtros en hoja.
- Keyboard / focus: flechas entre días; Enter abre; foco atrapado en la hoja.
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
- Component candidates: `CalendarHeader`, `ActivationFilters`, `CalendarGrid`, `SpanBar`, `ActivationCard`, `ActivationSheet`, `LinkExecutionDialog`, `UnlinkedExecutions`.
- Copy source: `apps/web/src/copy.ts` (`execution`, `activations`, `channels`).
- Data reader / command: `GET /api/v1/calendar` con filtros; `getActivation`; `listUnlinkedExecutions`; commands de TASK-2001.
- API parity: escritura sólo por `/api/v1`.
- Access / capability: `marketing_studio.campaign.write` en servidor.
- States to implement: ready, loading, empty, partial, error, denied.

### GVC scenario plan

- Scenario file: script Playwright (Chrome) contra `localhost:3100` sobre staging; versionado en el harness de TASK-1895 si ya existe.
- Route: `/calendar?month=2026-10`, `?view=week`, `/campaigns/CMP-001?tab=calendar`.
- Viewports: 1440×1000 y 390×844, claro y oscuro.
- Quality profile: `premium`
- Required steps: filtros; hoja programada; hoja vencida; vincular; crear desde ejecución; cancelar.
- Required captures: `after-month`, `after-week`, `after-sheet`, `after-unlinked`, `after-mobile`, `after-dark`.
- Required `data-capture` markers: `calendar-filters`, `calendar-grid`, `activation-card`, `activation-sheet`, `unlinked-executions`.
- Assertions: chip = estado del reader; ninguna «Publicada» sin `publishedAt`; miniatura de la pieza.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Reduced-motion / focus evidence: hoja con `reducedMotion: 'reduce'`; recorrido por teclado.
- Review dossier: capturas `after-*` + scorecard `docs/ui/reviews/TASK-2002-marketing-studio-activations-calendar.scorecard.json`.
- Baseline decision / surface ID: `studio-calendar-activations`, tras aprobar la dirección v3.

### Design decision log

- Decision: el calendario vigente pasa a ser de activaciones, con filtros por dimensión, estados de ejecución, hoja y bandeja de no vinculados.
- Alternatives considered: espejo de Metricool (descartado por el operador); Gantt por canal (candidato para Semana en v3); bandeja sólo en Hoy (descartado).
- Why this pattern: conserva la dirección aprobada y junta plan y ejecución.
- Reuse / extend / new primitive: extiende lo vigente; reusa primitives de TASK-1895.
- Open risks: dirección v3 sin aprobar; densidad; dependencias de TASK-1905/2001.

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440×1000, 390×844.
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

### Slice 1 — Dirección visual

- Página `v3 · Calendario de activaciones` en el canvas con los cinco artboards (claro y oscuro); aprobación del operador; wireframe conciliado y `UI ready: yes`.

### Slice 2 — Calendario y filtros

- Grilla mes/semana, tarjetas con pieza y estado, franjas paid, filtros en la URL, lista móvil.

### Slice 3 — Hoja y acciones

- `ActivationSheet` con evidencia, reproductor, editar/reprogramar/cancelar; bandeja de ejecución sin activación con vincular y crear.
- Bloque **Tracking URL** en la hoja: la URL generada por TASK-2001 con botón copiar, sus parámetros legibles y las advertencias `tracking_missing` / `tracking_mismatch` / `tracking_frozen`; la UI nunca arma ni edita UTM.

### Slice 4 — Evidencia

- Capturas, scorecard, scroll y foco; manual de uso.

## Out of Scope

- Contrato y descubrimiento (TASK-2001); publicar o programar en herramientas; métricas; arrastrar para reprogramar.

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

- Aprobación de la dirección visual v3 por el operador; autorización de push.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux`, `UI impact: flow`, wireframe y flow existentes; `UI ready` pasa a `yes` sólo con la dirección v3 aprobada y `pnpm task:lint --task TASK-2002` sin hallazgos.
- [ ] El calendario filtra por modality, family, platform, account, campaña y estado, con los filtros en la URL.
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

- Arrastrar tarjetas para reprogramar.
- Capa de ventanas de experimento (TASK-1911).
