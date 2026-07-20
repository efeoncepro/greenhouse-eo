# TASK-1457 — Globe Safe Model Lab Foundation

## Delta 2026-07-19 — FOUNDATION COMPLETE (fake canary); live provider canary rollout pendiente

Implementado en `../efeonce-globe` (6 commits en `main`); `pnpm check` + `pnpm build` verdes (domain 29 tests,
studio-web 26, creative-runner/provider-contract verdes). Alcance ejecutado y confirmado por el operador:
**contrato + guardrails + fake canary determinístico** (cero red, cero gasto, cero infra). Cero cambio de runtime
en greenhouse-eo (sólo lifecycle documental).

- **Slice 1 — experiment contract + spine extension.** Capability `globe.lab.experiment.run`; prepare/execute/cancel
  commands + get/status/evidence readers sobre el `CapabilityRegistry` (ui/mcp `policy-blocked`,
  http/sdk/cli/worker/e2e `available`); state machine (`prepared→estimated→reserved→running→candidate_ready|failed|cancelled`);
  `ExperimentAttemptManifestV1` (ruta propuesta vs real, costo, hashes de input/output, lineage); actor/workspace
  del trusted context; SDK tipado. `CREATIVE_CAPABILITIES` movido a contracts (SSOT wire).
- **Slice 2 — guardrails.** `LabSpendFence` cap duro por run + por workspace/día-UTC (aborta ANTES de gastar,
  idempotente, settle/release) — fence de seguridad, NO el ledger comercial (TASK-1468); private-ingest policy
  (inputs sólo como hash + rights, nunca bytes crudos); kill switch fail-closed → `policy_blocked`.
- **Slice 3 — fake canary seam.** `FakeReferenceAdapter` (hash media-qc determinístico) + `LabRunner`: el
  experimento fluye API/SDK → command → adapter → runner → manifest. `GLOBE_LAB_ENABLED` default OFF.

**Rollout pendiente (declarado, NO listo):** el **canary con proveedor real** (credenciales WIF/ADC, bucket
privado, budget alerts, gasto real) queda `code complete, rollout pendiente`, gateado por **TASK-1464** + aprobación
explícita. No se tocó `infra/terraform/**`. El `LabRunnerPort` es el seam: se reemplaza el fake por un adapter real
(Vertex/OpenAI/Fal por la política de soberanía) sin cambiar el dominio. Mapping real ID-token→principal por
identidad y store durable de experimentos también quedan para TASK-1457-live/TASK-1465.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseño gobernado; implementación pendiente`
- Rank: `TBD`
- Domain: `creative|platform|ops`
- Blocked by: `TASK-1481`
- Branch: `task/TASK-1457-globe-safe-model-lab-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear el sandbox no productivo para probar modelos reales con WIF/ADC sin llaves, secretos gobernados, límites duros de gasto, almacenamiento privado y manifests reproducibles.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Permitir experimentos reales y baratos sin habilitar producción ni clientes externos.

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
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1481` completa. `TASK-1464` avanza en paralelo y sólo bloquea el canary live si faltan sus outputs
  mínimos de secret/storage/budget.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/apps/studio-web/` sólo para el Model Lab private API adapter.
- `../efeonce-globe/packages/contracts/` sólo para experiment schemas/capabilities.
- `../efeonce-globe/packages/domain/` sólo para experiment commands/readers/policy.
- `../efeonce-globe/packages/sdk/` sólo para typed Model Lab methods.
- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/packages/media-qc/`

### Cross-task ownership boundary

- `TASK-1464` es dueño exclusivo de `../efeonce-globe/infra/terraform/`, GitHub WIF, IAM compartido,
  presupuestos GCP y observabilidad de plataforma.
- Esta task consume outputs versionados de `TASK-1464`; no crea IaC, identities, buckets o alertas paralelos.
- El runtime y los tests locales pueden avanzar en paralelo, pero el canary con credenciales, storage y budget
  alerts reales queda `code complete, rollout pendiente` hasta que cierre el checkpoint de infraestructura
  mínimo de `TASK-1464`.

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
- Boundary: `Globe Safe Model Lab Foundation`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `TASK-1481 API Contract Spine, EPIC-028 y provider contracts versionados`
- Contrato nuevo o modificado: `prepare/execute/cancel experiment commands; get/status/evidence readers; attempt manifest y capability coverage V1`
- Backward compatibility: `gated`
- Full API parity: `private API, SDK y conformance harness consumen el mismo experiment command/reader; UI/MCP permanecen policy-blocked hasta promotion, no missing`

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

- [x] El contrato programático existe antes que cualquier UI específica.
- [x] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Extender el spine de `TASK-1481` con schemas/capabilities de experimento, prepare/execute/cancel commands,
  get/status/evidence readers y typed SDK. Actor/workspace provienen sólo de trusted context.

### Slice 2

- Implementar el budget fence de aplicación por run/día, cuotas, cancelación, kill switch y private-ingest
  policy sin aprovisionar infraestructura duplicada.

### Slice 3

- Integrar **una ruta exacta de referencia** y ejecutar el primer provider canary por
  SDK/private API → experiment command → provider adapter → runner. Emitir manifest por attempt con costo,
  ruta, inputs autorizados y lineage; el proveedor nunca se invoca desde script/CLI/UI/MCP.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1457 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gasto o exposición de assets fuera de control | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | run sin reservation/cap o asset público |
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

- [x] Ningún experimento requiere service-account key persistida. *(el fake no usa credenciales; el path real es WIF/ADC sin llaves — TASK-1464).*
- [x] Cada run tiene hard cap previo y aborta antes de excederlo. *(`LabSpendFence` + chequeo estimate>hardCap ANTES de reserve/run).*
- [x] Inputs y outputs son privados y cada attempt deja manifest verificable. *(private-ingest policy: sólo hash+rights; `ExperimentAttemptManifestV1` por intento).*
- [x] `TASK-1457` no modifica `infra/terraform/**`; el canary live referencia outputs/evidencia de `TASK-1464`. *(cero cambios en infra/terraform).*
- [x] El primer provider canary entra por el spine de `TASK-1481` y produce el mismo command/audit/correlation observable desde private API y SDK. *(fake canary: API/SDK → command → adapter → runner → manifest, probado por HTTP y SDK; canary con proveedor REAL = rollout pendiente, TASK-1464).*
- [x] UI/MCP figuran `policy-blocked` en coverage; CLI/tests usan SDK o conformance harness y ningún consumer llama al provider directamente. *(`LAB_COVERAGE` ui/mcp policy-blocked; provider sólo vía `LabRunner`).*
- [x] Body/query/headers no pueden aportar ni reemplazar actor, workspace o capabilities. *(heredado del trusted context del spine).*
- [x] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [x] No se habilitan producción ni clientes externos sin una task/gate posterior explícito. *(internal-only; `GLOBE_LAB_ENABLED` default OFF; canary live gateado).*

## Verification

- `pnpm task:lint --task TASK-1457`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [x] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [x] QA release auditor y documentation governor ejecutados.
- [x] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo. *(canary con proveedor real = `code complete, rollout pendiente`, gateado por TASK-1464 + aprobación).*

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
