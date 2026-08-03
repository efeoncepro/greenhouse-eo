# TASK-1469 — Globe Governed Run Lifecycle, Submission Fence and Provider Completion

## Delta 2026-08-02 — alcance restante reducido y orden frente a TASK-1632

El lifecycle durable, submission fence, completion drivers, retención y settlement ya están vivos. Esta task no
reconstruye ese sistema ni bloquea el diseño del contrato de capacidades de TASK-1633. Su cierre restante se limita a:

- terminalizar o superseder reconciles de runs ya terminales;
- medir `queueOldestAgeSeconds` sólo sobre trabajo reclamable;
- recuperar por primitives canónicas propuestas históricas atrapadas en `confirmed|confirm_failed`, sin SQL;
- demostrar que duplicate/late completion y retry convergen sin segundo cobro ni segundo terminal.

Orden: TASK-1469 puede avanzar en paralelo con TASK-1633 y debe cerrar antes de TASK-1632. Es preferible cerrarla
antes del canary final de Omni para que las señales sean honestas, pero no bloquea la corrección de catálogo/UI.

Criterios exigibles adicionales:

- [ ] No quedan reconciles reclamables asociados a runs terminales ni métricas infladas por trabajo no reclamable.
- [ ] La recuperación de funding decisions históricas usa commands/readers existentes y deja audit; no usa SQL.
- [ ] Un replay de completion/reconcile no crea attempt, provider submit, settlement ni cobro adicional.
- [ ] TASK-1632 permanece bloqueada hasta que este cierre esté verificado en runtime.

## Delta 2026-07-26

- **Caso nuevo para la terminalización del reconcile:** el carril de fondeo (TASK-1566, cerrada)
  dejó **3 propuestas de `credit_funding_proposals` colgadas en `confirmed`** (cuelgues pre-fix del
  defecto 7) + 1 `confirm_failed`. El TTL sólo vence `proposed`, así que NO se terminalizan solas, y
  re-confirmarlas da `conflict` (expectativa de estado). La reconciliación/terminalización que esta
  task diseñe debe cubrir ese estado — nunca SQL manual (evidencia inmutable del incidente).


## Delta 2026-07-26 — el mecanismo ESTÁ vivo; lo que queda es la terminalización del reconcile

**Medido contra el runtime, no leído.** Cuatro runs pagados desde la UI (principal `human` por el BFF, no el
carril workload): imagen `spent=10` + `spent=10`, video `spent=16` ×2, y un video `provider_failed` con
`spent=0`. Artefactos reales retenidos (PNG 7,42 MB `active`; MP4 1,57 MB). El feed se actualizó **solo** en las
cuatro corridas — o sea la captura del aviso de completion funciona end-to-end.

🔴 **El bloque `### Already exists` de esta task quedó STALE y engaña.** Dice cosas que hoy son falsas, y un
agente que lo lea va a creer que tiene que construir lo que ya corre:

| Dice | Realidad verificada 2026-07-26 |
|---|---|
| *"`app.ts` no expone hoy un webhook Fal"* | **Existe**: `apps/studio-web/src/app.ts:1702`, `/v1/provider-webhooks/(fal\|openai)/{id}`, con `GLOBE_PROVIDER_WEBHOOK_PROXY_ENABLED=true` en el servicio vivo |
| *"crea `InMemoryExperimentStore`"* | Stores **durables** desde TASK-1465 (complete) |
| *"scheduler `PAUSED`"* | `globe-producer-worker` **ENABLED**, cron `* * * * *` |
| *"no se ejecutó el worker sobre trabajos pagados"* | 4 runs pagados hoy, con settlement en el ledger |

**Alcance restante, que es MUCHO más chico que el título:**

1. La deuda que la propia task declara (Checkpoint 2026-07-23): eventos outbox `reconcile` en `pending` con runs
   ya terminales, inflando `queueOldestAgeSeconds`. Cierre correcto ya escrito ahí: terminalizar/superseder al
   completar + medir edad sólo sobre trabajo reclamable. **NUNCA** limpiar por SQL ni subir el threshold.
2. ~~OpenAI sin lane productivo~~ — **resuelto 2026-07-30**. GPT Image 2 y GPT Image 1.5 tienen driver gobernado,
   promociones exactas y generaciones reales desde el Producer. No forma parte del alcance restante de esta task.

**Lo que NO es de esta task, y hay que no confundirlo:** la superficie de fallo en el feed (tarjeta de una corrida
fallida ofreciendo acciones muertas) es de **`TASK-1526`**. Ver el delta que se le agregó allí.

> **Recomendación: reescribir el `Summary` y el `Already exists` antes de que alguien la tome.** Una task cuyo
> encabezado pide "implementar el lifecycle" cuando lo que falta es "terminalizar el reconcile" hace que el próximo
> ejecutor dimensione mal el trabajo — y este delta existe porque casi me pasa a mí.

## Delta 2026-07-21 — TASK-1507 complete: la base URL estable es el dominio, no el `run.app`

`TASK-1507` está complete: la base URL estable es `https://globe.efeoncepro.com`; el `*.run.app` ya no es alcanzable
por browser (404) y sólo persiste en el allowlist OAuth como rollback — no usarlo como base de callback/canary. El
ingress del web quedó en `internal-and-cloud-load-balancing`, así que un callback o canary montado sobre esa URL no
funciona. Supersede lo que decía el Delta 2026-07-20 de más abajo.

## Delta 2026-07-20 — estimate previewable adelantado por TASK-1502 (complete)

El paso de estimate del run lifecycle durable **ya existe** como slice adelantado (TASK-1502, complete): `LabRunnerPort.estimate({ quote: LabQuoteInputV1 })` + el reader read-only `globe.lab.experiment.estimate`. 1469 **consume** ese mismo cómputo de estimate como su paso de estimate, sin reimplementarlo; el `execute` ya deriva su quote vía `quoteInputFromStored`. El `withinDayCap` durable (hoy no poblado) se puebla cuando 1469/1468 aporten el fence durable.

## Delta 2026-07-20 — public base URL HTTPS estable la define TASK-1507 (front door)

La `External coordination: public base URL HTTPS estable` que este task exige para los callbacks Fal/OpenAI y el
canary ya tiene owner: **ADR-004** (`TASK-1506`, complete) fijó el front door y **`TASK-1507`** (sucesora) implementa
`https://globe.efeoncepro.com` vía Global External ALB + serverless NEG → `globe-studio-internal`. **1507 cerró el
2026-07-21**: la base URL estable es ese dominio y el `*.run.app` ya no sirve como callback/canary base (ver el Delta
2026-07-21). No inventar un dominio propio ni asumir Vercel: el host del shell interno es Cloud Run (ADR-004).

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
- Backend impact: `webhook`
- Epic: `EPIC-028`
- Status real: `Lifecycle durable live; los 5 arreglos de la espera de governance desplegados (efeonce-globe@d58bc6f). Restante: convergencia terminal de los agregados del run (barrido primero), cableado de las 2 señales de outbox y recovery de experimentos huérfanos — ver Delta 2026-08-03`
- Rank: `TBD`
- Domain: `creative|platform|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar la deuda residual del lifecycle ya desplegado: terminalizar/superseder reconciles no reclamables, reconciliar
decisiones históricas atrapadas y hacer que las métricas describan trabajo real, sin SQL ni reimplementar drivers.

## Checkpoint 2026-07-23 — ejecución real y deuda de reconciliación

- El Scheduler/worker procesó 5 runs hasta `completed`; Image, Video y Audio publicaron outputs recuperables.
- Quedaron 5 eventos outbox `reconcile` en `pending` con runs ya terminales. El worker reclama cero, pero
  `queueOldestAgeSeconds` sigue creciendo y genera ruido operativo.
- Cierre robusto: terminalizar/superseder el reconcile al completar, medir edad sólo sobre trabajo reclamable y
  backfill gobernado. No limpiar por SQL manual ni ocultar la señal subiendo el threshold.

### Checkpoint anterior: worker desplegado; scheduler pausado

- El workflow keyless `29973093343` publicó el Producer Worker por digest inmutable; Cloud Run Job quedó en
  topología `1×1`, con SA/Cloud SQL/storage/secrets mínimos y scheduler `PAUSED`.
- Migraciones `0001…0023` están aplicadas y el runtime API/Studio sirve el SHA desplegado con perimeter checks
  verdes. No se ejecutó el worker sobre trabajos pagados porque tenancy efectiva y Model Readiness fallan cerrado.
- El dry-run de Producer autenticado estimó 32 créditos para Image/Video/Audio y no llamó `execute`; readiness
  devolvió `not_found` para las tres modalidades. No hubo gasto ni intento de bypass.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Garantizar que un run autorizado se ejecute una vez, conserve ruta real y sea recuperable aunque el request web,
el proceso, una entrega de webhook o un ciclo de polling fallen, sin fingir que todos los proveedores ofrecen el
mismo mecanismo de completion.

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

- `TASK-1465` para persistencia tenant-scoped de runs, provider attempts, correlación y audit; un webhook no puede
  depender de maps in-memory entre réplicas o revisiones de Cloud Run.
- `TASK-1466`, `TASK-1467`, `TASK-1468` y `TASK-1482` para el seam final de budget policy/funding.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/database/`
- `../efeonce-globe/apps/creative-runner/`
- `../efeonce-globe/apps/studio-web/`
- `../efeonce-globe/packages/contracts/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.
- `../efeonce-globe/apps/creative-runner/src/fal-adapter.ts` ya usa la queue API y respeta los `status_url` y
  `response_url` retornados por Fal, pero `submit()` drena la cola por polling dentro del proceso antes de retornar.
- `../efeonce-globe/apps/creative-runner/src/vertex-video-adapter.ts` ya modela Veo como long-running operation y
  consulta `fetchPredictOperation`; Vertex/Veo no expone un callback URL por request equivalente al de Fal.
- Globe no tiene todavía un adapter OpenAI productivo. OpenAI ofrece webhooks project-scoped para recursos/eventos
  soportados —incluidas Responses en background—, pero no se asumirá cobertura universal para todos sus endpoints.
- `../efeonce-globe/apps/studio-web/src/app.ts` no expone hoy un webhook Fal y crea `InMemoryExperimentStore`;
  por eso un callback recibido por otra réplica o después de un restart no puede correlacionarse de forma segura.

### Gap

- Falta separar submit de completion y normalizar mecanismos heterogéneos: webhook firmado Fal, webhook OpenAI sólo
  para eventos soportados y polling durable de operaciones Vertex. Todos deben converger en el mismo completion
  contract y reconciler sin mantener abierto el request original.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Governed Run Lifecycle and Submission Fence`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `webhook`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `prepare/estimate/approve/submit/cancel/retry/branch commands; get/list run readers;
  provider completion driver; inbound POST /v1/provider-webhooks/fal y /v1/provider-webhooks/openai para eventos
  soportados; durable Vertex LRO poll driver; normalized callback/reconciliation contract`
- Backward compatibility: `gated`
- Full API parity: `run lifecycle is the canonical primitive for UI/SDK/MCP/CLI/worker; transports cannot enqueue or call providers directly`

### Data model and invariants

- Entidades/tablas/views afectadas: `agregados Globe tenant-scoped de run, provider attempt y webhook delivery
  definidos por la migración aceptada de TASK-1465/esta task; nombres físicos se fijan en el plan aprobado`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version
  explícitos y audit append-only; approval token liga estimate/reservation, pool, funding breakdown y
  budget_policy_version, y submit revalida sus preconditions sin elevar permisos; una desconexión después del write
  externo nunca se interpreta automáticamente como rechazo, y cancel requested nunca equivale a cancel confirmed`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `submission idempotency key y provider operation/request/event IDs durables; callback
  at-least-once deduplicado; polling con lease; transición terminal y settle/release exactamente una vez bajo
  lock/transacción; callback repetido retorna 2xx sin mutar; un attempt sólo puede tener un owner/lease vigente y
  fencing token para completion/reconciliation`
- Audit/outbox/history: `actor, correlation, intento, provider operation/request/event IDs, completion driver,
  decisión, transición, delivery/reconciliation source y error sanitizado; secretos, firma y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `sin backfill de runs in-memory; sólo runs creados después del cutover usan el flujo async durable`
- Rollback path: `flag webhook OFF, mantener/reponer polling reconciler y detener nuevos submits sin perder attempts durables`
- External coordination: `public base URL HTTPS estable; configuración Fal webhook por submit; webhook OpenAI
  project-scoped + signing secret cuando aplique; Vertex ADC/IAM; acceso a JWKS; Cloud Run/IAM; owner de GCP/provider
  y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `commands por capability/workspace; webhooks sin sesión humana pero autenticados por proveedor:
  Fal con Ed25519/JWKS y timestamp ±5 minutos, OpenAI con Standard Webhooks/signing secret; Vertex poller con ADC/IAM;
  todo completion se correlaciona server-side a un attempt esperado`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, body-size limit, replay guard, rate limit, concurrency cap, timeout, retry acotado
  y circuit breaker; nunca confiar workspace/model/route recibidos en el callback`

### Runtime evidence

- Local checks: `unit, contract, signature/timestamp/replay, duplicate/out-of-order/late delivery, disconnect-after-submit,
  late-completion-after-cancel, lease takeover, body-limit, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo por driver: Fal submit→webhook; OpenAI background→webhook sólo en recurso
  soportado; Vertex predictLongRunning→poll; además callback ERROR, payload null, duplicate delivery, firma inválida,
  callback ausente recuperado y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, provider, completion_driver, provider operation/request/event ID, route,
  attempt, lifecycle state, unknown-submission age, cancellation age, lease owner/fencing token, webhook latency o
  poll lag, reconciliation source, duplicate count, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Approved Producer target addendum — durable execution orchestration

This task owns the durable run/job lifecycle required by the approved Producer surface. The submission boundary
MUST transactionally persist run intent, the applicable reservation reference and an outbox/job handoff before a
worker can spend. A browser retry, replica restart or ambiguous timeout cannot create a second provider spend.

- Persist `runId`, `jobId`, attempt, route snapshot, priority, idempotency key and correlation identifiers; dispatch
  occurs from an outbox/queue worker, never from the request process after an uncommitted response.
- Model progress as honest lifecycle phase/attempt/provider evidence. An elapsed-time animation or invented
  percentage is prohibited. When no granular evidence exists, expose a coarse state.
- Cancellation distinguishes requested, provider-confirmed and terminal cancellation. It releases/settles only
  according to authoritative execution evidence and records late provider completion safely.
- Retry is policy-bounded and attempt-aware. Priority changes are governed commands with audit, queue eligibility
  checks and no ability to bypass budget, rights, route or approval gates.
- A reconciler detects orphaned dispatches, missing callbacks, duplicate callbacks and timed-out attempts, and can
  be invoked by a guarded operator path. Replay remains idempotent across replicas.
- Status/list projections expose the fields needed by `TASK-1498`, `TASK-1519` and the Producer feed without
  exposing provider errors or vendor-cost data.
- Commercial reservation/settlement remains owned by `TASK-1468`/`TASK-1482`. This task consumes their authority;
  it does not redefine balances, pricing or credit currency.

Additional acceptance evidence:

- [ ] Crash-after-commit and retry-after-timeout tests prove one durable job and no duplicate provider spend.
- [ ] Cancel, retry, priority and reconcile commands are idempotent, capability-gated and audit-correlated.
- [ ] Progress tests prove no fabricated percentage and preserve an explicit unknown/coarse state.
- [ ] Duplicate/late completion converges to one terminal run and one settlement/release decision.

### Slice 1 — Lifecycle durable y correlación

- Definir state machine y transiciones legales al menos para `approved → submitting → queued|running →
  completion_received → ingesting → completed|failed`, con carriles explícitos `submission_unknown`,
  `cancellation_requested`, `cancelled`, `timed_out` y `reconciling`.
- Definir commands y approval token ligados a estimate.
- Bindear approval a pool/funding breakdown/budget policy version y revalidar en submit; cambio material exige
  estimate/reservation/approval nuevos.
- Persistir antes de la llamada facturable el attempt/submission fence, idempotency key y fencing token. Si la red
  falla después de enviar pero antes de confirmar aceptación, transicionar a `submission_unknown`: prohibido crear
  otro attempt facturable hasta reconciliar el original mediante la primitive disponible del proveedor.
- Al aceptar Fal, persistir su `request_id`, `status_url` y `response_url` retornados; nunca reconstruir URLs desde
  el slug. Aplicar el mismo principio al response/operation ID canónico de cada proveedor.

### Slice 2 — Completion driver contract y submits async

- Definir un `ProviderCompletionDriver` interno que normalice `pending | completed | failed | cancelled` sin filtrar
  payloads, estados o autenticación vendor-specific al dominio.
- Fal: cambiar drain in-process por submit que retorna tras persistir queue acceptance; recibir completion en
  `POST /v1/provider-webhooks/fal`, verificar Ed25519/JWKS sobre body crudo y deduplicar por `request_id`/delivery.
- OpenAI: para recursos con eventos oficiales, recibir `response.*`/evento aplicable en
  `POST /v1/provider-webhooks/openai`, verificar Standard Webhooks sobre body crudo y deduplicar por `webhook-id` +
  event ID; si el endpoint/modelo no emite webhook, el adapter declara otra estrategia y nunca simula soporte.
- Vertex/Veo: persistir el operation name devuelto por `predictLongRunning` y resolver completion mediante un worker
  durable que llama `fetchPredictOperation`; GCS/Eventarc puede acelerar success, pero no reemplaza la LRO como verdad.
- Encolar o persistir cada callback/señal y responder 2xx rápidamente; el handler no settlea créditos ni descarga
  media dentro del tiempo de entrega.

### Slice 3 — Completion normalizado, assets y settlement

- Traducir el resultado vendor-specific al completion contract de forma idempotente, resolver sólo contra el attempt
  durable esperado y descargar/copiar output server-side a almacenamiento propiedad de Globe cuando corresponda.
- Producir hashes/provenance, transición terminal y settle/release exactamente una vez; payload null usa el
  `response_url` persistido para recuperar el resultado.
- Aplicar efectos exactly-once dentro de Globe sobre señales at-least-once: ingest, manifest, ledger settlement,
  outbox y transición terminal comparten boundary transaccional/idempotency guard proporcional.
- Procesar completion posterior a `cancellation_requested` o timeout como resultado tardío auditable: conservar
  output/costo real según policy, nunca promover automáticamente a candidate y no liberar una reserva que deba
  liquidarse por trabajo efectivamente cobrado.

### Slice 4 — Reconciler por estrategia y recovery

- Mantener retrieval/polling bounded como safety net para Fal/OpenAI cuando sea soportado y como completion principal
  para Vertex LRO; los webhooks aceleran, pero nunca son la única fuente de recuperación.
- Implementar leases con expiración, owner y fencing token para que sólo un worker complete/reconcilie cada attempt;
  takeover tras crash invalida al owner anterior.
- Separar deadlines de submit acknowledgement, queue wait, inference, webhook delivery, polling y output ingest.
  Expirar un deadline local no presume que el proveedor detuvo o dejó de cobrar el trabajo.
- Manejar retry, callback duplicado/tardío/fuera de orden, fallback explícito, `submission_unknown`, cancel request,
  cancel confirmation, timeout y crash recovery sin doble gasto.
- Proveer operaciones gobernadas de replay/reconcile manual por attempt/provider ID, con dry-run/readback y audit;
  nunca una mutación directa de tablas.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.
- Forzar una abstracción de webhook sobre Vertex, confiar sólo en callback sin reconciler, aceptar callbacks sin firma,
  usar un shared secret inventado o reconstruir URLs Fal desde el slug.
- Implementar el webhook sobre `InMemoryExperimentStore` o habilitarlo antes de la persistencia durable de TASK-1465.
- Diseñar pricing/ledger comercial (TASK-1468), routing/fallback/circuit-breaker policy (TASK-1470), rights/retention
  de assets (TASK-1467) o estados UI (TASK-1474); esta task expone los estados/señales que esas dueñas consumen.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1469 --develop` cuando el operador apruebe su
goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre
permanecen en esta spec canónica.

Provider completion posture validado 2026-07-20 contra documentación oficial y a revalidar al tomar la task:

- Fal async queue acepta `fal_webhook`, entrega `request_id`, `status: OK|ERROR` y payload; reintenta entregas y firma
  con headers `X-Fal-Webhook-*` + Ed25519/JWKS. Webhook primary con queue polling/retrieve de respaldo.
- OpenAI configura webhooks por proyecto y emite eventos para recursos soportados como Responses background, Batch,
  fine-tuning y evals; usa Standard Webhooks/signing secret, puede duplicar eventos y reintenta hasta 72 horas.
  Verificar soporte por endpoint/modelo antes de seleccionar el driver.
- Vertex/Veo `predictLongRunning` retorna una `Operation`; completion se consulta mediante `fetchPredictOperation`.
  No asumir un webhook por request que la API no ofrece.

Semántica de fallo obligatoria: `retryable | terminal | policy_rejected | quota_exhausted |
provider_unavailable | output_expired | unknown_outcome`. Esta taxonomía normaliza decisión/recovery; el detalle
vendor-specific queda sólo en adapter/audit redacted. En particular, timeout o socket reset durante submit produce
`unknown_outcome`, no `failed`, hasta que reconciliación demuestre aceptación o rechazo.

- `https://fal.ai/docs/documentation/model-apis/inference/queue`
- `https://fal.ai/docs/documentation/model-apis/inference/webhooks`
- `https://fal.ai/models/fal-ai/kling-video/v3/turbo/standard/image-to-video/api`
- `https://developers.openai.com/api/docs/guides/webhooks`
- `https://developers.openai.com/api/reference/resources/webhooks`
- `https://docs.cloud.google.com/vertex-ai/generative-ai/docs/reference/rpc`
- `https://cloud.google.com/vertex-ai/generative-ai/docs/reference/rest/v1beta1/projects.locations.publishers.models`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1465 durable correlation -> Slice 1 lifecycle/fence -> Slice 2 webhook -> Slice 3 completion/settlement ->
  Slice 4 reconciler -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble gasto o ejecución fuera de aprobación | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | provider attempt sin submission record |
| Provider aceptó pero Globe perdió el ack | Globe/provider | high | fence persistido antes del write, `submission_unknown`, lookup/reconcile antes de reintentar | unknown-submission age sobre SLA |
| Completion posterior a cancel/timeout | Globe/provider/ledger | high | `cancellation_requested`, late-result policy y settlement según costo real | terminal event después de cancel request |
| Callback falsificado o replay | Globe/provider boundary | medium | verificador vendor-specific, body crudo, ventana temporal, dedupe durable y mapping server-side | firma/timestamp inválidos o provider ID desconocido |
| Webhook perdido, tardío o duplicado | Globe/Fal/OpenAI | high | ack rápido, idempotencia y retrieval/poll reconciler | reconciliation lag o duplicate count sobre umbral |
| Dos workers completan el mismo attempt | Globe worker/data | medium | lease + fencing token + unique/idempotency guards | stale owner intenta escribir completion |
| Vertex tratado como webhook | Globe/Vertex | medium | driver LRO explícito + tests de `predictLongRunning`/`fetchPredictOperation` | operation sin lease/poller durable |
| Output expira antes de ingest | Globe assets | medium | completion worker prioritario, copy server-side y alert por lag | completion sin asset/hash durable |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. El cutover se configura por proveedor: Fal/OpenAI soportado permiten
`poll-only | webhook-shadow | webhook-primary`; Vertex usa `lro-poll` y opcionalmente `event-shadow`. El rollback
siempre vuelve al driver recuperable correspondiente sin borrar attempts. Los nombres concretos de flags se fijan en
el plan para no inventar configuración stale.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Submit/completion drivers | volver por proveedor a `poll-only` o `lro-poll`; no borrar attempts ni IDs externos | <15 min | sí |
| Completion/settlement | detener consumer, preservar callbacks durables y reconciliar desde audit | <30 min | sí, con reparación |
| Datos/externos | detener nuevos submits, drenar/reconciliar attempts aceptados y aplicar runbook | <60 min | parcial |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Ningún provider submission ocurre sin approval/reservation válidos.
- [ ] Approval y submission preservan pool/funding/policy version; pause/cap/cambio material falla cerrado.
- [ ] El mismo idempotency key no genera doble gasto.
- [ ] Socket reset/timeout después de enviar un submit produce `submission_unknown`; ningún retry facturable ocurre
      hasta reconciliar si el proveedor aceptó el attempt original.
- [ ] Fal submit retorna sin drenar la cola in-process y persiste `request_id` + URLs devueltas antes de depender del callback.
- [ ] El webhook verifica firma Ed25519 sobre body crudo, headers obligatorios y ventana de timestamp; firma inválida,
      replay vencido o `request_id` desconocido no mutan estado.
- [ ] OpenAI usa webhook sólo para eventos/endpoints oficialmente soportados, verifica Standard Webhooks y deduplica
      `webhook-id`/event ID; endpoints sin evento declaran otra estrategia explícita.
- [ ] Vertex/Veo persiste el operation name y completa mediante `fetchPredictOperation` en un worker durable; ninguna
      ruta pretende pasar un callback URL inexistente al proveedor.
- [ ] Todos los drivers producen el mismo completion contract interno y ningún estado/payload vendor-specific entra
      en la state machine de dominio.
- [ ] Entregas duplicadas/tardías responden de forma idempotente y settlement/release ocurre exactamente una vez.
- [ ] `cancellation_requested` no se presenta como `cancelled`; completion tardío conserva audit/output/costo según
      policy y nunca promueve automáticamente el resultado.
- [ ] Eventos fuera de orden no regresan estados terminales ni ejecutan dos veces ingest, manifest, outbox o ledger.
- [ ] Lease/fencing impide que dos workers completen o reconcilien el mismo attempt; takeover tras expiración invalida
      writes del owner anterior.
- [ ] Deadlines de submit, queue, inference, webhook, poll e ingest son independientes y tienen stuck detection.
- [ ] El handler acusa recibo rápidamente y delega descarga, hashing, ingest y settlement a trabajo durable.
- [ ] El reconciler completa un run cuando el webhook falta, conduce Vertex LRO y no duplica completion si una señal
      llega después.
- [ ] Outputs se copian a storage privado de Globe y preservan hash/provenance antes de marcar `candidate_ready`.
- [ ] Fallback requiere policy explícita y registra proposed vs actual route.
- [ ] Existe replay/reconcile manual gobernado por attempt/provider ID, con dry-run/readback, capability y audit.
- [ ] API/SDK/conformance cubren prepare→estimate→approve→submit→status/cancel/retry/branch, deny y replay con
      el mismo run/audit; queue/runner sólo consumen commands/events.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1469`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Delta 2026-08-03 — una espera modelada como error costó una pieza pagada

Encontrado verificando el contrato de ruta de `TASK-1633` con una generación real. **El defecto es de esta task**,
no de aquélla: 1633 lo destapó, 1469 lo arregla.

### Qué pasó

Una imagen fue aceptada por el proveedor, cobrada (10 créditos), y **nunca apareció**. El run terminó `failed` y
el experimento quedó en `running` para siempre; la UI mostró «generando» indefinidamente sobre trabajo ya pagado.

### La causa, que son cuatro capas componiéndose

El error real es **`generated_asset_governance_pending`** — el finalizador esperando a que Asset Governance
termine con el output (C2PA, scan, elegibilidad). **No es un fallo: es una espera.** Y cada capa lo empeoró:

| Capa | Qué hizo |
|---|---|
| `finalizationFailureCode` | El nombre no estaba en su allowlist → lo colapsó en `run_finalization_failed` (defecto de `ISSUE-127`) |
| Política de reintentos | El genérico cae a `unknown`, tope 3 → mató la espera en el tercer intento (`ISSUE-135`) |
| `backoffMs` | Exponencial con techo de 5 min, **igual para errores que para esperas** → la pieza quedaba lista y sin publicar todo ese rato |
| `reschedule` terminal | Marcaba el run `failed` y **nadie tocaba el experimento** |

Ninguna es incorrecta por separado. **Compuestas** produjeron la pérdida. Y la evidencia de que el tope era una
apuesta: el día anterior la MISMA espera tardó **12 entregas** y completó bien.

### Arreglado (`efeonce-globe@bbbc9c1` + el commit siguiente)

1. `generated_asset_governance_pending` entra a `SAFE_FINALIZATION_CODES`: su nombre sobrevive.
2. Se clasifica **`waiting`**, simétrico a `completion_checkpoint_missing` — una espera al proveedor, la otra a
   governance.
3. **La fase entra en `shouldFailTerminally`**: post-gasto (`reconcile`/`complete`) abandonar significa que el
   cliente pagó y no recibió, así que lo no clasificado tiene el margen de lo recuperable. Pre-gasto (`submit`)
   conserva los topes cortos. Lo genuinamente determinista muere igual en su primera entrega.
4. **El ritmo depende de la clase**: una espera vuelve a mirar pronto (cadencia fija) en vez de heredar el backoff
   de un error. El backoff existe para no martillar un sistema **caído**; governance está trabajando.
5. **Un run terminal cierra su experimento** vía el puerto nuevo `RunFinalizerPort.abandon` — obligatorio, no
   opcional, para que quien no lo implemente rompa el build. **No toca créditos** a propósito: el settlement es
   autoridad de otro dueño y ya decidió.

**Verificado en producción:** generación completa, `run: completed`, `experiment: candidate_ready`, pieza visible
y **un solo cobro** (738 → 728).

### 🔴 El hallazgo que amplía el alcance de esta task

Su alcance restante dice *«terminalizar o superseder reconciles de runs ya terminales»* — o sea **la misma
enfermedad, en otra pareja**:

| Pareja | Síntoma | Estado |
|---|---|---|
| outbox `reconcile` ↔ `governed_runs` | reconciles pendientes de runs terminales, métricas infladas | declarado acá |
| `experiments` ↔ `governed_runs` | experimento `running` eterno, pieza fantasma | **no estaba declarado; arreglado hoy** |

**Si hay dos parejas, el arreglo no es por pareja.** El invariante correcto es: *cuando un run llega a terminal,
todo agregado que dependa de su estado converge o queda observable*. Arreglar caso por caso garantiza descubrir el
tercero en producción, como pasó con éste.

Candidatos a barrer, **no verificados**: reservas de crédito colgadas (¿el expiry las cubre siempre?) y assets en
governance de un run que murió. Ampliar el alcance a ese barrido es decisión del operador.

### Pendiente que este delta NO cierra

Las señales `globe.run.outbox_dead_letter` y `globe.run.outbox_retry_storm` **siguen sin existir** (punto abierto
de `ISSUE-135`). Sin ellas, la próxima espera larga tampoco avisa — y los **6 experimentos huérfanos** anteriores
al arreglo siguen en `running`, porque `abandon` sólo actúa sobre runs que mueran de ahora en adelante.

## Delta 2026-08-03 — los cinco arreglos están en producción; el hallazgo redefine el alcance restante

Continuación del delta anterior, ya con rollout. **Lo que sigue está verificado leyendo el código de
`../efeonce-globe`, no el commit message.**

### Los cinco arreglos, y dónde vive cada uno

Commits `efeonce-globe@bbbc9c1` (fase + `abandon`) y `@deffbd4` (allowlist + clase + ritmo). Ambos son
ancestros de `d58bc6f`, que es el SHA desde el que están desplegados **los tres runtimes** de Globe.

| # | Arreglo | Dónde verificarlo |
|---|---|---|
| 1 | `generated_asset_governance_pending` entra a la allowlist del sanitizador: **el nombre de la espera sobrevive** en vez de colapsar en `run_finalization_failed` | `packages/domain/src/governed-run-lifecycle.ts:623` |
| 2 | Se clasifica **`waiting`**, simétrico a `completion_checkpoint_missing` — una espera al proveedor, la otra a governance | `governed-run-failure-policy.ts:166` (`WAITING_CODES`) |
| 3 | **La fase entra en la política de reintentos.** `shouldFailTerminally(code, attempt, kind)`: `submit` conserva topes cortos; `reconcile`/`complete` le dan a lo no clasificado el margen de lo recuperable | `governed-run-failure-policy.ts` (`POST_SPEND_KINDS`, `POST_SPEND_UNKNOWN_CAP`) |
| 4 | **El ritmo depende de la clase.** Una espera vuelve a mirar a los 10 s fijos en vez de heredar el backoff exponencial de error | `governed-run-lifecycle.ts` (cálculo de `backoffMs`) |
| 5 | **Un run terminal cierra su experimento** vía `RunFinalizerPort.abandon` | `governed-run-lifecycle.ts` + `governed-run-lifecycle.test.ts:364-396` |

Dos decisiones de diseño que no son detalle y conviene no revertir por descuido:

- **La asimetría que justifica el #3**: antes del gasto, abandonar devuelve el crédito y no pierde nada;
  después del gasto, abandonar significa que **el cliente pagó y no recibió**. Los dos errores no cuestan lo
  mismo, así que no pueden compartir tope. Lo genuinamente `terminal` sigue muriendo en su primera entrega
  incluso post-gasto.
- **`abandon` es obligatorio en el puerto, no opcional** — para que quien no lo implemente rompa el build — y
  **no toca créditos a propósito**: el settlement es autoridad de otro dueño y ya decidió. Un `abandon` que
  liberara reserva estaría reabriendo una decisión ajena.

### 🔴 El hallazgo que debe gobernar el cierre de esta task

**Es el mismo bug class en DOS parejas distintas de agregados**, y sólo una estaba declarada:

| Pareja | Síntoma | Estado antes de hoy |
|---|---|---|
| outbox `reconcile` ↔ `governed_runs` | reconciles pendientes de runs terminales, `queueOldestAgeSeconds` inflado | **declarado** en el alcance restante de esta task |
| `experiments` ↔ `governed_runs` | experimento `running` eterno, pieza pagada y fantasma | **no lo declaraba nadie**; arreglado el 2026-08-03 |

Si hay dos, **el arreglo no es por pareja**. El invariante correcto es:

> **Cuando un run llega a terminal, todo agregado que dependa de su estado converge o queda observable.**

Arreglar caso por caso garantiza descubrir el tercero en producción, que es exactamente como apareció éste.

**Propuesta de alcance para quien retome** (requiere decisión del operador antes de ejecutar): ampliar el
alcance restante de *«terminalizar reconciles de runs ya terminales»* a **«convergencia terminal de los
agregados del run»**, con **el barrido como primer paso** — enumerar qué agregados dependen del estado de un
run antes de escribir el siguiente arreglo puntual.

Candidatos a tercera pareja, **no verificados**:

- **reservas de crédito** de un run que murió — ¿el expiry las cubre siempre, o sólo las que nadie tocó?
- **assets en Asset Governance** de un run que murió — quedan en vuelo sin dueño que los reclame.

### Pendientes que este delta NO cierra

1. **Las dos señales existen pero no están cableadas.** `readOutboxHealth` (`packages/database/src/stores/
   governed-run-store.ts:294`) calcula `deadLetter` y `retryStorm` en **cada batch** del worker, y
   `worker-main.ts:267-268` los emite dentro de `globe_worker_completed`. **Ahí se acaban.** Verificado en
   `infra/terraform/`: hay `logging_metric` + `alert_policy` para `queueOldestAgeSeconds` y
   `creditExpiryOldestAgeSeconds`, y **cero ocurrencias de `outbox`** en todo el Terraform. O sea que el
   número se calcula, se imprime y nadie lo mira. Sin ese cableado, la próxima espera larga tampoco avisa —
   que es el punto abierto de `ISSUE-135`.
2. **El nombre `outboxDeadLetter` engaña y es parte de este cierre.** Su SQL es
   `COUNT(*) FILTER (WHERE a.state='failed' AND a.terminal_at IS NOT NULL)` sobre una ventana de 24 h: cuenta
   **attempts que murieron en terminal**, no filas en un estado `dead_letter`. Es una señal correcta con un
   nombre que promete otra cosa; hay que **renombrarla o documentarla en el propio contrato**, porque el día
   que alguien busque la tabla de dead letters no la va a encontrar.
3. **Experimentos huérfanos anteriores al fix.** La última medición da **4** en `running` con run terminal;
   el delta anterior había anotado 6, así que **hay que re-medir antes de barrer** — la diferencia es
   probablemente convergencia posterior, no un error de conteo. `abandon` no los alcanza porque **sólo actúa
   hacia adelante**: cierra runs que mueran de ahora en adelante, no los que ya murieron. Recuperación por
   primitive canónica con audit, **nunca por SQL**.

### Criterios exigibles que agrega este delta

- [ ] El invariante de convergencia terminal está declarado y probado como propiedad del lifecycle, no como
      arreglo de una pareja: un run terminal deja **todo** agregado dependiente convergido u observable.
- [ ] El barrido de agregados dependientes está hecho y su resultado escrito (al menos: outbox `reconcile`,
      `experiments`, reservas de crédito, assets en governance), con veredicto por cada uno.
- [ ] `globe.run.outbox_dead_letter` y `globe.run.outbox_retry_storm` tienen `logging_metric` + `alert_policy`
      en `infra/terraform/`, con steady-state declarado (`0`/`0`).
- [ ] El nombre de la señal de dead letter describe lo que cuenta, o su contrato lo documenta explícitamente.
- [ ] Los experimentos huérfanos previos al fix quedan recuperados por primitive canónica con audit; el conteo
      se re-mide antes y después.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.
- Recuperar los experimentos huérfanos en `running` cuyos runs ya son terminales (anteriores al fix del
  2026-08-03; última medición **4**, medición previa 6 — re-medir), por primitive canónica y nunca por SQL.
- Cablear las dos señales de outbox a métrica + alerta, y resolver el nombre de `outboxDeadLetter`.
