# TASK-1474 — Globe Professional Studio Workbench

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
- Blocked by: `TASK-1469, TASK-1472, TASK-1473`
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
- `../efeonce-globe/docs/architecture/PLATFORM_FOUNDATION_V1.md`
- `../efeonce-globe/docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`


## Dependencies & Impact

### Depends on

- `TASK-1469`, `TASK-1472`, `TASK-1473`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/apps/studio-web/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/sdk/`

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
- Surface architecture: `Composition Shell leadPlusContext/rich; adaptive cards por container query; sidecar sólo para contexto/review`
- Primitive decision: `reusar primero primitives Globe/Greenhouse compatibles; cualquier primitive nueva exige registry, a11y y Lab antes de uso repetido`
- Full API parity: `UI es thin client de SDK/contracts certificados por TASK-1473; cero business logic, provider/DB/storage imports o endpoint ad hoc`
- Copy/state source: `copy funcional centralizada por dominio; cero mensajes reusable hardcodeados`
- Accessibility: `keyboard completo, focus visible, landmarks, reduced motion y contraste WCAG AA`
- Visual evidence: `GVC desktop y 390px del primer fold antes de cableado exhaustivo; scorecard premium al cierre`

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Implementar Composition Shell de brief/context/candidates/review.

### Slice 2

- Cablear states, approvals, estimate y run history sin lógica provider local. Estimate/approval muestran
  provider, nombre comercial del modelo, versión/readiness, limitaciones y fallback propuesto; history muestra
  la ruta realmente ejecutada por attempt y cualquier diferencia respecto de la aprobada.

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

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
