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
