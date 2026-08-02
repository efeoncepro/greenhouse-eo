# TASK-1632 — Globe Provider Completion → Asset Governance Event-Driven Handoff

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `webhook`
- Epic: `EPIC-028`
- Status real: `Diseño corregido contra runtime; implementación pendiente`
- Rank: `next.1`
- Domain: `platform|integration|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Checkpoint de secuencia 2026-08-02 — unidad posterior a Omni

- La task permanece `to-do`: no existen todavía wake outbox/dispatcher, migración, IAM, flags, despliegue ni
  canary event-driven que permitan marcar un slice como implementado.
- El cierre en curso de Gemini Omni bajo `TASK-1504` no implementa esta task. El fix de `auto-promote` ya integrado,
  su deploy de API/Producer worker y el único canary posterior conservan el trigger periódico vigente; no deben
  mezclar un cambio polling-first → event-first en el mismo rollout.
- Esta unidad comienza sólo después del cierre o checkpoint estable de Omni y mantiene su orden:
  `ADR/audit → durable wake → dispatcher/IAM → failure tests → shadow → internal wake → canary → Scheduler safety-net`.
- **Greenhouse queda fuera del data path y del runtime.** Sólo gobierna task, ADR, evidencia y handoff; no recibe
  callbacks, wakes, payloads, estados intermedios ni jobs de Asset Governance. `TASK-1475` conserva cualquier
  integración cross-product futura bajo un contrato separado.
- El primer acto de la próxima sesión es auditar el commit transaccional real de `complete` y el enqueue durable
  de governance; no se elige Cloud Tasks, Pub/Sub, Eventarc ni Jobs API antes de esa evidencia y el ADR.

## Summary

Convertir el callback verificado de Fal en el disparador primario del lifecycle durable de Globe hasta Asset
Governance. La señal del proveedor se valida y deduplica, adelanta el trabajo durable de finalización, el output se
recupera y retiene, y el job de Asset Governance se despierta sin depender del siguiente tick periódico. Cloud
Scheduler permanece como red de reconciliación; Greenhouse no participa de este handoff interno.

## Why This Task Exists

Globe ya recibe el webhook firmado de Fal, conserva raw bytes para verificarlo, normaliza la señal, la deduplica en
`provider_completion_signals` y crea un `complete` durable en `governed_run_outbox`. Después, el Producer worker
recupera y retiene el output y el lifecycle existente encola Asset Governance. Sin embargo, tanto Producer worker
como Asset Governance despiertan principalmente por Scheduler periódico. La señal es durable y transaccional, pero
el wake-up todavía es polling-first: añade latencia y hace que el callback no cierre por sí mismo la cadena.

La solución no es enviar el body de Fal directamente a Asset Governance ni crear un bridge hacia Greenhouse. El
webhook sólo informa que una operación de proveedor cambió; la autoridad sigue en los stores, finalizers y workers
de Globe. La notificación event-driven es una pista recuperable para despertar esos consumidores durables.

## Goal

- Mantener `provider_completion_signals` + `governed_run_outbox` como autoridad durable del callback aceptado.
- Emitir o registrar atómicamente un wake intent idempotente al quedar disponible trabajo inmediato.
- Despertar Producer worker para finalizar/retener el output y Asset Governance cuando exista su job durable.
- Mantener Cloud Scheduler como reconciliación de baja frecuencia y recuperación, no como camino primario.
- Demostrar callback duplicado, perdido, temprano, tardío y wake perdido sin doble run, doble cobro o doble terminal.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md` (ADR-007).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`.

Reglas obligatorias:

- El callback de Fal es provider ingress, no byte authority, rights authority ni evento cross-product.
- La API verifica firma Ed25519/JWKS sobre raw bytes, timestamp, request ID, tamaño y correlación opaca antes de
  persistir o activar cualquier wake.
- La transacción durable manda: una notificación puede duplicarse o perderse; nunca contiene la única copia del
  trabajo ni ejecuta el lifecycle en el request web.
- Semántica `at-least-once` con dedupe estable. No se promete exactly-once.
- El callback persiste señal + checkpoint/outbox antes de responder `202`; el wake ocurre después del commit.
- Un callback temprano se enlaza al attempt precomprometido; uno tardío o duplicado converge sin revivir terminales.
- Finalización, retrieval, private ingest, retention y Asset Governance conservan sus boundaries actuales.
- El evento/wake interno contiene sólo IDs opacos y reason codes; nunca payload Fal, URLs, bytes, prompt, tokens,
  secretos ni raw errors.
- Poll/reconcile continúa disponible para proveedores sin webhook y para recuperar pérdida o caída del wake plane.
- Esta task requiere ADR/addendum para el nuevo trigger cloud, su IAM y el cambio polling-first → event-first.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1469 durable run lifecycle y su outbox ya implementados.
- ADR-007 y el job durable de Asset Governance ya implementados internal-only.
- Relay público estrecho y verificación server-side del callback Fal ya desplegados.

### Blocks / Impacts

- Reduce la latencia callback → output retenido → governance terminal y robustece toda ruta Fal promovida.
- No bloquea ni implementa `TASK-1475`; una proyección futura hacia Greenhouse consume estados canónicos de Globe
  bajo su propio contrato.
- No habilita clientes externos, delivery comercial ni una ruta/modelo adicional.

### Files owned

- `../efeonce-globe/apps/creative-runner/src/provider-webhooks.ts`
- `../efeonce-globe/apps/creative-runner/src/governed-runtime-entry.ts`
- `../efeonce-globe/apps/creative-runner/src/governed-run-worker.ts`
- `../efeonce-globe/apps/studio-web/src/governed-runtime-app.ts`
- `../efeonce-globe/packages/domain/src/governed-run-lifecycle.ts`
- `../efeonce-globe/packages/database/src/stores/governed-run-store.ts`
- `../efeonce-globe/packages/database/src/stores/asset-governance-job-store.ts`
- `../efeonce-globe/infra/terraform/`
- `docs/architecture/creative-studio/`
- `docs/operations/creative-studio/`

## Current Repo State

### Already exists

- `verifyAndNormalizeFalWebhook` verifica el contrato Fal y produce `CompletionSignalV1` sanitizada.
- `recordCompletionSignal` deduplica delivery/event, resuelve correlación incluso en lost-ack, checkpointa
  `completion_received`, supersede reconcile pendiente y encola `complete` dentro de la transacción.
- Producer worker reclama trabajos con lease/fencing, materializa el resultado una sola vez y retiene bytes.
- Generated outputs entran al pipeline durable de Asset Governance antes de quedar elegibles.
- Schedulers minutely/bounded y reconciliación recuperan trabajo aunque el webhook no llegue.

### Gap

- El commit del `complete` no despierta de forma durable/inmediata al Producer worker.
- La creación del job de Asset Governance tampoco despierta de forma inmediata a su worker.
- Scheduler es todavía el trigger primario observable; falta wake deduplicado, retries/DLQ, IAM, métricas y prueba
  callback→terminal sin esperar el tick.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `Globe API + Producer worker + Asset Governance worker`
- Future candidate home: `remain-shared`
- Boundary: `provider ingress normalizado → stores/outbox durables → wake dispatcher → workers existentes`
- Server/browser split: `server-only; el browser no recibe ni emite provider callbacks o wakes`
- Build impact: `migración/IaC/worker aditivos; ningún file: cross-repo`
- Extraction blocker: `transacción PostgreSQL, Cloud Run Job IAM y lifecycle durable permanecen en Globe`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `webhook|async`
- Source of truth afectado: `ninguno nuevo; stores durables de Globe continúan como SSOT`
- Consumidores afectados: `Producer worker y Asset Governance worker`
- Runtime target: `Globe API + Cloud Run Jobs`

### Contract surface

- Contrato existente a respetar: `CompletionSignalV1`, `GovernedRunStorePort`, `AssetGovernanceJobStorePort`.
- Contrato nuevo o modificado: `WorkerWakeIntentV1` o primitive equivalente fijada por ADR, con target, work key,
  causation/correlation, availableAt y schema version.
- Backward compatibility: `aditivo; Scheduler/reconcile continúa como fallback durante rollout y rollback`.
- Full API parity: `reader operativo de wake/lag/recovery; no endpoint creado como click handler`.

### Data model and invariants

- Entidades afectadas: `wake outbox/dispatch receipts` o extensión explícita de un outbox existente; nombres finales
  sólo después del ADR y auditoría de las migraciones reales.
- Invariantes: `trabajo durable antes de wake; wake no autoriza trabajo; un work key activo por consumer; terminal
  no revive; retry no invoca submit; governance no corre antes de private ingest/retention`.
- Tenant boundary: `workspace sólo desde el attempt/job persistido; nunca desde un campo confiado del webhook`.
- Idempotency/concurrency: `unique work key, claim leased/fenced, coalescing de bursts, Cloud Run 409/429/5xx
  clasificados, y no overlap no gobernado`.
- Audit: `wakeId, target, causationId, deliveryAttempt, disposition, timestamps, lag y error code sanitizado`.

### Event and wake payload minimum

- `wakeId`, `schemaVersion`, `target`, `workKey`, `causationId`, `correlationId`, `availableAt`.
- Opcionalmente `workspaceId`, `runId`, `attemptId` o `governanceJobId` sólo para trazabilidad tenant-safe.
- Exclusiones: provider body/headers, response URL, storage handle, prompt, media, credentials y raw errors.
- El consumidor siempre reclama desde PostgreSQL; nunca procesa trabajo basándose sólo en este payload.

### Delivery and failure semantics

- Publicación: wake intent en la misma transacción que vuelve reclamable el trabajo, o relay post-commit apoyado en
  outbox durable; nunca dual write sin recovery.
- Delivery: `at-least-once`, retries acotados con backoff+jitter, coalescing y poison/DLQ observable.
- Wake perdido: Scheduler/reconciler encuentra el trabajo durable y cierra el lag.
- Wake duplicado: el segundo trigger no duplica claim, terminal, retention, governance ni cobro.
- Consumer ocupado: se conserva pending/retry; no se lanza una tormenta de ejecuciones Cloud Run.
- Callback desconocido: se conserva la señal para el lost-ack window y reconciliation; no se inventa un run.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only; event wake OFF y Scheduler actual intacto`
- Backfill: `sólo wakes para trabajo durable reclamable; nunca replay de provider submit ni generación`
- Rollout: `shadow receipts → event wake internal-only → bajar frecuencia del Scheduler → mantener safety net`
- Rollback: `apagar dispatcher/wake, conservar outbox y restaurar Scheduler como trigger primario`
- External coordination: `GCP IAM/API del trigger seleccionado; Fal no requiere cambio de contrato`

### Security and access

- Auth/access: `service accounts dedicadas y permisos mínimos para publicar/ejecutar sólo el target exacto`.
- API/Job boundary: `API no recibe run.jobs.run amplio si un dispatcher dedicado puede reducir blast radius`.
- Sensitive data: `payload allowlisted, logs redacted, ninguna firma/header/body persistido fuera de evidencia mínima`.
- Abuse controls: `body cap, replay window, dedupe, coalescing, rate limit, retry budget y alertas de burst/lag`.

### Runtime evidence

- Local: firma inválida, body grande, early/lost-ack, duplicate, late, wake lost/duplicate, outage y recovery.
- DB: señal + complete + wake atómicos; unique/fencing y terminal monotónico.
- Integration: callback firmado fixture → Producer wake → output retained → governance wake → terminal.
- Reliability: `wake pending/oldest age`, dispatch failures, scheduler recoveries, callback-to-complete latency y
  complete-to-governance latency.
- Production: un canary interno controlado y replay de wake sin provider call ni crédito adicional.

### Acceptance criteria additions

- [ ] Callback aceptado despierta el camino durable sin esperar el siguiente tick periódico.
- [ ] Perder el wake sólo aumenta latencia: Scheduler/reconciler recupera sin pérdida ni doble efecto.
- [ ] Asset Governance nunca procesa body, URL o estado declarativo proveniente directamente de Fal.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — ADR y auditoría del lifecycle existente

- Fijar el trigger cloud, ownership, IAM, coalescing, retries, DLQ, observabilidad y rollback.
- Documentar qué ya resuelven `provider_completion_signals`, `governed_run_outbox` y governance jobs; no crear un
  segundo queue/state machine.

### Slice 1 — Wake durable del Producer worker

- Registrar/emitir el wake al quedar disponible `complete` y despacharlo después del commit.
- Despertar el job con identidad mínima, coalescer bursts y conservar reconcile/Scheduler como safety net.
- Cubrir callback temprano, lost-ack, duplicado, tardío y worker ocupado.

### Slice 2 — Wake durable de Asset Governance

- Despertar Asset Governance sólo después de que private ingest/retention encole su job durable.
- Reclamar desde el store existente, mantener orden malware → C2PA → rights y terminal fenced.
- Evitar que una notificación salte quarantine, rights, lineage o retention.

### Slice 3 — Recovery, observabilidad y cutover internal-only

- Probar pérdida/duplicado/outage, DLQ, replay y recuperación por Scheduler sin provider calls.
- Medir latencias callback→complete y complete→governance, bajar Scheduler a safety-net sólo con SLO verde.
- Ejecutar un canary interno y verificar un run/cobro/output/governance, más replay sin gasto.

## Out of Scope

- Greenhouse, `TASK-1475`, eventos cross-product, portfolio o deep links.
- Reenviar raw webhook o permitir que Fal escriba directamente Asset Governance.
- Cambiar términos, derechos, policy o elegibilidad del output.
- Sustituir PostgreSQL/outbox/leases por una cola cloud como SSOT.
- Habilitar clientes externos, modelos/rutas nuevas o release comercial.
- Crear una pieza adicional sólo para probar replay/recovery.

## Detailed Spec

La ejecución comienza con `pnpm codex:task-hook TASK-1632 --develop`. El ADR debe escoger el trigger después de
comparar Cloud Tasks/Pub/Sub/Eventarc/Jobs API contra el runtime real; no se prescribe un servicio por intuición.
El diseño debe conservar los dos commits de autoridad: provider completion vuelve reclamable `complete`, y el
finalizer/ingest vuelve reclamable Asset Governance. Cada commit produce un wake recuperable, pero cada worker
vuelve a leer y reclamar su trabajo desde PostgreSQL.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`ADR/audit → durable wake → dispatcher/IAM → failure tests → shadow → internal wake → canary → Scheduler safety-net`.
No se reduce Scheduler antes de probar pérdida de wake y reconciliación.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigación | Señal de alerta |
|---|---|---:|---|---|
| Wake antes del commit | API/DB | medium | outbox transaccional + dispatcher post-commit | wake sin trabajo reclamable |
| Tormenta de ejecuciones | cloud trigger | medium | coalescing/work key/rate limit | invocaciones ≫ trabajos |
| Doble terminal/cobro | lifecycle | low | dedupe + lease/fencing + economic key | >1 terminal o charge |
| Webhook salta governance | boundary | low | worker reclama store; no direct handoff | job sin ingest/retention |
| Trigger perdido deja backlog | reliability | medium | Scheduler safety-net + lag alert | oldest pending sobre SLO |
| IAM amplía blast radius | cloud | low | dispatcher/target exacto + deny tests | API puede ejecutar otros jobs |

### Feature flags / cutover

- Wakes se despliegan OFF; outbox/receipts pueden operar en shadow.
- Internal-only permite event wake con Scheduler aún minutely.
- Sólo tras failure tests se baja la frecuencia del Scheduler; nunca se elimina la reconciliación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Wake publisher | apagar publicación; conservar trabajo durable | <15 min | sí |
| Dispatcher/trigger | apagar dispatcher; reanudar Scheduler primario | <15 min | sí |
| Governance wake | apagar wake; job durable queda reclamable | <15 min | sí |
| Cutover | restaurar frecuencia anterior y reconciliar | <30 min | sí |

### Production verification sequence

Contract/migration tests; IaC plan sin replace/destroy; shadow receipts; firma/duplicate/lost-wake tests; internal
wake con Scheduler activo; canary único; replay del wake sin provider call/cobro; reducción controlada del polling.

### Out-of-band coordination required

GCP IAM y APIs del trigger seleccionado. No requiere cambio de Fal ni intervención de Greenhouse.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR/addendum aceptado fija trigger, transacciones, IAM, delivery, coalescing, fallback y SLO.
- [ ] Firma/body/timestamp/correlación inválidos no persisten señal ni producen wake.
- [ ] Callback válido persiste/deduplica señal y vuelve reclamable `complete` antes de responder `202`.
- [ ] Wake primario adelanta Producer worker sin esperar Scheduler y el worker reclama sólo desde el store.
- [ ] Output queda recuperado, content-addressed, retenido y con lineage antes de encolar governance.
- [ ] Governance wake ocurre sólo después de su job durable y conserva malware → C2PA → rights.
- [ ] Duplicado, early/lost-ack, tardío y wake repetido producen un run, un cobro y un terminal.
- [ ] Wake perdido o dispatcher caído se recupera mediante Scheduler/reconcile sin provider call adicional.
- [ ] Payloads/logs/receipts no contienen raw webhook, provider URLs, bytes, prompts, secrets ni raw errors.
- [ ] Métricas prueban SLO de latencia y distinguen event-driven completion de recovery por polling.
- [ ] Rollout queda internal-only; clientes externos continúan fail-closed.

## Verification

- `pnpm codex:task-hook TASK-1632 --develop`
- `pnpm task:lint --task TASK-1632`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Integration smoke callback→complete→retention→governance con duplicate/lost-wake/replay y readback de cobro.

## Closing Protocol

- [ ] Lifecycle/carpeta, registry, README, EPIC-028, arquitectura, runbook, changelog y Handoff sincronizados.
- [ ] Migraciones/IAM/flags/triggers/deploys aplicados o estado `rollout pendiente` honesto.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia conserva delivery/wake/run/attempt/job IDs, hashes, timestamps, lag y charge sin datos sensibles.

## Follow-ups

- `TASK-1475` puede consumir una proyección terminal de Globe en el futuro, pero no consume ni bloquea este wake
  interno y debe diseñar su propio contrato cross-product.
- Generalizar otros provider callbacks sólo si preservan la misma verificación y lifecycle durable.
