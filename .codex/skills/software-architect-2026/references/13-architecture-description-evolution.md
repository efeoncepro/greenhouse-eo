# Architecture Description and Evolution

Use this reference when a design needs more than a stack choice: multiple stakeholders, several views, explicit quality drivers, organizational boundaries, or architecture that must remain governable as it changes.

This is a pragmatic method **inspired by** ISO/IEC/IEEE 42010:2022. It does not reproduce the standard and must not be used to claim ISO conformance, certification, or completeness.

## Contents

1. [Minimal architecture-description model](#1-minimal-architecture-description-model)
2. [Concern-driven viewpoints and views](#2-concern-driven-viewpoints-and-views)
3. [Correspondence and consistency](#3-correspondence-and-consistency)
4. [arc42-compatible document mapping](#4-arc42-compatible-document-mapping)
5. [Quality scenarios and ASRs](#5-quality-scenarios-and-asrs)
6. [A lightweight TOGAF-inspired micro-cycle](#6-a-lightweight-togaf-inspired-micro-cycle)
7. [Evolutionary architecture and fitness functions](#7-evolutionary-architecture-and-fitness-functions)
8. [Socio-technical architecture](#8-socio-technical-architecture)
9. [Completion and review gates](#9-completion-and-review-gates)
10. [Sources](#10-sources)

## 1. Minimal architecture-description model

Treat the architecture and its description as different things. The running system and its organization are reality; diagrams, ADRs, scenarios, inventories, and models are partial representations of that reality.

| Concept | Working meaning | Minimum record |
|---|---|---|
| Entity of interest | The system, service, enterprise, product line, or bounded change being described | Name, scope, environment, lifecycle stage |
| Stakeholder | A person, group, or organization with an interest in the entity | Role, decision rights, contact/owner |
| Concern | An interest that can affect acceptance or use of the architecture | Question, priority, stakeholder, evidence needed |
| Viewpoint | Reusable conventions for addressing a related set of concerns | Audience, concerns, model kinds, notation, analysis method |
| View | The actual representation produced under a viewpoint for this entity | Version, owner, governing viewpoint, known gaps |
| Model / view component | A diagram, table, scenario set, executable check, or other focused representation used by a view | Kind, source, freshness, scope |
| Correspondence | A meaningful relationship between elements in the same or different views | Source, target, relationship, verification |
| Decision and rationale | A choice that shapes architecture and the reason it was made | ADR, drivers, evidence, consequences, revisit trigger |

Do not start by drawing every familiar diagram. Start with the decisions to support and the concerns that could invalidate them.

## 2. Concern-driven viewpoints and views

### Register stakeholders and concerns

Use the [stakeholder and concern register](../templates/stakeholder-concern-register.md). Include absent but consequential stakeholders such as operators, security/privacy reviewers, finance, compliance, maintainers, incident responders, integrators, and affected customers. Separate a stakeholder's stated preference from the underlying concern.

Prioritize concerns by decision impact, risk, and time horizon. An unresolved concern is acceptable only with an owner, due date, and consequence of remaining unresolved.

### Define only useful viewpoints

For each viewpoint, declare:

- audience and decisions supported;
- concerns it frames and explicitly does not frame;
- model kinds and notation;
- analysis or evaluation method;
- correspondence rules to other views;
- owner, update cadence, and retirement trigger.

Select views by concerns. C4 levels are useful structural model kinds, not a mandatory document sequence. Add runtime, deployment, data, security, operational, cost, or organizational views only when they answer registered concerns.

### Example viewpoint catalog

| Viewpoint | Typical concerns | Possible model kinds |
|---|---|---|
| Context and scope | Purpose, users, external dependencies, ownership boundary | C4 context, context table |
| Decomposition | Responsibilities, deployability, coupling, change isolation | C4 container/component, module map |
| Runtime | Critical behavior, concurrency, failure handling, trust transitions | Sequence, state, activity diagram |
| Deployment and operations | Runtime placement, zones, scaling, recovery, observability | Deployment diagram, topology table, runbook link |
| Information | Sources of truth, classification, lineage, retention, consistency | Data-flow, schema/domain map, lifecycle table |
| Security and privacy | Threats, identities, privileges, data exposure, controls | Threat model, trust-boundary view, abuse cases |
| Evolution | Changeability, compatibility, migration, deprecation | Transition states, roadmap, fitness-function portfolio |
| Organization | Ownership, cognitive load, handoffs, team dependencies | Team/service map, interaction-mode table |

## 3. Correspondence and consistency

Views can be individually plausible and collectively contradictory. Record load-bearing correspondences and, where practical, make them executable.

Examples:

- every deployable in the container view maps to one deployment target and one owning team;
- every external data flow maps to a classified dataset, trust boundary, and failure policy;
- every critical quality scenario maps to one or more tactics and verification mechanisms;
- every public interface maps to a contract, compatibility policy, telemetry signal, and owner;
- every accepted ADR maps to affected views and fitness functions;
- every component name and boundary is consistent across structural, runtime, and deployment views.

Use a correspondence table with `from`, `relationship`, `to`, `rule`, `verification`, and `owner`. Classify verification as `automated`, `manual`, or `not yet verified`; never imply automation when the check is a review ritual.

## 4. arc42-compatible document mapping

Use arc42 as a pragmatic communication structure, not as a completeness badge. Existing documents need not be renamed; map their content instead.

| arc42 area | This skill's artifacts |
|---|---|
| 1. Introduction and goals | Problem, goals/non-goals, stakeholders, top quality goals |
| 2. Constraints | Hard, soft, aspirational constraints |
| 3. Context and scope | Context viewpoint, system boundary, external interfaces |
| 4. Solution strategy | Drivers, principles, major tactics, linked ADRs |
| 5. Building-block view | Concern-selected C4 container/component or module views |
| 6. Runtime view | Critical sequences, state transitions, failure paths |
| 7. Deployment view | Runtime topology, environments, ownership, recovery |
| 8. Cross-cutting concepts | Security, identity, data, observability, integration conventions |
| 9. Decisions | ADR set and rationale |
| 10. Quality requirements | Quality goals and measurable scenarios |
| 11. Risks and technical debt | Risk inventory, debt, assumptions, unresolved concerns |
| 12. Glossary | Domain and architecture terms |

Prefer links to canonical artifacts over duplicated prose. A mapping may intentionally omit an area when it is irrelevant; state why.

## 5. Quality scenarios and ASRs

An architecturally significant requirement (ASR) is a requirement whose satisfaction strongly shapes structure, tactics, technology, operations, or team topology. Functional requirements can be ASRs; not every non-functional requirement is one.

Discover candidate ASRs from business goals, constraints, quality goals, threats, incidents, scale assumptions, and costly change scenarios. Promote a candidate to ASR when violating it would materially change the architecture or invalidate a major decision.

Express critical qualities with the [quality-scenarios template](../templates/quality-scenarios.md):

`source → stimulus → environment → affected artifact → response → measurable response`

Include at least:

- usage scenarios for behavior under representative and peak conditions;
- change scenarios for evolvability and maintenance;
- failure/attack scenarios for resilience, security, and recovery.

Avoid labels such as “highly available” or “scalable” without a threshold, observation window, workload, and measurement source. Link each critical scenario to its stakeholder concern, design tactics, evidence, owner, and review trigger.

## 6. A lightweight TOGAF-inspired micro-cycle

TOGAF's ADM is iterative and tailorable. For product or solution architecture, use this small cycle without claiming to execute the full TOGAF method:

1. **Frame** — confirm mandate, entity, scope, stakeholders, concerns, constraints, principles, and decision deadline.
2. **Baseline** — capture only current business, information, application, and technology facts needed for the decision; mark unknowns.
3. **Target** — describe desired outcomes, quality scenarios, selected views, tactics, and decision alternatives.
4. **Gap and options** — identify capability, data, integration, operational, organizational, and governance gaps; compare transition options.
5. **Sequence** — define increments, dependencies, migration states, coexistence, rollback, ownership, and evidence gates.
6. **Govern change** — connect ADRs, view updates, fitness functions, exceptions, and change triggers.

Iterate within and between steps. Depth follows risk and decision need; do not manufacture enterprise-scale artifacts for a local reversible decision.

## 7. Evolutionary architecture and fitness functions

Design for guided, incremental change across the dimensions that matter. Evolution is not “let architecture emerge without constraints”; it couples reversible increments with explicit protection for critical characteristics.

For each critical quality scenario or architecture rule, decide the cheapest credible feedback mechanism:

- static dependency or policy checks;
- contract, schema, or compatibility tests;
- performance and cost budgets;
- security controls and configuration assertions;
- telemetry/SLO queries;
- resilience experiments or recovery drills;
- periodic evidence-based review when automation would be misleading.

Use the [fitness-functions template](../templates/fitness-functions.md). State scope, measure, threshold, execution point, owner, failure action, exceptions, and expiry/review date. A dashboard without a threshold and response is observability, not an effective fitness function. A manual review is valid when it has a cadence, evidence, accountable owner, and recorded outcome.

Maintain a small portfolio:

- protect only architecture characteristics that matter;
- distinguish leading controls from lagging production signals;
- balance dimensions that conflict, such as latency, cost, resilience, and delivery speed;
- remove checks that no longer protect a live concern;
- version thresholds when assumptions or operating envelopes change.

## 8. Socio-technical architecture

Conway's law is a constraint to investigate, not a slogan that mechanically dictates microservices or reorganization. Co-design technical boundaries and communication paths.

For every significant boundary, record:

- one accountable owning team and its cognitive-load envelope;
- lifecycle ownership: design, build, operate, secure, evolve, and retire;
- dependencies and expected interaction mode (`collaboration`, `x-as-a-service`, or `facilitating` where Team Topologies vocabulary is useful);
- platform capabilities required for the team to work independently;
- handoffs, queues, shared ownership, and coordination hotspots;
- signals that the boundary or team topology should change.

Do not create a deployable boundary without operational ownership. Do not use “inverse Conway” to force a target organization without evidence that the new communication structure is viable. Prefer stable ownership and explicit APIs over ticket-driven handoffs, while acknowledging regulated separation-of-duties constraints.

## 9. Completion and review gates

An architecture description is decision-ready when, proportionally to risk:

- stakeholders and load-bearing concerns are registered;
- each critical concern is addressed by a view, decision, scenario, or explicit open issue;
- viewpoints state audience, conventions, analysis, owner, and scope;
- critical correspondences are checked and contradictions recorded;
- ASRs are measurable and linked to tactics and evidence;
- technical boundaries have socio-technical owners;
- accepted decisions identify consequences and review triggers;
- fitness functions or review rituals protect critical characteristics;
- baseline, target, transition, rollback, and retirement states are honest;
- change triggers name who reconvenes the architecture review.

Review when a trigger fires, not merely on a calendar: quality threshold breach, material scale or cost change, incident class, regulation or vendor change, ownership change, repeated exception, migration milestone, or invalidated assumption.

## 10. Sources

Primary and official sources checked **2026-07-22**:

- ISO, [ISO/IEC/IEEE 42010:2022 — Architecture description](https://www.iso.org/standard/74393.html) — scope and status of the published second edition. Access to the full normative text may require purchase.
- ISO/IEC/IEEE 42010 project site, [Conceptual Model](https://www.iso-architecture.org/ieee-1471/cm/) — explanatory model for stakeholders, concerns, viewpoints, views, view components/models, decisions, and correspondences.
- arc42, [Template Overview](https://arc42.org/overview) and [Quality Requirements](https://docs.arc42.org/section-10/) — pragmatic document structure and measurable quality scenarios.
- The Open Group, [TOGAF Standard, 10th Edition](https://www.opengroup.org/togaf) — current modular and tailorable framework entry point. Verify licensed normative material when formal adoption or conformance matters.
- C4 model, [Diagrams](https://c4model.com/diagrams) and [Notation](https://c4model.com/diagrams/notation) — concern/audience-sensitive diagram selection and notation guidance.
- Thoughtworks, [Building Evolutionary Architectures, second edition — sample chapter](https://www.thoughtworks.com/content/dam/thoughtworks/documents/books/bk_building_evolutionary_architectures_second_edition_free_chapter.pdf) and [Fitness function-driven development](https://www.thoughtworks.com/en-au/insights/articles/fitness-function-driven-development) — guided incremental change and architectural fitness functions.
- Team Topologies, [Organization Dynamics with Team Topologies](https://teamtopologies.com/s/Organization-Dynamics-with-Team-Topologies-Mini-book-MB80.pdf) and [Finding software boundaries for fast flow](https://teamtopologies.com/s/Finding-software-boundaries-for-fast-flow-Team-Topologies-and-Domain-Driven-Design-mini-book-MB81-v1.pdf) — Conway effects, cognitive load, team boundaries, and interaction design.
