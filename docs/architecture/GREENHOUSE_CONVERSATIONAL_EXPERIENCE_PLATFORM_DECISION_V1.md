# GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1

## Status

Proposed

## Date

2026-06-12

## Owner

Nexa / UI Platform / API Platform

## Scope

- Nexa conversational runtime
- Nexa Chat
- Nexa Insights
- Knowledge UI
- Home/floating Nexa
- future embedded consumers in Finance, charts, Agency, Personas and Commercial
- MCP/provenance lane
- UI platform primitives and patterns
- access/capability boundaries for conversational surfaces

## Reversibility

Two-way-but-slow.

The architecture is still reversible before runtime adoption. Once multiple domains consume `surfaceContext`, changing the contract will require migration across UI, tests, docs and possibly MCP/eval payloads.

## Confidence

Medium-high.

The decision aligns with existing Greenhouse architecture: Nexa as grounded assistant, API parity, primitive + variants + kinds, Adaptive Sidecar, MCP as technical lane and server-side authorization. Confidence should become high after the first non-Knowledge pilot validates `surfaceContext`.

## Validated As Of

2026-06-12 against local repo docs:

- `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `TASK-1095`
- `TASK-1096`

No external vendor or pricing claim is introduced by this ADR.

## Context

TASK-1090 and TASK-1095 exposed a product and architecture risk: the approved Knowledge conversational experience could become a local Knowledge chat instead of a reusable Greenhouse conversational platform.

Greenhouse needs Nexa to work in more than `/knowledge`:

- Nexa Chat should remain the primary conversational shell, not a separate product language.
- Nexa Insights should be able to promote a signal into a contextual conversation without becoming chat by default.
- a finance chart should be able to ask "why did this metric move?"
- an Agency account surface should ask "what is the next best action?"
- a Person profile should explain context while respecting HR/payroll redaction
- Commercial should reason over deal/client lifecycle
- MCP should inspect resources and provenance technically

If each domain creates its own chat, Greenhouse will duplicate state machines, prompt semantics, proof UI, authorization assumptions and evidence renderers. That would be fragile, hard to govern and unsafe for sensitive domains.

At the same time, the human conversational experience should not become a proof dashboard. Evidence is valuable as runtime substrate and trust support, but the default conversation must be answer/action-first.

The broader product concern is consistency across all AI moments. Greenhouse already has AI surfaces such as Nexa Chat, Nexa Insights, Knowledge retrieval, chart explanations, digests and MCP resources. They should feel like one Nexa system, not unrelated AI widgets.

## Decision

Greenhouse will treat Nexa Conversational Experience V2 as a multi-surface platform governed by a shared contract:

1. `surfaceContext` describes the invoking surface, domain, entity refs, time range, data reality, capabilities, provenance refs and sensitivity tier.
2. Conversational runtime owns state, history, model/tool orchestration and follow-up continuity.
3. A shared answer-turn owns the presentation order: user prompt, Nexa identity, answer, compact trust cue, actions, follow-up composer and optional proof.
4. Provenance is a layered substrate:
   - Layer 0 hidden runtime packet
   - Layer 1 compact human trust cue
   - Layer 2 proof detail on demand
   - Layer 3 MCP/agent packet
5. Product surfaces contribute context through adapters. They do not fork chat runtime or answer-turn UI.
6. Authorization remains server-side. Surface adapters may receive resolved capabilities and safe refs; they may not infer permissions from route, role label or visible UI.
7. AI moments that are not chat, especially Nexa Insights, may remain compact/advisory but must be conversationally promotable through `surfaceContext` when the user wants to ask follow-up questions.

Knowledge is the first reference consumer. It is not the owner of the platform.
Nexa Chat is the primary shell consumer. Nexa Insights is a sibling AI moment that escalates into the platform when useful.

## Alternatives Considered

### Alternative A: Knowledge-only AnswerSurface promotion

Promote `NexaKnowledgeAnswerSurface` into `/knowledge` and defer generalization.

Rejected because it would encode document/citation assumptions into a pattern that Finance, Agency, Personas and Commercial will later need to undo.

### Alternative B: Domain-local chats

Create module-specific chats such as `FinanceNexaChat`, `AgencyNexaChat` or `PersonNexaChat`.

Rejected because it duplicates runtime, UI, evidence, prompt semantics, authorization boundaries and GVC coverage. It also increases the chance of leaking sensitive data in finance/HR/person contexts.

### Alternative C: Proof/evidence-first interface

Make evidence panels and retrieval cards the main visible body of every answer.

Rejected for product quality. Human conversation should be useful and action-oriented first. Evidence should support trust progressively and be inspectable on demand.

### Alternative D: New assistant sidecar/shell as the primary abstraction

Build a new assistant drawer or sidecar that contains its own thread, composer and answer UI.

Rejected because Adaptive Sidecar already governs contextual lanes, and `NexaThread`, `NexaFloatingPanel`, `NexaComposer`, `NexaKnowledgeAnswerSurface` and `NexaEvidencePanel` already exist. The architecture should converge these, not bypass them.

### Alternative E: UI-inferred authorization

Let each surface adapter infer what Nexa can say or do based on route group, tab visibility or role name.

Rejected because Greenhouse access is dual-plane and capability-driven. Conversational surfaces must consume server-side policy outputs and canonical readers/commands.

### Alternative F: Absorb Nexa Insights into chat

Make Nexa Insights a conversational thread or render every insight as a chat turn.

Rejected because Insights is an advisory signal layer with its own lifecycle, routing, degradation states and digest/notification surfaces. It should remain compact and inspectable, while offering escalation into conversation when the user wants depth.

## Consequences

### Positive

- One conversational state model across surfaces.
- Direct synergy between Nexa Chat, Nexa Insights, Knowledge and future AI moments.
- One answer-turn pattern across Knowledge, charts, finance, agency, person and commercial contexts.
- Safer sensitive-domain adoption through explicit `surfaceContext` and sensitivity tiers.
- Better API parity because domain answers must map to canonical readers/commands/tools.
- MCP can inspect provenance without forcing technical proof into the human conversation.
- GVC and Design System can validate collapsed and expanded states consistently.

### Negative / Costs

- Requires an architecture slice before implementation.
- Requires `surfaceContext` types and fixtures before broad UI adoption.
- Requires naming cleanup or facade around `NexaKnowledgeAnswerSurface`.
- Requires domain teams/tasks to provide adapters instead of dropping in local chat UI.
- Initial implementation is slower than shipping Knowledge-only UI.

### Risks

- `surfaceContext` could become an untyped dumping ground.
- Trust cues could imply more certainty than the runtime has.
- Non-Knowledge consumers could pressure the contract into domain-specific conditionals.
- Sensitive data could leak if adapters pass raw records instead of refs.
- Follow-up continuity could become hard to reason about without observability.

## Runtime Contract

### Canonical architecture doc

`GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`

### Recommended delivery boundary

TASK-1095 should deliver the platform support layer:

- platform foundation,
- architecture/ADR,
- `surfaceContext`,
- AI moments mapping,
- provenance/trust cue/proof layering,
- answer-turn compatibility path.

TASK-1096 should deliver the Nexa Answers product/UI layer:

- embedded contextual surface contract,
- choreography from idle to follow-up,
- Knowledge reference consumer,
- non-Knowledge fixtures/specimens for promoted insight and finance/chart contexts.

Neither TASK-1095 nor TASK-1096 should ship the first real non-Knowledge product rollout. That belongs in a child follow-up task once the foundation and surface experience are accepted.

Recommended child pilot:

1. finance/chart insight explanation, read/explain/suggest only.
2. Agency account health if product prioritizes operational next-best-action over metric explanation.

### Required runtime concepts

- `surfaceContext` typed contract
- consumer adapters
- AI moment promotion contract for Nexa Insights and similar surfaces
- canonical conversational state machine
- answer-turn facade or documented compatibility path
- provenance/trust cue/proof layering
- server-side capability boundary
- non-Knowledge fixtures
- GVC coverage for collapsed trust cue and expanded proof states

### Current implementation candidates

- `useNexaPersistentRuntime`
- `NexaThread`
- `NexaFloatingPanel`
- `NexaComposer`
- `NexaKnowledgeAnswerSurface`
- `NexaEvidencePanel`
- `ConversationalEvidencePacket`
- `NexaToolRenderers`

### Forbidden implementation shapes

- domain-local chat forks
- UI table reads or direct retrieval
- raw domain records in `surfaceContext`
- proof panel as default answer body
- forcing Nexa Insights to become chat by default
- permissions inferred from route/role instead of server-side capability/entitlement resolution

## Revisit When

Reopen this decision when:

- two or more non-Knowledge consumers adopt the platform,
- Nexa Insights begins creating conversational sessions by default instead of explicit user escalation,
- Nexa begins executing writes/actions from embedded surfaces,
- MCP needs cross-domain conversational provenance beyond Knowledge,
- sensitivity tiers need to map to new legal/compliance constraints,
- sidecar lane becomes the primary assistant placement,
- model/provider routing changes answer confidence or provenance semantics.

## Implementation Notes

TASK-1095 owns the platform implementation plan. TASK-1096 owns the Nexa Answers surface experience plan.

The recommended first non-Knowledge pilot after Knowledge is either:

1. finance/chart insight: explain a selected metric or anomaly with calculation provenance, or
2. Agency account health: explain current account state and recommend next action.

The pilot should be read/explain/suggest only. Writes require a follow-up ADR or delta because action execution changes the autonomy and authorization risk profile.

## Decision Status Notes

This ADR is `Proposed` while the team reviews the V2 contract and identifies gaps. It should become `Accepted` only after:

- `surfaceContext` shape is agreed,
- Nexa Chat and Nexa Insights relationship is accepted,
- answer-turn naming strategy is chosen,
- AI moments registry/minimal mapping is accepted,
- trust cue copy taxonomy is accepted,
- sensitivity tiers are mapped to capability/entitlement realities,
- observability minimum is agreed,
- context persistence rules are agreed,
- at least three fixture profiles are defined,
- access/redaction invariants are accepted,
- the first non-Knowledge child pilot candidate is selected or explicitly deferred.
