---
name: software-architect-2026
description: Design, audit, evolve, migrate, and assure software architecture using evidence, explicit quality attributes, stakeholder concerns, decision records, operational readiness, and implementation handoffs. Use for system design, architecture reviews, stack or build-vs-buy decisions, brownfield modernization, distributed/data/multi-tenant/AI systems, reliability or recovery design, C4/views, ADRs, threat models, cost models, and questions such as "how should we structure this?" or "what will break?". Do not use for isolated coding fixes, routine commands, or documentation edits with no architectural decision.
---

# Software Architect

Produce architecture that is understandable, testable, operable, and able to evolve. Treat the year in the skill name as a compatibility identifier, not as evidence that a claim is current.

## Resolve authority first

1. Read repository instructions, active work artifacts, accepted decisions, domain architecture, and verified code/schema/runtime before applying generic guidance.
2. Treat this skill as method and decision support, not as a competing source of truth.
3. When working in Efeonce or Greenhouse, load `efeonce-overlay/router.md`. Apply the overlay as localization after the generic architecture pass.
4. Mark conflicts, missing evidence, and stale canon explicitly. Never repair them by inventing a contract.

## Use this mental model

Treat architecture as all of the following:

- a description of an entity in its environment, shaped by stakeholders and their concerns;
- a set of structural, behavioral, deployment, data, and socio-technical views that answer those concerns;
- a portfolio of consequential decisions, constraints, principles, and trade-offs;
- an evolving system governed through evidence, fitness functions, conformance checks, and review triggers.

Use reversibility to allocate effort, not to define architecture. Spend more evidence and review on decisions with high blast radius, weak rollback, regulated impact, or long-lived coupling.

## Select a mode

| Mode | Use when | Minimum outcome |
|---|---|---|
| Discovery | Intent, constraints, owners, or current state are unclear | Concern register, unknowns, evidence plan |
| New design | A capability or system needs a target shape | Views selected by concern, decisions, quality scenarios, roadmap |
| Audit | A real system must be evaluated | Evidence-backed findings, risk ranking, conformance gaps, remediation |
| Decision | Alternatives must be compared | Drivers, trade-off matrix, ADR, revisit triggers |
| Migration | Current and target states differ materially | Baseline/target/gap, transition states, reconciliation, rollback |
| Assurance | Build/launch/recovery readiness is in question | Quality, security, operations, cost, recovery, and evidence verdict |

If the mode changes during discovery, say so. Do not force a full design bundle for a narrow decision.

## Follow the architecture loop

### 1. Frame the entity and intent

Identify the entity of interest, problem, beneficiaries, business outcome, boundaries, environment, lifecycle stage, and authority to decide. Search project context before asking questions.

Ask at most three load-bearing questions at a time. Prefer:

1. Which user or business outcome must this enable?
2. What scale, criticality, and failure impact must it handle?
3. Which constraints cannot be violated: regulation, integration, budget, team, deadline, residency, or existing decisions?

Separate facts, hard constraints, preferences, aspirations, assumptions, and unknowns.

### 2. Register stakeholders, concerns, and decision rights

Capture the people who build, operate, secure, fund, use, acquire, maintain, govern, or assess the system when relevant. Map each material concern to an owner, priority, acceptance authority, evidence, and view that will answer it.

Load `references/13-architecture-description-evolution.md` and use `templates/stakeholder-concern-register.md` for non-trivial work.

### 3. Establish evidence and baseline

For brownfield work, inspect code, schemas, dependencies, runtime configuration, telemetry, incidents, costs, and current ownership. Distinguish observed state from inferred state.

For current technology, pricing, regulatory, protocol, vendor, model, or ecosystem claims, follow `references/12-research-protocol.md` and cite primary sources with a validation date. Never infer operational truth from documentation alone.

### 4. Classify shape, criticality, and quality attributes

Select one primary and up to two secondary archetypes from `references/01-solution-archetypes.md`; treat their stack signatures as hypotheses, never defaults.

Classify workload criticality and prioritize three to five architecturally significant quality attributes. Express each important attribute as a measurable scenario: source, stimulus, environment, affected artifact, response, and response measure. Reject adjectives such as “secure”, “scalable”, or “highly available” without a scenario or explicit exploratory status.

### 5. Select views and alternatives by concern

Choose only views that answer registered concerns. Typical views include context, container, runtime/dynamic, deployment, data, integration/event, security/trust boundary, operations/recovery, and socio-technical ownership.

For consequential choices:

- state decision drivers and dealbreakers;
- compare viable alternatives, including “do nothing”, managed/buy, and simpler non-AI/non-distributed baselines when applicable;
- expose cross-pillar trade-offs rather than maximizing every quality attribute;
- classify reversibility and define exit or migration posture;
- avoid precision unsupported by measurements.

Use `references/03-decision-frameworks.md` and the relevant templates.

### 6. Design contracts and failure behavior

Define source-of-truth ownership, interfaces, identity/authorization boundaries, data lifecycle, consistency, timeouts, retry ownership, idempotency, ordering, backpressure, degradation, reconciliation, and recovery where applicable.

Load:

- `references/05-data-architecture.md` for operational/analytical data and lineage;
- `references/06-multi-tenancy.md` for tenant isolation and tier evolution;
- `references/14-quality-reliability-platform.md` for quality, SRE, platform, recovery, FinOps, sustainability, and supply-chain assurance;
- `references/15-distributed-integration-contracts.md` for distributed, API, event, webhook, and integration contracts;
- `references/16-agentic-systems-assurance.md` for AI/agent runtime, autonomy, MCP/A2A, evals, memory, guardrails, telemetry, and cost.

### 7. Evaluate and make evolution executable

Evaluate the design against every high-priority concern and quality scenario. Record accepted risk, waiver owner/expiry, contradictions between views, and missing evidence.

Connect important quality scenarios to fitness functions with mechanism, threshold, cadence, owner, evidence, and response. Define baseline, target, gaps, transition states, rollout, rollback, decommissioning, and review triggers. A future candidate home or technology is metadata, not authorization to create it.

### 8. Self-critique and hand off

Before delivery, answer:

- What fails at the next scale level and under partial dependency failure?
- What becomes invalid in 12 and 36 months?
- Which control plane, credential, operator, or dependency may be unavailable during recovery?
- What creates tenant, privacy, security, supply-chain, or compliance exposure?
- What is locked in, unobservable, unowned, or cognitively expensive?
- What is the cost per useful outcome and its dominant sensitivity?
- If AI is present, why is it preferable to a deterministic baseline, how is autonomy bounded, and what evidence permits promotion?

Deliver decisions, unresolved risks, evidence gaps, implementation boundaries, verification, rollout/rollback, owners, and revisit triggers. Distinguish `design complete`, `build ready`, `launch ready`, and `recovery proven`.

## Scale artifacts to risk

| Level | Suitable for | Typical artifacts |
|---|---|---|
| Decision note | Reversible, local choice | Drivers, decision, consequences, review trigger |
| Solution outline | One bounded capability | Concern register, selected views, quality scenarios, ADRs, rollout |
| Full architecture description | Cross-domain or high-coupling system | Viewpoint/view register, correspondence, contracts, roadmap, evaluation |
| Assurance case | Regulated, safety/security critical, or high-blast-radius system | Claims, evidence, risk acceptance, conformance and recovery proof |

Do not create diagrams, ADR counts, or sections merely to satisfy a bundle. Every artifact must answer a concern or prove a gate.

## Resource routing

| Resource | Load when |
|---|---|
| `references/02-stack-matrix-2026.md` | Generating options only; revalidate every concrete choice |
| `references/04-ai-native-patterns.md` | Quick AI pattern selection; use reference 16 for assurance |
| `references/07-security-compliance.md` | Threat, privacy, identity, regulated-data, or assurance work |
| `references/08-observability.md` | Signals, SLOs, telemetry, incidents, or distributed/AI runtime |
| `references/09-cost-modeling.md` | Cost, unit economics, or scale-sensitive decisions |
| `references/10-cognitive-debt.md` | Ownership, maintainability, generated code, or self-critique |
| `references/11-migration-evolution.md` | Migration, coexistence, cutover, rollback, or decommissioning |
| `references/12-research-protocol.md` | Always for temporally unstable claims |
| `references/13-architecture-description-evolution.md` | Non-trivial design, audit, viewpoints, quality, or governance |
| `references/14-quality-reliability-platform.md` | Quality, cloud/platform, SRE, DR, FinOps, sustainability, supply chain |
| `references/15-distributed-integration-contracts.md` | APIs, events, messaging, webhooks, distributed state, integration |
| `references/16-agentic-systems-assurance.md` | Any AI, agent, MCP/A2A, eval, memory/RAG, or autonomy decision |
| `references/17-source-governance-maintenance.md` | Maintaining, reviewing, or updating this skill |

Use templates as starting structures, not mandatory prose. Run the matching checklist before claiming design/build/launch readiness.

## Efeonce and skill composition

Within Greenhouse/Efeonce, load `efeonce-overlay/router.md`, then the domain skill and canonical documents selected by `AGENTS.md`. Use `greenhouse-task-planner` for canonical task creation rather than copying task templates into architecture outputs.

Compose with specialized skills after deciding the architectural shape. In particular:

- hand Astro/static-site implementation to `astro` after boundaries and contracts are decided;
- hand Efeonce Globe implementation to `greenhouse-globe` while preserving the sister-platform boundary;
- hand UI, finance, payroll, legal, identity, cloud, data, growth, or release details to the routed specialist.

If a specialist uncovers a new one-way decision, return to this workflow.

## Maintain and validate the skill

Do not treat embedded dates, versions, products, laws, or prices as self-validating. Use `references/source-catalog.json` and run:

```bash
python3 .codex/skills/software-architect-2026/scripts/validate_architecture_skill.py
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/software-architect-2026
```

For substantive changes, execute the blind protocol under `evals/software-architect-2026/` against a frozen baseline. Do not approve a richer prompt that regresses safety, routing, proportionality, provenance, or context cost.

## Boundaries

- Do not implement production code unless the user separately authorizes implementation and the repository workflow allows it.
- Do not equate a diagram with an architecture or a code change with operational readiness.
- Do not recommend novelty, microservices, Kubernetes, event sourcing, AI agents, MCP, multi-region, or polyglot persistence without evidence that their benefits exceed their operating cost.
- Do not claim legal compliance, certification, standards conformance, recovery proof, or production readiness from design intent alone.
- Do not capture private chain-of-thought; record observable decisions, evidence, policy outcomes, actions, and results.
