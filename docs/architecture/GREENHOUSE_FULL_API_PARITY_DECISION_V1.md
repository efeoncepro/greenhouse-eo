# Greenhouse Full API Parity Decision V1

## Status

`Accepted`

## Date

2026-06-03

## Owner

Platform / API Platform, with Product domain owners.

## Scope

- Greenhouse UI capabilities and product workflows.
- Product API routes under `src/app/api/**`.
- API Platform lanes under `src/app/api/platform/**`.
- Server-side primitives under `src/lib/**`.
- MCP adapters, first-party apps, sister platforms, CLIs and runbooks that consume Greenhouse programmatically.

## Reversibility

`Two-way but slow`

Greenhouse could relax this principle later, but undoing it would require changing task/process docs, API Platform architecture, MCP/app planning and domain implementation expectations. The larger cost is cognitive debt: new UI-only workflows would become harder to automate, audit and recover.

## Confidence

`High`

## Validated as of

2026-06-03 — validated against current repo architecture, API Platform docs, task backlog and agent operating rules.

## Context

Greenhouse is not only a web portal; it is becoming the operational control plane for client lifecycle, finance/payables, workforce, assets, notifications, recovery operations, creative workflows, MCP adapters and future first-party clients. If a business capability can only be executed by clicking through the UI, it cannot be safely automated by agents, integrated with sister platforms, exposed to mobile clients, retried in recovery flows, audited consistently or governed through stable contracts.

The repo already has API Platform foundations (`api/platform/ecosystem`, `api/platform/app`, event control plane, Platform Health) and domain Product APIs, but the coverage is uneven. Several high-value workflows still risk growing as UI-first implementations with hidden business logic in components or route-specific handlers. Greenhouse needs a durable rule that every real capability has a programmatic contract path, without accidentally turning every button into an ad hoc public endpoint.

## Decision

Greenhouse adopts **full API parity** as a product/platform principle:

> Every capability that can be executed inside Greenhouse must be executable, or have an explicit planned path to be executable, through a governed programmatic contract.

Parity is evaluated at the **business capability** level, not at the UI component level. The UI is a client of canonical server-side primitives, commands, readers and projections; it is not the source of truth for business logic.

### North Star: Nexa total operability (CEO directive, 2026-06-19)

The driving purpose of full API parity is that **Nexa Agent must eventually be able to operate the ENTIRE portal from the Conversational Experience** — every business capability reachable through Nexa, not only through screens. This elevates parity from "agent-ready as a benefit" to a **hard product mandate**:

- Every **new UI** and every **new capability/entitlement** must be born with its governed programmatic contract that Nexa's action runtime can invoke.
- Reads are consumed directly; **writes go through the governed-action loop `propose → confirm → execute`** — the LLM never executes a write directly; mutation happens only at the human confirmation endpoint (see `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` + `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`).
- UI and Nexa are **two clients of the same canonical primitive**, never two implementations of the same logic.
- Mandatory design-time question for any feature: **"can Nexa do this end-to-end through a contract?"** If no, the feature is not complete.

This does not grant Nexa raw write power: parity guarantees the *contract path exists and is governed*; the confirm step and capability/authorization gates still apply.

### Canonical consumers (declared)

Every governed capability is consumed by a **single canonical server-side primitive** (command/reader/projection); the following are all **clients** of that primitive, never parallel implementations. A capability is "parity-complete" only when its contract serves the consumers it needs across this set:

| # | Consumer | What it is | Path / surface |
|---|---|---|---|
| 1 | **UI (web portal)** | Human-facing Next.js views/components | reads via readers, writes via Product API → canonical command |
| 2 | **Nexa Agent (Conversational Experience)** | The North Star: operate the entire portal conversationally | action-runtime: reads direct, writes via `propose → confirm → execute` |
| 3 | **MCP / downstream agents** | External agents (Claude, etc.) operating Greenhouse | MCP adapters over `api/platform/ecosystem/*` |
| 4 | **First-party apps (app lane)** | Future mobile/desktop/native Greenhouse clients | `api/platform/app/*` |
| 5 | **Ecosystem / sister platforms** | Peer systems: Kortex (CRM/HubSpot), public site `efeonce-web`, `notion-bigquery` sync | `api/platform/ecosystem/*` |
| 6 | **Inbound integrations / webhooks** | HubSpot, Notion, Teams, ZapSign, Entra/SCIM, GCP/Azure — trigger commands | webhook bus → canonical command (idempotent) |
| 7 | **Teams Bot** | Operate/announce capabilities from Microsoft Teams | bot → Product/Platform contract |
| 8 | **Async runtime (crons / workers / reactive)** | Cloud Run ops-worker, Cloud Scheduler, outbox publisher, reactive projections, materializers, recovery flows | server-side commands/readers (no UI) |
| 9 | **CLI / runbooks / scripts** | `pnpm` operational tooling, agent scripts, ops runbooks | canonical primitives / Product API |
| 10 | **E2E / verification harness** | Playwright + agent auth, smoke/contract tests | same contracts as UI/agents (no private back doors) |

Hard rule: if a new behavior is reachable by **any** of these consumers, the business logic must live in the canonical primitive and be exposed through a governed contract — not duplicated per consumer. New consumer classes (e.g. a future voice or email channel) inherit the same contract automatically.

## Alternatives Considered

### Alternative 1: UI-first, API-on-demand

Build UI workflows first and add APIs only when a concrete external consumer asks for them. Rejected because it creates hidden business logic, late refactors, inconsistent auth/audit/idempotency and weak agent/MCP readiness.

### Alternative 2: Public API for every UI action

Expose every visible action as an endpoint. Rejected because it expands attack surface, couples contracts to UI structure, creates noisy API sprawl and bypasses aggregate/resource/command modeling.

### Alternative 3: Read-only API parity only

Guarantee reads through API Platform but keep writes mostly UI-only. Rejected because the highest-value Greenhouse workflows are operational commands: onboarding, approvals, payment preparation, retries, recovery, notification actions and lifecycle transitions.

### Alternative 4: Domain-local Product APIs only

Allow each domain to define whatever `/api/<domain>/**` routes it needs and stop there. Rejected as incomplete: Product APIs can remain valid internal implementation details, but reusable app/ecosystem/MCP contracts need shared API Platform governance.

## Consequences

### Positive

- Makes Greenhouse agent-ready: Nexa, MCP, CLI and sister-platform consumers can act through governed contracts instead of screen scraping or manual instructions.
- Reduces duplicate business logic by forcing UI to reuse server-side primitives.
- Improves auditability and recovery because writes must declare command semantics, authorization, idempotency where needed and observable outcomes.
- Gives future first-party apps and integrations a clear path that does not depend on web UI internals.
- Turns API parity into a design-time requirement for new tasks rather than a late retrofit.

### Negative

- Adds design and documentation work to new feature planning.
- Increases pressure on API Platform foundations such as command/idempotency, resource authorization, OpenAPI stability and lifecycle/deprecation.
- Can slow small UI features when they are actually business capabilities in disguise.
- Requires discipline to avoid over-exposing internal actions or leaking implementation details as API contracts.

### Neutral / contextual

- Full API parity does not mean all endpoints are public.
- Product API, `api/platform/app`, `api/platform/ecosystem`, MCP downstream, CLI/runbook and explicit follow-up tasks are all valid programmatic paths depending on audience and sensitivity.
- Temporary UI-only exceptions are allowed only when documented as debt with owner, rationale and removal condition.

## Runtime Contract

Future Greenhouse work must apply these rules:

- Business logic lives in canonical server-side primitives (`src/lib/**` commands/readers/projections), not only in UI components.
- New visible capabilities must declare their programmatic path: Product API, `api/platform/app/*`, `api/platform/ecosystem/*`, MCP downstream, CLI/runbook or explicit deferred task.
- **Nexa-operability is part of "done":** every new UI/capability must validate that Nexa can consume it (read) and/or action it (write via `propose → confirm → execute`). A UI-only or capability-only delivery without its Nexa-invokable contract is incomplete (North Star above).
- Programmatic writes require command semantics, tenant-safe authorization, sanitized errors, observability, audit/outbox when applicable and idempotency when retries are possible.
- API contracts model aggregates, resources and commands, not buttons, tabs, components or page-specific handlers.
- API Platform docs and tasks remain the canonical path for shared app/ecosystem/MCP contracts:
  - `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
  - `docs/tasks/to-do/TASK-650-api-platform-domain-read-surfaces-program.md`
  - `docs/tasks/to-do/TASK-655-api-platform-command-idempotency-foundation.md`
  - `docs/tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md`
  - `docs/tasks/to-do/TASK-660-api-platform-openapi-stable-contract.md`
  - `docs/tasks/to-do/TASK-661-api-platform-lifecycle-deprecation-policy.md`
- The first execution program is `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md`.

## Revisit When

Reopen this decision if:

- API Platform foundations cannot support command/idempotency or resource authorization without unacceptable complexity.
- A future security review finds the parity principle is causing over-exposure rather than governed contracts.
- Greenhouse changes direction away from agent/app/sister-platform operability.
- A better platform abstraction replaces REST/API Platform/MCP as the primary programmatic contract layer.

## Related Documents

- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/tasks/to-do/TASK-1002-full-api-parity-first-wave-program.md`
- `AGENTS.md`
- `CLAUDE.md`
- `docs/api/GREENHOUSE_API_PLATFORM_V1.md`
- `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
