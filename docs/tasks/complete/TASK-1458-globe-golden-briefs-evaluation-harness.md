# TASK-1458 — Globe Golden Briefs and Evaluation Harness

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `creative|data|ops`
- Blocked by: `TASK-1481`
- Branch: `task/TASK-1458-globe-golden-briefs-evaluation-harness`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Versionar briefs dorados, fixtures, rúbricas y un harness de evaluación que compare fidelidad, craft, consistencia, velocidad y costo sin declarar un modelo globalmente mejor.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Convertir pruebas creativas en evidencia repetible y comparable por contrato de fidelidad.

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
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1481`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/media-qc/`
- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/packages/contracts/` sólo para fixture/rubric/report schemas.
- `../efeonce-globe/packages/domain/` sólo para evaluate command y report readers.
- `../efeonce-globe/packages/sdk/` sólo para typed evaluation methods.
- `../efeonce-globe/docs/operations/`

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
- Boundary: `Globe Golden Briefs and Evaluation Harness`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `versioned fixture/rubric schemas, evaluate-attempt command y fixture/report readers sobre el TASK-1481 spine`
- Backward compatibility: `gated`
- Full API parity: `evaluation CLI/E2E usa SDK o conformance harness sobre el mismo command/reader; no existe harness con business logic paralela`

### Data model and invariants

- Entidades/tablas/views afectadas: `sólo agregados Globe definidos por la migración/contrato aceptado de esta task`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version explícitos y audit append-only`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `keys durables, preconditions y locks/fences proporcionales al write externo o financiero`
- Audit/outbox/history: `actor, correlation, intento, decisión, estado y error sanitizado; secretos y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno salvo plan explícito y reversible aprobado en ejecución`
- Rollback path: `kill switch, revert de adapter/consumer y reconciliación desde audit`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capability por actor, workspace y acción; WIF/ADC sin llaves persistidas`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, rate limit, concurrency cap, timeout, retry acotado y circuit breaker`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo allow/deny/replay/revoke y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, route, attempt, latency, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [x] El contrato programático existe antes que cualquier UI específica. — `globe.lab.evaluation.*` nace con schema versionado + command/reader transport-neutral + HTTP/SDK + coverage; `ui` `policy-blocked`.
- [x] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo. — capability grant + trusted context; reports workspace-scoped (cross-workspace → `not_found`); `evaluate` idempotente (fake determinístico); correlationId atraviesa el dispatch; rollback = fixtures/rúbricas son dato + store in-memory (sin persistencia productiva).

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Definir fixtures still, motion y audio con derechos conocidos.

### Slice 2

- Implementar rúbricas humanas y checks automáticos reproducibles detrás de un evaluate-attempt command y
  fixture/rubric/report readers versionados.

### Slice 3

- Generar reportes versionados con verdict y limitaciones.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1458 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Benchmarks sesgados o no reproducibles | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | resultado sin fixture/rúbrica/version |
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

- [x] Los fixtures declaran licencia, consentimiento y uso permitido. — `FixtureRightsV1` (`license`/`consent`/`permittedUse`) en cada `GoldenBriefFixtureV1`; test "every fixture declares license, consent and permitted use".
- [x] El reporte separa métricas objetivas de juicio creativo humano. — `objectiveResults` (checks automáticos) vs `humanCriteria` (sin `pass`/`score`); verdict nunca auto-"passed" (`objective_fail` | `objective_pass_pending_human`); test "clears a clean attempt for human review and separates objective from human judgment".
- [x] La misma versión de fixture/config produce evidencia comparable. — fake determinístico + report versionado; test "produces comparable evidence for the same fixture + rubric version (reproducible)".
- [x] Fixture, rubric, evaluation request y report son schemas versionados consumibles por SDK/E2E. — `GoldenBriefFixtureV1`/`EvaluationRubricV1`/`EvaluateAttemptPayloadV1`/`EvaluationReportV1` (todos `schemaVersion:'1'` + `fixtureVersion`/`rubricVersion`) en `packages/contracts`; métodos SDK `evaluateGoldenBrief`/`listGoldenBriefs`/`getEvaluationReport`.
- [x] El runner/harness no duplica scoring/policy fuera del canonical evaluation primitive. — corre por `runModelLabExperiment` (reusa el camino real del Lab, sus guardrails y el provider seam); un solo motor de checks para todos los contratos de fidelidad.
- [x] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica. — código + SPEC-003 + runbook en `efeonce-globe`; lifecycle/README/registry/changelog/Handoff en `greenhouse-eo`.
- [x] No se habilitan producción ni clientes externos sin una task/gate posterior explícito. — `ui`/`mcp` `policy-blocked`; el juicio humano y la corrida contra proveedor real quedan diferidos (limitaciones declaradas en cada report).

## Verification

- `pnpm task:lint --task TASK-1458`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [x] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [x] QA release auditor y documentation governor ejecutados. — gate real de Globe verde (`pnpm check` + `pnpm build`, 11 tests de evaluación + suites del monorepo sin fallos); doc de arquitectura (SPEC-003) + runbook §7-ter + skill mirrors sincronizados.
- [x] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo. — sin rollout productivo: fake canary determinístico (cero gasto, cero infra); el juicio humano (surface `ui`) y el proveedor real quedan `policy-blocked`/diferidos y declarados como limitaciones.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
