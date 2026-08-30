# TASK-1798 — El canvas de candidatos dice los números pero no los muestra

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1798-growth-seo-discovery-canvas-visual-direction.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|ui`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El canvas de candidatos de la lente `Descubrir` comunica **todo dato cuantitativo como texto**: el
volumen es un número plano, la barrera de enlaces una etiqueta plana. Con 50 filas por página, las
dos columnas que deciden exigen leerlas una por una. Esta task le da una **dirección visual propia**
al canvas para que la oportunidad se lea de un vistazo, sin perder densidad ni romper la jerarquía de
gasto.

## Why This Task Exists

`TASK-1693` cerró con `pnpm ui:quality` en **`BLOCK`**: average 4.41 y `visualImpact` **4.2** contra
el 4.5 que exige el gate. Las notas **no se inflaron** para pasar, así que el número sirve de línea
base, y el `nextAction` que quedó registrado nombra la causa sin ambigüedad: el techo de impacto lo
fija el canvas de `TASK-1665`, que `TASK-1693` declara fuera de alcance en sus No-goals UX — su
texto exacto es que no se rediseña el canvas ni el detalle del candidato.

O sea: **el bloqueo no es un defecto de `TASK-1693`, es trabajo que nunca tuvo dueño.** Esta task se
lo da. Sin ella, cualquier task futura que toque esta superficie hereda el mismo `BLOCK` y la
tentación de cerrarlo subiendo la nota — que es exactamente el fraude que el gate existe para
impedir.

El valor de producto es independiente del gate: el canvas es de **comparación** (el operador
contrasta candidatos antes de comprometer gasto recurrente), y comparar 50 números en texto es
precisamente lo que una codificación visual resuelve.

## Goal

- El operador mira el canvas y ubica dónde está la oportunidad **sin leer 50 números uno por uno**.
- La densidad no baja: se siguen sirviendo 50 filas comparables por página.
- `pnpm ui:quality --task TASK-1798` pasa con notas **argumentadas contra frames reales**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary `◑` estimado vs `●`
  medido — el invariante que ninguna codificación visual puede difuminar)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md` y `docs/architecture/ui-platform/PATTERNS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `DESIGN.md`

## Normative Docs

- `docs/ui/wireframes/TASK-1798-growth-seo-discovery-canvas-visual-direction.md` — defecto medido,
  restricciones duras y anti-patrones. **NO trae la dirección resuelta: eso es el Slice 1.**
- `docs/ui/wireframes/TASK-1665-growth-seo-keyword-discovery-workbench.md` — contrato vivo de la
  superficie (regiones R0–R4). Se respeta; lo que cambia es la piel del canvas, no su composición.
- `docs/ui/reviews/TASK-1693-growth-seo-discovery-pagination-seed-sources.scorecard.json` — línea
  base de las 14 dimensiones, con el rationale y el `nextAction` que originan esta task.

## Dependencies & Impact

### Depends on

- `TASK-1665` (complete) — el canvas, la `DataTableShell` de nueve columnas y la card list de 390px.
- `TASK-1693` (complete) — paginación, filtros y selector de fuente. Esta task hereda esa superficie
  y **no la revierte**.
- `TASK-1694` (complete) — cardinalidad por keyword normalizada y `linkBarrier` como filtro canónico.
  La codificación visual de la barrera se apoya en ese vocabulario, no en `keyword_difficulty`.

### Blocks / Impacts

- `TASK-1660` (`Objetivos`) — agrega una tercera lente sobre la misma superficie y reusa el
  conmutador. Si ambas están vivas, coordinar: esta task cambia la piel del canvas de `Descubrir`,
  no el shell compartido.
- `TASK-1691` — declara la lente `◑` + fecha de captura sobre la tabla de **oportunidades**. Si 1691
  aterriza antes, esta task hereda su encoding de frescura; si aterriza después, 1691 hereda la
  codificación visual que esta task acuñe. **En cualquier orden, una sola definición por columna.**
- `TASK-1797` — cambia qué entra al striking-distance; no toca esta superficie, pero comparte el
  vocabulario de volumen.

### Files owned

- `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryResults.tsx`
- `docs/ui/wireframes/TASK-1798-growth-seo-discovery-canvas-visual-direction.md`
- `docs/ui/visual-directions/TASK-1798-*.md` (lo crea el Slice 1)
- `docs/ui/reviews/TASK-1798-growth-seo-discovery-canvas-visual-direction.scorecard.json`
- `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts` (se extiende; no se duplica)

## Current Repo State

### Already exists

- `KeywordDiscoveryResults.tsx` — nueve columnas, tabla densa `md+` y card list `xs` alternadas por
  CSS (no por `useMediaQuery`: cambiar el árbol por ancho reintrodujo mismatch de hidratación en esta
  superficie). Volumen con `◑` + fecha; barrera con `deriveLinkBarrier` en niveles; presencia con `●`
  o «Sin medición propia».
- Corrida real multi-página con la que capturar: `seokdr-761a9689-…` (334 candidatos / 284 keywords
  distintas, `source_kind='gsc_queries'`), dejada por el rollout de `TASK-1693`.
- Escenario GVC `growth-seo-keyword-discovery` con perfil `premium`, dos viewports y marcadores
  `data-capture` para builder, costo, resultados, filtros, paginación y candidato.
- `docs/ui/visual-directions/` como destino canónico de una dirección versionada `[verificar la
  convención de nombre vigente al tomar la task]`.

### Gap

- Ningún dato cuantitativo del canvas tiene codificación visual: volumen y barrera son texto.
- No existe una dirección visual versionada para esta superficie; `TASK-1665` fijó composición y
  contrato, no lenguaje visual del dato.
- `visualImpact` 4.2 e `iconography` 4.3 sin acción tomada (declaradas como `nextAction` en el
  scorecard de `TASK-1693`).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/admin/growth/seo/keywords/discovery/KeywordDiscoveryResults.tsx`
- Future candidate home: `portal`
- Boundary: la vista consume `SeoDiscoveryCandidateView` del reader ya existente; **no cruza a
  `src/lib/growth/seo/**`**, no toca PostgreSQL ni el proveedor. Si una codificación necesitara un
  dato que el reader no expone, se corta una task `backend-data` aparte y ésta se bloquea contra ella.
- Server/browser split: sin cambios — la page server resuelve guard, Space, target, capabilities y la
  primera página; el cliente sólo pinta.
- Build impact: `none` esperado. Si la dirección elegida exigiera una librería nueva, declararlo y
  justificarlo contra la política de charts vigente antes de agregarla.
- Extraction blocker: `none`.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno de Growth con `growth.seo.observation.read`.
- Momento del flujo: nodo `Descubrir` de `EPIC-022`, comparando candidatos **antes** de comprometer
  el gasto recurrente del rank capture.
- Resultado perceptible esperado: ubicar la oportunidad de un vistazo en vez de leer 50 números.
- Fricción que debe reducir: la tabla es honesta y densa, pero exige lectura serial de las dos
  columnas que deciden (volumen y barrera).
- No-goals UX: no se rediseña el builder, la banda de costo, el drawer ni el conmutador de lentes; no
  se cambia el orden gobernado del reader; no se agregan columnas.

### Surface & system decision

- Surface: `/admin/growth/seo/keywords?view=discovery`; mismo `viewCode`, sin surface nueva.
- Nav placement: `none`.
- Composition Shell: `aplica` — se conserva `SurfaceRecipe kind='analyticsReport'` `plane='none'` y
  `AdaptiveSidecarLayout`.
- Primitive decision: **`pendiente` — la decide el Slice 1**. Prioridad: `reuse` de primitives
  existentes; `extend` con justificación; `new-primitive` sólo con el protocolo
  Primitive+Variants+Kinds completo y declarado.
- Adaptive density / The Seam: `aplica` — la codificación existe en tabla densa y card list.
- Floating/Sidecar/Dialog decision: sin cambios.
- Copy source: `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_KEYWORDS.discovery`.
- Access impact: `none`.

### State inventory

- Default: canvas con candidatos y la codificación visual aplicada.
- Loading: sin cambios (la paginación de `TASK-1693` conserva las filas cargadas).
- Empty: sin corrida → `EmptyState` vigente; con filtros sin coincidencia → `emptyFiltered`.
- Error: sin cambios.
- Degraded / partial: 🔴 **`sin_dato` es un estado de primera clase.** Volumen o barrera sin medir se
  **nombran**; jamás se pintan como el extremo bueno de una escala ni se colapsan a cero.
- Permission denied: sin cambios.
- Long content: 50 filas por página sin scroll horizontal de página en 1440 ni en 390px.
- Mobile / compact: la card list conserva la codificación sin truncar ni superponer.
- Keyboard / focus: la codificación **no puede** ser el único portador de información — todo dato
  codificado conserva su valor textual accesible.
- Reduced motion: cualquier animación de entrada se elimina con `prefers-reduced-motion: reduce`
  conservando el estado final.

### Interaction contract

- Primary interaction: sin cambios — abrir el detalle del candidato.
- Hover / focus / active: si la codificación introduce affordance (tooltip sobre una barra, por
  ejemplo), hereda el contrato de foco vigente; no se reinventa.
- Pending / disabled: sin cambios.
- Escape / click-away: sin cambios.
- Focus restore: sin cambios.
- Latency feedback: sin cambios.
- Toast / alert behavior: se reusa la live region existente; **no se monta otra**.

### Motion & microinteracciones

- Motion primitive: `CSS`, si aplica.
- Enter / exit: 🔴 **sin stagger sobre filas paginadas** — es ruido en la superficie donde se compara.
- Layout morph: ninguno.
- Timing / easing token: tokens del tema; cero milisegundos literales.
- Reduced-motion fallback: obligatorio.
- Non-goal motion: nada que anime un valor mientras el operador lo lee.

### Implementation mapping

- Route / surface: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`, rama
  `activeLens === 'discovery'`.
- Component candidates: `KeywordDiscoveryResults.tsx` (tabla densa + card list).
- Data reader: `readKeywordDiscovery` — **sin contrato nuevo**. Los campos ya viajan
  (`searchVolume`, `linkBarrier`, `capturedAt`, `providerLastUpdatedAt`, `gscPosition`).
- API parity: cero contrato nuevo; esta task consume.
- Access / capability: `growth.seo.observation.read`. Ninguna nueva.
- States to implement: default, `sin_dato`, mobile 390px, teclado, reduced motion.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts` (se extiende).
- Route: `/admin/growth/seo/keywords?view=discovery&discoveryRun=seokdr-761a9689-fbb1-4af3-8744-940a5d3e9190`
- Quality profile: premium
- Viewports: desktop 1440 + mobile 390px.
- Required captures: canvas completo · clip de la codificación en filas con dato · clip de una fila
  con `sin_dato` · canvas en 390px.
- Required `data-capture` markers: `seo-keyword-discovery-results` (existe); agregar el que la
  dirección elegida necesite.
- Assertions: la codificación existe en tabla y en card list; una fila `sin_dato` no se pinta como
  extremo de escala; sin scroll horizontal de página.
- Scroll-width evidence: `documentElement.scrollWidth <= clientWidth` en 1440 y 390px.
- Review dossier: `pnpm fe:capture:review growth-seo-keyword-discovery`.
- Baseline decision: se compara contra la baseline de `TASK-1693`. **Se espera delta grande y
  deliberado en el canvas**; cero delta esperado en builder, banda de costo y drawer — un delta ahí
  es regresión, no rebaseline. Se declara en `BASELINE_DELTAS.md`.

### Design decision log

- Decision: **pendiente — la produce el Slice 1** con 2–3 alternativas comparadas y las rechazadas
  registradas con su razón.
- Alternatives considered: pendiente.
- Why this pattern: pendiente.
- Reuse / extend / new primitive: pendiente.
- Open risks: la dirección puede tentar a bajar densidad para «verse mejor». El canvas es de
  comparación: mostrar 8 filas donde hoy hay 50 empeora el trabajo real aunque suba la nota.

### Visual verification

- GVC scenario: `growth-seo-keyword-discovery`
- Viewports: desktop 1440 + mobile 390px.
- Accessibility/focus checks: contraste AA en toda codificación nueva; **ningún dato comunicado sólo
  por color**; el valor textual se conserva.
- Before/after evidence: canvas antes (todo texto) y después.
- Visual scorecard: `docs/ui/reviews/TASK-1798-growth-seo-discovery-canvas-visual-direction.scorecard.json`
- Quality threshold: el del gate del repo — average ≥ 4.5, piso 4.5 en `hierarchy`,
  `surfaceEconomy`, `visualImpact`, `fidelity` y `genericTemplateResistance`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dirección visual versionada

- 2–3 direcciones materialmente distintas para codificar volumen y barrera dentro de la tabla densa
  y de la card list, comparadas por los siete ejes del estándar.
- Una se elige; las rechazadas quedan con su razón.
- Se persiste bajo `docs/ui/visual-directions/` y el wireframe de esta task se reescribe con las diez
  secciones que el readiness gate exige.
- `UI ready` pasa a `yes` sólo cuando `pnpm ui:readiness-check --task TASK-1798` sale limpio.

### Slice 2 — Implementación en tabla densa y card list

- La codificación se aplica en las dos presentaciones, con `sin_dato` como estado de primera clase.
- Cero valores literales: color, spacing, radio y tiempos salen del tema.
- El valor textual se conserva: la codificación **acompaña** al dato, no lo reemplaza.
- Tests: una fila `sin_dato` no se renderiza como extremo de escala; la codificación existe en ambas
  presentaciones.

### Slice 3 — Evidencia visual y cierre

- Escenario GVC extendido, captura desktop 1440 + 390px, dossier y scorecard.
- Delta declarado en `BASELINE_DELTAS.md`: grande en el canvas, **cero** en builder, banda de costo
  y detalle del candidato.
- `## Delta` en `TASK-1693` marcando cerrado su follow-up de `visualImpact`.

## Out of Scope

- Rediseñar el builder, la banda de costo, el drawer, el conmutador de lentes o los filtros.
- Cambiar el orden gobernado del reader, sus llaves de desempate o la cardinalidad de `TASK-1694`.
- Agregar, quitar o renombrar columnas.
- Cualquier contrato nuevo de reader/API. Si la dirección lo necesita, se corta una task
  `backend-data` aparte y ésta se bloquea contra ella.
- La tabla de **oportunidades** (`KeywordOpportunityTable.tsx`) — es de `TASK-1691` y de `TASK-1308`.
- Subir la nota del scorecard sin cambiar la pantalla.

## Detailed Spec

El defecto medido, las restricciones duras y los anti-patrones viven en el wireframe de esta task y
**no se duplican acá**. Los tres invariantes que cualquier dirección respeta, repetidos por ser
load-bearing:

1. **La jerarquía de gasto no se toca.** «Descubrir keywords» sigue siendo el único `contained`.
2. **`◑` estimado y `●` medido no se mezclan.** `◑` es procedencia, no «número aproximado».
3. **«Sin dato» no es «Baja» ni cero.** Se nombra; nunca se pinta como el extremo bueno.

## Rollout Plan & Risk Matrix

Cambio aditivo de portal, sin flag, sin migración, sin contrato nuevo y sin gasto: es piel sobre datos
que el reader ya entrega. El riesgo real no es de infraestructura sino **de oficio**.

### Slice ordering hard rule

- Slice 1 (dirección) → Slice 2 (implementación) → Slice 3 (evidencia).
- 🔴 **Slice 2 NO empieza antes de que `UI ready` sea `yes`.** Escribir JSX sobre una dirección no
  elegida es exactamente cómo nace una pantalla que pasa el lint y se ve genérica.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se baja la densidad para «verse mejor» y el canvas deja de servir para comparar | UI / producto | **high** | Assertion GVC de que se siguen sirviendo 50 filas; el Out of Scope lo prohíbe explícito | Menos filas por página en el frame que en la baseline |
| La codificación difumina `◑` estimado contra `●` medido | UI / integridad del dato | medium | Invariante §1.1 declarado en el wireframe; assertion de que ambas lentes conservan su marca | Una fila estimada y una medida indistinguibles en el frame |
| «Sin dato» se pinta como extremo bueno de la escala | UI / confianza | **high** | Estado de primera clase en el State inventory + test | Una barrera `unknown` renderizada igual que `low` |
| Color como único portador de información | accesibilidad | medium | Contraste AA + valor textual conservado + axe en el capture premium | `color-contrast` o `color-only` en el axe del frame |
| Se agrega una librería de charts para una tabla | build | low | Política de charts vigente; el Modular Placement declara `build impact: none` esperado | Bundle nuevo en el diff |
| Se sube la nota del scorecard sin cambiar la pantalla | gobernanza | medium | El scorecard exige `evidence` por dimensión apuntando a un frame real | Nota que sube sin delta de píxeles |

### Feature flags / cutover

Sin flag — cambio aditivo de presentación sobre datos que el reader ya entrega, detrás de los flags
del módulo que ya existen (`isSeoModuleEnabled` + `isSeoKeywordDiscoveryEnabled`). Cutover inmediato.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | ninguno necesario: sólo produce documentos | — | sí |
| Slice 2 | revert PR + redeploy; la tabla vuelve a texto plano y ningún dato se pierde | < 10 min | sí |
| Slice 3 | ninguno: evidencia y docs | — | sí |

### Production verification sequence

1. `pnpm ui:readiness-check --task TASK-1798` limpio antes de escribir JSX.
2. `pnpm fe:capture growth-seo-keyword-discovery --env=local` sobre la corrida multi-página real.
3. Mirar los frames desktop y 390px. Iterar sobre lo que se ve, no sobre lo que pasa el lint.
4. `pnpm ui:visual-gate` y `pnpm ui:quality` en PASS con notas argumentadas contra frames.
5. Post-merge: verificar en la superficie desplegada que las filas `sin_dato` siguen nombrándose.

### Out-of-band coordination required

`N/A — repo-only change`. Ninguna capability, secreto, integración externa ni comunicación a
operadores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una dirección visual versionada bajo `docs/ui/visual-directions/` con 2–3 alternativas
      comparadas y las rechazadas registradas con su razón.
- [ ] El wireframe de esta task tiene las diez secciones del readiness gate con contenido sustantivo,
      y `pnpm ui:readiness-check --task TASK-1798` sale sin findings.
- [ ] `UI ready` pasó a `yes` **antes** de que se escribiera el primer JSX.
- [ ] La codificación visual existe en la tabla densa y en la card list de 390px, sin duplicar
      controles ni truncar.
- [ ] 🔴 Una fila con volumen o barrera `sin_dato` **no** se renderiza como el extremo bueno de la
      escala ni se colapsa a cero, con test.
- [ ] 🔴 `◑` estimado y `●` medido siguen siendo distinguibles en el frame; ninguna codificación los
      trata con el mismo lenguaje.
- [ ] Ningún dato se comunica **sólo** por color; el valor textual se conserva.
- [ ] Se siguen sirviendo 50 filas por página; la densidad no bajó respecto de la baseline.
- [ ] «Descubrir keywords» sigue siendo el único `contained` de la superficie.
- [ ] Cero valores literales de diseño: color, spacing, radio, tipografía y tiempos salen del tema
      (`pnpm ui:code-lint --changed` en PASS).
- [ ] Sin contrato nuevo de reader/API, sin capability nueva, sin migración.
- [ ] GVC premium desktop 1440 + mobile 390px capturado y **mirado**, con dossier y scorecard.
- [ ] `BASELINE_DELTAS.md` declara el delta del canvas; builder, banda de costo y detalle del
      candidato **sin** delta.
- [ ] `pnpm ui:quality --task TASK-1798` en **PASS**, con cada dimensión apuntando a un frame real.
- [ ] Se dejó `## Delta` en `TASK-1693` cerrando su follow-up de `visualImpact`.

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/views/greenhouse/admin/growth/seo/keywords/discovery`
- `pnpm test` (full suite, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
- `pnpm ui:readiness-check --task TASK-1798` · `pnpm design-contract:lint --task TASK-1798`
- `pnpm fe:capture growth-seo-keyword-discovery --env=local` + `pnpm fe:capture:review`
- `pnpm ui:code-lint --changed` · `pnpm ui:visual-gate --task TASK-1798` · `pnpm ui:quality --task TASK-1798`
- `pnpm task:lint --task TASK-1798` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

## Follow-ups

- Si la codificación acuñada acá sirve también para la tabla de **oportunidades**, coordinar con
  `TASK-1691` para que exista **una sola definición por columna** y no dos vocabularios visuales para
  el mismo dato.
- Si la dirección elegida necesita un dato que el reader no expone, cortar una task `backend-data`
  aparte y bloquear ésta contra ella.

## Open Questions

- ¿La codificación debe alcanzar también la columna `Presencia propia` (`●` medido), o queda acotada
  a volumen y barrera? Acotarla es más seguro para el invariante `◑`/`●`; ampliarla da más lectura de
  un vistazo. **Resolver en el Slice 1 con la dirección elegida, no durante la implementación.**
