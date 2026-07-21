# TASK-1459 — Globe Still Model Lab

## Delta 2026-07-19 — TASK-1458 complete: harness de evals listo para el carril still

`TASK-1458` (Golden Briefs & Evaluation Harness, SPEC-003) quedó **complete** (fake canary). Cierra la dependencia declarada en `Depends on` y desbloquea Slice 2 ("Ejecutar golden briefs y registrar costo/latencia/calidad") y Slice 3 ("recommendation matrix y candidatos de promoción"): esta task ya **no** construye el harness, lo **consume**. Provee, consumible por SDK, para el medio still:

- Fixture golden versionado `rrss-key-visual-still` (capability `image-generate`, contrato de fidelidad `flexible-style`, hard cap 30), como **dato** con derechos declarados (`license`/`consent`/`permittedUse`).
- Rúbrica versionada del mismo contrato con checks objetivos deterministas (`output_present`, `within_hard_cap`, `input_lineage_intact`, `route_stable`, `outcome_candidate`) y criterios humanos declarados (nunca auto-respondidos).
- Comando `globe.lab.evaluation.evaluate`, que corre el brief por el camino real del Lab (`runModelLabExperiment`) y puntúa el manifest, más los readers de reporte (`listGoldenBriefs`, `getEvaluationReport`).

Nota para Slice 3: el verdict del harness nunca es un "passed" creativo — sólo `objective_fail` u `objective_pass_pending_human`. La recommendation matrix debe tratar el reporte como evidencia objetiva (checks técnicos), no como aprobación de craft ni de ruta, y declarar la limitación "proveedor fake" hasta el canary real. — cerrado por trabajo en TASK-1458.

## Delta 2026-07-19 — TASK-1486: adapter real Vertex disponible (code-complete, rollout gated)

`TASK-1486` dejó el `VertexCreativeAdapter` **code-complete** (rollout gated): `image-generate` rutea a `gemini-2.5-flash-image` en Vertex, keyless (ADC/WIF), detrás del mismo `LabRunner`. Slice 2 ("ejecutar golden briefs y registrar costo/latencia/calidad") ya puede correr contra el proveedor **real** prendiendo `GLOBE_LAB_PROVIDER=vertex` + `GLOBE_LAB_ENABLED=true` (canary billable gated por el go-live checklist de 1486: Vertex enablement en `efeonce-globe` + SA `aiplatform.user` + budget). Hasta ese flip, el fake sigue default y el reporte del harness declara "proveedor fake". Nota: el canary sirve prompt-only (text-to-X); el still `rrss-key-visual-still` (inputs `[]`) califica. — gap de adapter cerrado por TASK-1486.

## Delta 2026-07-19 — TASK-1487: Seedream 5 disponible como motor still alternativo (Fal)

`TASK-1487` agregó el `FalCreativeAdapter` (code-complete): `image-generate` también rutea a **Seedream 5** por Fal, además de Nano Banana por Vertex. El lab still ahora puede comparar Vertex vs Seedream **por contrato de fidelidad** — seleccionable con `GLOBE_LAB_PROVIDER=fal` (Seedream) vs `vertex` (Nano Banana), o el `composite` (default Vertex para image, política explícita). La recommendation matrix debe tratar ambos como candidatos objetivos (verdict del harness nunca aprueba craft). Canary Fal billable gated por el secreto Fal de Globe. — motor alternativo agregado por TASK-1487.

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
- Domain: `creative|ai|integration`
- Blocked by: `TASK-1457, TASK-1458`
- Branch: `task/TASK-1459-globe-still-model-lab`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Integrar y probar rutas still de Seedream, GPT Image, Gemini Image, FLUX, Ideogram y Recraft con adapters declarativos y evals por caso de uso profesional.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Saber qué rutas promover para ideación, edición, layout, texto, vector y acabado, con costo y límites observados.

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
- Boundary: `Globe Still Model Lab`
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
- Contrato nuevo o modificado: `still capability descriptors, route schemas y typed attempt/result evidence; ningún endpoint por modelo`
- Backward compatibility: `gated`
- Full API parity: `cada still route se ejecuta por el experiment command/API/SDK existente; adapters no crean transports ni scripts paralelos`

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

- Implementar adapters de laboratorio con provider/model/version explícitos detrás del canonical experiment
  command de `TASK-1457`; ningún adapter es invocable directamente por CLI/UI/MCP.

### Slice 2

- Ejecutar golden briefs y registrar costo/latencia/calidad.

### Slice 3

- Emitir recommendation matrix y candidatos de promoción.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1459 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ruta promovida por una demo anecdótica | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | recommendation sin corpus mínimo |
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

- [x] Google-native usa Google Cloud; rutas no Google usan provider aprobado.
- [x] No existe fallback silencioso entre modelos.
- [x] Cada recomendación enlaza evidencia y limitaciones reales.
- [x] Todos los canaries se invocan mediante private API/SDK/conformance harness y producen el mismo
      command/audit/manifest; no existe `run_endpoint(arbitrary_json)`.
- [x] Agregar un modelo no crea un endpoint/tool model-specific: extiende capability descriptor y adapter.
- [x] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [x] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1459`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [x] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [x] QA release auditor y documentation governor ejecutados.
- [x] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Delta 2026-07-19 — Slice 2/3 ejecutados en vivo: recommendation matrix del still

El golden brief still (`rrss-key-visual-still`, contrato `flexible-style`) se corrió **por el harness de evaluación real** (`globe.lab.evaluation.evaluate` vía el registry dispatch, el seam sancionado) contra **dos motores reales**, con generación facturable real:

| Engine | Modelo | Créditos | Latencia | Objetivo | Verdict |
|---|---|---|---|---|---|
| Vertex (Google Cloud) | `gemini-2.5-flash-image` (Nano Banana) | 10 | 7s | pass | `objective_pass_pending_human` |
| Fal (non-Google) | `seedream-5-pro` | 10 | 138s | pass | `objective_pass_pending_human` |

**Lectura (Slice 3):** ambos son **candidatos de promoción objetivamente válidos** al mismo costo (10 cr); el diferenciador objetivo es la **latencia** (Nano Banana ~20× más rápido). El harness **nunca auto-elige** un ganador creativo: los criterios humanos (`brand-anchor`, `exploration-breadth`) quedan para revisión humana. Cada fila enlaza evidencia real (hash de output, créditos, latencia) y sus limitaciones.

**Bug encontrado por la corrida (el valor de correr las evals):** el `route_stable` del `FalCreativeAdapter` fallaba porque devolvía el **slug del modelo** como `actualRoute` en vez del route del contrato de fidelidad (el slug ya va en `model`). Corregido: `actualRoute = request.route` (como Vertex), y el check compara like-with-like. `pnpm check` verde.

**Motion/audio (TASK-1460/1461):** sus golden briefs parten de una imagen/referencia (`authorizedInputs`) → `inputs_unavailable` hasta la resolución hash→bytes (track B). El carril still queda cerrado; los otros dos esperan ese desbloqueo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
