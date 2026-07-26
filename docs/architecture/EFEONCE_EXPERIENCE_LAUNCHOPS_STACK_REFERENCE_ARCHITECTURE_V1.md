# Efeonce Experience LaunchOps — Stack & Reference Architecture V1

> **Status:** Proposed / pilot architecture
> **Date:** 2026-07-26
> **Owner:** Wave + Product/Architecture
> **Parent:** [`EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)

## 1. Purpose

Define the technology envelope for a CMS-agnostic, non-disruptive product service without locking the product
prematurely to a vendor, cloud, model or CMS. The first implementation is a managed service with a thin reusable
control plane; the pilot must prove the operating model before expanding platform surface area.

## 2. Reference shape

```text
Client users / Efeonce team
          ↓
Operator UI + Client approval surfaces
          ↓
Launch Control Plane API
  launches · specs · policies · controls · approvals · evidence
          ↓
Workflow/worker layer ─ Agent gateway ─ Deterministic validators
          ↓
Adapters: CMS · preview · release · SEO/AEO · measurement · notifications
          ↓
Client-owned CMS/DXP · DAM/PIM · analytics · CRM · IAM · ITSM · CI/CD
```

Cross-cutting: identity, tenant isolation, secrets, audit, provenance, observability, cost metering, backups and
recovery.

The client systems remain authoritative. LaunchOps stores coordination state and references, not a shadow copy of
the client's entire platform. Integration mode is explicit: `observe-only`, `assistive`, `governed-write` or
`client-operated`.

## 3. Stack envelope

| Layer | Required property | Decision status |
| --- | --- | --- |
| UI | Operator-first, approval-aware, accessible, no direct provider credentials | Must exist; technology open |
| API | Typed commands/readers, capability-gated, idempotent, server-side provider access | Must exist |
| Workflow | Durable state, retries, timeouts, compensation and human wait states | Must exist |
| Agent gateway | Provider-neutral model invocation, tool registry, policy context and budgets | Must exist |
| Deterministic checks | SEO/AEO, accessibility, performance, tracking, security and release validators | Must exist |
| Adapter layer | CMS/runtime/provider capabilities, versioned contract and health | Must exist |
| Operational data | Relational source for launch state and permissions | Pilot selection pending |
| Evidence store | Immutable/indexed artifacts and redacted logs | Must exist |
| Telemetry | Metrics, traces, structured logs and business signals | Must exist |
| Delivery | CI/CD, IaC, environment promotion, rollback and drift detection | Must exist |

Vendor selection follows pilot constraints: client residency, identity, CMS APIs, procurement, security and cost.
Do not promise a specific cloud or model provider as part of the product category.

## 4. Integration posture

LaunchOps must reuse client SSO, API gateways, ticketing, approvals, CI/CD, secrets and observability when available.
It should be deployable as a managed external service, client-tenant-isolated service or client-controlled runtime
according to data, procurement and residency constraints. A replacement platform, migration or parallel CMS is not
required for adoption.

## 5. Canonical contracts

The platform must center on `LaunchRequest`, `ExperienceSpec`, `SearchContract`, `MeasurementContract`,
`DependencyGraph`, `ControlRequirement`, `ReleaseCandidate`, `ApprovalRecord` and `LaunchEvidence`.

Adapters must not become source of truth. They translate canonical contracts to target systems and return typed
results, external identifiers, provenance, health and failure state.

## 6. Quality scenarios

- A revoked approver cannot approve or publish a release.
- A duplicated command with the same idempotency key does not create a second external mutation.
- A provider timeout becomes `unknown/degraded`, not `succeeded`.
- A release can be traced from brief to artifact, external target, approval and verification.
- A client can export its evidence and configuration without vendor lock-in.
- A failed adapter does not prevent manual governed delivery when the service contract permits fallback.

## 7. Stack selection gates

Before implementation commitment, validate identity/tenant model, client data handling, queue/workflow semantics,
model/provider terms, CMS preview and rollback, evidence retention, cost p50/p95, recovery and operational ownership.

## 8. Non-goals

No generic page builder, no autonomous production publishing, no CMS/DXP replacement or forced migration, no
provider-specific product identity and no platform microservices decomposition without measured need.
