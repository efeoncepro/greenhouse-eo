# TASK-1460 — Globe Motion Model Lab

## Delta 2026-07-19 — TASK-1458 complete: harness de evals listo para el carril motion

`TASK-1458` (Golden Briefs & Evaluation Harness, SPEC-003) quedó **complete** (fake canary). Cierra la dependencia declarada en `Depends on` y desbloquea Slice 2 ("Probar text/image-to-video, extensión y continuidad con fixtures") y Slice 3 ("Evaluar acción, anatomía, cámara, audio, latencia y costo"): esta task ya **no** construye el harness, lo **consume**. Provee, consumible por SDK, para el medio motion:

- Fixture golden versionado `product-motion-loop` (capability `video-generate`, contrato de fidelidad `flexible-style`, hard cap 60), como **dato** con derechos declarados (`license`/`consent`/`permittedUse`).
- Rúbrica versionada del mismo contrato con checks objetivos deterministas (`output_present`, `within_hard_cap`, `input_lineage_intact`, `route_stable`, `outcome_candidate`) y criterios humanos declarados (nunca auto-respondidos).
- Comando `globe.lab.evaluation.evaluate`, que corre el brief por el camino real del Lab (`runModelLabExperiment`) y puntúa el manifest, más los readers de reporte (`listGoldenBriefs`, `getEvaluationReport`).

Nota para Slice 3 y la AC "La matriz distingue canary, lab-ready y production-candidate": lo que el harness puntúa objetivamente es el manifest (output presente, dentro del cap, lineage intacto, ruta estable, outcome candidato); el juicio de continuidad/actuación/cámara/audio son **criterios humanos declarados**, no auto-puntuados, y el verdict nunca es un "passed" creativo (`objective_fail` u `objective_pass_pending_human`). La matriz no puede promover una ruta desde un reporte objetivo solo. — cerrado por trabajo en TASK-1458.

## Delta 2026-07-19 — TASK-1486: adapter real Vertex disponible (code-complete, rollout gated)

`TASK-1486` dejó el `VertexCreativeAdapter` **code-complete** (rollout gated): `video-generate`/`video-extend` rutean a `gemini-omni-flash-preview` en Vertex región `global` (us-east4/us-central1 → `NOT_FOUND`), keyless, detrás del `LabRunner`. Slice de ejecución del lab motion ya puede correr contra el proveedor **real** con `GLOBE_LAB_PROVIDER=vertex` + `GLOBE_LAB_ENABLED=true` (canary billable gated por el go-live checklist de 1486). Nota dura: el canary sirve **prompt-only** (text-to-video); un motion que requiere una imagen de referencia (i2v) queda `inputs_unavailable` hasta que aterrice la resolución hash→bytes desde el bucket privado (follow-up declarado en 1486). Omni deforma texto/logos/UI — no usar para copy/logo. — gap de adapter cerrado por TASK-1486.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
- Domain: `creative|ai|video`
- Blocked by: `TASK-1457, TASK-1458`
- Branch: `task/TASK-1460-globe-motion-model-lab`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar y probar Veo, Seedance, Kling, PixVerse y Gemini Omni canary para motion profesional, continuidad, actuación, cámara, audio y extensión.

Seedance se evalúa por ruta y versión verificables. A la fecha del diseño, `Seedance 2.5` permanece
`blocked/unverified`: una landing, rollout de cuenta o wrapper comercial no equivale a endpoint público ni a
model ID ejecutable. La task debe revalidar esa condición al comenzar y nunca degradar silenciosamente a 2.0.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Definir rutas de video promovibles por tipo de toma y riesgo creativo.

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

- `TASK-1457`, `TASK-1458`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/packages/media-qc/`

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
- Boundary: `Globe Motion Model Lab`
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

- Contrato existente a respetar: `TASK-1481 spine + TASK-1457 experiment commands/readers y provider contracts versionados`
- Contrato nuevo o modificado: `async motion submit/status/result/cancel descriptors y typed artifact/attempt projections`
- Backward compatibility: `gated`
- Full API parity: `motion routes usan el mismo experiment API/SDK y async command/reader; ningún transport llama al provider`

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
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Implementar adapters y capacidades motion versionadas detrás del canonical async experiment command sólo
  para endpoints/model IDs oficiales o contractualmente verificables; registrar las rutas anunciadas pero no
  ejecutables como `blocked`.

### Slice 2

- Probar text/image-to-video, extensión y continuidad con fixtures.

### Slice 3

- Evaluar acción, anatomía, cámara, audio, latencia y costo.
- Capturar provider/modelo/version propuestos y ejecutados por attempt; cualquier fallback, incluida una
  sustitución 2.5→2.0, requiere nueva decisión explícita y evidencia separada.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.
- Tratar páginas promocionales, acceso UI no reproducible o agregadores sin model ID/schema oficial como una
  integración de Seedance 2.5.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1460 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo alto y resultados no repetibles | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | attempt sin límite o sin lineage |
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

- [ ] Cada video conserva source assets, modelo/version y parámetros.
- [ ] La matriz distingue canary, lab-ready y production-candidate.
- [ ] Fallos de seguridad, continuidad o audio bloquean promoción.
- [ ] Seedance 2.5 permanece fail-closed mientras no exista ruta verificable; si aparece, la evidencia incluye
  provider legal, model ID exacto, endpoint/schema, región, precio, derechos y metadata reproducible.
- [ ] Ningún fallback cambia de modelo o versión silenciosamente.
- [ ] Submit/status/result/cancel se prueban por API/SDK sobre el mismo primitive y audit; no hay provider SDK
      directo desde CLI, UI, MCP, scripts ni E2E.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1460`
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
