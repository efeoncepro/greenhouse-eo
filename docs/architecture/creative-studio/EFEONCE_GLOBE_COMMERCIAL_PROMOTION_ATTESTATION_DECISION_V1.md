# Efeonce Globe — Commercial Promotion via Rights Attestation Decision V1

- Decision: ADR-010
- Status: Accepted; implementation and rollout gated (TASK-1535)
- Date: 2026-07-24
- Owners: Efeonce Globe platform, creative operations, security & commercial
- Implements through: `TASK-1535` (under EPIC-028)
- Supersedes the manual one-route-at-a-time human-signed promotion path for scale (does NOT relax it — see §Decision)
- Related: ADR-009 (`EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md`),
  SPEC-002/003 (`EFEONCE_GLOBE_MODEL_LAB_V1.md`, `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`),
  SPEC-004 (`EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`),
  ADR-007 (`EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`),
  `EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`, `EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`

## Context

Efeonce Globe is now a **commercial product**, not an internal lab. The operating need is that the Efeonce team —
and clients through them — can use a broad set of frontier models (the seven pending Producer routes plus new
models: Google Imagen and Gemini 2.5 Flash Image "Nano Banana" via Vertex, OpenAI GPT Image, commercially-licensed
Fal-hosted models), and that promoting a model into commercial availability does **not** require a human to sign a
readiness review per route × workspace.

The governed promotion path today (ADR-009 / TASK-1527) is correct but does not scale to breadth. Grounded in the
code:

- Model readiness has **exactly two** human chokepoints: `recordModelReadinessReview` and `proposeModelRoute` each
  call `requireHuman(c)` — a service principal is rejected (`packages/domain/src/model-readiness.ts:139, :85, :98`;
  `principalType` is branded server context from `deriveTrustedContext`, never caller JSON —
  `packages/domain/src/index.ts:131-135`). Everything downstream — `promote`, `activate`, `canary-attest` — is
  **already** service-runnable through three disjoint promotion workload classes with a hard anti-overlap rule
  (`apps/studio-web/src/app.ts:3243-3279`) and maker≠reviewer≠promoter enforced on the review evidence
  (`packages/domain/src/production-promotion-operation.ts:464-466`).
- Rights posture is **not** a closed enum. `GeneratedRightsPolicyV1` carries `appliesTo`, a free-form
  `effectiveRestrictions: string[]`, and — load-bearing — `providerTermsRef` (scrubbed URL) + `providerTermsDigest`
  (`sha256:…`) (`packages/contracts/src/asset-governance.ts:72-91`). "Internal-evaluation-only" /
  "no-client-delivery" are restriction **strings anchored to verified license evidence**, not platform opinion.
- There is **no per-workspace policy object** anywhere. Per-workspace differentiation is achieved only by which
  `workspaceBindings` string a principal is granted plus global env flags. The one opaque per-workspace datum is
  `tenancy_workspaces.projection` jsonb (`packages/database/migrations/0013_*.sql`).

The problem the user is actually hitting is **not** "internal vs commercial" and **not** "the ceremony is too
strict". It is that the human signature sits on the **wrong unit**: route × workspace, which is O(routes ×
workspaces). Signing ten times is the symptom of putting a per-model legal fact behind a per-route gate.

The hard external constraint that bounds any solution: **Globe cannot grant a client the right to use a model's
output commercially if the model's provider license does not grant it.** That is the provider's license, not
Efeonce conservatism; asserting otherwise transfers IP liability to Efeonce and its clients. So "commercial
promotion" is legitimate exactly for models whose license actually permits commercial + client-delivery use, and no
architecture may fabricate that grant.

## Decision

Globe splits the readiness signature into the two judgments it was conflating, and puts each where the human
judgment is **real**, removing it from the place where it was pure toil.

1. **Model Commercial Rights Attestation** — a new governed authority, `requireHuman`, recorded **once per model**,
   anchored to durable license evidence (`providerTermsRef` + `providerTermsDigest` + reviewer identity + the exact
   commercial grant the provider concedes: `commercial-use`, `client-delivery`, `sublicensable`, or their absence).
   This is the liability-bearing judgment. It is O(models) — in practice O(providers) for provider-uniform terms
   (one Vertex attestation covers Imagen + Nano Banana; one OpenAI attestation covers GPT Image; Fal is per-model) —
   and it is batchable. **This human signature is not removed; it is relocated to the one fact that genuinely needs
   a human: what the license grants.**

2. **Automated route-promotion lane** — a **distinct decision authority** (service principal, distinct from the
   attestor and from the existing promoter/checker classes) that, **given** a valid Tier-1 attestation for the model
   **and** a passing objective eval for the route **and** the target workspace ceiling, computes governed
   **eligibility** and **derives the rights policy from the attestation** (the posture is always exactly what the
   attested license grants — commercial → the license's commercial terms; internal-eval → internal restrictions).
   **No human keystroke per route × workspace.**

   > **Implementation discovery (2026-07-24), load-bearing correction.** The ADR-009 saga's `promoteProductionPromotion`
   > phase is **hardwired to a signed HUMAN model-readiness review** (`resolveReview` + `validateReview` enforcing
   > maker≠reviewer≠promoter over a human review). That human review **is** the vendible separation-of-duties control
   > for the human-craft regime. Therefore the automated commercial regime **must NOT route through the ADR-009 saga
   > and must NOT relax it** — doing either would weaken exactly the control being sold. The lane is a **separate
   > mechanism**: its eligibility engine (verified attestation + objective eval + workspace ceiling → derived rights
   > posture) is the piece that legitimately replaces per-route human signing, and the route-binding application uses
   > the governed routing/rights authorities directly under a dedicated, narrowly-scoped lane principal — never the
   > human saga, never the break-glass generic caller. The saga is preserved unchanged **precisely by not touching
   > it.**

3. **Per-workspace promotion policy** — a net-new, append-only policy carried in `tenancy_workspaces.projection`,
   declaring each workspace's promotion regime and, load-bearing, its **maximum rights posture**. The automated lane
   **fails closed** if a route's attested posture exceeds the target workspace's ceiling: an internal-eval-only route
   can **never** be promoted to a `client` workspace, because delivering internal-eval outputs to a client would
   violate the provider license. A `client` workspace accepts only routes whose attestation grants `client-delivery`.

Two safety valves make automating the promotion-time signature acceptable **without** weakening commercial
guarantees:

- **Promotion ≠ delivery.** Promoting a route makes it *available*; it does not auto-approve any output. Every
  client-bound artifact still passes the existing candidate → human-approval flow (outputs are candidates until
  human review — SPEC-002/003). The human craft/brand judgment stays exactly where it matters — the specific
  deliverable — and leaves the place where it was toil — route promotion.
- **The attestation is the SSOT; every promotion is a derivation.** The lane cannot invent a rights posture; it can
  only project the attested one. If no valid attestation exists, or it does not grant `client-delivery`, the
  client-workspace promotion is refused fail-closed — indistinguishable from "route unknown", never a softer signal.

### What is explicitly NOT changed

- `recordModelReadinessReview` stays `requireHuman`. The Tier-1 attestation is a **new, narrower** human command
  (license grant, not craft), not a relaxation of the existing review. The two coexist.
- Rights policies still mirror the provider's real license. No restriction is dropped that the license imposes.
- The ADR-009 saga, its 13 states, its durable persistence, its recovery-is-service-only rule, and the disjoint
  promoter/checker workload classes are left **completely untouched**. The lane does NOT route through the saga's
  human-review-gated promote (see the Implementation discovery above); it is a distinct mechanism, so the saga's
  separation-of-duties control is preserved precisely by not modifying it. This ADR adds authorities; it does not
  rewrite or reuse the saga.
- `GLOBE_CONTROL_PLANE_BREAK_GLASS` semantics are unchanged. Direct `asset-rights-policy.manage` remains break-glass
  once the saga is enabled; the lane publishes rights through the governed derivation, not the break-glass grant.

## Alternatives rejected

- **Relax rights policies to blanket-commercial** — rejected. Fabricates commercial rights the provider did not
  grant; transfers IP liability to Efeonce and its clients. The user asked for this framing ("relajar las
  políticas"); the honest answer is to relocate the human judgment, not to fake the grant.
- **Let a service principal sign `review.record`** — rejected. Destroys the separation-of-duties control that is the
  vendible guarantee. The lane never signs the human judgment; it consumes an already-signed attestation.
- **Lower ceremony per-workspace ("internal workspace = lighter saga")** — rejected as the primary framing. It fixes
  the symptom (fewer signatures for internal) but leaves the wrong unit (route × workspace) and does nothing for the
  commercial goal. Per-workspace policy survives here only as a **ceiling** (safety), not as a ceremony discount.
- **Keep signing per route, just faster UI** — rejected. O(routes × workspaces) toil is the defect; a faster form is
  a patch on the wrong primitive.
- **One combined super-principal that attests + promotes** — rejected. Collapses maker/reviewer/promoter; the
  anti-overlap rule (`app.ts:3254`) exists precisely to forbid it.

## 4-pillar scoring

| Pillar | How this design satisfies it |
|---|---|
| **Safety** | Human judgment retained on the two facts that carry liability: the license grant (once per model, evidence-anchored) and the specific client deliverable (candidate → approval). The lane cannot fabricate a posture (SSOT derivation) and fails closed if a route's attested posture exceeds the target workspace ceiling. Attestor principalId ≠ lane principalId preserves maker≠reviewer≠promoter. Break-glass unchanged. |
| **Robustness** | Rights posture is derived, never hand-set — no drift between "what we told the client" and "what the license says". Attestation is immutable per `(modelId, termsDigest)`; a terms change is a new attestation, never an edit. The lane reuses the ADR-009 saga's exact-readback + deterministic idempotency, so a partial promotion is recoverable, not silently wrong. Per-workspace ceiling is a fail-closed CHECK, not a convention. |
| **Resilience** | The lane is a service principal on the existing durable saga with its recovery worker (service-only, fence-guarded) untouched. A missing/expired attestation degrades to a refused promotion with an honest error, never a promoted-without-rights route. Objective-eval gating means a model that regressed does not auto-promote. |
| **Scalability** | Human signatures drop from O(routes × workspaces) to O(models), effectively O(providers) for uniform terms — 3–4 attestations cover the whole target fleet. Adding a route to an already-attested model is fully mechanical (attestation lookup + eval + lane). Adding a new commercial workspace inherits every already-attested route with no new signature. |

## Dependencies & Impact

- **Depends on:** ADR-009 saga + durable persistence (live), the Evaluation Harness objective checks (SPEC-003),
  `generated_rights_policies` workspace-scoping (migration 0026), the persisted tenancy projection (migration 0013).
- **Impacts / owns (net-new):** a `model_commercial_rights_attestations` table + capability
  `globe.model-rights.attest` (human) and `globe.model-rights.read`; an automated-lane service principal + capability
  `globe.production-promotion.auto-lane` (or reuse of promoter/checker with an added attestation-citation gate — to
  be decided in TASK-1535 slice 1); a per-workspace promotion-policy shape inside `tenancy_workspaces.projection`;
  the derivation from attestation → `GeneratedRightsPolicyV1.effectiveRestrictions`.
- **Does not touch:** the Model Lab spend fence, the Producer catalog naming invariants, the asset-governance
  worker, the front door.

## Hard rules (NUNCA / SIEMPRE)

- **NUNCA** promote a route to a `client`/commercial workspace whose model lacks a valid Tier-1 attestation granting
  `client-delivery`. The refusal is fail-closed and indistinguishable from "route unknown".
- **NUNCA** let the automated lane derive a rights posture more permissive than the attested license grant. The
  attestation is the SSOT; the policy is a projection of it, never an independent decision.
- **NUNCA** have a service principal call `recordModelReadinessReview` or `proposeModelRoute` reviewer-side. The lane
  consumes a signed attestation; it never signs the human judgment.
- **NUNCA** edit a `model_commercial_rights_attestations` row. A license change is a new attestation keyed by a new
  `termsDigest`; supersede, never overwrite (append-only, mirrors the rights-policy immutability rule).
- **NUNCA** collapse attestor and lane into one principal, or grant the lane reviewer authority — the anti-overlap
  rule (`app.ts:3254`) forbids it and the maker≠reviewer≠promoter evidence check must keep holding.
- **NUNCA** treat "route promoted commercial" as "output approved for a client". Promotion makes a route available;
  each deliverable still passes candidate → human approval.
- **SIEMPRE** anchor a Tier-1 attestation to durable evidence: `providerTermsRef` (scrubbed source URL) +
  `providerTermsDigest` (`sha256:…`) + reviewer principalId, exactly like the rights-policy evidence contract.
- **SIEMPRE** derive the per-workspace ceiling from the workspace `kind` fail-closed (a `client` workspace defaults
  to requiring `client-delivery`; unknown/misconfigured → most restrictive).
- **SIEMPRE** run the objective eval as a gate before the lane promotes; a route with no passing objective eval is
  not auto-promotable.

## Open questions (deliberately not decided here)

- Whether the automated lane is a **new** workload class (`production-promotion-auto-lane`) or the existing
  promoter/checker classes gain an "attestation citation required" gate. Decided in TASK-1535 slice 1 after reading
  the exact grant wiring; the anti-overlap invariant is the constraint either way.
- The exact shape of the per-workspace promotion policy inside `tenancy_workspaces.projection` (embedded jsonb vs a
  dedicated column/table). Leaning jsonb to avoid a migration on the hot tenancy path, but the ceiling field is
  load-bearing enough it may deserve a typed column + CHECK.
- Whether Tier-1 attestation should itself require **two** distinct humans (maker + reviewer) for commercial grants,
  mirroring the saga's maker≠reviewer. Defer to TASK-1535; the platform already has the primitive, and for
  client-delivery liability the stronger control may be worth the one-time cost.
- Provider terms half-life / re-attestation cadence (licenses change). Out of scope for V1; the immutable-per-digest
  design makes re-attestation a clean append, and a drift signal can watch `providerTermsRef` later.

## Roadmap by slices (implemented in TASK-1535)

1. **Attestation authority** — contract + capability `globe.model-rights.attest` (`requireHuman`) / `.read`, domain
   command + immutable store + migration, evidence-anchored (`termsRef` + `termsDigest` + reviewer). Grant the human
   capability to the internal reviewer; deny service principals.
2. **Rights derivation** — `attestation → effectiveRestrictions[]` projection, workspace-ceiling-aware; wire it to
   the governed rights publish so the lane never touches break-glass.
3. **Per-workspace promotion policy** — the ceiling in `tenancy_workspaces.projection`, fail-closed default by
   `kind`; reader + the lane's scope check.
4. **Automated lane principal** — the service class (per slice-1 decision), gated on (valid attestation + passing
   eval + within workspace ceiling), driving the ADR-009 saga phases with deterministic idempotency and exact
   readback.
5. **Fleet enablement** — assemble real terms evidence (Vertex, OpenAI, commercial Fal models), build golden briefs
   for the pending routes + new frontier models, run the lane end to end (one billable canary per route class),
   internal-only first then commercial workspaces once the CEO signs the O(providers) attestations.
6. **Docs closure** — index ADR-010 + SPEC-011, update the greenhouse-globe skill, functional + manual docs, handoff.
