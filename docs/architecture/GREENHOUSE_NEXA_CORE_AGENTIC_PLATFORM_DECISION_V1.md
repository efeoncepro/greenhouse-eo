# Greenhouse Nexa Core Agentic Platform Decision V1

## Status

Accepted (direction) — implementation gated per task.

## Date

2026-06-13

## Owner

Product / Nexa / Platform Architecture

## Scope

- Greenhouse product direction
- Nexa as AI/agentic platform layer
- Nexa Chat, Nexa Answers, Nexa Insights and MCP relationship
- AI Moments / Conversational Moments / Nexa Moments
- Cross-domain context adapters for Knowledge, Finance, Agency/Account 360, People, Commercial, Delivery/ICO and Client Portal
- Autonomy, provenance, action and permission boundaries

## Reversibility

One-way for product direction; two-way-but-slow for implementation details.

Undoing the product direction would change how Greenhouse positions AI, how domains expose context, how future UX is composed, and how client self-service evolves. Implementation details such as where the context contract physically lives, which domain pilots go first, and which UI placement each moment uses remain reversible through task-scoped migrations.

## Confidence

High for the direction. Medium for sequencing and exact rollout shape.

The direction aligns with Greenhouse's ASaaS North Star, existing Nexa primitives, Full API Parity, Primitive + Variants + Kinds, the Knowledge Platform, and the current `NexaAnswersCanvas` / `NexaAnswersSurfaceContext` contract. Sequencing remains medium-confidence until at least one non-Knowledge domain pilot proves the adapter and action boundary outside document retrieval.

## Validated As Of

2026-06-13 against local repo docs and runtime contracts:

- `docs/context/00_INDEX.md`
- `docs/context/04_greenhouse-producto.md`
- `docs/context/14_modelo-negocio-asaas.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1095-conversational-experience-v2.md`
- `docs/tasks/to-do/TASK-1096-nexa-answers-surface-experience.md`

No external vendor, model pricing, framework version or regulatory claim is introduced by this ADR.

## Context

Greenhouse's business direction is ASaaS: the portal is the relationship, and each month of operation should build memory, transparency and switching cost. Nexa cannot remain a local chat affordance or a Knowledge-specific answer screen without weakening that thesis.

The product now has multiple AI-shaped surfaces: Nexa Chat, Nexa Insights, Knowledge retrieval, Nexa Answers, chart explanations, possible Account 360 recommendations, client self-service and MCP resources. If each surface grows separately, Greenhouse will accumulate AI widgets with duplicated state, uneven permission boundaries, inconsistent evidence, and domain-local language.

The operator's product intent on 2026-06-13 is explicit: Nexa should live in the core of Greenhouse; Greenhouse should be an agentic platform for collaborators, clients and operators; AI Moments / Conversational Moments / Nexa Moments should perceive and expose synergies in each domain.

## Decision

Greenhouse will treat **Nexa as a core agentic platform layer**, not as a chat feature. The product unit is the **Nexa Moment**: a contextual, permission-aware, evidence-backed, action-aware manifestation of Nexa inside a domain.

Nexa Moments are governed by a shared fabric:

```text
Nexa Moment = context + evidence + permission + intent + next step
```

If any input is missing, the moment must degrade honestly: ask for context, expose limits, omit actions, or stay quiet. The product standard is not "AI everywhere"; it is "Nexa appears when the domain gives it a concrete job."

## Core Principles

1. **Nexa lives in context.** Nexa Chat is one manifestation, but the highest-value moments live inside Account 360, charts, People, Finance, Knowledge, Commercial, Delivery/ICO and Client Portal surfaces.
2. **No domain-local Nexas.** Domains provide adapters and context; they do not create `FinanceChat`, `AgencyChat`, `PeopleChat` or parallel answer surfaces.
3. **Every moment must be earned.** A moment needs enough local context, provenance, permission and intent to help. Decorative generation is a product regression.
4. **Answer/action first, proof on demand.** The human experience starts with clarity and next step; provenance supports trust progressively through compact cue, proof disclosure and MCP/technical packet.
5. **Actions are governed, not inferred.** Suggested or executable actions require server-side capabilities, canonical readers/commands/API parity, audit/outbox/idempotency when applicable, and tenant-safe authorization.
6. **Autonomy graduates by evidence.** V1 moments are explain/suggest/recommend by default. Draft/execute/autonomous tiers require separate task/ADR gates and runtime evidence.
7. **Client-facing Nexa is not a lower bar.** Client Portal moments must be simpler, safer and more transparent, with no raw private payloads and no cross-tenant leakage.

## Vocabulary

| Term | Meaning |
| --- | --- |
| AI Moment | Any product moment where AI contributes perception, explanation, summary, recommendation or automation. |
| Conversational Moment | An AI moment with direct question/answer/follow-up behavior. |
| Nexa Moment | A Greenhouse-branded, context-aware AI/agentic moment with Nexa identity, trust cue, provenance and optional next step. |
| Nexa Moment Fabric | The shared platform contract that routes context, evidence, permissions, actions, reliability and UI composition across domains. |
| Nexa Chat | The global/direct conversational shell. |
| Nexa Answers | The embedded contextual answer surface, currently represented by `NexaAnswersCanvas`. |
| Nexa Insights | The proactive/advisory signal layer, promotable into a conversational moment when useful. |
| MCP / technical moment | Machine/agent-facing inspection of resources, tools and provenance. |

## Alternatives Considered

### Alternative A: Keep Nexa as a global chat

Rejected. A global chat helps exploration, but it misses the highest-leverage operational moments: a margin movement in Finance, an account risk in Account 360, a person-specific HR context, a Bow-tie motion, or a client self-service decision.

### Alternative B: Build a chat per domain

Rejected. This duplicates runtime, UI, evidence, copy, GVC and authorization logic. It also makes sensitive domains more dangerous because each local implementation must rediscover redaction, action and proof boundaries.

### Alternative C: Treat AI moments as decorative summaries

Rejected. Decorative summaries do not build memory, transparency or switching cost. Nexa must connect to evidence, domain context and next steps, or degrade honestly.

### Alternative D: Make Nexa autonomous-first

Rejected for V1. Greenhouse domains include finance, payroll, HR, client data and commercial commitments. Autonomy must graduate through explicit tiers and evidence, not start at execution.

### Alternative E: Keep Knowledge as the owner of the conversational pattern

Rejected. Knowledge is the first low-risk consumer, not the destination. The surface, context and provenance contracts must be domain-neutral.

## Consequences

### Positive

- Greenhouse's AI direction now matches the ASaaS strategy: software that accumulates operational memory and makes the service transparent.
- Nexa can become a coherent system across collaborators, clients and operators instead of a collection of widgets.
- Domains can adopt Nexa through adapters and contracts instead of forking UI/runtime.
- Client self-service can expose intelligence safely through capability-gated moments.
- Full API Parity and MCP remain aligned: UI moments consume governed primitives, and agent/technical lanes inspect the same provenance.
- Cognitive debt is reduced because future teams have a named fabric and vocabulary.

### Negative / Costs

- Domain teams must design context adapters before shipping real moments.
- Some visually appealing AI affordances should be rejected if they lack evidence, permission or a concrete job.
- Runtime work slows slightly because action execution, provenance and evals are now part of the closure bar.
- Existing Knowledge-specific surfaces must converge carefully rather than being deleted or renamed abruptly.

### Neutral / Contextual

- `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md` remains the detailed conversational-platform draft, but this ADR is the higher product/architecture decision.
- `NexaAnswersCanvas` remains the canonical embedded answer surface; `NexaKnowledgeAnswerSurface` remains the current Knowledge runtime path while it converges.
- TASK-1095 owns substrate/doctrine; TASK-1096 owns perceived cross-domain experience; TASK-1101 owns Knowledge runtime promotion.

## Autonomy Boundary

| Tier | Meaning | Default closure requirement |
| --- | --- | --- |
| `inform` | Nexa explains or summarizes. | Context + evidence/degradation. |
| `recommend` | Nexa proposes a next step. | Capability-aware recommendation + no execution. |
| `draft` | Nexa prepares an artifact/action for review. | Draft command/API + human review surface + audit trail. |
| `execute_requires_confirmation` | Nexa executes only after explicit user confirmation. | Command semantics, authz, idempotency, audit/outbox, rollback/degraded state. |
| `execute_autonomous` | Nexa executes without per-action approval. | Separate ADR/task, kill switch, evals, budget/rate limits, observability and domain sign-off. |

## Implementation Notes

- Canonical architecture spec: `GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md`.
- Existing conversational UI contract: `ui-platform/CONVERSATIONAL_EXPERIENCE.md`.
- Existing detailed conversational platform ADR remains a companion: `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`.
- TASK-1095 must formalize the substrate and adapters.
- TASK-1096 must produce specimens and UX rules for domain moments.
- TASK-1101 must promote Knowledge runtime without claiming non-Knowledge rollout.
- First non-Knowledge pilot should be chosen explicitly: finance/chart explanation if analytics priority wins, or Account 360 signal explanation if customer operations priority wins.

## Self-Critique

### What breaks in 12 months?

Nexa may become over-present if teams add moments without the eligibility equation. The mitigation is to require context/evidence/permission/intent/next step in task acceptance and GVC specimens.

### What breaks in 36 months?

The autonomy model may need stronger policy if Nexa graduates into execution across finance, HR and client workflows. That requires separate ADRs per execution tier and domain.

### Cognitive debt risk

The risk is vocabulary drift: AI Moment, Conversational Moment, Nexa Answer and Nexa Insight could blur. This ADR names the vocabulary and the architecture doc owns the operational map.

### Lock-in

The product direction is intentionally sticky, but model/provider lock-in is not part of this ADR. Providers must stay behind existing `NexaChatProvider` / service abstractions.

### Observability gap

Moment-level reliability signals and evals are not fully implemented yet. TASK-1095 must define minimum signals before non-Knowledge rollout.

### AI-specific risk

Prompt injection, hallucination, context rot, cost spikes and autonomy mismatch remain risks. The fabric mitigates by bounded context, provenance, capability-aware actions, honest degradation and staged autonomy.

## Related ADRs / Docs

- Related: `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`
- Related: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Related: `GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- Related: `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- Related: `GREENHOUSE_KNOWLEDGE_PLATFORM_DECISION_V1.md`
- Related: `GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`

## Revisit When

- A second real non-Knowledge domain consumes Nexa Moments.
- Nexa begins drafting or executing actions in Finance, HR, Commercial or Client Portal.
- Client Portal exposes Nexa Moments to external users.
- MCP becomes a primary entrypoint for cross-domain agent workflows.
- The `surfaceContext` contract moves physically or changes version.
- Reliability/eval data shows moments are noisy, over-triggered or insufficiently trusted.
