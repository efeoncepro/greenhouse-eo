# TASK-1632 — Globe Asset Governance Terminal Event Handoff

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
- Backend impact: `sync`
- Epic: `EPIC-028`
- Status real: `Diseño confirmado; implementación pendiente`
- Rank: `next.1`
- Domain: `platform|integration|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar el handoff event-driven desde el estado terminal canónico de Asset Governance en Globe hacia una
proyección explícita de Greenhouse. El contrato parte de la transacción gobernada de Globe, usa outbox durable,
entrega keyless y consumo idempotente; nunca reenvía el webhook crudo de Fal ni comparte base de datos.

## Why This Task Exists

El runtime ya recibe callbacks de proveedor y Asset Governance ya termina assets en estados durables, pero no
existe un handoff cross-product formal después de ese terminal. Depender de polling/manual readback deja a
Greenhouse sin una señal recuperable y verificable. `TASK-1475` posee la integración amplia de proyecciones,
eventos y deep links, pero está bloqueada por `TASK-1472` y `TASK-1473`; ese bloqueo no debe impedir construir la
foundation terminal que ya tiene un productor y un consumidor definidos.

## Goal

- Publicar una sola versión canónica del evento terminal de Asset Governance desde una transacción local +
  outbox durable en Globe.
- Entregarlo a Greenhouse mediante WIF/ADC, con al menos una entrega, autenticación de workload y datos mínimos.
- Mantener en Greenhouse una proyección idempotente, tenant-safe, observable y recuperable mediante replay.
- Dejar a `TASK-1475` como consumidora de esta foundation para el portfolio amplio y los deep links, sin duplicar
  publisher, consumer ni policy.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md` (ADR-007).
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md` (ADR-006).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`.
- `docs/tasks/to-do/TASK-1475-globe-greenhouse-projections-events-deep-links.md`.

Reglas obligatorias:

- Globe conserva autoridad sobre asset, rights, lineage, retention y governance; Greenhouse almacena sólo una
  proyección explícita y reconstruible.
- El evento nace sólo después de que la transacción de Globe persiste un terminal gobernado; el callback de Fal
  es señal de finalización del proveedor, no un evento empresarial cross-product.
- Publicación = transacción local + outbox durable. Consumo = inbox/dedupe + apply atómico. No dual write.
- Entrega `at-least-once`; no se promete exactly-once. Duplicados, demora, reordenamiento, poison messages y
  caída del consumidor forman parte del contrato.
- Orden por `workspaceId + assetId` y revisión monotónica; una revisión anterior nunca sobrescribe una posterior.
- Replays no invocan proveedores, no crean runs, no gastan créditos y no repiten efectos externos.
- WIF/ADC keyless, audience exacta y binding workspace verificado; nunca secrets, cookies o DB compartidos.
- Payload mínimo: sin bytes/URLs privadas, prompt, body del webhook, credenciales ni raw errors.
- Esta task requiere un ADR/addendum aceptado para el contrato cross-runtime antes de modificar runtime.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Dependencies & Impact

### Depends on

- ADR-007 y su runtime terminal de Asset Governance ya desplegado.
- ADR-001 para federación keyless entre Greenhouse y Globe.
- ADR-006 para resolver el workspace/binding sin aceptar tenancy desde el payload.

### Blocks / Impacts

- Desbloquea la foundation event-driven que `TASK-1475` consumirá para sus proyecciones amplias y deep links.
- No desbloquea por sí sola release, delivery, clientes externos ni el resto de `TASK-1475`.

### Files owned

- `../efeonce-globe/packages/contracts/src/asset-governance.ts`
- `../efeonce-globe/packages/domain/src/asset-governance-jobs.ts`
- `../efeonce-globe/packages/database/src/stores/asset-governance-job-store.ts`
- `../efeonce-globe/packages/database/migrations/`
- `../efeonce-globe/apps/asset-governance/src/`
- `src/lib/sister-platforms/`
- `src/app/api/platform/ecosystem/`
- `docs/architecture/creative-studio/`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Already exists

- Globe persiste jobs, evidence y retention intents de Asset Governance y recupera la proyección terminal.
- El worker aplica leases/fencing, estados `eligible|rejected|failed` y autoridad tenant-safe.
- El creative runner recibe webhooks de proveedor y el output generado entra al lifecycle gobernado.
- Greenhouse y Globe ya usan federación server-side WIF/ADC sin claves persistidas.
- Greenhouse posee API platform versionada y patrones de consumo/proyección bajo `src/lib/sister-platforms/`.

### Gap

- No hay evento empresarial versionado emitido atómicamente al terminal de governance.
- No hay outbox de Asset Governance, delivery con lease/retry/DLQ ni inbox/proyección deduplicada en Greenhouse.
- No existe readback/replay operativo que demuestre continuidad durante una caída del consumidor.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Globe produce el terminal y Greenhouse consume una proyección explícita`
- Future candidate home: `remain-shared`
- Boundary: `contrato versionado; Globe outbox/delivery; Greenhouse inbox/proyección/readback`
- Server/browser split: `handoff completo server-only; browser no firma, entrega ni consume eventos internos`
- Build impact: `migraciones y workers/adapters aditivos en ambos repos; ningún file: cross-repo`
- Extraction blocker: `transacción terminal, auth WIF y binding tenant permanecen en sus runtimes dueños`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync`
- Source of truth afectado: `Globe Asset Governance; Greenhouse sólo proyección reconstruible`
- Consumidores afectados: `Greenhouse platform/integration operators y TASK-1475`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `ADR-007 terminal states + ADR-001 workload federation + ADR-006 binding`
- Contrato nuevo o modificado: `AssetGovernanceTerminalEventV1 y receipt/readback de entrega/proyección`
- Backward compatibility: `additive, schema-versioned, tolerant reader; retiro sólo con ventana declarada`
- Full API parity: `el mismo contrato/readback queda utilizable por operación y agentes; no click handler`

### Data model and invariants

- Entidades/tablas/views afectadas: `outbox Globe append-only; inbox/proyección Greenhouse; nombres finales en ADR`
- Invariantes que no se pueden romper: `un terminal/revisión produce una identidad de evento estable; monotonía
  por asset; apply idempotente; terminal de Globe no depende de disponibilidad Greenhouse`
- Tenant/space boundary: `workspace derivado/verificado en ambos extremos; subject no autoriza por sí mismo`
- Idempotency/concurrency: `eventId persistido; unique constraint; leases fenced; inbox y proyección en una
  transacción; revision compare-and-apply`
- Audit/outbox/history: `correlationId, causationId, eventId, schemaVersion, occurredAt, attempt, receipt,
  outcome y error sanitizado`

### Event payload minimum

- Envelope: `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `source`, `subject`, `correlationId`,
  `causationId`.
- Scope: `workspaceId`, `assetId`, `governanceJobId`, `governanceRevision` y, cuando existan, `runId` y
  `attemptId`.
- Governed projection: terminal `status`, `eligible`, output `sha256`/MIME, rights/policy digests, lineage parent,
  retention/legal-hold posture y timestamps terminales.
- Exclusiones: provider payload, provider URL, prompt, bytes, storage handle, secrets, tokens y raw errors.

### Delivery and failure semantics

- Publicación: append outbox en la misma transacción que hace visible la revisión terminal.
- Delivery: `at-least-once`, retries acotados con backoff+jitter, lease fenced, timeout, circuit breaker y DLQ.
- Consumer: WIF/audience/issuer, envelope estricto, inbox dedupe y proyección atómica.
- Reorder: una revisión menor/igual se reconoce como replay/stale y no muta la proyección.
- Missing: reconciliation/readback compara watermark/outbox/receipt y permite replay sin side effects.
- Poison: cuarentena con reason code sanitizado; nunca bloquea indefinidamente otros assets.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only; delivery OFF hasta completar shadow/readback`
- Backfill plan: `snapshot/replay acotado desde terminales existentes sólo si el ADR lo acepta; sin provider calls`
- Rollback path: `apagar delivery, conservar outbox, reparar consumer y replay; Globe continúa terminando assets`
- External coordination: `GCP IAM/WIF y runtime owners; sin coordinación de Fal para este handoff`

### Security and access

- Auth/access gate: `workload identity allowlisted, audience exacta, capability interna y binding verificado`
- Sensitive data posture: `allowlist de campos; sin media privada o URLs; logs redacted`
- Error contract: `reason codes tipados; raw cloud/DB/provider errors no cruzan frontera`
- Abuse/rate-limit posture: `batch/concurrency limits, retry budget, poison quarantine y alertas por lag`

### Runtime evidence

- Local checks: `contract, migration, duplicate, reorder, stale, poison, auth deny, outage y replay tests`
- DB/runtime checks: `unique/fencing/readback tenant-scoped y transacción outbox-terminal demostrada`
- Integration checks: `shadow interno; duplicate delivery; consumer outage; replay; revoke/rights revision`
- Reliability signals/logs: `outbox lag, oldest pending, delivery attempts, DLQ, inbox duplicates, projection lag`
- Production verification sequence: `ADR -> local -> migrations -> shadow -> failure/replay -> internal live`

### Acceptance criteria additions

- [ ] Consumer caído no impide que Globe alcance y conserve el terminal gobernado.
- [ ] Duplicado/reordenado/replay no muta dos veces ni produce un efecto externo.
- [ ] La proyección Greenhouse se reconstruye sin leer la DB de Globe.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Decisión y contrato

- Crear/aceptar el ADR o addendum que fija ownership, envelope, payload, versioning, ordering, auth, delivery,
  replay, poison handling, retention y deprecation.
- Registrar el evento en el catálogo y publicar fixtures/contract tests sin importar código interno entre repos.

### Slice 1 — Productor durable en Globe

- Persistir outbox en la misma transacción del terminal/revisión de Asset Governance.
- Implementar dispatcher con leases fenced, retry budget, backoff+jitter, DLQ, métricas y receipts.
- Demostrar que callbacks Fal duplicados o tardíos convergen a una sola revisión aplicable.

### Slice 2 — Consumidor y proyección en Greenhouse

- Autenticar la entrega keyless y resolver el binding/workspace desde autoridad verificada.
- Persistir inbox/dedupe y proyección monotónica en una transacción.
- Exponer readback/recovery operator- y agent-usable sin filtrar media ni ampliar permisos.

### Slice 3 — Recovery y rollout internal-only

- Ejecutar shadow, fallas inyectadas, duplicate/reorder/poison y caída temporal del consumidor.
- Reconciliar watermark/outbox/receipts/proyección y ejecutar replay sin provider calls ni créditos.
- Habilitar sólo el workspace interno después de que señales y runbook queden verdes.

## Out of Scope

- Reabrir o extender `TASK-1614`.
- Reenviar el webhook crudo de Fal a Greenhouse o tratarlo como evento empresarial.
- Portafolio amplio, deep links, release/delivery y UI de `TASK-1475`.
- Habilitar clientes externos, compartir DB/storage/sesión/secretos o duplicar policy de Globe en Greenhouse.
- Cambiar el lifecycle del proveedor, volver a generar assets o gastar créditos durante replay/backfill.

## Detailed Spec

La ejecución comienza con `pnpm codex:task-hook TASK-1632 --develop`. Los nombres físicos del schema se fijan en
Slice 0 tras auditar stores/migraciones reales; esta task no autoriza una segunda fuente de verdad. Globe emite
sólo después del terminal ADR-007. Greenhouse confirma recepción con receipt durable y deriva una proyección;
cualquier workflow posterior requiere su task dueña, especialmente `TASK-1475`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

`ADR/contract -> migrations -> duplicate/reorder tests -> shadow -> failure/replay -> internal live -> enable`.
Ningún delivery live precede la atomicidad terminal+outbox ni la deduplicación del consumidor.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Evento perdido por dual write | Globe | medium | terminal + outbox en una transacción | terminal sin outbox/receipt |
| Duplicado/reordenamiento regresa estado | Greenhouse | medium | inbox unique + revisión monotónica | revisión disminuye |
| Consumer outage bloquea governance | ambos | low | entrega desacoplada y retries bounded | latencia terminal sube con outage |
| Fuga de media/datos sensibles | contrato/logs | low | allowlist y negative tests | campo no permitido |
| Poison detiene la cola | dispatcher | medium | quarantine/DLQ por asset | oldest pending crece sin aislamiento |
| Replay produce gasto/side effect | ambos | low | consumer projection-only + tests | provider call/run/charge en replay |

### Feature flags / cutover

- Publisher/outbox puede desplegarse primero con dispatcher OFF.
- Dispatcher y consumer comienzan en shadow/internal-only con allowlist del workspace interno.
- Externos permanecen OFF y dependen de `TASK-1480`/`TASK-1475` y gates comerciales aplicables.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| ADR/contract | nueva revisión aditiva; no reescribir eventos emitidos | <30 min | sí |
| Globe publisher | apagar dispatcher y conservar outbox | <15 min | sí |
| Greenhouse consumer | apagar ingest, conservar inbox y reparar/replay | <15 min | sí |
| Internal enable | retirar allowlist, reconciliar y replay tras corrección | <30 min | sí |

### Production verification sequence

Local contract/migration tests; sandbox/shadow; WIF allow/deny; outage+duplicate+reorder+poison; replay; readback
cross-runtime; internal-only live; observación de lag/receipts; promoción explícita.

### Out-of-band coordination required

IAM/WIF y deploy owners de ambos runtimes. Fal no participa del contrato cross-product y no requiere cambios.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR/addendum aceptado fija source of truth, schema, auth, delivery, ordering, replay y deprecation.
- [ ] Un terminal/revisión persiste una identidad de evento aplicable junto al cambio local; retries pueden
      entregar más de una vez sin duplicar mutación.
- [ ] Greenhouse rechaza issuer/audience/binding/schema inválidos antes de persistir la proyección.
- [ ] Duplicado, demora, reordenamiento y replay conservan la revisión más nueva y un solo apply efectivo.
- [ ] Caída del consumidor no bloquea terminalización en Globe; al volver, replay/reconciliation cierra el lag.
- [ ] Poison messages quedan en cuarentena y no bloquean otros assets.
- [ ] Payload, logs y receipts no contienen bytes, URLs privadas, prompts, storage handles, credentials ni raw
      errors.
- [ ] Replay/backfill no invoca Fal/Vertex, no crea runs y no gasta créditos.
- [ ] `TASK-1475` consume esta foundation y no crea un segundo publisher/consumer.
- [ ] Rollout queda internal-only; clientes externos continúan fail-closed.

## Verification

- `pnpm codex:task-hook TASK-1632 --develop`
- `pnpm task:lint --task TASK-1632`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- `cd ../efeonce-globe && pnpm check && pnpm build`
- Contract/integration smoke cross-runtime con duplicate/reorder/outage/replay y readback de lag cero.

## Closing Protocol

- [ ] Lifecycle/carpeta, registry, README, EPIC-028, execution plan, event catalog, changelog y Handoff sincronizados.
- [ ] Migraciones y despliegues aplicados con readback o estado `rollout pendiente` honesto.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia conserva event IDs, revisions, outbox/inbox receipts, timestamps y métricas sin datos sensibles.

## Follow-ups

- `TASK-1475` construye el portfolio amplio y deep links reutilizando este handoff.
- Cualquier evento adicional o automatización downstream requiere owner/task explícita.
