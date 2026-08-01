---
name: efeonce-mcp-platform
description: Design, expose, secure, deploy, troubleshoot, or verify Efeonce MCP capabilities and providers. Use for requests involving mcp.efeonce.org, Streamable HTTP, MCP tools/resources/prompts, OAuth resource servers, provider federation, MCP client interoperability, MCP Cloud Run/front-door/TLS incidents, or adding an Efeonce product capability to MCP. Route each domain concern to its owner skill; do not use for browser-only WebMCP work.
---

# Efeonce MCP Platform

Use this skill as the control-plane router for Efeonce MCP. The gateway is a neutral adapter: it owns transport,
OAuth validation, discovery, routing, redaction and operational isolation. Products own business logic, data,
entitlements, providers and their canonical readers/commands.

## First reads

Read, in order:

1. `AGENTS.md`, `project_context.md` and `Handoff.md`.
2. [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](../../../docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md),
   [`EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`](../../../docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) and active
   [`TASK-1626`](../../../docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md).
3. The provider's canonical architecture, task and live runtime handoff.
4. The smallest reference below that matches the work.

If a source conflicts with remembered behavior, the verified runtime and its canonical architecture win.

## Hard rules

- Keep `https://mcp.efeonce.org/mcp` as the single canonical resource. Do not create a second OAuth resource for an alias.
- Default every provider to disabled, read-only and fail-closed. An absent or degraded provider must not expose data,
  execute a tool or make discovery fail for healthy providers.
- A tool delegates only to a provider's canonical API, reader or command. Never add domain business logic, direct DB,
  storage or creative-provider SDK access to the gateway.
- Keep human OAuth separate from the gateway's downstream service identity. Validate issuer, audience, expiry and
  scopes before MCP dispatch; never log tokens, auth codes, raw bodies or secrets.
- Derive tenant/workspace from verified identity and provider policy. Never accept a free-form tenant boundary.
- Treat writes, approvals, spending, rights-sensitive creative work, webhooks and new public auth surfaces as new
  ADR/task work. Do not infer permission from a read-only MCP capability.
- Do not call a product deployment successful because its MCP adapter compiled. Require provider allow/deny/fault
  evidence and a public gateway smoke.
- Keep the Codex and Claude bundles byte-identical. Update both in the same change and verify the diff.

## Choose the route

| Work | Load in addition to this skill | Canonical boundary |
| --- | --- | --- |
| Gateway, provider registry, API boundary or shared contract | `software-architect-2026` | Architecture + ADR/task before code |
| Cloud Run, ALB, DNS, TLS, WIF, OAuth config or secrets | `cloud-run-basics`, `greenhouse-secret-hygiene` | Runbook; no keys or unsafe bypasses |
| Globe capability, creative asset, model or workspace policy | `greenhouse-globe`, `greenhouse-ai-creative-rights-governance` | Globe owns API/SDK/policy; `TASK-1473` gates federation |
| HubSpot or service-intake capability | `hubspot-greenhouse-bridge` or `hubspot-as-a-service` | Provider owns CRM contract and consent |
| Teams-facing capability | `teams-bot-platform` | Teams platform owns tenant, consent and delivery |
| Product UI/agent parity | Relevant product skill plus `software-architect-2026` | UI/API/MCP consume the same command or reader |
| Release, rollback or production promotion | `greenhouse-production-release` | Release control plane owns promotion and rollback |
| New capability split, write or ADR/task scope | `greenhouse-task-planner` | Product owner keeps its task and decision |
| Tests, rollout, incident or live verification | `greenhouse-qa-release-auditor` | Evidence is proportional and runtime-honest |
| Docs, task lifecycle or skill change | `greenhouse-documentation-governor` | Update canonical docs and both skill mirrors |

For a domain not listed here, use the `AGENTS.md` router. Do not invent an adapter instead of loading the owner skill.

## Delivery loop

1. **Classify.** Identify gateway-only, provider-only or cross-runtime work. Name the product owner, source of truth,
   access model, tool class and whether the action is read or write.
2. **Contract.** Define a narrow capability name, input/output schema, scope, provider policy, canonical downstream
   reader/command, error/redaction behavior, timeout and rollback. Use
   [`capability-intake.md`](references/capability-intake.md).
3. **Gate.** For shared API/auth/cloud/workflow changes, identify or propose an ADR and task before implementation.
   For Globe, preserve the `TASK-1473` package/API/IAM gate.
4. **Implement.** Keep gateway transport and provider adapter thin. Pin downstream contracts, set explicit timeouts and
   correlation IDs, and keep providers disabled until their canary passes.
5. **Verify.** Run local contract tests, auth-negative tests and provider allow/deny/fault tests. For public exposure,
   also prove DNS, TLS, protected-resource metadata, unauthenticated rejection and an authenticated MCP initialize.
   Use [`verification-matrix.md`](references/verification-matrix.md).
6. **Close.** Update the architecture/runbook/task/handoff that own the change, sync both skill bundles, then run the
   proportional QA and documentation gates. State `complete`, `code complete, rollout pendiente` or
   `operativamente bloqueado` without euphemisms.

## Incident path

For TLS/DNS/OAuth/provider failure, fail closed first. Read the MCP runbook, identify the layer (DNS, certificate,
ALB, Cloud Run ingress, OAuth, registry or provider), capture redacted evidence and use the product owner's rollback.
`FAILED_NOT_VISIBLE` for a Google-managed certificate is not a reason to make `/mcp` anonymous or bypass the load
balancer; verify all A/AAAA answers, proxy attachment, port 443 and certificate-map precedence, then allow Google
to retry while the managed status remains `PROVISIONING`.

## References

- [`capability-intake.md`](references/capability-intake.md): capability and provider contract checklist.
- [`verification-matrix.md`](references/verification-matrix.md): minimum evidence by change and public-edge incident.
