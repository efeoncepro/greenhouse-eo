> **Changelog de Efeonce Globe — historia repatriada (TASK-1492).**
> Cronología del runtime de Globe, repatriada desde `efeonce-globe/changelog.md` al control plane documental de
> Greenhouse. La continuidad activa vive en `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`.

---

# Changelog

## 2026-07-20 — TASK-1501: contrato de run discriminado por modalidad (image→video→audio)

- **`PrepareExperimentPayloadV1.output?: OutputShapeV1`** — union discriminado por `modality`, additive-optional,
  **diseñado para las 3 modalidades día 1** (image implementada de punta a punta; video/audio declaradas +
  validadas estructuralmente, su ejecución de capability es TASK-1504). `prompt` sigue top-level; los selectores
  (`inputMode`/`mode`) no transportan bytes (refs por `authorizedInputs`, base de edit por `editFrom`).
- **Validación fail-closed pre-spend:** `validateOutputShape` dentro de `validatePreparePayload`, en `prepare`,
  **estrictamente antes de `fence.reserve`**. Parseo estructural del payload no confiable + range-check contra los
  constraints de la ruta del catálogo (TASK-1500). Ruta desconocida, `route.capability≠payload.capability`,
  modality incoherente, param fuera de rango/enum, `inputMode`/`mode` no soportado, output malformado, y **sin
  catálogo cableado** → `invalid_request`. Nunca coerción silenciosa.
- **Reconciliación del port con TASK-1500:** el diseño proponía `constraintsFor(capability, referenceRoute)`; la
  firma real es `RouteCatalogPort.getRoute(referenceRoute): ProducerRouteDescriptorV1` (el descriptor ya trae
  capability + constraints + inputModes). Impl de producción = `getProducerRoute` reusado in-process (SSOT, sin
  re-dispatch ni ciclo de módulos); `catalog?` opcional en `ModelLabDependencies`.
- **Threading image-first + absorción de TASK-1495:** `CreativeProviderRequestV1` gana `quality`/`aspectRatio`/
  `count`; `toProviderRequest` los hilvana cuando `modality==='image'`; el fal image adapter (Seedream) los lee
  (`num_images`/`aspect_ratio`, `[verify live]`). El aspect ratio deja de ser hardcode. Video/audio adapter reads
  = TASK-1504.
- **Estado:** local-first en `main` de `efeonce-globe`, sin push; `pnpm check` + `build` verdes (domain 85 tests,
  creative-runner 89). Backward-compat: un `prepare` sin `output` conserva el comportamiento previo. Coverage sin
  cambios (`ui`/`mcp` `policy-blocked`).

## 2026-07-20 — TASK-1500 (revisión): modelo público, casa interna (invariante invertido)

- **Decisión de producto:** mostrar el modelo real al cliente **añade valor** — para el ICP de Globe (equipos
  de marketing enterprise) el modelo es una señal de calidad conocida y un **ancla de posicionamiento de la
  suite**. Se invirtió el naming dual de la versión inicial de TASK-1500 (que hacía el modelo operator-only).
- **Tres capas separadas:** `model` = **nombre + versión** ("Seedance" · "2.0") → **client-facing**; `house`
  ("Studio Motion I") → **operator-only**, taxonomía interna de Efeonce; slug + costo vendor + margen → nunca.
  Se corrigió una conflación de la V1 que trataba "nombre del modelo" y "slug de wire" como lo mismo: son
  distintos ("Seedance 2.0" es marca legible; `bytedance/seedance-2.0/text-to-video` es plomería).
- **Contrato:** `RouteModelIdentityV1 { name; version? }` (version = etiqueta libre opcional). La capability
  `globe.producer.route.reveal_model` se renombró a `globe.producer.route.reveal_house` (ahora gatea la casa,
  no el modelo). `resolveRouteAudience` (`operator`|`client`) reemplaza a `resolveNamingView`; la proyección
  client **omite** `house`. Guards no-slug-leak ahora barren `model.name`/`model.version`/`house`.
- **Estado:** local-first en `main` de `efeonce-globe`, sin push; `pnpm check` + `build` verdes (domain 73
  tests). Sin cambio de despliegue.

## 2026-07-20 — TASK-1500: catálogo gobernado de rutas del Creative Producer (keystone del cluster)

- **El catálogo de rutas nace como dato versionado** (`PRODUCER_ROUTE_CATALOG` + `PRODUCER_CATALOG_VERSION`
  en `packages/domain/src/producer-catalog.ts`): 4 rutas seed ancladas a las fidelity routes vivas
  (`ref/still/rrss-v1` · `ref/motion/loop-v1` · `ref/audio/foley-v1` · `ref/voice/tts-v1`), constraints
  **discriminados por modalidad** (image/video/audio — una ruta image no puede portar `sampleRate` por
  compilación), specialty, `audioCapable`, modos de input y **naming dual**. Agregar una ruta = editar dato.
- **Drift guards con `throw` en carga:** routeId único, capability ∈ `CREATIVE_CAPABILITIES`, modality-match,
  `audioCapable` coherente y **no-slug-leak** (prefijos vendor + hosts de endpoint + `/` prohibido en naming).
  Un catálogo inválido es un build roto, nunca un catálogo servido.
- **Readers gobernados** `globe.producer.catalog.list`/`.get` (capability `globe.producer.catalog.read`),
  coverage `ui`/`mcp` `policy-blocked` hasta el gate de `TASK-1505`. **Naming-view fail-closed a cliente:**
  la vista modelo-real exige la capability dedicada `globe.producer.route.reveal_model` (decisión: no se
  reusa la autoridad del Lab) y la proyección client **omite** `naming.internal`. routeId desconocido →
  `not_found` sin revelar existencia.
- **Helpers in-process** `listProducerRoutes`/`getProducerRoute`/`resolveRouteConstraints`: la SSOT que
  `TASK-1501` (validación de shape fail-closed pre-spend) y `TASK-1502` (estimate `costo = f(ruta, shape)`)
  reusan sin re-dispatch. SDK tipado `listProducerRoutes`/`getProducerRoute`.
- **Estado:** local-first en `main` de `efeonce-globe`, sin push; `pnpm check` + `pnpm build` verdes
  (incluye E2E por el transporte api-mode real). El servicio desplegado toma el reader en el próximo deploy
  autorizado. De paso: el test script de `@efeonce-globe/domain` ahora corre `evaluation.test.ts` (gap
  preexistente).

## 2026-07-20 — TASK-1490 desplegada + verificada en el servicio + hardening de auth (api mode)

- **Rollout ejecutado y verificado en el servicio desplegado.** El Model Lab se opera por **api mode**
  (`globe-api-internal`, corriendo como `globe-api-runtime`): es el único servicio con un caller
  autorizado, porque el broker no otorga la capability del Lab a humanos (web mode). El chain
  **generate → edit por referencia cross-model** corrió end to end contra el servicio, autenticado
  como el caller real, con la SA del servicio escribiendo al bucket (`outputsRetained=true`).
- **Corrección de rollout:** el primer intento prendió el Lab en `studio-web` (inerte — sin caller
  autorizado) y dio `aiplatform.user` a `web_runtime` (la SA equivocada). Movido a `api-internal` /
  `api_runtime`. `studio-web` quedó con el Lab apagado.
- **Hardening de auth (defense in depth), robusto no parche.** En api mode la app devolvía el service
  principal (con capacidad de gasto) **sin verificar el token**, confiando sólo en Cloud Run IAM —
  frágil ante `invokerIamDisabled`. Ahora la app verifica el ID token del caller **localmente**
  (`google-auth-library.verifyIdToken`, claves cacheadas, sin round-trip por request; reemplazó un
  primer intento con `tokeninfo` que era un SPOF externo síncrono), con **audience explícito** +
  **allowlist de SAs**, ambos fail-closed. Red-teameado con `arch-architect` (4 pilares).
- **El SDK envía el ID token en `Authorization`, no `X-Serverless-Authorization`.** Cloud Run consume
  el segundo y reenvía el primero; la re-verificación en-app sólo puede leer lo que se reenvía. Con
  X-Serverless el perímetro pasaba y la app rechazaba al caller legítimo con 401 (verificado en vivo).
- **Hallazgo documentado (no cerrado):** `globe-studio-internal` tiene `invokerIamDisabled=True` (app
  web con SSO; correcto que Cloud Run no verifique invoker, la app hace su propia auth). La capa de app
  aguanta (anónimo → 401 en commands). Pendiente: gobernar el flag en IaC (los servicios Cloud Run no
  están en Terraform hoy).

## 2026-07-20 — Cross-model edit/refine generalizado (TASK-1490), live-verified

- **Una sola semántica de edit** (`d0616ba`…`596b818`): `PrepareExperimentPayloadV1.editFrom = { experimentId }`
  reemplaza el vocabulario de proveedor. El caller sigue declarando capability/route/hardCap del edit — eso es lo
  que habilita el **edit cross-model**. `previousInteractionId` queda deprecado y es mutuamente excluyente con
  `editFrom` (mandar ambos es `invalid_request`, nunca precedencia silenciosa).
- **La pieza que faltaba — retención de outputs** (`596b818`): los adapters hasheaban los bytes de salida y los
  descartaban, así que el hash de un candidato no resolvía a nada y el paradigma reference-based era
  estructuralmente imposible (fallaba en runtime, no en compilación). `OutputIngestPort` + `GcsOutputIngest`
  los persisten content-addressed bajo el mismo `sha256` que publica el manifest; `outputsRetained` lo declara.
  Un fallo de storage nunca destruye un candidato ya pagado.
- **Router de edit** (`05a5714`): el runner elige el paradigma con el único dato que sólo él tiene — qué proveedor
  va a ejecutar. Un handle de sesión sólo se hilvana a quien lo emitió; el resto cae a reference-based, y el
  cambio queda en `editMode`, nunca en silencio. El lineage encadena padre→hijo.
- **Multi-referencia + refs combinadas cross-modales** (`8ef649d`): cada ruta declara su tope y falla cerrado al
  excederlo. Cierra un bug previo real: una ruta Fal de URL única subía TODAS las referencias a Fal storage y
  después usaba sólo `urls[0]` — pagando los round-trips y descartando el resto en silencio.
- **`GLOBE_LAB_OMNI_EDITABLE`** (default OFF) reemplaza el `store:true` hardcodeado, que estaba sacando **todo**
  generate de Omni del path keyless hacia facturación por API key sin que nadie lo hubiera decidido.
- **Dos defectos que sólo el gasto real reveló**, con la suite unitaria en verde: `providerRunChainable` se
  calculaba en el adapter y se perdía en el runner (todo edit stateful degradaba en silencio a reference), y todo
  fallo del runner colapsaba a `runner_error` (el fallo más común de un edit era indistinguible de cualquier otro).
  Omni además separa ahora `provider_incomplete` (aceptado, el modelo declinó) de `provider_failed` (request
  rechazado): piden respuestas opuestas.
- **Evidencia en vivo por el seam**: reference-based (Seedream→Seedream edit), **cross-model** (Seedream→Nano
  Banana), stateful (Omni encadenado, `surface=gemini-api`/`chainable=true`) y cross-modal (Omni
  `reference_to_video` con imagen+vídeo). Los cuatro `candidate_ready` con lineage encadenado.

## 2026-07-20 — Lab edit-command (Omni stateful edit through the seam) + first keyless Cloud Run deploy

- **Lab edit-command** (`a765d55`): the Model Lab seam now threads stateful edit end to end —
  `PrepareExperimentPayloadV1.previousInteractionId` + `ExperimentAttemptManifestV1.providerRunRef`
  (contracts/domain/runner) + `VertexOmniAdapter` dual-transport (generate keyless Vertex / edit Gemini-key).
  Cross-surface gotcha found + fixed live: a keyless Vertex interaction id is not editable on the Gemini surface, so
  an editable generate (`store:true`) also runs on the Gemini surface. Live-verified through the seam:
  prepare(video-generate,store)→execute→`providerRunRef=v1_…` → prepare(previousInteractionId)→execute→edit
  candidate_ready (new video + chainable id). Generalizing to all editable models + multi-reference/combined refs =
  TASK-1490.
- **First keyless Cloud Run deploy** of the real provider stack: `studio-web` → `globe-studio-internal` rev
  `00007-jrr` (Ready), private/internal. `GLOBE_LAB_PROVIDER` stays `fake` in the deployed service (engines deployed
  but OFF; enabling = a gated flag flip).
- **Cloud Build deploy IAM fixed** (`d264039`): TASK-1464's IaC lacked the deployer's
  `cloudbuild.builds.editor`/`storage.admin` and the compute build SA's
  `storage.objectViewer`/`artifactregistry.writer`/`logging.logWriter`/`cloudbuild.builds.builder`; the Dockerfile
  also missed `packages/sdk`. All fixed live + tracked in `infra/terraform/{iam,locals}.tf`.
- **`tofu apply`** applied the provider secrets/services/IAM (8 imported, 0 destroy; plan now "No changes").

## 2026-07-20 — Veo + Omni video engines (Interactions API), fidelity anchor, live-verified motion matrix

- Replaced the removed `generateContent` video path with **two dedicated Vertex video adapters**, realizing the
  `LabRunnerPort` seam without touching domain, contracts or transports. Both **verified live 2026-07-20** through
  the sanctioned Model Lab seam against `product-motion-loop`, each `objective_pass_pending_human`:
  - `VertexVideoAdapter` (`vertex-video-adapter.ts`, `1d5635b` + fix `0e06fdc`): keyless Vertex **Veo**
    `veo-3.0-fast-generate-001` (us-central1) via `:predictLongRunning` → `:fetchPredictOperation` → base64/GCS —
    the long-running predict flow Veo requires (not `generateContent`). 32 credits, real MP4.
  - `VertexOmniAdapter` (`vertex-omni-adapter.ts`, `f56452a`): **Gemini Omni Flash** `gemini-omni-flash-preview`
    (reasoning-native video) via the **Interactions API**. GENERATE is keyless on Vertex
    (`aiplatform.googleapis.com/v1beta1/.../interactions`, ADC Bearer, no key). 40 credits.
- **Stateful edit surface split found live:** `previous_interaction_id` + `store` is rejected on the keyless Vertex
  path (400 "do not support previous_interaction_id"); it works only on the **Gemini API** surface
  (`generativelanguage`) with an API key (OAuth rejected). Edit verified live there: create `store:true` → edit →
  200 completed video. The one-shot Lab seam does not yet thread the interaction id through the domain (follow-up).
- **Composite fidelity video anchor** `GLOBE_LAB_VIDEO_ANCHOR` = `fal` (Seedance, default) | `vertex-video` (Veo) |
  `vertex-omni` (Omni) replaces the fixed policy for video. Live motion matrix: Omni 40 cr, Veo 32 cr, Seedance
  20 cr — all `objective_pass_pending_human`, craft verdict left to a human.
- **Provisioning:** `generativelanguage.googleapis.com` enabled; `globe-gemini-api-key` + `globe-fal-api-key`
  created in Secret Manager with runtime-SA `secretAccessor`; Terraform `secrets.tf` + import blocks added
  (`tofu validate` OK; `apply` is an operator step). The Globe-owned Fal key retires the shared
  `greenhouse-fal-api-key` exception at the code level.
- **Billing finding:** Omni video has no free API tier ($0.10/s); the Gemini API bills Prepay/Postpay + key and is
  the only stateful-edit surface today; "Gemini Enterprise" per-seat is UNRELATED (do not buy). Recommend Postpay to
  avoid the Prepay $0-balance cliff.
- Follow-ups: `studio-web` deploy / Dockerfile; a Lab edit command threading `previous_interaction_id` through the
  domain; Vertex stateful-edit parity re-test; TASK-1467 full provenance. Code:
  `apps/creative-runner/src/{vertex-video-adapter,vertex-omni-adapter}.ts`.

## 2026-07-19 — Track B (hash→bytes input resolution) + first live motion/audio canary + Vertex video correction

- **Track B — hash→bytes input resolution** (`40c6a95`): the public command API still carries only content hashes;
  the `LabRunner` now resolves an experiment's `authorizedInputs` to real bytes at the single provider-invocation
  point and attaches them to the provider request (`ResolvedInputV1`, server-internal, never on the wire). New
  `InputResolverPort` + `FixtureInputResolver` (golden-brief fixtures: 1×1 PNG anchor + minimal WAV) +
  `GcsInputResolver` (keyless ADC, content-addressed, sha256 integrity-verified) + `RightsRoutedInputResolver`.
  Vertex inlines resolved bytes as `generateContent` `inlineData`; Fal uploads them to Fal storage → short-lived URL.
  This unblocked the input-bearing golden briefs (motion anchor, audio contact ref) that previously died on
  `inputs_unavailable`. Full provenance/rights/retention stays TASK-1467.
- **First live motion + audio canary** through the real seam: **Fal Seedance 2.0** ran `product-motion-loop`
  (`objective_pass_pending_human`, 20 cr, ~155s) and **Fal Seed Audio** ran `glitch-microphone-foley`
  (`objective_pass_pending_human`, 6 cr, ~16s). Both are the working engines for their medium today.
- **Vertex video correction** (`77d2949`): the live canary proved `gemini-omni-flash-preview` returns 400 on
  `generateContent` — *"only supported in the Interactions API and cannot be called directly via generateContent"*
  (Veo likewise uses `predictLongRunning`). A `generateContent`-based adapter cannot serve Vertex video, so
  `video-generate`/`video-extend` were removed from `VERTEX_ROUTING` (`supports(video)=false`, same explicit
  boundary as audio); the composite routes video to Fal. Track B was not at fault — the anchor resolved and inlined
  correctly. A dedicated Vertex video adapter (Veo `predictLongRunning` / Omni Interactions API) is the follow-up.

## 2026-07-19 — TASK-1486/1487/1488/1459 Real provider stack for the Model Lab (Vertex + Fal + Composite, ten verified models)

- Realized the `LabRunnerPort` provider seam with real adapters, **without touching domain, contracts, transports
  or the conformance harness**. `VertexCreativeAdapter` (TASK-1486) is keyless (ADC/WIF) and routes Google-native
  capabilities: image → Nano Banana `gemini-2.5-flash-image`, video → Gemini Omni Flash `gemini-omni-flash-preview`
  (region `global`). `submit` is the only billable call; `poll` decodes inline base64 → `sha256`, never a public URL.
- `FalCreativeAdapter` (TASK-1487) connects the allowlisted **non-Google** stack via Fal's queue API (keyed,
  Globe's own secret — never `greenhouse-fal-api-key`), draining the status URL and downloading + hashing outputs
  server-side. `CompositeProviderAdapter` (TASK-1487) unions Vertex + Fal behind one interface, routing
  capability-only cases by `supports()` and the image/video overlap by an explicit policy.
- TASK-1488 grows `CREATIVE_CAPABILITIES` to **ten** (+`image-upscale`/`video-upscale`/`model-3d-generate`) and
  wires ten models verified against the tested skills, not the doc catalog: Seedream 5, Recraft v4.1, Topaz,
  Seedance 2.0, Seed Audio (`fal-ai/seed-audio`), ElevenLabs, Hyper3D Rodin v2.5. **Hard rule found live:**
  ByteDance models on Fal use the slug **without** the `fal-ai/` prefix (with it, submit passes but the result
  404s). `GLOBE_LAB_PROVIDER` = `fake|vertex|fal|composite` (default `fake`).
- **Live verification (2026-07-19):** both canaries ran through the sanctioned seam. Vertex `image-generate` →
  Nano Banana, `candidate_ready`, `estimated==actual==10`, output `sha256:…`; the ten Fal models resolved live —
  the six text-driven ones generated end to end (Seedream 5 Pro, Recraft v4.1, Seed Audio, ElevenLabs TTS,
  Hyper3D Rodin GLB, Seedance 2.0). The four input-driven capabilities (edit/upscale/i2v) have verified slugs but
  fail closed `inputs_unavailable` until hash→bytes resolution lands.
- TASK-1459 (Still Model Lab) produced the first real recommendation matrix for the still portfolio — Vertex Nano
  Banana (10 credits / ~7 s) vs Fal Seedream 5 Pro (10 credits / ~138 s), both `objective_pass_pending_human`,
  differentiator = latency, craft verdict left to a human — and fixed a `route_stable` bug in the Fal adapter. It
  did not wait for the durable ledger or workbench.
- Follow-ups: hash→bytes resolution from the private evidence bucket, Globe's own Fal key (the live canary borrowed
  the repo key as a documented temporary exception), a `studio-web` deploy, and a fidelity-contract selector to
  replace the Composite's fixed policy.
- Code: `apps/creative-runner/src/{vertex-adapter,fal-adapter,composite-adapter}.ts`, wiring in
  `apps/studio-web/src/app.ts`. `pnpm check` + `pnpm build` green. Spec (do not duplicate):
  `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (§"Realización", §"Segundo adapter", expansion + live
  verification).

## 2026-07-19 — TASK-1458 Golden Briefs & Evaluation Harness (fake canary)

- Added `globe.lab.evaluation.run` (SPEC-003), the **second business capability on the TASK-1481 spine**: an
  evaluation command + readers that consume the Model Lab (`runModelLabExperiment`) to score golden briefs
  against versioned rubrics. The three seed briefs are the still `rrss-key-visual-still`, the motion
  `product-motion-loop` and the audio `glitch-microphone-foley`, each carrying declared rights.
- Separated objective automated checks from human criteria: the verdict is **never auto-`passed`** — it settles
  as `objective_fail` when a hard check fails, otherwise `objective_pass_pending_human` awaiting a reviewer.
  Reports are versioned, workspace-scoped and record their own limitations.
- Proven end to end with the same deterministic **fake** canary (zero spend, zero infrastructure); `ui` and
  `mcp` surfaces stay `policy-blocked`. The live rollout is shared with the TASK-1457 provider canary and remains
  **rollout pendiente**; the human-judgment `ui` surface and a durable report store are deferred.
- Code: `packages/domain/src/evaluation.ts`, wiring in `apps/studio-web/src/app.ts`, SDK in
  `packages/sdk/src/index.ts`, tests in `packages/domain/src/evaluation.test.ts`.
- `pnpm check` + `pnpm build` green. Spec: `docs/architecture/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`; runbook
  §7-ter in `docs/operations/EFEONCE_GLOBE_API_CONTRACT_SPINE_RUNBOOK_V1.md`.

## 2026-07-19 — TASK-1464 Keyless IaC platform foundation (code-complete, no apply)

- Reproducible Terraform for the non-production `efeonce-globe` project under
  `infra/terraform/`. Codifies TASK-1454's live resources with **import blocks** (4 service
  accounts, Vercel WIF pool/provider, Artifact Registry, deployer IAM, Cloud Build bucket
  roles — nothing recreated) and adds the new foundation: GitHub WIF for
  `efeoncepro/efeonce-globe`, deployer `run.admin` + act-as, a private Model Lab evidence
  bucket, GCS remote state, an opt-in billing budget + alerts, and a keyless-invariant
  observability signal (alerts on service-account key creation).
- Versioned outputs (`service_account_emails`, `github_wif_provider`, `lab_evidence_bucket`, …)
  are consumed by TASK-1457; the Model Lab never re-declares IaC.
- Keyless CI: `.github/workflows/terraform-check.yml` (fmt + validate on PR, no GCP) and
  `deploy-internal.yml` (OIDC → WIF → deployer, Cloud Build async+poll, private Cloud Run,
  describe-based health check — no service-account key). Reusable `cloudbuild/deploy.yaml`.
- Import/plan/apply runbook (`docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`): the live
  SAs/WIF mean apply happens only after a plan shows **zero destroy/replace**.
- `tofu validate` passes. **Supervised apply DONE (2026-07-19):** `tofu apply` against live
  GCP completed `23 imported, 13 added, 0 changed, 0 destroyed` — the TASK-1454 identity was
  adopted without a single destroy/replace, and the new foundation (GitHub WIF pool/provider
  ACTIVE, deployer run.admin + act-as, private lab-evidence bucket, SA-key-created log metric,
  remote state in gs://efeonce-globe-tfstate) is live. Verified: WIF provider ACTIVE, bucket
  and log metric present. Remaining to enable the TASK-1457 live canary: a real provider
  adapter, provider secrets in Secret Manager, a studio-web Dockerfile, the
  GCP_WORKLOAD_IDENTITY_PROVIDER GitHub secret, and flipping GLOBE_LAB_ENABLED.

## 2026-07-19 — TASK-1457 Safe Model Lab foundation (fake provider canary)

- Extended the TASK-1481 spine with the Model Lab experiment capability (`globe.lab.experiment.run`):
  prepare/execute/cancel commands and get/status/evidence readers, registered onto the spine registry with
  ui/mcp `policy-blocked` and http/sdk/cli/worker/e2e `available`. Contracts own the experiment schemas, the
  `CREATIVE_CAPABILITIES` vocabulary and the immutable `ExperimentAttemptManifestV1` (proposed vs actual route,
  cost, input/output hashes, lineage).
- Experiment state machine (`prepared → estimated → reserved → running → candidate_ready | failed | cancelled`)
  with server-derived authority: actor/workspace/capabilities from trusted context, workspace-scoped storage,
  not_found for cross-workspace access.
- Guardrails: `LabSpendFence` hard cap per run + per workspace/UTC-day (aborts before spend, idempotent,
  settle/release accounting) — a safety fence, not the TASK-1468 credit ledger; private-ingest policy (inputs
  cross the API only as content hash + declared rights, never raw bytes); a kill switch that fail-closes every
  experiment command to `policy_blocked`.
- Provider seam proven end to end with a deterministic **fake** reference adapter (`FakeReferenceAdapter`) +
  `LabRunner`: API/SDK → command → adapter → runner → manifest. No network, no spend, no infrastructure. The
  live provider canary (real credentials, storage, budgets) is **rollout pendiente**, gated on TASK-1464 and an
  explicit approval; `GLOBE_LAB_ENABLED` defaults OFF.
- `pnpm check` + `pnpm build` green (domain 29 tests, studio-web 26, creative-runner + provider-contract green).

## 2026-07-19 — TASK-1481 API contract spine and cross-surface conformance harness

- Separated the untrusted request payload from the server-derived trusted authority context. Command/reader
  envelopes carry no actor, capability or authoritative workspace field; a caller-provided `workspaceSelection`
  is validated against the principal's bindings and never confers authority.
- Added `CapabilityRegistry` as the single transport-neutral home for command/reader primitives, with per-surface
  coverage enforcement, canonical `CommandResultV1`/`ReaderResultV1`, a `policy_blocked` error code and machine-
  readable capability coverage (`available | policy-blocked | not-applicable`; `missing` is unrepresentable).
- Exposed the private API (`GET /v1/capabilities`, `POST /v1/commands`, `POST /v1/readers`) and typed SDK methods
  (`capabilities`, `dispatchCommand`, `dispatchReader`); the SDK is no longer health-only.
- Both auth planes derive the principal server-side: human federation (cookie session) in web mode, workload
  federation (IAM-gated service principal) in api mode. Real per-identity ID-token → principal mapping is deferred
  to TASK-1457.
- Added an inert spine fixture (`globe.spine.echo`, `globe.spine.status`) plus one reserved policy-blocked
  capability (`globe.run.prepare`, no handler until TASK-1457). No provider, storage or database is touched.
- Cross-surface conformance harness proves HTTP and SDK reach the same primitive with identical result/error/audit
  correlation, that header/body actor/workspace cannot spoof authority, that an unbound workspace selection is
  denied, and that the matrix is driven by the published coverage manifest (a new capability is exercised without
  editing the harness). `pnpm check` and `pnpm build` green.

## 2026-07-19

- Accepted the parallel EPIC-028 execution model: Model Lab, governed platform and commercial validation progress
  together, with separate lab-execution and production-promotion gates.
- Corrected task ownership: Greenhouse is the only control plane for `TASK-1456…1481`, hooks, plans, lint, QA,
  lifecycle and handoff. Globe retains the execution plan, implementation and technical evidence only; the
  temporary Globe-local namespace/registry/template were removed.
- Adopted Full API Parity by birth as an executable gate: `TASK-1481` owns trusted context, versioned
  contracts, private API/SDK coverage and conformance before provider integration; `TASK-1457` owns the first
  real canary through that seam and `TASK-1473` is packaging/certification only.
- Added the versioned Globe server SDK with injected authentication, timeouts, correlation context and sanitized error handling.
- Added a Google ADC ID-token adapter for private Cloud Run invocation without service-account keys.
- Added namespaced Globe capabilities and trusted principal/API contracts.
- Accepted ADR-001 for separate human SSO and keyless workload federation with Greenhouse.
- Documented local ADC operation and the explicit `code complete, rollout pendiente` state.
