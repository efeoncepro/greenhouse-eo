# TASK-1504 — Producer Capability Expansion (video frames/motion · audio change-voice/translate · multi-output omni · voice-preset registry)

## Delta 2026-07-22

- `TASK-1503` **complete** — el retrieval gobernado y las asset actions ya existen (siguen fuera del
  scope de esta task, como declara su §Out of Scope). Lo que sí cambia acá: `copyAsReference`
  **produce** `ProducerReferenceHandleV1` (`rights: 'derived-internal'` + `parentRights` heredado por
  `inheritedDerivedRights`). La **aceptación** de ese handle como input de frames / motion-control /
  change-voice sigue siendo contrato de esta task; `TASK-1503` sólo lo certifica y mintea.
- Al aceptarlo, respetar la regla que ya es única: un derivado **nunca** se blanquea a
  `internal-owned`, y un ancestro `licensed` sigue restringiendo aguas abajo.

## Delta 2026-07-20

- El catálogo de rutas donde estas capabilities declaran sus rutas **ya existe** (TASK-1500 complete):
  agregar una ruta = editar `PRODUCER_ROUTE_CATALOG` + subir `PRODUCER_CATALOG_VERSION` en
  `efeonce-globe/packages/domain/src/producer-catalog.ts` (drift guards abortan slug-leak/modality-mismatch).
  Los `RouteInputMode` ricos (`frames`, `motion-source`, `source-audio`, `mention`) ya están en el vocabulario
  de contracts; la ruta seed de video ya declara `frames`/`motion-source` como modos anunciados.
- **⚠️ Invariante de naming INVERTIDO en TASK-1500 (supersede el body de este spec).** El cuerpo describe
  "naming dual: modelo-real interno / fidelidad-curada cliente" — quedó **al revés**. Estado final: el **modelo
  real (nombre+versión) es PÚBLICO/client-facing**; lo operator-only es la **casa** (`house`, capability
  `globe.producer.route.reveal_house`). Lo que **sigue válido** (la mayoría de las menciones del body): el
  **slug del proveedor y el vendor voice id viven SOLO dentro del adapter** y nunca salen — eso no cambió. El
  voice-preset registry expone el nombre/preset público, nunca el vendor voice id. Al construir, re-derivar el
  naming contra el contrato final de TASK-1500 (`RouteModelIdentityV1` + `house` + `reveal_house`).


- **Delta 2026-07-20 — TASK-1501 complete:** el contrato de run ya declara y valida los selectores de video
  (`inputMode`: elements/frames{hasEndFrame}/motion/edit) y audio (`mode`: voiceover/change-voice/translate{targetLang}),
  validados fail-closed contra `route.inputModes` del catálogo. Esta task **solo cablea el provider** para leer
  esos selectores en los adapters de video/audio (frames/motion/change-voice/translate/omni) — NO re-modela el
  contrato. El threading image ya está hecho (`CreativeProviderRequestV1.quality/aspectRatio/count` +
  `toProviderRequest`); replicar el patrón para resolution/durationSeconds/audioMode/sampleRate/format/speed/
  volume/pitch en los adapters de video/audio, con verificación live de los field names del proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `TASK-1481, TASK-1500, TASK-1490`
- Branch: `task/TASK-1504-globe-producer-capability-expansion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Suma al Creative Producer las capabilities que el chassis compartido todavía no tiene, todas **detrás del provider seam** (`CreativeProviderAdapter`, nunca un SDK de proveedor directo), exactamente el patrón de los adapters reales `TASK-1486/1487/1488`: **video** — `video-frames` (keyframe start/end) y `video-motion-control` (motion transfer); **audio** — `audio-change-voice` (speech-to-speech) y `audio-translate` (dub/localización); **multi-output omni** — un run que emite `{video, audio}` con **cada output declarado por su `sha256`** en el manifest (rompe el supuesto "1 experimento = 1 output" del contrato actual, hay que modelarlo); y un **voice-preset registry** (voces reutilizables/clonadas, con naming dual — el slug de voz del proveedor vive solo en el adapter). Cada capability nace gobernada y **fail-closed pre-spend**, con `ui`/`mcp` `policy-blocked` hasta gate.

## Why This Task Exists

El chassis del Producer (`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`, §"Matriz de capabilities") declara qué produce cada modalidad, pero el runtime real de `efeonce-globe` solo tiene hoy las 10 `CREATIVE_CAPABILITIES` de `1457/1486/1487/1488` (`image-generate|image-edit|image-vectorize|image-upscale|video-generate|video-extend|video-upscale|audio-generate|speech-synthesize|model-3d-generate`, verificado en `packages/contracts/src/index.ts:23`). Faltan cinco piezas que el Producer necesita el día 1 y que el trabajo propio de Efeonce ya hace hoy en Higgsfield (voiceovers NEXA, campaña SKY):

1. **Video con control de composición** — el operador quiere fijar keyframes de inicio/fin (`video-frames`) o transferir un movimiento de una referencia (`video-motion-control`). Hoy solo existe `video-extend` (image-to-video de un solo seed), que no cubre ninguno de los dos.
2. **Audio de localización** — cambiar la voz de un clip existente (`audio-change-voice`, speech-to-speech) y doblar/traducir (`audio-translate`). Hoy solo hay `audio-generate` (TTS) y `speech-synthesize`.
3. **Multi-output omni** — el modelo Omni ya devuelve `outputs: readonly ProviderOutputV1[]` (un array; `vertex-omni-adapter.ts:241`), pero **el manifest `ExperimentAttemptManifestV1` colapsa todo a un `outputHashes: readonly string[]` plano sin media-type por output y a un `outputsRetained` booleano único** (`packages/contracts/src/index.ts:370,397`). Un run que emite `{video, audio}` no puede declarar honestamente que cada output es de una modalidad distinta con su propio `sha256`. Esto viola directamente la hard rule "**NUNCA** descartar un output de un run multi-output sin declararlo en el manifest".
4. **Voces reutilizables** — hoy no hay registro de voces: cada run TTS/change-voice re-declara la voz suelta. El Producer necesita presets (incluidas voces **clonadas** desde un audio de referencia) reusables por id, sin exponer el id de voz del proveedor en la superficie cliente.

Además, `resolveEditSource` en el dominio elige el output editable con `attempt.outputHashes[0]` (`model-lab.ts:415`): con multi-output esa selección "el primero" es incorrecta — hay que elegir el output por la modalidad que el edit pide. Es deuda que este trabajo debe cerrar, no arrastrar.

## Goal

- Extender el **wire SSOT** `CREATIVE_CAPABILITIES` con `video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`, cada una ruteada **solo dentro de un adapter** (slug de proveedor confinado al adapter; naming dual intacto) y validada **fail-closed pre-spend** contra los constraints de la ruta (catálogo `TASK-1500`).
- Modelar **multi-output** en el manifest: cada output de un run se declara con `{ sha256, mediaType, mimeType, outputsRetained }`; un run omni `{video, audio}` retiene y declara **ambos**; ningún output se descarta en silencio; `resolveEditSource` elige el output por modalidad, no por índice `[0]`.
- Nacer un **voice-preset registry** gobernado (command + readers transport-neutral, workspace-scoped, naming dual, Full API Parity + coverage matrix), referenciable por los runs de audio vía un `voicePreset` que el runner resuelve a la voz del proveedor **dentro del adapter**.
- Todas las capabilities nuevas **detrás del `CreativeProviderAdapter`**, gobernadas por kill switch (default OFF) + spend fence, con `ui`/`mcp` `policy-blocked` hasta el gate de promoción y el canary billable en vivo como decisión humana explícita (idéntico a `1486/1487/1488`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — la spec fuente. Esta task implementa la fila **TASK-1504** de la tabla "primitivos → tasks (N1–N6)" y las capabilities "Nuevas que el Producer necesita" de §"Matriz de capabilities".
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — contexto del gap.
- `.claude/skills/greenhouse-globe/SKILL.md` — contrato de arquitectura, provider seam sagrado, boundary Globe↔Greenhouse, Full API Parity por nacimiento, patrón de los adapters reales (§"El tercer ejemplo trabajado").
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — la capability nace con contrato gobernado a nivel capability.

Reglas obligatorias (heredadas de la spec fuente §Boundary/Hard rules; repetidas aquí porque son load-bearing):

- **El código vive en `efeonce-globe`; Greenhouse gobierna lifecycle/docs/evidencia.** NUNCA crear ni mantener doc gobernante dentro de `efeonce-globe/docs/**`; el cierre documental de esta task se hace en Greenhouse (`creative-studio/`).
- **Provider seam sagrado.** Toda capability nueva (`video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`, multi-output, la voz clonada del registry) se invoca **detrás del `CreativeProviderAdapter`** (`apps/creative-runner/src/*-adapter.ts`), **NUNCA** un SDK de proveedor directo desde el handler, la UI, MCP, CLI, scripts ni tests.
- **Naming dual / slug confinado.** El slug del modelo o de la voz del proveedor vive **solo dentro del adapter** (`FAL_ROUTING`/`OMNI_ROUTING`/`VERTEX_ROUTING` u homólogos, y una voice-map dentro del adapter de audio). El catálogo (`1500`) y el registry exponen dos vistas: modelo-real interno / fidelidad-curada cliente. `actualRoute` es el route del contrato de fidelidad, **NO** el slug (bug real corregido en el adapter Fal — §recommendation matrix del skill).
- **La unidad de crédito es `ruta × output-shape`, nunca el modelo.** El estimate/fence se computan de esa dimensión; un fallback nunca convierte provider/modelo en unidad de crédito.
- **Contrato discriminado fail-closed.** Un param o input-mode fuera de los constraints de la ruta (duración/resolución/sampleRate/idioma/referencia faltante) rechaza **antes** de reservar crédito, no en runtime.
- **Private-ingest para toda referencia.** Keyframes (start/end), source de motion-control, source de change-voice/translate y el audio fuente de una voz clonada cruzan como **`hash + rights`**, nunca bytes crudos por la API; se resuelven server-internal por track B (`resolvedInputs`/`editReference` en `CreativeProviderRequestV1`, herencia `derived-internal` de `1490`).
- **Multi-output explícito.** El manifest declara cada output con su `sha256`; ningún output se descarta silenciosamente (regla `outputsRetained` de `1490` generalizada a N outputs).
- **Full API Parity por nacimiento** con `ui`/`mcp` `policy-blocked` hasta gate; kill switch default OFF (`GLOBE_LAB_PROVIDER=fake`); canary billable en vivo = decisión humana.

## Normative Docs

- `../efeonce-globe/AGENTS.md` — reglas operativas del repo hermano (scripts `pnpm check` / `pnpm build`, boundary, no compartir secretos de provider).
- Skills de referencia de proveedor (para verificar slugs/modelos, NUNCA para instanciar SDK en dominio): `audio-studio` / `motion-design-studio` (matrices de modelos de audio/video IA). El slug se verifica antes de cablearlo (Fal: `POST {}` a `https://fal.run/<slug>` → 404 inexistente / 422 existe).

## Dependencies & Impact

### Depends on

- `TASK-1481` (`complete`) — API Contract Spine: `CapabilityRegistry`, `registerCommand/registerReader`, `CapabilityDescriptorV1`, `GLOBE_SURFACES`, `SurfaceCoverageState`, dispatch fail-closed sobre `policy-blocked`. El voice-preset registry se registra sobre este spine.
- `TASK-1500` (`to-do`, keystone) — Governed Route/Model Catalog: expone por ruta los **constraints** (resolución/duración/sampleRate/formato/count/idiomas), **specialty**, modos de input soportados y **naming dual**. Esta task valida los input-modes/output-shape de las capabilities nuevas **contra** esos constraints, fail-closed pre-spend, y agrega las rutas nuevas como **dato versionado** del catálogo.
- `TASK-1490` (`complete`) — Cross-Model Edit/Refine: `editFrom`/`editSource`, retención de outputs (`OutputIngestPort`/`GcsOutputIngest`, `output-ingest.ts`), `resolvedInputs`/`editReference` (track B), `providerRunChainable`. Los input-modes de las capabilities nuevas reutilizan exactamente esta maquinaria de private-ingest y resolución hash→bytes.
- Runtime existente a extender: `packages/contracts/src/index.ts`, `packages/provider-contract/src/index.ts`, `packages/domain/src/model-lab.ts`, `apps/creative-runner/src/{composite,fal,vertex,vertex-video,vertex-omni}-adapter.ts`, `apps/creative-runner/src/output-ingest.ts`.

### Blocks / Impacts

- `TASK-1505` (Producer Surface UI) — los paneles Video (Create[Frames]/Motion) y Audio (ChangeVoice/Translate + voice-preset) consumen estas capabilities; el feed unificado muestra runs multi-output.
- **Coordina con `TASK-1501`** (Modality-Discriminated Run Contract): los input-modes que esta task consume a nivel provider-request (`frames{start,end?}`, `motion{source}`, `changeVoice{sourceId}`, `translate{sourceId,targetLang}`, `voicePreset`) son exactamente los del union discriminado público de `1501`. `1504` NO está bloqueada por `1501` (corren en paralelo), pero **las capabilities nacen diseñadas para encajar en el union de `1501`**: `1504` cablea capability + route + los campos de referencia/resolución server-internal; `1501` moldea el payload público + valida output-shape contra `1500`. No duplicar la validación: la de shape vive en `1501`+`1500`; la de input-mode presente/resuelto vive aquí (fail-closed si falta la referencia que la ruta exige).
- `TASK-1474` (Professional Studio Workbench) — hereda estas capabilities por el mismo seam.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (capability vocab + manifest multi-output + tipos del voice-preset registry)
- `../efeonce-globe/packages/provider-contract/src/index.ts` (campos del request para input-modes de las caps nuevas, si faltan)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (ingesta/declaración multi-output; fix `resolveEditSource` por modalidad; voice-preset registry commands/readers)
- `../efeonce-globe/apps/creative-runner/src/{fal,vertex-omni,vertex-video}-adapter.ts` + `composite-adapter.ts` (route tables + voice-map, slug confinado)
- `../efeonce-globe/apps/creative-runner/src/output-ingest.ts` (ingesta por-output N)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (delta de cierre en Greenhouse)
- `docs/tasks/to-do/TASK-1504-globe-producer-capability-expansion.md`

## Current Repo State

### Already exists

- **Provider seam** (`packages/provider-contract/src/index.ts`): `CreativeProviderAdapter<TRequest>` (`providerId`/`supports`/`estimate`/`submit`/`poll`); `CreativeProviderRequestV1` con `capability`, `route`, `prompt?`, `inputHashes`, `resolvedInputs?`, `editReference?`, `previousInteractionId?`, `hardCapCredits`; `ProviderOutputV1 = { sha256, mediaType, mimeType, bytes }` con `ProviderOutputMediaType = image|video|audio|text|model-3d`; `ProviderAttemptResult` con `outputHashes` + `outputs?: readonly ProviderOutputV1[]` (**el array ya existe en el seam**).
- **Wire SSOT** (`packages/contracts/src/index.ts:23`): `CREATIVE_CAPABILITIES` (10 valores). Agregar una capability = editar esta tupla (dato). `PrepareExperimentPayloadV1` (hoy `prompt?` plano + `editFrom`). `ExperimentAttemptManifestV1` con `outputHashes: readonly string[]` + `outputsRetained?: boolean` (plano, sin per-output media type).
- **Dominio** (`packages/domain/src/model-lab.ts`): `registerModelLabCapabilities` con `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`, ejecutables `available`, `sister-platform` `not-applicable`); `executeExperiment` (estimate→fence→run→settle); `resolveEditSource` (usa `outputHashes[0]` + `editBaseMediaType` un-media-por-capability); ports inyectados (`ExperimentStorePort`/`SpendFencePort`/`LabRunnerPort`/`LabKillSwitchPort`); `InMemoryExperimentStore` (TASK-1465 la reemplaza).
- **Adapters reales** (`apps/creative-runner/src/*`): `FalCreativeAdapter` (`FAL_ROUTING`, ElevenLabs TTS `fal-ai/elevenlabs/tts/multilingual-v2`, Seed Audio, Seedance video, `supports = capability in FAL_ROUTING`); `VertexOmniAdapter` (Interactions API, `OMNI_ROUTING`, **ya devuelve `outputs` como array**, dual-transport generate/edit); `VertexVideoAdapter` (Veo, `predictLongRunning`); `CompositeProviderAdapter` (routing por `supports()` + política explícita para overlap, `poll` fiel al emisor). Slug siempre confinado al adapter.
- **Multi-output write path** (`apps/creative-runner/src/output-ingest.ts`): `OutputIngestPort`/`GcsOutputIngest` persiste content-addressed por `sha256`; idempotente por construcción; un fallo degrada a `outputsRetained: false` sin destruir el candidato pagado.

### Gap

- `CREATIVE_CAPABILITIES` no tiene `video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`. Ningún adapter las rutea; `validatePreparePayload` las rechazaría (fail-closed correcto, pero la capability no existe todavía).
- `ExperimentAttemptManifestV1` colapsa multi-output a `outputHashes: string[]` + `outputsRetained` booleano **único** → un run `{video, audio}` no puede declarar cada output con su modalidad + `sha256` + retención. `resolveEditSource` elige `outputHashes[0]` (incorrecto con multi-output) y `editBaseMediaType` asume una modalidad por capability.
- No hay voice-preset registry: no existe forma de registrar/listar/resolver una voz reusable (incluida una clonada por referencia) con naming dual.
- No hay validación de input-mode presente/resuelto para las capabilities nuevas contra los constraints del catálogo (`1500`) antes del fence.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/provider-contract`, `packages/domain`, `apps/creative-runner`)
- Future candidate home: `remain-shared`
- Boundary: el `CreativeProviderAdapter` (único punto de invocación de proveedor, en `apps/creative-runner`) + el wire SSOT `CREATIVE_CAPABILITIES` (`packages/contracts`) + el `CapabilityRegistry` del spine (`1481`). Consumers autorizados: el `LabRunner`/comando `execute` para las capabilities de run; el registry del spine para el voice-preset registry; `TASK-1505` (UI) y `1474` (Workbench) como thin clients de esos commands/readers.
- Server/browser split: adapters, runner, secretos de provider (`GLOBE_FAL_API_KEY`, `globe-gemini-api-key`), resolución hash→bytes y la voice-map viven **server-only**; jamás cruzan al browser. La UI solo ve capability + fidelidad-curada + estimate + hashes de output.
- Build impact: `none` — reutiliza los adapters Fal/Vertex/Omni existentes; sin dependencia pesada nueva ni entrypoint global. Las rutas nuevas son dato en las route tables.
- Extraction blocker: el provider seam + spend fence + kill switch + track B (private-ingest) son cross-runtime (creative-runner); no se puede desplegar independiente del runner. No se crean `apps/*`/`packages/*` nuevos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (aditivo + gated; controles critical-adjacent: el canary billable en vivo es un gate humano explícito, como `1486/1487/1488`)
- Impacto principal: `command` (+ `reader` para el voice-preset registry; + `contract`/`integration` por el seam de provider)
- Source of truth afectado: `CREATIVE_CAPABILITIES` (wire SSOT, `packages/contracts`), `ExperimentAttemptManifestV1` (manifest inmutable), las route tables de los adapters (naming dual), y el nuevo `VoicePresetStorePort` (registry workspace-scoped)
- Consumidores afectados: `UI` (1505), `worker` (creative-runner), `sdk`/`http`/`cli`/`e2e`; `mcp` `policy-blocked`
- Runtime target: `worker` (Cloud Run creative-runner) + `local`/`staging`; canary billable = decisión humana

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/index.ts` (`CREATIVE_CAPABILITIES`, `PrepareExperimentPayloadV1`, `ExperimentAttemptManifestV1`, `GLOBE_SURFACES`, `SurfaceCoverageState`, `CapabilityDescriptorV1`); `packages/provider-contract/src/index.ts` (`CreativeProviderAdapter`, `CreativeProviderRequestV1`, `ProviderOutputV1`, `ProviderAttemptResult`); `packages/domain/src/model-lab.ts` (registry, `executeExperiment`, `resolveEditSource`); `apps/creative-runner/src/*-adapter.ts` + `output-ingest.ts`.
- Contrato nuevo o modificado:
  - **+4 valores** en `CREATIVE_CAPABILITIES` (`video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`).
  - **`ExperimentAttemptManifestV1`**: nuevo campo opcional `outputs?: readonly LabOutputDescriptorV1[]`, con `LabOutputDescriptorV1 = Readonly<{ sha256; mediaType: 'image'|'video'|'audio'|'model-3d'; mimeType: string; outputsRetained: boolean }>`. `outputHashes`/`outputsRetained` (plano) se conservan por compat (espejo del primer/único output).
  - **Voice-preset registry**: `VoicePresetV1 = Readonly<{ presetId; workspaceId; fidelityName; kind: 'catalog'|'cloned'; sourceRights?: LabInputRights; createdAt }>` (naming dual: **sin** vendor voice id); command `globe.voice.preset.register`, readers `globe.voice.preset.list` / `globe.voice.preset.get`; authority capability nueva `globe.voice.preset.manage` en `GLOBE_CAPABILITIES`.
  - **`CreativeProviderRequestV1`**: reutiliza `resolvedInputs`/`editReference` para keyframes/motion/change-voice/translate; agregar `voicePreset?: string` (id del preset; el adapter lo resuelve a voz de proveedor) **solo si no cabe** en el mapeo existente — evaluar en Plan Mode antes de ampliar el request neutral.
- Backward compatibility: `gated` + `compatible` (aditivo). Los 4 valores nuevos son opt-in; un caller que no los envía no cambia. El campo `outputs?` es opcional (consumers viejos leen `outputHashes`). Los commands/readers del registry nacen `policy-blocked` en `ui`/`mcp`.
- Full API parity: el voice-preset registry nace como command/reader transport-neutral en el spine (`registerCommand`/`registerReader`) con su `CapabilityDescriptorV1` + coverage matrix completa; los 4 valores de capability ruedan por los commands `globe.lab.experiment.prepare|execute` ya gobernados (parity heredada). Ningún consumer duplica lógica: la voz se resuelve en el adapter; la validación de input-mode en el dominio; el shape en `1500/1501`.

### Data model and invariants

- Entidades/tablas/views afectadas: `CREATIVE_CAPABILITIES` (enum de contrato), `ExperimentAttemptManifestV1` (evidencia inmutable append-only), `VoicePreset` (registry workspace-scoped, vía `VoicePresetStorePort`; in-memory default, TASK-1465 lo persiste).
- Invariantes que no se pueden romper:
  - **Slug/vendor-voice-id confinado al adapter** (naming dual): jamás en el contrato, el dominio, el manifest, el registry ni la superficie cliente.
  - **Multi-output declarado**: todo output de un run se registra con su `sha256` + `mediaType`; ninguno se descarta sin declararlo; retención por-output (`outputsRetained` por descriptor), fallo de storage degrada a `false` sin destruir el candidato pagado.
  - **Private-ingest**: keyframes, motion source, change-voice/translate source y audio fuente de voz clonada cruzan como `hash + rights`, nunca bytes crudos; resueltos server-internal (track B).
  - **Fail-closed pre-spend**: input-mode faltante/no resuelto, o shape fuera de los constraints de la ruta (`1500`), rechaza **antes** del `fence.reserve`.
  - **Unidad de crédito = ruta × output-shape**, nunca el modelo.
  - **Tenant-safe**: un preset o experimento de otro workspace es `not_found` (`capability_not_found` → `not_found`), nunca revela existencia.
- Tenant/space boundary: `workspaceId` se deriva de `TrustedCommandContextV1` (server-side); el registry y el store son workspace-scoped; una selección de workspace del caller se valida contra `workspaceBindings`, nunca los extiende.
- Idempotency/concurrency: `execute` es replay idempotente (existente); `globe.voice.preset.register` idempotente por `idempotencyKey` + contenido; la ingesta de outputs es idempotente por construcción (content-addressed).
- Audit/outbox/history: el `ExperimentAttemptManifestV1` es la evidencia inmutable por-attempt (proposed vs actual route, multi-output, lineage); el voice-preset registry es append-only (registrar; nunca mutar in place — una voz nueva es un preset nuevo).

### Migration, backfill and rollout

- Migration posture: `none` — persistencia in-memory (`InMemoryExperimentStore` + `VoicePresetStorePort` in-memory default) hasta TASK-1465; el campo `outputs?` del manifest es aditivo/opcional. Sin DDL en Globe.
- Default state: `flag OFF` — kill switch `labEnabled` default OFF; `GLOBE_LAB_PROVIDER` default `fake` (hermético, gasto cero); las nuevas capabilities no ejecutan proveedor real hasta que (a) haya route table entry, (b) se elija un provider real por env, (c) pase el canary billable humano. Commands del registry `policy-blocked` en `ui`/`mcp`.
- Backfill plan: `none` — los manifests históricos siguen leyéndose por `outputHashes`; no se reescribe historia.
- Rollback path: `flag off` (`GLOBE_LAB_PROVIDER=fake` / kill switch OFF) + revert del PR. Cada slice es aditivo → revert directo.
- External coordination: secretos ya provisionados (`GLOBE_FAL_API_KEY`, `globe-gemini-api-key`, `secretAccessor` de la runtime SA, trackeados en Terraform de Globe). **NUNCA** usar `greenhouse-fal-api-key` (no cruza el boundary). Verificar slugs de modelo/voz nuevos contra las skills de proveedor antes de cablear.

### Security and access

- Auth/access gate: `globe.lab.experiment.run` (capabilities de run, service principal en `api` mode); `globe.voice.preset.manage` (capability nueva, granteada al service principal, `ui`/`mcp` `policy-blocked`). Autorización final por `#authorize` del registry (coverage de surface → `trustedContextHasCapability`, fail-closed).
- Sensitive data posture: `PII`-adjacent — el audio fuente de una **voz clonada** es la voz de una persona; cruza solo como `hash + rights` (`internal-owned|licensed|test-fixture`) con consentimiento/derechos declarados; jamás bytes crudos por la API ni logueados. El registry no guarda el vendor voice id en superficie.
- Error contract: `InvalidExperimentRequestError` → `invalid_request` (payload/input-mode malformado o referencia faltante); `capability_not_found` → `not_found` (experimento/preset desconocido o cross-workspace); `surface_policy_blocked` → `policy_blocked`. Errores de runner con `reason` sanitizado (enum propio, nunca prosa/token de proveedor).
- Abuse/rate-limit posture: spend fence hard-cap por run + day-cap por workspace (existente); batch-of-N por modalidad acotado por el fence (umbral por modalidad en `1500`/open question); replay idempotente evita doble gasto.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check && pnpm build` verdes. Tests unitarios por adapter con transports/dobles inyectados (cero gasto): route table incluye la capability nueva; `supports()` la reconoce; `estimate` no toca red; multi-output → manifest con N descriptores; `resolveEditSource` elige el output por modalidad; registry register/list/get tenant-safe.
- DB/runtime checks: N/A (in-memory hasta TASK-1465).
- Integration checks: verificación de slug de modelo/voz nuevo (Fal `POST {}` → 404/422) **antes** de cablear; canary billable en vivo **gated por humano** (una capability real ejecutada bajo el fence con `GLOBE_LAB_PROVIDER` real), evidencia registrada como en `1486/1487/1488`.
- Reliability signals/logs: `reason` sanitizado del runner en fallos; `outputsRetained: false` observable si degrada storage; el manifest inmutable es la evidencia por-attempt.
- Production verification sequence: (1) `pnpm check && pnpm build` local. (2) Deploy con `GLOBE_LAB_PROVIDER=fake` → verificar que las capabilities existen, `policy-blocked` en `ui`/`mcp`, y que un run fake multi-output declara N descriptores. (3) Verificar slugs nuevos (404/422). (4) Canary billable humano por capability nueva (video-frames, motion, change-voice, translate, omni multi-output) → 1 run real bajo fence → evidencia. (5) Monitorear degradaciones de retención.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (`packages/contracts/src/index.ts`, `packages/domain/src/model-lab.ts`, `apps/creative-runner/src/*-adapter.ts`, `output-ingest.ts`).
- [ ] Invariantes (naming dual, multi-output declarado, private-ingest, fail-closed pre-spend, ruta×shape, tenant-safe), boundary y idempotencia explícitos.
- [ ] Migration/backfill/rollback posture explícito y proporcional (aditivo + gated; sin migración; revert por flag/PR).
- [ ] Evidencia runtime listada (`pnpm check && pnpm build` + tests por adapter con dobles + canary billable humano).
- [ ] Dominio sensible (voz clonada = PII-adjacent) con errores canónicos, `hash+rights`, y cero leak de bytes/vendor id.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Las capabilities viven en `CREATIVE_CAPABILITIES` + adapters (`apps/creative-runner`) + dominio (`model-lab.ts`); el registry en `packages/domain` vía `CapabilityRegistry`. Cero lógica en componentes UI.
- [ ] **Modelada como command/adapter/registry**, no como click-handler: las 4 caps ruedan por `globe.lab.experiment.*`; el voice-preset registry es command+readers propios.
- [ ] **Read/Write gobernados:** el registry expone `register` (command idempotente, authorization fina `globe.voice.preset.manage`, audit por append-only, errores canónicos) + `list`/`get` (readers workspace-scoped). Los runs de las caps nuevas heredan las command semantics del Lab.
- [ ] **Capability + grant en el MISMO PR:** `globe.voice.preset.manage` en `GLOBE_CAPABILITIES` + grant al service principal + coverage matrix completa en su `CapabilityDescriptorV1` (surface omitida = error de compilación).
- [ ] **Camino programático declarado:** `http`/`sdk`/`cli`/`worker`/`e2e` `available`; `ui`/`mcp` `policy-blocked` hasta gate (1505 + promoción); `sister-platform` `not-applicable`.
- [ ] **Write apto para `propose → confirm → execute`:** las caps corren por el `execute` gobernado del Lab (fence + kill switch); el registry register es un write gobernado, no una integración Nexa-específica.
- [ ] **Un primitive, muchos consumers:** UI (1505), Workbench (1474), sdk/cli/worker/e2e consumen los mismos commands/readers; cero lógica duplicada por consumer.
- [ ] **Parity check = SÍ:** cada capability nueva tiene contrato gobernado a nivel capability → todos los consumers (incl. Nexa vía MCP cuando se promueva) la operan por construcción.

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

### Slice 1 — Capability vocabulary + fail-closed pre-spend (foundation)

- Agregar `video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate` a `CREATIVE_CAPABILITIES` (`packages/contracts/src/index.ts`). Es dato: `validatePreparePayload` ya las aceptará una vez en la tupla; `editBaseMediaType` debe mapear cada una a su modalidad (`video-*` → video, `audio-*` → audio).
- Declarar el requisito de input-mode por capability (qué referencias exige cada una) y validarlo **fail-closed antes del fence** contra los constraints de la ruta del catálogo (`1500`): `video-frames` exige ≥1 keyframe start (end opcional); `video-motion-control` exige un source de movimiento; `audio-change-voice` exige un source audio; `audio-translate` exige source audio + `targetLang` dentro de los idiomas de la ruta. Referencia faltante/no resuelta → `invalid_request` pre-spend.
- Agregar las rutas nuevas como **dato versionado** al catálogo de `1500` (constraints + specialty + naming dual). NO tocar código para agregar una ruta.

### Slice 2 — Video sub-family behind the seam (`video-frames`, `video-motion-control`)

- Cablear las dos capabilities **dentro de un adapter** (route table entry con slug confinado): keyframes y motion-control ruteando al motor verificado (Omni `reference_to_video` / Veo / Seedance según fidelidad; decidir en Plan Mode contra las skills de proveedor y el default composite policy). `supports()` = `capability in <ROUTING>`.
- Los inputs (keyframes start/end, source de motion) se resuelven por track B (`resolvedInputs`/`editReference`) en el único punto de invocación; el adapter los traduce a su formato de referencia. `actualRoute` = route de fidelidad, NO slug.
- Tests con transport doble: `supports` reconoce las caps; `estimate` no toca red; un submit con referencia resuelta produce output; sin referencia → falla cerrado.

### Slice 3 — Audio sub-family behind the seam (`audio-change-voice`, `audio-translate`)

- Cablear speech-to-speech (`audio-change-voice`) y dub/translate (`audio-translate`) en el adapter de audio (ElevenLabs u homólogo; slug/`fal-ai/...` confinado). Source audio por track B; `audio-translate` lleva `targetLang`.
- Integrar `voicePreset` (id) como input opcional del run de audio: el adapter resuelve preset→voz de proveedor por su voice-map interna (Slice 5). Si el preset no existe/cross-workspace → `not_found`.
- Tests con doble: routing + resolución de source + `targetLang` dentro de constraints + fail-closed sin source.

### Slice 4 — Multi-output modeling (omni `{video, audio}`)

- Extender `ExperimentAttemptManifestV1` con `outputs?: readonly LabOutputDescriptorV1[]` (`{ sha256, mediaType, mimeType, outputsRetained }`), conservando `outputHashes`/`outputsRetained` planos por compat.
- En `executeExperiment`/runner: ingerir **cada** `ProviderOutputV1` (el array ya existe en el seam) y declarar su descriptor; ningún output se descarta; retención por-output; fallo de storage degrada ese output a `outputsRetained: false` sin romper los demás.
- Corregir `resolveEditSource`: elegir el output editable por la **modalidad** que el edit pide, no por `outputHashes[0]`; `EDITABLE_OUTPUT_MEDIA` sigue excluyendo `model-3d`.
- Tests: un run omni con dos outputs → manifest con dos descriptores de modalidad distinta; edit sobre el video de un `{video,audio}` selecciona el output video.

### Slice 5 — Voice-preset registry (Full API Parity)

- `VoicePresetStorePort` (in-memory default; TASK-1465 lo persiste) + `VoicePresetV1` (naming dual, sin vendor voice id) + `kind: 'catalog'|'cloned'`.
- Command `globe.voice.preset.register` (una voz `catalog` referencia una voz curada; una voz `cloned` referencia un source audio por `hash + rights` — private-ingest, PII-adjacent, consent/rights declarados) + readers `globe.voice.preset.list`/`get`, registrados en el spine con `CapabilityDescriptorV1` + coverage matrix (`ui`/`mcp` `policy-blocked`) + capability `globe.voice.preset.manage` + grant al service principal.
- Voice-map (preset→vendor voice id) **dentro del adapter de audio**; el dominio/registry nunca ven el id de proveedor.
- Tests: register idempotente; list/get tenant-safe (`not_found` cross-workspace); una voz clonada rechaza source sin `rights`; el adapter resuelve el preset sin exponer el vendor id.

## Out of Scope

- El **output-shape público discriminado** y su validación contra `1500` — es `TASK-1501` (esta task consume input-modes a nivel provider-request y valida presencia/resolución de referencia; no re-implementa el union público).
- El **estimate previewable** (`✨N` pre-spend) — es `TASK-1502`.
- El **retrieval gobernado** (hash→bytes servible, download/preview, asset actions) — es `TASK-1503`.
- La **superficie UI** (paneles Video/Audio, feed unificado, Recreate) — es `TASK-1505`.
- **Inpaint / regional edit** (`image-edit` con región) — es `TASK-1497`; reusar su patrón `editFrom`+region, **no duplicarlo** aquí.
- La capa completa de **provenance/rights/retención** durable — es `TASK-1467`. El **ledger comercial** durable — `TASK-1468` (el Producer usa el spend fence de seguridad).
- Persistencia real (SQL) del store de experimentos/presets — `TASK-1465`.

## Detailed Spec

Patrón a copiar (idéntico a `1486/1487/1488`, §"tercer ejemplo trabajado" del skill `greenhouse-globe`): agregar una capability = (1) valor en el wire SSOT `CREATIVE_CAPABILITIES`; (2) route table entry **dentro del adapter** con slug confinado + `supports()` que la reconoce; (3) el handler/domain no cambia — rueda por el `execute` del Lab detrás del seam; (4) coverage se declara/voltea en el descriptor cuando aplica (solo el voice-preset registry tiene descriptor propio). El video no es servible por `generateContent` (frontera dura verificada): `video-frames`/`video-motion-control` van por Omni Interactions / Veo `predictLongRunning` / Fal Seedance según fidelidad — nunca por el adapter image-only.

Multi-output: el seam ya devuelve `outputs?: readonly ProviderOutputV1[]` con `mediaType` por output; la deuda es del **manifest** (colapsa a `outputHashes` plano). `LabOutputDescriptorV1` cierra esa brecha. La ingesta reusa `OutputIngestPort` (`output-ingest.ts`) por cada output (idempotente content-addressed). La hard rule "ningún output se descarta sin declararlo" se cumple cuando **cada** `ProviderOutputV1` produce un descriptor en el manifest.

Voice-preset registry: un asset propio, workspace-scoped, naming dual. Open question de la spec fuente: "¿es asset propio o extiende el treatment registry de `1493`?" — se resuelve como **registry propio** (una voz no es un treatment de estilo; su rights posture y su ciclo de clonación son distintos), con nota de que podría converger con el registry de `1493` si el treatment registry aterriza primero. El vendor voice id vive **solo** en la voice-map del adapter.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (capability vocab + fail-closed) MUST ship BEFORE Slice 2 y 3** — las route tables de video/audio referencian los valores nuevos del wire SSOT; cablear un adapter contra una capability que no existe en la tupla no compila.
- **Slice 4 (multi-output manifest) MUST ship BEFORE habilitar cualquier ruta omni multi-media** — sin `LabOutputDescriptorV1` un run `{video, audio}` colapsaría/descartaría un output (viola la hard rule). El fix de `resolveEditSource` va en Slice 4 junto al modelo.
- **Slice 5 (voice-preset registry) puede correr en paralelo con 2–4**, pero la resolución `voicePreset` del run de audio (Slice 3) queda **inerte** (opt-in, ignora preset ausente) hasta que Slice 5 provea el store + la voice-map. Slice 3 no debe hardcodear voces.
- Ningún slice voltea `ui`/`mcp` a `available` ni prende `GLOBE_LAB_PROVIDER` real por default: eso es gate humano posterior.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Slug de modelo/voz de proveedor filtra a superficie cliente o al contrato | provider seam / contract | medium | slug confinado a la route table/voice-map del adapter; `actualRoute` = fidelidad no slug; test que asserta que el manifest/registry no contienen el slug | review + test de "no vendor slug in wire" |
| Un run multi-output descarta el segundo output en silencio | manifest / outbox | medium | `LabOutputDescriptorV1` por cada `ProviderOutputV1`; test omni `{video,audio}` → 2 descriptores; ingesta por-output | `outputsRetained:false` observable; test rojo |
| Referencia (keyframe/motion/source) llega sin resolver → gasto en un run que falla en runtime | spend / provider | medium | validación fail-closed pre-fence (Slice 1); un input-mode sin referencia resuelta rechaza antes de `fence.reserve` | `invalid_request` pre-spend; fence sin reserva |
| Audio de voz clonada (PII) cruza como bytes crudos o se loguea | identity / privacy | low | private-ingest `hash+rights`; consent/rights obligatorio; error sanitizado; jamás bytes en API/log | review; test de rechazo sin `rights` |
| Canary billable prende gasto real por accidente | spend | low | `GLOBE_LAB_PROVIDER` default `fake` + kill switch OFF; canary = decisión humana declarada; fence hard-cap | fence day-cap; evidencia de canary |
| `resolveEditSource` sigue eligiendo `[0]` y edita el output equivocado de un run multi-output | domain | medium | fix por-modalidad en Slice 4 + test edit-video-de-{video,audio} | test rojo |

### Feature flags / cutover

- Kill switch `labEnabled` (default OFF) y `GLOBE_LAB_PROVIDER` (default `fake`, hermético/gasto cero) gobiernan toda ejecución real — sin flag nuevo. Prender un provider real = decisión de env explícita + canary humano.
- Coverage `ui`/`mcp` `policy-blocked` en el descriptor del voice-preset registry: promoción a `available` es un gate posterior (1505 + humano), no parte de esta task.
- Revert: `GLOBE_LAB_PROVIDER=fake` / kill switch OFF + revert PR. Tiempo de revert: inmediato (env) / <5 min (revert). (Este es un flag de runtime de Globe, no un `*_ENABLED` de Vercel/ops-worker de Greenhouse — no aplica el ledger de flags de Greenhouse.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (capability vocab) | revert PR (aditivo: quita valores de la tupla) | inmediato | sí |
| Slice 2 (video seam) | revert route table entry; capability queda sin adapter → fail-closed | inmediato | sí |
| Slice 3 (audio seam) | revert route table entry | inmediato | sí |
| Slice 4 (multi-output) | revert campo `outputs?` (opcional; consumers leen `outputHashes`) | inmediato | sí |
| Slice 5 (voice-preset registry) | revert commands/reader + capability + grant; sin datos persistidos (in-memory) | inmediato | sí |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes (local).
2. Deploy con `GLOBE_LAB_PROVIDER=fake` + kill switch OFF → verificar: las 4 capabilities existen en `CREATIVE_CAPABILITIES`; un run fake multi-output declara N descriptores; registry `policy-blocked` en `ui`/`mcp`; input-mode faltante rechaza pre-spend.
3. Verificar slugs de modelo/voz nuevos antes de cablear real (Fal `POST {}` → 404/422; Vertex/Omni región correcta).
4. Canary billable **humano** por capability nueva (`video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`, omni multi-output): 1 run real bajo fence → evidencia (`actualRoute`, créditos, `outputs` con `sha256`), como `1486/1487/1488`.
5. Monitorear degradaciones de retención (`outputsRetained:false`) y `reason` sanitizado del runner.

### Out-of-band coordination required

- N/A de infraestructura nueva: secretos ya provisionados en Globe (`GLOBE_FAL_API_KEY`, `globe-gemini-api-key`, `secretAccessor` de la runtime SA, en Terraform). **NUNCA** cruzar `greenhouse-fal-api-key`. La decisión de prender un provider real y correr el canary billable es del operador (gate humano).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `CREATIVE_CAPABILITIES` incluye `video-frames`, `video-motion-control`, `audio-change-voice`, `audio-translate`; `editBaseMediaType` mapea cada una a su modalidad.
- [ ] Cada capability nueva se rutea **dentro de un adapter** (slug confinado, `supports()` la reconoce); ningún SDK de proveedor se instancia fuera del adapter; `actualRoute` es la ruta de fidelidad, no el slug.
- [ ] Un input-mode faltante o no resuelto (keyframe/motion/source), o `targetLang` fuera de los idiomas de la ruta, rechaza con `invalid_request` **antes** de `fence.reserve`.
- [ ] `ExperimentAttemptManifestV1` declara `outputs?: readonly LabOutputDescriptorV1[]`; un run omni `{video, audio}` produce **dos** descriptores con modalidad + `sha256` + `outputsRetained` propios; ninguno se descarta; `outputHashes` plano se conserva por compat.
- [ ] `resolveEditSource` elige el output editable por modalidad (no por `[0]`); un edit sobre el video de un `{video,audio}` selecciona el output video.
- [ ] Voice-preset registry: `globe.voice.preset.register|list|get` registrados en el spine con coverage matrix completa (`ui`/`mcp` `policy-blocked`) + capability `globe.voice.preset.manage` + grant al service principal en el MISMO PR; el vendor voice id vive solo en la voice-map del adapter; una voz clonada exige `rights`; list/get son tenant-safe (`not_found` cross-workspace).
- [ ] Kill switch OFF / `GLOBE_LAB_PROVIDER=fake` por default; el gasto real es gate humano.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes; tests por adapter con transports dobles (cero gasto) cubren cada capability, multi-output y el registry.

## Verification

- `cd ../efeonce-globe && pnpm check` (typecheck + test recursivo)
- `cd ../efeonce-globe && pnpm build`
- Tests unitarios por adapter con dobles: `supports`/`estimate`/`submit`/`poll` por capability nueva; multi-output → N descriptores; `resolveEditSource` por modalidad; registry idempotente + tenant-safe.
- (Greenhouse, lifecycle docs) `pnpm task:lint --task TASK-1504` (`template=1`, `errors=0`, `warnings=0`) + `pnpm ops:lint --changed`.
- Verificación de slug de modelo/voz nuevo (Fal `POST {}` → 404/422) antes de cablear; canary billable humano por capability como evidencia final.

## Execution status — 2026-07-22 (code complete, canario pendiente)

Los 5 slices están implementados en `efeonce-globe` (local-first, sin push), cada uno con `pnpm check`
+ `pnpm build` verdes. Commits: `8d2f084` (S1) · `7bd9c3a` (S2) · `bb8874e` (S3) · `d1bedfa` (S4) ·
`6024a60` (S5). Suite final: domain 150 · creative-runner 122 · studio-web 61 · database 20 ·
contracts 5 · sdk 5 · media-qc 1 — 0 fallos, 8 paquetes construidos.

### Motores verificados EN VIVO (probe zero-spend, 2026-07-22) — corrige supuestos del body

| Capability | Motor cableado | Hallazgo que el probe corrigió |
|---|---|---|
| `video-frames` | **Veo 2.0** `veo-2.0-generate-001` (keyless Vertex) | **Veo 3.0 fast y 3.0 estándar NO soportan `lastFrame`** (`"The request is not supported by this model"`); 3.1 preview no existe en el proyecto. Veo 2.0 sí lo valida |
| `video-motion-control` | Seedance 2.0 `reference-to-video` (Fal, 422) | campos reales `video_urls[]`/`image_urls[]` separados; `duration` es **string**; `generate_audio` mapea `audioMode` |
| `audio-change-voice` | ElevenLabs **`voice-changer`** (Fal, 422) | **`fal-ai/elevenlabs/speech-to-speech` NO existe (404)** — el nombre por el que se conoce el modelo habría shippeado una ruta que sólo falla al gastar |
| `audio-translate` | ElevenLabs **`dubbing`** (Fal, 422) | `target_lang` es su único campo obligatorio |

Descartado con evidencia: `fal-ai/vidu/q1/start-end-to-video` **existe** pero exige **ambos** keyframes ⇒
no puede servir `hasEndFrame:false`, estado que el contrato de run declara. Queda documentado como ruta
futura de alta fidelidad (el catálogo admite varias rutas por capability, así que agregarla es dato).

### Fuera del scope declarado, cerrado por causa raíz

**Bug fail-open preexistente:** `ref/motion/loop-v1` declaraba `frames`/`motion-source`, pero su
capability resuelve a un motor text-to-video sin campo de referencia ⇒ los keyframes declarados se
**descartaban en silencio después de reservar crédito**, devolviendo un video plausible que no era lo
pedido. Autorizado por el operador para cerrarse acá. Modos mudados a las rutas dedicadas + test de
regresión + `assertInputModeSatisfied` (cuenta referencias **por tipo de medio** pre-fence).

### Pendiente bloqueante — gate humano, no trabajo de código

- [ ] **Canario facturable por capability** (`video-frames`, `video-motion-control`,
      `audio-change-voice`, `audio-translate`, omni multi-output): 1 run real bajo el fence con
      `GLOBE_LAB_PROVIDER` real, registrando `actualRoute`, créditos y `outputs` con `sha256`.
      Requiere decisión explícita del operador (gasto real). Hoy: kill switch OFF y
      `GLOBE_LAB_PROVIDER=fake` por default — nada gasta.
- [ ] Deploy a `globe-api-internal` y verificación de que las 14 capabilities existen y el registry
      responde `policy_blocked` en `ui`/`mcp`.
- [ ] `FAL_VOICE_MAP` está **vacío** a propósito: se puebla cuando el operador defina las voces
      curadas reales. Hasta entonces todo `voicePreset` de tipo `catalog` falla cerrado.

Estado correcto mientras esto siga abierto: **`code complete, rollout pendiente`**, no `complete`.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con lo implementado, verificado, canary y pendientes bloqueantes
- [ ] `changelog.md` actualizado (Greenhouse gobierna el cierre documental; NUNCA en `efeonce-globe/docs/**`)
- [ ] chequeo de impacto cruzado ejecutado sobre `TASK-1500/1501/1502/1503/1505/1474/1497` (input-modes, multi-output, voice-preset)
- [ ] delta de cierre agregado a `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (capabilities materializadas, multi-output modelado, voice-preset registry)

## Follow-ups

- Promoción de `ui`/`mcp` a `available` para el voice-preset registry cuando aterrice `TASK-1505` + gate humano.
- Persistencia real (SQL) de experimentos y presets con `TASK-1465`; provenance/rights/retención durable con `TASK-1467`.
- Umbral de batch-of-N por modalidad (video/audio, dado el costo) — resolver junto a `TASK-1500`/`TASK-1501`.
- Evaluar convergencia del voice-preset registry con el treatment registry de `TASK-1493` si éste aterriza primero.

## Open Questions

- ¿El voice-preset registry es asset propio (decisión actual, por rights + ciclo de clonación distintos) o termina extendiendo el treatment registry de `1493`? Resolver al aterrizar `1493`.
- ¿`voicePreset` se agrega como campo de `CreativeProviderRequestV1` o se transporta dentro del mapeo de referencias existente? Decidir en Plan Mode sin ampliar el request neutral más de lo necesario.
- Motor(es) de fidelidad por defecto para `video-frames`/`video-motion-control` (Omni Interactions vs Veo vs Seedance) — fijar contra las skills de proveedor y el `DEFAULT_COMPOSITE_POLICY` al cablear la route table.
