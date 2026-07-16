---
name: hubspot-as-a-service
description: "Deliver and operate HubSpot as a managed client service: portal discovery, RevOps design, CRM properties and pipelines, Customer Agent configuration, Markdown knowledge, landing/chat integration, conversational QA, human handoff, rollout, measurement, and client reporting. Use for client HubSpot implementation or managed operations, especially ANAM; do not use for generic HubSpot selling, the Greenhouse write bridge, or CMS-only implementation."
---

# HubSpot as a Service

Operate HubSpot as an accountable managed service, not as a collection of portal clicks.

## Load first

1. Read `project_context.md`, `Handoff.md`, `docs/context/00_INDEX.md`, and client-specific context.
2. Read [service-delivery.md](references/service-delivery.md) for the delivery loop and evidence contract.
3. Load only the workstream reference needed:
   - Customer Agent: [customer-agent.md](references/customer-agent.md)
   - RevOps/schema: [revops-schema.md](references/revops-schema.md)
   - ANAM: [anam-case.md](references/anam-case.md)
4. When the work derives from a sold implementation, read `../hubspot-solutions-partner/modules/12_IMPLEMENTACION.md`; for agents, also read `../hubspot-solutions-partner/modules/13_AGENTES.md`. Product claims and prices remain owned by that skill's `SOURCES.md`.

## Boundary router

| Need | Owner |
|---|---|
| Sell, scope, price, partner economics, HubSpot product narrative | `hubspot-solutions-partner` + `commercial-expert` |
| Operate CRM records through the installed connector | `hubspot:hubspot` |
| Greenhouse-to-HubSpot Cloud Run bridge, webhooks, secrets | `hubspot-greenhouse-bridge` |
| HubSpot CMS/landing/theme implementation | `docs/architecture/kortex/hubspot-cms/` and the CMS runbook |
| Public Efeonce HubSpot landing positioning | `docs/public-site/` + `efeonce-public-site-wordpress` |
| Client RevOps, portal configuration, Customer Agent, QA and managed operation | **this skill** |

Do not conflate portal IDs, OAuth apps, CLI profiles, private-app tokens, Kortex OAuth, or the Greenhouse bridge.

## Operating loop

Run `intake -> inventory -> design -> propose -> approve -> dry-run/draft -> execute -> verify -> document -> measure`.

1. **Intake:** gather client outcomes, users, current process, source documents, constraints, owners and approval authority.
2. **Inventory:** inspect existing objects, properties, pipelines, workflows, forms, knowledge, channels, licenses, permissions and integrations before creating anything.
3. **Design:** produce the target contract: source of truth, object/property schema, lifecycle, routing, agent autonomy, handoff and measurements.
4. **Propose:** show exact writes and impacts. Reuse standard properties before custom ones.
5. **Approve:** obtain human confirmation for schema writes, workflow activation, publication, permissions, destructive changes and external messages.
6. **Execute:** prefer authenticated connector, Agent CLI or governed API. Use `--dry-run` where supported. Keep CMS changes draft-first.
7. **Verify:** read back configuration and test real workflows. A saved setting is not evidence of effective runtime behavior.
8. **Document:** update Kortex/client operating docs, decision log, QA report and handoff.
9. **Measure:** baseline and track business outcomes, exceptions, human handoffs, unresolved intents and data quality.

## Non-negotiable controls

- Never create a property because an email names a field. Confirm object, internal name, type, options, source, owner, requiredness, backfill and downstream consumers.
- Never treat Customer Agent persona, knowledge, actions and handoff as one prompt. They are separate contracts.
- Keep Customer Agent knowledge sources in Markdown when this service owns the content.
- Do not promise API parity. Verify whether a setting is available through CRM APIs, Customer Agent APIs, Agent CLI, CMS APIs or only the authenticated UI.
- Do not publish, activate workflows, change licenses/permissions, or perform destructive writes without explicit approval.
- Do not report a conversational test as passed from one prompt. Test multi-turn memory, natural phrasing, technical accuracy, escalation and failure modes.
- Native HubSpot transfer/system messages can pre-empt trained answers. Record this as a platform behavior and improve the transfer copy; do not hide it.
- All client-facing metrics require period, baseline, denominator, definition and evidence. ANAM naming in external case studies requires authorization.

## Required outputs

For non-trivial engagements, leave:

- portal inventory and access boundary;
- RevOps data dictionary/change set;
- Customer Agent source pack and handoff matrix when applicable;
- execution log with approvals and read-back evidence;
- QA report with scenario/turn counts and residual risks;
- Kortex/client documentation and next-step backlog.

## Completion gate

Close only when the configured runtime was verified, documentation matches it, rollback or recovery is understood, and external dependencies such as licenses, credits, trial expiry, publication or human availability are explicit.
