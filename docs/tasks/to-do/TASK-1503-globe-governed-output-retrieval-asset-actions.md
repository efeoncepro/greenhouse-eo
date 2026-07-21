# TASK-1503 — Governed Output Retrieval + Asset Actions

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1490`
- Branch: `task/TASK-1503-globe-governed-output-retrieval-asset-actions`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El "output side" del Creative Producer: el lado que hace **usable** una pieza ya generada.
Sobre el store content-addressed que dejó TASK-1490 (`output-ingest.ts` / `GcsOutputIngest`,
retención por `sha256`, `outputsRetained`), esta task agrega (1) un **reader gobernado** que
resuelve `hash → bytes servible` para **download/preview** y (2) **acciones de asset**
(`favorite`, `copy-as-reference`). El reader es **tenant-safe por construcción**: un output de
otro workspace es `not_found` (nunca revela existencia); un hash que solo es **referencia de
entrada** (private-ingest) **nunca** se sirve. Los commands/readers nacen con Full API Parity
(transport-neutral + coverage), `ui`/`mcp` `policy-blocked` hasta el gate de TASK-1505. Cero
gasto de crédito: retrieval y asset actions no corren providers.

## Why This Task Exists

TASK-1490 cerró el lado de **escritura** del store content-addressed: los outputs de un run se
persisten bajo su `sha256` para que un candidato pueda **refinarse por referencia**
(`outputsRetained`). Pero hoy **no existe camino gobernado de lectura**: el `sha256` de un
candidato resuelve a bytes solo **server-internal**, dentro del `LabRunner`, detrás del spend
fence — para alimentar al provider en un edit. No hay forma de que un consumidor
(Producer Surface TASK-1505, Workbench TASK-1474, SDK/MCP/CLI) **descargue o previsualice** la
pieza. Lo único que `apps/studio-web` sirve por HTTP hoy son los assets de **marca** estáticos
(`readPublicAsset` en `assets.ts`: wordmark, fuentes) — nada de outputs de runs, y sin ninguna
autorización por workspace.

Servir bytes desde un store content-addressed es una superficie **de seguridad**, no una
conveniencia: el bucket es **tenant-blind** (el nombre del objeto ES el hash, un solo bucket para
todos los workspaces, y **contiene tanto bytes de output como bytes de referencias de entrada**
private-ingest). Un "servir cualquier hash del bucket" naïf **filtraría** (a) outputs de otro
workspace y (b) bytes crudos de referencias de entrada — violando dos invariantes duros de la
spec fuente a la vez. La tenant-safety y la protección private-ingest **no** pueden venir del
store (es content-addressed, sin partición por tenant): tienen que venir del **dominio**, que
gobierna el retrieval contra el conjunto de **output-hashes que el workspace del caller realmente
posee**. Esa es la pieza que falta, y es la razón de ser de esta task.

Además, la spec fuente lista dos acciones de asset del chassis (#7 retrieval, #11 reference
assets) que el feed necesita: `favorite` (marcar un candidato en "My Generations") y
`copy-as-reference` (reusar un output propio como referencia de un run nuevo, **sin exponer
bytes**: cruza como `hash + rights`, con la postura `derived-internal` heredada de TASK-1490).

## Goal

- Un **reader gobernado** `globe.producer.output.get` que, dado `{ experimentId, sha256 }`,
  autoriza contra los **outputs retenidos del experimento que el workspace del caller posee** y
  devuelve un **descriptor servible** (`ProducerOutputHandleV1`: mediaType, mimeType, disposition,
  y un **grant efímero server-minted**) — **nunca bytes en el JSON**. Cross-workspace, hash
  desconocido, hash que solo es entrada, o `outputsRetained:false` ⇒ `not_found`.
- Una **ruta de transporte** `GET /v1/outputs/:sha256` en `studio-web` que **redime el grant**,
  re-verifica autoridad (defense in depth), lee los bytes del store content-addressed
  (integrity-verified) y los **streamea** con `Content-Type` + `Content-Disposition`
  (inline=preview / attachment=download), degradando honestamente a `dependency_unavailable` si el
  storage falla — nunca un `200` con cuerpo vacío o bytes equivocados.
- **Asset actions** como commands gobernados: `globe.producer.asset.favorite` (estado deseado
  explícito, idempotente) y `globe.producer.asset.copyAsReference` (certifica un output propio
  como `ProducerReferenceHandleV1` con `rights: 'derived-internal'` + `parentRights` heredados —
  cero bytes por la API, cero gasto), más un reader `globe.producer.asset.list` para pintar el
  feed. Consumidas por TASK-1501/1504 (referencias de un run nuevo) y TASK-1505 (feed).
- Full API Parity por nacimiento: capability nueva `globe.producer.assets.operate` (no confiere
  gasto), coverage matrix completa (`ui`/`mcp` `policy-blocked` hasta el gate de TASK-1505),
  kill switch propio fail-closed, y conformance harness ejercitándola.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — la spec
  fuente del Producer (chassis, contrato discriminado, matriz de capabilities, boundary, hard
  rules). Esta task implementa la fila **N4 (TASK-1503)** de la tabla "primitivos → tasks".
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — el spine
  (Full API Parity, trusted context, coverage matrix, dispatch transport-neutral).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` — el Model Lab (ports +
  inyección, spend fence, private-ingest, kill switch, state machine) — patrón a copiar.
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` — la retención de
  outputs (`OutputIngestPort`/`GcsOutputIngest`, `outputsRetained`, `derived-internal`).
- Skill `.claude/skills/greenhouse-globe/SKILL.md` — contrato de arquitectura de Globe.

Reglas obligatorias (boundary + invariantes, repetidas porque son load-bearing):

- **Boundary DURO Globe↔Greenhouse.** El **código** vive en el repo hermano `efeonce-globe`
  (`packages/contracts`, `packages/domain`, `apps/creative-runner`, `apps/studio-web`).
  **Greenhouse gobierna** lifecycle, dependencias, docs, QA y cierre. **NUNCA** compartas DB,
  sesión/cookie, bucket, secreto de provider, SA key ni rol admin entre plataformas. El registry
  de `TASK-###` es **solo** de Greenhouse; Globe no crea un segundo namespace.
- **Retrieval tenant-safe (invariante de la spec fuente).** El download/preview resuelve
  `hash → bytes` **solo dentro del workspace del caller**; un asset de otro workspace es
  `not_found`, **nunca revela existencia**. La autoridad **no** viene del store (content-addressed,
  tenant-blind): viene del dominio gateando contra el conjunto de **output-hashes que el workspace
  posee** en sus experimentos.
- **Private-ingest para toda referencia.** El retrieval **NUNCA** sirve bytes crudos de una
  **referencia de entrada** (`authorizedInputHashes`): solo sirve **outputs retenidos**
  (`outputHashes` de un attempt `candidate_ready` con `outputsRetained === true`). Una referencia
  cruza siempre como `hash + rights`, jamás como bytes por la API.
- **Naming dual / sin exponer confidencial.** El descriptor y el filename de descarga **nunca**
  exponen slug de proveedor, costo vendor ni margen. mediaType/mimeType/`sha256` sí (no son
  vendor). El slug del proveedor vive solo en el adapter.
- **La unidad de crédito es `ruta × output-shape`, nunca el modelo.** Retrieval y asset actions
  son **read/annotation de gasto cero**: no corren providers, no reservan crédito. `copy-as-reference`
  **no** ejecuta un run; el eventual run que consume la referencia lo tarifa TASK-1502 por
  `ruta × shape`.
- **Multi-output explícito.** Un run omni emite `{video, audio}`; el manifest declara cada output
  con su `sha256` (`outputHashes`). El retrieval **direcciona un output a la vez** por su hash y
  **enumera todos** los outputs retenidos; **ningún output se descarta silenciosamente** (regla
  heredada de TASK-1490).
- **Full API Parity + provider seam.** La capability nace transport-neutral (command/reader +
  coverage). El retrieval **no** toca un SDK de provider (no hay provider en juego); lee del store
  content-addressed keyless (ADC/WIF) — el mismo bucket que TASK-1490. `ui`/`mcp` nacen
  `policy-blocked`.
- **Fail-closed + honest degradation.** Kill switch apagado ⇒ `policy_blocked`. Store caído ⇒
  el descriptor sigue existiendo (el candidato existe por su hash), pero el serving degrada a
  `dependency_unavailable` (retryable) — **nunca** un `200` con bytes vacíos/equivocados. Integridad
  re-verificada (`sha256(bytes) === declarado`) antes de servir.

## Normative Docs

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` — el programa.
- `efeonce-globe/apps/creative-runner/src/output-ingest.ts` y `input-resolver.ts` — el store
  content-addressed (write half + read half server-internal). El retrieval es su **espejo de
  lectura servible** (nuevo, gobernado, no server-internal).
- `efeonce-globe/packages/contracts/src/index.ts` — `ExperimentAttemptManifestV1`
  (`outputHashes`, `outputsRetained`, `authorizedInputHashes`, `workspaceId`, `capability`,
  `outcome`), `LabResolvableInputV1`, `LabInputRights`, `LabDerivedRights` (`derived-internal`),
  `ReaderResultV1`/`CommandResultV1`, `GLOBE_CAPABILITIES`, `GlobeApiErrorCode`,
  `GlobeSurface`/`SurfaceCoverageState`.
- `efeonce-globe/packages/domain/src/model-lab.ts` — `ExperimentStorePort`, `StoredExperimentV1`,
  el patrón de scoped-read (`store.get(workspaceId, experimentId)` → `DispatchError('capability_not_found')`),
  `registerModelLabCapabilities`, `LAB_COVERAGE`, `InvalidExperimentRequestError`.
- `efeonce-globe/apps/studio-web/src/app.ts` — el `handle` HTTP (`/v1/commands`, `/v1/readers`,
  `/v1/capabilities`), `resolveDispatchPrincipal`, `buildOutputIngest`/`buildInputResolver`
  (bucket = `config.labInputBucket` / env `GLOBE_LAB_INPUT_BUCKET`; token = `createAdcAccessTokenProvider()`),
  `readPublicAsset`, `spineOutcomeToResponse`, `json`.

## Dependencies & Impact

### Depends on

- **`TASK-1490`** (`complete`) — el store content-addressed de outputs: `OutputIngestPort` /
  `GcsOutputIngest`, `outputsRetained`, `ExperimentAttemptManifestV1.outputHashes`, la postura
  `derived-internal`. **Blocker duro**: sin retención, un hash no resuelve a bytes.
- `TASK-1481` (`complete`) — el API Contract Spine (registry, trusted context, coverage, dispatch).
- `TASK-1457` (`complete`) — el Model Lab: `ExperimentStorePort` workspace-scoped (fuente de
  autorización del retrieval), kill switch, patrón ports+inyección.
- Infra keyless viva (`TASK-1464`): bucket privado content-addressed + runtime SA con acceso de
  lectura ADC/WIF. El retrieval **reusa** ese acceso, no crea infra.

### Blocks / Impacts

- **`TASK-1505`** (Producer Surface UI) — consume el reader de retrieval (preview/download del
  feed), `favorite` (el ⭐ de "My Generations") y `copy-as-reference` (arrastrar un candidato al
  prompt bar como referencia). El gate de TASK-1505 **flipa** `ui` de `policy-blocked` a
  `available` y el broker grantea `globe.producer.assets.operate` a humanos web.
- **`TASK-1474`** (Professional Studio Workbench) — mismo retrieval + asset actions para delivery
  y dock de candidatos.
- **`TASK-1501`** (Modality-Discriminated Run Contract) — consume `ProducerReferenceHandleV1` en
  el campo `references[]`/`authorizedInputs` del run discriminado (delta declarada abajo; la
  aceptación de una referencia `derived-internal` en `prepare` es contrato de TASK-1501).
- **`TASK-1504`** (Producer Capability Expansion) — igual, para inputs de frames/motion/change-voice.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` — tipos + ids de capability/command/reader
  del retrieval y asset actions.
- `../efeonce-globe/packages/domain/src/producer-assets.ts` — **nuevo**: readers/commands, ports
  (`AssetAnnotationStorePort`, `RetrievalGrantSignerPort`), helper de autorización, store
  in-memory default, `registerProducerAssetCapabilities`.
- `../efeonce-globe/packages/domain/src/index.ts` — re-export del módulo nuevo.
- `../efeonce-globe/apps/creative-runner/src/output-retrieval.ts` — **nuevo**: `OutputRetrievalPort`
  + `GcsOutputRetrieval` (lectura servible, integrity-verified) + `OutputRetrievalError`.
- `../efeonce-globe/apps/creative-runner/src/index.ts` — re-export.
- `../efeonce-globe/apps/studio-web/src/app.ts` — wiring: registrar las capabilities, la ruta
  `GET /v1/outputs/:sha256`, el grant signer (env `GLOBE_PRODUCER_GRANT_SECRET`), el kill switch
  (env `GLOBE_PRODUCER_ASSETS_ENABLED`).
- `../efeonce-globe/apps/studio-web/src/dispatch.ts` — mapeo de error de dominio nuevo a API code
  si aplica `[verificar handlerErrorToApiCode]`.
- Tests: `producer-assets.test.ts` (domain), `output-retrieval.test.ts` (nota live-only),
  `app.test.ts` (ruta de serving).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — §delta
  retrieval + asset actions.
- `docs/documentation/creative-studio/**` + `docs/manual-de-uso/creative-studio/**` — capa
  funcional + manual proporcional.
- `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md`, `Handoff.md`, `changelog.md`.

## Current Repo State

### Already exists

- **Store content-addressed (TASK-1490).** `apps/creative-runner/src/output-ingest.ts`
  (`OutputIngestPort`/`GcsOutputIngest`) escribe outputs bajo su `sha256` en el bucket
  `config.labInputBucket`; `input-resolver.ts` (`GcsInputResolver`) lo lee **server-internal**
  (integrity-verified) para alimentar al provider en un edit. `ExperimentAttemptManifestV1` declara
  `outputHashes` + `outputsRetained`. El wiring vive en `app.ts` (`buildOutputIngest`/`buildInputResolver`).
- **Experiment store workspace-scoped.** `ExperimentStorePort.get(workspaceId, experimentId)`
  (`InMemoryExperimentStore`, TASK-1465 lo reemplaza) — la fuente de verdad de qué outputs posee
  un workspace, con el patrón `capability_not_found` para id cross-workspace/desconocido.
- **Spine + dispatch.** `CapabilityRegistry`, `deriveTrustedContext`, `dispatchCommandRequest`/
  `dispatchReaderRequest`, `resolveDispatchPrincipal`, coverage matrix; `LAB_COVERAGE` como
  plantilla (`ui`/`mcp` `policy-blocked`).
- **Serving HTTP mínimo.** `readPublicAsset` (`assets.ts`) sirve solo assets de **marca**
  estáticos, sin autorización ni tenancy — **no** es un camino de retrieval de outputs.

### Gap

- **No hay reader que resuelva `hash → bytes servible`.** El único camino hash→bytes es
  server-internal, dentro del runner, detrás del spend fence — inservible para download/preview.
- **No hay ruta de transporte que streamee outputs** por workspace, con autorización + disposition.
- **No hay asset actions** (`favorite`, `copy-as-reference`) ni store de anotaciones.
- **No hay capability** para el "output side" del Producer; sin ella el feed de TASK-1505 no tiene
  contrato gobernado que consumir.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/domain`, `apps/creative-runner`,
  `apps/studio-web`); gobernanza en `greenhouse-eo`.
- Future candidate home: `remain-shared`
- Boundary: los primitivos gobernados `globe.producer.output.get`, `globe.producer.asset.list`,
  `globe.producer.asset.favorite`, `globe.producer.asset.copyAsReference` (dominio) + el seam
  `OutputRetrievalPort` (runner) + la ruta de serving `GET /v1/outputs/:sha256` (studio-web).
  Consumidores autorizados: Producer Surface (TASK-1505), Workbench (TASK-1474), SDK/MCP/CLI, y
  TASK-1501/1504 para las referencias `derived-internal`.
- Server/browser split: store GCS, `RetrievalGrantSignerPort` (clave HMAC), `ExperimentStorePort`
  y `AssetAnnotationStorePort` son **server-only**; el browser recibe solo el **descriptor** +
  **grant** + **bytes streameados**, nunca el bucket, la clave de firma ni registros de otro
  workspace.
- Server/browser split: `n/a` (no hay componente browser en este task; TASK-1505 lo consume).
- Build impact: `none` — reusa el acceso GCS keyless (ADC/WIF) y `sha256` de `@efeonce-globe/media-qc`
  ya presentes; sin dependencia pesada ni filesystem input nuevo.
- Extraction blocker: comparte el **bucket content-addressed** y el **experiment store** con el
  Model Lab (el retrieval autoriza contra los mismos registros workspace-scoped); auth vía trusted
  context del spine — no puede desplegarse independiente del store + spine.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader` (+ `command` para asset actions; + una ruta de serving en el transporte)
- Source of truth afectado: `ExperimentAttemptManifestV1.outputHashes`/`outputsRetained`
  (autoridad de qué es servible) + el bucket content-addressed (`config.labInputBucket`) + el
  nuevo `AssetAnnotationStorePort` (favorites + referencias).
- Consumidores afectados: `UI` (TASK-1505), `API/SDK/MCP/CLI` (parity), `worker` (Workbench),
  TASK-1501/1504 (referencias).
- Runtime target: `worker`/`external` (Cloud Run `studio-web`, lectura GCS keyless); default OFF.

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/index.ts` (envelopes `ReaderResultV1`/
  `CommandResultV1`, `GlobeApiErrorCode`, coverage matrix), `ExperimentStorePort`
  (`model-lab.ts`), el patrón `readPublicAsset` (serving HTTP) — **sin** heredar su ausencia de auth.
- Contrato nuevo o modificado:
  - Reader `globe.producer.output.get` → `ProducerOutputHandleV1` (descriptor + grant, **sin bytes**).
  - Reader `globe.producer.asset.list` → `AssetAnnotationsDataV1` (favorites + referencias del workspace).
  - Command `globe.producer.asset.favorite` (estado deseado explícito, idempotente).
  - Command `globe.producer.asset.copyAsReference` → `ProducerReferenceHandleV1`.
  - Capability nueva `globe.producer.assets.operate` (autoridad read/annotation, **sin** gasto)
    en `GLOBE_CAPABILITIES`.
  - Ruta de transporte `GET /v1/outputs/:sha256` (redime grant → streamea bytes). **No** es un
    reader-JSON: los bytes **nunca** viajan en un `ReaderResultV1`.
- Backward compatibility: `compatible` (aditivo; ningún contrato existente cambia de forma).
- Full API parity: la regla de negocio (autorización tenant-safe, private-ingest, disposition,
  grant, favorite, copy-as-reference) vive en `packages/domain` (readers/commands + helper de
  autorización compartido); la UI/SDK/MCP/CLI son clientes del **mismo** primitivo. La ruta de
  serving es un transporte **fino** que reusa el **mismo** helper de autorización que el reader —
  no reimplementa la política (un primitivo, dos transportes).

### Data model and invariants

- Entidades/tablas/views afectadas: (lectura) `ExperimentStorePort` — `StoredExperimentV1.view.attempts`
  (`outputHashes`, `outputsRetained`, `outcome`, `capability`, `authorizedInputHashes`); (write)
  `AssetAnnotationStorePort` — favorites + referencias, **workspace-scoped**, in-memory default
  (TASK-1465 lo persiste). El bucket content-addressed es **read-only** aquí.
- Invariantes que no se pueden romper:
  - **Tenant-safe:** el retrieval autoriza SOLO contra experimentos `store.get(workspaceId, …)`
    del caller; cross-workspace/desconocido ⇒ `capability_not_found` → `not_found`. Nunca revela
    existencia fuera del scope.
  - **Private-ingest:** el retrieval matchea `sha256` **solo** contra `outputHashes` de attempts
    `candidate_ready` con `outputsRetained === true`. **NUNCA** matchea `authorizedInputHashes`
    (bytes de referencia de entrada) — aunque el mismo hash exista en el bucket. El store es
    tenant-blind; la puerta es el dominio.
  - **Integridad:** el serving re-verifica `sha256(bytes) === declarado` antes de emitir; drift/
    tamper ⇒ `dependency_unavailable`, jamás bytes equivocados bajo un hash.
  - **Multi-output:** cada `outputHash` de un run se direcciona por separado; ninguno se descarta.
  - **`derived-internal` inforjable:** `copy-as-reference` produce `rights: 'derived-internal'`
    (un caller no puede declararlo) + `parentRights` (más restrictivo sobre los inputs del padre);
    un ancestro `licensed` sigue restringiendo. Nunca blanquear a `internal-owned`.
  - **Grant hygiene:** el grant es opaco, server-minted, HMAC-firmado, bound a
    `(workspaceId, experimentId, sha256, disposition)`, TTL corto; **nunca** contiene bytes, una
    signed GCS URL, un secreto ni costo vendor. No se loggea (ni siquiera en query).
  - **Gasto cero:** ningún path reserva crédito ni corre un provider.
- Tenant/space boundary: `workspaceId` deriva **server-side** de `deriveTrustedContext`
  (branded, no del payload). El grant lleva el `workspaceId`; la redención re-valida que el
  principal esté bindeado a ese workspace (defense in depth).
- Idempotency/concurrency: readers idempotentes (read-only). `favorite` idempotente por estado
  deseado explícito (`favorite:true` dos veces = una). `copyAsReference` determinístico/idempotente
  por `(workspaceId, sourceExperimentId, sourceAttemptId, sha256)`. Grant verify sin estado
  compartido (stateless HMAC + expiry).
- Audit/outbox/history: `correlationId` atraviesa reader → grant → redención → serving (cadena
  causal). Anotaciones mutables (no manifest inmutable). Sin outbox (interno, sin side-effects
  downstream); registrar denials de autorización/redención con el `correlationId`.

### Migration, backfill and rollout

- Migration posture: `none` (in-memory annotation store default; TASK-1465 aporta persistencia).
- Default state: `flag OFF` — kill switch `GLOBE_PRODUCER_ASSETS_ENABLED` default OFF; `ui`/`mcp`
  `policy-blocked`.
- Backfill plan: `none` — aditivo; los outputs ya retenidos por TASK-1490 son servibles de una.
- Rollback path: `flag off` (kill switch → `policy_blocked`) + revert PR. Sin estado durable que
  revertir.
- External coordination: dos env vars/secretos en el servicio Cloud Run `globe-studio-internal`
  vía Secret Manager + WIF: `GLOBE_PRODUCER_GRANT_SECRET` (clave HMAC del grant) y
  `GLOBE_PRODUCER_ASSETS_ENABLED`. El bucket ya existe (`GLOBE_LAB_INPUT_BUCKET`); confirmar que la
  runtime SA tiene **lectura** (`storage.objects.get`) sobre él.

### Security and access

- Auth/access gate: `capability` — `globe.producer.assets.operate` vía trusted context (nunca del
  body). Doble puerta en el serving: (1) principal autenticado + capability + workspace binding;
  (2) grant HMAC válido + no expirado + claims consistentes con `(workspace, experiment, sha256)`.
- Sensitive data posture: assets creativos (no PII/payroll/finance). El **grant** es un bearer
  short-lived: tratarlo con higiene (no loggear, TTL corto, bound a workspace).
- Error contract: códigos canónicos `GlobeApiErrorCode`. Payload malformado ⇒
  `InvalidProducerRequestError → invalid_request` (patrón de `InvalidExperimentRequestError`).
  Cross-workspace/desconocido/solo-input/`outputsRetained:false` ⇒ `not_found`. Kill switch OFF ⇒
  `policy_blocked`. Store caído ⇒ `dependency_unavailable`. **Nunca** prosa cruda ni body upstream.
- Abuse/rate-limit posture: TTL corto del grant limita replay; retrieval read-only sin efecto de
  gasto. Rate-limit explícito del serving = follow-up (no hay ledger comercial interno). Kill
  switch como circuit breaker.

### Runtime evidence

- Local checks: `producer-assets.test.ts` (dominio: tenant-safe, private-ingest rechaza input-hash,
  favorite idempotente, copyAsReference certifica `derived-internal`, kill switch fail-closed);
  `app.test.ts` (ruta `GET /v1/outputs/:sha256`: 200 con dispositions, 401 sin auth, 403 grant
  inválido/expirado, 404 cross-workspace, 503 store caído). `output-retrieval.test.ts` con doble
  (el impl GCS es live-only, como `GcsInputResolver`).
- DB/runtime checks: correr un golden brief real (TASK-1458) que retenga output → `output.get` →
  redimir grant → bytes servidos con integridad OK; repetir con un `experimentId` de otro workspace
  (esperar `not_found`) y con un `authorizedInputHash` (esperar `not_found`).
- Integration checks: verificar lectura GCS keyless (ADC/WIF) contra el bucket real en staging.
- Reliability signals/logs: denials de autorización + fallos de store con `correlationId`; conteo
  de grants emitidos vs redimidos (opcional, follow-up).
- Production verification sequence: ver §Rollout.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths/objetos reales.
- [ ] Invariantes tenant-safe, private-ingest, integridad y grant-hygiene explícitos y con test.
- [ ] Migration/backfill/rollback posture explícito (none + flag OFF + revert).
- [ ] Evidencia runtime listada (retrieval real + negativos cross-workspace/input-hash).
- [ ] Errores canónicos, sin leak de bytes/secretos/vendor; grant nunca loggeado.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Autorización tenant-safe + private-ingest +
  disposition + favorite + copy-as-reference viven en `packages/domain/src/producer-assets.ts`.
- [ ] **Modelada como reader/command**, no como click-handler: readers `output.get`/`asset.list`,
  commands `asset.favorite`/`asset.copyAsReference`.
- [ ] **Read** como reader canónico; **write** como command con command semantics, autorización
  fina (`globe.producer.assets.operate`, **NO** admin-coarse ni la capability de gasto del Lab),
  idempotencia (favorite/copyAsReference), errores canónicos sanitizados, `correlationId`. La ruta
  de serving reusa el **mismo** helper de autorización (no duplica política).
- [ ] **Capability + grant en el MISMO PR:** `globe.producer.assets.operate` en `GLOBE_CAPABILITIES`
  + grant al service principal (para http/sdk/worker/e2e); grant a humanos web **diferido al gate
  de TASK-1505** (coherente con `ui: policy-blocked`). Conformance harness la ejercita.
- [ ] **Camino programático declarado:** HTTP `/v1/readers` + `/v1/commands` + `GET /v1/outputs/:sha256`;
  SDK/MCP/CLI como clientes de la surface http; `ui`/`mcp` `policy-blocked` hasta gate.
- [ ] **Write apto para propose→confirm→execute:** copyAsReference/favorite son commands gobernados
  server-side (no integración Nexa-específica).
- [ ] **Un primitive, muchos consumers:** UI (1505), Workbench (1474), SDK/MCP/CLI, y 1501/1504
  (referencias) sin lógica duplicada.
- [ ] **Parity check = SÍ:** el output side tiene contrato gobernado a nivel capability.

## Rigor Levels

Aplica `backend-standard`: readers/commands aditivos + una ruta de serving keyless + store
in-memory, **sin** migración destructiva ni gasto — pero con controles de seguridad load-bearing
(tenant-safe, private-ingest, grant hygiene) que se prueban con dobles + un canary live.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato + capability (packages/contracts)

- Agregar `globe.producer.assets.operate` a `GLOBE_CAPABILITIES`; ids en
  `GLOBE_PRODUCER_READERS` (`output`, `assets`) y `GLOBE_PRODUCER_COMMANDS` (`favorite`,
  `copyAsReference`).
- Tipos: `OutputDisposition`, `GetOutputQueryV1`, `ProducerOutputHandleV1` (descriptor + grant,
  **sin bytes**), `FavoriteAssetPayloadV1`, `CopyAsReferencePayloadV1`, `ProducerReferenceHandleV1`
  (reusa `LabInputMediaType`/`LabInputRights`/`LabDerivedRights`), `AssetAnnotationsDataV1`.
- Confirmar que `GlobeApiErrorCode` cubre `not_found`/`invalid_request`/`policy_blocked`/
  `access_denied`/`dependency_unavailable` (ya existen — no inventar).
- Test de contrato (`index.test.ts`) del vocabulario nuevo.

### Slice 2 — Seam de lectura servible (apps/creative-runner)

- `apps/creative-runner/src/output-retrieval.ts`: `OutputRetrievalPort.retrieve(sha256)` →
  `{ mediaType, mimeType, bytes }` **integrity-verified**; `GcsOutputRetrieval` (lee
  `config.labInputBucket` keyless vía `createAdcAccessTokenProvider()`, re-verifica `sha256` con
  `@efeonce-globe/media-qc`, deriva mimeType del `content-type` del objeto con default por
  mediaType); `OutputRetrievalError` (`not_found`/`unreadable`/`integrity_mismatch`) sanitizado
  (jamás bytes/URL/token). Distinto del `GcsInputResolver` server-internal (ese hace rights-routing
  y fail-close en `test-fixture`; el retrieval sirve outputs propios, semántica distinta).
- Re-export en `apps/creative-runner/src/index.ts`. Test con doble (impl GCS live-only).

### Slice 3 — Readers + autorización tenant-safe (packages/domain)

- `packages/domain/src/producer-assets.ts`:
  - Helper `authorizeOwnedOutput(context, { experimentId, sha256 }, deps)`: `store.get(workspaceId,
    experimentId)` (cross-workspace/desconocido ⇒ `capability_not_found`); busca un attempt
    `outcome==='candidate_ready' && outputsRetained===true && outputHashes.includes(sha256)`;
    ninguno ⇒ `capability_not_found`. **NUNCA** consulta `authorizedInputHashes`. Deriva `mediaType`
    de `attempt.capability`.
  - Reader `globe.producer.output.get`: autoriza + mint del grant (`RetrievalGrantSignerPort`) →
    `ProducerOutputHandleV1`. Sin signer configurado ⇒ `dependency_unavailable`.
  - `registerProducerAssetCapabilities(registry, deps)` con `PRODUCER_ASSETS_COVERAGE`
    (`http/sdk/cli/worker/e2e = available`, `ui/mcp = policy-blocked`, `sister-platform = not-applicable`).
  - Kill switch `LabKillSwitchPort`-style (`() => producerAssetsEnabled`): OFF ⇒
    `surface_policy_blocked`.
  - `InvalidProducerRequestError → invalid_request` (mapeo en `dispatch.ts`).
- Re-export en `packages/domain/src/index.ts`.

### Slice 4 — Ruta de serving (apps/studio-web)

- `GET /v1/outputs/:sha256?experiment=…&grant=…&disposition=…` en `app.ts`:
  `resolveDispatchPrincipal` (auth) → `deriveTrustedContext` → verificar grant HMAC + expiry +
  claims `(workspaceId==binding, experimentId, sha256, disposition)` → `OutputRetrievalPort.retrieve`
  → stream con `Content-Type: mimeType` + `Content-Disposition` (inline/attachment, filename
  neutro por hash, sin vendor) + `Cache-Control: private, no-store`.
- Degradación: `OutputRetrievalError('unreadable')` ⇒ `dependency_unavailable` (retryable);
  `integrity_mismatch` ⇒ `dependency_unavailable`; grant inválido/expirado ⇒ `access_denied`;
  autorización faltante ⇒ `not_found`. Nunca `200` con cuerpo vacío. No loggear el grant.
- Wiring: `RetrievalGrantSignerPort` (HMAC con `GLOBE_PRODUCER_GRANT_SECRET`), kill switch
  `GLOBE_PRODUCER_ASSETS_ENABLED`, `OutputRetrievalPort` (`GcsOutputRetrieval` con
  `config.labInputBucket`), y `registerProducerAssetCapabilities` sobre el registry.
- Tests de ruta (`app.test.ts`): 200 inline/attachment con integridad OK; 401/403/404/503.

### Slice 5 — Asset actions: favorite + copy-as-reference (packages/domain)

- `AssetAnnotationStorePort` (in-memory default, workspace-scoped; TASK-1465 lo persiste):
  `setFavorite`, `saveReference`, `listForWorkspace`.
- Command `globe.producer.asset.favorite` (`FavoriteAssetPayloadV1`): autoriza el output propio
  (reusa `authorizeOwnedOutput`), setea estado deseado explícito, idempotente.
- Command `globe.producer.asset.copyAsReference` (`CopyAsReferencePayloadV1`): autoriza + certifica
  `ProducerReferenceHandleV1` (`rights: 'derived-internal'` + `parentRights` heredado más
  restrictivo sobre los `authorizedInputs` del padre) — cero bytes por la API, cero gasto;
  persiste el handle (idempotente); fail-closed pre-mint si media no referenciable / no retenido.
- Reader `globe.producer.asset.list` → `AssetAnnotationsDataV1` (favorites + referencias del
  workspace) para el feed.
- Tests: idempotencia, `derived-internal` inforjable, herencia de `licensed`, tenant-safety.

## Out of Scope

- **El feed / la superficie visual** (chassis, paneles, preview player, ⭐ en la card): es
  TASK-1505. Aquí solo el contrato gobernado que ese feed consume.
- **Aceptar una referencia `derived-internal` en el payload de `prepare`**: es contrato de
  TASK-1501 (run discriminado, `references[]`). Aquí solo se **certifica y mint** el handle.
- **Persistencia durable** de favorites/referencias/projects/carpetas: es TASK-1465 (tenancy).
  Aquí in-memory default (patrón del `InMemoryExperimentStore`).
- **Provenance/rights/retención completa** del store: es TASK-1467. Aquí lectura servible mínima.
- **Ledger comercial / contabilidad de retrieval**: TASK-1468 (clientes), diferido. Retrieval es
  gasto cero.
- **Range requests / seeking parcial de video, thumbnails, transcodes**: follow-up (streaming
  simple primero).
- **Enumerar los outputHashes de un run** (índice/árbol de candidatos): ya lo da el reader
  `globe.lab.experiment.evidence` / TASK-1498. Aquí se resuelve un hash puntual.

## Detailed Spec

### Contratos (packages/contracts)

```ts
export const GLOBE_PRODUCER_ASSETS_CAPABILITY = 'globe.producer.assets.operate' as const;

export const GLOBE_PRODUCER_READERS = {
  output: 'globe.producer.output.get',
  assets: 'globe.producer.asset.list',
} as const;

export const GLOBE_PRODUCER_COMMANDS = {
  favorite: 'globe.producer.asset.favorite',
  copyAsReference: 'globe.producer.asset.copyAsReference',
} as const;

export type OutputDisposition = 'inline' | 'attachment';

export type GetOutputQueryV1 = Readonly<{
  experimentId: string;
  sha256: string;
  disposition?: OutputDisposition; // default 'inline'
}>;

/** Descriptor servible. NUNCA lleva bytes, signed URL, secreto ni costo vendor. */
export type ProducerOutputHandleV1 = Readonly<{
  schemaVersion: '1';
  experimentId: string;
  attemptId: string;
  sha256: string;
  mediaType: 'image' | 'video' | 'audio' | 'model-3d';
  mimeType: string;
  disposition: OutputDisposition;
  retrievalGrant: string;   // opaco, HMAC, bound a (workspace, experiment, sha256, disposition), TTL corto
  grantExpiresAt: string;   // ISO
}>;

export type FavoriteAssetPayloadV1 = Readonly<{
  experimentId: string;
  sha256: string;
  favorite: boolean; // estado deseado explícito (idempotente), nunca toggle ciego
}>;

export type CopyAsReferencePayloadV1 = Readonly<{
  experimentId: string;
  sha256: string;
}>;

/** Referencia certificada por la plataforma. Bytes NUNCA cruzan la API. */
export type ProducerReferenceHandleV1 = Readonly<{
  schemaVersion: '1';
  referenceId: string;
  sourceExperimentId: string;
  sourceAttemptId: string;
  sha256: string;
  mediaType: LabInputMediaType;
  rights: LabDerivedRights;      // 'derived-internal' — un caller no puede declararlo
  parentRights: LabInputRights;  // más restrictivo sobre los inputs del padre
}>;

export type AssetAnnotationsDataV1 = Readonly<{
  favorites: readonly Readonly<{ experimentId: string; sha256: string; favoritedAt: string }>[];
  references: readonly ProducerReferenceHandleV1[];
}>;
```

### Seam de lectura (apps/creative-runner/src/output-retrieval.ts)

```ts
export type OutputRetrievalReason = 'not_found' | 'unreadable' | 'integrity_mismatch';

export class OutputRetrievalError extends Error {
  readonly reason: OutputRetrievalReason;
  readonly sha256: string;
  // Nunca lleva bytes, signed URL ni token.
}

export interface OutputRetrievalPort {
  retrieve(sha256: string): Promise<{ mediaType: 'image'|'video'|'audio'|'model-3d'; mimeType: string; bytes: Uint8Array }>;
}

// Lee config.labInputBucket keyless (createAdcAccessTokenProvider), re-verifica sha256 con
// @efeonce-globe/media-qc; live-only (tests inyectan doble). Espejo de lectura de GcsOutputIngest,
// distinto de GcsInputResolver (ese hace rights-routing server-internal detrás del fence).
export class GcsOutputRetrieval implements OutputRetrievalPort { /* ... */ }
```

### Autorización (packages/domain/src/producer-assets.ts) — la pieza load-bearing

```
authorizeOwnedOutput(context, { experimentId, sha256 }):
  stored = deps.store.get(context.workspaceId, experimentId)   // scoped
  if !stored -> DispatchError('capability_not_found')          // cross-workspace/desconocido = not_found
  attempt = stored.view.attempts.find(a =>
      a.outcome === 'candidate_ready'
      && a.outputsRetained === true
      && a.outputHashes.includes(sha256))                      // SOLO outputs. NUNCA authorizedInputHashes.
  if !attempt -> DispatchError('capability_not_found')         // input-hash / no-retenido = not_found
  mediaType = mediaTypeFromCapability(attempt.capability)      // image-*/video-*/audio/model-3d
  return { attemptId: attempt.attemptId, mediaType }
```

- El **store es tenant-blind** (content-addressed). La tenant-safety y el private-ingest los da
  esta función gateando contra los output-hashes que el workspace **posee**, no el bucket.
- `RetrievalGrantSignerPort.mint({ workspaceId, experimentId, sha256, disposition, expEpochMs })`
  → string HMAC opaco; `verify(grant)` stateless. `GLOBE_PRODUCER_GRANT_SECRET` server-only.

### Ruta de serving (apps/studio-web/src/app.ts)

```
GET /v1/outputs/:sha256?experiment=…&grant=…&disposition=…
  1. kill switch OFF -> policy_blocked
  2. resolveDispatchPrincipal (401 si no auth)
  3. deriveTrustedContext
  4. grant verify: HMAC ok + no expirado + claims (workspaceId==binding, experiment, sha256, disposition)
        -> falla => access_denied  (grant es la puerta; el principal bindeado es defense in depth)
  5. OutputRetrievalPort.retrieve(sha256)  (integrity-verified)
        -> OutputRetrievalError => dependency_unavailable  (retryable; nunca 200 vacío)
  6. stream: Content-Type=mimeType, Content-Disposition=(inline|attachment; filename neutro),
        Cache-Control: private, no-store
```

### Coverage

```ts
const PRODUCER_ASSETS_COVERAGE = {
  ui: 'policy-blocked',        // hasta el gate de TASK-1505 + broker grantea a humanos web
  http: 'available',
  sdk: 'available',
  mcp: 'policy-blocked',       // hasta gate MCP
  cli: 'available',
  worker: 'available',
  'sister-platform': 'not-applicable',
  e2e: 'available',
} as const;
```

### Delta a TASK-1501 / TASK-1504 (handoff explícito)

`copy-as-reference` **produce** `ProducerReferenceHandleV1` (`derived-internal`). La **aceptación**
de esa referencia en el payload del run discriminado (`references[]` / inputs) la contractualiza
TASK-1501 (image `references[]`) y TASK-1504 (frames/motion/change-voice inputs). Esta task no
modifica `PrepareExperimentPayloadV1`; declara el handoff. Un run que consuma la referencia se
tarifa por `ruta × output-shape` (TASK-1502), no por esta task.

## Rollout Plan & Risk Matrix

Aditivo, gateado por kill switch (`GLOBE_PRODUCER_ASSETS_ENABLED` default OFF) + coverage
`policy-blocked` en `ui`/`mcp` hasta el gate de TASK-1505. Plantilla proporcional (no
SCIM/payroll/finance). Rollback = flag OFF + revert PR.

### Slice ordering hard rule

- Slice 1 (contrato) → Slice 2 (seam de lectura) → Slice 3 (readers + autorización) → Slice 4
  (ruta de serving) → Slice 5 (asset actions).
- Slice 4 (serving) **no** puede shippear antes de Slice 3: la ruta **reusa** el helper de
  autorización de Slice 3 (un primitivo, dos transportes). Duplicar la política en la ruta viola
  el contrato de la task.
- Slice 5 (favorite/copyAsReference) puede correr en paralelo con Slice 4 una vez cerrado Slice 3
  (ambos reusan `authorizeOwnedOutput`).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Leak cross-workspace (servir output de otro tenant) | tenancy/data | medium | Autorización SOLO contra `store.get(workspaceId, …)`; cross-workspace ⇒ `not_found`; test negativo obligatorio | denials con `correlationId`; test de regresión |
| Leak de bytes de referencia de entrada (private-ingest) | data/security | medium | Retrieval matchea SOLO `outputHashes` con `outputsRetained`; NUNCA `authorizedInputHashes`; test con input-hash ⇒ `not_found` | test de regresión; revisión de código |
| Grant filtrado/replayed | security | low | HMAC + TTL corto + bound a workspace/hash; re-validación del binding en redención; no loggear grant | denials de grant; expiry |
| Store caído sirve `200` vacío/bytes equivocados | resilience/UI | low | Integrity re-verify + degradación a `dependency_unavailable`; nunca `200` sin bytes válidos | `dependency_unavailable` en logs |
| Coverage abierto antes de tiempo (UI/MCP) | governance | low | `ui`/`mcp` `policy-blocked` hasta gate de TASK-1505; grant a humanos diferido | coverage manifest |
| Runtime SA sin lectura del bucket | infra | medium | Verificar `storage.objects.get` en staging antes del canary | 403/`unreadable` en canary |

### Feature flags / cutover

- Kill switch `GLOBE_PRODUCER_ASSETS_ENABLED` (env, default **OFF**) — OFF ⇒ command/reader/ruta
  hacen `policy_blocked`. Flip a `true` post-smoke en staging; revert = `false` + redeploy (<5 min).
- `GLOBE_PRODUCER_GRANT_SECRET` (Secret Manager) — sin él, el mint del grant ⇒ `dependency_unavailable`
  (fail-closed). No es un flag de rollout; es requisito de operación.
- `ui`/`mcp` `policy-blocked` en el coverage — flip a `available` es el **gate de TASK-1505**
  (además el broker debe grantear `globe.producer.assets.operate` a humanos web).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (contrato) | revert PR (aditivo, sin consumidores en prod) | <5 min | sí |
| Slice 2 (seam) | revert PR | <5 min | sí |
| Slice 3 (readers) | flag OFF + revert PR | <5 min | sí |
| Slice 4 (serving) | flag OFF (ruta ⇒ `policy_blocked`) + revert PR | <5 min | sí |
| Slice 5 (asset actions) | flag OFF + revert PR; anotaciones in-memory se descartan al reiniciar | <5 min | sí |

### Production verification sequence

1. `pnpm check && pnpm build` en `efeonce-globe` verdes (typecheck NodeNext strict + `node --test`).
2. Deploy `studio-web` a staging con `GLOBE_PRODUCER_ASSETS_ENABLED=false` + verificar
   `/v1/capabilities` muestra las capabilities nuevas (contract live, `ui`/`mcp` `policy-blocked`).
3. Setear `GLOBE_PRODUCER_GRANT_SECRET` (Secret Manager) + confirmar `storage.objects.get` de la
   runtime SA sobre `GLOBE_LAB_INPUT_BUCKET`.
4. Flip `GLOBE_PRODUCER_ASSETS_ENABLED=true` en staging + canary: correr un golden brief que
   retenga output → `globe.producer.output.get` → redimir grant en `GET /v1/outputs/:sha256` →
   bytes con integridad OK (preview) + `disposition=attachment` (download).
5. Negativos en staging: `experimentId` de otro workspace ⇒ `not_found`; un `authorizedInputHash`
   ⇒ `not_found`; grant expirado ⇒ `access_denied`; store apagado ⇒ `dependency_unavailable`.
6. `favorite` (idempotente) + `copyAsReference` (handle `derived-internal`) + `asset.list` reflejan.
7. Repetir 2-6 en producción cuando lo habilite el gate de TASK-1505 (cooldown entre ambientes).

### Out-of-band coordination required

- Secret Manager: crear `GLOBE_PRODUCER_GRANT_SECRET` (clave HMAC aleatoria) + `secretAccessor` a
  la runtime SA de `globe-studio-internal`.
- Confirmar IAM: la runtime SA con `storage.objects.get` sobre el bucket `GLOBE_LAB_INPUT_BUCKET`.
- Env: `GLOBE_PRODUCER_ASSETS_ENABLED` en el servicio Cloud Run (default OFF).
- No toca Terraform de identidades vivas (import protocol N/A); los servicios Cloud Run no están en
  IaC hoy — declarar los env/secret en el workflow de deploy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Reader `globe.producer.output.get` devuelve `ProducerOutputHandleV1` (descriptor + grant,
  **sin bytes**) para un output propio retenido; `experimentId` cross-workspace o desconocido ⇒
  `not_found`; hash que solo es `authorizedInputHash` ⇒ `not_found`; `outputsRetained:false` ⇒
  `not_found`.
- [ ] `GET /v1/outputs/:sha256` streamea bytes con `Content-Type` + `Content-Disposition`
  (inline/attachment), integrity-verified; sin auth ⇒ 401; grant inválido/expirado ⇒ `access_denied`;
  store caído ⇒ `dependency_unavailable` (nunca `200` con cuerpo vacío); el grant no aparece en logs.
- [ ] La ruta de serving **reusa** el mismo helper de autorización que el reader (un primitivo, dos
  transportes) — sin política duplicada.
- [ ] `globe.producer.asset.favorite` idempotente por estado deseado explícito; solo sobre outputs
  propios.
- [ ] `globe.producer.asset.copyAsReference` produce `ProducerReferenceHandleV1` con
  `rights: 'derived-internal'` + `parentRights` heredado (un ancestro `licensed` sigue restringiendo);
  cero bytes por la API; fail-closed pre-mint para media no referenciable / no retenida.
- [ ] `globe.producer.asset.list` devuelve favorites + referencias del workspace del caller.
- [ ] Capability `globe.producer.assets.operate` en `GLOBE_CAPABILITIES` + grant al service principal;
  coverage `ui`/`mcp` `policy-blocked`, resto `available`/`not-applicable`; conformance harness la
  ejercita. **No** confiere gasto (distinta de `globe.lab.experiment.run`).
- [ ] Kill switch `GLOBE_PRODUCER_ASSETS_ENABLED` default OFF ⇒ `policy_blocked`.
- [ ] Ningún path reserva crédito ni corre un provider.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes.

## Verification

- `cd ../efeonce-globe && pnpm check` (typecheck NodeNext strict + `node --test` en packages/apps).
- `cd ../efeonce-globe && pnpm build`.
- `node --test packages/domain/src/producer-assets.test.ts` (tenant-safe, private-ingest,
  favorite idempotente, copyAsReference `derived-internal`, kill switch).
- `node --test apps/studio-web/src/app.test.ts` (ruta serving: 200 dispositions, 401/403/404/503).
- Canary live en staging: golden brief con output retenido → `output.get` → redención → bytes con
  integridad OK; negativos cross-workspace + input-hash.
- `pnpm install` si se agrega una dep de workspace (no se espera ninguna nueva).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete`
  al cerrarla).
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` + `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [ ] `Handoff.md` actualizado (retrieval + asset actions live; flags/secretos pendientes de prender).
- [ ] `changelog.md` actualizado (capability nueva del output side del Producer).
- [ ] chequeo de impacto cruzado: TASK-1505 (consume retrieval/favorite/copyAsReference),
  TASK-1474, TASK-1501/1504 (referencias `derived-internal`), TASK-1498 (enumeración de candidatos),
  TASK-1465 (persistencia durable de anotaciones), TASK-1467 (provenance).
- [ ] cierre documental proporcional (arquitectura Producer §retrieval + doc funcional + manual)
  vía `greenhouse-documentation-governor`.
- [ ] §retrieval/asset-actions agregada a
  `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`.

## Follow-ups

- **TASK-1465**: persistir favorites + referencias (`AssetAnnotationStorePort` durable) al aterrizar
  la tenancy store.
- **TASK-1501/1504**: aceptar `ProducerReferenceHandleV1` (`derived-internal`) en el run discriminado.
- Range requests / seeking parcial de video, thumbnails, transcodes de preview.
- Rate-limit explícito del serving + signal de grants emitidos vs redimidos.
- Rate-limit / observabilidad de denials (cross-workspace, grant inválido) como reliability signal.

## Open Questions

- ¿La capability read/annotation del Producer es `globe.producer.assets.operate` (propuesta) o se
  parte en dos (`globe.producer.output.read` + `globe.producer.asset.manage`)? Propuesta: una sola
  hasta que un consumer exija granularidad. **Confirmar que NO se reusa `globe.lab.experiment.run`**
  (es de gasto, api-mode; retrieval debe ser humano-alcanzable sin autoridad de gasto).
- ¿El grant viaja en query (para `<img src>`/`<video src>` directos) o en header? Propuesta: query
  + no-log + TTL corto + re-validación del binding, porque la UI necesita `src` directo. Confirmar
  con la implementación de TASK-1505.
- ¿`copy-as-reference` persiste el handle (para "referencias guardadas" en el feed) o es derivación
  pura idempotente? Propuesta: persistir en el annotation store (in-memory hasta TASK-1465), pero el
  registro reusable durable es de TASK-1465.
- mimeType autoritativo: ¿el `content-type` del objeto GCS (como `GcsInputResolver`) o un default
  por mediaType? Propuesta: objeto GCS con default por mediaType — el manifest no lo lleva.
