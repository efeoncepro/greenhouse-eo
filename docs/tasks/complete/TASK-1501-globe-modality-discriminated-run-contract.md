# TASK-1501 — Globe Modality-Discriminated Run Contract

## Delta 2026-07-20

- El gap "no existe SSOT de constraints contra el cual validar el shape pre-spend" quedó **cerrado por TASK-1500**
  (complete): consumir `resolveRouteConstraints(routeId)` / `getProducerRoute(routeId)` **in-process** desde
  `efeonce-globe/packages/domain/src/producer-catalog.ts` (re-export en `@efeonce-globe/domain`), sin re-dispatch
  por el registry. `RouteConstraintsV1` ya es union discriminada por `modality` en
  `packages/contracts/src/producer-catalog.ts`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

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
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Shipped 2026-07-20 (local-first, sin push)`
- Rank: `TBD`
- Domain: `creative|ai|platform`
- Blocked by: `TASK-1481, TASK-1500`
- Branch: `task/TASK-1501-globe-modality-discriminated-run-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte `PrepareExperimentPayloadV1` de un `prompt?: string` plano a un **discriminated union por modalidad** (image / video / audio): el run del Producer lleva ahora un `output` shape tipado (image: quality/aspectRatio/count; video: inputMode[elements|frames|motion|edit]/resolution/duration/aspectRatio/audioMode; audio: mode[voiceover|changeVoice|translate]/voicePreset/sampleRate/format/speed/volume/pitch). Cada parámetro de output-shape se **valida contra los constraints de la ruta del catálogo gobernado (TASK-1500), fail-closed en `prepare` — estrictamente antes de que `execute` reserve crédito**. El contrato **nace diseñado para las 3 modalidades**; la implementación es incremental Image → Video → Audio. El código vive en `efeonce-globe`; Greenhouse gobierna lifecycle/docs.

## Why This Task Exists

El Model Lab y el Producer comparten un solo contrato de run, y hoy ese contrato **no puede describir una pieza real**:

- **El run es un `prompt` plano.** `PrepareExperimentPayloadV1` (`packages/contracts/src/index.ts:316-333`) lleva `capability`, `referenceRoute`, `authorizedInputs`, `hardCapCredits`, `prompt?` (:321), `editFrom?`, `previousInteractionId?` — **ningún parámetro de output-shape**. `validatePreparePayload` (`packages/domain/src/model-lab.ts:535-565`) trata `prompt` como un `typeof prompt === 'string'` suelto (:546, :561) y no valida nada de forma de salida. No hay `quality`, `count`, `aspectRatio`, `resolution`, `duration`, `sampleRate`, `format`, `speed`, `volume`, `pitch`, ni un selector de `inputMode`/`mode` por modalidad.
- **Un contrato plano solo-image ya lo rompe Video, y Audio lo rompe más.** Video necesita duración, resolución, frames/elements/motion/edit y audioMode; Audio necesita sample-rate, formato, speed/volume/pitch, 3 modos y voice-preset. Modelar hoy solo-image y "después reescribir" es exactamente la **alternativa rechazada** en la spec fuente. El contrato **nace discriminado por modalidad**, aunque la implementación se prenda por modalidad.
- **Sin shape tipado, no hay fail-closed pre-spend real.** Un `30s` en una ruta que topa en `10s`, un `4K` en una que topa en `720p`, o un `count=8` donde el tope es `4`, hoy no tienen dónde rechazarse: llegarían al fence o al provider y **quemarían crédito** (o coaccionarían el valor en silencio dentro del adapter, como el aspect ratio hardcodeado de `vertex-video-adapter.ts:90/100` y `vertex-omni-adapter.ts:81/96/106`). El contrato debe validar la forma contra los constraints de la ruta (TASK-1500) en `prepare`, antes de que `executeExperiment` (`model-lab.ts:266-337`) llegue a `deps.fence.reserve(...)`.
- **La unidad de crédito es `ruta × output-shape`, y el shape no existe como dimensión.** El estimate previewable (TASK-1502) y el fence necesitan leer la forma de salida como dato de primera clase. Mientras el shape viva "adentro del adapter", no hay `f(ruta, shape)` gobernable.

Fuente de diseño: `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` → §"El contrato del run: discriminated union por modalidad (el core)" + §"Hard rules". Gap con evidencia `file:line`: `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md`.

## Goal

- `PrepareExperimentPayloadV1` gana un `output` **discriminated union por `modality`** (`image | video | audio`) con los parámetros de output-shape tipados de cada modalidad; el contrato queda **diseñado para las 3 desde el día 1**, con vocabulario versionado (aspect ratios, resoluciones, formatos, modos, audioMode).
- Todo parámetro de output-shape se **valida contra los constraints de la ruta del catálogo gobernado (TASK-1500)** dentro de `validatePreparePayload` (en `prepare`), **fail-closed antes de reservar crédito**: ruta desconocida, param fuera de rango, enum no soportado por la ruta, o `output.modality` incoherente con la modalidad de `capability` → `invalid_request`, nunca coerción silenciosa.
- El shape validado se persiste en el `StoredExperimentRequestV1` y se **hilvana al provider seam** (`CreativeProviderRequestV1` → `toProviderRequest`) para que el adapter lea la forma en vez de hardcodearla; **absorbe TASK-1495**: el aspect ratio (y el formato objetivo de un run) pasa a ser un campo del output-shape, no un literal de la tabla de ruteo del adapter.
- Implementación **incremental Image → Video → Audio**: la modalidad image queda validada y hilvanada de punta a punta; video y audio quedan declaradas y estructuralmente validadas en el contrato, con su ejecución de capability específica (frames/motion/change-voice/translate/omni) delegada a TASK-1504, que solo cablea provider, sin re-modelar el contrato.
- La capacidad respeta **Full API Parity by birth** (misma `globe.lab.experiment.run` / `globe.run.prepare`, transport-neutral; coverage sin cambios: `ui`/`mcp` siguen `policy-blocked` hasta gate); ninguna superficie renderiza un control cuyo param no exista y esté validado en el contrato.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (§"El contrato del run: discriminated union por modalidad", §Boundary, §Hard rules) — **la fuente de verdad de esta task**.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (TASK-1481: trusted context, coverage por surface, `InvalidExperimentRequestError → invalid_request`).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` (state machine, spend fence, private-ingest, provider seam, ports + DI).
- La skill `greenhouse-globe` (`.claude/skills/greenhouse-globe/SKILL.md`) — boundary, provider seam sagrado, convención de extensiones de import, `node --test`.

Reglas obligatorias (boundary DURO — repetir en ejecución):

- **El CÓDIGO vive en `efeonce-globe`; Greenhouse gobierna lifecycle/docs.** No se crean `apps/*`/`packages/*` nuevos. Toda doc gobernante (arquitectura/ADR/runbook/handoff) se cierra en Greenhouse bajo `creative-studio/`, nunca en `efeonce-globe/docs/**`.
- **Provider seam sagrado.** El shape se valida y persiste en `packages/contracts` + `packages/domain`; se consume detrás del `CreativeProviderAdapter` vía el runner. **NUNCA** un SDK de proveedor directo desde dominio/UI/MCP/CLI/tests. El shape hilvanado al provider request no introduce identificadores de modelo vendor en policy de dominio.
- **Naming dual + unidad de crédito = ruta × shape.** El shape referencia siempre `referenceRoute` (contrato de fidelidad), nunca el slug del proveedor (que vive solo en el adapter). La unidad de crédito se computa de `ruta × output-shape`, nunca del modelo.
- **Contrato discriminado fail-closed.** La validación de shape corre en `prepare` (`validatePreparePayload`), estrictamente antes de `deps.fence.reserve(...)` en `executeExperiment`. Un param fuera de constraints rechaza antes de gastar.
- **Private-ingest intacto.** Los selectores de `inputMode`/`mode` (elements, frames, motion source, change-voice/translate source) **no transportan bytes**: las referencias siguen cruzando por `authorizedInputs` (hash + rights, `validateAuthorizedInputs`, `MAX_AUTHORIZED_INPUTS=16`) y la base de edit por `editFrom`/`editReference` (TASK-1490). El shape carga solo el *selector* + params no-byte (targetLang, hasEndFrame, count, etc.). **NUNCA** meter la base de un edit en `authorizedInputs` ni blanquear un derivado como `internal-owned` (regla dura de TASK-1490).
- **Convención de import de Globe:** `.js` en imports source↔source de packages; `.ts` en `studio-web` y en **todos** los tests. Tests con `node --test`, **nunca** Vitest/Jest. Satisfacer `exactOptionalPropertyTypes` (spread condicional `...(x !== undefined ? { x } : {})`, patrón ya usado en `validatePreparePayload:561-563`).

## Normative Docs

- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — contexto del gap del contrato plano.
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` — semántica de `editFrom`/`editReference`, `editMode`, reglas duras del edit (a NO romper).
- `docs/tasks/to-do/TASK-1495-globe-target-formats-multiformat-set.md` — **absorbida en aspect ratio** por esta task (ver `## Delta`).

## Dependencies & Impact

### Depends on

- **TASK-1481** (`complete`) — API Contract Spine: schemas versionados, `CapabilityRegistry`, trusted context, `InvalidExperimentRequestError → invalid_request` (`packages/domain/src/dispatch.ts`).
- **TASK-1500** (`to-do`, keystone hermana, se autora en paralelo) — Governed Route/Model Catalog: expone, por `referenceRoute` (+ `capability`), los **constraints** (opciones/límites de quality, aspectRatio, count, resolution, duration, sampleRate, format, speed/volume/pitch, audioMode, inputMode soportados, audio-capable). Esta task **consume ese catálogo como un port inyectado** (`RouteCatalogPort`) para validar el shape; no re-modela los constraints. Si al tomar la task TASK-1500 aún no expuso el port, **reportar y coordinar la firma del port antes de implementar Slice 2** (no adivinar el catálogo).
- Symbols reales confirmados: `PrepareExperimentPayloadV1` (`packages/contracts/src/index.ts:316`), `CreativeCapability`/`CREATIVE_CAPABILITIES` (`:23-36`), `validatePreparePayload`/`prepareExperiment`/`executeExperiment` (`packages/domain/src/model-lab.ts:535/222/266`), `StoredExperimentRequestV1` (`:47`), `CreativeProviderRequestV1` (`packages/provider-contract/src/index.ts:67`), `toProviderRequest` (`apps/creative-runner/src/index.ts:260`).

### Blocks / Impacts

- **TASK-1502** (Previewable Estimate reader) — computa costo = `f(ruta, output-shape)`; necesita el shape tipado como dimensión de primera clase.
- **TASK-1504** (Producer Capability Expansion) — video-frames/motion-control, audio-change-voice/translate, multi-output omni, voice-preset registry; cablea el provider para los `inputMode`/`mode` que este contrato ya declara (no re-modela el contrato).
- **TASK-1505** (Producer Surface UI) — renderiza los paneles por modalidad exactamente sobre este union; ningún control existe sin su param validado en el contrato.
- **TASK-1474** (Professional Studio Workbench) — consume el mismo contrato discriminado (brief-first encima del Producer prompt-first).
- **TASK-1495** — su aspect ratio (campo gobernado de un run) queda **absorbido** aquí (ver `## Delta`).

### Files owned

- `efeonce-globe/packages/contracts/src/index.ts` (tipo `OutputShapeV1` + campo `output?` en `PrepareExperimentPayloadV1` + vocabulario)
- `efeonce-globe/packages/contracts/src/*.test.ts` (validación de shape a nivel contrato)
- `efeonce-globe/packages/domain/src/model-lab.ts` (`validateOutputShape`, `RouteCatalogPort` consumido, coherencia modalidad↔capability, persistencia en `StoredExperimentRequestV1`)
- `efeonce-globe/packages/domain/src/model-lab.test.ts`
- `efeonce-globe/packages/provider-contract/src/index.ts` (`CreativeProviderRequestV1` gana los campos de output-shape)
- `efeonce-globe/apps/creative-runner/src/index.ts` (`toProviderRequest` hilvana el shape) + adapters de imagen (leer aspectRatio/quality/count del request)
- `efeonce-globe/apps/creative-runner/src/*.test.ts`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (delta de cierre si el contrato final difiere del diseño)

## Current Repo State

### Already exists

- `PrepareExperimentPayloadV1` con `prompt?: string` plano (`packages/contracts/src/index.ts:316-333`).
- `validatePreparePayload` que valida `capability` (contra `CREATIVE_CAPABILITIES`), `referenceRoute`, `hardCapCredits`, `authorizedInputs` (private-ingest), `editFrom`/`previousInteractionId` (mutuamente excluyentes) — pero **nada de output-shape** (`packages/domain/src/model-lab.ts:535-565`).
- State machine `prepared → estimated → reserved → running → candidate_ready|failed|cancelled` (`model-lab.ts:26-35`); reserva de crédito en `executeExperiment` (`fence.reserve`, ~`:299-308`), **posterior** a `prepare` — el punto natural del fail-closed pre-spend.
- Patrón ports + DI (`ModelLabDependencies`, `model-lab.ts:109-134`), `InvalidExperimentRequestError → invalid_request`, `MAX_AUTHORIZED_INPUTS=16`.
- `CreativeProviderRequestV1` con `capability`, `route`, `prompt?`, `inputHashes`, `hardCapCredits`, `previousInteractionId?` — **sin campos de output-shape** (`packages/provider-contract/src/index.ts:67-85`); `toProviderRequest` (`apps/creative-runner/src/index.ts:260-277`).
- Aspect ratio hardcodeado en adapters de video (`vertex-video-adapter.ts:90/100`, `vertex-omni-adapter.ts:81/96/106`); adapters de imagen (`fal-adapter.ts`, `vertex-adapter.ts`) sin aspect ratio por contrato — el gap que TASK-1495 documentó.

### Gap

- No existe un tipo `OutputShape` discriminado por modalidad ni un campo `output` en el payload.
- No existe validación de output-shape contra constraints de ruta; no hay `RouteCatalogPort` consumido en el dominio.
- No hay coherencia `output.modality` ↔ modalidad de `capability`.
- El aspect ratio / formato objetivo no es contrato (vive hardcodeado en adapters); un formato que la ruta no soporta se coacciona en silencio o no existe (`1:1`, `4:5`).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts` + `packages/domain` + `packages/provider-contract` + `apps/creative-runner`); gobernanza de task/doc en `greenhouse-eo`.
- Future candidate home: `remain-shared`
  <!-- El contrato discriminado es primitivo compartido Producer + Workbench; no se extrae a un package nuevo por anticipado. -->
- Boundary: el contrato `PrepareExperimentPayloadV1` + `OutputShapeV1` (source of truth de tipos en `packages/contracts`); la validación gobernada en `validatePreparePayload` (dominio); consumers autorizados = command `globe.lab.experiment.prepare` / `globe.run.prepare` y sus superficies (`http`/`sdk`/`cli`/`worker`/`e2e` `available`; `ui`/`mcp` `policy-blocked`). El `RouteCatalogPort` es la única frontera con TASK-1500.
- Server/browser split: 100% server-side. La validación de shape, el catálogo y el fence viven en el dominio/runner; el browser (TASK-1505) solo envía el `output` en el payload no confiable y renderiza controles según el union — nunca decide constraints.
- Build impact: `none` (tipos + validación + threading; sin dependencia pesada ni filesystem input nuevo).
- Extraction blocker: el contrato depende del trusted context del spine y del catálogo gobernado (TASK-1500); no es deployable independiente hasta que esas fronteras estén (EPIC-026 decide extracción real).

## UI/UX Contract

N/A — `Execution profile: backend-data`, `UI impact: none`. El contrato es consumido por la UI (TASK-1505), que es su propia task.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `PrepareExperimentPayloadV1` (`packages/contracts/src/index.ts`) + `validatePreparePayload` (`packages/domain/src/model-lab.ts`)
- Consumidores afectados: `UI` (TASK-1505), `MCP`/`sdk`/`cli` (clientes del command), `worker` (runner), estimate reader (TASK-1502), capability expansion (TASK-1504)
- Runtime target: `worker` (Cloud Run runner) + `staging` (studio-web privado); default hermético (`GLOBE_LAB_PROVIDER=fake`)

### Contract surface

- Contrato existente a respetar: `PrepareExperimentPayloadV1` (`contracts:316`), `CommandRequestEnvelopeV1` (`contracts:124`), `InvalidExperimentRequestError → invalid_request` (`dispatch.ts`), `CreativeProviderRequestV1` (`provider-contract:67`), reglas de `editFrom` (TASK-1490).
- Contrato nuevo o modificado: `OutputShapeV1 = ImageOutputShapeV1 | VideoOutputShapeV1 | AudioOutputShapeV1` (discriminado por `modality`) + `PrepareExperimentPayloadV1.output?: OutputShapeV1`; `CreativeProviderRequestV1` gana campos de output-shape (image-first); `RouteCatalogPort` consumido en `ModelLabDependencies`.
- Backward compatibility: `gated` — `output` es **additive-optional**. Un caller legacy sin `output` conserva el comportamiento actual (defaults del adapter). Cuando `output` está presente, se valida fail-closed. Un follow-up (`GLOBE_RUN_OUTPUT_SHAPE_REQUIRED`, default OFF) puede volverlo requerido por modalidad tras migrar todos los callers.
- Full API parity: es una **modificación de contrato de una capability existente** (`globe.lab.experiment.run` / `globe.run.prepare`), no una capability nueva. Touch-it/fix-it: el shape vive en el primitive (dominio), no en la UI; el command sigue siendo el único write path; coverage sin cambios. La UI (1505), Nexa/MCP, SDK y CLI consumen el MISMO command con el nuevo shape — cero lógica duplicada por consumer.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla SQL — `StoredExperimentRequestV1` (in-memory `InMemoryExperimentStore`, `model-lab.ts:628`) gana un campo opcional `output`. La persistencia durable llega con TASK-1465 (tenancy store) y hereda el campo por composición de tipo.
- Invariantes que no se pueden romper:
  - **Discriminant único = `output.modality`**; `image | video | audio`. Ninguna surface renderiza un control cuyo param no exista/valide en el union.
  - **Coherencia modalidad↔capability:** `image-*` → `image`, `video-*` → `video`, `audio-*`/`speech-*` → `audio`. Mismatch → `invalid_request`.
  - **Fail-closed pre-spend:** validación de shape en `prepare`, antes de `fence.reserve`. Param fuera de constraints de la ruta (count>max, duración fuera de rango, resolución/aspectRatio/format/sampleRate no soportado por la ruta, speed/volume/pitch fuera de bounds) → `invalid_request`. Ruta desconocida en el catálogo → `invalid_request`. **Nunca** coerción silenciosa.
  - **Private-ingest intacto:** el shape no transporta bytes. Selectores `inputMode`/`mode` referencian inputs por hash vía `authorizedInputs`; base de edit vía `editFrom`/`editReference`. **NUNCA** meter base de edit en `authorizedInputs` (rompe `input_lineage_intact` + `MAX_AUTHORIZED_INPUTS`).
  - **Unidad de crédito = ruta × shape:** el shape es dimensión de primera clase para el estimate/fence; nunca se computa crédito por modelo/slug.
  - **Naming dual:** el shape referencia `referenceRoute` (fidelidad), jamás el slug del proveedor.
- Tenant/space boundary: derivado server-side por `deriveTrustedContext` → `context.workspaceId` (sin cambios). El shape es payload no confiable; la autoridad no viaja en él.
- Idempotency/concurrency: `idempotencyKey` del command sin cambios; `prepare` crea un experimento nuevo; la validación de shape es pura/determinista (no muta estado externo).
- Audit/outbox/history: el shape validado queda en el `StoredExperimentRequestV1` y, por composición, es evidencia del experimento; el manifest ya registra ruta/costo/hashes. Sin outbox nuevo.

### Migration, backfill and rollout

- Migration posture: `none` (additive-optional field; store in-memory; sin SQL).
- Default state: `read-only`/inerte — la validación solo actúa cuando el caller envía `output`; kill switch `GLOBE_LAB_ENABLED` (default OFF) sigue gobernando toda la capability.
- Backfill plan: N/A (no hay estado durable que migrar; experimentos previos no tienen `output` y siguen válidos).
- Rollback path: `revert PR` — al ser additive-optional, revertir el tipo + validación + threading no deja estado corrupto.
- External coordination: ninguna (repo-only). Coordinar la firma del `RouteCatalogPort` con quien tome TASK-1500.

### Security and access

- Auth/access gate: `capability` (`globe.lab.experiment.run`) vía trusted context; sin cambios en autorización. El shape no amplía autoridad.
- Sensitive data posture: `no sensitive data` en el shape (params de forma de salida). Sin PII, sin secretos, sin slug vendor.
- Error contract: `InvalidExperimentRequestError → invalid_request` (canónico). **NUNCA** prosa cruda ni detalle interno al cliente; el mensaje no revela constraints internos ni existencia de rutas fuera del catálogo del workspace.
- Abuse/rate-limit posture: el hard spend fence per-run (`LabSpendFence`) sigue siendo la barrera de gasto; el shape solo agrega validación previa. `count` (batch-of-N) queda acotado por el constraint de la ruta (catálogo) además del fence.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (`pnpm typecheck && pnpm test`, `node --test`) + `pnpm build`.
- DB/runtime checks: N/A (store in-memory). Ejercitar `prepare` con doubles del `RouteCatalogPort`.
- Integration checks: canary hermético (`GLOBE_LAB_PROVIDER=fake`) de un `prepare(image-generate, output=image{...})` → `execute` → `candidate_ready`, verificando que el aspectRatio/quality/count viajan al provider request (fake) y aparecen en el manifest/hash.
- Reliability signals/logs: sin signal nuevo; los rechazos fail-closed emergen como `invalid_request` correlacionados por `correlationId`.
- Production verification sequence: N/A para prod externa (Producer interno, hermético); verificar en `staging` privado (`globe-studio-internal`) con provider `fake`.

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths reales (`contracts:316`, `model-lab.ts:535`, `provider-contract:67`, `index.ts:260`).
- [x] Invariantes (discriminant, coherencia modalidad↔capability, fail-closed pre-spend, private-ingest, unidad de crédito, naming dual) explícitos y probados.
- [x] Posture de migración/rollback explícita y proporcional (additive-optional, revert PR).
- [x] Evidencia runtime: `pnpm check && pnpm build` verdes + canary hermético del threading image.
- [x] Errores canónicos (`invalid_request`) sin leak de constraints internos ni existencia de rutas cross-workspace.

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

### Slice 1 — `OutputShapeV1` discriminated union + campo en el contrato (`packages/contracts`)

- Definir el union discriminado por `modality`, **las 3 modalidades declaradas** (diseño día 1):
  - `ImageOutputShapeV1 = { modality: 'image'; quality: string; aspectRatio: string; count: number }`
  - `VideoOutputShapeV1 = { modality: 'video'; inputMode: VideoInputModeV1; resolution: string; durationSeconds: number; aspectRatio: string; audioMode: 'silent' | 'with-audio' }`, con `VideoInputModeV1 = { kind: 'elements' } | { kind: 'frames'; hasEndFrame: boolean } | { kind: 'motion' } | { kind: 'edit' }`
  - `AudioOutputShapeV1 = { modality: 'audio'; mode: AudioModeV1; voicePreset?: string; sampleRate: number; format: string; speed: number; volume: number; pitch: number }`, con `AudioModeV1 = { kind: 'voiceover' } | { kind: 'change-voice' } | { kind: 'translate'; targetLang: string }`
- Agregar `output?: OutputShapeV1` a `PrepareExperimentPayloadV1` (additive-optional). **`prompt?` se conserva** top-level (sigue siendo la instrucción creativa / script del voiceover / instrucción de edit); el shape aporta solo los params de forma de salida + selectores no-byte.
- Documentar en JSDoc: el shape referencia `referenceRoute` (no slug); los selectores `inputMode`/`mode` no transportan bytes (referencias vía `authorizedInputs`; edit vía `editFrom`).
- Type-only, additive: `pnpm check` verde sin tocar dominio.

### Slice 2 — Validación gobernada del shape (`packages/domain`), fail-closed pre-spend

- Consumir un `RouteCatalogPort` (de TASK-1500) inyectado en `ModelLabDependencies`: `constraintsFor(capability, referenceRoute) => RouteConstraintsV1 | undefined` (sync; el catálogo es dato versionado in-memory). Si el port aún no existe, coordinar su firma con TASK-1500 antes de codear.
- Agregar `validateOutputShape(payload, deps.catalog)` dentro de `validatePreparePayload` (`model-lab.ts:535`), corriendo en `prepare` — estrictamente antes de que `executeExperiment` reserve:
  - **Coherencia:** `output.modality` debe corresponder a la modalidad de `capability` (`image-*`→image, `video-*`→video, `audio-*`/`speech-*`→audio). Mismatch → `badRequest()`.
  - **Ruta:** `constraintsFor(...) === undefined` → `badRequest()` (ruta fuera del catálogo, sin revelar existencia).
  - **Params vs constraints:** por modalidad, validar cada campo contra el constraint de la ruta (aspectRatio ∈ set soportado; count ∈ `1..max`; resolution ∈ set; durationSeconds ∈ `[min,max]`; sampleRate/format ∈ set; speed/volume/pitch ∈ bounds; `inputMode.kind`/`mode.kind` ∈ modos soportados por la ruta; `audioMode` ∈ soportado). Cualquier violación → `badRequest()`.
- Persistir el shape validado en el retorno de `validatePreparePayload` y en `StoredExperimentRequestV1` (spread condicional para `exactOptionalPropertyTypes`).
- **Regla de orden:** este slice NO se cierra sin el gate fail-closed. Aceptar un shape sin validar contra constraints dejaría pasar un param fuera de rango al fence/provider (quema crédito).

### Slice 3 — Threading al provider seam (image-first) + absorción de aspect ratio (TASK-1495)

- Extender `CreativeProviderRequestV1` (`provider-contract:67`) con los campos de output-shape necesarios (image-first: `quality?`, `aspectRatio?`, `count?`; video/audio declarados additive para 1504).
- En `toProviderRequest` (`apps/creative-runner/src/index.ts:260`), hilvanar el shape del `StoredExperimentRequestV1.output` al provider request (spread condicional).
- Adapters de imagen (`fal-adapter.ts`, `vertex-adapter.ts`) leen `aspectRatio`/`quality`/`count` del request en vez de defaults hardcodeados — **absorbe el aspect ratio de TASK-1495 para image**. Video/audio: solo declarar; su lectura de shape en los adapters de video/audio es TASK-1504 (frames/motion/change-voice/translate/omni).
- No introducir slugs vendor en el request de dominio; el mapeo shape→vocabulario del provider vive DENTRO del adapter.

### Slice 4 — Conformance, coverage y tests (`node --test`)

- Tests de contrato (`packages/contracts`) y dominio (`model-lab.test.ts`) con doubles del `RouteCatalogPort`:
  - **Happy path** por modalidad (image completo end-to-end; video/audio: shape aceptado estructuralmente).
  - **Fail-closed:** ruta desconocida; count>max; durationSeconds fuera de rango; resolution/aspectRatio/format/sampleRate no soportado por la ruta; speed/volume/pitch fuera de bounds; `output.modality` incoherente con `capability`; `inputMode`/`mode` no soportado → todos `invalid_request`.
  - **Backward-compat:** sin `output` → comportamiento actual (no rompe experimentos/tests existentes).
  - **Boundary:** un edit (`editFrom`) con shape image no permite meter la base en `authorizedInputs`; el shape no rompe las reglas de TASK-1490.
- Verificar que el coverage manifest de la capability sigue consistente (sin nueva surface; `ui`/`mcp` `policy-blocked`).

## Out of Scope

- **La ejecución de las capabilities nuevas** (video-frames, motion-control, audio-change-voice, translate, multi-output omni, voice-preset registry) — es **TASK-1504**. Esta task solo **declara** sus selectores en el union y valida su forma; no cablea el provider para ellas.
- **El estimate previewable** (`✨N`) — es **TASK-1502** (consume el shape que esta task tipifica).
- **El FormatSet fan-out** (un brief → N formatos como agregado gobernado) — residual de TASK-1495 (ver `## Delta`); el batch-of-N de un solo run va por `count` del shape.
- **La UI / paneles por modalidad** — es **TASK-1505**.
- **El catálogo de constraints** en sí — es **TASK-1500**; esta task lo consume por port, no lo modela.
- **Persistencia durable / tenancy** — TASK-1465; el shape se hereda por composición cuando aterrice.

## Detailed Spec

Forma canónica del contrato (en `packages/contracts/src/index.ts`, additive):

```ts
export type ImageOutputShapeV1 = Readonly<{
  modality: 'image';
  quality: string;          // enum de la ruta (validado contra el catálogo)
  aspectRatio: string;      // '1:1' | '4:5' | '16:9' | '9:16' … ∈ set de la ruta (absorbe TASK-1495)
  count: number;            // 1..route.maxCount
}>;

export type VideoInputModeV1 =
  | Readonly<{ kind: 'elements' }>                 // refs por authorizedInputs (hash+rights)
  | Readonly<{ kind: 'frames'; hasEndFrame: boolean }>  // keyframes start/end por authorizedInputs
  | Readonly<{ kind: 'motion' }>                   // motion source por authorizedInputs
  | Readonly<{ kind: 'edit' }>;                    // base por editFrom (NUNCA authorizedInputs)

export type VideoOutputShapeV1 = Readonly<{
  modality: 'video';
  inputMode: VideoInputModeV1;
  resolution: string;       // '720p' | '1080p' … ∈ set de la ruta
  durationSeconds: number;  // ∈ [route.minDuration, route.maxDuration]
  aspectRatio: string;      // ∈ set de la ruta
  audioMode: 'silent' | 'with-audio';
}>;

export type AudioModeV1 =
  | Readonly<{ kind: 'voiceover' }>                      // script = prompt top-level
  | Readonly<{ kind: 'change-voice' }>                   // source por authorizedInputs (hash)
  | Readonly<{ kind: 'translate'; targetLang: string }>; // source por authorizedInputs + target lang

export type AudioOutputShapeV1 = Readonly<{
  modality: 'audio';
  mode: AudioModeV1;
  voicePreset?: string;     // id contra el registry (TASK-1504); aquí es id declarado
  sampleRate: number;       // ∈ set de la ruta
  format: string;           // 'mp3' | 'wav' … ∈ set de la ruta
  speed: number;            // ∈ bounds de la ruta
  volume: number;
  pitch: number;
}>;

export type OutputShapeV1 = ImageOutputShapeV1 | VideoOutputShapeV1 | AudioOutputShapeV1;

// PrepareExperimentPayloadV1 gana (additive-optional):
//   output?: OutputShapeV1;
```

Firma esperada del port de TASK-1500 (consumido, no modelado aquí — confirmar al implementar):

```ts
export interface RouteCatalogPort {
  constraintsFor(capability: CreativeCapability, referenceRoute: string): RouteConstraintsV1 | undefined;
}
```

Reconciliaciones de diseño (registrarlas si el implementador las cambia):

- **`prompt` se mantiene top-level** (no se anida en el union) para no romper `editFrom` (prompt = instrucción de edit), la lectura del runner (`toProviderRequest:270`) ni el TTS (voiceover.script = prompt). El union aporta *forma de salida* + *selectores*, no la instrucción.
- **Los selectores no transportan bytes.** `elements/frames/motion/change-voice/translate source` referencian inputs ya presentes en `authorizedInputs` (hash+rights); el shape carga solo `kind` + params no-byte (`hasEndFrame`, `targetLang`, `count`). El edit base viaja por `editFrom`/`editReference` (TASK-1490), nunca en `authorizedInputs`.
- **`output.modality` es el discriminant** (no la `capability`) para que una surface renderice controles puramente desde el shape; la coherencia con `capability` es un gate de validación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (tipos en `contracts`) → Slice 2 (validación en `domain`, requiere el tipo + el `RouteCatalogPort` de TASK-1500) → Slice 3 (threading al provider seam) → Slice 4 (tests/conformance).
- **Slice 2 NO puede shippear sin el gate fail-closed contra constraints.** Un shape aceptado sin validar dejaría un param fuera de rango llegar a `fence.reserve`/provider y quemar crédito — es la razón de ser de la task.
- Slice 3 depende de que Slice 2 persista el shape validado en `StoredExperimentRequestV1`.
- Implementación por modalidad: **Image completa (1→4) antes de prender el threading de Video/Audio en adapters** (esos adapters son TASK-1504); el contrato declara las 3 desde Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Param fuera de constraints llega al fence/provider y quema crédito | worker/provider | medium | validación fail-closed en `prepare` antes de `fence.reserve`; tests de out-of-range por modalidad | `invalid_request` esperado; ausencia de él en un caso malo = bug |
| Modelar los selectores como bytes rompe private-ingest | domain | low | selectores solo `kind`+params no-byte; refs por `authorizedInputs`; edit por `editFrom` | test que verifica que base de edit no entra a `authorizedInputs` |
| `output` optional deja pasar runs sin validar en producción del Producer | contract | medium | validación cuando presente; follow-up flag `GLOBE_RUN_OUTPUT_SHAPE_REQUIRED` para volverlo requerido por modalidad | revisión de que 1505 siempre envía `output` |
| Firma del `RouteCatalogPort` (TASK-1500) cambia post-diseño | cross-runtime | medium | consumir por port inyectado (DI); coordinar firma antes de Slice 2; double en tests | fallo de `pnpm check` al integrar |
| Romper backward-compat de experimentos/tests existentes | domain | low | `output` additive-optional; test backward-compat sin `output` | `pnpm test` rojo en model-lab |

### Feature flags / cutover

- Sin flag nuevo obligatorio: la validación es inerte hasta que un caller envía `output`; el kill switch `GLOBE_LAB_ENABLED` (default OFF) gobierna la capability entera; el provider default sigue `GLOBE_LAB_PROVIDER=fake` (hermético).
- Follow-up flag opcional `GLOBE_RUN_OUTPUT_SHAPE_REQUIRED` (default OFF) para exigir `output` por modalidad tras migrar callers. Revert: additive-optional → revert PR (<5 min, sin estado durable).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (tipos) | revert PR (additive-optional; nada lo referencia obligatoriamente) | <5 min | si |
| Slice 2 (validación) | revert PR; la validación no muta estado externo | <5 min | si |
| Slice 3 (threading) | revert PR; adapters vuelven a defaults | <5 min | si |
| Slice 4 (tests) | revert PR | <5 min | si |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes.
2. Canary hermético en local/staging (`GLOBE_LAB_PROVIDER=fake`): `prepare(image-generate, output=image{quality,aspectRatio,count})` → verificar que un aspectRatio/count fuera del constraint del catálogo da `invalid_request` en `prepare` (antes de `execute`).
3. `execute` del caso válido → `candidate_ready`; verificar que el aspectRatio/quality/count viajaron al provider request (fake) y quedan en el manifest.
4. Verificar backward-compat: un `prepare` sin `output` sigue funcionando como hoy.
5. Sin prod externa (Producer interno); no se prende ningún provider real en esta task.

### Out-of-band coordination required

- Coordinar la firma final del `RouteCatalogPort` con quien tome **TASK-1500** (misma keystone hermana). N/A externo (repo-only, hermético).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `PrepareExperimentPayloadV1.output?: OutputShapeV1` existe, discriminado por `modality`, con **las 3 modalidades declaradas** (image/video/audio) y sus params de output-shape tipados según la spec fuente.
- [x] `validatePreparePayload` valida el shape contra los constraints de la ruta (`RouteCatalogPort` de TASK-1500) en `prepare`, **fail-closed antes de `fence.reserve`**: ruta desconocida, param fuera de rango/enum no soportado, y `output.modality` incoherente con `capability` → `invalid_request`.
- [x] El shape validado se persiste en `StoredExperimentRequestV1` y se hilvana al provider seam (`CreativeProviderRequestV1` + `toProviderRequest`); los adapters de imagen leen aspectRatio/quality/count del request (aspect ratio de TASK-1495 **absorbido** para image).
- [x] Private-ingest intacto: ningún selector transporta bytes; refs por `authorizedInputs`, edit por `editFrom`; no se rompe ninguna regla dura de TASK-1490.
- [x] Backward-compat: un `prepare` sin `output` conserva el comportamiento actual (tests existentes verdes).
- [x] Coverage/manifest sin cambios de surface (`ui`/`mcp` `policy-blocked`); la capability sigue siendo el único write path; naming dual respetado (sin slugs en dominio/contrato).
- [x] `cd ../efeonce-globe && pnpm check && pnpm build` verdes; tests `node --test` cubren happy + fail-closed por modalidad + backward-compat.

## Verification

- `cd ../efeonce-globe && pnpm check` (`pnpm typecheck && pnpm test`, `node --test`)
- `cd ../efeonce-globe && pnpm build` (`pnpm -r build`)
- `cd ../efeonce-globe && pnpm install` si se agregó una dep de workspace (no previsto)
- Canary hermético (`GLOBE_LAB_PROVIDER=fake`): `prepare` image con shape válido/ inválido → `candidate_ready` / `invalid_request` pre-spend

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` sincronizado con el cierre
- [x] `Handoff.md` actualizado con lo implementado, verificado y pendientes
- [x] `changelog.md` actualizado si cambió comportamiento/estructura/contrato visible
- [x] chequeo de impacto cruzado ejecutado (ver Follow-ups: TASK-1495, 1500, 1502, 1504, 1505)
- [x] Cierre documental en Greenhouse (nunca en `efeonce-globe/docs/**`): delta a `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` si el contrato final difiere del diseño; invocar `greenhouse-documentation-governor`
- [x] Delta de absorción agregado a `docs/tasks/to-do/TASK-1495-globe-target-formats-multiformat-set.md` (aspect ratio absorbido)

## Follow-ups

- **TASK-1495** — declarar el aspect ratio **absorbido** por 1501 (ver `## Delta`); reescoping recomendado: dejar 1495 solo con el **FormatSet fan-out** (un brief → N formatos como agregado gobernado), o cerrarla como superseded si el batch-of-N por `count` + la variación de 1496 cubren el caso. Decisión final la toma quien tome 1495.
- **TASK-1500** — confirmar/estabilizar la firma del `RouteCatalogPort` (`constraintsFor(capability, referenceRoute)`).
- **TASK-1502** — consumir el shape tipado para el estimate `f(ruta, output-shape)`.
- **TASK-1504** — cablear los adapters de video/audio para leer `inputMode`/`mode` del shape (frames/motion/change-voice/translate/omni) tras el provider seam.
- **TASK-1505** — renderizar los paneles por modalidad exactamente sobre este union.
- Follow-up flag `GLOBE_RUN_OUTPUT_SHAPE_REQUIRED` (default OFF) para volver `output` requerido por modalidad tras migrar callers; registrar en el ledger de flags de Globe si se materializa.

## Delta 2026-07-20

- **Absorbe TASK-1495 (aspect ratio → campo del output-shape).** El aspect ratio / formato objetivo de un run deja de ser un literal hardcodeado en la tabla de ruteo del adapter (`vertex-video-adapter.ts:90/100`, `vertex-omni-adapter.ts:81/96/106`) y pasa a ser `ImageOutputShapeV1.aspectRatio` / `VideoOutputShapeV1.aspectRatio`, validado contra el set soportado por la ruta (catálogo TASK-1500). `1:1`, `4:5`, `16:9`, `9:16` quedan como vocabulario del contrato. El **FormatSet fan-out** (un brief → N formatos como agregado con estado/gasto/fence comunes) NO se absorbe aquí: es el residual de 1495 (o se cubre con batch-of-N por `count` + variación de 1496). Cross-impact: agregar un `## Delta` a TASK-1495 marcando el aspect ratio como cerrado por esta task.

## Open Questions

- Umbral de `count` (batch-of-N) por modalidad: image 1–4; ¿video/audio cuánto, dado el costo? Se resuelve por el constraint de la ruta en el catálogo (TASK-1500), pero conviene un tope por modalidad además del fence.
- ¿`voicePreset` (audio) es id contra el registry de TASK-1504 o extiende el treatment registry de TASK-1493? Aquí es un `string` id declarado; su resolución vive en 1504.
- ¿`output` debe volverse requerido por modalidad de entrada (flag ON) o quedar additive-optional hasta que 1505 sea el único caller productivo? Recomendación: additive-optional ahora, flag para requerirlo después.
