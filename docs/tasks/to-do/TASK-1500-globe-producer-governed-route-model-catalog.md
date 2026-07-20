# TASK-1500 — Governed Route/Model Catalog

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
- Blocked by: `TASK-1481`
- Branch: `task/TASK-1500-globe-producer-governed-route-model-catalog`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el **catálogo gobernado de rutas/modelos del Creative Producer** de Efeonce Globe: un reader transport-neutral que expone, por ruta, su `CreativeCapability`, sus **constraints** de output-shape (opciones de resolución / duración / sampleRate / formato / count, con límites), su **specialty** (multi-speaker, emotion-tags, HD, long-form, idiomas), si es **audio-capable**, los **modos de input** que soporta y su **naming dual** (modelo-real interno / fidelidad-curada cliente; el slug del proveedor jamás entra al catálogo — vive solo en el adapter). El catálogo es **dato versionado**: agregar una ruta es editar dato, no código. Es la keystone del cluster Producer — la UI (`TASK-1505`) lee de acá para renderizar solo opciones válidas, y el contrato discriminado (`TASK-1501`) valida el output-shape **fail-closed antes de gastar** contra estos mismos constraints, in-process.

## Why This Task Exists

Hoy el Model Lab (`TASK-1457`) acepta un `PrepareExperimentPayloadV1` con `capability`, `referenceRoute: string` y un `prompt?` plano: la ruta es un **string libre** sin contrato de qué output-shape admite. No existe una fuente de verdad de "qué puede hacer esta ruta": cuántos segundos tope, qué resoluciones, qué sample-rates, si emite audio, qué modos de input acepta, ni cómo se nombra hacia adentro (operador Efeonce) versus hacia el cliente. Sin ese catálogo:

- La superficie del Producer no puede renderizar solo controles válidos: adivinaría opciones y ofrecería 30 s en un modelo que topa en 10 s, o 4K en uno que topa en 720p.
- El contrato de run (`TASK-1501`) no tiene contra qué validar el shape antes de reservar crédito: la validación fail-closed pre-spend queda sin SSOT.
- El estimate (`TASK-1502`) no tiene la dimensión "ruta" para computar `costo = f(ruta, output-shape)`; la unidad de crédito degeneraría a "por modelo", que es exactamente el antipatrón prohibido.
- No hay dónde vivir el **naming dual**: hoy el único naming es el `referenceRoute` crudo y el `model` (slug) que reporta el adapter. La superficie cliente terminaría filtrando el slug del proveedor (lo que hace Higgsfield: "Seedream 5.0 Pro"), violando el invariante de no exponer costo vendor ni margen.

Esta task materializa el primero de los 11 primitivos del chassis compartido (fila #2 de la matriz del Producer) y desbloquea el resto del cluster. Es la raíz: sin catálogo no hay contrato validable, no hay estimate por ruta, y no hay superficie que renderice solo lo válido.

## Goal

- Un **catálogo de rutas como dato versionado** en `efeonce-globe`, donde cada entrada declara: `routeId` (el string que alimenta `referenceRoute`), `CreativeCapability`, constraints de output-shape **discriminados por modalidad**, specialty, `audioCapable`, modos de input soportados y `naming` dual (interno/cliente) — **sin** el slug del proveedor.
- Un **reader gobernado** (`globe.producer.catalog.list` + `globe.producer.catalog.get`) que proyecta el catálogo con la **vista de naming resuelta server-side y fail-closed a cliente** (nunca filtra modelo-real a una autoridad no-operadora), nace con Full API Parity y coverage matrix completa (`ui`/`mcp` `policy-blocked` hasta gate).
- Un **helper de dominio in-process** (`getProducerRoute` / `resolveRouteConstraints`) que `TASK-1501` (validación de shape pre-spend) y `TASK-1502` (estimate por ruta) reusan **sin re-dispatch por el registry** — mismo patrón que `runModelLabExperiment` reusado por el eval harness.
- **Drift guards de carga**: toda ruta referencia una `CreativeCapability` conocida, sus constraints coinciden con la modalidad de la capability, no hay `routeId` duplicado, y ningún naming filtra un slug de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — la spec fuente del Producer. Esta task implementa la fila **TASK-1500** de la tabla "primitivos → tasks (N1–N6)" y el primitivo #2 del chassis compartido.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — el spine machine-readable (`TASK-1481`, ✅) que este reader extiende.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` — el ejemplo trabajado (`registerModelLabCapabilities`, ports + DI, `LAB_COVERAGE`, error de dominio → API code) que este reader copia como plantilla.
- `.claude/skills/greenhouse-globe/SKILL.md` — contrato de arquitectura, provider seam sagrado, boundary Globe↔Greenhouse, convención de imports/tests de `efeonce-globe`.

Reglas obligatorias (heredadas del Producer + del spine):

- **Boundary duro.** El **código** vive en `efeonce-globe`; **Greenhouse** gobierna EPIC/`TASK-###`, lifecycle, lint, QA y cierre documental. La doc gobernante de Globe se escribe en Greenhouse bajo `creative-studio/`, **nunca** en `efeonce-globe/docs/**`.
- **Provider seam sagrado / naming dual.** El slug del proveedor (`bytedance/seedream/...`, endpoints de queue) **NUNCA** entra al catálogo ni al dominio; vive solo dentro del adapter (`apps/creative-runner/src/*-adapter.ts`). El catálogo expone dos labels de display — **modelo-real** (operador Efeonce) y **fidelidad-curada** (cliente) — y ninguno es el slug de wire.
- **Contrato discriminado.** Los constraints de output-shape son **discriminados por modalidad** (image/video/audio); una ruta image no puede cargar constraints de audio (irrepresentable por tipo, fail-closed por compilación).
- **La unidad de crédito es `ruta × output-shape`, nunca el modelo.** El catálogo es la dimensión "ruta"; `TASK-1502` computa `costo = f(ruta, shape)` sobre ella. El catálogo no lleva costo vendor ni margen.
- **Full API Parity por nacimiento.** El reader nace con schema versionado (`packages/contracts`), reader transport-neutral (`packages/domain` vía `CapabilityRegistry`), trusted context server-derived, path HTTP/SDK, coverage por cada una de las 8 `GLOBE_SURFACES` y conformance. Ninguna surface queda sin declarar (`missing` es irrepresentable); `ui`/`mcp` nacen `policy-blocked`.
- **Retrieval/lectura tenant-safe + fail-closed.** Un `routeId` desconocido o no visible en la vista de naming del caller es `not_found` — nunca revela existencia. La vista modelo-real solo se sirve a una autoridad operadora; el default es cliente.
- **Catálogo = dato versionado.** Agregar/editar una ruta es editar el array de dato + su versión; el motor del reader no tiene `switch` por ruta (mismo test "dato vs motor" del eval harness: dos modalidades distintas fluyen por el mismo motor).
- **Toolchain de Globe.** Node 24 nativo, `pnpm`, `node --test` (NO Vitest), imports `.js` source↔source de packages / `.ts` en `studio-web` y en todos los tests, flags `strict` + `verbatimModuleSyntax` + `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`.

## Normative Docs

- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` — contexto del gap (por qué el Producer adelanta los primitivos compartidos).
- `docs/architecture/creative-studio/EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md` — patrón "dato versionado + motor sin switch por fixture" que el catálogo replica.

## Dependencies & Impact

### Depends on

- `TASK-1481` (API Contract Spine, ✅) — `CapabilityRegistry`, `registerReader`, `CapabilityDescriptorV1`, `GLOBE_SURFACES`, `SurfaceCoverageState`, `deriveTrustedContext`, `DispatchError` / `dispatchErrorToApiCode`. Confirmado en `efeonce-globe/packages/domain/src/index.ts` y `packages/contracts/src/index.ts`.
- `TASK-1457` (Model Lab, ✅) — plantilla `registerModelLabCapabilities` + `LAB_COVERAGE` + `InvalidExperimentRequestError → invalid_request`. Confirmado en `efeonce-globe/packages/domain/src/model-lab.ts`.
- Vocabulario `CREATIVE_CAPABILITIES` (`efeonce-globe/packages/contracts/src/index.ts`) — cada `routeId` referencia una de estas 10 capabilities semánticas.

### Blocks / Impacts

- `TASK-1501` (Modality-Discriminated Run Contract) — consume `resolveRouteConstraints(routeId)` in-process para validar el output-shape fail-closed pre-spend.
- `TASK-1502` (Previewable Estimate Reader) — consume la dimensión "ruta" del catálogo para `costo = f(ruta, shape)`.
- `TASK-1505` (Producer Surface UI) — lee `globe.producer.catalog.list`/`.get` para renderizar solo rutas y opciones válidas por modalidad.
- `TASK-1474` (Professional Studio Workbench) — también consume el catálogo (vista fidelidad-curada) para la superficie cliente.
- `TASK-1504` (Producer Capability Expansion) — las capabilities nuevas (frames, motion-control, change-voice, translate, omni, voice-preset) declaran sus rutas como **entradas de dato nuevas** en este catálogo.

### Files owned

- `efeonce-globe/packages/contracts/src/producer-catalog.ts` (nuevo — tipos + vocabulario de rutas)
- `efeonce-globe/packages/contracts/src/index.ts` (edit — re-export + `GLOBE_CAPABILITIES` con la nueva autoridad)
- `efeonce-globe/packages/domain/src/producer-catalog.ts` (nuevo — dato del catálogo + drift guards + helpers + registro de readers)
- `efeonce-globe/packages/domain/src/index.ts` (edit — re-export del módulo del catálogo)
- `efeonce-globe/packages/domain/src/producer-catalog.test.ts` (nuevo — `node --test`)
- `efeonce-globe/apps/studio-web/src/app.ts` (edit — `registerProducerCatalogCapabilities(registry)` + grant de la autoridad al principal) `[verificar wiring exacto]`
- `efeonce-globe/packages/sdk/src/index.ts` (edit — método(s) tipados `listProducerRoutes`/`getProducerRoute`) `[verificar path/forma exacta del SDK]`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (delta de cierre en Greenhouse)
- `docs/documentation/creative-studio/*` + `docs/manual-de-uso/creative-studio/*` (doc funcional + manual, proporcional)

## Current Repo State

### Already exists

- El spine completo: `CapabilityRegistry` con `registerReader` / `dispatchReader` (envuelve en `ReaderResultV1`), coverage por surface fail-closed, `DispatchError`/`dispatchErrorToApiCode` (`efeonce-globe/packages/domain/src/index.ts`).
- El patrón de capability terminada: `registerModelLabCapabilities` + `LAB_COVERAGE` (`ui`/`mcp` `policy-blocked`; `http`/`sdk`/`cli`/`worker`/`e2e` `available`; `sister-platform` `not-applicable`), ports + DI, error de dominio mapeado (`efeonce-globe/packages/domain/src/model-lab.ts`).
- El contrato de fidelidad-route: `PrepareExperimentPayloadV1.referenceRoute: string` y la regla verificada en vivo `actualRoute == proposedRoute` (route del contrato de fidelidad), con el **slug en el campo `model`** — el ruteo capability→slug ocurre **dentro** del adapter (`vertex-adapter.ts`, `fal-adapter.ts`, `composite-adapter.ts`, `vertex-video-adapter.ts`, `vertex-omni-adapter.ts`).
- `CREATIVE_CAPABILITIES` (10 capabilities semánticas) y `FIDELITY_CONTRACTS` (5) en `packages/contracts/src/index.ts`.
- El estimate ya existe **dentro** de `execute`: `model-lab.ts:282` → `const estimate = await deps.runner.estimate({ experiment: stored, correlationId })`, y el runner lo resuelve con `FakeReferenceAdapter.estimate` → `FAKE_CREDITS[request.capability]` (`apps/creative-runner/src/index.ts`). Extraerlo a un reader por-ruta es `TASK-1502`.

### Gap

- **No existe** ninguna representación de "qué admite una ruta": ni constraints, ni specialty, ni `audioCapable`, ni modos de input, ni naming dual. El único naming es el `referenceRoute` crudo + el `model` slug.
- **No existe** una SSOT contra la cual `TASK-1501` valide el output-shape antes de reservar crédito.
- **No existe** la dimensión "ruta" que `TASK-1502` necesita para `costo = f(ruta, shape)`.
- **No existe** ninguna capability/reader `globe.producer.*` en el spine (solo `globe.spine.*`, `globe.lab.*`, `globe.run.prepare` reservada).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/domain`, `apps/studio-web`, `packages/sdk`); gobernanza documental en `greenhouse-eo`.
- Future candidate home: `remain-shared`
  <!-- Primitivo del chassis compartido consumido por el Producer y el Workbench; no se extrae por anticipado — EPIC-026/028 no autoriza una frontera nueva. -->
- Boundary: primitives canónicos = tipos del catálogo en `packages/contracts` (wire SSOT) + dato + helpers + readers en `packages/domain` (`registerProducerCatalogCapabilities`, `getProducerRoute`, `resolveRouteConstraints`). Consumers autorizados: `apps/studio-web` (transporte HTTP), `packages/sdk`, `TASK-1501`/`1502` (helper in-process), `TASK-1505`/`1474` (readers). **NUNCA** se crea un backend alterno ni se lee el catálogo salteando el reader/helper.
- Server/browser split: catálogo, drift guards y readers son **server-only** (dominio); el browser (1505) lo consume por el BFF (surface `http`). Ningún dato del catálogo se computa en cliente.
- Build impact: `none` — dato estático + tipos, cero dependencia pesada, cero filesystem input, cero SDK de provider.
- Extraction blocker: `none` estructural (no hay transacción/DB/provider); el único acoplamiento es el registro en el spine y el grant de la autoridad, ambos dentro de `efeonce-globe`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `PRODUCER_ROUTE_CATALOG` (dato versionado en `packages/domain/src/producer-catalog.ts`) + tipos en `packages/contracts`
- Consumidores afectados: `UI` (TASK-1505), `SDK`, `MCP` (futuro, policy-blocked), `worker`/`e2e` (conformance), y **in-process** TASK-1501 / TASK-1502
- Runtime target: `efeonce-globe` (`studio-web` HTTP privado; sin migración; sin external write)

### Contract surface

- Contrato existente a respetar: `packages/domain/src/index.ts` (`CapabilityRegistry`, `registerReader`, `ReaderResultV1`, `CapabilityDescriptorV1`, `GLOBE_SURFACES`, `SurfaceCoverageState`, `dispatchErrorToApiCode`); `packages/contracts/src/index.ts` (`CreativeCapability`, `GLOBE_CAPABILITIES`, `PrepareExperimentPayloadV1.referenceRoute`).
- Contrato nuevo o modificado: tipos `ProducerRouteDescriptorV1` / `RouteConstraintsV1` (union por `modality`) / `RouteSpecialtyV1` / `RouteInputMode` / `RouteNamingV1` / `ProducerCatalogViewV1` / queries `ProducerCatalogListQueryV1`/`ProducerCatalogGetQueryV1`; autoridad `globe.producer.catalog.read` en `GLOBE_CAPABILITIES`; readers `globe.producer.catalog.list`/`.get`; helpers in-process `getProducerRoute`/`resolveRouteConstraints`/`listProducerRoutes`.
- Backward compatibility: `compatible` — puramente aditivo; no toca `PrepareExperimentPayloadV1`, el Model Lab ni ningún command existente.
- Full API parity: reader transport-neutral en el `CapabilityRegistry`; UI/SDK/MCP/CLI son clientes del mismo reader; TASK-1501/1502 reusan el helper de dominio in-process (no re-dispatch). Coverage declarada por las 8 surfaces.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna DB. La entidad es el **dato en código** `PRODUCER_ROUTE_CATALOG` (frozen array versionado) + `PRODUCER_CATALOG_VERSION`. El bucket/store no participa.
- Invariantes que no se pueden romper: `routeId` único + `capability ∈ CREATIVE_CAPABILITIES` + `constraints.modality` coincide con la familia de la capability (drift guard con `throw` en carga); el slug del proveedor **nunca** aparece en el catálogo (guard no-slug-leak); naming dual **fail-closed a `client`** (una autoridad no-operadora nunca recibe `naming.internal`); constraints/specialty declarativos y estáticos (ningún consumer los deriva del proveedor en runtime).
- Tenant/space boundary: reference data global al deployment; el reader se sirve dentro del `TrustedCommandContextV1` (workspace derivado server-side). Un `routeId` invisible en la vista del caller es `not_found`, sin revelar existencia.
- Idempotency/concurrency: readers puros, read-only, idempotentes, sin estado mutable; sin locks ni `idempotencyKey`.
- Audit/outbox/history: `none` con rationale — reference data read-only sin efecto de estado; `PRODUCER_CATALOG_VERSION` + git son el historial; `correlationId` atraviesa la lectura.

### Migration, backfill and rollout

- Migration posture: `none` (dato en código, sin schema).
- Default state: `read-only`; `ui`/`mcp` nacen `policy-blocked`; surfaces internas (`http`/`sdk`/`cli`/`worker`/`e2e`) `available`.
- Backfill plan: `none`.
- Rollback path: `revert PR` — aditivo; borrar el registro del reader + el grant revierte sin residuo.
- External coordination: `none` — repo-only en `efeonce-globe`. Sin secrets, sin env vars, sin provider config.

### Security and access

- Auth/access gate: `capability` — reader gateado por `globe.producer.catalog.read`; la vista `internal` (modelo-real) requiere además una autoridad operadora `[verificar]`. Autoridad derivada server-side (`deriveTrustedContext`), nunca del payload.
- Sensitive data posture: `no sensitive data` — sin PII, sin secretos, sin costo vendor, sin margen, sin slug. El único dato con sensibilidad de negocio es modelo-real, protegido por la vista fail-closed a cliente.
- Error contract: canónicos del spine — `not_found` (routeId desconocido/invisible), `invalid_request` (query malformada), `policy_blocked` (surface no promovida), `access_denied` (sin la capability). Nunca prosa cruda ni detalle interno.
- Abuse/rate-limit posture: `none` con rationale — lectura hermética de dato estático, sin gasto ni efecto de estado; hereda el perímetro del spine (auth + trusted context).

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (tsc NodeNext strict + `node --test`) + `pnpm build`; foco `node --test packages/domain/src/producer-catalog.test.ts`.
- DB/runtime checks: `none` (sin DB). Verificar que los drift guards abortan la carga ante un catálogo inválido (test de dato corrupto).
- Integration checks: dispatch por el spine — `globe.producer.catalog.list`/`.get` (surface `http`) retorna la proyección; vista `client` sin modelo-real; `routeId` desconocido → `not_found`; surface `ui` → `policy_blocked`.
- Reliability signals/logs: `none` nuevo; conformance harness manifest-driven ejercita la coverage matrix del reader.
- Production verification sequence: `N/A — additive read-only reference reader`, gateado `policy-blocked` en `ui`/`mcp` hasta el gate de `TASK-1505`; sin runtime productivo mutante.

### Acceptance criteria additions

- [ ] Source of truth (`PRODUCER_ROUTE_CATALOG` + tipos en contracts), contract surface (readers + helpers) y consumers (1501/1502/1505/1474) nombrados con paths reales.
- [ ] Invariantes de dato (routeId único, capability válida, modality-match, no-slug-leak, naming fail-closed) explícitos y cubiertos por drift guards con `throw`.
- [ ] Postura de migración/backfill/rollback explícita (none/none/revert PR).
- [ ] Evidencia de runtime listada (`pnpm check`/`build` + dispatch + drift-guard test).
- [ ] Errores canónicos (`not_found`/`invalid_request`/`policy_blocked`/`access_denied`), sin fuga de slug/costo/margen, naming-view fail-closed.

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

### Slice 1 — Tipos + vocabulario (contracts)

- Crear `efeonce-globe/packages/contracts/src/producer-catalog.ts` con los tipos versionados:
  - `RouteInputMode` (union de string literals): `'prompt' | 'reference' | 'elements' | 'frames' | 'motion-source' | 'edit-target' | 'voice-script' | 'source-audio' | 'mention'`.
  - `RouteConstraintsV1` — **union discriminada por `modality`**:
    - `{ modality: 'image', quality: readonly string[], aspectRatio: readonly string[], count: { min: number; max: number } }`
    - `{ modality: 'video', resolution: readonly string[], duration: { minSeconds: number; maxSeconds: number; stepSeconds?: number }, aspectRatio: readonly string[], audioMode: readonly string[] }`
    - `{ modality: 'audio', sampleRate: readonly number[], format: readonly string[], speed: { min: number; max: number }, volume: { min: number; max: number }, pitch: { min: number; max: number } }`
  - `RouteSpecialtyV1` — flags declarativos opcionales: `{ multiSpeaker?: boolean; emotionTags?: boolean; hd?: boolean; longForm?: boolean; languages?: readonly string[] }`.
  - `RouteNamingV1` — `{ internal: string; client: string }` (modelo-real / fidelidad-curada; **sin slug**).
  - `ProducerRouteDescriptorV1` — `{ schemaVersion: '1'; routeId: string; capability: CreativeCapability; naming: RouteNamingV1; constraints: RouteConstraintsV1; specialty: RouteSpecialtyV1; audioCapable: boolean; inputModes: readonly RouteInputMode[]; fidelityContract?: FidelityContract }`.
  - `ProducerCatalogViewV1` — la proyección de wire del reader: como `ProducerRouteDescriptorV1` pero con `naming` recortado a la vista resuelta (`client` siempre; `internal` solo si autorizado).
  - `ProducerCatalogListQueryV1` — `{ capability?: CreativeCapability; modality?: 'image' | 'video' | 'audio' }` (filtros opcionales).
  - `ProducerCatalogGetQueryV1` — `{ routeId: string }`.
- Agregar `globe.producer.catalog.read` a `GLOBE_CAPABILITIES` (tuple cerrado). `[verificar naming en Plan Mode]`
- Re-exportar desde `packages/contracts/src/index.ts`. Cero comportamiento en este slice.

### Slice 2 — Dato del catálogo + drift guards + helpers (domain)

- Crear `efeonce-globe/packages/domain/src/producer-catalog.ts`:
  - `PRODUCER_CATALOG_VERSION` (string) + `PRODUCER_ROUTE_CATALOG: readonly ProducerRouteDescriptorV1[]` (frozen). **Seed real** (dato, no exhaustivo — ampliable editando el array):
    - image: rutas `image-generate` (quality tiers, aspect ratios, `count {min:1,max:4}`).
    - video: rutas `video-generate` con `duration {minSeconds:3,maxSeconds:10}`, `resolution ['720p']`, `aspectRatio ['16:9','9:16']`, `audioMode ['with-audio','silent']`, `audioCapable: true`, `inputModes ['prompt','reference','frames','motion-source','edit-target']` (valores anclados a specs verificadas de Omni/Veo en la skill — **seed, tunable como dato**).
    - audio: rutas `audio-generate`/`speech-synthesize` con `sampleRate`/`format`/`speed`/`volume`/`pitch` y `specialty { multiSpeaker, emotionTags, languages }`. `sampleRate`/`format` `[verificar contra los adapters reales — ElevenLabs / Seed Audio]`.
  - **Drift guards de carga** (ejecutados al importar el módulo, `throw` ante violación): routeId único; `capability ∈ CREATIVE_CAPABILITIES`; `constraints.modality` coincide con la familia de la capability; `audioCapable` solo `true` en rutas de video/audio; ningún campo del catálogo matchea un patrón de slug vendor conocido (`/^(fal-ai|bytedance)\//`, endpoints `run.app`, etc.).
  - Helpers in-process: `listProducerRoutes(filter?)`, `getProducerRoute(routeId): ProducerRouteDescriptorV1 | undefined`, `resolveRouteConstraints(routeId): RouteConstraintsV1 | undefined` — **estos son la SSOT que TASK-1501/1502 reusan** (documentar el contrato de reuse in-process, no re-dispatch).
- Test `producer-catalog.test.ts` (`node --test`): guards abortan ante dato corrupto; helpers filtran por capability/modality; no-slug-leak.

### Slice 3 — Readers gobernados + naming-view fail-closed (domain + studio-web)

- En `producer-catalog.ts`, `registerProducerCatalogCapabilities(registry: CapabilityRegistry)`:
  - `PRODUCER_CATALOG_COVERAGE` (espejo de `LAB_COVERAGE`): `ui`/`mcp` `policy-blocked`; `http`/`sdk`/`cli`/`worker`/`e2e` `available`; `sister-platform` `not-applicable`.
  - Reader `globe.producer.catalog.list` (`requiredCapability: globe.producer.catalog.read`) → proyecta `PRODUCER_ROUTE_CATALOG` filtrado por la query, con `naming` recortado por la vista resuelta server-side desde el trusted context (fail-closed a `client`).
  - Reader `globe.producer.catalog.get` (`requiredCapability: globe.producer.catalog.read`) → un route por `routeId`; `not_found` (`DispatchError('capability_not_found')`) si es desconocido o no visible en la vista del caller. Query malformada → `InvalidExperimentRequestError` (mapeado a `invalid_request`).
  - `resolveNamingView(context): 'internal' | 'client'` server-side: `internal` solo con la autoridad operadora `[verificar]`; default `client`.
- Wire en `apps/studio-web/src/app.ts`: `registerProducerCatalogCapabilities(registry)` + grant de `globe.producer.catalog.read` al principal correspondiente (broker grant humano y/o service principal). `[verificar wiring]`
- Re-export desde `packages/domain/src/index.ts`.
- Tests: dispatch `list`/`get` por `http`; vista `client` sin modelo-real; `get` con routeId desconocido → `not_found`; surface `ui` → `policy_blocked`.

### Slice 4 — Parity SDK + coverage matrix + cierre documental

- Método(s) tipados en `packages/sdk/src/index.ts` (o reuse de `dispatchReader` del `GlobeClient`): `listProducerRoutes(query?)`, `getProducerRoute(routeId)`. `[verificar path/forma]`
- Declarar la coverage matrix del reader (conformance manifest-driven la ejercita sola; no escribir backdoor de test que salte el spine).
- Documentar el contrato de reuse in-process para TASK-1501/1502 (helper de dominio, no re-dispatch).
- Cierre documental en Greenhouse (delta a la spec del Producer + doc funcional + manual, proporcional).

## Out of Scope

- El **contrato de run discriminado** (`PrepareExperimentPayloadV1` → union por modalidad + validación de shape) es `TASK-1501`. Acá solo se provee el SSOT de constraints; la validación la escribe 1501 consumiendo `resolveRouteConstraints`.
- El **estimate previewable** (`✨N` pre-spend, extraer de dentro de `execute`) es `TASK-1502`.
- El **retrieval de outputs / asset actions** es `TASK-1503`.
- Las **capabilities nuevas** (frames, motion-control, change-voice, translate, omni, voice-preset registry) son `TASK-1504`; acá solo se declaran sus **rutas como dato** cuando existan (el catálogo es ampliable).
- La **superficie UI** (chassis + paneles por modalidad + feed) es `TASK-1505`.
- El **ruteo route→slug del proveedor** vive en los adapters (`apps/creative-runner/src/*-adapter.ts`); no se toca ni se replica acá.

## Detailed Spec

**Por qué el catálogo separa `routeId` (wire) de `naming` (display) y del slug (adapter).** Hay tres identidades distintas que Higgsfield colapsa y Globe mantiene separadas:

1. `routeId` — el string estable que cruza el contrato como `referenceRoute` y que el adapter recibe; es el **contrato de fidelidad**, la regla verificada en vivo `actualRoute == proposedRoute`.
2. `naming.internal` / `naming.client` — labels de **display**: modelo-real para el operador Efeonce, fidelidad-curada para el cliente. Nunca cruzan al runner; son para la superficie.
3. slug del proveedor (`bytedance/seedream/v5/pro/...`, endpoints de queue) — vive **solo dentro del adapter**, resuelto de `capability`+`route`. El catálogo jamás lo conoce; el guard de no-slug-leak lo hace estructuralmente imposible.

**Discriminación por modalidad como fail-closed de compilación.** `RouteConstraintsV1` es una union discriminada por `modality`. Con `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`, una ruta image no puede portar `sampleRate` y una ruta audio no puede portar `resolution` — el error es de compilación, no de runtime. Esto es lo que hace que "diseñado para las 3 modalidades desde el día 1" no sea reescritura: agregar una modalidad es una rama nueva de la union + entradas de dato, sin tocar el motor del reader (mismo test "dato vs motor" del eval harness).

**El helper in-process es tan importante como el reader.** `TASK-1501` no debe re-dispatch `globe.producer.catalog.get` por el registry desde dentro de su handler de validación (eso duplicaría el guardrail y acoplaría dos capabilities por el wire). Consume `resolveRouteConstraints(routeId)` **en proceso** — exactamente como el eval harness reusa `runModelLabExperiment` por helper, no por re-dispatch. El reader (para la UI) y el helper (para 1501/1502) proyectan el **mismo** dato: un consumer nunca reconstruye constraints por su cuenta.

**Naming-view fail-closed.** `resolveNamingView` retorna `client` por default y `internal` solo bajo autoridad operadora. La proyección `ProducerCatalogViewV1` de una vista `client` **omite** `naming.internal` (no lo pone en `null` — lo omite, `exactOptionalPropertyTypes`). Un `get` sobre un `routeId` cuya vista no es visible al caller es `not_found`, nunca "existe pero no puedes verlo" — mismo patrón que el Model Lab con ids cross-workspace (`capability_not_found` → `not_found`, sin revelar existencia).

**Seed values como dato, no como verdad congelada.** Los constraints seed (duración 3-10 s, 720p, count 1-4, etc.) están anclados a specs verificadas en vivo (skill `greenhouse-globe`: Omni 3-10 s / 720p / 24fps / 16:9|9:16; Veo similar; image batch 1-4). Son **seed de dato**: cuando un adapter cambie sus límites, se edita el array del catálogo + su versión, no el código del reader. Los valores de audio (`sampleRate`/`format`) quedan `[verificar]` contra los adapters reales de audio antes de congelarlos.

## Rollout Plan & Risk Matrix

Cambio aditivo, gobernado por coverage `policy-blocked` en `ui`/`mcp` hasta el gate de `TASK-1505`. Sin migración, sin external write, sin spend, sin runtime productivo mutante. Rollback = revert PR + (si ya estuviera prendida alguna surface) flip de coverage a `policy-blocked`.

### Slice ordering hard rule

- Slice 1 (tipos + vocabulario) → Slice 2 (dato + drift guards + helpers) → Slice 3 (readers + wiring) → Slice 4 (SDK + coverage + docs).
- Slice 2 **debe** shippear antes que Slice 3: el reader proyecta el dato + helpers del Slice 2; sin ellos el reader no tiene qué servir.
- Slice 4 (SDK/parity/docs) corre después de Slice 3 verde; puede solaparse con el cierre documental una vez que los readers dispatchan.
- Ningún slice prende `ui`/`mcp` — esa promoción es del gate de `TASK-1505`, fuera de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un slug de proveedor se filtra al catálogo (naming o routeId) | provider seam / naming dual | medium | Drift guard de no-slug-leak con `throw` en carga + test dedicado; revisión de código del provider seam | Fallo de carga en `pnpm check`; conformance rojo |
| Vista modelo-real se sirve a una autoridad no-operadora | naming dual / access | medium | `resolveNamingView` fail-closed a `client`; `internal` requiere autoridad explícita; test de proyección por vista | Test de vista rojo; revisión de grant |
| Constraints del catálogo divergen de lo que el adapter realmente admite (30 s en un modelo de 10 s) | contrato discriminado / spend fence downstream | medium | Constraints como dato anclado a specs verificadas; TASK-1501 valida shape fail-closed pre-spend contra este SSOT; el hard spend fence del Lab es la última red | `invalid_request` esperado en 1501; run que reserva de más |
| Un `routeId` referencia una capability inexistente o modality mismatch | integridad de dato | low | Drift guard `capability ∈ CREATIVE_CAPABILITIES` + modality-match con `throw` en carga | Fallo de carga en `pnpm check` |
| Un consumer reconstruye constraints por su cuenta en vez de usar el helper | Full API Parity | low | Documentar y exigir `resolveRouteConstraints` como único SSOT in-process; revisión en 1501/1502 | Lógica duplicada en review |

### Feature flags / cutover

- Sin flag de env nuevo. El control es la **coverage matrix** del reader: `ui`/`mcp` nacen `policy-blocked` (declaradas, gobernadas, apagadas), surfaces internas `available`. Promover `ui` a `available` es una edición de `PRODUCER_CATALOG_COVERAGE` + gate de `TASK-1505` (GVC), fuera de esta task. Revert de la promoción: coverage a `policy-blocked` + redeploy de `studio-web`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR (tipos + vocabulario aditivos) | <5 min | si |
| Slice 2 | Revert PR (dato + helpers; sin consumers aún) | <5 min | si |
| Slice 3 | Quitar `registerProducerCatalogCapabilities` + grant, o coverage a `policy-blocked` + redeploy `studio-web` | <15 min | si |
| Slice 4 | Revert del método SDK + del delta docs | <5 min | si |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verde (tsc strict + `node --test` de todos los packages/apps + conformance).
2. Dispatch local `globe.producer.catalog.list` (surface `http`) → retorna la proyección esperada; vista `client` no incluye `naming.internal`.
3. Dispatch local `globe.producer.catalog.get` con `routeId` desconocido → `not_found`; surface `ui` → `policy_blocked`.
4. Drift-guard test: catálogo corrupto (capability inválida / slug filtrado) aborta la carga con `throw`.
5. Deploy de `studio-web` a Cloud Run `globe-studio-internal` (privado, keyless) — el reader queda alcanzable por las surfaces internas; `ui`/`mcp` `policy-blocked` hasta `TASK-1505`.

### Out-of-band coordination required

`N/A — repo-only change` en `efeonce-globe`. Sin secrets, sin env vars, sin provider config, sin coordinación externa. El cierre documental ocurre en Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `PRODUCER_ROUTE_CATALOG` existe como dato versionado (frozen) en `packages/domain/src/producer-catalog.ts`, con `PRODUCER_CATALOG_VERSION`, y agregar una ruta es editar el array (cero cambio en el motor del reader).
- [ ] `ProducerRouteDescriptorV1` expone por ruta: `capability`, `constraints` (union discriminada por modalidad: resolución/duración/sampleRate/formato/count con límites), `specialty` (multi-speaker / emotion-tags / HD / long-form / idiomas), `audioCapable`, `inputModes` y `naming` dual (interno/cliente).
- [ ] El slug del proveedor **no aparece** en ningún campo del catálogo; un drift guard con `throw` rechaza en carga cualquier naming/routeId que matchee un patrón de slug vendor.
- [ ] Los readers `globe.producer.catalog.list` y `globe.producer.catalog.get` están registrados en el `CapabilityRegistry`, gateados por `globe.producer.catalog.read`, con coverage por las 8 `GLOBE_SURFACES` (`ui`/`mcp` `policy-blocked`; internas `available`; `sister-platform` `not-applicable`).
- [ ] La vista de naming se resuelve server-side y es **fail-closed a cliente**: una autoridad no-operadora nunca recibe `naming.internal`; un `routeId` invisible/desconocido es `not_found`.
- [ ] Los helpers in-process `getProducerRoute` / `resolveRouteConstraints` / `listProducerRoutes` están exportados desde el dominio y documentados como el SSOT que `TASK-1501` y `TASK-1502` reusan sin re-dispatch.
- [ ] Drift guards con `throw` en carga: routeId único, `capability ∈ CREATIVE_CAPABILITIES`, modality-match, `audioCapable` coherente, no-slug-leak — cada uno con test en `node --test`.
- [ ] Método(s) SDK tipados exponen `list`/`get` como cliente del mismo reader (parity).
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verde; conformance ejercita la coverage matrix del reader sin backdoor.
- [ ] Errores canónicos verificados: `not_found` (routeId desconocido/invisible), `invalid_request` (query malformada), `policy_blocked` (surface no promovida), `access_denied` (sin capability). Sin fuga de slug/costo/margen.

## Verification

- `cd ../efeonce-globe && pnpm check` (tsc NodeNext strict + `node --test`)
- `cd ../efeonce-globe && pnpm build`
- `node --test packages/domain/src/producer-catalog.test.ts` (drift guards, helpers, filtros, no-slug-leak, naming fail-closed)
- Dispatch manual por el spine: `globe.producer.catalog.list` / `.get` (surface `http`) — proyección correcta, vista `client` sin modelo-real, routeId desconocido → `not_found`, surface `ui` → `policy_blocked`
- Verificar que TASK-1501/1502 pueden importar `resolveRouteConstraints` in-process (smoke de import, sin re-dispatch)

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] chequeo de impacto cruzado ejecutado sobre `TASK-1501`, `TASK-1502`, `TASK-1504`, `TASK-1505`, `TASK-1474` (marcar el gap "no existe catálogo/constraints SSOT" como cerrado en cada una)
- [ ] delta de cierre agregado a `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (contratos de tipos + readers + helpers reales) y doc funcional/manual proporcional en `creative-studio/`
- [ ] la nueva capability `globe.producer.catalog.read` quedó grantada a ≥1 principal real en el **mismo PR** (grant coverage; Globe: broker grant / service principal en `app.ts`)

## Follow-ups

- Ampliar el catálogo con las rutas de `TASK-1504` (video-frames, motion-control, audio change-voice / translate, omni multi-output, voice-preset) como entradas de dato nuevas cuando esas capabilities aterricen.
- Resolver los umbrales de batch-of-N por modalidad (image 1-4 confirmado; video/audio `[verificar]` dado el costo) — se resuelve como **dato** en `count`/límites del catálogo, no como código (open question de la spec del Producer).
- Confirmar los valores de `sampleRate`/`format` de audio contra los adapters reales (ElevenLabs / Seed Audio) antes de congelarlos.
- Decidir en Plan Mode el naming exacto de la autoridad (`globe.producer.catalog.read`) y la señal de vista `internal` (reuse de una capability operadora existente vs. `globe.producer.route.reveal_model` nueva).
- Cuando aterrice `TASK-1465` (tenancy), evaluar si el catálogo permite overrides/visibilidad per-workspace (hoy es reference data global); mantener el naming dual como el eje de gobierno de la superficie cliente (`TASK-1474`).

## Open Questions

- ¿La vista `internal` (modelo-real) se gobierna por una capability dedicada o por reuse de una autoridad operadora existente (p.ej. la del Lab)? — decisión de Plan Mode; el default seguro es fail-closed a `client`.
- ¿El `routeId` debe alinearse 1:1 con `FIDELITY_CONTRACTS` o es una clave de ruta más granular con `fidelityContract?` opcional como linkage? — se propone la segunda (más granular), a confirmar.
- ¿El catálogo necesita un reader de "versión" separado para que la UI invalide caché al cambiar `PRODUCER_CATALOG_VERSION`, o basta con incluir la versión en la proyección `list`? — resolver en `TASK-1505`.
