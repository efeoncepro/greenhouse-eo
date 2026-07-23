# TASK-1467 — Globe Asset Provenance, Rights and Private Ingest

## Delta 2026-07-20

Cerrado por TASK-1490 (cross-model edit/refine), que cambió dos supuestos de esta task:

- **Los outputs del proveedor ahora SÍ se persisten.** Antes se hasheaban y se descartaban; hoy
  `OutputIngestPort`/`GcsOutputIngest` los escriben content-addressed en
  `efeonce-globe-lab-evidence`, y `ExperimentAttemptManifestV1.outputsRetained` lo declara. O sea:
  **ya hay bytes acumulándose sin política de retención ni lifecycle** — eso es de esta task, y pasa
  de hipotético a real.
- **Existe una postura de derechos para derivados**: `derived-internal` (que un caller no puede
  declarar) más `LabEditSourceV1.parentRights`, calculado como la postura más restrictiva sobre los
  inputs del padre — de modo que un input `licensed` sigue restringiendo a sus descendientes. Esta
  task debe absorber esa cadena en el modelo completo de provenance, no reinventarla.
- **El lineage de un candidato editado ya encadena al padre** (`lineage` en el manifest), que era el
  requisito que esta task declaraba sobre TASK-1490.

Follow-up concreto heredado: la runtime SA necesita `storage.objectCreator` sobre ese bucket
(el canary corrió con ADC humana), y falta la política de retención/lifecycle de lo retenido.

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
- Status real: `Worker y storage/IAM operativos internal-only; ingest/rights authority y canary positivo bloqueados`
- Rank: `TBD`
- Domain: `creative|legal|storage`
- Blocked by: `none`
- Branch: `task/TASK-1467-globe-asset-provenance-rights-private-ingest`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear ingest privado, asset lineage, licencias, consentimientos, retención y policy checks para referencias, inputs y outputs.

## Checkpoint 2026-07-23 — worker de governance operativo; capability aún cerrada

- El Job `globe-asset-governance` quedó provisionado con imagen inmutable
  `sha256:2860c6ff691613e48ab9b328334deb965c2e3b60e3c1b348f4c24804d8d5d32c`, SA dedicada,
  Cloud SQL keyless, storage mínimo, alertas y scheduler ausente por diseño.
- La ejecución manual `globe-asset-governance-vvshv` terminó verde y reportó una cola vacía; ClamAV actualizó
  firmas en el volumen escribible del Job. El intento previo falló cerrado y originó la corrección del argumento
  `--datadir`, cubierta por tests.
- `GLOBE_ASSET_PROVENANCE_ENABLED=false` permanece gobernado en ambos servicios. Falta una autoridad privada
  real para la evidencia inicial de rights; el worker asíncrono no sustituye ese gate request-path.
- No se fabricó un asset ni se habilitó Style DNA: provenance sigue vacío y el canary positivo permanece
  operativamente bloqueado. Clientes externos y Production siguen fuera de alcance.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Impedir que una campaña avance sin autoridad y trazabilidad suficientes sobre sus assets.

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

- `TASK-1464`, `TASK-1465`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/database/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/apps/creative-runner/`

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
- Boundary: `Globe Asset Provenance, Rights and Private Ingest`
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
- Contrato nuevo o modificado: `request/complete ingest, record rights/consent and signed-download commands; list/get asset readers`
- Backward compatibility: `gated`
- Full API parity: `UI/SDK/MCP/runner use asset commands/readers; storage URLs and provider ingest remain server-only adapters`

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

### Approved Producer target addendum — private upload, integrity and provenance

This task is the backend owner for every Producer reference/input/output that enters Globe storage. Its
implementation MUST expose governed, transport-neutral commands/readers for upload initiation, completion and
status; browser code never writes directly to a bucket and never asserts an authoritative hash, rights status or
provenance claim.

- Upload completion verifies server-observed size, media type and content hash, then records quarantine/scan state
  before an asset can become eligible for routing or generation. A client-declared MIME type or digest is evidence
  to compare, not authority.
- Rights and consent use explicit durable states such as pending, verified and rejected. Derived/generated assets
  inherit the applicable restrictions and lineage; neither `internal` nor `derived` is a rights bypass.
- References and outputs retain a content-addressed provenance chain, actor/workspace scope, source relationship,
  retention class and lifecycle state. Reads and signed access are scoped, short-lived and auditable.
- A C2PA/content-credentials badge or claim is emitted only when Globe holds verifiable signed evidence. Missing,
  failed or unsupported evidence returns an honest unavailable/unverified state; it is never inferred from an
  output being generated by Globe.
- Reuse the governed serving/retrieval contract from `TASK-1503`; this task owns ingest, integrity, rights and
  provenance, not a second asset-serving endpoint.
- Storage IAM, encryption, lifecycle and negative cross-workspace tests are rollout gates. Raw object keys,
  provider URLs, scan errors and credentials never cross the public contract.

Additional acceptance evidence:

- [ ] Upload initiate/complete/status paths are idempotent and prove hash/MIME/size verification plus quarantine.
- [ ] Pending/rejected rights fail closed before provider submission and cannot be promoted by untrusted payload.
- [ ] Output and reference provenance can be read through the canonical reader without exposing private object
      coordinates.
- [ ] C2PA rendering is backed by signed verification evidence, with explicit unsupported and failed states.

### Slice 1

- Definir asset, lineage, license y consent contracts.

### Slice 2

- Implementar signed ingest/download tenant-scoped y malware/type checks.

### Slice 3

- Aplicar rights gates a run, review y release.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1467 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Uso o entrega de asset no autorizado | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | asset sin rights verdict |
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

- [ ] Cada asset tiene owner, source, digest, rights y retention.
- [ ] URLs firmadas expiran y nunca sustituyen autorización.
- [ ] Release falla cerrado ante rights/consent insuficientes.
- [ ] API/SDK/conformance prueban ingest, rights/consent, scoped read/download y cross-tenant denial sin
      exponer bucket/provider primitives a consumers.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1467`
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

## Delta 2026-07-22 — gate en vivo del composer del Producer (TASK-1505)

Verificado contra el runtime desplegado: `GLOBE_ASSET_PROVENANCE_ENABLED=false` en **ambos** servicios
(`globe-api-internal` / `globe-studio-internal`). El handler de ingest binario devuelve `policy_blocked`
en su **primera línea**, antes de autenticar (`apps/studio-web/src/app.ts:1143`), y `main.ts:173` no
cablea `privateAssetStorage`/scanner/c2pa/rights con el flag apagado. Consecuencia sobre la superficie
aprobada de **TASK-1505**: mueren **6 de los 9 modos** del composer que dependen de referencias —imagen
con referencias, video Elementos/Cuadros/Movimiento, audio Cambiar voz/Traducir—. Agravante de honestidad
que hereda TASK-1505: esos botones **se pintan habilitados** porque su gate es `globe.lab.experiment.prepare`
(`coverage.ui='available'`), no la capability de ingest. Prender esta task (flag + storage/scanner/rights +
buckets/IAM/secrets + canary) es prerrequisito de que esos modos funcionen; hasta entonces TASK-1505 debe
mostrarlos como gated, no enabled.
