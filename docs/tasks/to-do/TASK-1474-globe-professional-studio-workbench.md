# TASK-1474 — Globe Professional Studio Workbench

## Delta 2026-07-20

- El primer primitivo compartido del Producer que este workbench consume quedó **cerrado por TASK-1500**
  (complete): catálogo gobernado de rutas con **modelo público** (nombre+versión, ancla de posicionamiento — la vista que
  esta superficie usa) en `efeonce-globe/packages/domain/src/producer-catalog.ts`, readers
  `globe.producer.catalog.list`/`.get`.

## Delta 2026-07-20

- Se agregaron `TASK-1493`–`TASK-1499` al `Blocked by`: son los motores backend de cada panel del workbench
  (Prompt Studio, Style DNA, formatos, receta/variación, inpaint, exploración de candidatos, "Dirección").
  Sin ellos la surface nace hueca (paneles sin comando/reader que consumir). Fuente: el gap analysis del Studio
  Workbench (`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`). Si se
  shippea por partes, hacerlo panel-por-panel detrás de flag; nunca renderizar un panel cuyo motor aún no existe.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1474-globe-studio-workbench.md`
- Flow: `docs/ui/flows/TASK-1474-globe-studio-workbench-flow.md`
- Motion: `docs/ui/motion/TASK-1474-globe-studio-workbench-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `TASK-1468, TASK-1469, TASK-1472, TASK-1473, TASK-1485, TASK-1493, TASK-1494, TASK-1495, TASK-1496, TASK-1497, TASK-1498, TASK-1499, TASK-1500, TASK-1501, TASK-1502, TASK-1503`
- Branch: `task/TASK-1474-globe-professional-studio-workbench`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el workbench premium de brief, referencias, dirección, estimate, candidates, review y delivery sobre commands/readers existentes.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Dar a operadores una experiencia creative-native de agencia, no un formulario de prompts ni un DAG técnico.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`


## Dependencies & Impact

### Depends on

**Plataforma gobernada (lifecycle, créditos, review, parity, design system):**

- `TASK-1468` (studio credits), `TASK-1469` (run lifecycle + submission fence), `TASK-1472` (review/release/delivery), `TASK-1473` (SDK/MCP parity), `TASK-1485` (Design System de Globe).

**Motores backend de cada panel del workbench** (sin ellos la surface nace hueca — cada panel del diseño se quedaría sin comando/reader que consumir; ver `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`):

- `TASK-1493` — Structured Brief + Recipe Registry → panel **Prompt Studio + Recetas**.
- `TASK-1494` — Reference Intelligence / Style DNA → panel **Style DNA**.
- `TASK-1495` — Target Formats + Multi-format Set → **selector de formatos + Set de key visuales**.
- `TASK-1496` — Generation Recipe + Relaunch + Variation → **variar / relanzar reproducible**.
- `TASK-1497` — Regional Edit / Inpaint → **retocar zona**.
- `TASK-1498` — Candidate Exploration Readers + Lineage Graph → **dock de candidatos + mapa de exploración**.
- `TASK-1499` — Brief Direction / Interpretation → **paso "Dirección"**.

> Estos 7 no tienen por qué estar TODOS antes de un primer slice del workbench, pero cada panel visible que se
> construya exige su motor ya disponible. Si se decide shippear el workbench por partes, hacerlo panel-por-panel
> detrás de flag, nunca renderizar un panel cuyo backend (1493–1499) aún no existe.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/apps/studio-web/`
- Copy, fixtures y evidencia visual específicos de esta surface.

Los contracts de dominio pertenecen a sus capability tasks y el packaging SDK a `TASK-1473`.

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Professional Studio Workbench`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## UI/UX Contract

- Wireframe: `docs/ui/wireframes/TASK-1474-globe-studio-workbench.md`
- Flow: `docs/ui/flows/TASK-1474-globe-studio-workbench-flow.md`
- Motion: `docs/ui/motion/TASK-1474-globe-studio-workbench-motion.md`
- Visual direction: `docs/ui/visual-directions/TASK-1474-globe-studio-workbench-direction.md`
- Surface architecture: `Creative Desk compuesto con patterns propios de Globe definidos/registrados por
  TASK-1485; no adopta layouts, recipes ni primitives de Greenhouse`
- Primitive decision: `reuse | extend | new sobre el registry Globe; esta task puede proponer patterns nuevos
  con anatomy, states, accessibility, responsive contract y evidence antes de promoverlos`
- Full API parity: `UI es thin client de SDK/contracts certificados por TASK-1473; cero business logic, provider/DB/storage imports o endpoint ad hoc`
- Copy/state source: `copy funcional centralizada por dominio; cero mensajes reusable hardcodeados`
- Accessibility: `keyboard completo, focus visible, landmarks, reduced motion y contraste WCAG AA`
- Visual evidence: `GVC desktop y 390px del primer fold antes de cableado exhaustivo; scorecard premium al cierre`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Implementar el Creative Desk sobre la shell y patterns propios de Globe: canvas, context rail, candidate
  dock y review surface; registrar cualquier pattern nuevo mediante `TASK-1485`.

### Slice 2

- Cablear states, approvals, estimate y run history sin lógica provider local. Estimate/approval muestran
  provider, nombre comercial del modelo, versión/readiness, limitaciones y fallback propuesto; history muestra
  la ruta realmente ejecutada por attempt y cualquier diferencia respecto de la aprobada.
- Mostrar mediante readers de `TASK-1468` el balance disponible/reservado/consumido, reserva del run y
  settlement/refund legibles; la UI nunca deriva ni corrige saldos localmente.
- Limitar credits al contexto de la campaña/run. Pools, grants, sub-budgets, limits, ajustes y reconciliación
  pertenecen a `TASK-1482`/`TASK-1483`.

### Slice 3

- Validar impacto visual, responsive, keyboard, reduced motion y GVC.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1474 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| UI bonita pero desacoplada del lifecycle | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | acción UI sin command compartido |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] UI usa los mismos contracts del SDK/MCP.
- [ ] Cada write UI produce el mismo command/result/error/audit que SDK/MCP en el conformance E2E; ningún
      handler UI implementa policy o llama provider/DB/storage.
- [ ] Estados de espera, error, rights, budget y review son honestos y recuperables.
- [ ] Balance, reservation y consumo coinciden con los DTOs redactados del reader canónico; no existe cálculo,
      descuento ni ajuste de credits dentro de componentes.
- [ ] Provider/modelo/version propuestos y ejecutados son visibles sin revelar keys, costo vendor, margen ni
  prompt/IP interno; ningún fallback queda oculto.
- [ ] GVC desktop/mobile alcanza estándar premium sin card wallpaper.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1474`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Delta 2026-07-20 — el diseño evolucionó más allá de esta task; análisis de brecha

El diseño `Globe Studio Workbench` (Claude Design) evolucionó **más allá** de esta task e incluye
capacidades que no estaban en la idea original (Prompt Studio, Style DNA, formatos objetivo, inpaint,
mapa de exploración, dirección, entre otras). Un análisis de 5 agentes mapeó cada capacidad del
diseño contra el runtime real de `efeonce-globe` con evidencia `file:line`:
**`docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`**.

Hallazgos load-bearing para esta task:
- La tesis "thin client sobre commands existentes" **no es alcanzable hoy**: de ~32 acciones del
  workbench, 7 tienen command/reader real y las 7 están `ui: policy-blocked`.
- Los prerrequisitos ya declarados (`TASK-1466/1468/1469/1472/1473/1485`) siguen en `to-do`.
- **Emergieron 7 capacidades backend sin task**, ahora creadas: `TASK-1493` (brief estructurado +
  recetas), `TASK-1494` (Style DNA / análisis de referencias), `TASK-1495` (formatos + set),
  `TASK-1496` (receta reproducible + variar + relanzar), `TASK-1497` (inpaint/edición regional),
  `TASK-1498` (readers de exploración + grafo de linaje), `TASK-1499` (dirección). Esta task queda
  bloqueada también por ellas para las superficies que las consumen.
- **Ajuste barato de alto valor DENTRO de esta task** (backend ya construido, UI no lo expone):
  exponer el **refinar cross-model** de TASK-1490 (elegir otro modelo para el hijo), `editMode` y
  gatear "Refinar" por `outputsRetained`/`providerRunChainable`.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
- Actualizar el wireframe/flow de esta task cuando el diseño de Claude Design se estabilice (hoy va
  por delante de los docs UI declarados).
