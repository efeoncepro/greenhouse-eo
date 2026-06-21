# TASK-1213 — Quotes Pipeline Redesign + Adaptive Preview

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
- Backend impact: `none`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|commercial|ui`
- Blocked by: `none`
- Branch: `task/TASK-1213-quotes-pipeline-redesign-adaptive-preview`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Redisenar `/finance/quotes` como un pipeline comercial accionable: tabla full-width por defecto, acciones por fila visibles en hover/focus/mobile, y preview bajo demanda con `AdaptiveSidecarLayout`/`ContextualSidecar`. El objetivo es reemplazar la lectura plana tipo tabla legacy por una cola operativa densa, moderna y accesible sin sacrificar ancho de comparacion.

## Why This Task Exists

La vista actual `QuotesListView` usa una card blanca con filtros clasicos y una tabla que navega al detalle al hacer click en la fila. Visualmente se siente plana, con jerarquia debil y poca inteligencia comercial: no prioriza vencimientos, margen, estados ni acciones inmediatas. Un inspector fijo resolveria contexto, pero quita demasiado espacio horizontal a la tabla. La decision de producto es mantener la tabla como superficie principal y abrir un preview solo cuando el usuario lo pide.

## Goal

- Transformar la vista de cotizaciones en una superficie `queue + adaptive preview`: tabla amplia, filtros compactos, summary strip y preview bajo demanda.
- Agregar acciones por fila que aparecen en hover y focus, con alternativa visible en mobile: `Revisar` abre el sidecar; menu de acciones usa una superficie contextual gobernada.
- Construir el preview con detalle comercial suficiente para decidir el siguiente paso sin navegar fuera de la tabla.
- Definir microcopy, tokens visuales, motion, microinteracciones y GVC como parte del alcance, no como polish final.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/architecture/GREENHOUSE_COMPOSITION_SHELL_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MOTION_PRIMITIVE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

Reglas obligatorias:

- No dejar un inspector/sidecar fijo abierto por default; la tabla conserva ancho completo hasta que el usuario active `Revisar`.
- El preview desktop debe ser `AdaptiveSidecarLayout` + `ContextualSidecar`, no un drawer/modal desktop custom ni un panel flotante permanente.
- En mobile/tablet, el preview degrada a drawer temporal con foco gestionado; las acciones de fila no dependen de hover.
- Los botones de fila deben aparecer en `hover` y `focus-within`; teclado y lector de pantalla tienen acceso equivalente.
- Las acciones de negocio peligrosas o irreversibles no se ejecutan desde un menu ligero; solo se muestran si ya existe command/API gobernado y confirmacion adecuada.
- Copy visible reusable vive en `src/lib/copy/*`; evitar `Preview` en ingles. Usar `Revisar` / `Vista rapida` segun decida Discovery.
- Token mapping estricto: colores via `theme.palette.*`, `theme.greenhouseSemantic.*`, `theme.axis.*` o CSS vars `var(--mui-palette-*)`; tipografia via variants/tokens; spacing en escala 4n; radius via `theme.shape.customBorderRadius.*`; motion via tokens.
- No hardcodear HEX, `fontFamily`, `fontSize` inline ni duraciones `ms` locales.
- Validar `document.documentElement.scrollWidth <= document.documentElement.clientWidth` en desktop y mobile 390px.

## Normative Docs

- `src/views/greenhouse/finance/QuotesListView.tsx` (surface actual).
- `src/app/(dashboard)/finance/quotes/page.tsx` (route actual).
- `src/app/(dashboard)/finance/quotes/[id]/page.tsx` (detalle existente para continuidad).
- `src/app/api/finance/quotes/route.ts` y `src/app/api/finance/quotes/[id]/route.ts` (contratos existentes que la UI debe consumir, no duplicar).
- `src/lib/copy/finance.ts` y `src/lib/copy/pricing.ts` (copy de dominio a reutilizar o extender).
- `src/components/greenhouse/primitives/index.ts` (barrel de primitives existentes).
- `src/components/greenhouse/primitives/GreenhouseButton.tsx` y `greenhouse-button-controller.ts` (tokens de botones).
- `src/components/greenhouse/primitives/GreenhouseChip.tsx` (badges/status).
- `src/components/greenhouse/primitives/AdaptiveSidecarLayout.tsx`, `ContextualSidecar.tsx`, `adaptive-sidecar-controller.ts`.
- `src/components/greenhouse/primitives/GreenhouseFloatingSurface.tsx`, `floating-surface-controller.ts`.
- `src/components/greenhouse/primitives/composition-shell/CompositionShell.tsx`.
- `scripts/frontend/scenarios/` (crear scenario GVC si no existe uno para `/finance/quotes`).

## Dependencies & Impact

### Depends on

- Contratos existentes de quotes list/detail (`/api/finance/quotes`, `/api/finance/quotes/[id]`) y el hook `useQuotesList`.
- `DataTableShell` para contener la tabla y evitar page-level horizontal scroll.
- Primitives UI Platform existentes: `CompositionShell`, `AdaptiveSidecarLayout`, `ContextualSidecar`, `GreenhouseFloatingSurface`, `GreenhouseButton`, `GreenhouseChip`.

### Blocks / Impacts

- Mejora la operacion diaria del pipeline de cotizaciones antes de tareas backend-data de parity/write (`TASK-1211`, `TASK-1212`, `TASK-1202`, `TASK-1206`).
- Puede alimentar un future GVC baseline de Commercial/Finance quotes.
- Si Discovery detecta datos faltantes para el preview que no existen en el contrato actual, debe abrirse task `backend-data` separada; esta task no inventa DTO client-side.

### Files owned

- `src/views/greenhouse/finance/QuotesListView.tsx`
- `src/views/greenhouse/finance/components/*Quote*` `[verificar / crear solo si el patron se repite o reduce complejidad real]`
- `src/lib/copy/finance.ts`
- `src/lib/copy/pricing.ts`
- `scripts/frontend/scenarios/finance-quotes-pipeline.scenario.ts` `[nuevo si no existe scenario reusable]`
- tests focales de UI/hook si aplica
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `/finance/quotes` renderiza `QuotesListView`.
- `QuotesListView` ya lista cotizaciones, filtra por `status` y `source`, usa `DataTableShell` y navega a `/finance/quotes/[id]` al hacer click en fila.
- La tabla muestra numero, cliente, fecha, vencimiento, monto, version, margen, estado y fuente.
- Ya existen status/source configs locales, `formatCurrency`, `formatDate`, `useQuotesList` y una animacion de lista via `useListAnimation`.
- Ya existen primitives Greenhouse para sidecar, floating surface, botones, chips, breadcrumbs, composition shell y density/motion.

### Gap

- La vista se percibe plana y legacy: card unica, header poco jerarquico, filtros como campos vacios grandes y tabla sin affordances modernos.
- No hay summary strip de senales comerciales: total, borradores, emitidas, vencidas, monto total, margen en riesgo.
- La fila completa navega al detalle, lo que mezcla scanning con accion accidental.
- No hay preview contextual; revisar una cotizacion exige perder el contexto de tabla/filtros/scroll.
- Las acciones por fila no existen como microinteraccion hover/focus/mobile.
- El copy `Preview` seria incorrecto para una UI es-CL; falta microcopy canonica para `Revisar`, acciones de fila, empty/error/partial.
- No hay GVC scenario dedicado para la vista de quotes con sidecar abierto/cerrado y acciones de fila.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador comercial/finance interno que revisa cotizaciones, vencimientos, margen y fuente antes de emitir, enviar o convertir.
- Momento del flujo: revision diaria del pipeline comercial; comparar varias cotizaciones y profundizar solo en las que requieren accion.
- Resultado perceptible esperado: la primera pantalla comunica "que requiere atencion ahora" y permite abrir un detalle contextual sin abandonar la tabla.
- Friccion que debe reducir: perdida de contexto al navegar, exceso de ancho consumido por inspector fijo, tabla visualmente plana, acciones invisibles para teclado/mobile.
- No-goals UX: no reconstruir Quote Builder, no cambiar backend/API, no crear una primitive platform-level nueva, no implementar write parity ni Q2C canonical close.

### Surface & system decision

- Surface: `/finance/quotes`.
- Composition Shell: `aplica` - usar `CompositionShell` como substrato de la pantalla; `primary` contiene header, summary, filtros y tabla; `aside/overlay` se activa solo cuando `Revisar` abre preview.
- Primitive decision: `reuse` - usar primitives existentes; extender solo si Discovery demuestra una variante reusable faltante. No crear `QuoteInspectorDrawer` paralelo.
- Adaptive density / The Seam: `aplica` - summary cards/rows y preview content deben adaptarse a ancho de contenedor; en mobile no debe desaparecer el dato clave.
- Floating/Sidecar/Dialog decision: row action menu usa `GreenhouseFloatingSurface variant='actionMenu'`; quote preview usa `AdaptiveSidecarLayout` + `ContextualSidecar`; Dialog solo para confirmaciones sensibles si ya existen.
- Copy source: `src/lib/copy/finance.ts` o `src/lib/copy/pricing.ts`; copy one-off solo para labels no reutilizables.
- Access impact: `none` esperado - la ruta y endpoints existentes mantienen su gating. Si aparece accion nueva con capability faltante, abrir task backend-data separada.

### State inventory

- Default: summary strip + filters + tabla full-width; ninguna sidecar abierta.
- Loading: skeleton estable para summary, filtros y tabla; no spinner suelto que cambie el layout.
- Empty: mensaje orientado a crear o sincronizar cotizaciones, con CTA `Nueva cotizacion` si el usuario tiene acceso.
- Error: estado in-page con causa accionable y retry; no mostrar raw errors.
- Degraded / partial: si una fila no tiene monto, margen, vencimiento o fuente, mostrar "Sin monto", "Sin margen" o `-` con tooltip/aria cuando aporte claridad; no pintar `$0` como dato real si no lo es.
- Permission denied: mantener guard actual; si la vista renderiza denied, copy debe ser claro y no filtrar datos.
- Long content: cliente/quote number largos truncan con tooltip accesible o wrap controlado; no empujan ancho de pagina.
- Mobile / compact: row actions visibles como boton compacto `...`/`Acciones`; preview como drawer; tabla o lista densa conserva numero, cliente, monto, estado y accion.
- Keyboard / focus: `Tab` revela acciones de fila; `Enter/Space` en `Revisar` abre preview; `Escape` cierra sidecar si no hay dirty state; foco vuelve al boton invocador.
- Reduced motion: sidecar, row actions y summary reveal degradan a cambios instantaneos o fade minimo sin transform.

### Interaction contract

- Primary interaction: `Revisar` en una fila abre preview contextual de esa cotizacion.
- Hover / focus / active: acciones de fila aparecen por `:hover` y `:focus-within`; la fila tiene hover sutil con `theme.palette.action.hover`; foco visible usa outline tokenizado.
- Pending / disabled: acciones que cargan detalle muestran pending local en el boton o sidecar skeleton; acciones no disponibles por status se ocultan o explican con disabled reason accesible.
- Escape / click-away: `Escape` cierra preview si no hay cambios; click en otra fila puede reemplazar preview solo si no hay estado dirty; action menu cierra con Escape/click-away y restaura foco.
- Focus restore: cerrar preview devuelve foco al `Revisar` de la fila originadora o a la fila si el boton ya no existe por refetch.
- Latency feedback: sidecar abre con shell/chrome inmediato y body skeleton si el detalle tarda; no bloquear toda la tabla.
- Toast / alert behavior: no usar toast para lectura/preview; errores del preview quedan dentro del sidecar. Toast solo si se ejecuta una accion existente que ya lo usa.

### Motion & microinteractions

- Motion primitive: `framer layout|CSS` para row actions/sidecar; `<Motion>` solo si se requiere stagger/reveal orquestado y se justifica en Discovery.
- Enter / exit: summary strip puede entrar con fade/translate sutil; row actions aparecen con opacity + translate inline; sidecar usa entrada canonica de `AdaptiveSidecarLayout`.
- Layout morph: apertura/cierre de preview debe reflowear la tabla con `CompositionShell`/sidecar, no overlay desktop permanente.
- Stagger: opcional para summary metrics o filas iniciales, usando tokens; no animar cada refetch si molesta el scanning.
- Timing / easing token: `motionCss.duration.short|standard|medium` y `motionCss.ease.emphasized|standard`; nunca ms crudos.
- Reduced-motion fallback: sin transform ni stagger; acciones aparecen instantaneas, sidecar abre/cierra sin nudge.
- Non-goal motion: no usar GSAP ni efectos cinematicos; esto es una herramienta operativa densa, no una landing.

### Visual verification

- GVC scenario: `finance-quotes-pipeline` (nuevo si no existe).
- Viewports: desktop 1440px, laptop 1280px y mobile 390px.
- Required captures: default cerrado, hover/focus row actions, action menu abierto, preview sidecar abierto, empty/error si se puede fixturear, mobile drawer.
- Required `data-capture` markers: `finance-quotes-page`, `finance-quotes-summary`, `finance-quotes-table`, `finance-quotes-row-actions`, `finance-quotes-preview`.
- Scroll-width check: obligatorio en desktop y mobile 390px; reportar `scrollWidth <= clientWidth`.
- Accessibility/focus checks: `Revisar` con `aria-label` por quote; action menu role/keyboard; sidecar heading focus; focus restore al cerrar.
- Before/after evidence: captura actual plana vs redisenada; guardar path `.captures/...` en Handoff.
- Known visual debt: no cerrar si la tabla pierde legibilidad, si los botones solo funcionan por hover, o si el sidecar roba demasiado ancho sin motivo.

## Backend/Data Contract

**Backend impact: `none` (rationale).** Esta task es un rediseño de la superficie visible de `/finance/quotes` y debe consumir los contratos existentes de lista/detalle de cotizaciones. No crea schema, migration, reader, command, sync, cron, webhook ni endpoint nuevo.

- Source of truth consumido: `useQuotesList` + `/api/finance/quotes` para lista; `/api/finance/quotes/[id]` o el reader ya usado por la detail page para preview `[verificar en Discovery]`.
- Full API Parity: si el preview o una accion de fila requiere datos o writes que no existen en contrato gobernado, **NO** se implementan en cliente. Se abre una task `backend-data` separada y esta task queda bloqueada o degrada el preview honestamente.
- Access/security: no se agregan routeGroups, views, entitlements ni capabilities. La UI respeta los guards existentes de la ruta/API.
- Runtime evidence backend: no aplica salvo smoke de que los endpoints existentes siguen respondiendo; la evidencia principal de esta task es UI/GVC.

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

### Slice 1 — Discovery, visual direction and primitive mapping

- Capturar o revisar la vista actual de `/finance/quotes` y confirmar el dolor visual: jerarquia, densidad, filtros, row interactions, mobile.
- Mapear primitives reales antes de JSX: `CompositionShell`, `DataTableShell`, `GreenhouseButton`, `GreenhouseChip`, `GreenhouseFloatingSurface`, `AdaptiveSidecarLayout`, `ContextualSidecar`.
- Definir si el preview puede consumir el contrato actual de quote detail; si falta data, registrar `[verificar]` y abrir/ligar task backend-data separada antes de inventar fields.
- Escribir un mini design brief en el plan: tabla full-width por defecto, sidecar bajo demanda, microcopy `Revisar`, summary strip y motion contract.
- Skills sugeridas a cargar antes de implementar: `greenhouse-product-ui-architect`, `greenhouse-portal-ui-implementer`, `greenhouse-vuexy-ui-expert`, `greenhouse-typography-accessibility`, `greenhouse-ux-content-accessibility`, `greenhouse-microinteractions-auditor`, `greenhouse-gvc-playwright`.

### Slice 2 — Page hierarchy, summary strip and filters

- Rehacer la jerarquia del first fold: header operativo, CTA `Nueva cotizacion`, summary strip de senales y filtros compactos.
- Reemplazar filtros grandes por una toolbar de trabajo: segmented/status chips para `Todas`, `Borradores`, `Emitidas`, `Vencidas` y filtros secundarios `Estado`, `Fuente`, busqueda si el contrato lo permite.
- Usar tokens de typography: titulo `h5`/`h6` segun densidad, metric labels `caption`/`labelSm`, cuerpo `body2`, sin font sizes locales.
- Usar colores semanticos: primary para CTA principal, info/success/warning/error para estado solo con texto visible, text.secondary para metadata, divider/action.hover para separacion.
- Mantener `Nueva cotizacion` con `GreenhouseButton kind='primaryAction' size='medium' leadingIconClassName='tabler-plus'`.

### Slice 3 — Enterprise table and row microinteractions

- Mantener tabla full-width dentro de `DataTableShell`; mejorar columnas para scanning: numero, cliente, fechas, monto, margen, estado, fuente, acciones.
- Agregar una columna final compacta de acciones que no consuma ancho hasta interactuar: `Revisar` visible en hover/focus, menu `...` o icon button para acciones secundarias.
- En mobile, reemplazar hover por accion visible: boton `Revisar` o `...` por row/card compacta.
- Tokenizar row states: hover `theme.palette.action.hover`, selected/preview-active `theme.palette.primary.lightOpacity` o equivalente tokenizado, border `theme.palette.divider`.
- Estados de badge: `GreenhouseChip kind='status' variant='label' tone='success|info|warning|error|secondary'`; no depender solo de color.
- Acciones por fila usan `GreenhouseButton kind='inlineAction' size='small'` o icon buttons MUI con `aria-label` si el texto no cabe; tooltips solo si el icono no es obvio.

### Slice 4 — Adaptive quote preview sidecar

- Implementar preview con `AdaptiveSidecarLayout` + `ContextualSidecar`, route-local state y fallback mobile drawer.
- Sidecar content minimo: quote number, cliente, monto, margen, vencimiento, fuente, estado, version, documentos/share status si ya existe en el contrato, historial/audit resumido si ya existe.
- Acciones en sidecar dependen del estado: borrador (`Editar`, `Completar`, `Emitir` si existe), emitida (`Descargar`, `Enviar`, `Ver evidencia`), vencida (`Renovar`/`Duplicar` si existe), sin monto/margen (`Completar datos`). No crear acciones nuevas sin command/API gobernado.
- Header del sidecar usa `ContextualSidecar` con titulo, subtitulo y status badge; footer sticky solo si hay acciones y no tapa contenido largo.
- El preview no reemplaza la detail page: incluir accion secundaria `Abrir detalle` hacia `/finance/quotes/[id]`.

### Slice 5 — Motion, microcopy and state completeness

- Mover copy reusable a `src/lib/copy/finance.ts` o `src/lib/copy/pricing.ts`: labels de filtros, `Revisar`, empty, preview loading/error, aria labels y disabled reasons.
- Coreografia de motion: reveal de summary, row action appear, sidecar open/replace/close y reduced-motion fallback.
- Cubrir loading/empty/error/degraded/partial/mobile/keyboard states en la vista y en el sidecar.
- Revisar contraste y tipografia con `greenhouse-typography-accessibility`; ajustar tokens antes de GVC.

### Slice 6 — GVC loop, tests and closure

- Crear `scripts/frontend/scenarios/finance-quotes-pipeline.scenario.ts` si no existe.
- Capturar desktop/laptop/mobile con sidecar cerrado, row action focus/hover y sidecar abierto.
- Medir `scrollWidth <= clientWidth` en desktop y mobile 390px.
- Ejecutar lint/tsc/tests focales y `pnpm design:lint`.
- Invocar `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` para cierre no trivial de UI.
- Actualizar `Handoff.md` y `changelog.md` con evidencia GVC, decision de primitives y cualquier deuda residual.

## Out of Scope

- No implementar Quote Read Parity, Write Parity, Q2C canonical close ni capability gates (ver `TASK-1211`, `TASK-1212`, `TASK-1206`, `TASK-1202`).
- No cambiar schema, migrations, readers, commands, cron ni sync.
- No redisenar `/finance/quotes/new`; esa superficie tiene trabajo reciente separado.
- No crear una primitive platform-level nueva salvo que Discovery pruebe repeticion real y se abra el protocolo de primitive + Lab + docs.
- No duplicar el detalle completo de quote si el contrato actual no lo expone; abrir task backend-data separada.
- No convertir todas las tablas Finance a este patron en el mismo cambio.

## Detailed Spec

### Proposed information architecture

```text
/finance/quotes
  Header
    Cotizaciones
    Gestiona propuestas, vencimientos, margen y emision documental.
    [Nueva cotizacion]

  Summary strip
    Total quotes
    Borradores
    Emitidas
    Vencidas
    Monto total
    Margen en riesgo

  Work toolbar
    Status segmented/chips
    Fuente filter
    Search/filter affordance if supported by existing hook/API

  DataTableShell
    Rows
      ...data columns...
      Actions: [Revisar] [more]

  Adaptive preview
    ContextualSidecar: quote summary + state-specific actions + open detail
```

### Token and component direction

- Buttons:
  - Primary CTA: `GreenhouseButton kind='primaryAction' size='medium' leadingIconClassName='tabler-plus'`.
  - Row `Revisar`: `GreenhouseButton kind='inlineAction' size='small' reserveInlineSize` if text shift occurs.
  - Secondary sidecar actions: `kind='secondaryAction'` or `variant='outlined'` per hierarchy.
  - Destructive actions, if any existing action appears, use `kind='destructiveAction'` and confirmation flow outside this task if not already governed.
- Chips:
  - Status/source/margin use `GreenhouseChip kind='status|attribute|metric' variant='label' size='small'`.
  - Colors map to semantic tones with text labels: draft/secondary, issued/info, accepted/success, expired/warning or error depending domain meaning, rejected/error.
- Typography:
  - Page title: MUI `h5` or `h6` depending final density; not hero-scale.
  - Summary value: `h6`/`subtitle1`; label `caption`; table cells `body2`; metadata `caption`.
  - Button labels inherit `controlText.*` from `GreenhouseButton`; chips inherit `typographyScale.labelSm`.
- Color:
  - Surfaces from `theme.palette.background.paper` / `theme.palette.background.default`.
  - Separators from `theme.palette.divider`.
  - Hover/focus from `theme.palette.action.hover` / primary outline.
  - Semantic feedback from `theme.greenhouseSemantic.*` or `var(--mui-palette-*-*)`.
- Spacing and shape:
  - 4n spacing scale; table rows stable height; no layout shift when actions appear.
  - Radius via `theme.shape.customBorderRadius.*` as CSS length; avoid large card radii.
- Motion:
  - `motionCss.duration.short|standard|medium`.
  - `motionCss.ease.emphasized` for enter/open and `motionCss.ease.standard` for hover/focus settles.
  - Animate `opacity`/`transform` only for row actions; do not animate table width/height.

### Suggested preview sections

- Identity: quote number, client name, status, version, source.
- Commercial summary: amount, currency, CLP equivalent, margin, margin floor/target if available.
- Time sensitivity: quote date, due date, expired/near-expiry state.
- Operational readiness: missing amount/margin/client/contact/documents if available.
- Activity/evidence: audit/document/share info only if exposed by existing detail contract.
- Actions: state-specific and capability-safe; always include `Abrir detalle`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (Discovery/primitive mapping) -> Slice 2 (hierarchy/summary/filter) -> Slice 3 (table/actions) -> Slice 4 (sidecar preview) -> Slice 5 (motion/copy/states) -> Slice 6 (GVC/tests/docs).
- Do not implement Slice 4 until Slice 1 confirms whether current detail data is enough for preview.
- Do not ship Slice 3 without keyboard/mobile parity for row actions.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Row actions only work on mouse hover | UI / a11y | medium | `focus-within` reveal, mobile visible action, keyboard GVC | keyboard cannot reach `Revisar` |
| Sidecar steals too much table width | UI / finance | medium | closed by default, only opens on explicit action, mobile drawer fallback | GVC shows key columns unreadable |
| UI duplicates missing backend fields client-side | Full API Parity | medium | consume existing contracts; open backend-data task if fields missing | preview has ad hoc computed data |
| Action menu exposes unsafe write actions | finance / access | low-medium | only show actions backed by existing governed API/command; disabled reason if not allowed | 4xx/403 or ungoverned fetch in UI |
| Motion distracts from scanning | UI | low-medium | CSS/framer subtle only, reduced-motion, no GSAP | operator feedback / GVC review |
| Page-level horizontal scroll appears | UI | medium | DataTableShell containment + scroll-width check desktop/mobile | `scrollWidth > clientWidth` |

### Feature flags / cutover

Sin flag esperado. Cambio UI additive sobre una ruta interna existente. Si el rediseño se vuelve riesgoso por amplitud, implementar detras de un toggle route-local o feature flag visual temporal y documentarlo en Handoff.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | no runtime change | N/A | si |
| Slice 2 | revert PR or restore previous header/filter block | <5 min | si |
| Slice 3 | revert row action column and restore row navigation | <5 min | si |
| Slice 4 | disable preview state and keep detail navigation | <5 min | si |
| Slice 5 | revert copy/motion additions | <5 min | si |
| Slice 6 | no runtime change beyond scenario/docs | N/A | si |

### Production verification sequence

1. Local: run lint/tsc/tests focales; run `pnpm design:lint`.
2. Local GVC: `pnpm fe:capture finance-quotes-pipeline --env=local` with desktop/laptop/mobile and inspect PNG frames.
3. Local browser/Playwright: measure `scrollWidth <= clientWidth` for desktop and 390px; verify keyboard focus opens/closes preview.
4. Staging after deploy: repeat GVC or targeted browser diagnostics against staging with agent auth/bypass.
5. Production only after staging visual approval if release scope includes it; otherwise document `code complete, rollout pendiente`.

### Out-of-band coordination required

N/A - repo-only UI change expected. If the task exposes new write actions, coordinate with owners of `TASK-1202`/`TASK-1212` before shipping those actions.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `QuotesListView` uses the agreed queue + adaptive preview pattern: table full-width closed state, preview only on explicit `Revisar`.
- [ ] The implementation reuses Greenhouse primitives (`CompositionShell`, `DataTableShell`, `AdaptiveSidecarLayout`, `ContextualSidecar`, `GreenhouseFloatingSurface`, `GreenhouseButton`, `GreenhouseChip`) or documents why a local one-off is safer.
- [ ] Row actions are available on hover, keyboard focus and mobile; no action is mouse-only.
- [ ] The preview sidecar shows quote identity, client, amount, margin, dates, status, source and state-specific next steps when the existing contract exposes them.
- [ ] Reusable copy for labels, aria labels, empty/error states and preview actions lives in `src/lib/copy/finance.ts` or `src/lib/copy/pricing.ts`.
- [ ] Button, chip, color, typography, spacing, radius and motion choices use canonical tokens; no hardcoded HEX/fontFamily/fontSize/ms values are introduced.
- [ ] Loading, empty, error, degraded/partial, mobile, keyboard/focus and reduced-motion states are covered.
- [ ] The action menu uses `GreenhouseFloatingSurface` or another approved primitive; it does not import `@floating-ui/react` directly from the view.
- [ ] No new business write action ships without an existing governed API/command/capability path; if a missing contract is needed, a backend-data follow-up is opened.
- [ ] GVC desktop/laptop/mobile captures are produced and reviewed for default, row actions and sidecar-open states.
- [ ] `scrollWidth <= clientWidth` is measured and documented for desktop and mobile 390px.

## Verification

- `pnpm exec eslint src/views/greenhouse/finance/QuotesListView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test` or focused tests touched by the implementation
- `pnpm design:lint`
- `pnpm fe:capture finance-quotes-pipeline --env=local`
- Playwright/browser check: `document.documentElement.scrollWidth <= document.documentElement.clientWidth` at desktop and 390px.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se documentaron las skills usadas, decision de primitives, evidencia GVC y cualquier deuda residual de preview/backend contract

## Follow-ups

- Si faltan datos de preview en `/api/finance/quotes/[id]`, abrir task `backend-data` para extender el reader/API en vez de computar en cliente.
- Si el patron row actions + adaptive preview se repite en Contracts/Master Agreements/Reconciliation, evaluar una primitive/kind reusable de `OperationalQueuePreview`.
- Si la action menu requiere write parity real, coordinar con `TASK-1202`, `TASK-1212` y `TASK-1206`.

## Open Questions

- Confirmar en Discovery si el texto final de la accion primaria sera `Revisar` o `Vista rapida`; recomendacion inicial: `Revisar` por tono operativo.
- Confirmar si el preview debe seleccionar fila sin cambiar URL o sincronizar `?quoteId=` para deep-linking; default: route-local state sin URL hasta que haya necesidad real.
- Confirmar si summary strip puede calcular monto total/margen en cliente desde la lista actual o requiere un reader agregado; si requiere fuente canonica, abrir task backend-data.
