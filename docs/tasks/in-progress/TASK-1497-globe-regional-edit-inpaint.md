# TASK-1497 — Regional Edit / Inpaint

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Implementación en ejecución sobre el edit seam vigente; rollout permanece gated por provider/runtime`
- Rank: `TBD`
- Domain: `creative|ai`
- Blocked by: `none`
- Branch: `task/TASK-1497-globe-regional-edit-inpaint`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender el seam de edit/refine de TASK-1490 para **edición por región (inpaint)**: hoy `editFrom` + `prompt`
edita el asset **completo** (`PrepareExperimentPayloadV1.editFrom = { experimentId }`, `packages/contracts/src/index.ts`),
sin forma de decir "retoca sólo esta zona". Esta task agrega una semántica canónica de **región enmascarada**
al vocabulario de edit (transport-neutral: una máscara declarada por hash + rights, o una geometría normalizada),
y un **canal de máscara server-internal** que viaja por el **mismo track de private-ingest (track B)** que ya
resuelve `parentOutput` y `resolvedInputs` a bytes — la máscara nunca cruza el wire. El **mecanismo de inpaint
(mask param) vive DENTRO de cada adapter** (Fal `mask_url`, Vertex/Nano-Banana inpaint), nunca en policy de
dominio, exactamente como el paradigma stateful/reference de TASK-1490.

## Why This Task Exists

TASK-1490 generalizó el edit "sobre lo generado" a todos los modelos editables, pero su unidad de edición es el
**asset entero**: `editFrom` re-inyecta el output del candidato padre como base (`editReference`) y el prompt
reescribe la imagen completa. El operador del Globe Studio Workbench necesita **retocar una zona** ("cambia el
cielo", "quita este objeto", "reemplaza el fondo detrás del producto") sin re-generar ni degradar el resto del
candidato — que es justamente lo que hace un modelo de inpaint cuando recibe una máscara. Hoy no hay canal para
esa máscara: `LabEditFromV1` no la expresa, `CreativeProviderRequestV1` no la transporta, y ningún adapter la
mapea a su parámetro nativo. Sin este seam, cada intento de retoque local re-inventaría cómo pasar la máscara, la
metería por la API en crudo (violando private-ingest), o forzaría al operador a un round-trip de re-generación
que pierde todo lo que ya estaba bien. La máscara es un **input sensible** (define exactamente qué se altera):
debe seguir el mismo contrato content-addressed que el resto de los inputs del Lab, y su traducción al vendor
debe quedar encerrada en el adapter para no filtrar vocabulario de proveedor al dominio.

## Goal

- Una semántica de **región enmascarada** canónica y transport-neutral que extiende `editFrom` de TASK-1490
  (backward-compatible: región ausente = edición de asset completo, comportamiento actual), invocable igual para
  cualquier modelo que soporte inpaint.
- Un **canal de máscara server-internal** que resuelve la máscara declarada (por hash) a bytes por el mismo
  track de private-ingest (track B), la adjunta al request del proveedor como campo server-internal separado, y
  NUNCA la expone por el wire.
- El **mecanismo de inpaint por modelo vive dentro del adapter** (mask → parámetro nativo del vendor); el dominio
  sólo conoce "editar región X del candidato Y", falla closed (antes de reservar gasto) si el modelo ejecutor no
  soporta inpaint, y registra en el manifest la evidencia `editScope: regional` para que ningún cambio full↔región
  sea silencioso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (TASK-1481 spine: command/reader transport-neutral + coverage)
- `.claude/skills/greenhouse-globe/SKILL.md` (boundary Globe↔Greenhouse, provider seam, track B / private-ingest)
- `docs/tasks/complete/TASK-1490-globe-cross-model-edit-refine-capability.md` (el seam de edit que esta task extiende)

Reglas obligatorias (boundary DURO — repetir del brief de la categoría ②):

- El **CÓDIGO vive en `efeonce-globe`**; Greenhouse sólo gobierna lifecycle/docs/EPIC-028. No se crean apps ni
  packages nuevos en ningún repo.
- El **provider seam es sagrado**: NUNCA un SDK de proveedor directo. El mecanismo de inpaint (mask param, formato
  de máscara, slug del modelo) vive DENTRO del `CreativeProviderAdapter`, jamás en `packages/domain` ni en
  `packages/contracts`.
- La capacidad nace con **Full API Parity**: command/reader transport-neutral + coverage manifest; `ui` puede
  nacer `policy-blocked` (como el resto del Model Lab hoy, `packages/domain/src/model-lab.ts` `LAB_COVERAGE`).
- La **máscara es un input server-internal**: se declara por hash (content-addressed) y se resuelve a bytes por
  track B server-side; NUNCA cruza el wire en crudo, NUNCA se loggea, NUNCA llega al caller. Mismo estatuto que
  `resolvedInputs`/`editReference`/`parentOutput` de TASK-1490.
- **NUNCA** el LLM/adapter escribe estado gobernado directo: el edit por región es otro experimento por el seam
  `command → registry → runner → adapter`, con spend fence + kill switch, igual que un generate.
- **Fail-closed pre-spend**: un edit regional sobre un modelo que no soporta inpaint se rechaza ANTES de reservar
  gasto (mirror de `providerRunChainable` en TASK-1490), no como un 400 del proveedor a mitad del run.
- **NUNCA** romper el boundary Globe↔Greenhouse (secretos de provider propios de Globe; registry de tasks sólo
  Greenhouse).

## Normative Docs

- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (§2 Image editing / Image-to-Image — inpaint,
  kontext, controlnet: qué modelos aceptan máscara; los slugs específicos de inpaint por modelo son `[verificar]`)
- `docs/architecture/creative-studio/GLOBE_STUDIO_WORKBENCH_BACKEND_GAP_ANALYSIS_V1.md` (§② — "Retocar zona /
  inpaint": `editFrom` edita el asset COMPLETO; sin canal de máscara)

## Dependencies & Impact

### Depends on

- **TASK-1490** (edit/refine seam) — esta task **extiende** su `editFrom`. Símbolos base a extender en `efeonce-globe`:
  `PrepareExperimentPayloadV1.editFrom: LabEditFromV1` y `LabEditSourceV1` (`packages/contracts/src/index.ts`);
  `CreativeProviderRequestV1.editReference` (`packages/provider-contract/src/index.ts`); el runner `resolveEdit` +
  `toProviderRequest` (`apps/creative-runner/src/index.ts`); track B `InputResolverPort` → `ResolvedInputV1`
  (`apps/creative-runner/src/input-resolver.ts`). [verificar los rangos de línea exactos al tomarla — el archivo evoluciona]
- **TASK-1481** (API Contract Spine) — el command/reader viaja por el spine y su coverage manifest.
- Track B / private-ingest (materializado por TASK-1490 Slice 0 + bucket `efeonce-globe-lab-evidence` de TASK-1464):
  el canal de máscara reusa exactamente ese resolver content-addressed.

### Blocks / Impacts

- **TASK-1474** (Globe Professional Studio Workbench) — habilita la acción "Retocar zona / inpaint" del workbench.
- TASK-1467 (provenance) — el linaje/rights de un candidato editado por región debe encadenar al padre y a la máscara.

### Files owned

- `../efeonce-globe/packages/contracts/src/index.ts` (semántica de región/máscara + evidencia `editScope`)
- `../efeonce-globe/packages/provider-contract/src/index.ts` (canal server-internal `editMask`/`editRegion` + afford. de inpaint)
- `../efeonce-globe/packages/domain/src/model-lab.ts` (validación de región + fail-closed pre-spend por afford. del modelo)
- `../efeonce-globe/apps/creative-runner/src/index.ts` (runner: resolver máscara por track B + threading al request)
- `../efeonce-globe/apps/creative-runner/src/{fal-adapter,vertex-adapter,vertex-omni-adapter}.ts` (mapeo mask → param nativo)
- `docs/tasks/to-do/TASK-1497-globe-regional-edit-inpaint.md` (esta task)

## Current Repo State

### Already exists

- **Seam de edit canónico (TASK-1490)**: `editFrom` como único vocabulario de edit del caller; el prompt se vuelve
  la instrucción; el paradigma (stateful vs reference) se resuelve server-side; `LabEditMode = 'stateful' | 'reference'`
  como evidencia; `LabEditSourceV1.parentOutput` resoluble a bytes; `CreativeProviderRequestV1.editReference` como
  base server-internal separada de `resolvedInputs`.
- **Track B / private-ingest**: `InputResolverPort.resolve(LabResolvableInputV1) → ResolvedInputV1`; `GcsInputResolver`
  content-addressed (el object name ES el hash, re-verifica sha256 antes de entregar bytes). La máscara es un
  `LabAuthorizedInputV1` (subtipo de `LabResolvableInputV1`) → resuelve por el mismo resolver, sin canal nuevo de bytes.
- **Capability `image-edit`** ya en `CREATIVE_CAPABILITIES` — la edición regional es un **modificador del mismo
  edit** (no una capability nueva), igual que TASK-1490 decidió "flag en `prepare`, no command dedicado".
- **Adapters con base de edit**: Fal arma su lista de referencias con `editReference` primero (`fal-adapter.ts`);
  Vertex idem (`vertex-adapter.ts`). El mapeo de máscara sigue el mismo patrón por-adapter.
- **Modelos con inpaint** documentados en el catálogo Fal (§2: inpaint / kontext / controlnet).

### Gap

- `LabEditFromV1` no expresa una **región**: no hay forma de decir "edita sólo esta zona" — `editFrom` edita el
  asset completo.
- `CreativeProviderRequestV1` no transporta una **máscara** server-internal (no hay `editMask`/`editRegion`); el
  runner no resuelve una máscara declarada a bytes.
- Ningún adapter mapea una máscara a su **parámetro de inpaint nativo** (Fal `mask_url`, Vertex/Nano-Banana inpaint).
- El dominio no sabe si el modelo ejecutor **soporta inpaint** — no puede fallar closed pre-spend sobre un modelo
  que sólo edita full-asset.
- El manifest no distingue **edición full vs regional** (`editScope`), así que un cambio de alcance sería silencioso.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: repo hermano `efeonce-globe` (`packages/contracts`, `packages/provider-contract`, `packages/domain`,
  `apps/creative-runner`); gobernanza en `greenhouse-eo` (EPIC-028)
- Future candidate home: `remain-shared`
  <!-- El inpaint es parte del Model Lab / provider seam existente, no un servicio ni package nuevo. -->
- Boundary: la semántica de región/máscara es transport-neutral en `packages/contracts`; el canal server-internal
  de máscara en `packages/provider-contract`; el mecanismo (mask → param del vendor) DENTRO de cada
  `CreativeProviderAdapter`; consumers = command/reader del spine, nunca UI ni SDK de provider directo.
- Server/browser split: server-only (adapters + secretos + spend fence + bytes de máscara/output); la API pública
  sólo lleva el candidato y la máscara **por referencia** (id/hash) y/o una geometría de números, nunca bytes ni secretos.
- Build impact: `none` (Node 24 nativo; sin dependencia pesada nueva — el rasterizado de una bbox a máscara, si se
  soporta geometría, se hace con el vendor o con utilidades ya presentes; ver Open Questions)
- Extraction blocker: `none` (respeta el seam existente; no crea `apps/*`/`packages/*` nuevos)

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: el experimento/manifest del Model Lab (store de Globe) + el bucket privado content-addressed
  (`efeonce-globe-lab-evidence`) donde vive la máscara resoluble por hash
- Consumidores afectados: `API` (spine command `globe.lab.experiment.prepare`), `worker` (creative-runner), `external`
  (proveedores de inpaint vía adapter); downstream `UI` (TASK-1474) y agentes/MCP por parity
- Runtime target: `worker` (creative-runner) + `external` (provider) — gated por kill switch, `ui` policy-blocked

### Contract surface

- Contrato existente a respetar: `PrepareExperimentPayloadV1.editFrom` / `LabEditFromV1` / `LabEditSourceV1` /
  `LabEditMode` (`packages/contracts/src/index.ts`); `CreativeProviderRequestV1.editReference` /
  `ResolvedInputV1` (`packages/provider-contract/src/index.ts`); `InputResolverPort` (`apps/creative-runner/src/input-resolver.ts`)
- Contrato nuevo o modificado:
  - `LabEditFromV1` extendido: `{ experimentId; region?: LabEditRegionV1 }`.
  - `LabEditRegionV1` (transport-neutral): expresa la región enmascarada. Al menos uno de:
    `mask?: LabAuthorizedInputV1` (asset de máscara — alpha/binaria — declarado por hash + rights, resoluble por track B)
    y/o `bbox?: LabNormalizedRectV1` (rect normalizado 0..1, geometría que el adapter rasteriza a máscara internamente);
    knobs mínimos opcionales `invert?: boolean`. Falla closed si `region` presente sin `mask` ni `bbox`.
  - `LabEditScope = 'full' | 'regional'` — evidencia en el manifest (ortogonal a `LabEditMode`), para que ningún
    cambio full↔región sea silencioso (mismo criterio de evidencia que `LabEditMode` en TASK-1490).
  - `CreativeProviderRequestV1.editMask?: ResolvedInputV1` (server-internal, separado de `editReference` y
    `resolvedInputs`) + `editRegion?: LabEditRegionGeometryV1` (bbox normalizado, sólo números).
  - Afford. de inpaint por adapter (mirror de `providerRunChainable`): el dominio consulta si el modelo/route ejecutor
    soporta edición regional ANTES de reservar gasto.
- Backward compatibility: `compatible` (todos los campos nuevos son opcionales; `region` ausente = edición full-asset,
  comportamiento exacto de TASK-1490)
- Full API parity: la región/máscara es parte del payload del command `globe.lab.experiment.prepare` (primitive
  server-side, transport-neutral); UI (TASK-1474), agentes y MCP la operan por construcción — cero business logic
  de inpaint en el cliente. `ui` nace `policy-blocked` como el resto del Lab.

### Data model and invariants

- Entidades/tablas/views afectadas: manifest del experimento del Model Lab (store de Globe); objetos de máscara en el
  bucket content-addressed `efeonce-globe-lab-evidence` (por su sha256)
- Invariantes que no se pueden romper:
  - La máscara **nunca** cruza el wire en crudo: sólo su hash (+ rights) viaja por la API; los bytes se resuelven
    server-side por track B (mismo invariante que `resolvedInputs`/`editReference`).
  - El **mecanismo de inpaint** (formato de máscara, `mask_url`/param del vendor, slug del modelo) vive DENTRO del
    adapter; `packages/domain` y `packages/contracts` no nombran vocabulario de proveedor.
  - Un edit regional sobre un modelo que **no** soporta inpaint falla closed **antes** de reservar gasto (fail-closed
    pre-spend, no un 400 mid-run).
  - `editScope: 'regional'` queda registrado en el manifest cuando `region` está presente; el spend fence cobra el
    edit regional como un **experimento nuevo** (no gratis), igual que cualquier edit.
  - La geometría `bbox` es normalizada (0..1), no vacía; la máscara-asset es `mediaType: 'image'` con rights en scope.
- Tenant/space boundary: la máscara y el candidato padre deben pertenecer al **mismo workspace/entitlement** que el
  edit (no editar con máscara/candidato de otro tenant); se deriva del contexto del command, igual que `authorizedInputs`.
- Idempotency/concurrency: `idempotencyKey` por edit (heredado del generate/edit de TASK-1490); un re-submit del mismo
  edit regional no re-genera.
- Audit/outbox/history: el edit regional emite el mismo audit/outbox que cualquier experimento; el manifest encadena
  `lineage` al padre y declara `editScope: 'regional'`. Evaluar un signal "edit regional sobre modelo sin inpaint" (fail-closed).

### Migration, backfill and rollout

- Migration posture: `none` (cambios de contrato aditivos + campos opcionales; sin migración de DB destructiva)
- Default state: `read-only` de facto — `region` es opt-in en el payload; el Lab entero sigue `ui: policy-blocked`
  y detrás de `GLOBE_LAB_ENABLED` (kill switch) hasta canary humano
- Backfill plan: N/A (no hay datos preexistentes que backfillear; los manifests viejos siguen siendo full-edit por ausencia)
- Rollback path: `revert PR` + flag OFF; los objetos de máscara ingeridos quedan inertes/huérfanos, nunca destructivos
- External coordination: reusa el bucket `efeonce-globe-lab-evidence` (grant `storage.objectCreator`/`objectAdmin` a la
  runtime SA — mismo follow-up que TASK-1490); billing del proveedor de inpaint elegido. Confirmar saldo del provider `[verificar]`

### Security and access

- Auth/access gate: `capability` `globe.lab.experiment.run` (mismo que generate/edit; NO capability nueva) + spend fence + kill switch
- Sensitive data posture: la máscara es un input sensible (define qué se altera) — se trata como el resto de inputs
  content-addressed; nunca bytes/URL firmada/token por el wire ni en logs
- Error contract: errores saneados por adapter, vocabulario cerrado — p.ej. `regional_edit_unsupported`
  (modelo sin inpaint, fail-closed pre-spend), `mask_resolution_*` (reusa `InputResolutionError`), `edit_unavailable`;
  nunca el body crudo del proveedor ni el secreto
- Abuse/rate-limit posture: el spend fence + hard cap + kill switch existentes; el edit regional es un experimento nuevo (reserva/settle)

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (typecheck + `node --test`) + tests unitarios de validación de
  región (bbox normalizado, mask rights en scope, fail-closed pre-spend por afford. del modelo)
- DB/runtime checks: verificar que un edit regional persiste `editScope: 'regional'` + lineage al padre en el manifest;
  que la máscara resuelve por track B desde el bucket content-addressed
- Integration checks: canary en vivo generate → **regional edit** por el seam sobre un modelo con inpaint real
  (Fal inpaint / Vertex inpaint `[verificar]` slug), con máscara resuelta server-side; confirmar que el resto del asset
  se preserva y sólo la zona enmascarada cambia
- Reliability signals/logs: manifest con `editScope=regional`; evaluar signal "regional edit sobre modelo sin inpaint" (fail-closed)
- Production verification sequence: ver Rollout Plan (canary gated por `GLOBE_LAB_ENABLED`, revert a `fake`/OFF tras el smoke)

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales (contracts / provider-contract / domain / runner / adapters).
- [ ] Data invariants, tenant/access boundary e idempotencia explícitos (máscara server-internal; fail-closed pre-spend; mismo workspace).
- [ ] Postura de migración/backfill/rollback explícita y proporcional (aditiva, opt-in, revert PR + flag OFF).
- [ ] Evidencia runtime listada para todo cambio más allá de docs/tooling (canary generate→regional-edit por el seam).
- [ ] Dominio sensible con errores canónicos, postura de audit/signal y sin fuga de bytes/secretos (máscara nunca por el wire).

## Capability Definition of Done — Full API Parity gate

Aplica: esta task **modifica** la capability de edit (`image-edit` vía `editFrom`) agregándole el modificador región.

- [ ] **Lógica en el primitive, no en la UI.** La validación de región + resolución de máscara + fail-closed
  pre-spend viven en `packages/domain` + `apps/creative-runner`, no en un componente UI.
- [ ] **Modelada como command, no click-handler**: la región es parte del payload de `globe.lab.experiment.prepare`
  (mismo command que edit/generate), no un endpoint acoplado a la pantalla.
- [ ] **Read/write gobernados**: el write (prepare con región) lleva command semantics, authorization fina
  (`globe.lab.experiment.run`), idempotencia, spend fence, errores canónicos saneados, observabilidad.
- [ ] **Capability + grant**: NO se introduce capability nueva (regional edit = modificador de `image-edit`/`editFrom`).
  `N/A — reusa la capability y el grant de edit de TASK-1490`.
- [ ] **Camino programático declarado**: command del spine (`http`/`sdk`/`cli`/`worker`/`e2e` = available; `ui`/`mcp`
  = policy-blocked hoy, como `LAB_COVERAGE`).
- [ ] **Write apto para `propose → confirm → execute`**: el edit regional es un experimento nuevo (prepare → execute),
  gobernable por el runtime de acción; NO integración Nexa-específica.
- [ ] **Un primitive, muchos consumers**: cero lógica de inpaint duplicada por consumer; la máscara y la región se
  resuelven en el seam para UI/agente/MCP por igual.
- [ ] **Parity check = SÍ**: "¿el edit regional tiene contrato gobernado a nivel capability?" — sí, extiende `editFrom`
  del spine → todos los consumers lo operan por construcción.

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

### Approved Producer target addendum — inpaint interaction contract

The approved Producer exposes replace, add and remove intents over a user-authored mask. The canonical command
must express those intents without vendor vocabulary: replace/add require a bounded prompt, while remove may use
an empty prompt only when the selected route supports semantic removal.

- Mask ingest uses a private, content-addressed object handle with verified dimensions/media type, workspace scope
  and short retention. Raw mask bytes/object coordinates never appear in the public command or asset feed.
- Capability/route compatibility and an estimate occur before commercial reservation/provider submission. An
  unsupported intent or malformed/empty mask fails closed without spend.
- Every output is a derived asset with source candidate, mask hash/evidence, intent, effective prompt/recipe,
  rights/provenance inheritance and an immutable parent lineage edge.
- Idempotency covers mask+intent+prompt+source version; retries cannot produce an untracked second edit.

Additional acceptance evidence:

- [ ] Replace/add/remove validation and route-compatibility negatives fail before spend.
- [ ] Mask lifecycle/authorization tests prove no cross-workspace access or raw mask exposure.
- [ ] Result provenance identifies the source and edit scope while keeping the mask itself private.

### Slice 1 — Vocabulario canónico de región/máscara + evidencia `editScope`

- En `packages/contracts/src/index.ts`: extender `LabEditFromV1` a `{ experimentId; region?: LabEditRegionV1 }`
  (backward-compatible: `region` ausente = full edit).
- Definir `LabEditRegionV1` transport-neutral: `mask?: LabAuthorizedInputV1` (asset de máscara declarado por hash +
  rights) y/o `bbox?: LabNormalizedRectV1` (rect normalizado 0..1); knob opcional `invert?: boolean`. Al menos uno de
  `mask`/`bbox` requerido cuando `region` está presente.
- Definir `LabEditScope = 'full' | 'regional'` y registrarlo como evidencia en el manifest del experimento editado
  (ortogonal a `LabEditMode`).
- En `packages/domain/src/model-lab.ts`: `validatePreparePayload` valida la región (bbox normalizado no vacío;
  máscara `mediaType: 'image'` con rights en scope; máscara y padre en el mismo workspace); `prepare` marca
  `editScope: 'regional'` cuando hay región.

### Slice 2 — Canal de máscara server-internal (track B) + afford. de inpaint (fail-closed pre-spend)

- En `packages/provider-contract/src/index.ts`: agregar `CreativeProviderRequestV1.editMask?: ResolvedInputV1`
  (server-internal, separado de `editReference`/`resolvedInputs`, misma doctrina que TASK-1490) +
  `editRegion?: LabEditRegionGeometryV1` (bbox normalizado, sólo números).
- En `apps/creative-runner/src/index.ts` (`toProviderRequest`): cuando el experimento declara `region.mask`,
  resolver la máscara a bytes por track B (`InputResolverPort.resolve`) en el único punto de invocación de proveedor,
  y adjuntarla como `editMask`; si hay `region.bbox`, pasar `editRegion`. La máscara nunca cruza el wire.
- Afford. de inpaint por adapter (mirror de `providerRunChainable`): el dominio consulta si el modelo/route ejecutor
  soporta edición regional y falla closed con `regional_edit_unsupported` **antes** de reservar gasto si no.

### Slice 3 — Mapeo mask → parámetro nativo por adapter + canary en vivo

- En cada adapter de imagen editable, mapear `editMask`/`editRegion` al **mecanismo de inpaint nativo** DENTRO del
  adapter: Fal (`fal-adapter.ts`) → subir la máscara → `mask_url` (mismo patrón que sube referencias); Vertex /
  Nano-Banana (`vertex-adapter.ts`) → parámetro de inpaint. Slugs de inpaint por modelo `[verificar]` contra el catálogo Fal.
- Adapters sin soporte de máscara reportan la afford. como no soportada (para el fail-closed de Slice 2). Stateful
  Omni (`vertex-omni-adapter.ts`): confirmar si soporta edición enmascarada; si no, el edit regional cae al carril
  reference-based o falla closed `[verificar]`.
- Canary en vivo por el seam: generate → regional edit sobre un modelo con inpaint real; evidencia de manifest con
  `editScope=regional` + lineage al padre + preservación del resto del asset.

## Out of Scope

- **Edición regional de video / máscara temporal** (rotoscopía): esta task es inpaint de imagen; el masked-video va
  en su propio carril si algún modelo lo soporta.
- **Autoría de la máscara / segmentación automática** (prompt-to-mask, "selecciona el sujeto"): la máscara llega ya
  declarada por hash o como geometría; generarla es otra capacidad.
- **UI del inpaint** ("pinta la zona"): task `ui-ux` consumer (parte de TASK-1474), no esta.
- **Provenance/rights completos** del derivado enmascarado y de la máscara misma (TASK-1467).
- **Deploy del runtime durable** (frontera gobernada de deployable, EPIC-027/028).

## Detailed Spec

El edit regional **extiende** el seam de TASK-1490, no lo reemplaza. El caller sigue usando `editFrom` como único
vocabulario de edit; agregarle `region` es aditivo. El flujo:

1. Caller: `prepare({ ...editFrom: { experimentId, region: { mask: { inputId, sha256, mediaType: 'image', rights }, invert? } } })`
   — sólo hash(es) + rights + (opcional) geometría cruzan la API.
2. Dominio (`model-lab.ts`): valida la región, verifica workspace del padre y de la máscara, consulta la afford. de
   inpaint del modelo ejecutor y **falla closed pre-spend** si no la soporta; marca `editScope: 'regional'`.
3. Runner (`index.ts` `toProviderRequest`): resuelve `parentOutput` → `editReference` (ya de TASK-1490) **y** la
   máscara declarada → `editMask` por track B; adjunta ambos al `CreativeProviderRequestV1` server-internal.
4. Adapter: mapea `editMask`/`editRegion` al param de inpaint del vendor (Fal `mask_url`, Vertex inpaint) — el
   mecanismo vive acá, no en dominio.
5. Manifest: `editScope=regional`, `editMode` (stateful/reference) como ya lo trae TASK-1490, lineage al padre.

Doctrina heredada de TASK-1490 que esta task respeta al pie: `editMask` es **deliberadamente separado** de
`editReference` y `resolvedInputs` — el adapter debe distinguir "la máscara" de "la base editada" y de "referencias
adicionales", no adivinar por índice. La regla cross-surface del stateful sigue vigente sin cambios.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (vocabulario + evidencia) → Slice 2 (canal server-internal + afford. fail-closed) → Slice 3 (mapeo por adapter + canary).
- Ningún adapter mapea máscara (Slice 3) antes de que el canal server-internal + la afford. de fail-closed (Slice 2)
  existan, para no fragmentar el contrato ni permitir un edit regional que queme gasto sobre un modelo sin inpaint.
- Slice 2 depende de Slice 1: sin `editScope`/`LabEditRegionV1` no hay qué transportar ni qué validar.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Edit regional sobre modelo sin inpaint quema gasto (400 mid-run) | spend fence / provider adapter | medium | afford. de inpaint por adapter → fail-closed `regional_edit_unsupported` ANTES de reservar | manifest `failed` con razón / fence signal |
| Máscara (bytes) se filtra por la API o en logs | private-ingest | low | track B (sólo hash + geometría cruzan; bytes server-side) | lint no-bytes-in-api / review |
| Máscara o candidato de otro workspace | tenant isolation | low | validar workspace del padre y de la máscara en el dominio | audit + reader scope |
| Cambio full↔regional silencioso en el manifest | evidencia/manifest | low | `editScope` (`full`/`regional`) obligatorio en el manifest del edit | manifest sin `editScope` |
| Geometría bbox mal normalizada rasteriza máscara vacía/errónea | provider adapter | low | validar bbox 0..1 no vacío; el adapter rasteriza fail-closed | provider `failed` / QC de output |

### Feature flags / cutover

- Reusa `GLOBE_LAB_ENABLED` (kill switch) + la configuración de provider/bucket de TASK-1490
  (`GLOBE_LAB_PROVIDER`, `GLOBE_LAB_INPUT_BUCKET=efeonce-globe-lab-evidence`). **Sin flag nuevo**: la región es
  opt-in en el payload y el Lab entero sigue `ui: policy-blocked` hasta canary humano. Default OFF hasta smoke verde.
  `[verificar]` si algún proveedor de inpaint específico amerita su propio gate.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (campos opcionales aditivos en contracts) | <10 min | sí |
| Slice 2 | revert PR (campo server-internal + resolución de máscara); objetos de máscara quedan inertes | <10 min | sí |
| Slice 3 | revert PR / desactivar el mapeo de máscara por adapter + flag OFF | <10 min | sí |

### Production verification sequence

1. `cd ../efeonce-globe && pnpm check && pnpm build` verdes.
2. Canary generate → regional edit por el seam en staging con hard-cap bajo, sobre un modelo con inpaint real
   (Fal/Vertex `[verificar]`) → manifest con `editScope=regional` + lineage + máscara resuelta server-side.
3. Verificar fail-closed: intentar regional edit sobre un modelo sin inpaint → `regional_edit_unsupported`
   **sin** reservar gasto.
4. Confirmar que la máscara nunca cruzó el wire (sólo hash/geometría en el request público).
5. Revertir a `fake`/OFF tras el smoke.

### Out-of-band coordination required

- Grant `storage.objectCreator`/`objectAdmin` a la runtime SA sobre `efeonce-globe-lab-evidence` (mismo follow-up de
  TASK-1490, si aún pendiente). Billing del proveedor de inpaint elegido. Resto: `N/A — repo-only change`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `editFrom` acepta una `region` opcional (máscara declarada por hash y/o bbox normalizado); su ausencia deja el
  edit full-asset de TASK-1490 idéntico (backward-compatible verificado por test).
- [ ] La máscara se resuelve a bytes **server-side por track B** y se adjunta como `editMask` server-internal; sólo su
  hash (+ geometría opcional) cruza la API — verificado (bytes nunca en el request público ni en logs).
- [ ] El mecanismo de inpaint (mask → `mask_url`/param del vendor) vive DENTRO del adapter; `packages/domain` y
  `packages/contracts` no nombran vocabulario de proveedor.
- [ ] Un edit regional sobre un modelo **sin** inpaint falla closed con `regional_edit_unsupported` **antes** de
  reservar gasto (verificado por test).
- [ ] El manifest del edit registra `editScope: 'regional'` + lineage al padre; el spend fence lo cobra como
  experimento nuevo.
- [ ] La máscara/candidato de otro workspace se rechaza (tenant boundary verificado).
- [ ] Evidencia en vivo: un chain generate → regional edit por el seam sobre un modelo con inpaint real, con la zona
  enmascarada alterada y el resto del asset preservado, y manifest con `editScope=regional`.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- Tests unitarios: validación de región (bbox 0..1, mask rights/scope), fail-closed pre-spend por afford. del modelo,
  backward-compat (sin región = full edit).
- Canary en vivo generate → regional edit por el seam, gated por `GLOBE_LAB_ENABLED`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes (incluye `efeonce-globe/Handoff.md` como cabina de mando del rollout)
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas (TASK-1474, TASK-1467, TASK-1490)

- [ ] Skills actualizadas (`greenhouse-globe` + motion/audio si aplica) con el patrón de edit regional / canal de máscara

## Follow-ups

- UI "Retocar zona / inpaint" (task `ui-ux` consumer, dentro de TASK-1474).
- Autoría de máscara / segmentación automática (prompt-to-mask) como capacidad separada.
- Edición regional de video (masked video) si algún modelo lo soporta.
- Provenance/rights del derivado enmascarado + de la máscara (TASK-1467).

## Open Questions

- **¿Geometría `bbox` en el V1, o sólo máscara-asset?** El brief prioriza el canal server-internal por private-ingest
  (máscara-asset por hash). La `bbox` es una comodidad (números por el wire, el adapter rasteriza) que puede diferirse
  si complica el mapeo por adapter. Decidir en Discovery según qué modelos de inpaint aceptan bbox vs sólo máscara-imagen.
- **¿Quién rasteriza la bbox a máscara?** Preferible dentro del adapter (para no meter dependencia de imagen en el
  dominio) o delegar al vendor si su API acepta bbox nativo. `[verificar]` por proveedor.
- **¿Omni (stateful) soporta edición enmascarada?** Si no, el edit regional sólo corre por el carril reference-based;
  el fail-closed de afford. lo cubre. `[verificar]`.
