# HubSpot as a Service - Kortex Operating Model

> **Created:** 2026-07-16
> **Scope:** managed HubSpot delivery for client portals, starting with ANAM
> **Agent entry point:** `.codex/skills/hubspot-as-a-service/SKILL.md` and Claude mirror

## Purpose

This layer documents how Efeonce turns HubSpot configuration into a governed client service. It connects RevOps design, portal operations, Customer Agent, CMS/chat entry, QA, handoff and business measurement without merging their technical ownership.

## Architecture seams

| Layer | Canonical owner |
|---|---|
| Commercial offer and partner economics | `hubspot-solutions-partner` |
| Managed delivery and client operating loop | `hubspot-as-a-service` |
| Kortex OAuth and HubSpot CMS/landing | `docs/architecture/kortex/hubspot-cms/` |
| Greenhouse write bridge/webhooks | `hubspot-greenhouse-bridge` |
| CRM connector operations | installed HubSpot connector and authenticated Agent CLI |

## Service contract

Every engagement follows:

```text
intake -> inventory -> design -> propose -> approve -> dry-run/draft
       -> execute -> read-back -> workflow/conversation QA -> document -> measure
```

The service owns the business contract and evidence. Each underlying platform owner still controls its API, runtime and safety rules.

## ANAM implementation

The ANAM landing and Customer Agent are one experience with two deployment surfaces:

1. The CMS React landing captures the visitor's intent and opens the chat.
2. Customer Agent resolves documented questions, gathers service-specific context and hands off only when a human action is required.

The current seam uses `anam_intent` query parameters and chatflow targeting. Composer prefill is not a supported guarantee. See [`../hubspot-cms/anam-chat-landing.md`](../hubspot-cms/anam-chat-landing.md).

Knowledge owned by this service remains Markdown so it can be reviewed, diffed and reloaded. Persona, knowledge, instructions, actions and handoff remain separate configuration contracts.

## RevOps expansion

Requests from client emails or Notion tasks are intake, not executable schema. Before creating properties, convert each request into a governed data dictionary with object, standard-property check, internal name, type/options, source, ownership, required stage, backfill, consumers and privacy classification.

## Evidence and client reporting

- Runtime read-back is stronger than a saved portal screen.
- Conversational QA counts scenarios and turns separately.
- Reports distinguish platform limitation from configuration defect.
- Client-facing metrics include baseline, period, denominator and definition.
- External use of ANAM as a named case requires authorization.

## Current ANAM artifacts

- Landing/runtime: [`../hubspot-cms/anam-chat-landing.md`](../hubspot-cms/anam-chat-landing.md)
- Portal access: [`../hubspot-cms/anam-portal-access.md`](../hubspot-cms/anam-portal-access.md)
- QA report: [`../../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`](../../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- RevOps discovery: [`anam-revops-discovery-2026-07-16.md`](anam-revops-discovery-2026-07-16.md)
- Meeting synthesis and target object model: [`anam-revops-meeting-synthesis-2026-07-16.md`](anam-revops-meeting-synthesis-2026-07-16.md)
- Commercial-first operating model and gap plan: [`anam-commercial-first-operating-model-2026-07-16.md`](anam-commercial-first-operating-model-2026-07-16.md)
- Runtime schema readback: [`anam-hubspot-schema-readback-2026-07-16.md`](anam-hubspot-schema-readback-2026-07-16.md)
- Executed low-risk RevOps change set: [`anam-revops-change-set-2026-07-16.md`](anam-revops-change-set-2026-07-16.md)
- Property governance and dashboard gates: [`anam-revops-property-governance-2026-07-16.md`](anam-revops-property-governance-2026-07-16.md)

## Operational dependency

ANAM confirmed on 2026-07-16 that Customer Agent and 30,000 credits were purchased. The one-day notice observed during QA preceded the start of paid-credit consumption; it was not a trial-expiry or agent-deactivation warning. There is no current licensing continuity blocker, but credit consumption remains an operating metric.
