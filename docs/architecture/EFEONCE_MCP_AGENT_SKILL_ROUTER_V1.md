# Efeonce MCP Agent Skill Router V1

> **Status:** Accepted operational contract
> **Date:** 2026-08-01
> **Owner:** Efeonce Platform
> **Implementation:** [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md)
> **Gateway decision:** [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)

## Purpose

`efeonce-mcp-platform` is the shared Codex/Claude router for work that changes or operates the federated MCP
platform. It routes agents to the owning domain skill and canonical runtime evidence; it is not a second source of
truth for any product, provider or cloud subsystem.

The two versioned bundles are intentionally mirrored:

- `.codex/skills/efeonce-mcp-platform/`
- `.claude/skills/efeonce-mcp-platform/`

`pnpm skills:mirrors` makes drift in the declared mirrors a failing local check.

El gateway público ya opera el reader interno y read-only `globe.producer.fleet.list`. Eso no cambia la postura
por defecto de una capacidad nueva ni autoriza acceso de clientes: Entra es sólo el canary interno. El acceso
B2B/multitenant sigue bloqueado hasta que la identidad cliente propuesta, el binding Account 360 y el provider
puedan aplicar y revocar entitlements por tenant y capability según
[`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
y `TASK-1631`.

## Invocation boundary

Use the router for `mcp.efeonce.org`, remote MCP transport, protected-resource OAuth, tools/resources/prompts,
provider federation, Cloud Run/front-door/DNS/TLS operation, or MCP client interoperability.

Do not invoke it merely because an agent uses an MCP tool. Do not use it for a product-local Globe or Greenhouse
change that does not cross the MCP boundary; load the product skill directly. Browser-only WebMCP is a separate
surface.

## Composition contract

| Concern | Required composition | Owner remains |
| --- | --- | --- |
| Shared boundary, tool contract, API parity or new public surface | `software-architect-2026` | Architecture/ADR and product contract |
| Cloud Run, WIF, service identity, OAuth, ALB, DNS, TLS or secret | applicable cloud skill + `greenhouse-secret-hygiene` | Gateway IaC/runbook |
| Globe provider or creative capability | `greenhouse-globe` + creative-rights governance when applicable | Globe API/SDK/policy; `TASK-1473` gates federation |
| HubSpot/CRM or Teams provider | owning HubSpot or Teams skill | provider contract, consent and tenancy |
| Release, rollback or live evidence | `greenhouse-production-release` and `greenhouse-qa-release-auditor` | release/runbook and evidence |
| Task/ADR split, docs, skill evolution | `greenhouse-task-planner` and `greenhouse-documentation-governor` | Greenhouse control plane |

The router only translates verified identity and MCP transport into a narrow provider call. It never acquires direct
database, storage or upstream-provider access, chooses domain policy, or substitutes UI/API/SDK parity.

## Mandatory gates

1. Classify the work as gateway-only, provider-only or cross-runtime; name its owner and source of truth.
2. For each capability, record scope, verified tenant boundary, canonical downstream reader/command/API, redaction,
   timeout, concurrency, error contract, evidence and rollback.
3. Keep every provider o capability nueva `OFF`, read-only and fail-closed until package/API version, IAM allowlist,
   allow/deny, fault isolation and provider canary pass. La excepción operativa actual es sólo
   `globe.producer.fleet.list`, interno; mantenerla habilitada exige conservar esa evidencia, no extenderla.
4. Keep OAuth caller identity separate from downstream workload identity. Never log bearer tokens, auth codes,
   sensitive prompts, raw payloads or upstream errors.
5. Treat writes, approvals, spend, rights-sensitive actions, new auth surfaces and webhooks as independent
   ADR/task work.
6. Before calling a public runtime operational, require DNS/TLS, discovery, unauthenticated denial and authenticated
   MCP client evidence. Para acceso externo, además prueba una identidad que reciba sólo los scopes/entitlements
   concedidos; el cliente Entra interno actual recibe ambos scopes y no demuestra ese deny por persona. A compiled
   adapter is not rollout evidence.

## Maintenance

Update both mirrors in the same change. Keep `SKILL.md` as a compact router and move repeatable checklists into its
`references/` directory. Update `AGENTS.md`, `CLAUDE.md`, the machine router and the relevant task/runbook whenever
the workflow or a gate changes. Validation is defined in the skill and includes `pnpm skills:mirrors`.
