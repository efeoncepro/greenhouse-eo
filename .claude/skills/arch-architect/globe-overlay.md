---
name: arch-architect-globe-overlay
description: Efeonce Globe-specific pinned architecture decisions that extend the Greenhouse arch-architect overlay. Load whenever an architecture decision touches Globe (repo `efeonce-globe`, EPIC-028) — API Contract Spine, route creative contract (ADR-022), provider adapters, spend fence / governed run lifecycle, eval harness, prompt compilation, or the Globe↔Greenhouse boundary.
type: overlay
extends: arch-architect-greenhouse-overlay
user-invocable: false
---

# arch-architect — Efeonce Globe Overlay

**Load order:** global `arch-architect/SKILL.md` → Greenhouse overlay (`.claude/skills/arch-architect/SKILL.md`) → **this file** → then apply. Where this file conflicts with the Greenhouse overlay, **this file wins for Globe decisions only**; Greenhouse-internal decisions are unaffected.

## Why this overlay exists

Globe is **not a Greenhouse module and not an internal lab**. It is a sibling **commercial** product of Efeonce (ADR-010: *"now a commercial product, not an internal lab"*), governed by Greenhouse under **EPIC-028**, with its own runtime: a **Node 24 native-TS monorepo** (`node >=24 <25`, pnpm `10.32.1`, no app framework, no heavy bundler), Cloud Run services (`studio-web`, IAM-private `globe-api-internal`, `globe-producer-worker` job) and **its own Cloud SQL** (`globe-pg`, keyless connector + IAM DB auth — SPEC-007). Its **rollout stage** today is internal-only + `internal_smoke` runtime + external Production gated by `TASK-1480`. **Stage ≠ nature:** never under-dimension infra/UX/quality "because it's internal."

The Greenhouse overlay pins Postgres+BigQuery, outbox→ops-worker, the canonical 360 and `src/lib/**` primitives. **None of that applies inside Globe.** Globe has **21 ADRs** (ADR-001…ADR-022, with 021 unassigned) and **12 SPECs** of its own precedent living in `docs/architecture/creative-studio/`, and most Globe architecture questions already have an answer there. This overlay pins those answers so the global skill's "boring tech preference" lands on **Globe's** boring tech.

**Documentation boundary (hard):** Globe's governing documentation lives in **Greenhouse** (`docs/architecture/creative-studio/`), **never** in `efeonce-globe/docs/**` (TASK-1492). Greenhouse owns architecture, ADRs, runbooks, functional docs, task lifecycle, handoff and closure. Globe owns code, data, infrastructure, creative execution and technical evidence.

## Canonical authoritative sources (read the relevant ones before proposing)

- **`docs/architecture/creative-studio/README.md`** — index + "where each doc layer lives".
- **`docs/architecture/creative-studio/DECISIONS_INDEX.md`** — the ~22 Globe ADRs with their real status. Read this before claiming something is undecided.
- **`docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`** — the model-fleet ledger. **Read FIRST** before assuming a model/provider is not integrated.
- `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001, TASK-1481) — the spine.
- `PLATFORM_FOUNDATION_V1.md` — the numbered platform invariants (10 = Full API Parity at birth).
- `EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md` (**ADR-022** + Deltas (b) and (c), 2026-08-02) — the newest and most load-bearing.
- `EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md` (ADR-013) + `EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` (ADR-003 naming/boundary).
- `EFEONCE_GLOBE_MODEL_LAB_V1.md` (spend fence, kill switch, ADR-002 cross-model edit) + `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md` (SPEC-003, TASK-1458).
- `EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md` (ADR-010) + `EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md` (ADR-009).
- `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md` (SPEC-007), `EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md` (ADR-007), `EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md` (ADR-006), `EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` (ADR-015).
- Client payload (UI) — `EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` (ADR-014), `..._STYLING_ENGINE_...` (ADR-016), `..._COLOR_SCHEME_...` (ADR-017), `..._TYPOGRAPHY_CONTRACT_...`, `GLOBE_CLIENT_MOTION_CONTRACT_V1.md`. This overlay does **not** re-derive them; it defers to those + `greenhouse-ux`/`modern-ui`.
- Bug classes: `docs/issues/open/ISSUE-127-*.md`, `docs/issues/open/ISSUE-135-*.md`.
- Governing task in flight: `docs/tasks/in-progress/TASK-1633-*.md`.

---

## Pinned decisions (Globe)

### G1. Globe is a peer platform; the boundary is a hard line, not a preference

Greenhouse owns identity, **desired** access, governance, and the `TASK-###`/EPIC control plane. Globe owns code, runtime, data, creative evidence. **Never share** a database, a session, a bucket, a provider secret or an admin role between the two. "Make it a Greenhouse module" is not on the table — it is already decided.

Greenhouse *administers* Globe through a governed lane (**ADR-015**): durable `propose → confirm` plan, server-side signature/mutation, append-only evidence; workloads, service principals and API keys **never confirm**. Tenancy flows one way as a **projection** (**ADR-006**): workspace-complete reconciliation (`members[]`), omitted members suspended fail-closed, no parallel identity or org role model in Globe.

### G2. The API Contract Spine — trusted context vs untrusted payload

`SPEC-001` (TASK-1481) is the shape of every Globe capability. Non-negotiable:

- **The trust boundary lives on the server, not in the payload.** Envelopes (`CommandRequestEnvelopeV1`/`ReaderRequestEnvelopeV1`) carry business data and at most an **untrusted** `workspaceSelection`. Authority = actor + workspace + capabilities, derived server-side from `AuthenticatedPrincipalV1` via `deriveTrustedContext`. `TrustedCommandContextV1` is **branded** (`__globeTrusted`, server-only) so a payload cannot structurally become authority.
- **Coverage has exactly three states** — `available | policy-blocked | not-applicable`. `missing` is **irrepresentable**; omitting one of the 8 `GLOBE_SURFACES` is a **compile error**. A disabled surface is `policy-blocked` (honest), never a silent hole. The manifest is **derived from the registry**, never hardcoded.
- **Canonical closed error vocabulary** (`GlobeApiErrorCode`), with `policy_blocked ≠ access_denied ≠ not_found`, one shared mapping across every transport, and `retryable` on the wire so a UI/agent renders an honest state without a useless retry. **Policy precedes capability** in `#authorize`; an `available` with no handler fails closed as `policy_blocked`.
- **`CapabilityRegistry` is the single transport-neutral home.** A capability is written once and dispatched identically from HTTP/SDK/MCP/CLI/worker/harness. The SDK is a *client* of the HTTP surface, never a second SSOT. Today the executable runtime gate is `coverage.http`; the other seven are declarative metadata until their own transport exists.
- **Capabilities are semantic** (`globe.lab.experiment.run`), never `run_endpoint(endpoint, arbitrary_json)`.

Extension recipe: schemas in `packages/contracts` → `registry.registerCommand` → flip coverage `policy-blocked → available` → handler via `provider-contract`/`creative-runner` → typed SDK method → grant → manifest-driven conformance. **Extending the registry never edits the transport or the harness.**

### G3. Full API Parity is a birth condition, not a rollout step

Platform-foundation invariant 10: a capability is born owning its versioned schemas, a canonical command/reader, a trusted context, a private API/SDK path and conformance evidence. There is no "UI first, contract later" in Globe. This is the same principle as Greenhouse decision #16, applied at the capability level.

### G4. Route-based model resolution: the route is the unit, the slug is forbidden

**ADR-013.** `estimate.model` is a function of the exact `routeId`, so N models per provider coexist. A declared route with no adapter entry **fails closed**. The adapter table owns executable identity + slug; the binding owns promotion state + a derived snapshot; the endpoint allowlist owns the production wire; `producer.route_binding_model_mismatch` watches the equality chain. **Update = version bump inside one route; add = a new route.** Lineage is immutable.

**ADR-003** fixes the naming: the real model identity (name + version) is **public/client-facing** (a legible quality signal); the internal `house` taxonomy is operator-only behind a dedicated capability; the **provider wire slug, vendor cost and margin are forbidden on every surface**, with a drift guard that aborts catalog load if a slug leaks. **`actualRoute` is a fidelity contract, never a raw provider slug.**

### G5. ADR-022 — the creative contract is versioned **per route** and self-contained

Every executable route revision publishes a browser-safe, **self-contained** `RouteCreativeContractV1` separating **five axes**:

1. `operation` — product intent (`create | edit | extend | upscale`).
2. `inputSlots` — assets typed by **semantic role**, cardinality, accepted media, order.
3. `inputCombinations` — valid slot sets, including which is the default.
4. `creativeControls` — supported controls + mechanism (`native-parameter | prompt-semantic | reference-conditioned | preprocessed | postprocessed | unsupported`) + `valueShape`.
5. `outputContract` — modality and real output characteristics (including embedded audio).

**The descriptor lives inside the route revision.** A shared catalog may define the *vocabulary*, but it is never a mutable runtime reference that retroactively alters a promoted route — otherwise a historical snapshot changes meaning behind your back. The server-side compiler validates operation/slots/controls/output **before the estimate and before the spend**; adapters are the only translators to provider payloads. The canonical fingerprint covers route revision, operation, ordered slots with roles, controls and output.

Product consequences that are architecture, not UI taste: the **prompt is a primary input and never disappears**; **changing the operation never silently substitutes the model**; references/frames/source/motion-source/audio are **slots of the request, not names of visual modes**; the UI derives availability, caps, media and copy **from the published descriptor** — never a matrix keyed by model or provider name.

**Output shape is NOT a creative control.** `duration`, `aspect-ratio` and `resolution` belong to `RouteConstraintsV1` + `OutputShapeV1` (already fail-closed per route). Declaring them again as controls was duplicated SSOT *inside the same contract* and was withdrawn (Delta (b), catalog `1.6.0 → 1.7.0`).

### G6. Delta (b) — the brief **asks**, the contract **declares**. One semantic-direction channel.

The most transferable shape decision of ADR-022:

- **`creativeControls` declares support and NEVER transports values.** It gains `valueShape` (closed enum · bounded free text · numeric with range) — without it, fail-closed pre-spend cannot reach the control axis at all.
- **The value travels on the existing `prompt XOR structuredBrief` channel.** Controls the brief lacked (`camera`, `lens`, `motion`, `timing`, `audio-direction`, `negative-prompt`) become **new brief ingredients** — additive, inheriting the mutual-exclusion guard with zero new code, and inheriting per-ingredient weight, which a control needs and a support descriptor does not have.
- **Why not a values field on the intent:** Globe already enforces *one* semantic-direction channel (`producer_prompt_contract_invalid` rejects `prompt` + `structuredBrief` together). A third channel would **bypass that guard sideways**: the request would become `(prompt XOR structuredBrief) + controls`, and nothing would stop `prompt: "warm sunset"` alongside `controls.lighting: "high key"`. **No error would exist to observe — two directions would compile into one prompt and one would win by precedence.**

> **The generalizable rule: when a new axis overlaps an existing vocabulary, the failure mode is not a detectable conflict — it is silent precedence.** Extend the rule already running in production; never invert it. And an order of evaluation must never be the only place a rule is written (same family as the lineage spread fixed in `b062d6f`: verified fields must win over caller-declared ones, so the spread goes first).

Method note worth stealing: the decision was **not** settled by legacy cost. Production was read (0 saved recipes, 144 prompt-history entries) and the initial hypothesis was **false**; the decision stood on the invariant, not the migration bill. Say so out loud when it happens.

### G7. Delta (c) — the effective prompt is compiled **per route**, behind the adapter

ADR-022 says *"adapters are the only ones that translate intent into provider payloads."* The text axis violated it: `compileStructuredBrief` is a **global** function running in `domain`, **before** the adapter, and the injecting port's signature proves it structurally cannot know the route (`structuredPrompts.compile(raw)` — no route argument). That is the exact defect ADR-022 fixes on the input axis, left intact on **the one axis every route consumes**.

Decided:

1. The neutral brief stays the **SSOT of the request** (ingredients, weights, roles, no vendor dialect). Delta (b) is untouched.
2. **Text compilation moves to the adapter and is versioned per route**; the port becomes `compile(raw, routeContract)` and the default implementation **preserves current output**, so no route changes on migration.
3. **The prompt compiler has its own revision and enters the fingerprint** — two different texts for one brief are two different requests and cannot share an approval.
4. **Weight orders and structures; it is never printed.**
5. **Slot role informs the compiled text.** Three `style` references produce different text from three `subject` references, even though the image channel is identical.
6. **`native-parameter` wins whenever it exists**, and the mechanism per control is declared **per route with evidence from the provider's official contract**, never inherited from a default. Prompt is the last resort, not the first.

*Not decided, deliberately:* which compilation dialect is best per route. That is measured with the Evaluation Harness, not argued.

### G8. Provider boundary — one adapter per vendor; capability→model routing lives **inside** the adapter

A `CreativeProviderAdapter` is minted **per vendor** behind `creative-runner`: `VertexCreativeAdapter` (Google-native, **keyless** via ADC/WIF) and `FalCreativeAdapter` (non-Google, queue API), with `CompositeProviderAdapter` fanning a capability across adapters by `supports()` + provider policy. Rules:

- **Capability→model routing lives inside the adapter, never in domain policy.** A template/agent selects a stable *semantic* capability; the adapter resolves the concrete model and the vendor quirk.
- **Capabilities are verified against live provider accounts, not marketing claims.**
- **Secrets follow the sibling-platform line:** keyless for Google-native (Globe's own ADC/WIF), keyed-with-its-own-secret for everything else. **Never a secret shared between Globe and Greenhouse.**
- The public catalog stays slug-free (G4); provider IDs, effective prompts and payloads never cross into the browser-safe projection.

### G9. Governed run lifecycle + spend fence — nothing fails **after** the money

- **Double cap:** each run cannot exceed its `hardCapCredits`; a workspace cannot exceed `dailyCapCredits` across runs in a UTC day. `estimate > hardCap` is checked **before** `fence.reserve` — a second defensive barrier even if the fence is misconfigured.
- **Kill switch is fail-closed and default OFF** (`GLOBE_LAB_ENABLED`), asserted at the head of every handler and reader, surfacing as `policy_blocked` (403, `retryable: false`).
- **Reserve → settle | release, with an honest distinction:** a runner that *throws* (infrastructure) **releases** and records no attempt; a runner that returns `outcome: 'failed'` (the provider failed cleanly) **settles at real cost and records the manifest** — there was provider work with evidence, even without a candidate.
- **Every deterministic rejection dies before the reservation.** This is the whole reason the ADR-022 compiler validates pre-spend.
- **The outbox has a retry ceiling by error class**, not one global number (ISSUE-135): `terminal` 1 · `unknown` 3 · `transient` 25 · `waiting` 240. The `waiting` class exists so the fix is not a blackout: `completion_checkpoint_missing` is *normal waiting for an in-flight run*, counted by the same counter. A terminal close reports as `applied`, not `rescheduled`.

### G10. Promotion is a gate separate from execution, and the evaluation harness never elects a creative winner

- **The Evaluation Harness (SPEC-003, `globe.lab.evaluation.run`) is framework #10 as a Globe primitive.** It **consumes** the Lab capability through an exported domain helper (`runModelLabExperiment`) — never re-dispatching through the registry from inside a handler, never duplicating the logic. Golden briefs + rubrics are **versioned data through one engine** (no `switch` per fixture). `objectiveChecks` (automatic, deterministic) stay separate from `humanCriteria` (declared, never auto-scored); the verdict is only `objective_fail | objective_pass_pending_human` — never a creative "passed", never "model X is globally better". Reports are versioned, workspace-scoped, with limitations declared.
- **Promoting a route to production is a gate SEPARATE from running it in the Lab**, and its evidence is an evaluation report per fidelity contract.
- **ADR-010**: human judgment sits on the two facts carrying liability — a **Model Commercial Rights Attestation** recorded **once per model**, anchored to durable license evidence — and an automated promotion lane **derives** the rights posture from that attestation (never fabricates it). Two safety valves: **promotion ≠ delivery** (a promoted route is *available*, not auto-approved; every client artifact still passes candidate → human approval), and **the attestation is SSOT, every promotion a derivation**. A per-workspace promotion ceiling is fail-closed by workspace `kind`: an internal-eval-only route can **never** be promoted to a `client` workspace.
- The recommendation matrix (cost/latency/objective) **informs a human; it never promotes a route**.

---

## The two canonized Globe bug classes

These are not incidents to read about; they are **procedure steps** to execute. Both were canonized because knowing the rule demonstrably did not apply it.

### B1. ISSUE-127 — a sanitization without an observability counterpart does not protect information, it **destroys** it

Every collapsed code existed for a legitimate reason (don't leak balances, policy, provider prose, credential detail). The defect was applying the sanitization **without leaving a server-side trace**.

> **Rule: every canonical code that collapses more than one actionable cause is born with its server-side reason, in the SAME commit.** The reason's payload carries the **name of the control** — never `message`, never `stack`, never the upstream body, never anything derived from the payload (the ban on leaking internal detail applies to logs exactly as it applies to the client).

**11 appearances.** Two facts make this the rule and not a war story:

- The **ninth** was written the same day, by the same agent, in the same session that documented the previous eight.
- The **tenth** happened where `TASK-1633` had **already written the five correct names in its spec** — all five with zero occurrences in Globe. Design named the causes and the implementation collapsed them anyway. **Writing it in the spec does not apply it either.**
- The **eleventh** was inside the fix for the bug class itself (a `catch` mapping the new named reason back to `badRequest`) — and was the first caught *before* merging.

Corollaries earned in production:
- **A default bucket covering 17 sites is not a named reason — it is an invented one.** A wrong label misdirects, which is worse than no label (`endpoint_url_not_permitted` sent the author to read the wrong config; the twelve real causes were body-snapshot checks).
- **Separate by remedy, not by proximity.** Media type and MIME are two codes because one asks for a different asset and the other asks you to convert the file you have.
- **When the n-th fix uncovers layer n+1, stop deploying and read.** Layers 1–4 cost one deploy each; layer 5 — the bug that explained all four — took thirty lines of reading.
- **When a legitimate control rejects a legitimate case, the defect is in the control.** `"Key visual"` (the team's art-direction term) was read as a credential. The fix went to the control, not to the prompt: changing the prompt would have unblocked the canary by **hiding** the bug.

### B2. ISSUE-135 — a ceiling that works **hides** the defect it contains

A run sat **695 deliveries** (705 by the time it was cancelled) retrying the same deterministic error for three days: no attempt ceiling, no dead letter, no signal. In the UI it looked like a piece "generating" forever. The terminal path in the store **already existed and was complete** — nobody ever passed `terminal: true`. No new machinery was needed; a decision about *when* was.

> **Rule: every deterministic rejection code is classified in the retry policy in the same commit that introduces it.** Admission criterion, literal: *if two deliveries an hour apart give the same result without anyone touching anything, it goes in `terminal`.*

**Why this needs a birth rule and not just a list:** once the ceiling existed, the newly-introduced contract codes fell to `unknown` (cap 3) instead of `terminal` (cap 1). There were no 705 deliveries — three retries attract nobody's attention. **The safety net did its job and that is exactly how it hid the classification defect.**

And the coupling with B1: **a code with no named reason cannot be classified either**, because nine causes share one token. Opening the reasons and classifying them is **one job, not two**.

What made it stop recurring is **mechanical, not disciplinary**: `production-route-failure-classification.test.ts` breaks the build if a new reason is born unclassified, and checks the catch-alls in the opposite direction (if they stop being catch-alls, their entry is now lying). Proved red in both directions. Ten appearances of B1 proved that remembering does not work; what works is that the build won't let you.

---

## Two mechanical rules that fall out of B1/B2

### R1. An enumerable vocabulary is an array, not a union type

**A TS union type does not survive compilation.** If another subsystem must *cover* a vocabulary — a retry policy, a guard, a conformance test — a union gives it nothing to iterate. Declare it as `as const` array + `typeof X[number]`, and **prove the coverage in a test**.

Verified live in Globe: `PRODUCTION_ROUTE_DEPENDENCY_REASONS` (`apps/creative-runner/src/production-route-compiler.ts`, 32 reasons), `ROUTE_CREATIVE_CONTROLS` (`packages/contracts/src/producer-catalog.ts`), `BRIEF_INGREDIENT_KINDS` (`packages/contracts/src/structured-briefs.ts`). Both contract vocabularies were converted **from union to array** precisely because the classification slice needed to enumerate them.

Coverage tests earn their keep in **both** directions: a new value born unclassified breaks the build, **and** a declared exception that stops being exceptional is caught lying. Also assert **uniqueness** — that is the defense against a future collapse, since two rows expecting the same code fail loudly.

### R2. A fixture that represents THE LIST is derived; a fixture that represents A USE CASE stays literal

The vocabulary was copied verbatim in **four** places, and each copy broke separately **in a different layer**: catalog guard (4 red tests), a **type** error in the runner (the cast lost its overlap), a vocabulary assertion in contracts, and an integration test of the compiler in `studio-web`. None of those is the system failing — **it is the same fact shouting four times, and that noise will hide a real regression when one shows up.**

So: control fixtures **derive** from the vocabulary. Ingredient fixtures stay literal **on purpose** — they are concrete use cases, not the list.

---

## How a generative model actually understands (load-bearing for any prompt/control decision)

Do not design a prompt, a control or a "cockpit" without this. It is the technical basis of ADR-022 Delta (c) and it constrains architecture, not just copy.

**There is no instruction hierarchy.** A diffusion model or a video transformer has **no `system` above `user`**. An encoder turns the text into conditioning embeddings that are cross-attended at every denoising step: **one flat sequence where everything competes in the same space.** Four consequences, each measured against the Globe runtime:

1. **Weights printed as text do not condition.** Emitting `Style [weight=0.820]: …` is read by the encoder **as text**. Real prompt weighting operates in the pipeline's embedding space (`(word:1.2)`, `guidance_scale`), which a closed API does not expose. The number burns tokens, pollutes the conditioning and does not deliver what it promises. **Weight must order and structure** — dominant material in the main clause, secondary subordinated — **and never be printed.**
2. **Negation in text tends to reinforce what it negates.** Stacks that handle it well use a **separate field** entering guidance with inverted sign. Measured: **no Globe adapter sends a native negative field** (zero `negative_prompt` occurrences in `apps/creative-runner/src`) while the catalog declared `negative-prompt: prompt-semantic` in a default that **13 of 17 routes inherit without per-route evidence**. Where no native field exists, the honest output is to **reformulate positively** (a craft transformation) or declare it `unsupported` — never promise it by inheritance.
3. **The slot's role dies in validation.** References enter through the image-conditioning channel; the model receives three images and **does not know** whether they are subject, style or storyboard unless the text says so. Globe validates the role rigorously and then never passes it to the prompt: information the user gave, the system knows, and the model never sees.
4. **Craft vocabulary works because it is in the corpus.** "Dolly in", "low angle", "golden hour", "35 mm" condition because training data carries production metadata. **An invented taxonomy does not.** Controls must land in the language of the trade, not in abstract enums.

Per modality: **audio** is where `native-parameter` is genuine (voice, rate, pitch are real parameters); **video** is the most sensitive to temporal order and to describing movement the way a director would; **image** is the most tolerant and gains the most from well-expressed weighted composition.

**Architectural corollary:** a per-control UI cockpit is the wrong shape. Models do not respond linearly to taxonomies; they respond to language. **The descriptor exists to know what to offer, what to validate and what to reject before spending — not to turn the composer into a cockpit.**

---

## Handoff with the `greenhouse-globe` skill (bidirectional)

- **This overlay decides the SHAPE** — reversibility / blast radius, the 4 pillars, SSOT and domain boundaries, the sibling-platform line, canonical primitive vs new entity, whether a capability needs a governed contract (Full API Parity by birth), where a value lives vs where support is declared, and what is measured vs what is decided.
- **`greenhouse-globe` fills the IMPLEMENTATION** — how to extend the spine, the build/toolchain (`pnpm check` / `pnpm build` in `efeonce-globe`, `node --test`, import-extension convention), trusted-context/dispatch mechanics, provider adapters, GCS/rights/C2PA, workers, Cloud SQL, keyless IaC and the commercial rollout runbook.

Flow: **decide the shape here → hand to `greenhouse-globe` → it hands back up if a new shape decision surfaces.** For client-payload (UI) decisions, defer to ADR-014/016/017 + the typography and motion contracts + `greenhouse-ux`/`modern-ui`; do not re-derive them here. (Codex mirrors this: `software-architect-2026` ↔ `greenhouse-globe` under `.codex/skills/`.)

Every Globe architecture decision still lands as an **ADR in `docs/architecture/creative-studio/`** with an entry in that directory's `DECISIONS_INDEX.md`, and its implementation as a `TASK-###` in Greenhouse. Never in `efeonce-globe/docs/**`.

---

## Hard rules (Globe-specific)

- **NUNCA** tratar a Globe como módulo de Greenhouse, lab interno o piloto — es producto comercial (ADR-010); su estadio de rollout no cambia su naturaleza ni autoriza bajar el estándar de infra/UX/calidad.
- **NUNCA** compartir base de datos, sesión, bucket, secreto de proveedor ni rol admin entre Globe y Greenhouse. Keyless para Google-native; secreto propio para el resto.
- **NUNCA** aceptar actor, capability o workspace de autoridad desde el body/headers, ni construir un `TrustedCommandContextV1` fuera de `deriveTrustedContext`.
- **NUNCA** declarar un `CapabilityDescriptorV1` con una superficie omitida ni representar `missing`; una superficie deshabilitada es `policy-blocked`.
- **NUNCA** confundir `policy_blocked` con `access_denied` o `not_found`; la política precede a la capability y un `available` sin handler falla cerrado.
- **NUNCA** exponer una capability `run_endpoint(endpoint, arbitrary_json)`: las capabilities son semánticas.
- **NUNCA** filtrar slug de proveedor, model ID, costo, margen, prompt efectivo o payload a una proyección browser-safe; `actualRoute` es contrato de fidelidad, jamás un slug.
- **NUNCA** resolver `capability → modelo` fuera del adapter, ni branchear por nombre de modelo/provider en dominio, compiler o UI.
- **NUNCA** dejar que un catálogo compartido sea referencia runtime mutable que altere retrospectivamente una ruta promovida: el descriptor vive **dentro** de la revisión de ruta.
- **NUNCA** transportar valores de dirección creativa en `creativeControls` (declara soporte + `valueShape`) ni abrir un tercer canal junto a `prompt XOR structuredBrief`.
- **NUNCA** declarar `duration`/`aspect-ratio`/`resolution` como controles creativos: su dueño es `RouteConstraintsV1` + `OutputShapeV1`.
- **NUNCA** compilar el prompt efectivo con un molde global ni en el browser; se compila por ruta, detrás del adapter, versionado y dentro del fingerprint. **El peso ordena; nunca se imprime.**
- **NUNCA** declarar el mecanismo de un control por herencia del default: se declara por ruta con evidencia del contrato oficial del proveedor.
- **NUNCA** degradar en silencio un control requerido: se rechaza antes del estimate, con razón nombrada del lado del servidor.
- **NUNCA** dejar que algo determinista falle **después** de la reserva; el fence reserva sólo lo que ya pasó la validación de contrato.
- **NUNCA** promover una ruta sin atestación de derechos vigente + eval objetiva aprobada, ni promover a un workspace `client` una ruta internal-eval-only; **promoción ≠ entrega**.
- **NUNCA** dejar que el harness elija un ganador creativo, ni auto-puntuar `humanCriteria`.
- **NUNCA** escribir un `catch` que sanitice sin escribir, en el MISMO commit, su línea de razón del lado del servidor (nombre del control; jamás `message`/`stack`/body upstream).
- **NUNCA** introducir un código de rechazo determinista sin clasificarlo en la política de reintentos en el MISMO commit.
- **NUNCA** declarar un vocabulario que otro subsistema debe cubrir como union type de TS; array `as const` + test de cobertura en ambas direcciones + aserción de unicidad.
- **NUNCA** copiar literal un vocabulario en fixtures que representan LA LISTA: se derivan.
- **NUNCA** crear documentación gobernante de Globe en `efeonce-globe/docs/**`.
- **SIEMPRE** leer `GLOBE_MODEL_FLEET_STATUS.md` antes de afirmar que un modelo/proveedor no está integrado.
- **SIEMPRE** separar por **remedio** al abrir razones: dos causas con la misma acción pueden compartir código; dos con acciones opuestas, nunca.
- **SIEMPRE** que un fix destape una capa nueva, dejar de desplegar y leer el camino completo.
- **SIEMPRE** verificar el **efecto** de una clave de idempotencia, no su presencia: que exista no prueba que el handler la honre.
- **SIEMPRE** declarar qué se decide y qué se **mide** (dialecto de prompt, ruta preferida) — el harness responde lo segundo.
