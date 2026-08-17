# TASK-1738 — Workbench de revisión del scoring IA (consumer UI del run aggregate)

## Delta 2026-08-16

Slices 1–5 implementados + scenario GVC listo (commits `98fc1f789`, `1b7773a97`, `871217d72`, `856adc201`):

- **Slice 1** — `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` (adapter fino sobre
  `listAssessmentAiScoringRuns`, capability `hiring.assessment.score`, `assessmentId` obligatorio).
  El envelope incluye `confirmEnabled` (estado del flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED`
  en el runtime) para el estado flag-off HONESTO proactivo del wireframe — metadata del envelope
  de la ruta, no un campo nuevo en los DTOs del primitive. Tests allow/deny/400/vacío/error.
- **Slice 2** — namespace `hiringAssessment.scoringRun.*` es-CL + en-US con parity por type;
  mapa de reason codes alineado al inventario REAL de `AI_RISK_ROUTING_REASONS` (11 codes de
  `risk-router.ts`; resuelve la Open Question) con fallback legible al code crudo.
- **Slices 3–5** — `AssessmentAiRunWorkbench` + `AssessmentAiRunEntry` en
  `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx`: cobertura honesta + banner stale,
  cola mandatory → sample → batch, muestra ciega sobre el DTO estructural, propuesta colapsada con
  `unmountOnExit` (la propuesta NO existe en el DOM hasta el gesto real — el test lo atrapó como
  hallazgo: un `Collapse` default la dejaba oculta por CSS), `sawProposalBeforeScoring` veraz,
  resoluciones terminal-once con re-fetch en 409, confirm con causas por gate (`aria-describedby`),
  flag-off honesto, cancel NUNCA flag-gated, terminales read-only. 11 tests focales de contratos.
- **Slice 6 (parcial)** — scenario `task1738-assessment-run-workbench.scenario.ts` (premium,
  desktop 1440 + mobile 390, 5 markers, assertion de ceguera sobre DOM).

**Pendiente al 2026-08-16 (resuelto por el Delta 2026-08-17 — ver más abajo):**

- ~~**Integración con `Application360View.tsx`**~~ → **montada** (commit `a533d10dd`: `canScore`
  resuelto server-side en `page.tsx`; la entrada se movió del panel "Revisar evaluación" a la card
  del assessment en `38b4310d6`).
- ~~**Dirección visual** sin persistir~~ → persistida en
  `docs/ui/visual-directions/TASK-1738-assessment-run-workbench-direction.md`.
- ~~**Evidencia GVC** pendiente~~ → capturada sobre un run REAL y mirada
  (`.captures/2026-08-17T00-42-52_task1738-assessment-run-workbench/`).
- Smoke staging (Rollout Plan) + terminalConfirmed con nombre del confirmador (el DTO del run no
  expone el actor del confirm; el estado terminal confirmado renderiza hoy chip + toast copy sin el
  nombre) siguen abiertos — ver Delta 2026-08-17 §Pendientes declarados.

## Delta 2026-08-17 — Cierre: lo que reveló el frame real

Evidencia visual capturada sobre un **run de scoring IA REAL** (`claude-sonnet-5`, 14 items: 11
`mandatory_review`, 2 `quality_sample`, 1 `batch_eligible`) contra seed sintético local, mirada
frame por frame. Commit `38b4310d6`; capturas en
`.captures/2026-08-17T00-42-52_task1738-assessment-run-workbench/`.

### Hallazgos corregidos

1. **La entrada era invisible cuando más importaba.** Vivía DENTRO del panel "Revisar evaluación":
   una cola de excepciones pendiente no se veía hasta cargar la revisión completa. Movida a la card
   del assessment, como declara la task.
2. **`manifestSummary` mentía 100%** — renderizaba `{a}/{a}` y `{b}/{b}`, así que el resumen decía
   "excepciones 1/1" mientras los gates debajo decían "faltan 10". **Es exactamente el bug class
   que esta task existe para impedir** (herencia ISSUE-159: presentar como completo lo que está
   parcial). Ahora es resuelto/total.
3. **Contraste AA en lo load-bearing.** `warning.main` como texto sobre blanco rinde 1,74:1 y
   pintaba las dos frases más importantes de la superficie (el registro del manifest y las causas
   por gate). Migradas a `theme.greenhouseSemantic.warning.ink`. También `text.disabled` (2,29:1)
   en la procedencia del modelo y `subtitle2` (3,38:1) en el encabezado del confirm.
4. **Reason codes huérfanos:** se dibujaban como chips en el header sin decir qué eran; ahora van
   bajo la etiqueta "Por qué requiere revisión".
5. **Cobertura `sticky`:** se iba con el scroll. Es el techo anti rubber-stamp — tiene que
   acompañar al operador durante todo el recorrido de la cola.
6. **`sx={{ ms: 1 }}` inválido** en los ToggleButton del scorecard: `ms` no existe en el sistema de
   spacing de MUI (solo `marginInlineStart`), así que el margen no se aplicaba **con el build
   verde**. Solo mirar el frame lo atrapa.
7. **Scenario GVC:** IDs reales del seed, bloque `quality` premium, scope de accesibilidad
   extendido al `Dialog` portaleado (auditar solo la card dejaba la superficie real sin auditar) y
   settle tras el `Collapse` (la marca capturaba la propuesta a medio desplegar).

### Contratos verificados sobre el runtime real

- Muestra ciega **sin propuesta en el DOM** (assertion GVC `notVisible` + verificación live).
- `sawProposalBeforeScoring` veraz en AMBAS direcciones contra la DB: expandir y confirmar ⇒
  `true`; devolver a manual sin expandir ⇒ `false`.
- Cobertura honesta (2 de 11 excepciones, 0 de 2 muestra, 1 devuelta) y confirm `disabled` con
  `aria-describedby="assessment-run-confirm-gates"` y las causas visibles.
- Cero scroll horizontal de página en 390 (los dos findings de layout son la tab strip scrolleable
  de la Application 360, no el workbench).

### Pendientes declarados (no bloquean el cierre)

- **Contraste del `Alert severity='info'` del tema (3,94:1):** rojo en axe, **preexistente y con
  blast radius portal-wide** — es causa raíz global, no de esta superficie. No se parcha por host
  (sería un band-aid); chip de seguimiento creado.
- **Bug del risk router (`per_criterion_contradictory`):** al ejercitar este mismo run real se
  descubrió que la señal disparaba en 11 de 14 items por comparar los criterios contra su promedio
  cuando la escala real son aportes que suman el score global. **Cerrado en TASK-1734** (delta
  2026-08-17: escala declarada en el contrato, prompt `...scoring.v2`, policy `...risk_policy.v1_1`;
  contradicción 11/14 → 2/14). El workbench heredó de ese fix la lectura del aporte sobre su peso
  (`18 / 25`) — sin denominador el operador no puede juzgar si el aporte es bueno.
- **Smoke staging** de la secuencia del Rollout Plan y `terminalConfirmed` con el nombre del
  confirmador (el DTO del run no expone el actor del confirm): quedan como verificación de rollout
  y follow-up menor respectivamente.

### Estado de cierre

`code complete`. La UI es aditiva y capability-gated (`hiring.assessment.score`): opera con
cualquier combinación de los flags de TASK-1734 renderizando estados honestos, así que su
disponibilidad no depende de un flip. La verificación en staging/producción sigue el runbook de
TASK-1734, que tiene owner propio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1738-assessment-ai-review-workbench.md`
- Flow: `docs/ui/flows/TASK-1738-assessment-ai-review-workbench-flow.md`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Code complete; workbench montado en la Application 360 con evidencia GVC sobre run real; smoke staging pendiente (runbook de TASK-1734)`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Workbench operator-only de revisión del **run de scoring IA** (TASK-1734) dentro del tab
Evaluación de la Application 360: cobertura HONESTA del run (mandatory/muestra/lote/devueltos/
digestStale), cola de excepciones con evidencia por criterio, **modo ciego real para la
`quality_sample`** (la propuesta no viene en el payload — el reader la omite), registro veraz de
`sawProposalBeforeScoring` (expandir la propuesta queda registrado), y confirmación de run con
resumen del manifest. Convive con el drawer per-response actual (fallback contractual); cero
superficie candidate-facing.

## Why This Task Exists

TASK-1734 cerró el backend (run durable, routing de riesgo, muestra ciega estructural,
confirm/cancel gobernados) y declaró como follow-up explícito el "operator workbench con
anti-anchoring + honest provisional coverage". Hoy la única superficie es el drawer per-response
de TASK-1361/1363, que además contiene el anclaje real vigente: el score IA se precarga en el
input humano (`Application360View.tsx:459`, Delta punto 7 de 1734). Sin workbench, la cola de
excepciones y la muestra ciega solo se operan por API, la cobertura del run no es visible y el
manifest de supervisión honesta no tiene superficie humana.

## Goal

- Workbench del run por assessment operable desde la Application 360: cobertura honesta,
  excepciones con evidencia, muestra ciega, resoluciones terminal-once y confirm/cancel de run.
- Ceguera de la muestra como contrato de UI verificado sobre el DOM (no solo backend) y registro
  veraz de `sawProposalBeforeScoring` mediante gesto real (expandir = registrado).
- Nunca presentar un run parcial como completo (herencia ISSUE-159): pendientes, abstenciones,
  devoluciones y stale siempre visibles; confirm bloqueado con causa mientras un gate esté abierto.
- Ruta colección delgada `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` sobre el
  primitive existente para descubrir runs (única pieza backend).
- Cero strings candidate-facing; copy es-CL/en-US en namespace nuevo
  `hiringAssessment.scoringRun.*`; GVC premium desktop + 390px.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md` (ADR del run: D1 state
  machine, D2 blind sample estructural, manifest, anti-anclaje)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Reglas obligatorias:

- La UI no reimplementa routing/gates/manifest: cliente delgado de
  `src/lib/hiring/assessment/ai/scoring-run/**` (commands/readers de TASK-1734).
- Contrato anti-leak intacto: ningún string/estado de este workbench toca rutas públicas
  `/api/public/assessment/**`, `PublicAssessmentView`, emails ni DTOs candidate/client; los tests
  negativos de TASK-1734 permanecen verdes sin modificación.
- La ceguera de `quality_sample` la garantiza el reader (`review-reader.ts:90-97`); la UI declara
  la ausencia con honestidad y el GVC la verifica sobre el DOM.
- `sawProposalBeforeScoring` es evidencia del manifest: la UI lo deriva de un gesto real
  (expandir la propuesta), nunca de una autodeclaración ni de un default.
- `cancel_run` jamás se gatea por flag (camino de rollback del contrato de 1734).
- El advisory se preserva: el workbench no rankea, no decide, no mueve etapa, no asigna tests,
  no envía email.
- Copy vía `getMicrocopy(locale).hiringAssessment`; errores canónicos (`code` + `actionable`).
- Hook de diseño UI obligatorio (`greenhouse-ai-design-studio`) antes de JSX nuevo.

## Normative Docs

- `docs/tasks/complete/TASK-1734-assessment-ai-scale-operator-exception-review.md` (Follow-ups +
  Delta puntos 7/9 + rollback contract)
- `docs/documentation/hr/scoring-ia-de-assessments.md` (funcional)
- `docs/manual-de-uso/hr/operar-scoring-ia-assessments.md` (runbook de rollout/flags — el flip es
  independiente de esta task)
- `docs/ui/flows/EPIC-011-hiring-ats-UI-FLOW.md` (nodo N8)
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1734 (complete): run aggregate + `listAssessmentAiReviewItems` (DTO con coverage y muestra
  ciega estructural), `resolveScoringRunItem` (con `sawProposalBeforeScoring` obligatorio),
  `confirmAssessmentAiScoringRun` (gates + manifest), `cancelAssessmentAiScoringRun`, ruta
  `/api/hiring/assessments/ai/scoring-runs/[runId]`, capability `hiring.assessment.score`.
- Primitive de listado existente sin ruta: `listAssessmentAiScoringRuns`
  (`src/lib/hiring/assessment/ai/scoring-run/commands.ts:287`).
- Vista anfitriona: `src/views/greenhouse/hiring/Application360View.tsx` (tab assessment + drawer
  per-response que convive).
- Copy infra: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` + `src/lib/copy/types.ts`.

### Blocks / Impacts

- Habilita la revisión a escala prometida por 1734 con superficie humana; el retiro del drawer
  per-response queda como follow-up con evidencia de producción (esta task NO lo rompe).
- No bloquea ni es bloqueada por el rollout de flags de 1734 (runbook independiente): la UI
  muestra estados honestos con flags OFF.
- TASK-1735/1737 (expediente): frontera declarada — el manifest registra HECHOS; la narrativa del
  revisor vive como nota `assessment_review` del expediente (sin archivos compartidos).

### Files owned

- `docs/ui/wireframes/TASK-1738-assessment-ai-review-workbench.md`
- `docs/ui/flows/TASK-1738-assessment-ai-review-workbench-flow.md`
- `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx` (nuevo)
- `src/views/greenhouse/hiring/Application360View.tsx` (delta: entrada en la card del assessment)
- `src/app/api/hiring/assessments/ai/scoring-runs/route.ts` (nuevo: GET colección delgado)
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` + `src/lib/copy/types.ts` (delta:
  namespace `scoringRun.*`)
- `scripts/frontend/scenarios/task1738-assessment-run-workbench.yaml` (nuevo)

## Current Repo State

### Already exists

- Backend completo del run (TASK-1734): state machines run/item, risk classes
  `mandatory_review|quality_sample|batch_eligible`, reason codes, coverage con `digestStale`,
  muestra ciega estructural en el reader, resolve/confirm/cancel con manifest append-only, flags
  `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED` / `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` /
  `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` (default OFF, ledger + runbook).
- Ruta `[runId]` con GET (review) + POST (`resolve_item|confirm_run|cancel_run`) gateada por
  `hiring.assessment.score`.
- Drawer per-response en `Application360View.tsx` (~:1024-1136) con el precargado del score IA
  (`:459`) — el anclaje que este workbench corrige para el carril de run.
- Tipos completos en `src/types/hiring-assessment-ai-run.ts`.
- Copy `hiringAssessment` es-CL + en-US con namespaces `taking`/`review`.

### Gap

- No existe ruta colección para descubrir runs por assessment (solo `[runId]`); ninguna superficie
  consume el review reader; no hay UI de cobertura/excepciones/muestra/confirm; no existe copy
  `scoringRun.*`; no hay dirección visual del design studio para esta superficie.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/hiring/** + src/app/api/hiring/assessments/ai/** (runtime portal Vercel)`
- Future candidate home: `portal`
- Boundary: `consume listAssessmentAiScoringRuns/listAssessmentAiReviewItems/resolveScoringRunItem/confirmAssessmentAiScoringRun/cancelAssessmentAiScoringRun via /api/hiring/assessments/ai/scoring-runs y su detalle por runId; consumers autorizados: Application 360 y los mismos contratos para Nexa/MCP`
- Server/browser split: `runs y permisos resueltos server-side; el client component renderiza DTOs operator-only sin payloads crudos de provider`
- Build impact: `none`
- Extraction blocker: `none`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador interno con `hiring.assessment.score` (autoridad de aplicar scores =
  autoridad de revisar la cola; tier del confirm de 1734).
- Momento del flujo: el run asíncrono quedó `awaiting_review`/`confirmable` tras el submit del
  candidato; el operador revisa desde la card del assessment.
- Resultado perceptible esperado: cerrar excepciones + muestra y confirmar el run con manifest
  veraz en minutos, en lugar de 700 correcciones una a una — sin perder honestidad de cobertura.
- Friccion que debe reducir: la cola de excepciones y la muestra solo se operan por API; la
  cobertura del run es invisible; el carril individual ancla con el score precargado.
- No-goals UX: superficie candidate-facing; iniciar runs; retiro del drawer per-response;
  edición de rúbricas; ranking/decisión.

### Surface & system decision

- Surface: `/agency/hiring/applications/[applicationId]` tab `assessment` — entrada en la card
  del assessment + workbench como diálogo (90vh / fullScreen mobile).
- Nav placement: `none` — sin destino de navegación nuevo (el run se alcanza por su candidatura;
  presupuesto del sidebar intacto).
- Composition Shell: `no aplica` — diálogo de trabajo dentro de una vista existente con frame
  propio; regiones internas declaradas en el wireframe (header/cobertura sticky + cola + confirm).
- Primitive decision: `reuse` — `Dialog`, `Paper variant='outlined'`, `GreenhouseChip`,
  `GreenhouseButton`, `CustomTextField`, `Collapse`/`Accordion`, `Alert`, `Snackbar`, `Skeleton`;
  componente route-local `AssessmentAiRunWorkbench`; cola como lista de cards (no `DataTableShell`:
  items con cuerpo largo, no celdas).
- Adaptive density / The Seam: `no aplica` — cola de trabajo secuencial, no cards adaptables en grid.
- Floating/Sidecar/Dialog decision: workbench = `Dialog maxWidth='lg'` 90vh (fullScreen en
  mobile); cancelación = `Dialog maxWidth='sm'` de confirmación.
- Copy source: `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` → namespace nuevo
  `scoringRun.*` (ledger completo en el wireframe).
- Access impact: `none` — reusa viewCode `gestion.hiring_application_detail` + capability
  `hiring.assessment.score` existente; sin views/routeGroups/capabilities nuevas.

### State inventory

- Default: `awaiting_review` — cobertura + cola ordenada mandatory → sample → batch.
- Loading: skeleton de cobertura + 3 items al abrir; GET colección al montar la card.
- Empty: `no-run` — la card del assessment queda exactamente como hoy (nada se dibuja).
- Error: Alert canónico con Reintentar solo si `actionable=true`; `lineageError` (409) deja el
  workbench read-only.
- Degraded / partial: `gates-open` (confirm disabled con causa por gate) · `flag-off` (confirm
  apagado, resolver items sigue) · `stale` (banner + confirm bloqueado, cancel disponible) ·
  `scoringPending > 0` (contador + refresco manual).
- Permission denied: sin capability ni la entrada se dibuja; 403 en vuelo → Alert
  `actionable=false`.
- Long content: respuesta del candidato con clamp + Ver más; batch agrupado colapsado.
- Mobile / compact: fullScreen, chips en 2 columnas, acciones apiladas; sin scroll horizontal.
- Keyboard / focus: trap del diálogo, foco al siguiente item pendiente tras resolver; detalles en
  el flow.
- Reduced motion: `Collapse` sin transición bajo `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: resolver items (`confirmed|overridden|rejected_to_manual`) y confirmar el
  run con manifest.
- Hover / focus / active: foco visible en triggers de colapso y CTAs; expandir propuesta con
  `aria-expanded`.
- Pending / disabled: acciones del item en busy durante resolve; "Confirmar propuesta" no existe
  sin expandir; confirm de run disabled con `aria-describedby` a la causa.
- Escape / click-away: cierra el workbench salvo request en vuelo; el trabajo resuelto ya
  persistió (cerrar nunca pierde nada).
- Focus restore: al cerrar, foco a "Abrir revisión del run"; tras resolver, foco al siguiente
  item pendiente.
- Latency feedback: `aria-busy` en confirm/cancel; botón refrescar visible durante `scoring`.
- Toast / alert behavior: Snackbar para resoluciones/confirm/cancel; Alerts inline para stale/
  flag-off/gates.

### Motion & microinteractions

- Motion primitive: `CSS` (Collapse/Dialog por defecto de MUI).
- Enter / exit: default del Dialog.
- Layout morph: ninguno.
- Stagger: ninguno.
- Timing / easing token: defaults del tema.
- Reduced-motion fallback: transiciones desactivadas.
- Non-goal motion: celebración al confirmar; animación de "revelado" de la propuesta.

### Implementation mapping

- Route / surface: tab `assessment` de la Application 360; componente `AssessmentAiRunWorkbench`
  route-local + fila de entrada en la card del assessment.
- Primitive / variant / kind: reuse total (ver Surface & system decision).
- Component candidates: `AssessmentAiRunWorkbench` + subcomponentes de item por risk class.
- Copy source: `getMicrocopy(locale).hiringAssessment.scoringRun`.
- Data reader / command: `GET /scoring-runs?assessmentId=` (ruta colección nueva sobre
  `listAssessmentAiScoringRuns`) · `GET /scoring-runs/[runId]` · `POST` acciones
  `resolve_item|confirm_run|cancel_run` (existentes).
- API parity: la ruta colección es un adapter fino del primitive existente, disponible para
  Nexa/MCP por construcción; cero lógica en la UI.
- Access / capability: `hiring.assessment.score` (`execute`) server-resolved → prop.
- States to implement: los del State inventory + terminales `confirmed/cancelled/failed` +
  `blind-sample`/`proposal-collapsed`/`resolving`/`confirmable`.

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/task1738-assessment-run-workbench.yaml`
- Route: `/agency/hiring/applications/[applicationId]?tab=assessment` con seed determinista (run
  `awaiting_review`: 2 mandatory (1 resuelta) + 1 sample ciega + 4 batch + 1 abstained; variantes
  stale y flag OFF).
- Viewports: 1440×900 + 390×844.
- Quality profile: `premium`
- Required steps: entrada → workbench → cobertura → item ciego → expandir propuesta mandatory →
  resolver override → confirm disabled con causa → stale → Esc → foco → mobile fullScreen.
- Required captures: `run-entry`, `run-coverage`, `blind-sample-item`, `proposal-revealed`,
  `confirm-gates-open`, `stale-banner`, `mobile-workbench`.
- Required `data-capture` markers: `assessment-run-entry`, `assessment-run-workbench`,
  `assessment-run-coverage`, `assessment-run-blind-item`, `assessment-run-confirm`.
- Assertions: DOM del item ciego sin score/rationale de propuesta; confirm `disabled` +
  `aria-describedby` con gates abiertos; cero strings `scoringRun` en `/assessment/[token]`;
  sin errores de consola.
- Scroll-width checks: workbench base, propuesta expandida y confirm en 1440 y 390.
- Reduced-motion / focus evidence: captura `prefers-reduced-motion: reduce` + ciclo
  abrir→Esc→foco.
- Review dossier: `pnpm fe:capture:review task1738-assessment-run-workbench`.
- Baseline decision / surface ID: baseline nuevo para el workbench; la card del assessment suma
  la fila de entrada a su baseline.

### Design decision log

- Decision: workbench como diálogo del tab Evaluación con cobertura sticky, cola ordenada por
  riesgo, propuesta colapsada-con-registro y confirm con manifest.
- Alternatives considered: ruta dedicada (presupuesto nav); reemplazo inmediato del drawer;
  propuesta abierta por defecto; tabla `DataTableShell` — descartadas con razones en
  wireframe/flow (DDL-1..DDL-7).
- Why this pattern: eleva el vocabulario "propuesta IA que tú confirmas" del per-response al run,
  con la cobertura honesta como techo permanente; corrige el anclaje del precargado actual.
- Reuse / extend / new primitive: reuse total; componente route-local.
- Open risks: inventario real de reason codes (mapa de copy con fallback legible); refresh manual
  V1 durante `scoring`; convivencia visual entrada-card sin sobrecargar la card del assessment.

### Visual verification

- GVC scenario: `task1738-assessment-run-workbench`
- Viewports: 1440×900 + 390×844
- Required captures: las 7 del GVC scenario plan
- Required `data-capture` markers: los 5 declarados
- Scroll-width check: `scrollWidth == clientWidth` en ambos viewports (scroll interno vertical
  del diálogo permitido)
- Accessibility/focus checks: trap + restore; `aria-expanded` del revelado; `aria-describedby`
  del confirm disabled; anuncios `aria-live`
- Before/after evidence: drawer per-response actual (con precargado) vs workbench del run
- Known visual debt: `Alert severity='info'` del tema a 3,94:1 (preexistente, blast radius portal-wide;
  causa raíz global, no se parcha por host)
- Visual direction: `docs/ui/visual-directions/TASK-1738-assessment-run-workbench-direction.md`
- Visual scorecard: `docs/ui/reviews/TASK-1738-assessment-ai-review-workbench.scorecard.json` (average 4,46; verdict `pass`)
- Quality threshold: `average >= 4.2; floor >= 3; fidelity/template resistance >= 4`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `api`
- Source of truth afectado: ninguno nuevo — lectura de
  `greenhouse_hiring.hiring_assessment_ai_scoring_run` vía primitive existente
- Consumidores afectados: `UI Application 360; la misma ruta colección queda disponible para
  Nexa/MCP/scripts`
- Runtime target: `local → staging → production (portal Vercel)`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/assessment/ai/scoring-run/**` +
  `/api/hiring/assessments/ai/scoring-runs/[runId]/route.ts` (auth/capability/error pattern) +
  contrato anti-leak de rutas públicas
- Contrato nuevo o modificado: `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=` —
  adapter fino sobre `listAssessmentAiScoringRuns` (`commands.ts:287`), misma capability
  `hiring.assessment.score`, mismo error contract; sin campos nuevos en DTOs
- Backward compatibility: `compatible` (ruta aditiva; nada existente cambia)
- Full API parity: `la ruta expone un primitive canónico ya existente; ningún consumer
  reimplementa el listado`

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migración; lectura del run aggregate existente
- Invariantes que no se pueden romper:
  - La ruta colección exige `assessmentId` exacto (sin listados globales sin scope).
  - DTOs operator-only sin payloads crudos de provider ni identidad del candidato (hereda el
    contrato del reader).
  - Rutas públicas/candidate-facing intactas (tests negativos de 1734 sin modificación).
- Tenant/space boundary: `requireInternalTenantContext` + `can(…,'hiring.assessment.score',
  'execute','tenant')` (mismo gate que `[runId]`)
- Idempotency/concurrency: solo lectura; los POST reusan commands terminal-once existentes
- Audit/outbox/history: sin eventos nuevos; el manifest/audit del run no cambia

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `ruta activa desde el deploy (read-only capability-gated); sin flag propio`
- Backfill plan: `none`
- Rollback path: `revert PR (ruta aditiva)`
- External coordination: `none — repo-only; el flip de los flags de 1734 sigue su runbook aparte`

### Security and access

- Auth/access gate: capability existente `hiring.assessment.score` (`execute`)
- Sensitive data posture: DTOs operator-only del reader existente; sin PII nueva; sin datos hacia
  superficies públicas
- Error contract: `canonicalErrorResponse`/`toHiringErrorResponse` existentes
- Abuse/rate-limit posture: sin cambios (superficie interna capability-gated, lectura acotada por
  assessment exacto)

### Runtime evidence

- Local checks: vitest focal de la ruta colección (allow/deny/assessment inexistente/lista vacía)
  + suites existentes de scoring-run verdes sin modificación
- DB/runtime checks: `pnpm staging:request GET "/api/hiring/assessments/ai/scoring-runs?assessmentId=<id>"`
  con persona autorizada (200) y persona collaborator (403)
- Integration checks: GVC assertions del wireframe (DOM ciego + anti-leak del token público)
- Reliability signals/logs: sin signal nuevo (los signals del run son de 1734)
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Hybrid Execution Justification

- Why not split: el único backend es una ruta GET delgada sobre un primitive existente (sin
  migración, sin capability nueva, sin command nuevo); separarla en task propia agregaría
  ceremonia sin reducir riesgo — es el caso aceptado "cambio vertical pequeño sobre un contrato
  existente" de `TASK_PROCESS.md` §Hybrid.
- Primary execution profile: `ui-ux`
- Contract boundary: la UI consume solo rutas API; la ruta colección delega en
  `listAssessmentAiScoringRuns` sin lógica propia.
- Risk controls: Slice 1 (ruta + tests allow/deny) antes de cualquier JSX; revert = revert PR;
  lectura pura.

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

### Slice 1 — Ruta colección de runs (backend fino)

- `GET /api/hiring/assessments/ai/scoring-runs?assessmentId=`: `requireInternalTenantContext` +
  `can('hiring.assessment.score','execute')` → `listAssessmentAiScoringRuns(assessmentId)`;
  errores canónicos; tests allow/deny/vacío.

### Slice 2 — Copy + dirección visual

- Namespace `scoringRun.*` en `hiringAssessment` es-CL + en-US + tipo, con el mapa de reason
  codes y fallback legible (`greenhouse-ux-writing`).
- Sesión `greenhouse-ai-design-studio`: direcciones comparadas, asset persistido en
  `docs/ui/visual-directions/`, Visual Direction Contract completo y `UI ready: yes` con lint
  limpio.

### Slice 3 — Entrada + workbench read-only

- Fila de entrada en la card del assessment (chip estado + excepciones + abrir), dibujada solo
  con runs existentes y capability.
- `AssessmentAiRunWorkbench`: header con provenance, cobertura honesta sticky (contadores +
  banner stale), cola ordenada mandatory → sample → batch con evidencia por criterio, estados
  terminales read-only, refresco manual durante `scoring`.

### Slice 4 — Resoluciones + modo ciego + registro veraz

- Item mandatory: propuesta colapsada, "Ver propuesta IA (queda registrado)" marca
  `sawProposalBeforeScoring=true`; "Confirmar propuesta" solo con propuesta expandida; override
  con `finalScore`; devolver a manual.
- Item muestra ciega: puntuar sin propuesta (`sawProposalBeforeScoring=false` estructural);
  contraste Δ post-resolución.
- Manejo terminal-once (409 en carrera → re-fetch); foco al siguiente pendiente.

### Slice 5 — Confirmación/cancelación de run

- REGION 3: manifest resumido, gates con causa visible junto al CTA disabled, estado flag-off
  honesto, confirm con `aria-busy` y re-fetch en 409; cancelación con dialog (NUNCA flag-gated)
  y promesa explícita de cola manual.

### Slice 6 — GVC premium + cierre

- Scenario + capturas desktop/390 con assertions (DOM ciego, confirm disabled, anti-leak del
  token público); scorecard ≥ threshold; smoke staging con personas agente; docs (funcional +
  manual delta "revisar desde la ficha") + registry/README/EPIC-011/Handoff/changelog + chequeo
  de impacto cruzado.

## Out of Scope

- Cualquier superficie/copy/estado candidate-facing (contrato anti-leak de 1734 intacto).
- Iniciar runs desde la UI (`start` lo dispara el consumer del evento; el adapter App API de
  start/reconcile es follow-up declarado en 1734).
- Retiro del drawer per-response (convive; retiro con evidencia de producción es follow-up).
- Flip de los flags de 1734 (`ENQUEUE`/`EXCEPTION_POLICY`/`RUN_CONFIRM`) — runbook independiente;
  esta task solo renderiza sus estados.
- Edición de preguntas/plantillas/rúbricas; ranking/decisión/etapas/emails.
- Polling/streaming en tiempo real (refresh manual V1).
- Migraciones, capabilities nuevas o signals nuevos.

## Detailed Spec

El detalle vive en el wireframe y el flow (Files owned) — layout, copy ledger, máquina de
estados run/item, fronteras de datos, failure paths y decisiones. Contratos backend: ADR
`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md` + código real
(`review-reader.ts`, `confirm-run.ts`, `commands.ts`, ruta `[runId]`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ruta colección) → Slice 3 (la entrada la consume). Slice 2 en paralelo con Slice 1;
  Slice 3 requiere ambos.
- Slice 4 requiere Slice 3; Slice 5 requiere Slice 4 (confirmar sin poder resolver items sería
  un workbench de rubber-stamp).
- Slice 6 cierra. Prohibido shippear Slice 5 sin las assertions anti-leak del Slice 6 en el
  mismo estado de develop.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La UI filtra la propuesta de la muestra ciega (rompe la medición de calidad) | hiring / governance | low | la ceguera es del reader (payload sin proposal) + assertion GVC sobre DOM | assertion roja en GVC |
| `sawProposalBeforeScoring` registrado falso (manifest mentiroso) | governance | medium | derivado de gesto real (expandir); "Confirmar propuesta" exige expandir; test focal del estado local | test rojo |
| Un run parcial se presenta como completo (rubber-stamp) | hiring / derechos | medium | cobertura sticky + confirm disabled con causa + gates server-side re-verificados en el command | 409 del confirm observable |
| String del workbench llega a superficie candidate-facing | public / privacy | low | cero cambios en rutas públicas + assertion GVC de `/assessment/[token]` + tests negativos 1734 intactos | contract test rojo |
| Ruta colección expone listado sin scope | identity | low | `assessmentId` obligatorio + capability + test deny | test rojo |
| Carrera de resoluciones entre dos operadores | hiring | low | terminal-once del backend; UI re-fetch en 409 | 409 observable |
| Entrada sobrecarga la card del assessment | UI | low | una fila chip+botón; revisión en el loop de diseño (Slice 2) | scorecard visual |

### Feature flags / cutover

- Sin flag propio — additive UI. Los flags del run (`HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED`,
  `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED`, `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED`)
  son de TASK-1734 y su runbook: esta task NO los prende — la UI renderiza estados honestos con
  cualquier combinación (sin runs no dibuja nada; confirm OFF muestra `confirmFlagOff`; cancel
  siempre operable).
- El "flag" efectivo de acceso es la capability `hiring.assessment.score`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (ruta aditiva) | <10 min | si |
| Slice 2 | revert copy/docs | <5 min | si |
| Slice 3 | revert PR (la card vuelve a su estado actual) | <10 min | si |
| Slice 4 | revert PR (resoluciones vuelven a operar por API) | <10 min | si |
| Slice 5 | revert PR (confirm/cancel vuelven a operar por API) | <10 min | si |
| Slice 6 | revert docs/escenario | <5 min | si |

### Production verification sequence

1. Deploy a staging; `pnpm staging:request GET "/scoring-runs?assessmentId=<id>"` → 200 con
   persona superadmin, 403 con persona collaborator.
2. Seed sintético en staging (run `awaiting_review` con los 3 risk classes) → workbench: resolver
   una mandatory con propuesta expandida (manifest registra `sawProposalBeforeScoring=true`),
   puntuar la muestra ciega (DOM sin proposal verificado por GVC), verificar confirm disabled con
   causa mientras falten gates.
3. Con `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` ON en staging: confirmar el run sintético →
   estado terminal read-only con manifest; con OFF: estado `confirmFlagOff` + cancel operable.
4. Probes anti-leak: `/assessment/[token]` y payloads públicos sin strings/estados del workbench.
5. Promoción vía release control plane; en producción la UI queda operativa con los flags del run
   en el estado que dicte el runbook de 1734 (sin dependencia).
6. Monitorear Sentry (domain hiring) 48h post-deploy.

### Out-of-band coordination required

N/A — repo-only change. El rollout de flags/canary del run sigue el runbook de TASK-1734
(`docs/manual-de-uso/hr/operar-scoring-ia-assessments.md`) con su propio owner; esta task no lo
modifica ni lo acelera.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] **Ceguera de muestra como contrato de UI (binario):** en un item `quality_sample` sin
  resolver, el DOM del workbench NO contiene score/rationale/perCriterion de la propuesta
  (assertion GVC sobre HTML + test del componente con el DTO real del reader); tras resolver, el
  contraste Δ aparece.
- [x] **Registro veraz de `sawProposalBeforeScoring` (binario):** resolver una mandatory sin
  expandir la propuesta envía `false`; expandirla y resolver envía `true`; "Confirmar propuesta"
  no existe sin expandir. Verificado por test focal + smoke staging (manifest lo refleja).
- [x] **Honest provisional coverage (binario):** con `scoringPending > 0`, excepciones/muestra
  pendientes o `digestStale=true`, el CTA "Confirmar run" está `disabled` con la causa visible
  (`aria-describedby`); ningún estado de la UI presenta el run como completo.
- [x] **Cero superficie candidate-facing (binario):** `/api/public/assessment/**`,
  `PublicAssessmentView` y emails quedan sin modificación; los tests negativos de TASK-1734 pasan
  sin cambios; la assertion GVC del token público no encuentra strings del namespace `scoringRun`.
- [x] `GET /scoring-runs?assessmentId=` responde 200 con runs para persona autorizada, 403
  canónico sin capability y lista vacía sin dibujar entrada en la card.
- [x] Resoluciones terminal-once manejadas: 409 de carrera produce re-fetch y estado consistente,
  nunca doble aplicación.
- [x] `confirm_run` con flag OFF muestra `confirmFlagOff` y deja operables las resoluciones y el
  carril individual; `cancel_run` opera SIEMPRE (sin flag) con la promesa de cola manual visible.
- [x] Estados terminales `confirmed/cancelled/failed` renderizan read-only con manifest/razón; el
  drawer per-response existente sigue funcionando sin regresión (convivencia declarada).
- [x] Todo el copy visible sale de `hiringAssessment.scoringRun.*` (es-CL + en-US); reason codes
  con label legible y fallback; lint `no-untokenized-copy` sin findings nuevos.
- [x] `UI ready` subió a `yes` con dirección visual persistida y
  `pnpm task:lint --task TASK-1738` pasa sin findings.
- [x] GVC premium desktop 1440 + mobile 390 (fullScreen) capturado y revisado; sin scroll
  horizontal de página; scorecard ≥ threshold declarado.
- [x] Estados loading/empty/error/degraded/permission/mobile cubiertos según State inventory; el
  ajuste del sistema para reducir movimiento se respeta en el diálogo y los colapsos (evidencia GVC).

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/lib/hiring/assessment src/views/greenhouse/hiring src/app/api/hiring` (focal)
- `pnpm task:lint --task TASK-1738`
- `pnpm fe:capture task1738-assessment-run-workbench --env=staging` + review dossier
- `pnpm staging:request` (secuencia del Rollout Plan)
- `pnpm test` + `pnpm build` como gate final de cierre (TASK_CLOSING_QUALITY_GATE_V1; pedir
  autorización del operador antes del build completo)

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] Follow-up del retiro del drawer per-response registrado (en esta task o en TASK-1734)
- [x] EPIC-011 actualizado con el estado de esta task
- [x] Docs funcional/manual del scoring IA actualizados con la operación desde la ficha

## Follow-ups

- Retiro del drawer per-response cuando el run cubra el flujo en producción (con evidencia).
- Adapter App API para `start`/`reconcile` manual (ya declarado en TASK-1734 Follow-ups; su
  entrada UI se agrega cuando exista).
- Deep-link `?run=` si la operación diaria lo pide.
- Polling/refresh automático durante `scoring` si el volumen real lo justifica.

## Open Questions

- Inventario final de reason codes del risk router para el mapa de copy: confirmar en Discovery
  contra `src/lib/hiring/assessment/ai/scoring-run/risk-router.ts`; el fallback legible cubre
  codes nuevos sin release de copy.
