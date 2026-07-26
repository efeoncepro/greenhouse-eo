# Efeonce Experience LaunchOps Agentic Platform Decision V1

## Status

Proposed — no customer production implementation or autonomous publishing authorized.

## Date

2026-07-26

## Owner

Wave + Product/Architecture + Efeonce Delivery

## Scope

Commercial product-service architecture for CMS-agnostic digital experience launches across mid-market and
enterprise clients. The product is owned and sold through Efeonce/Wave; Greenhouse internal capabilities may be
used as implementation substrate but are not the customer-facing product boundary.

## Reversibility

Two-way-but-slow. The service can begin as a managed workflow with adapters and later reduce or remove platform
surface area. Reversal is slow once reusable schemas, client integrations and operating habits exist.

## Context

Enterprise launches are slowed by handoffs between business, marketing, content, design, engineering, CMS,
analytics, SEO/AEO, legal/compliance and release teams. The opportunity is broader than any one CMS: Modyo,
Drupal/Acquia, headless CMSs and other runtimes can be targets.

The product must be agentic by design and Search-native by design, while preserving client governance. The agent
may propose and prepare work; humans and client permissions remain authoritative for approval and publication.

## Decision

Wave should offer **Experience LaunchOps** as a platform-enabled product service composed of:

1. a repeatable LaunchOps method and operating model;
2. a human delivery team with explicit roles and accountability;
3. a **Launch Control Plane** for briefs, specs, dependencies, approvals, releases and evidence;
4. CMS, analytics, search and agent adapters;
5. agents that operate through typed tools/MCP and deterministic services;
6. managed, implementation, squad and augmentation delivery models.

Governance, compliance and assurance are first-class capabilities of the service, not a late checklist. Their
operating model is defined in [`EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md`](EFEONCE_EXPERIENCE_LAUNCHOPS_GOVERNANCE_COMPLIANCE_OPERATING_MODEL_V1.md).

The core remains CMS-agnostic and **non-disruptive**. Experience LaunchOps is an interoperability/orchestration
overlay: it connects to the client's existing CMS, DXP, DAM, PIM, analytics, CRM, identity, ITSM and release
systems through governed adapters. It does not replace them, migrate them or become their source of truth by
default. Vendor names are adapters, not product identity.

The client retains authority over each system of record. Experience LaunchOps owns only its launch coordination
state, canonical cross-system references, policy/control execution and evidence. Every integration must declare
whether it is observe-only, assistive, governed-write or client-operated.

The socio-technical operating model is defined in [`Human Augmentation Product Operating Model`](EFEONCE_EXPERIENCE_LAUNCHOPS_HUMAN_AUGMENTATION_PRODUCT_OPERATING_MODEL_V1.md).
The Launch Operator is the primary product user and hero; specialist disciplines remain domain authorities and are
augmented rather than abstracted away.

## Product boundary

| Concern | Experience LaunchOps | Adjacent owner |
| --- | --- | --- |
| Launch orchestration and evidence | Wave | — |
| Web experience design/build | Wave / Web Experience 360 | Globe may provide creative production |
| SEO/AEO contract and preflight | Wave / Search Visibility 360 | Globe may provide source content |
| Tagging, analytics and measurement | Wave / Measurement & Analytics | — |
| Agents and MCP/tool integrations | Wave / Agent Systems & Platforms | Provider adapters are implementation detail |
| CRM, lifecycle and RevOps | Efeonce Digital/Kortex | Not a Wave line |
| Internal Greenhouse operations | Greenhouse | Not the client-facing product |

## Conceptual architecture

```text
Business opportunity
        ↓
Launch Control Plane
  brief · spec · dependencies · approvals · evidence
        ↓
Agent/tool orchestration ── human review ── client approval
        ↓
Adapters: CMS · design/build · SEO/AEO · analytics · release · CRM handoff
        ↓
Published experience + telemetry + post-launch verification
```

### Core objects

- `LaunchRequest`: business goal, audience, window, owner and constraints.
- `ExperienceSpec`: content/design/technical requirements and acceptance criteria.
- `SearchContract`: SEO/AEO/indexability/citation/semantic requirements.
- `MeasurementContract`: events, data layer/tagging, consent, destinations and validation.
- `DependencyGraph`: people, systems, approvals, assets, environments and blockers.
- `ReleaseCandidate`: immutable candidate, checks, approvers, target and rollback reference.
- `LaunchEvidence`: before/after evidence, deployment result, smoke checks and learnings.

### Platform capabilities

1. Opportunity intake and launch brief.
2. Experience and Search/Measurement specifications.
3. Dependency and approval orchestration.
4. CMS adapter registry and environment awareness.
5. Deterministic SEO/AEO, accessibility, performance and measurement preflight.
6. Preview, release, rollback and post-publish verification.
7. Audit trail, provenance, permissions and evidence ledger.
8. Portfolio reporting: lead time, wait, rework, defects, throughput and cost per launch.

## Agent model

Initial agent roles are logical capabilities, not necessarily separate models or services:

- Launch Strategist
- Experience Architect
- Content/UX
- CMS Operator
- SEO
- AEO
- Measurement
- QA
- Release
- Post-Launch Intelligence

All agents use `propose → review → approve → execute`. The following are hard constraints:

- no autonomous production publish in V1;
- typed input/output schemas and idempotency keys;
- least-privilege capabilities and client/environment scope;
- audit record for every mutation and approval;
- secrets never exposed to the model;
- deterministic validators before release;
- preview and rollback reference required for production publication;
- human escalation for legal, brand, privacy, security and material scope changes;
- provider failure must degrade honestly and never be reported as success.

## Non-disruptive integration principle

The product must support a progressive adoption path:

```text
Observe → Connect → Assist → Governed write → Co-operate → Optional managed operation
```

The client can start without changing its CMS, IAM, approval tool, analytics stack or deployment platform. The first
value can come from inventory, dependency mapping, preflight, evidence and coordination. Write capabilities are
added only when the client authorizes the adapter, scope, environment and rollback contract.

The product must prefer existing client primitives—SSO, API gateway, CI/CD, ticketing, approval, secrets, logging
and monitoring—over parallel replacements. Browser automation is a last-resort compatibility path, not the durable
integration contract.

## Adapter strategy

Adapters must expose capabilities rather than vendor-shaped assumptions:

- inspect inventory and permissions;
- create/update draft;
- preview and compare;
- attach metadata and structured data;
- run preflight;
- request/record approval;
- publish approved release;
- verify URL, indexability, events and telemetry;
- rollback or open a governed remediation.

Modyo, Drupal/Acquia, WordPress/Astro, headless CMS and future platforms remain replaceable adapters. The same
principle applies to DAM, PIM, analytics, CRM, identity, ITSM and CI/CD systems. Discovery
must verify API, webhook, preview, workflow, permissions, environments and rollback before an adapter is promised.

## Security, privacy and compliance

The client remains authoritative for data, approvals, identities and production access. Every implementation must
define tenant isolation, secret storage, signed requests, provider/subprocessor inventory, data retention, consent,
PII handling, audit retention and incident escalation. Regulated clients require a compliance lane in the
Dependency Graph, not an informal final review.

Supporting companions:

- [`Stack & Reference Architecture`](EFEONCE_EXPERIENCE_LAUNCHOPS_STACK_REFERENCE_ARCHITECTURE_V1.md)
- [`Security & Threat Model`](EFEONCE_EXPERIENCE_LAUNCHOPS_SECURITY_THREAT_MODEL_V1.md)
- [`Agent Assurance & Evaluation Model`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENT_ASSURANCE_EVALUATION_MODEL_V1.md)
- [`Cloud & Deployment Operating Model`](../operations/EFEONCE_EXPERIENCE_LAUNCHOPS_CLOUD_DEPLOYMENT_OPERATING_MODEL_V1.md)
- [`Operations, SRE & Support Model`](../operations/EFEONCE_EXPERIENCE_LAUNCHOPS_OPERATIONS_SRE_SUPPORT_MODEL_V1.md)
- [`Legal, Contract & Data Processing Pack`](../business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_LEGAL_CONTRACT_DATA_PROCESSING_PACK_V1.md)
- [`Enterprise Readiness & Procurement Pack`](../business-models/experience-launchops/EXPERIENCE_LAUNCHOPS_ENTERPRISE_READINESS_PROCUREMENT_PACK_V1.md)

## Relationship to existing Greenhouse work

`EPIC-019` and its architecture govern Greenhouse's own public-site control plane and internal runtime. They are
reusable implementation evidence and may provide patterns/adapters, but they do not make Greenhouse the customer
product or authorize exposing internal capabilities to clients.

## Alternatives considered

### Build a new CMS

Rejected. The problem is orchestration and release governance across existing systems, not lack of another CMS.

### Build a generic AI landing-page generator

Rejected. It does not solve approvals, dependencies, measurement, compliance, CMS integration or time-to-live.

### Productize only SEO/AEO

Rejected. Search Visibility 360 is complementary; the bottleneck includes launch operations and release.

### Make Greenhouse the product

Rejected for the commercial boundary. Greenhouse is the internal operating platform; Efeonce is the client face
and Wave is the product brand.

### Replace the client's CMS/DXP with a new platform

Rejected. Enterprise adoption depends on preserving sunk investment, existing governance, team skills, contracts and
system ownership. Migration can be a separate client program, but it is not a prerequisite for LaunchOps.

## Consequences

Positive: reusable delivery IP, measurable time-to-market improvement, stronger composition across Wave families,
and a defensible agentic operating model.

Costs/risks: adapter maintenance, integration/security work, difficult attribution of causality, and risk of
custom-services drift. The first pilot must be narrow and managed.

## Revisit when

- the first CMS adapter cannot support required preview/approval/rollback;
- client approvals remain the dominant bottleneck after instrumentation;
- cost-to-serve exceeds the validated value case;
- a client requires self-service or autonomous publishing with materially different liability;
- the product boundary with EPIC-019 or Search Visibility 360 becomes ambiguous.
