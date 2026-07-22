# TASK-1470 — Globe Production Provider Router

## Checkpoint 2026-07-22 — compilador exacto code-complete, composición/rollout pendientes

El hook canónico se reabrió después de verificar que TASK-1463/1467/1468/1469 están code-complete. En Globe se
añadió `ExactProductionRouteCompiler`, consumido por el scheduler durable de TASK-1469. El compilador liga una
ruta ya estimada a la revisión `promoted` exacta, binding provider/model/version/endpoint, derechos durables,
región permitida, budget approval/reservation y estado de circuit breaker. Persiste una decisión sanitizada y
un snapshot con ruta propuesta/real. No selecciona fallback: un circuito abierto obliga a proponer, estimar y
aprobar otra ruta para que el cambio nunca altere silenciosamente la unidad de crédito.

Estado honesto: **código del compilador completo y verificado; composición productiva y rollout pendientes**.
Faltan la implementación productiva de los ports de binding/circuit decisions, result drivers y el canary
internal-only antes de activar `GLOBE_GOVERNED_RUNS_ENABLED`.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `En ejecución dentro del goal aprobado de TASK-1505; foundations code-complete, rollout downstream permanece pendiente`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `none`
- Branch: `task/TASK-1470-globe-production-provider-router`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Promover adapters validados y resolver rutas por fidelity contract, rights, readiness, budget y policy, con fallbacks explícitos.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Elegir el motor adecuado por caso sin acoplar UI o agentes a un provider.

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

- `TASK-1463`, `TASK-1467`, `TASK-1468`, `TASK-1469`.
- Resolución 2026-07-22: las cuatro foundations están code-complete y verificadas localmente. Esta task puede
  integrar sus ports durables; la promoción live sigue condicionada a migraciones, secretos, adapters externos y
  canary de cada owner, sin fallback degradado.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/packages/domain/`

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
- Boundary: `Globe Production Provider Router`
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

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `internal route-proposal/estimate domain service consumed only by run commands and typed projections`
- Backward compatibility: `gated`
- Full API parity: `router is internal business logic; surfaces receive route proposal through run contracts, never a generic provider tool`

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

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->

## Audit 2026-07-22

### Supuestos correctos

- El scheduler durable de TASK-1469 ya expone `GovernedRouteCompilerPort` y conserva el snapshot por attempt.
- Readiness exacta, provenance/rights y ledger/budget ya poseen ports durables reutilizables.

### Supuestos desactualizados

- La task seguía declarando bloqueadores aunque sus cuatro foundations ya estaban code-complete; el gate se
  corrigió sin declarar rollout live.
- El composite adapter anterior elegía por capability/policy y mantenía ownership de polling en memoria; no es
  autoridad productiva multi-réplica ni sustituye readiness/budget/rights.

### Código reutilizado

- `GovernedModelLabScheduler`, `ModelReadinessStorePort`, `AssetProvenanceStorePort`,
  `ProductionBudgetAuthorityPort` y el lifecycle durable; no se creó un endpoint/router genérico.

### Riesgos y blast radius

- Provider submission y créditos: fail-closed; cualquier dependencia ausente bloquea antes del write externo.
- La composición live queda apagada hasta tener ports productivos, secrets, migrations y canary verificado.

## Plan de ejecución vigente

1. Contrato/compilador exacto y pruebas negativas — **completado**.
2. Persistencia multi-réplica de bindings, circuit state y decision history — pendiente.
3. Composición con scheduler/finalizer/result drivers y configuración fail-closed — pendiente.
4. Sandbox/allowlist interna, canary presupuestado, observabilidad y rollback — pendiente.
5. QA, cierre documental y habilitación explícita de downstream — pendiente.
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Implementar resolver provider-neutral y adapter interface productiva sobre rutas exactas; ausencia de
  provider, model ID, versión o readiness verificables equivale a ruta no ejecutable.

### Slice 2

- Aplicar readiness, rights, budget, region y capability constraints.

### Slice 3

- Agregar fallbacks declarativos, circuit breakers y observabilidad, conservando propuesta, aprobación y
  ruta real por attempt. Una ruta `blocked/unverified` —incluido Seedance 2.5 mientras mantenga ese estado— no
  puede entrar al set productivo por alias, marketing name o wrapper de tercero.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1470 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Routing opaco o degradación de calidad | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | actual route difiere sin decision record |
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

- [ ] Provider/model/version propuesto y real son visibles en history.
- [ ] Ruta no promoted o incompatible falla cerrado.
- [ ] Fallback nunca es silencioso ni cambia la unidad de crédito.
- [ ] La promoción exige model ID/endpoint exactos, evidencia de eval y provenance contractual; un nombre
  comercial por sí solo no satisface el gate.
- [ ] No existe router API/MCP genérico ni consumer que seleccione endpoint/model ID fuera del run primitive.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1470`
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
