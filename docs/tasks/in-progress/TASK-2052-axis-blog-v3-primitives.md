# TASK-2052 — AXIS: botón con texto que rueda y flecha dibujada, segmentado y buscador con haz

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-2052-axis-blog-v3-primitives.md`
- Flow: `none`
- Motion: `docs/ui/motion/TASK-2052-axis-blog-v3-primitives-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Code complete en AXIS local (Slices 1–3 + versiones preparadas del Slice 4, commits 5bdfa91, e8382ba, c0209bd, ba70438 en main local, sin push); publicación v0.7.15, instalación privada, vendorización y fila del ledger de la línea gráfica pendientes`
- Rank: `TBD`
- Domain: `ui|design-system`
- Blocked by: `none`
- Branch: `AXIS main (checkout /Users/jreye/Documents/axis-design-system); docs en Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Lleva a AXIS tres piezas del canvas aprobado de la portada del blog v3 que sirven a cualquier superficie: el botón con
texto que rueda y flecha que se dibuja (extensión de `efeonce.button`), un segmentado HTML con indicador que se desliza
y el buscador con haz de luz al foco. Se publican en los paquetes y el Lab, y el blog (TASK-2051) las vendoriza.

## Why This Task Exists

El sistema de botones del canvas fue iterado y aprobado por el operador (sin rellenos ni subrayados; el gesto vive en
el texto y el ícono). Hoy `axisButton.arrowMotion` sólo hace `nudge` (`packages/tokens/src/button.ts:86`), el
segmentado y el buscador sólo existen en `/react`, y el sitio público no admite React. Si estas piezas nacen en el
plugin del blog, la siguiente landing las vuelve a copiar a mano.

## Goal

- `efeonce.button` soporta texto que rueda y flecha dibujada con los valores del canvas.
- Existen segmentado y buscador con haz en HTML + JS mínimo, con Lab y contrato.
- El aura del buscador queda registrada como excepción aprobada y acotada de La órbita.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/public-site/PRIMITIVES.md`
- `docs/public-site/decisions/PDR-024-axis-en-el-sitio-publico-composicion-agentica.md`
- `.claude/skills/efeonce-graphic-line/references/package-and-tokens.md`
- `.claude/skills/efeonce-graphic-line/references/lab-components.md`

Reglas obligatorias:

- Valores desde tokens AXIS, nunca HEX sueltos en el consumidor.
- HTML + JS mínimo para el sitio público; React es una variante adicional, no la base.
- Toda excepción a la línea gráfica se registra en `.claude/skills/efeonce-graphic-line/references/ledger.md`.

## Normative Docs

- `docs/ui/visual-directions/TASK-2051-blog-portada-v3/README.md` (tablero `Botones.dc.html`)
- `docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md` (receta de vendorización con `VERSION.json`)

## Dependencies & Impact

### Depends on

- Ninguna; usa los paquetes AXIS actuales (tokens 0.6.x, primitives 0.7.x).

### Blocks / Impacts

- TASK-2051 consume las tres piezas (mientras tanto usa copias locales con los mismos valores).
- Landings existentes con botones AXIS: el modo nuevo es opcional y no cambia el default.

### Files owned

- `axis-design-system/packages/tokens/src/button.ts`
- `axis-design-system/packages/primitives/src/button.ts`
- `axis-design-system/packages/primitives/src/button-css.ts`
- `axis-design-system/packages/primitives/src/segmented.ts` [crear]
- `axis-design-system/packages/primitives/src/segmented-css.ts` [crear]
- `axis-design-system/packages/primitives/src/search-beam.ts` [crear]
- `axis-design-system/packages/primitives/src/search-beam-css.ts` [crear]
- `greenhouse-eo/.claude/skills/efeonce-graphic-line/references/ledger.md`

## Current Repo State

### Already exists

- `packages/primitives/src/button.ts`, `button-css.ts`, `button-orbit.ts` (loader) en AXIS.
- `arrowMotion` con `nudge` en `packages/tokens/src/button.ts:86`.
- Receta de vendorización al sitio con `VERSION.json` (menú global, landing dock).

### Gap

- No hay texto que rueda ni flecha dibujada.
- No hay segmentado ni buscador HTML sin React.
- La excepción del aura no está registrada.

## Modular Placement Contract

- Topology impact: `ui-package`
- Current home: repo `axis-design-system`, paquetes `tokens`, `primitives`, `contracts`
- Future candidate home: `ui-package`
- Boundary: primitives `efeonce.button` (extendido), `efeonce.segmented` y `efeonce.search-field`; consumidores: sitio público y Lab
- Server/browser split: HTML generado por funciones puras; JS de navegador mínimo e idempotente; sin datos ni secretos
- Build impact: dos módulos nuevos en `primitives`; sin dependencias externas
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: diseñadores y agentes que componen superficies públicas; visitantes que interactúan
- Momento del flujo: cualquier CTA, filtro por año o buscador del sitio
- Resultado perceptible esperado: botones premium con gesto en el texto y la flecha; buscador vivo al escribir
- Friccion que debe reducir: copiar a mano piezas aprobadas en cada landing
- No-goals UX: cambiar el default de los botones existentes

### Surface & system decision

- Surface: Lab de AXIS y consumidores del sitio público
- Nav placement: `none`
- Composition Shell: `no aplica` — primitive de paquete
- Primitive decision: `extend` — `efeonce.button`; `new` — segmentado y buscador HTML
- Adaptive density / The Seam: `no aplica`
- Floating/Sidecar/Dialog decision: ninguno
- Copy source: `local one-off` — etiquetas del Lab
- Access impact: `none`

### State inventory

- Default: reposo
- Loading: loader de la órbita (`aria-busy`)
- Empty: no aplica
- Error: no aplica (los estados de error son del formulario)
- Degraded / partial: sin JS (enlace, radios, formulario GET)
- Permission denied: no aplica
- Long content: textos largos en el botón no rompen la rueda (doble línea con `white-space: nowrap`)
- Mobile / compact: buscador 64 px; objetivos táctiles ≥ 44 px
- Keyboard / focus: foco visible AXIS; el foco dispara el mismo gesto que el hover
- Reduced motion: sin rueda, dibujo ni cometa

### Interaction contract

- Primary interaction: activar el botón; elegir una opción; escribir en el buscador
- Hover / focus / active: rueda + flecha; indicador que se desliza; haz
- Pending / disabled: `is-loading` con loader; `aria-disabled`
- Escape / click-away: no aplica
- Focus restore: no aplica
- Latency feedback: loader inmediato
- Toast / alert behavior: ninguno

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: no aplica
- Layout morph: indicador del segmentado
- Stagger: no aplica
- Timing / easing token: ver motion doc
- Reduced-motion fallback: ver motion doc
- Non-goal motion: rellenos, subrayados, brillos en botones

### Implementation mapping

- Route / surface: Lab `/references/buttons/`, `/references/forms/segmented/`, `/references/forms/search-beam/`
- Primitive / variant / kind: `efeonce.button` (`arrowMotion: draw`, `textMotion: roll`), `efeonce.segmented`, `efeonce.search-field` (`focusEffect: beam`)
- Component candidates: `buttonHtml`, `segmentedHtml`, `searchFieldHtml` + `mountSegmented`, `mountSearchBeam`
- Copy source: Lab
- Data reader / command: ninguno
- API parity: `N/A — primitive visual sin capability`
- Access / capability: público
- States to implement: los del inventario

### GVC scenario plan

- Scenario file: Lab de AXIS (Playwright del repo AXIS)
- Route: Lab local
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: hover y foco forzados por matriz; tecleo en el buscador
- Required captures: matriz de botones (oscuro y papel), segmentado, buscador en 4 estados
- Required `data-capture` markers: `axis-buttons-matrix`, `axis-segmented`, `axis-search-beam`
- Assertions: ≤ 1 % contra el canvas; foco visible
- Scroll-width checks: 390
- Reduced-motion / focus evidence: corrida con movimiento reducido
- Review dossier: Lab de AXIS
- Baseline decision / surface ID: baseline = `Botones.dc.html`; surface `axis-blog-v3-primitives`

### Design decision log

- Decision: nacer en AXIS
- Alternatives considered: piezas dentro del plugin del blog
- Why this pattern: uso general y fidelidad repetible
- Reuse / extend / new primitive: extend + new
- Open risks: aura como excepción a la línea gráfica

### Visual verification

- GVC scenario: Lab
- Viewports: 1440, 390
- Required captures: las tres matrices
- Required `data-capture` markers: los tres
- Scroll-width check: 390
- Accessibility/focus checks: axe; foco visible
- Before/after evidence: botón `nudge` vs `draw`
- Known visual debt: ninguna
- Visual scorecard: `docs/ui/reviews/TASK-2052-axis-blog-v3-primitives.scorecard.json`
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Botón con texto que rueda y flecha dibujada

- Tokens `arrowMotion: draw` y `textMotion: roll`; HTML y CSS en primitives; tono `glitch` acotado a Glitch.
- Lab con la matriz de estados del canvas.

### Slice 2 — Segmentado HTML

- `segmentedHtml` + `mountSegmented` + CSS; Lab.

### Slice 3 — Buscador con haz

- `searchFieldHtml` + `mountSearchBeam` + CSS (anillo, cometa SVG, aura, tecleo); Lab; ledger de la excepción.

### Slice 4 — Release y vendorización

- Release de los paquetes; vendorización al sitio con `VERSION.json` (consumida por TASK-2051).

## Out of Scope

- Cambiar el default de los botones existentes.
- Componentes React nuevos.
- Módulos de página del blog (slider, riel, cuenta regresiva).

## Detailed Spec

Valores exactos en el wireframe y el motion doc de esta task, tomados de `Botones.dc.html` y del canvas v3. La flecha
usa dos trazos: palo `M19 12H5` con `pathLength=1` y cabeza `M14 7l5 5l-5 5`. El cometa del buscador son tres `rect`
con `pathLength=100` y keyframes explícitos por capa (`0→-100`, `-12→-112`, `-19→-119`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 en cualquier orden; Slice 4 al final.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El modo nuevo cambia botones existentes | UI | low | opcional, default `nudge` | diff visual del Lab |
| El aura se filtra a otras superficies | línea gráfica | medium | modo explícito `focusEffect: beam` + ledger acotado | revisión de usos |

### Feature flags / cutover

- Sin flag — aditivo y opcional por parámetro.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1–3 | Revertir commit en AXIS | 5 min | sí |
| Slice 4 | Fijar la versión anterior en el consumidor | 10 min | sí |

### Production verification sequence

1. Lab local verde a 1440 y 390.
2. Release del paquete; instalación privada verificada.
3. Vendorización en el sitio en un paquete acotado de TASK-2051.

### Out-of-band coordination required

- N/A — repo-only change (AXIS); la publicación en el sitio la coordina TASK-2051.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [x] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log; si esta en `yes`, pasa `pnpm task:lint --task TASK-2052`.
- [x] Se declaro `Wireframe` y `Motion` y los archivos existen.
- [x] La matriz de botones del Lab coincide con `Botones.dc.html` (≤ 1 % por matriz). Evidencia 2026-10-24: 22 estados (Growth, Engine y Glitch xl en reposo/hover/foco/presionado, cargando, deshabilitado, neutro y navy md) contra el CSS del canvas con los valores finales de Portada-v3; máximo 0,017 %.
- [x] Segmentado y buscador funcionan sin JS y con JS, con foco visible y movimiento reducido. Evidencia: `forms-segmented.spec.ts` 16/16 y `forms-search-beam.spec.ts` 20/20 en Chromium, Firefox, WebKit y WebKit móvil; fidelidad contra el canvas 0 % (segmentado 5 estados, buscador 7 estados).
- [ ] La excepción del aura está en el ledger, acotada al foco del buscador web. Pendiente: quedó registrada en AXIS (`axisSearchField.beam.exception`, README de primitives y la página del Lab); la fila de `.claude/skills/efeonce-graphic-line/references/ledger.md` no se escribió porque esta sesión sólo podía tocar el archivo de la task.
- [ ] Los paquetes se publicaron y la instalación privada se verificó. Pendiente: versiones preparadas (tokens 0.6.10, contracts 0.7.13, registry 0.7.6, primitives 0.7.15) y tarball de primitives empaquetado localmente con sus 29 exports presentes; falta push a `main`, CI verde y `pnpm release:packages 0.7.15` con autorización del operador.

## Verification

- Pruebas de AXIS (`pnpm test` del repo AXIS)
- Lab local a 1440 y 390
- Instalación privada del paquete

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] la skill `efeonce-graphic-line` documenta las piezas nuevas

## Follow-ups

- Variante React del buscador con haz si el portal la pide.
