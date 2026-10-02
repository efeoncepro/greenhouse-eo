# TASK-1958 — Efeonce Insights: jerarquía visual apta para cliente en el informe live y los PDF

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1958-efeonce-insights-client-fit-hierarchy.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|growth|delivery`
- Blocked by: `TASK-1957`
- Branch: `Greenhouse develop y efeonce-think main; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El informe live (Think) y los PDF presentan las cifras de cada capítulo como una lista plana de oraciones, sin jerarquía
tipográfica, con una grilla de puntajes y unos límites que se leen como advertencia técnica. Esta task reemplaza esas
regiones por hallazgos estructurados (métrica, cifra, cambio, lectura), una tabla de respaldo plegada y una sección de
alcance en lenguaje del cliente, consumiendo el modelo 1.2 de `TASK-1957`.

## Why This Task Exists

Revisión del operador del 2026-10-02 sobre Berel `EO-INS-000027` y Sky `EO-INS-000029`: «estos textos densos sin
negritas o jerarquías tipográficas se ven mal». En Think, `ModuleScene.astro` pinta `chapter.claims` como `<ul>` de
oraciones (`ins-claims`) y los hechos sueltos como grilla (`ins-facts`); la fila de procedencia muestra `Unidad count`
y la nota «Barras con origen en cero» en cada gráfico; los límites usan un ícono punteado de advertencia. Los PDF de
`TASK-1889` arrastran la misma lista de claims. El contenido lo corrige `TASK-1957`; la forma de leerlo es esta task.

## Goal

- Cada capítulo abre con hasta cinco hallazgos legibles de un vistazo y deja el resto como respaldo a un clic.
- Ningún texto técnico de presentación (unidad en código, nota de origen del eje, advertencias internas) queda visible.
- Web y PDF comparten la misma jerarquía, cada uno con su forma.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §6/§8
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`

Reglas obligatorias:

- Think es render tonto: no selecciona hallazgos ni redacta; lee los roles y etiquetas que entrega `TASK-1957`.
- Fallback 1.1 intacto: un modelo sin roles se sigue renderizando como hoy.
- Sin HEX ni fuentes literales en plantillas PDF; tokens y slots del Artifact Composer.

## Normative Docs

- `docs/ui/wireframes/TASK-1875-efeonce-insights-shared-web-render-think.md` (dirección A aprobada)
- `docs/ui/wireframes/TASK-1889-efeonce-insights-premium-catalogs.md`
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`
- `.claude/skills/efeonce-insights/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1957` — modelo 1.2 (fuente humana, `unitLabel`, `asOfLabel`, roles `finding|backing`, límites de cliente).
- `TASK-1875` y `TASK-1889` (complete) — superficie y catálogos sobre los que se cambian regiones.

### Blocks / Impacts

- Primera emisión de edición de cliente de Berel/Sky (no antes de cerrar 1957 y 1958).
- `TASK-1849` (portal) reutiliza los componentes de hallazgos cuando muestre el detalle de una edición.

### Files owned

- `efeonce-think/src/components/insights/ModuleScene.astro`
- `efeonce-think/src/components/insights/ChartFigure.astro`
- `efeonce-think/src/components/insights/FindingRows.astro` (nuevo)
- `efeonce-think/src/components/insights/AllFiguresTable.astro` (nuevo)
- `efeonce-think/src/lib/insights.ts`, `efeonce-think/src/lib/insights-copy.ts`, `efeonce-think/src/styles/insights.css`
- `src/lib/efeonce-insights/render/report-mapper.ts`
- `src/lib/artifact-composer/catalogs/insights-report/` y `insights-deck/` [verificar rutas exactas en Discovery]
- `docs/ui/wireframes/TASK-1958-efeonce-insights-client-fit-hierarchy.md`

## Current Repo State

### Already exists

- Superficie aprobada de TASK-1875 en `efeonce-think` (`InsightReport.astro`, `ModuleScene.astro`, `ChartFigure.astro`).
- Patrón de tabla plegable de la figura («chapter-table-open») y escala tipográfica `ins-*` en `insights.css`.
- Familia `waffle` disponible en el contrato de gráficos (`src/lib/efeonce-insights/contracts/chart-spec.ts`).
- Catálogos premium A4 y deck de TASK-1889 con fidelidad ≤1 % al canvas.

### Gap

- No hay componente de hallazgo estructurado ni tabla de respaldo por capítulo.
- La procedencia muestra unidad en código y la nota del eje en cada figura.
- Límites con estilo de advertencia y título «Límites de este capítulo».

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-think` (Astro SSR, Vercel) y catálogos del Artifact Composer en Greenhouse
- Future candidate home: `public`
- Boundary: Think consume `InsightWebModelV1` vía el lector público; los PDF consumen el plan vía `report-mapper.ts`
- Server/browser split: `render SSR en Astro sin islas nuevas; el disparador de la tabla usa el patrón existente sin dependencias`
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: ejecutivo del cliente (marketing/digital) que abre el enlace compartido o el PDF.
- Momento del flujo: lectura del informe mensual.
- Resultado perceptible esperado: entiende qué cambió y por qué importa en segundos, sin parsear oraciones.
- Friccion que debe reducir: listas densas, jerga interna, gráficos sin información.
- No-goals UX: rediseñar portada, presentación o descargas; cambiar la dirección A.

### Surface & system decision

- Surface: vista compartida `think.efeoncepro.com/insights/r/<token>` y PDF A4/deck.
- Nav placement: `none` — no agrega destinos de navegación.
- Composition Shell: `no aplica` — superficie Astro del hub, fuera del portal Greenhouse.
- Primitive decision: `extend` — sistema `ins-*` de Think; dos componentes locales nuevos.
- Adaptive density / The Seam: `no aplica` — página de lectura, no cards adaptables del portal.
- Floating/Sidecar/Dialog decision: ninguna.
- Copy source: `efeonce-think/src/lib/insights-copy.ts` y `src/lib/copy/insights.ts`
- Access impact: `none`

### State inventory

- Default: hallazgos + tabla plegada + alcance.
- Loading: SSR sin estado de carga propio (heredado).
- Empty: capítulo sin hallazgos materiales ⇒ «Sin cambios relevantes en este período.» y tabla abierta.
- Error: estados seguros heredados de TASK-1875 (404/410/429/502).
- Degraded / partial: banda de período abierto heredada; cifra ausente «Sin dato».
- Permission denied: no aplica (acceso por token, heredado).
- Long content: más de cinco hallazgos ⇒ el resto pasa a la tabla; nombres largos de métrica truncan con `title`.
- Mobile / compact: filas apiladas; tabla en filas o con scroll contenido.
- Keyboard / focus: disparador accesible por Tab, foco permanece al alternar.
- Reduced motion: sin motion nuevo; revelación existente ya respeta `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: expandir «Ver todas las cifras (n)».
- Hover / focus / active: estados del botón existentes del hub.
- Pending / disabled: no aplica.
- Escape / click-away: no aplica (disclosure en línea).
- Focus restore: el foco queda en el disparador.
- Latency feedback: no aplica (sin red).
- Toast / alert behavior: no aplica.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: sin motion nuevo.
- Layout morph: no aplica.
- Stagger: se retira `data-stagger` de la lista que se reemplaza.
- Timing / easing token: no aplica.
- Reduced-motion fallback: heredado.
- Non-goal motion: animar filas o la tabla.

### Implementation mapping

- Route / surface: `efeonce-think/src/pages/insights/r/[token].astro` → `InsightReport.astro` → `ModuleScene.astro`.
- Primitive / variant / kind: `FindingRows`, `AllFiguresTable` (locales al hub); `ChartFigure` con `unitLabel`/`asOfLabel`.
- Component candidates: ver wireframe §Implementation Mapping.
- Copy source: `insights-copy.ts` (`findingsTitle`, `allFiguresToggle`, `scopeTitle`, `changeVsPrevious`) y `GH_INSIGHTS.document`.
- Data reader / command: lector público existente (`/api/public/insights/shared/[token]`), modelo 1.2.
- API parity: superficie de sólo lectura; sin acciones de negocio nuevas.
- Access / capability: sin cambio (token compartido).
- States to implement: default, empty, long content, mobile, fallback 1.1.

### GVC scenario plan

- Scenario file: `efeonce-think/scripts/capture-insights-report.mjs`
- Route: `/insights/r/<fixture>` en `astro dev`
- Viewports: 1440×900 y 390×844
- Quality profile: `premium`
- Required steps: abrir capítulo SEO, AEO e ICO; expandir y cerrar la tabla.
- Required captures: `chapter-findings`, `chapter-all-figures-open`, `chapter-scope`, `chapter-aeo-waffle` × 2 viewports.
- Required `data-capture` markers: `findings`, `all-figures`, `scope`.
- Assertions: patrones del gate de TASK-1957 ausentes del texto visible; máximo cinco hallazgos; `caption`/`th` presentes; `aria-expanded` alterna.
- Scroll-width checks: `scrollWidth - clientWidth === 0` en ambos viewports con tabla abierta y cerrada.
- Reduced-motion / focus evidence: captura con `prefers-reduced-motion: reduce` y recorrido Tab.
- Review dossier: `docs/ui/reviews/TASK-1958-efeonce-insights-client-fit-hierarchy/`
- Baseline decision / surface ID: `think.insights.shared` (reemplaza regiones de la baseline de TASK-1875).

### Design decision log

- Decision: filas estructuradas de hallazgo + tabla de respaldo plegada + alcance informativo.
- Alternatives considered: negrita dentro de oraciones; una card por hallazgo; tabla única.
- Why this pattern: jerarquía de lectura sin card-on-card y con la evidencia completa a un clic.
- Reuse / extend / new primitive: extiende el sistema `ins-*`; dos componentes locales.
- Open risks: aprobación de la dirección por el operador; cantidad de hallazgos según el umbral de TASK-1957.

### Visual verification

- GVC scenario: ver plan.
- Viewports: 1440 y 390.
- Required captures: ver plan + recaptura del dossier de TASK-1875.
- Required `data-capture` markers: `findings`, `all-figures`, `scope`.
- Scroll-width check: sí.
- Accessibility/focus checks: `scripts/audit-insights-a11y.mjs`.
- Before/after evidence: capturas del 2026-10-02 (antes) contra las nuevas.
- Known visual debt: ninguna declarada.
- Visual scorecard: `docs/ui/reviews/TASK-1958-efeonce-insights-client-fit-hierarchy.scorecard.json`
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

### Slice 1 — Dirección aprobada

- Prototipo local con fixtures reales anonimizados de Berel y Sky; capturas desktop/mobile; aprobación del operador.
- `UI ready: yes` sólo con la aprobación registrada en el wireframe.

### Slice 2 — Think

- `FindingRows.astro` y `AllFiguresTable.astro`; `ModuleScene.astro` los usa cuando el modelo trae roles (1.2) y
  conserva el render actual con 1.1.
- `ChartFigure.astro` con `unitLabel`/`asOfLabel`; nota del eje sólo en la descripción accesible salvo eje sin cero.
- Alcance con ícono informativo y copy aprobado.

### Slice 3 — PDF A4 y deck

- `report-mapper.ts` y slots de los catálogos con la misma jerarquía; `pnpm insights:canvas-fidelity` y
  `pnpm composer:visual-gate` verdes; PDF reales revisados por el operador.

### Slice 4 — Release y verificación

- Deploy de `efeonce-think` (main) y release de Greenhouse por el control plane; canary productivo de una edición
  sintética emitida; dossier y scorecard.

## Out of Scope

- Selección de hallazgos, copy de límites y vocabulario de presentación → `TASK-1957`.
- Familias de gráfico nuevas → `TASK-1901`/`TASK-1902`.
- Portada, presentación y descargas.

## Detailed Spec

Ver `docs/ui/wireframes/TASK-1958-efeonce-insights-client-fit-hierarchy.md` (regiones, mapping, accesibilidad y plan
GVC).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- `TASK-1957` en producción → Slice 1 → Slice 2 → Slice 3 → Slice 4.
- Ninguna edición de cliente se emite hasta cerrar Slice 4 y la revisión del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El render 1.2 rompe ediciones 1.1 ya compartidas | Think público | low | fallback por presencia de roles + fixture 1.1 en `verify-insights-report.mjs` | verify rojo |
| Los PDF pierden fidelidad al canvas aprobado | artifact-worker | medium | cambios sólo en regiones listadas; `insights:canvas-fidelity` ≤1 % | gate visual rojo |
| Scroll horizontal en mobile por la tabla | Think público | medium | filas apiladas o scroll contenido; assertion de scroll-width | verify rojo |

### Feature flags / cutover

- Sin flag — el cambio es aditivo por versión del modelo: con 1.2 se usa la jerarquía nueva, con 1.1 la anterior.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | sin efecto en runtime (prototipo local) | inmediato | si |
| Slice 2 | revert en `efeonce-think` main + redeploy Vercel | ~10 min | si |
| Slice 3 | revert PR + release por el orquestador | ~30 min | si |
| Slice 4 | rollback del deployment de Think o del release | ~10–30 min | si |

### Production verification sequence

1. Fixtures 1.1 y 1.2 verdes en `verify-insights-report.mjs` y a11y.
2. Think en preview con el lector de staging; capturas desktop/mobile.
3. Release de Greenhouse y deploy de Think.
4. Canary productivo: enlace sobre la edición sintética emitida, revisar, revocar.

### Out-of-band coordination required

- Aprobación del operador de la dirección (Slice 1) y de los PDF reales (Slice 3).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaro `Execution profile: ui-ux` y `UI impact` segun el alcance real.
- [ ] `UI ready` permanece `no` hasta que el wireframe y `## UI/UX Contract` tengan implementation mapping, GVC scenario plan y design decision log, y el operador apruebe la dirección; si esta en `yes`, pasa `pnpm task:lint --task TASK-1958`.
- [ ] Se declaro `Wireframe: docs/ui/wireframes/TASK-1958-efeonce-insights-client-fit-hierarchy.md` y el archivo existe.
- [ ] La task declara que extiende el sistema `ins-*`; no nace un componente paralelo sin razon.
- [ ] El copy visible reusable vive en `insights-copy.ts` (Think) y `src/lib/copy/insights.ts` (PDF).
- [ ] Los estados default/empty/long content/mobile/fallback 1.1 quedan cubiertos; loading/permission heredados.
- [ ] La superficie no agrega movimiento; la revelación existente sigue respetando la preferencia de movimiento reducido del sistema.
- [ ] GVC desktop + mobile capturado y mirado; scorecard con promedio ≥ 4,2.
- [ ] Sin scroll horizontal de pagina en 1440 ni 390, con tabla abierta y cerrada.
- [ ] Ningún texto visible casa con los patrones del gate de TASK-1957.
- [ ] PDF reales de Berel y Sky aprobados por el operador; fidelidad al canvas ≤1 % en regiones no modificadas.

## Verification

- `efeonce-think`: `pnpm test`, `node scripts/verify-insights-report.mjs`, `node scripts/audit-insights-a11y.mjs`
- Greenhouse: `pnpm lint`, `pnpm typecheck`, `pnpm test src/lib/efeonce-insights`, `pnpm insights:canvas-fidelity`, `pnpm composer:visual-gate`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada; dossier y scorecard en `docs/ui/reviews/`.

## Delta 2026-10-02

- `TASK-1957` code complete local (`c56f62d09`): el modelo 1.2 ya trae `source` legible, `unitLabel`/`asOfLabel` en hechos,
  `unitLabel` por figura y `role` (`finding`|`backing`) en claims de capítulo. Observado en la vista previa local: Think
  todavía imprime `spec.unit` («Unidad count»), su propia fecha corta («20-09-2026») y la grilla `ins-facts` incluye los
  hechos del período ANTERIOR como cifras sueltas (aparecen «#6,6» y «#5,8» con la misma etiqueta) y la presencia sin
  denominador («2»). Esos tres puntos son de esta task.

## Follow-ups

- Reutilizar `FindingRows` en el detalle de edición del portal (`TASK-1849`).

## Open Questions

- Título final de la sección de alcance («Qué no incluye este capítulo» propuesto) y de la tabla de respaldo.
- Máximo de hallazgos por capítulo (propuesto cinco) según el umbral de materialidad de TASK-1957.
