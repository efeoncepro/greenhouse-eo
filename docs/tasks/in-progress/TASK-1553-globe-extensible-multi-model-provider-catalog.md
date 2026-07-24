# TASK-1553 — Globe Extensible Multi-Model Provider Catalog + Route-Based Model Resolution

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1553-globe-extensible-multi-model-provider-catalog`
- Legacy ID: `none`

## Summary

Convierte el motor de generación de Globe (imagen, y por diseño video/audio) en un **catálogo multi-modelo
extensible y elegible**: varios modelos por capacidad coexisten como rutas gobernadas y el usuario/agente elige con
cuál generar (Seedream, Nano Banana Pro, Nano Banana 2, GPT Image 2, GPT Image 1.5, y los que vengan). Distingue
**dos operaciones**: **actualizar** un modelo (bump de versión en la misma ruta — reemplaza) y **sumar** un modelo/tier
nuevo (ruta nueva — coexiste). Hoy los adapters resuelven el modelo **por capacidad** (un modelo fijo por capacidad por
proveedor), lo que impide dos modelos del mismo proveedor a la vez.

## Why This Task Exists

Globe es producto comercial y la dirección es **usar los mejores modelos del mercado, agregándolos con el tiempo, sin
que uno sustituya a otro**. El runtime actual no lo permite: `OPENAI_ROUTING[capability]` y `VERTEX_ROUTING[capability]`
(`apps/creative-runner/src/{openai,vertex}-adapter.ts`) fijan **un** modelo por capacidad, y el composite
(`composite-adapter.ts`) rutea imagen a **un** proveedor por capacidad. El compiler ancla todo a `estimate.model`
(`production-route-compiler.ts:154-171`), así que un binding a un segundo modelo del mismo proveedor da
`route_binding_missing`/`route_identity_mismatch` → denegado. Dos modelos del mismo proveedor (GPT Image 1.5 **y** 2;
Nano Banana Pro **y** 2) exigen **resolución de modelo por-ruta** en los adapters. Sin esta task, "sumar modelos" es
editar código destructivamente cada vez y sustituir, exactamente lo contrario de la mentalidad aditiva del negocio.

Contexto verificado en vivo (TASK-1535, 2026-07-24): Nano Banana Pro (`gemini-3-pro-image`) **genera imágenes reales**
en el proyecto Globe vía endpoint `global`; Nano Banana 2 (`gemini-3.1-flash-image`) da 404 (falta allowlist del
proyecto, ask a Google); OpenAI está registrado en el composite del Lab pero sin lane de producción.

## Goal

- Un **catálogo de modelos extensible** donde cada modelo/tier es una **ruta gobernada** con identidad estable; agregar
  un modelo nuevo = agregar una entrada de catálogo + su binding (paso chico, gobernado), no reescribir adapters.
- **Resolución de modelo por-ruta** en los provider adapters (OpenAI, Vertex) y en la política del composite, de modo
  que dos modelos del mismo proveedor coexisten y se seleccionan por ruta, sin que `estimate.model` quede fijo por
  capacidad.
- Semántica explícita **update (reemplaza versión en la misma ruta) vs add (ruta nueva que coexiste)**, aplicada
  uniforme a todos los proveedores (Gemini, OpenAI, Fal, y futuros).
- Seedream + Nano Banana Pro + GPT Image 2 + GPT Image 1.5 elegibles simultáneamente como imagen; Nano Banana 2 listo
  para sumarse apenas Google habilite el allowlist, con un paso chico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar (doc gobernante de Globe vive en Greenhouse, EPIC-028 / TASK-1492):

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md`

Reglas obligatorias:

- Diseñar con la skill `arch-architect` (forma/decisiones) + `greenhouse-globe` (boundary + flujo de capabilities).
  Producir/actualizar un ADR de Globe (`creative-studio/`) para la resolución por-ruta antes de implementar.
- El **slug/id real del proveedor NUNCA** entra al `producer-catalog.ts` (drift guard `assertNoSlugLeak`): el
  `providerModelId` vive en el binding de production-routing, no en el catálogo público.
- **NUNCA** sustituir un modelo distinto por otro (Seedream ≠ Nano Banana). Sustituir SOLO aplica a bump de versión
  dentro de la misma ruta (update). Add = ruta nueva.
- Reusar el spine (contracts→domain→adapter), el `CapabilityRegistry`, `production-routing.manage` y el compiler
  existentes; NO crear un mecanismo de routing paralelo.

## Normative Docs

- `docs/tasks/in-progress/TASK-1535-globe-commercial-promotion-attestation-lane.md` (§"Canary path — mapeo completo"
  y §"Canary run — evidencia real": composite→Fal, adapters por-capacidad, evidencia de acceso por modelo).

## Dependencies & Impact

### Depends on

- Spine + Model Lab + composite/adapters vigentes en `efeonce-globe` (live).
- `production_route_binding_revisions` + `globe.production-routing.route.append` (`packages/database/migrations/0017_production_routing_control.sql`).

### Blocks / Impacts

- `TASK-1552` (Globe Producer Composer Focused Creation, ui-ux) — consume el catálogo como **selector de modelo**; esta
  task es su foundation backend.
- Comercialización por modelo (TASK-1535 / ADR-010): cada modelo/tier nuevo necesita su atestación humana antes de
  entrega a cliente.

### Files owned (repo `efeonce-globe`)

- `apps/creative-runner/src/openai-adapter.ts`, `vertex-adapter.ts`, `composite-adapter.ts`
- `apps/creative-runner/src/production-route-compiler.ts`
- `packages/domain/src/producer-catalog.ts` + `packages/contracts/src/producer-catalog.ts`
- `apps/studio-web/src/governed-production-composition.ts` (endpoint allowlist por modelo)
- tests correspondientes + `scripts/evidence/*` por modelo

### Files owned (repo `greenhouse-eo`)

- ADR + doc de arquitectura en `docs/architecture/creative-studio/`; doc funcional + manual; esta task.

## Current Repo State

### Already exists

- Adapters por proveedor con `providerId` (`vertex`, `fal`, `openai`, `vertex-omni`, `vertex-video`) registrados en el
  composite del Lab (`apps/studio-web/src/app.ts:3480-3488`, openai incluido).
- Catálogo `PRODUCER_ROUTE_CATALOG` (10 rutas) con modelo **público** (`model:{name,version}`), sin slug.
- Binding gobernado `ProductionRouteBindingV1` (`routeId, providerId, modelId, modelVersion, endpointId, region`) +
  compiler que exige `binding.modelId == estimate.model == readiness.route.modelId`.

### Gap

- Los adapters resuelven modelo **por capacidad** (`OPENAI_ROUTING[capability]`, `VERTEX_ROUTING[capability]`) → un solo
  modelo por proveedor por capacidad; imposible dos del mismo proveedor.
- El composite rutea imagen a **un** proveedor por capacidad (`DEFAULT_COMPOSITE_POLICY['image-generate']='fal'`).
- No hay noción de "ruta = modelo/tier" ni operación explícita update-vs-add en el catálogo.
- OpenAI sin lane de producción (`governed-production-composition.ts:71`).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-globe` (repo hermano): `apps/creative-runner/**`, `packages/{domain,contracts}/**`, `apps/studio-web/**`. Gobernado por Greenhouse (control plane documental EPIC-028); NO corre en el build de `greenhouse-eo`.
- Future candidate home: `remain-shared` (dentro de `efeonce-globe`; el catálogo de modelos es dato del monorepo de Globe, no se extrae a un paquete nuevo por esta task).
- Boundary: primitive canónico = catálogo de rutas + resolución por-ruta en adapters + binding gobernado; consumers = Model Lab, Producer, promotion lanes, el selector de UI (TASK-1552), MCP/SDK/CLI.
- Server/browser split: server-only (adapters/runner/compiler en Cloud Run Job + api; el browser solo consume el catálogo proyectado vía BFF).
- Build impact: `none` (no agrega dependencia pesada; edita código existente del monorepo de Globe).
- Extraction blocker: `provider constraint` — el `providerModelId` real y las llaves viven detrás del boundary del adapter; el catálogo público nunca los expone.

## Backend/Data Contract

### Backend/data brief

Introduce "ruta = modelo/tier" como unidad seleccionable. La identidad de ruta (`ModelRouteIdentityV1`:
`routeId, capability, fidelityContract, providerId, modelId, modelVersion`) ya existe; esta task hace que el
**adapter resuelva `modelId/modelVersion` desde `request.route`** (no desde un mapa por capacidad), y que el catálogo
declare múltiples rutas por capacidad. El `providerModelId` real permanece dentro del adapter/binding (nunca en el
catálogo público).

### Source of truth

- Catálogo público de rutas: `PRODUCER_ROUTE_CATALOG` (`packages/domain/src/producer-catalog.ts`) — DATO versionado.
- Binding runtime (`routeId → providerId + providerModelId + version + endpoint + region`): tabla
  `production_route_binding_revisions` (append-only, revisión).
- Resolución de modelo del adapter: una tabla **route→model** dentro de cada adapter (o derivada del binding), NO un
  default por capacidad.

### Contract surface

- Readers/commands del spine ya existentes: `globe.producer.catalog.list/get` (lista rutas elegibles),
  `globe.lab.experiment.estimate/prepare/execute`, `globe.production-routing.route.append`,
  `globe.model-readiness.*`. Esta task NO agrega capabilities nuevas; extiende el DATO y la resolución.

### Data model and invariants

- **Invariante update-vs-add:** una ruta tiene identidad estable (`routeId`); su `modelVersion` se actualiza in-place
  (update). Un modelo/tier distinto = `routeId` nuevo (add, coexiste). Prohibido cambiar el `providerId`/lineaje de un
  `routeId` existente para "reusarlo" como otro modelo.
- **Invariante slug:** el `providerModelId` real (`gemini-3-pro-image`, `gpt-image-2`, …) NUNCA aparece en el catálogo
  público; solo en el binding/adapter (drift guard).
- **Invariante consistencia:** `binding.modelId == estimate.model == readiness.route.modelId` sigue vigente; ahora
  `estimate.model` se deriva de la ruta, no de la capacidad.
- **Invariante región:** los modelos Gemini 3 image usan `region:'global'` (us-central1 da 404) — verificado en vivo.

### Tenant/access boundary

- Sin cambio de tenant boundary: el Lab/Producer es internal-only; la selección de modelo es operator-facing. La
  entrega a cliente sigue gobernada por rights/atestación por modelo (ADR-010).

### Idempotency/concurrency

- Binding append-only con `expectedRevision`; estimate/prepare/execute conservan su idempotencyKey. Sin nuevos writes
  no idempotentes.

### Migration/backfill/rollback posture

- Aditivo: agregar rutas al catálogo (dato) + bindings (append-only). Sin migración destructiva. Rollback = revert PR
  del catálogo/adapter + no promover las rutas nuevas (una ruta no promovida es inerte).

### Sensitive data/error posture

- Llaves de proveedor server-side (secrets); errores del adapter sanitizados (`OpenAiAdapterError`, etc.). Nunca loggear
  llaves ni slugs crudos al cliente.

### Audit/signal posture

- Reusar los signals de promotion/routing existentes. Considerar un signal `producer.route.binding_model_mismatch`
  (steady=0) si el binding y el estimate divergen tras la resolución por-ruta.

### Runtime evidence

- Canary por modelo vía el Lab (estimate→prepare→execute) con cada ruta nueva; MIME/hash del output; `tofu plan` sin
  drift si toca infra. Nano Banana Pro ya tiene evidencia real (TASK-1535).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR + diseño de resolución por-ruta (arch-architect)

- ADR en `docs/architecture/creative-studio/` que fije: ruta=modelo/tier, resolución de modelo por-ruta en adapters,
  semántica update-vs-add, y la receta "agregar un modelo" (dato + binding). Indexar en `DECISIONS_INDEX`.

### Slice 2 — Resolución de modelo por-ruta en los adapters

- `openai-adapter.ts` + `vertex-adapter.ts`: `estimate()`/`submit()` resuelven `model/modelVersion` desde
  `request.route` vía una tabla route→model interna (o derivada del binding), en vez de `*_ROUTING[capability]`.
  Mantener un default seguro por capacidad como fallback del Lab sin ruta.

### Slice 3 — Catálogo multi-ruta por capacidad + política composite por-ruta

- `producer-catalog.ts`: rutas nuevas para Seedream (existente), Nano Banana Pro, GPT Image 2, GPT Image 1.5
  (Nano Banana 2 declarada pero gateada por allowlist). Público sin slug.
- `composite-adapter.ts`: política de imagen como **resolver por-ruta** (`ref/still/openai-*`→openai,
  `ref/still/nanobanana-*`→vertex, `ref/still/seedream-*`→fal), coexistiendo.

### Slice 4 — Bindings + endpoint allowlist + promoción por modelo

- Binding (`globe.production-routing.route.append`) por (workspace, ruta, modelo). Entradas de endpoint allowlist por
  modelo en `governed-production-composition.ts` (región `global` para Vertex image). Promoción por ruta (ADR-009/010).

### Slice 5 — Evidencia + canary por modelo + docs

- Canary por el Lab de cada ruta nueva; evidencia `scripts/evidence/*`; doc funcional + manual del catálogo
  multi-modelo y de la receta "agregar un modelo".

## Out of Scope

- El **selector de UI** de modelo (vive en `TASK-1552`, consumer). Esta task expone el catálogo, no la pantalla.
- La **lane de producción de OpenAI** (verifier faltante, `governed-production-composition.ts:71`) si excede el
  alcance — declarar follow-up si se difiere; el Lab de OpenAI ya funciona.
- Video/audio multi-modelo: el diseño debe ser extensible a ellos, pero el shipping se acota a **imagen** primero.
- Cambiar el default vivo de imagen sin selección explícita (no romper el comportamiento actual de Seedream sin decisión).

## Detailed Spec

Ver Backend/Data Contract + los ADR/arquitectura de Globe. El corazón: `estimate.model` deja de ser función de la
capacidad y pasa a ser función de la **ruta**, habilitando N modelos por capacidad. El catálogo público sigue sin
slugs; el `providerModelId` real vive en el adapter/binding. Update = bump de `modelVersion` en la ruta; Add = ruta
nueva. Extensibilidad: un modelo nuevo del mismo proveedor = entrada de catálogo + binding, sin tocar la lógica de
resolución (ya es por-ruta).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (ADR) → Slice 2 (resolución por-ruta, foundation) → Slice 3 (catálogo + composite) → Slice 4 (bindings +
  promoción) → Slice 5 (evidencia + docs). Slice 3/4 NO pueden shippear antes que Slice 2: sin resolución por-ruta, un
  segundo modelo del mismo proveedor da `route_binding_missing`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del modelo default vivo (Seedream) al cambiar la política composite | Producer/Lab imagen | medium | mantener Seedream como ruta + no cambiar el default sin selección explícita; canary por ruta | output MIME/hash inesperado; quejas de output |
| Mismatch binding.modelId vs estimate.model tras resolución por-ruta | routing/compiler | medium | test de identidad por ruta; signal steady=0 | `route_identity_mismatch`/`route_binding_missing` en logs |
| Slug de proveedor filtrado al catálogo público | seguridad/marca | low | drift guard `assertNoSlugLeak` (ya existe) rompe la carga | build/load falla |
| Modelo preview sin allowlist (Nano Banana 2) promovido y falla en runtime | Vertex | medium | gate por evidencia de acceso antes de promover; ruta declarada pero no promovida | `model_unavailable` en el canary |

### Feature flags / cutover

- Una ruta nueva es **inerte hasta promoverse** (readiness `promoted` + binding `enabled`). No requiere flag env: el
  gate es la promoción gobernada. Cutover = promover la ruta; revert = despromover (pause/retire, append-only).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (doc) | <5 min | sí |
| Slice 2 | revert PR adapters (default por-capacidad vuelve) | <15 min | sí |
| Slice 3 | revert PR catálogo/composite | <15 min | sí |
| Slice 4 | despromover ruta (pause/retire) — data append-only, no se borra | por ruta | parcial |
| Slice 5 | revert PR docs/evidencia | <5 min | sí |

### Production verification sequence

1. Slice 2 en staging/internal: canary del modelo default por ruta = mismo output que hoy (no regresión).
2. Slice 3/4: promover 1 ruta nueva (Nano Banana Pro), canary por el Lab, verificar output real + identidad de ruta.
3. Repetir por modelo (GPT Image 2, GPT Image 1.5). Nano Banana 2 solo tras allowlist de Google.
4. Verificar que Seedream sigue elegible y sin cambios.

### Out-of-band coordination required

- **Google**: allowlist de preview del proyecto Globe para `gemini-3.1-flash-image` (Nano Banana 2) antes de promoverlo.
- **CEO**: atestación humana por modelo (ADR-010) antes de entrega a cliente con cada modelo.
- **Permiso de edición de código en Globe** para el agente implementador (el classifier del entorno bloqueó ediciones
  en la sesión de diseño 2026-07-24).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

### Rollout evidence — 2026-07-24 (latest)

- Worker deploy `deploy-producer-worker.yml` run `30121176824` completed `success` for `5482a60a6c79b740a698a2cce9eb357b9c2f6080`.
- Governed Vertex-image driver + `global` endpoint allowlist landed in Globe `main` at `9b62b193016ffe13c42c679be50fb28d19fc0f24`; API deploy run `30125681964` and worker build run `30125679964` completed `success`, followed by worker deploy run `30125918755`.
- The API runtime also required the same SHA because its live catalog was still `1.2.0`; `deploy-internal.yml` run `30121490254` completed `success`. The live API then exposed catalog `1.3.0` and `ref/still/nanobanana-pro-v1`.
- `GLOBE_LAB_PROVIDER=vertex` was applied live to API + worker for the canary and then restored to `composite`; the Terraform SoT was restored to `composite` in the same change. `GLOBE_LAB_ENABLED=true` remained enabled.
- Break-glass impersonation of `greenhouse-globe-caller` was granted at SA scope to the operator, used with `--include-email`, and revoked; the final IAM readback confirms the operator grant is absent.
- Migration `0031_add_nanobanana_pro_credit_rates.sql` was applied through the canonical database migrator (`1 applied`, `30 already applied`), adding the governed standard/HD rates for the supported Nano Banana Pro shapes. The live estimate then resolved the route at 10 credits.
- A requested additional 5000-credit grant was attempted through the canonical maker/checker command with unique idempotency/source IDs and valid break-glass identity, but live API returned `409 conflict`; no unverified ledger mutation was made. The existing governed 10-credit grant was used instead.
- The governed path reached the compiler but correctly failed before provider execution because ADR-009 route binding/readiness is not yet promoted. A separate Lab canary with production scheduler temporarily disabled exercised Vertex directly: experiment `a258dda8-ea6e-4a34-94f0-4cd9ca301d17`, `candidate_ready`, `spentCredits=10`, `provider=vertex`, `model=gemini-3-pro-image`, route `ref/still/nanobanana-pro-v1`, region `global`.
- Runtime evidence: output `image/png`, `1,111,472` bytes, SHA-256 `sha256:9e9edaf59cb927610d043e3af3cac9b90c321ed48e55eb34ec0300c72dc429cf`; retrieval returned HTTP 200 and independently verified the same hash. API revision was restored to governed/composite defaults and worker env to composite after the canary.
- API/worker were redeployed at Globe `main` `c3b6bf4a89ff40c1713cc07255d22b91e9ff97e9` (API run `30129902342`, worker run `30129904260`, both `success`) so the new `globe.producer.fleet.list` reader is live. Its workspace readback is honest: Seedream/Seedance loop/ElevenLabs TTS are `available`; Nano Banana Pro and the remaining candidate routes are `gated` with `not_promoted`; OpenAI routes are `blocked` with `provider_verifier_pending`.
- The ADR-009 saga was not advanced: the exact route/binding/readiness records are absent and the required separate promotion identities could not be impersonated from this environment (`iam.serviceAccounts.getAccessToken` denied). No binding, readiness, or circuit bypass was performed. The 5000-credit canonical grant remains a live `409 conflict`; the one-active-grant hypothesis is not present in `credit-administration-store.ts`, so ISSUE-124 tracks phase-level conflict observability/root-cause closure.
- Current state: **code complete, canary verde, rollout parcial/bloqueado**. Nano Banana Pro is not promoted: ADR-009 binding/readiness saga, exact identity readback, and fleet `available` readback remain outstanding.

- [x] Source of truth nombrado: catálogo público (rutas) + binding runtime (providerModelId) + resolución por-ruta en adapters. **DONE (ADR-013 + código Slice 2-3).**
- [x] Dos modelos del mismo proveedor coexisten y se seleccionan por ruta (GPT Image 1.5 + 2 y/o Nano Banana Pro + 2) sin `route_binding_missing`. **DONE a nivel resolución/Lab** (test del segundo consumidor: `openai-v2`→`gpt-image-2`, `openai-v1-5`→`gpt-image-1.5`, dos modelos mismo proveedor). La ausencia de `route_binding_missing` en **producción** se valida al promover (rollout-pending).
- [x] Seedream + Nano Banana Pro + GPT Image 2 + GPT Image 1.5 elegibles simultáneamente como imagen; Seedream sin regresión. **DONE** (catálogo v1.3.0 + composite por-ruta; 236/236 tests creative-runner verdes; Seedream sigue default vivo).
- [x] Semántica update (bump de versión en la ruta) vs add (ruta nueva) explícita y documentada; el catálogo público sin slugs (drift guard verde). **DONE** (ADR-013 + doc funcional/manual; `assertNoSlugLeak` verde con las rutas nuevas).
- [~] Invariante de consistencia `binding.modelId == estimate.model == readiness.route.modelId` se mantiene con resolución por-ruta. **Diseño garantizado por construcción (ADR-013); no ejercitado en runtime** (sin promoción) — rollout-pending.
- [x] Evidencia runtime por modelo (canary por el Lab) listada; región `global` para Vertex image. **DONE for canary**: experiment `a258dda8-ea6e-4a34-94f0-4cd9ca301d17`, 10 credits, `image/png`, 1,111,472 bytes, SHA-256 `9e9edaf59cb927610d043e3af3cac9b90c321ed48e55eb34ec0300c72dc429cf`; promotion remains pending.
- [~] Promoción ADR-009 + reader `globe.producer.fleet.list`: API/worker deployados y reader verificado live, pero Nano Banana Pro sigue `gated/not_promoted`; no se declara promoción ni disponibilidad.
- [x] ADR de resolución por-ruta indexado en `DECISIONS_INDEX`. **DONE (Slice 1, 2026-07-24):** ADR-013 = `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`, indexado en `DECISIONS_INDEX.md` + `creative-studio/README.md`.

## Verification

- `pnpm check` + `pnpm build` (en `efeonce-globe`) verdes; tests nuevos registrados en el script del package.
- Canary por modelo vía el Lab con evidencia (output MIME/hash).
- `tofu plan` sin drift si toca infra.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [x] `GLOBE_RUNTIME_HANDOFF.md` actualizado con deploys, flags, IAM cleanup y bloqueo del governed Vertex-image worker path
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-1552 selector; TASK-1535 atestación por modelo)
- [ ] ADR + doc funcional + manual del catálogo multi-modelo creados/actualizados

## Follow-ups

- Selector de modelo en UI (TASK-1552).
- Lane de producción de OpenAI (verifier) si se difiere de esta task.
- Multi-modelo para video y audio (misma resolución por-ruta, extensible).
- Nano Banana 2 (`gemini-3.1-flash-image`) tras allowlist de Google.

## Open Questions

- ¿La selección de modelo es **explícita** por el usuario (selector) o Globe **elige el mejor** por tipo de encargo con
  el modelo como secundario? Define la forma del selector en TASK-1552 y si el catálogo expone "recomendado por defecto".
  **RESUELTA (ADR-013, Slice 1):** el catálogo expone `recommendedDefault?: routeId` (metadata aditiva, pública, nombra
  ruta no slug); la selección explícita es el contrato primario; preserva Seedream como default vivo de imagen sin
  decisión. La FORMA del selector queda a TASK-1552 — ambas UX funcionan sin cambio de backend.
- ¿La resolución por-ruta del adapter lee el `providerModelId` del **binding** (fuente única) o de una tabla route→model
  **dentro del adapter**? El binding como fuente única evita duplicar el mapeo; decidir en el ADR (Slice 1).
  **RESUELTA (ADR-013, Slice 1):** binario falso. SSOT por concern — la **tabla del adapter** (re-llaveada
  capacidad→`routeId`) es fuente única de identidad ejecutable + slug (el Lab canarea desde ahí antes de existir
  binding, sin forzar un append DB para explorar); el **binding** es fuente de estado de promoción y lleva un
  **snapshot derivado** (nunca un `modelId` inventado), fail-closed por `exactReport`/`resolveExact` + señal
  `producer.route.binding_model_mismatch` (steady=0). Sin duplicación, sin drift.
