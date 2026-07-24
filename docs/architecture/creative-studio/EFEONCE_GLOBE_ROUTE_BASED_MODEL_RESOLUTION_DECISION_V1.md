# Efeonce Globe — Route-Based Model Resolution and Extensible Multi-Model Catalog Decision V1

- Decision: ADR-013
- Status: Accepted; implementation and commercial rollout gated
- Date: 2026-07-24
- Owners: Efeonce Globe platform, creative operations and security
- Implements through: `TASK-1553`
- Related: `TASK-1552` (model selector UI, consumer), `TASK-1535` / ADR-010 (commercial promotion via
  attestation), ADR-009 (route promotion saga), ADR-003 (public model name vs provider slug),
  `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`, `EFEONCE_GLOBE_MODEL_LAB_V1.md`,
  `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`

## Context

Globe is a commercial product and the stated direction is to **use the best models on the market and keep adding
them over time, without one replacing another**. The runtime does not permit that today.

Each provider adapter resolves the wire model **from the request capability**, not from the route:

- `apps/creative-runner/src/openai-adapter.ts:100,250` — `OPENAI_ROUTING[request.capability]` → one model per
  capability (`gpt-image-2`).
- `apps/creative-runner/src/vertex-adapter.ts:103,292` — `VERTEX_ROUTING[request.capability]` → one model per
  capability (`gemini-3-pro-image`, `region:'global'`). The adapter comment at `vertex-adapter.ts:100-102`
  already flags that exposing the second frontier member `gemini-3.1-flash-image` alongside Pro "needs
  route-based model resolution; follow-up slice".
- `apps/creative-runner/src/fal-adapter.ts:128-292` — per-capability `{ slug, model, modelVersion }`.
- `apps/creative-runner/src/composite-adapter.ts:105-110` — `DEFAULT_COMPOSITE_POLICY['image-generate'] = 'fal'`
  routes image-generate to **one** provider.

Because `estimate.model` is a function of the **capability**, two models of the same provider cannot coexist. A
binding to a second model of the same provider yields a proposed tuple `{routeId, providerId, modelId=estimate.model}`
that the production compiler cannot reconcile — `production-route-compiler.ts:159-168` enforces
`estimate.route === routeId` and `readiness.route.{providerId,modelId,modelVersion} === estimate.*` and
`resolveExact({...proposed})`, so a second same-provider model denies with `route_identity_mismatch` /
`route_binding_missing`. GPT Image 1.5 **and** 2, or Nano Banana Pro **and** 2, are therefore unreachable at once.

### The catalog already supports N routes per capability — the gap is purely resolution

`PRODUCER_ROUTE_CATALOG` (`packages/domain/src/producer-catalog.ts`, `PRODUCER_CATALOG_VERSION='1.2.0'`, 10 routes)
is a flat frozen array. Two routes already share a capability (`video-generate` → `ref/motion/loop-v1` +
`ref/motion/reference-v1`) and one model already backs several routes (Seedance backs `ref/motion/loop-v1` and
`ref/video/motion-v1`). The catalog **data model needs no change** to hold several image routes. The engine has no
`switch` by route: "adding a route = editing the array + version" is an existing property. The gap is entirely in
(1) the adapter resolving by capability instead of route, and (2) the composite picking one provider per capability.

### The identity chain is four distinct string spaces, joined only by `routeId` + `capability`

This is the load-bearing fact the resolution design must respect. For `routeId='ref/still/rrss-v1'`:

| Layer | Value | Owner | Anchor |
|---|---|---|---|
| (a) Public display name | `model: { name:'Seedream', version:'5 Pro' }` | public catalog | `producer-catalog.ts:63` |
| (b) Executable model id | `'seedream-5-pro'` (version `'v5-pro'`) = `estimate.model` = `manifest.model` = `binding.modelId` | adapter routing table | `fal-adapter.ts:129-138` |
| (c) Binding / readiness identity | `{ providerId, modelId, modelVersion }` (separate fields, exact-match verified) | `production_route_binding_revisions` + readiness | `production-routing-control.ts:24-36`, `model-readiness.ts:132` |
| (d) Provider wire slug | `'bytedance/seedream/v5/pro/text-to-image'` | adapter + endpoint allowlist | `fal-adapter.ts:130`, `governed-production-composition.ts:187` |

Two facts the design must not miss: the public **version string differs** from the executable one (`'5 Pro'` vs
`'v5-pro'`), so `model.version` is not a key into the binding; and the public descriptor
(`ProducerRouteDescriptorV1`) carries **no provider / modelId / slug at all** by design — the map
`routeId → (providerId, modelId, modelVersion, slug, region, endpoint)` lives **only** inside the adapter routing
table and the production bindings, reconciled solely through `routeId` + the readiness `exactReport` equality
check. The drift guard `assertNoSlugLeak` (`producer-catalog.ts:301-317`, runs at module load over every
caller-visible label) forbids any vendor slug from leaking into the public catalog.

### Governing decisions this must respect

- **ADR-003** — the public model **name** (a legible quality/positioning signal for the enterprise ICP) is
  client-facing; the provider **wire slug**, vendor cost and margin are forbidden on every surface and abort catalog
  load if leaked. `actualRoute` is a fidelity contract, never a slug.
- **ADR-009 / ADR-010** — a route reaches production only through the promotion saga, gated by a passing objective
  eval and a per-model commercial rights attestation (recorded once per model). Promotion ≠ delivery.

## Decision

Globe adopts **route-based model resolution**: `estimate.model` becomes a function of the **route**, not the
capability, so N models per capability coexist and are selected per route. The multi-model catalog is an
**additive catalog of governed routes**, each route a stable identity; adding a model is a small governed step
(catalog entry + adapter entry + endpoint + binding), never an adapter rewrite or a destructive substitution.

### 1. The route is the unit of model selection; resolution is keyed by `routeId`

The provider adapters resolve `{ model, modelVersion, region, slug }` from `request.route` (the fidelity-contract
string that equals the catalog `routeId` and `experiment.request.referenceRoute`), by re-keying their existing
routing tables from `capability` to `routeId`:

- `OPENAI_ROUTING` / `VERTEX_ROUTING` / `FAL_ROUTING` become keyed by `routeId`, holding the same
  `{ slug, model, modelVersion, region, … }` shape they hold today.
- The per-**capability** table is retained **only** as the backward-compatible fallback for a raw Lab experiment
  that declares **no route** ("Lab sin ruta"). A request that **does** declare a route but has no matching routing
  entry is a **hard failure** (`unsupported_route`), never a silent fall-through to a capability default — a silent
  fall-through would generate a Seedream route with the wrong model and no noise (the exact silent-swap failure the
  drift guards exist to prevent).

The estimate/quote plumbing already carries the route: `LabQuoteInputV1 = { capability, route, outputShape?,
inputHashes, hardCapCredits? }`; `CreativeProviderRequestV1.route: string` reaches every adapter today (it is
echoed back into the estimate but not used to pick the model). No new field is required to make resolution
route-based — only the resolution key changes from `request.capability` to `request.route`.

### 2. Single source of truth per concern — no duplicated mapping, no drift

Q2 ("does the adapter read the wire model from the binding, or from a route→model table inside the adapter?") is a
false binary. The robust answer assigns exactly one owner to each concern (SSOT):

- **Executable identity + provider slug** (`routeId → { providerId, modelId, modelVersion, slug, region }`) is owned
  by the **adapter routing table**. The slug stays adapter-internal (ADR-003 literal). This is the source the Lab
  canary resolves from, so a brand-new model can be canaried **before** any production binding exists — the Lab does
  not require a binding today and must not start requiring one.
- **Promotion state** (`enabled`, per workspace, `endpointId`) is owned by the **binding**
  (`production_route_binding_revisions`, append-only). The binding carries `{providerId, modelId, modelVersion}` as
  a **derived snapshot** of the adapter identity for that `routeId`, **never an independently invented value**. Its
  correctness is enforced fail-closed downstream by `readiness.exactReport` (`model-readiness.ts:132`) and the
  compiler `resolveExact` (`production-route-compiler.ts:167`): a binding whose `modelId` disagrees with the
  adapter's resolved `estimate.model` is unresolvable (`route_binding_missing`) and therefore inert.
- **Production wire endpoint** (`routeId → vendor URL`) is owned by the **endpoint allowlist**
  (`governed-production-composition.ts`), where each `buildBody` binds to its exact route via `assertRoute`.

The consistency invariant `binding.modelId == estimate.model == readiness.route.modelId` holds because all three
derive from the one adapter identity, and any residual divergence is caught proactively by a new reliability signal
**`producer.route.binding_model_mismatch`** (`kind: data_quality`, `severity: error`, `steady = 0`) that compares
every enabled binding's `modelId` against the adapter routing entry for its `routeId` — turning a would-be runtime
`route_binding_missing` into an observed, actionable drift before a run hits it.

### 3. Composite policy resolves the provider per route, not per capability

`DEFAULT_COMPOSITE_POLICY` for image becomes a **per-route resolver** (the pattern already used for
`video-generate`, `composite-adapter.ts:107`): `ref/still/openai-*` → `openai`, `ref/still/nanobanana-*` →
`vertex`, `ref/still/seedream-*` / `ref/still/rrss-*` → `fal` — all coexisting. The **live image default is not
changed without an explicit selection**: absent a selected route, image-generate stays on Seedream/Fal exactly as
today (see §5, `recommendedDefault`).

### 4. Update vs add — explicit, and uniform across all providers

- **Update (replaces)** = a version bump **within the same `routeId`**: the adapter entry's `modelVersion` changes,
  the public `model.version` label changes, and a new binding revision is appended. Same route, same lineage,
  replaces the prior version.
- **Add (coexists)** = a **new `routeId`** (new catalog entry + new adapter entry + new binding). The prior route is
  untouched and both remain selectable.
- **Hard invariant:** the `providerId`/lineage of an existing `routeId` is **immutable** across revisions.
  Re-pointing `ref/still/rrss-v1` from Seedream to Nano Banana to "reuse the id" is forbidden — it would silently
  swap one model for a different one under a stable identity, the precise substitution this decision exists to
  prevent. A lineage drift guard asserts `providerId` stability per `routeId` across binding revisions.

### 5. `recommendedDefault` — additive metadata, not a selector

To preserve current behavior without a selection **and** without pre-deciding the TASK-1552 selector's shape, the
catalog exposes an optional per-capability `recommendedDefault?: routeId` hint (additive, public — it names a route,
never a slug). Explicit route selection remains the **primary** contract (the run already carries `route`); the
recommendation is metadata a consumer (UI, agent, composite fallback) MAY use to pick a best-by-default when no
route is selected. For image-generate the recommended default is Seedream, so the live default is unchanged until a
human decision moves it. Whether the UI surfaces explicit selection or "Globe picks the best" is TASK-1552's call;
this decision keeps both open with zero backend change.

### 6. The receta — "add a model" is a bounded, governed step

1. **Public catalog route** — add a `ProducerRouteDescriptorV1` entry (new `routeId`, public `model.name` +
   optional `version`, constraints, `house`), bump `PRODUCER_CATALOG_VERSION`. No slug (drift guard enforces).
2. **Adapter routing entry** — add `ADAPTER_ROUTING[routeId] = { slug, model, modelVersion, region }` in the owning
   provider adapter. Slug enters here, once, behind the boundary.
3. **Composite policy** — ensure the route's prefix resolves to the owning provider.
4. **Endpoint allowlist** — add the production endpoint entry bound to the exact route (Vertex image uses
   `region:'global'` — `us-central1` returns 404, verified live TASK-1535).
5. **Binding** — `globe.production-routing.route.append` the binding (append, not enabled). The route is now
   Lab-canary-able but inert for production.
6. **Canary → attest → promote** — canary via the Lab (real output, MIME/hash evidence), record the per-model
   commercial rights attestation (ADR-010), promote via the ADR-009 saga (flips `enabled` + readiness `promoted`).

Steps 1–5 are additive and reversible by revert; step 6 is governed by the existing promotion machinery. No engine
logic changes when a model is added — resolution is already route-based.

## Alternatives rejected

- **Keep capability-keyed resolution, add a provider suffix to the capability** (e.g. `image-generate@openai-2`) —
  rejected: overloads a controlled vocabulary with routing state, and the route already is the correct unit; it
  would recreate the "switch of literals over a field the schema declares free" anti-pattern.
- **Binding as the sole source of wire identity (Lab reads the binding)** — rejected: forces a DB binding append
  before any Lab experiment, making cheap exploration expensive and breaking today's canary flow (Nano Banana Pro
  canaries with no binding). The adapter table as SSOT + binding as promotion-state snapshot keeps the Lab cheap and
  the invariant fail-closed.
- **A free-standing route→model table duplicated in the adapter and hand-typed again in the binding** — rejected:
  two independent sources of the same datum is the drift class the risk matrix names; the binding must be a
  derivation, not a second source.
- **Change the live image default to a new model as part of this task** — rejected: out of scope; the default only
  moves by explicit human decision (`recommendedDefault`), never as a side effect.

## Four-pillar scoring

- **Safety** — the provider slug never leaves the adapter boundary (ADR-003 drift guard, module-load abort);
  production promotion stays gated by the ADR-009 saga + per-model attestation (ADR-010); `openAiEnabled` remains
  hard-blocked in production (`governed-production-composition.ts:71`) until a verifier exists, so GPT Image routes
  can be Lab-canaried but not promoted. A route present with no adapter entry hard-fails rather than silently
  resolving the wrong model.
- **Robustness** — the four-space identity is reconciled by construction (one adapter SSOT, binding derives) and
  fail-closed by the existing `exactReport` / `resolveExact` checks; lineage immutability per `routeId` prevents
  silent model swaps; the per-capability fallback is scoped strictly to route-absent requests.
- **Resilience** — the new `producer.route.binding_model_mismatch` signal (steady = 0) surfaces drift proactively;
  rollback per slice is revert (data/adapter) or de-promote (binding is append-only, never deleted); a route not
  promoted is inert, so a broken new route cannot affect production.
- **Scalability** — adding the Nth model of a provider is O(1) governed additions with no engine change; the catalog
  is already flat and additive; resolution is a keyed lookup. The design extends uniformly to video/audio (same
  route-keyed resolution) though shipping is scoped to image first.

## Blast radius / reversibility

Two-way door. `estimate.model` changes source (capability → route) but the existing routes are seeded with their
current values (Vertex image `gemini-3-pro-image`/`preview`/`global`; OpenAI image `gpt-image-2`/`2026-04-21`; Fal
Seedream `seedream-5-pro`/`v5-pro`), so the no-selection path is byte-for-byte unchanged and verified by a
same-output canary (production verification sequence step 1). Every slice reverts in ≤15 min except binding
promotion, which is de-promoted (append-only). Blast is contained to `apps/creative-runner` adapters + the composite
policy + the catalog data; the public catalog contract, the spine, the compiler and the promotion saga are reused
unchanged.

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** resolve the wire model from `request.capability` for a request that declares a route — resolve from
  `request.route` (`routeId`). Capability is the fallback **only** when no route is declared.
- **NUNCA** silently fall back to a capability default when a route is declared but has no adapter entry — hard-fail
  (`unsupported_route`).
- **NUNCA** put the provider slug, vendor cost or margin in `producer-catalog.ts` (public catalog) — the drift guard
  `assertNoSlugLeak` aborts catalog load; the slug lives only in the adapter and the endpoint allowlist.
- **NUNCA** change the `providerId`/lineage of an existing `routeId` to "reuse" it as a different model — that is a
  substitution, forbidden. A different model/tier is a new `routeId` (add), never an in-place re-point.
- **NUNCA** let the binding invent a `modelId` independent of the adapter identity — the binding carries a derived
  snapshot; divergence must be caught by `producer.route.binding_model_mismatch` and is fail-closed by the compiler.
- **NUNCA** promote an OpenAI image route to production while `openAiEnabled` is hard-blocked, nor promote a
  preview-gated model (Nano Banana 2, `gemini-3.1-flash-image`) before Google clears the project allowlist.
- **SIEMPRE** treat "update" as a version bump within the same `routeId` and "add" as a new `routeId`; keep both
  explicit and documented.
- **SIEMPRE** seed the re-keyed adapter tables with the existing per-capability values so no-selection behavior is
  unchanged, and verify with a same-output canary before adding any new route.
- **SIEMPRE** keep the live image default on Seedream absent an explicit selection; move it only by human decision
  via `recommendedDefault`.

## Open questions (deliberately not decided here)

- **Selector shape (Q1 → TASK-1552).** Whether the UI surfaces explicit model selection or "Globe picks the best
  by encargo with model as secondary" is the selector's decision. This ADR exposes `recommendedDefault` so either
  UX works with no backend change; it does not decide the UX.
- **OpenAI production lane.** GPT Image 2 / 1.5 routes can be added and Lab-canaried now, but their production
  promotion is blocked until the OpenAI official verifier exists (`governed-production-composition.ts:71`). Whether
  that verifier ships inside TASK-1553 or as a follow-up is left to execution scope; the Lab path is unaffected.
- **Video/audio multi-model.** The design is extensible to video and audio by the same route-keyed resolution;
  shipping there is a follow-up.
- **Public `model.version` ↔ executable `modelVersion` coupling.** The two strings differ by design and are
  coordinated by convention (both bump on update). Whether to add a lint asserting the pairing is a hardening
  follow-up, not a blocker.

## Roadmap by slices (mirrors TASK-1553)

1. **This ADR** — indexed as ADR-013 in `DECISIONS_INDEX.md`.
2. **Route-based resolution in the adapters** (`openai-adapter.ts`, `vertex-adapter.ts`, `fal-adapter.ts`) — re-key
   routing tables to `routeId`, capability fallback for route-absent, hard-fail on declared-but-unknown route. Seed
   with current values (no regression). Foundation: Slices 3/4 cannot ship before this or a second same-provider
   model denies with `route_binding_missing`.
3. **Multi-route catalog + per-route composite policy** — add Nano Banana Pro / GPT Image 2 / GPT Image 1.5 routes
   (Nano Banana 2 declared but allowlist-gated); composite image policy becomes a per-route resolver.
4. **Bindings + endpoint allowlist + per-model promotion** — append bindings, add endpoint entries (`region:'global'`
   for Vertex image), promote per route via ADR-009/010.
5. **Evidence + canary per model + functional doc + manual** — Lab canary per new route with MIME/hash; the
   multi-model catalog functional doc + the "add a model" runbook.
