# Efeonce Globe — Model Route Cards and Cross-Agent Integration Skill

- Decision: ADR-023
- Status: Accepted — skill and evidence contract implemented; runtime integrations remain independently gated
- Date: 2026-08-04
- Owners: Greenhouse control plane, Efeonce Globe platform and Creative Operations
- Reversibility: two-way-but-slow
- Confidence: high
- Validated as of: 2026-08-04
- Implements through: `greenhouse-globe-model-fleet`, `TASK-1642` for the first FLUX 3 card
- Related: ADR-013, ADR-021, ADR-022, ADR-009, ADR-010, `TASK-1633`

## Context

Globe must add multiple frontier models without losing route identity, provider boundaries, completion behavior,
pricing evidence, rights, evaluation or promotion controls. A provider announcement is not an integration, and code
that exists in one adapter is not necessarily a route available to the Producer.

Codex and Claude also need the same method. A single giant skill would be easy to trigger but would become a stale
model encyclopedia and a second source of truth. A runtime catalog inside Greenhouse would be worse: Globe owns the
executable catalog, bindings, receipts, rights attestations and live availability.

FLUX 3 is the first concrete case. Fal exposes multiple standard, draft and enhance surfaces while its catalog and
OpenAPI observations use different namespaces. Black Forest Labs exposes a separate Early Access surface. Globe
must preserve these differences without presenting any of them as promoted runtime capability.

## Decision

Greenhouse adopts a shared `greenhouse-globe-model-fleet` skill and a versioned route-card contract.

### 1. The skill is the method, not the model inventory

The skill is mirrored byte-for-byte for Codex and Claude:

- `.codex/skills/greenhouse-globe-model-fleet/SKILL.md`
- `.claude/skills/greenhouse-globe-model-fleet/SKILL.md`

Its stable content is the workflow: exact route identity, primary evidence, contract compatibility, cable map,
pre-spend validation, provider seam, completion/output verification, rates, rights, evaluation, canary, promotion,
rollback and handoff. Its schema and deterministic validator are bundled with the skill. `pnpm skills:mirrors` checks
the two bundles byte-for-byte; `pnpm model-fleet:validate` checks the concrete cards.

The skill auto-invokes for model/provider/endpoint/capability/fleet work and remains manually invocable as
`$greenhouse-globe-model-fleet`. It never submits provider work, spends credits, mutates Globe, grants entitlements,
promotes routes or declares runtime availability.

### 2. Concrete cards live in Greenhouse architecture

Cards live under:

```text
docs/architecture/creative-studio/model-fleet/routes/
```

They are evidence-backed implementation maps, not a second runtime catalog. They may contain internal endpoint
identifiers needed to implement a route, but never browser payloads, provider credentials, cookies, raw bodies, signed
URLs, temporary follow-up URLs, vendor costs or margins.

Each card is exhaustive for the route identities it claims. It declares semantic capability, operation, inputs,
controls and value shapes, output contract, transport, completion, provider surface, evidence, blockers and every
cable:

```text
provider_supported → contract_declared → adapter_wired → transport_verified
→ output_verified → billing_verified → rights_verified → evaluated
→ canary_passed → promoted → available
```

Every cable has an explicit state. `unknown`, `unsupported`, `blocked` and `stale` are valid outcomes and must not be
omitted. A provider-supported route may therefore remain `adapter_wired=not_started` and `available=gated`.

### 3. Runtime authority remains in Globe

The sources of truth are assigned by concern:

| Concern | Authority |
|---|---|
| Live route availability | Globe reader `globe.producer.fleet.list` |
| Executable catalog, contracts and adapters | `efeonce-globe` packages/apps |
| Human fleet evidence and mutable rollout context | `GLOBE_MODEL_FLEET_STATUS.md` + Globe runtime handoff |
| Work, decisions and documentation | Greenhouse tasks, ADRs, architecture, skills and handoff |
| Provider support | Current primary provider evidence, revalidated before implementation |

Cards can reference the reader and ledger, but cannot override either. If the reader and human ledger diverge, the
reader wins and the divergence becomes a documentation/runtime finding.

### 4. The route, not the family, is the integration unit

Every implementation uses the exact identity:

```text
routeId + capability + provider + model + version/endpoint + region + completionDriver
```

Adding a semantically different provider mode, model lineage, tier or operation creates a new route card and usually a
new `routeId`. Updating a model within the same lineage creates a new version and evidence revision. No route inherits
adapter, rate, rights, evaluation, canary, binding or availability from a neighboring route.

The first FLUX 3 card is [`FLUX_3_VIDEO_ROUTE_CARD_V1.json`](model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json). It
records five standard Fal routes, five draft routes, `draft-enhance` and the BFL direct Early Access surface. All
routes are `gated`; the namespace conflict, draft cache, keyframe contract, pricing, output bytes and rights remain
explicit blockers where evidence is incomplete.

### 5. Provider and Globe capability are separate claims

The route card must distinguish:

```text
provider_supported ≠ contract_declared ≠ adapter_wired ≠ transport_verified
≠ output_verified ≠ billing_verified ≠ rights_verified ≠ evaluated
≠ canary_passed ≠ promoted ≠ available
```

Fal FLUX 3 is the first execution candidate because Globe already has a governed Fal seam. BFL remains a product/API
source and Early Access candidate; this decision does not authorize a direct BFL adapter, self-hosting or external
availability.

## Alternatives considered

### Put the full inventory in `greenhouse-globe`

Rejected. That skill already carries hard operational invariants and historical context. Adding a mutable model
encyclopedia would increase context cost and stale-claim risk while obscuring the route-specific workflow.

### Put cards inside the skill bundle

Rejected for concrete model data. It would make `references/routes/` a second catalog and require both agents to load or
mirror mutable inventory. The bundle contains only the stable contract/schema/validator; concrete cards live in
Greenhouse architecture.

### Put cards in Globe runtime or expose them through the browser catalog

Rejected. Globe owns the executable catalog and live reader. Browser-safe descriptors must not leak wire slugs,
provider costs, temporary URLs or internal endpoint details.

### Create one skill per model/provider

Rejected for the first layer. It duplicates the same route, evidence, completion, rights and promotion method and
does not scale beyond Flux. Provider-specific evidence may be added as route-card references later.

### Treat a provider catalog entry as availability

Rejected. A catalog entry proves at most that a provider advertises a surface. Globe still needs its own contract,
adapter, completion, output, rates, rights, evaluation, canary, binding and reader evidence.

## Consequences

### Benefits

- Codex and Claude receive one invocable workflow with drift detection.
- Capability completeness becomes inspectable by route and cable, not by marketing prose.
- Unknown and unsupported behavior is visible and blocks accidental promotion.
- FLUX 3 can evolve from discovery to Fal implementation without creating a BFL adapter or a second runtime catalog.
- Stale pricing, terms, OpenAPI and namespace claims trigger revalidation before implementation.

### Costs and risks

- A route card adds documentation maintenance and must be refreshed as provider APIs change.
- The validator is structural, not proof of provider behavior; controlled submits and runtime canaries remain necessary.
- The skill and card cannot guarantee that every future provider capability is implementable; unsupported or unknown
  claims must remain explicit until evidence and contracts exist.
- New route-card state or schema changes are shared agent contracts and require review plus mirror validation.

## Runtime contract

This decision creates no Globe runtime route, schema, provider binding, secret, migration, rate, entitlement or
promotion. It creates these Greenhouse-owned artifacts:

- `greenhouse-globe-model-fleet` mirrored skill bundles;
- `references/ROUTE_CARD_CONTRACT.md` and `route-card.schema.json`;
- `scripts/validate-route-cards.mjs`;
- `docs/architecture/creative-studio/model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json`;
- `pnpm model-fleet:validate` and the mirrored-skill manifest entry;
- router pointers in `AGENTS.md`, `CLAUDE.md` and `agent-context-router.json`.

The validator must remain side-effect free: it reads local JSON and skill bundles only, executes the versioned schema,
checks evidence freshness/references/identity, scans both mirrors for secret-like material and never calls Fal/BFL,
creates a request, updates a ledger or promotes a route. Its process tests cover a valid card, stale evidence,
incomplete identity, secret redaction and dangling references.

## Revisit when

Reopen this decision if any of the following becomes true:

- Globe needs the route-card schema at runtime rather than as Greenhouse evidence;
- a provider requires a separate, reusable policy/adapter skill with materially different lifecycle semantics;
- the live fleet reader and human ledger need a new ownership model;
- cards need immutable historical revisions, signatures or an external registry;
- Codex/Claude skill mirror constraints change;
- the route contract introduces a new semantic for timed keyframes, draft cache or completion that ADR-022 does not
  express.
