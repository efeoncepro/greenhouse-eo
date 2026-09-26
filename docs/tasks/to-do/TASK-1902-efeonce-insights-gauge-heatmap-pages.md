# TASK-1902 — Efeonce Insights: páginas de medidor y mapa de calor

## Delta 2026-09-26

- TASK-1888 complete con `INSIGHTS_EDITORIAL_V2_ENABLED` ON en staging y Production: sin flag propio, las páginas nuevas
  aparecen en ediciones nuevas de producción en cuanto salgan con TASK-1901; la revisión interna antes de compartir sigue siendo el gate. — por trabajo en TASK-1888

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
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1902-efeonce-insights-gauge-heatmap-pages.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-1901` (hechos de puntaje por medición, keyword × semana, tramos y `dimensionKind`)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega al informe A4 y al deck las páginas del canvas aprobado para las dos familias que TASK-1901 alimenta: el
medidor (puntaje de IA contra el período anterior y la meta) y el mapa de calor (posición de keywords por semana).
También manda los tramos de posición a la página de columnas. Con esto, un informe mensual SEO + AEO pasa de dos
tipos de gráfico a cinco o seis, con la misma fidelidad al canvas que TASK-1889.

## Why This Task Exists

El canvas del 2026-09-25 diseñó 15 familias. TASK-1889 construyó las cuatro que tenían productor, y TASK-1901 agrega
evidencia para medidor y mapa de calor, cuyas páginas todavía no existen: sin ellas, el planner no puede elegir esas
figuras (`hasFigurePage` devuelve `false`). Además, la regla del render manda un `bar_grouped` sin canales a
comparación, y los tramos de posición deben ir a columnas sobre un eje compartido, como en `Premium-Agrupadas`.

## Goal

- Plantillas de medidor y mapa de calor en ambos catálogos, a ≤ 1 % de sus páginas del canvas.
- Un `bar_grouped` con `dimensionKind: 'bucket'` compone en columnas.
- Una edición real de Berel compone con medidor, mapa de calor y tramos, revisada por el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§14.9, catálogos premium)
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` (motor del Artifact Composer)
- `docs/operations/runbooks/composer-visual-gate.md`
- `.claude/rules/tenders.md` y `.claude/rules/efeonce-insights.md` (auto-load)

Reglas obligatorias:

- Ningún HEX, px de color ni familia tipográfica literal en las plantillas: roles del pack `axis` (extensión `editorial`).
- La geometría sale de las cifras impresas con la geometría pura del motor (`gaugeGeometry`, `heatmapGeometry`); nada se dibuja a mano.
- Las zonas del medidor sólo existen si el dominio dueño las entrega como hechos; nunca un umbral escrito en la plantilla (lección de la banda de metas en TASK-1889).
- Una celda sin dato es un hueco, nunca cero; una cifra ilegible falla cerrado.
- El gate visual scoped (`--catalog=insights`) se congela junto a su delta en `BASELINE_DELTAS.md`, en el mismo commit.

## Normative Docs

- `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`
- `docs/ui/reviews/TASK-1889-efeonce-insights-premium-catalogs/README.md` (proceso de fidelidad y excepciones)
- `docs/tasks/to-do/TASK-1901-efeonce-insights-richer-evidence-for-chart-families.md`

## Dependencies & Impact

### Depends on

- `TASK-1901`: hechos y familias `gauge`, `heatmap` y `bar_grouped` por tramo con `dimensionKind`.
- `TASK-1889`: anatomía de figura, hooks, resolvers, `figure-slots.ts`, `hasFigurePage` y gate de fidelidad.

### Blocks / Impacts

- Los informes de Berel y Sky del rollout de EPIC-045: más familias en la misma edición.
- `TASK-1875` (web en Think): si renderiza las mismas familias, reutiliza la geometría pura.

### Files owned

- `src/lib/artifact-composer/catalogs/insights-report/report-figure-gauge.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-report/report-figure-heatmap.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-deck/insights-figure-gauge.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-deck/insights-figure-heatmap.{html,slots.json}`
- `src/lib/artifact-composer/catalogs/insights-shared/figure-svg.ts` y `figure-hooks.ts`
- `src/lib/efeonce-insights/render/figure-slots.ts`
- `scripts/insights/canvas-fixtures/{report,deck}/` (fixtures de las cuatro hojas)
- `scripts/frontend/baselines/artifact-composer/**` (frames nuevos)

## Current Repo State

### Already exists

- Hojas aprobadas: `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/paginas/Premium-Medidor.png`, `Premium-Heatmap.png`, `Deck-Medidor.png`, `Deck-Heatmap.png`, y la fuente editable en `fuente-canvas-2026-09-25.tar.gz`.
- Geometría pura del motor: `gaugeGeometry` y `heatmapGeometry` en `src/lib/artifact-composer/chart-geometry.ts`.
- Anatomía de figura, hooks (`makeColumnsHook`, `makeLinesHook`, `withDeckFigureSize`) y resolvers en `catalogs/insights-shared/`.
- Regla de familia y predicado `hasFigurePage` en `src/lib/efeonce-insights/render/figure-slots.ts`.
- Gate de fidelidad `pnpm insights:canvas-fidelity [--only] [--gray]` con excepciones aprobadas y techo.

### Gap

- No hay plantillas de medidor ni de mapa de calor en ningún catálogo.
- `figure-slots.ts` rechaza `gauge` y `heatmap` («familia sin página») y no conoce `dimensionKind`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/artifact-composer/catalogs/insights-*` y `src/lib/efeonce-insights/render/`
- Future candidate home: `worker`
- Boundary: los catálogos son dato del composer; el mapper es el único que traduce el plan congelado a slots
- Server/browser split: n/a — los catálogos componen en el Job `artifact-worker`; el mapper es server-side
- Build impact: none — sin dependencias nuevas; las fuentes salen del font pack del pack `axis`
- Extraction blocker: none

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente que lee el informe mensual (director de marketing o de marca) y el equipo de Efeonce que lo emite.
- Momento del flujo: lectura del informe A4 en PDF o del deck en presentación.
- Resultado perceptible esperado: ver de un vistazo dónde está el puntaje de IA contra el mes anterior y la meta, y qué keywords subieron o bajaron semana a semana.
- Fricción que debe reducir: informes monótonos de un solo tipo de gráfico.
- No-goals UX: interacción, animación, edición libre.

### Surface & system decision

- Surface: páginas `report-figure-gauge` y `report-figure-heatmap` (A4) y `insights-figure-gauge` / `insights-figure-heatmap` (deck).
- Nav placement: `none` — no agrega destino de navegación.
- Composition Shell: `no aplica` — documento de lienzo fijo del Artifact Composer, no superficie del portal.
- Primitive decision: `extend` — dos plantillas por catálogo sobre la anatomía de figura de TASK-1889.
- Adaptive density / The Seam: `no aplica` — lienzo fijo; la densidad se resuelve paginando.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/insights.ts` (`GH_INSIGHTS.catalog`).
- Access impact: `none`.

### State inventory

- Default: medidor con período, anterior y meta; mapa de calor con celdas medidas.
- Loading: no aplica (documento compuesto).
- Empty: sin hechos suficientes, la figura no se emite y el capítulo la narra.
- Error: cifra ilegible o fuera de escala ⇒ el render falla cerrado con causa.
- Degraded / partial: medidor sin meta (sin marca ni brecha); celdas sin dato vacías con borde.
- Permission denied: no aplica (lo gobiernan los permisos de la edición).
- Long content: mapa de calor pagina hasta 10 filas (A4) / 6 (deck); etiquetas largas en hasta dos líneas.
- Mobile / compact: la lámina 16:9 es la versión compacta.
- Keyboard / focus: no aplica (PDF).
- Reduced motion: no aplica (sin motion).

### Interaction contract

- Primary interaction: lectura.
- Hover / focus / active: no aplica.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica.
- Focus restore: no aplica.
- Latency feedback: no aplica.
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: ninguno.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica.
- Non-goal motion: cualquier animación.

### Implementation mapping

- Route / surface: salidas `report_pdf` y `deck_pdf` de una edición.
- Primitive / variant / kind: plantilla de figura A4 y lámina de figura 16:9 (TASK-1889).
- Component candidates: `gaugeSvg`, `heatmapSvg` en `figure-svg.ts`; hooks en `figure-hooks.ts`.
- Copy source: `src/lib/copy/insights.ts`.
- Data reader / command: plan congelado de la edición (`chapter.charts`, `readings`) vía `buildFigureSlides`.
- API parity: sin acción de negocio; las ediciones y salidas ya tienen API/MCP (TASK-1845/1846).
- Access / capability: la de la edición.
- States to implement: los del State inventory.

### GVC scenario plan

- Scenario file: no aplica: GVC exige ruta de portal; el harness es `pnpm insights:canvas-fidelity` + `pnpm composer:visual-gate --catalog=insights`.
- Route: ninguna.
- Viewports: A4 794×1123 y 16:9 1280×720.
- Quality profile: `premium`
- Required steps: fixtures con los datos del canvas; vista previa real de Berel con `--editorial-v2`.
- Required captures: las cuatro hojas lado a lado en color y en gris.
- Required `data-capture` markers: `data-slot` de cada región del wireframe.
- Assertions: cifras iguales al plan, sin datos de ejemplo, sin identificadores internos.
- Scroll-width checks: `assertSlideFitsCanvas` rechaza cualquier desborde del lienzo.
- Reduced-motion / focus evidence: no aplica.
- Review dossier: `docs/ui/reviews/TASK-1902-efeonce-insights-gauge-heatmap-pages/`
- Baseline decision / surface ID: frames nuevos de Insights declarados; resto intacto.

### Design decision log

- Decision: sólo medidor y mapa de calor, más la regla de columnas por tramo.
- Alternatives considered: construir las 11 familias restantes del canvas (rechazado: sin productor no aparecen en ningún informe y no se verifican con datos reales).
- Why this pattern: reutiliza la anatomía, los hooks y el gate de TASK-1889.
- Reuse / extend / new primitive: `extend`.
- Open risks: la lista de componentes del medidor depende del dominio; el contraste de cifras en la rampa del mapa de calor debe medirse.

### Visual verification

- GVC scenario: no aplica: harness del Composer.
- Viewports: A4 y 16:9 a tamaño físico.
- Required captures: ver GVC scenario plan.
- Required `data-capture` markers: `data-slot` por región.
- Scroll-width check: desborde de lienzo en el harness.
- Accessibility/focus checks: contraste AA de cifras sobre la rampa y lectura en gris.
- Before/after evidence: edición real de Berel antes (sin estas familias) y después.
- Known visual debt: ninguna declarada al crear la task.
- Visual scorecard: `docs/ui/reviews/TASK-1902-efeonce-insights-gauge-heatmap-pages.scorecard.json`
- Quality threshold: `average >= 4.5; floor >= 4; fidelity/template resistance >= 4.5`

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

### Slice 1 — Regla de columnas por tramo

- `figure-slots.ts` y `hasFigurePage` mandan `bar_grouped` con `dimensionKind: 'bucket'` o `'channel'` a columnas; `'metric'` o ausente, a comparación. Test.

### Slice 2 — Medidor (A4 y deck)

- `gaugeSvg` en `figure-svg.ts` sobre `gaugeGeometry`, hook y plantillas `report-figure-gauge` / `insights-figure-gauge` con fixtures del canvas a ≤ 1 %.
- Mapper: familia `gauge` en `figure-slots.ts` (valor, anterior, meta y zonas sólo desde hechos).

### Slice 3 — Mapa de calor (A4 y deck)

- `heatmapSvg` (o grilla HTML) sobre `heatmapGeometry`, plantillas `report-figure-heatmap` / `insights-figure-heatmap` con fixtures a ≤ 1 %.
- Mapper: familia `heatmap` con paginación equilibrada.

### Slice 4 — Verificación real y dossier

- Gate scoped congelado con delta; hojas en gris; vista previa real de Berel; dossier y scorecard.

## Out of Scope

- Evidencia y productores (TASK-1901).
- Las demás familias del canvas (dona, waffle, cascada, embudo, dispersión, Venn, UpSet, apiladas).
- Release a producción (va con el rollout de EPIC-045).

## Detailed Spec

El wireframe describe región por región ambas páginas, la regla `dimensionKind` y el mapeo a tokens. Las hojas de
referencia y la fuente editable están en `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs/`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slices 2 y 3 (independientes) → Slice 4.
- Ninguna plantilla se congela en el gate sin su fixture del canvas dentro del 1 % (o excepción aprobada por el operador).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Frames ajenos arrastrados al rebaseline | gate visual | low | `--catalog=insights` scoped | gate global |
| Umbral de zona escrito a mano | PDF al cliente | low | zonas sólo desde hechos; revisión en la vista previa | revisión del operador |
| Cifra ilegible sobre celda oscura | PDF al cliente | medium | contraste AA medido por escalón | dossier |
| Plan sellado con `bar_grouped` sin `dimensionKind` cambia de página | worker / PDF | low | ausente = comparación, como hoy | test de compatibilidad |

### Feature flags / cutover

- Sin flag propio: las familias nuevas sólo aparecen en ediciones con `INSIGHTS_EDITORIAL_V2_ENABLED` (TASK-1888, ON en staging y Production desde 2026-09-26) y la evidencia de TASK-1901.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del commit | < 15 min | si |
| Slices 2–3 | revert del commit y del baseline congelado | < 15 min | si |
| Slice 4 | sin runtime | inmediato | si |

### Production verification sequence

1. Local: fidelidad ≤ 1 %, gate a 0 px, vista previa real de Berel.
2. Staging: edición interna con el flag de TASK-1888 ON; revisión del operador.
3. Producción por el control plane (el Job `artifact-worker` es compartido); edición interna revisada antes de compartir.

### Out-of-band coordination required

- Revisión y aprobación del operador del PDF real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: ui-ux` y `UI impact: layout`; `Wireframe` existe; `UI ready` permanece `no` hasta completar mapping, dossier y scorecard.
- [ ] Un `bar_grouped` con `dimensionKind: 'bucket'` compone en columnas y uno sin el campo sigue en comparación (test).
- [ ] `report-figure-gauge`, `insights-figure-gauge`, `report-figure-heatmap` e `insights-figure-heatmap` quedan a ≤ 1 % de `Premium-Medidor`, `Deck-Medidor`, `Premium-Heatmap` y `Deck-Heatmap` (o excepción aprobada por el operador, con techo).
- [ ] Ninguna plantilla nueva contiene HEX, px de color ni familias tipográficas literales.
- [ ] Las zonas del medidor sólo se dibujan si el plan trae sus hechos; sin meta, no hay marca ni brecha.
- [ ] Una celda sin dato queda vacía, nunca en cero (test).
- [ ] El copy visible reusable vive en `src/lib/copy/insights.ts`.
- [ ] `pnpm composer:visual-gate --catalog=insights` pasa a cero píxeles con los frames nuevos declarados.
- [ ] La vista previa real de Berel compone con medidor, mapa de calor y tramos, y el operador la revisó.
- [ ] Dossier con hojas lado a lado en color y en gris, y scorecard con promedio ≥ 4,5 y piso ≥ 4.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/artifact-composer src/lib/efeonce-insights`
- `pnpm insights:canvas-fidelity --only=Medidor` y `--only=Heatmap`, con `--gray`
- `pnpm composer:visual-gate --catalog=insights`
- `scripts/insights/preview-edition.ts --editorial-v2` con Berel
- `pnpm task:lint --task TASK-1902`, `pnpm ui:quality --task TASK-1902`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` y arquitectura §14 actualizadas con las familias nuevas.

## Follow-ups

- Resto de las familias del canvas cuando su evidencia exista (Follow-ups de TASK-1901).
