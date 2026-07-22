# TASK-1494 — Globe Reference Intelligence / Style DNA

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `creative|ai`
- Blocked by: `none`
- Branch: `task/TASK-1494-globe-reference-intelligence-style-dna`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Un motor de inteligencia de referencias ("Style DNA") que analiza una referencia (imagen o
moodboard) y extrae un **perfil estructurado** — paleta dominante con pesos, descriptores de estilo
**con score de confianza**, y composición/encuadre — y luego habilita conditioning explícito sobre
la generación: **"igualar paleta"**, **"igualar composición"** y **fuerza de estilo** (0..1). Hoy la
referencia cruza el contrato como un simple hash con postura de derechos (`LabAuthorizedInputV1`) y
se pasa inline al proveedor **sin inspección alguna**; no existe ningún componente que mire los bytes
para producir un perfil. Es un motor nuevo: el análisis pasa por el **seam de proveedor** del Model
Lab (adapter `CreativeProviderAdapter`), NUNCA por un SDK de proveedor directo, y reusa el canal de
private-ingest content-addressed que dejó TASK-1490.

## Why This Task Exists

El workbench de TASK-1474 está diseñado como una agencia creativa: parte del flujo es "traé una
referencia y decime cómo la usás" (igualá su paleta, imitá su composición, aplicá su estilo con tal
intensidad). El backend hoy no puede dar vida a nada de eso. La referencia entra al contrato **solo
como identidad content-addressed**: `LabAuthorizedInputV1 = { inputId, sha256, mediaType, rights }`
(`packages/contracts/src/index.ts`), y el runner la resuelve a bytes por el `InputResolverPort` solo
para **entregársela al proveedor tal cual** (`apps/creative-runner/src/input-resolver.ts`,
`#resolveInputs`). En ningún punto se **inspecciona** la referencia para extraer color, estilo o
composición, y el brief (`PrepareExperimentPayloadV1`) no tiene ningún campo para declarar **cómo**
debe influir esa referencia — solo la adjunta como input opaco. El diseño evolucionó (Style DNA es
una capacidad de primera clase del workbench) mientras el backend sigue tratando la referencia como
una caja negra que se reenvía. Esta task cierra ese gap con un motor de análisis gobernado + un
contrato de conditioning, sin romper el seam ni el boundary Globe↔Greenhouse.

## Goal

- Un **contrato de perfil de referencia** (`ReferenceProfileV1`) canónico, transport-neutral y
  determinista: paleta (colores dominantes + peso), descriptores de estilo (cada uno con score de
  confianza) y composición/encuadre. Es evidencia, no opinión suelta.
- Un **motor de análisis gobernado** que resuelve la referencia por private-ingest y produce ese
  perfil, con la parte semántica (estilo + composición) ruteada por el **seam de proveedor**
  (`CreativeProviderAdapter`) — NUNCA un SDK directo — y fenceada por spend fence + kill switch. El
  perfil se cachea content-addressed por el `sha256` de la referencia (mismos bytes ⇒ mismo perfil).
- Un **contrato de conditioning** en el brief (`referenceConditioning`: `match-palette` /
  `match-composition` / `style-strength`) que referencia un perfil ya analizado y se **compila
  server-side** a la instrucción del proveedor, cableado en el path `prepare → execute` existente.
- Todo nace con **Full API Parity**: command + reader transport-neutral con coverage; `ui`/`mcp`
  pueden nacer `policy-blocked` hasta la promoción de ruta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (§② — este es
  el gap `TASK-1494`)
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `.claude/skills/greenhouse-globe/SKILL.md` (contrato de arquitectura de Globe: boundary, provider
  seam, private-ingest, dual-transport)
- (repo hermano `efeonce-globe`) `docs/architecture/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` y
  `docs/architecture/EFEONCE_GLOBE_MODEL_LAB_V1.md` (spine + Model Lab; los invariantes del seam)

Reglas obligatorias:

- **Boundary DURO Globe↔Greenhouse:** el CÓDIGO del motor vive en `efeonce-globe` (contracts, domain,
  creative-runner, provider adapters). **Greenhouse gobierna lifecycle/documentación/evidencia**, no
  hospeda el runtime. Esta task no crea código de análisis en `greenhouse-eo/src/**`.
- **El provider seam es sagrado.** El análisis semántico (estilo + composición) es una llamada de
  proveedor como cualquier otra: se despacha por `CreativeProviderAdapter`
  (`packages/provider-contract/src/index.ts:134`) y su único punto de invocación en el runner.
  **NUNCA** instanciar un SDK de proveedor (Vertex/Gemini/Fal) fuera del adapter; **NUNCA** llamar
  una API de visión directamente desde el dominio o el contrato.
- **Private-ingest, nunca bytes por el wire.** La referencia se resuelve a bytes SOLO server-side por
  el `InputResolverPort` content-addressed (`apps/creative-runner/src/input-resolver.ts`). Ni la
  referencia ni el perfil crudo cruzan la API; el contrato transporta hash + perfil estructurado
  saneado, nunca los bytes ni el output crudo del proveedor.
- **Fence + kill switch + fail-closed.** Toda invocación de proveedor (incluido el análisis) pasa por
  `SpendFencePort` (`packages/domain/src/spend-fence.ts`) y el kill switch del Lab
  (`LabKillSwitchPort`). Sin store/proveedor configurado, el motor **degrada honesto** (no perfil
  fabricado, no score inventado), igual que el edit reference-based de TASK-1490 falla closed.
- **Full API Parity:** la lógica vive en el primitive (`packages/domain` + `packages/contracts`), no
  en un handler acoplado a la UI. Un solo primitive, muchos consumers (UI/Nexa/MCP/SDK/CLI por
  construcción vía el spine y su coverage).
- **Determinismo y honestidad del score:** un perfil es evidencia. El score de un descriptor de
  estilo es la **confianza reportada por el análisis**, nunca un número decorativo (el workbench hoy
  muestra un "94" fabricado — este motor NO debe reproducir esa ficción).

## Normative Docs

- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` — el canal de
  private-ingest content-addressed (`InputResolverPort`/`OutputIngestPort`), el patrón de resolución
  de bytes server-internal y la regla de degradación honesta se reusan aquí.
- `docs/tasks/complete/TASK-1481-globe-api-contract-spine-cross-surface-harness.md` — el spine
  (`CapabilityRegistry`, `registerCommand`/`registerReader`, `TrustedCommandContextV1`, coverage
  manifest) sobre el que se monta el command/reader nuevo.

## Dependencies & Impact

### Depends on

- `TASK-1481` (complete) — Globe API Contract Spine: `CapabilityRegistry`, descriptores
  command/reader, `TrustedCommandContextV1`, `coverage` manifest. El análisis se registra como
  capability del spine, no como endpoint suelto.
- `TASK-1490` (complete) — el input/output seam content-addressed: `InputResolverPort` +
  `ResolvedInputV1` (array con `mediaType`) + el store privado de media. El motor resuelve la
  referencia por ese mismo canal; sin él, no hay bytes que analizar. [verificar que el
  `InputResolverPort` expuesto por 1490 cubre inputs `internal-owned`/`licensed`, no solo
  `test-fixture`/edit-base]

### Blocks / Impacts

- `TASK-1474` (Globe Professional Studio Workbench) — consume Style DNA (panel de referencia,
  "igualar paleta"/"igualar composición"/fuerza de estilo). Sin esta task, ese panel no tiene
  backend.
- `TASK-1493` (Structured Brief Composition + Recipe Registry) — el conditioning de referencia es un
  ingrediente más del brief compuesto; ambos escriben sobre `PrepareExperimentPayloadV1`. Coordinar
  la forma del campo para no colisionar (referencia como ingrediente `paleta`/`estilo` del Prompt
  Studio vs. `referenceConditioning` explícito). [verificar orden de merge con TASK-1493]

### Files owned

- (repo `efeonce-globe`) `packages/contracts/src/**` — `ReferenceProfileV1`, `ReferenceConditioningV1`,
  extensión de `PrepareExperimentPayloadV1`, nombres wire del command/reader nuevo.
- (repo `efeonce-globe`) `packages/domain/src/**` — el handler de análisis, el compilador de
  conditioning server-side, la cache content-addressed del perfil, wiring de coverage.
- (repo `efeonce-globe`) `packages/provider-contract/src/**` — la extensión del seam para análisis
  (capability nueva o método/port de análisis en el adapter).
- (repo `efeonce-globe`) `apps/creative-runner/src/**` — la resolución de la referencia para análisis
  + el despacho al adapter de visión.
- `docs/tasks/to-do/TASK-1494-globe-reference-intelligence-style-dna.md`

## Current Repo State

### Already exists

- El contrato de input content-addressed: `LabAuthorizedInputV1 = { inputId, sha256, mediaType,
  rights }` y `LabInputMediaType = 'image' | 'video' | 'audio' | 'text'`
  (`packages/contracts/src/index.ts`).
- El seam de proveedor: `interface CreativeProviderAdapter<TRequest>` con `supports/estimate/submit/
  poll` (`packages/provider-contract/src/index.ts:134`) y el catálogo `CREATIVE_CAPABILITIES` (10
  capabilities de generación/edición; **ninguna de análisis**).
- La resolución privada de bytes: `InputResolverPort`/`FixtureInputResolver`/`GcsInputResolver` con
  re-verificación de `sha256` (`apps/creative-runner/src/input-resolver.ts`).
- El spine para montar la capability: `CapabilityRegistry.registerCommand`/`registerReader`,
  `TrustedCommandContextV1`, `LAB_COVERAGE` (`ui: policy-blocked`, `mcp: policy-blocked`, http/sdk/
  cli/worker/e2e `available`) en `packages/domain/src/model-lab.ts`.
- El fence y el kill switch: `SpendFencePort` (`packages/domain/src/spend-fence.ts`),
  `LabKillSwitchPort` — toda invocación de proveedor ya está fenceada.

### Gap

- **Cero inspección de la referencia.** No hay `ReferenceProfileV1` ni ningún analizador; la
  referencia se reenvía al proveedor tal cual (`input-resolver.ts` resuelve bytes, no los analiza).
- **Cero conditioning declarable.** `PrepareExperimentPayloadV1` no tiene campo para "igualar
  paleta" / "igualar composición" / fuerza de estilo; la referencia es un input opaco sin semántica
  de uso.
- **Cero capability de análisis en el seam.** `CREATIVE_CAPABILITIES` solo cubre generar/editar; no
  hay un carril de análisis por el adapter.
- **El score de estilo no existe** (el "94" del workbench es fabricado; `evaluation.ts` nunca
  auto-puntúa).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (monorepo: `packages/contracts`, `packages/domain`,
  `packages/provider-contract`, `apps/creative-runner`). Greenhouse solo gobierna lifecycle/docs.
- Future candidate home: `remain-shared`
- Boundary: el primitive es la capability de análisis del spine (command
  `globe.lab.reference.analyze` + reader `globe.lab.reference.profile.get`) y el contrato
  `ReferenceProfileV1`; consumers autorizados = spine surfaces (http/sdk/cli/worker/e2e; ui/mcp
  `policy-blocked` hasta gate) y, río arriba, el path `prepare → execute` que lee el conditioning.
- Server/browser split: server-only completo. Los bytes de la referencia y la llamada al proveedor
  viven en el runner/adapter; el browser solo ve el perfil estructurado saneado vía reader. Ningún
  secreto ni byte crudo cruza al cliente.
- Build impact: reusa el transport del adapter existente (Vertex/Fal) para visión; sin dependencia
  pesada nueva salvo, eventualmente, una librería de clustering de color server-side para la paleta
  determinista (evaluar `sharp`/equivalente ya presente en el runner). [verificar deps del runner]
- Extraction blocker: el seam de proveedor + la resolución content-addressed de inputs + el spend
  fence atan este motor al runtime de `efeonce-globe`; no es extraíble a un package independiente sin
  arrastrar el proveedor y el store privado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: el manifest/store de experimentos del Model Lab (Globe) + una proyección
  nueva `ReferenceProfileV1` content-addressed por `sha256` de la referencia.
- Consumidores afectados: `UI` (workbench TASK-1474), `SDK`/`MCP` (parity, policy-blocked hasta
  gate), `worker`/`CLI` (análisis batch), el path `prepare → execute` (conditioning).
- Runtime target: `worker` (creative-runner) + `external` (proveedor de visión por el seam).

### Contract surface

- Contrato existente a respetar: `PrepareExperimentPayloadV1`, `LabAuthorizedInputV1`,
  `CreativeProviderAdapter<TRequest>`, `CapabilityRegistry`/coverage
  (`packages/contracts/src/index.ts`, `packages/provider-contract/src/index.ts`,
  `packages/domain/src/model-lab.ts`).
- Contrato nuevo o modificado:
  - `ReferenceProfileV1` (nuevo) — perfil estructurado: `palette` (colores dominantes + peso),
    `styleDescriptors` (cada uno `{ label, score }`), `composition` (encuadre/layout).
  - `ReferenceConditioningV1` (nuevo) — `{ profileRef, mode: 'match-palette' | 'match-composition',
    styleStrength: number(0..1) }`, modos combinables; campo opcional nuevo `referenceConditioning`
    en `PrepareExperimentPayloadV1`.
  - Command `globe.lab.reference.analyze` + reader `globe.lab.reference.profile.get` (nombres wire
    nuevos, registrados en el spine con el mismo patrón que `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS`).
  - Extensión del seam para análisis: capability `reference-analyze` en `CREATIVE_CAPABILITIES` **o**
    un método/port de análisis en el adapter — decisión de diseño en Zone 2 (ver Open Questions).
- Backward compatibility: `compatible` — todos los campos nuevos son opcionales/aditivos; sin
  `referenceConditioning` el path `prepare → execute` se comporta exactamente como hoy.
- Full API parity: el análisis y el conditioning son command/reader del spine con coverage; la UI y
  Nexa los operan por construcción, no por integración ad hoc. Escritura de estado (mint del perfil,
  gasto de fence) solo por el command gobernado.

### Data model and invariants

- Entidades/tablas/views afectadas: store de experimentos del Model Lab (Globe) + proyección
  `reference_profile` content-addressed por `sha256`. [verificar naming/schema del store en Globe]
- Invariantes que no se pueden romper:
  - Un `ReferenceProfileV1` es determinista respecto de sus bytes: mismo `sha256` ⇒ mismo perfil
    (cache content-addressed; el análisis se repite solo si cambia el proveedor/modelo de análisis).
  - El score de un `styleDescriptor` es la confianza reportada por el análisis, en `[0,1]`; NUNCA un
    valor decorativo ni un placeholder.
  - Ni los bytes de la referencia ni el output crudo del proveedor cruzan el contrato; solo el perfil
    saneado + el `sha256`.
  - El análisis semántico se despacha SOLO por `CreativeProviderAdapter`; cero SDK directo.
  - `referenceConditioning.profileRef` debe apuntar a un perfil ya analizado del mismo workspace; un
    conditioning sobre un perfil inexistente/ajeno falla closed en `prepare`.
- Tenant/space boundary: `context.workspaceId` de `TrustedCommandContextV1`; el perfil y la
  referencia pertenecen al workspace del caller. No analizar ni condicionar con referencias de otro
  tenant.
- Idempotency/concurrency: `idempotencyKey` por `analyze`; dado un `sha256` ya analizado con el mismo
  modelo de análisis, el command retorna el perfil cacheado sin re-gastar fence (analysis no
  facturable dos veces por los mismos bytes).
- Audit/outbox/history: el análisis emite el mismo audit/manifest que un experimento (es una
  invocación de proveedor fenceada); evaluar un signal "análisis degradado" (proveedor/​store no
  configurado ⇒ perfil no producido).

### Migration, backfill and rollout

- Migration posture: `additive` — proyección `reference_profile` nueva + campos opcionales en
  contratos; sin migración destructiva.
- Default state: `flag OFF` — el motor nace detrás del kill switch del Lab / flag de habilitación
  (`GLOBE_LAB_ENABLED` + proveedor configurado); coverage `ui: policy-blocked` / `mcp:
  policy-blocked`.
- Backfill plan: N/A — nada que backfillear; los perfiles se generan on-demand y se cachean.
- Rollback path: `revert PR` + flag OFF; los campos opcionales quedan ignorados. Sin estado durable
  mutado que restaurar.
- External coordination: el proveedor de visión ya está detrás del adapter (Vertex/Fal); requiere que
  el servicio tenga el proveedor real habilitado (no `fake`) para producir perfiles reales — canary
  gated por humano, igual que TASK-1486/1487/1490.

### Security and access

- Auth/access gate: `capability` del spine (`GLOBE_LAB_EXPERIMENT_CAPABILITY` o una capability de
  análisis dedicada) + `TrustedCommandContextV1`; el caller real hoy es el service principal del
  bridge de Greenhouse (`globe-api-internal`), como en TASK-1490.
- Sensitive data posture: la referencia puede ser material licenciado/de cliente (`rights:
  'licensed'`); su postura de derechos se preserva y NUNCA se lava en el perfil derivado. No PII
  financiera/laboral.
- Error contract: errores saneados por adapter (`analysis_unavailable`, `provider_failed`,
  `reference_not_found`, `profile_ref_mismatch`); nunca el body crudo del proveedor ni el secreto.
- Abuse/rate-limit posture: spend fence + kill switch + idempotencia por `sha256`; la cache
  content-addressed evita re-análisis del mismo material.

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (typecheck + `node --test`) — tests unitarios del
  contrato `ReferenceProfileV1`, del compilador de conditioning y de la cache determinista (con
  transport de proveedor mockeado, sin gasto).
- DB/runtime checks: verificar que un mismo `sha256` produce el perfil cacheado sin re-gastar fence;
  que `referenceConditioning` con `profileRef` ajeno/inexistente falla closed en `prepare`.
- Integration checks: canary en vivo — analizar una referencia real por el seam (adapter de visión)
  y verificar `ReferenceProfileV1` con paleta + descriptores scoreados + composición; luego un
  `prepare → execute` con `match-palette` que se compile a la instrucción del proveedor. Gated por
  `GLOBE_LAB_ENABLED` + proveedor real.
- Reliability signals/logs: manifest del análisis + signal "análisis degradado"; el estado de rollout
  vivo se registra en `efeonce-globe/Handoff.md`, no en esta task.
- Production verification sequence: ver Zone 3 → Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales del repo `efeonce-globe`.
- [ ] Invariantes (determinismo por `sha256`, honestidad del score, no-bytes-por-wire, no-SDK-directo)
      y boundary tenant/workspace explícitos.
- [ ] Postura de migración/rollback aditiva y proporcional (flag OFF + coverage policy-blocked).
- [ ] Evidencia runtime listada para el análisis y el conditioning (canary por el seam).
- [ ] Errores canónicos saneados; sin fuga de bytes crudos, output de proveedor ni secreto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Approved Producer target addendum — styles, presets and auto-route policy

This task also owns the reusable styles/presets and Style DNA projections consumed by Producer. A style/preset is
a versioned workspace resource whose application compiles into the governed brief/conditioning contract; it is
not an arbitrary provider payload saved by the browser.

- Provide create/version/list/get/materialize semantics for styles/presets, including provenance, reference
  rights, author and compatibility metadata.
- Style DNA remains evidence with confidence/unsupported states; applying it records the exact profile/version and
  strength in the effective recipe.
- Add a read-only auto-route recommendation policy that evaluates the governed catalog against prompt, modality,
  style/reference and policy signals. It returns a recommendation with bounded reasons and constraints, but does
  not reserve, execute or silently fall back.
- Persist/audit recommended route, human-selected route and actual executed route as separate facts. UI contracts
  expose public model labels and estimates, never provider slugs, vendor cost or margin.
- Route execution and modality availability remain owned by their respective catalog/run owners and `TASK-1504`;
  this task does not add providers or modalities.

Additional acceptance evidence:

- [ ] Styles/presets are versioned, tenant-safe and materialize identically across supported consumers.
- [ ] Auto-route recommendation is deterministic for a pinned catalog/policy version and performs no spend.
- [ ] Recommended, selected and actual route are distinguishable in contract, persistence and audit evidence.

### Slice 1 — Contrato `ReferenceProfileV1` + capability de análisis en el spine

- Definir en `packages/contracts` la forma canónica del perfil: `ReferenceProfileV1` con `palette`
  (lista de `{ hex/rgb, weight }`), `styleDescriptors` (lista de `{ label, score∈[0,1] }`) y
  `composition` (encuadre/layout/regla-de-tercios y afines), todo transport-neutral y serializable.
- Registrar en el spine el command `globe.lab.reference.analyze` (mint del perfil) y el reader
  `globe.lab.reference.profile.get` (leer un perfil por `sha256`/`profileRef`), con coverage
  `ui: policy-blocked` / `mcp: policy-blocked`, resto `available`, siguiendo el patrón de
  `registerCommand`/`registerReader` de `model-lab.ts`.
- Tests unitarios del contrato + del registro en el spine (coverage esperada).

### Slice 2 — Paleta determinista server-side (carril sin proveedor)

- Resolver la referencia a bytes por el `InputResolverPort` content-addressed (no reenviar, analizar).
- Extraer la paleta dominante + pesos con clustering de color **local/determinista** (sin llamar al
  proveedor): un mismo `sha256` ⇒ misma paleta. Este carril no gasta fence.
- Cachear la paleta como parte del `ReferenceProfileV1` content-addressed; fail-closed honesto si no
  hay bytes resolubles (referencia perdida entre declare y analyze).

### Slice 3 — Análisis semántico por el seam de proveedor (estilo + composición)

- Extender el seam para análisis: agregar la capability `reference-analyze` a `CREATIVE_CAPABILITIES`
  **o** un método/port de análisis en `CreativeProviderAdapter` (decisión de Open Questions), y
  despacharlo por el único punto de invocación de proveedor del runner — NUNCA un SDK directo.
- Implementar el adapter de visión sobre el transport existente (Vertex/Fal) para producir
  descriptores de estilo **scoreados** + composición; salida saneada y determinista de forma.
- Fenceado por `SpendFencePort` + kill switch; el análisis semántico gasta como una invocación de
  proveedor; idempotente por `sha256` + modelo de análisis (cache ⇒ no re-gasto).

### Slice 4 — Conditioning en el brief + compilación server-side

- Agregar `referenceConditioning?: ReferenceConditioningV1` a `PrepareExperimentPayloadV1` (opcional,
  aditivo): `mode` combinable `match-palette`/`match-composition` + `styleStrength∈[0,1]`,
  referenciando un `profileRef` ya analizado del mismo workspace.
- Compilar server-side el conditioning + el perfil a la instrucción del proveedor dentro del path
  `prepare → execute` (la paleta/composición del perfil modulan el prompt/params del run; el
  proveedor nunca recibe el conditioning crudo, recibe la instrucción compilada).
- Validaciones fail-closed: `profileRef` inexistente/ajeno rechazado en `prepare`; `styleStrength`
  fuera de `[0,1]` rechazado. Tests unitarios del compilador + de las validaciones.

## Out of Scope

- La UI del panel de referencia / "igualar paleta"/"igualar composición"/slider de fuerza (task
  `ui-ux` consumer separada, dentro de TASK-1474).
- Análisis de referencias de video/audio como material de estilo (este motor arranca por imagen/
  moodboard; el `mediaType` del contrato lo deja extensible, pero video/audio análisis es carril
  propio).
- Recetas/plantillas reusables y el Prompt Studio de ingredientes tipados (TASK-1493) — aquí solo el
  conditioning de referencia; la integración como ingrediente del brief compuesto se coordina, no se
  implementa acá.
- Provenance/derechos completos del output condicionado por la referencia (carril de rights de la
  cadena).
- Deploy del runtime durable / promoción de coverage `ui` (frontera gobernada de deployable,
  EPIC-027/028).

## Detailed Spec

Referencia de implementación (patrón a extender), repo `efeonce-globe`:

- **Resolución content-addressed:** `apps/creative-runner/src/input-resolver.ts` (`InputResolverPort`,
  `GcsInputResolver` con re-verificación `sha256`). El motor reusa este canal para obtener los bytes a
  analizar — nunca bytes por la API.
- **Seam de proveedor:** `packages/provider-contract/src/index.ts:134`
  (`CreativeProviderAdapter<TRequest>` con `supports/estimate/submit/poll`) +
  `CREATIVE_CAPABILITIES`. El análisis semántico se modela como una capability más ruteada por este
  seam; el `ProviderAttemptResult` ya transporta output server-internal, misma disciplina.
- **Spine + coverage:** `packages/domain/src/model-lab.ts` (`registerCommand`/`registerReader`,
  `LAB_COVERAGE`, `TrustedCommandContextV1`, `GLOBE_LAB_COMMANDS`/`GLOBE_LAB_READERS`). El command/
  reader nuevo se registran igual, con `ui/mcp: policy-blocked`.
- **Fence/kill switch:** `packages/domain/src/spend-fence.ts` (`SpendFencePort`, `LabSpendFence`),
  `LabKillSwitchPort`. El análisis se fencea como cualquier invocación de proveedor.

Diseño del perfil (forma orientativa, a fijar en Zone 2):

```
ReferenceProfileV1 = {
  schemaVersion: '1',
  referenceSha256: string,          // content-addressed key
  analysisModel: string,            // qué modelo produjo la parte semántica (evidencia)
  palette: { color: string; weight: number }[],        // determinista, carril local
  styleDescriptors: { label: string; score: number }[],// score∈[0,1], confianza reportada
  composition: { framing: string; notes?: string; ... },
  producedAt: string,
}
ReferenceConditioningV1 = {
  profileRef: string,               // referenceSha256 de un perfil ya analizado
  modes: ('match-palette' | 'match-composition')[],
  styleStrength: number,            // [0,1]
}
```

## Rollout Plan & Risk Matrix

Additive change sobre el runtime de `efeonce-globe`, gated por kill switch + coverage
`policy-blocked`. No toca SCIM/payroll/finance/release/identity de Greenhouse. La plantilla es
proporcional (backend-standard), no crítica.

### Slice ordering hard rule

- Slice 1 (contrato + spine) → Slice 2 (paleta determinista) → Slice 3 (análisis semántico por el
  seam) → Slice 4 (conditioning).
- Slice 4 (conditioning) **MUST** ir después de Slice 1/3: no se puede condicionar `prepare` con un
  `profileRef` antes de que exista el contrato del perfil y el motor que lo produce.
- Slice 2 (paleta local) puede correr en paralelo con Slice 3 (semántico) una vez cerrado Slice 1 —
  son dos carriles del mismo perfil (uno determinista sin proveedor, otro por el seam).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un dev instancia un SDK de visión directo (rompe el seam) | provider seam | medium | Revisión + lint de "no SDK fuera del adapter"; el análisis SOLO por `CreativeProviderAdapter` | fallo de build/test del contrato del seam |
| Perfil no determinista (mismo `sha256` ⇒ perfil distinto) | cache/manifest | medium | Cache content-addressed + carril de paleta local determinista; test de idempotencia | test de determinismo rojo |
| Score de estilo decorativo (repite el "94" fabricado) | contrato | low | Invariante: score = confianza reportada∈[0,1]; sin default; test que rechaza placeholder | review + test de contrato |
| Bytes de referencia/​output crudo cruzan el wire | data/seam | low | Solo hash + perfil saneado en el contrato; bytes solo server-internal | fuga visible en payload/log |
| Conditioning sobre `profileRef` ajeno/inexistente | tenant boundary | low | Fail-closed en `prepare`; scoping por `workspaceId` | `profile_ref_mismatch` en logs |
| Gasto de proveedor por análisis no fenceado | fence | low | Análisis pasa por `SpendFencePort` + idempotencia por `sha256` | spend fence deny / manifest sin fence |

### Feature flags / cutover

- Reusa el flag/kill switch del Lab (`GLOBE_LAB_ENABLED` + proveedor configurado, p.ej.
  `GLOBE_LAB_PROVIDER=composite`). Sin proveedor real (`fake`), el carril semántico degrada honesto y
  solo el carril de paleta determinista opera. Coverage `ui: policy-blocked` / `mcp: policy-blocked`
  hasta promoción de ruta. Revert: flag OFF + revert PR (<5 min).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (contrato + registro aditivos) | <5 min | si |
| Slice 2 | revert PR (carril de paleta aditivo) | <5 min | si |
| Slice 3 | flag OFF (proveedor `fake`) + revert PR | <5 min | si |
| Slice 4 | revert PR; campo `referenceConditioning` opcional queda ignorado | <5 min | si |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes.
2. Con proveedor `fake`: verificar que el carril de paleta determinista produce `ReferenceProfileV1`
   con paleta estable (mismo `sha256` ⇒ misma paleta) y que el semántico degrada honesto.
3. Canary gated por humano (`GLOBE_LAB_ENABLED=true` + proveedor real): analizar una referencia real
   por el seam; verificar descriptores scoreados + composición; verificar cache (segundo analyze del
   mismo `sha256` no re-gasta fence).
4. `prepare → execute` con `referenceConditioning: { modes: ['match-palette'], styleStrength }`;
   verificar que la instrucción compilada refleja la paleta del perfil y que el run llega a
   `candidate_ready`.
5. Verificar fail-closed: `prepare` con `profileRef` inexistente/ajeno rechazado.
6. Registrar evidencia + estado de rollout en `efeonce-globe/Handoff.md`.

### Out-of-band coordination required

- Habilitar el proveedor real de visión en el servicio de Globe (no `fake`) para el canary — mismo
  gating humano que TASK-1486/1487/1490. Sin cambios de IAM/secrets nuevos si el transport de visión
  reusa el adapter Vertex/Fal existente. [verificar si el modelo de visión elegido exige un grant o
  endpoint distinto al ya habilitado]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `ReferenceProfileV1` (paleta + `styleDescriptors` con `score∈[0,1]` + composición),
      transport-neutral y determinista por `sha256`.
- [ ] El command `globe.lab.reference.analyze` y el reader `globe.lab.reference.profile.get` están
      registrados en el spine con coverage `ui: policy-blocked` / `mcp: policy-blocked`, resto
      `available`.
- [ ] El análisis semántico se despacha SOLO por `CreativeProviderAdapter` (cero SDK de proveedor
      directo); el carril de paleta es determinista y local (sin proveedor, sin fence).
- [ ] La referencia se resuelve a bytes SOLO server-side por el `InputResolverPort` content-addressed;
      ni bytes ni output crudo del proveedor cruzan el contrato.
- [ ] Un mismo `sha256` retorna el perfil cacheado sin re-gastar el spend fence (idempotencia).
- [ ] `PrepareExperimentPayloadV1` acepta `referenceConditioning` (`match-palette`/`match-composition`
      + `styleStrength∈[0,1]`); se compila server-side a la instrucción del proveedor; sin el campo el
      path se comporta como hoy.
- [ ] `prepare` con `profileRef` inexistente/ajeno falla closed con error canónico saneado.
- [ ] `cd ../efeonce-globe && pnpm check && pnpm build` verdes; canary por el seam verificado (o
      documentado `code complete, rollout pendiente` si el canary queda gated).

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `pnpm task:lint --task TASK-1494` (Greenhouse — lifecycle/estructura)
- Canary en vivo: analizar referencia real por el seam + `prepare → execute` con `match-palette`,
  gated por `GLOBE_LAB_ENABLED` + proveedor real.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla,
      `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` (Greenhouse) quedó actualizado; el estado de rollout vivo del runtime se registra
      en `efeonce-globe/Handoff.md`
- [ ] `changelog.md` quedó actualizado si cambió comportamiento/contrato visible
- [ ] se ejecutó chequeo de impacto cruzado (TASK-1474 consumer, TASK-1493 coordinación del brief)

- [ ] Documentación del contrato `ReferenceProfileV1` + conditioning sincronizada en la spec de Model
      Lab / Creative Studio (triple documentación proporcional)

## Follow-ups

- UI del panel de referencia / Style DNA (task `ui-ux` consumer, dentro de TASK-1474).
- Análisis de referencias de video/audio como material de estilo (carril propio).
- Integración de la referencia como ingrediente tipado del brief compuesto (coordinación con
  TASK-1493).
- Provenance/derechos del output condicionado por la referencia (carril de rights de la cadena).

## Open Questions

- **¿Capability `reference-analyze` en `CREATIVE_CAPABILITIES` vs. método/port de análisis en el
  adapter?** Una capability nueva reusa todo el guardrail del seam (supports/estimate/submit/poll,
  fence, manifest) pero mezcla "análisis" con el vocabulario de "generación/edición"; un port de
  análisis dedicado es más limpio semánticamente pero duplica wiring. Resolver en Discovery,
  favoreciendo la que preserve el seam sin inventar un segundo carril de invocación de proveedor.
- **¿La paleta determinista necesita una librería nueva (`sharp`/clustering) o el runner ya la
  trae?** [verificar deps de `apps/creative-runner`]. Evitar dependencia pesada nueva si el transport
  ya expone decodificación de imagen.
- **¿El conditioning modula prompt (texto) o params del proveedor (p.ej. reference-strength nativo)?**
  Depende de qué exponga cada modelo; el compilador server-side debe degradar a instrucción textual
  cuando el modelo no tenga un parámetro nativo de fuerza de estilo/paleta.

## Delta 2026-07-22 — Style DNA nace vacío en la superficie viva del Producer (TASK-1505)

Verificado contra el runtime desplegado: el botón **Style DNA** de la superficie aprobada de TASK-1505
(`producer-ui.ts:124`) se pinta **habilitado** (`coverage.ui='available'`) y abre un picker **vacío**. La
causa está acá: el comando raíz `analyze` (`packages/domain/src/reference-intelligence.ts:362-365`) exige
dos puertos —`ReferenceAssetIdentityPort` y `ReferenceAnalysisExecutorPort`— que **no tienen ninguna
implementación en el repo** (`grep` sólo devuelve las declaraciones) y que `apps/studio-web/src/app.ts:815-821`
**no inyecta** (pasa sólo `{store, now, newId}`). Cascada: sin `analyze` no hay profile → `createStyle`
siempre `not_found` → `producer_styles` y `reference_profiles` están **vacías en la base viva**. Esta task
(hoy `to-do`) es prerrequisito de que Style DNA funcione; implica escribir esos dos adapters (identidad de
asset + ejecutor de análisis, presumiblemente sobre el mismo seam de provider del Lab) e inyectarlos. Hasta
entonces TASK-1505 debe mostrar Style DNA como gated, no enabled.
