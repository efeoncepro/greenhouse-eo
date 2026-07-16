# HubSpot as a Service - Greenhouse Canon

> **Created:** 2026-07-16
> **Scope:** managed HubSpot delivery for client portals, starting with ANAM
> **Agent entry point:** `.codex/skills/hubspot-as-a-service/SKILL.md` and Claude mirror

## Canon and repository ownership

This Greenhouse directory is the source of truth for the managed-service method, ANAM client context, RevOps decisions, Customer Agent evidence and cross-platform handoff. It remains here so operators and agents have one visible, reviewable record.

**Client boundary:** ANAM is an Efeonce client. Its HubSpot portal, CRM records and dashboards belong to that client engagement; they are not Greenhouse product/runtime capabilities or Efeonce business data. Greenhouse owns only the canonical documentation, decisions, QA and skills for the engagement. Kortex supplies the approved portal-scoped execution path.

- Codex and Claude skills are owned by Greenhouse at `.codex/skills/hubspot-as-a-service/` and `.claude/skills/hubspot-as-a-service/`.
- Customer Agent QA is owned by Greenhouse under `docs/audits/`.
- ANAM CMS, landing and portal-access documentation is owned by Greenhouse under `docs/architecture/kortex/hubspot-cms/`.
- The Kortex repository owns only its executable implementation: OAuth manifests, runtime capability normalization, CMS project source, tasks, builds and deployment evidence.
- Kortex may reference this canon but must not fork or silently duplicate the service method or client record.

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

- Fresh-session continuation entry point: [`anam-next-session-handoff-2026-07-16.md`](anam-next-session-handoff-2026-07-16.md)
- Landing/runtime: [`../hubspot-cms/anam-chat-landing.md`](../hubspot-cms/anam-chat-landing.md)
- Portal access: [`../hubspot-cms/anam-portal-access.md`](../hubspot-cms/anam-portal-access.md)
- QA report: [`../../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`](../../../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- RevOps discovery: [`anam-revops-discovery-2026-07-16.md`](anam-revops-discovery-2026-07-16.md)
- Non-agent email attachment synthesis for Tickets, billing and market KPIs: [`anam-email-attachment-synthesis-2026-07-16.md`](anam-email-attachment-synthesis-2026-07-16.md)
- Original non-agent Outlook attachment archive and provenance manifest: [`anam-source-attachments-2026-07-16/`](anam-source-attachments-2026-07-16/)
- Attachment-by-attachment HubSpot migration/configuration classification: [`anam-attachment-hubspot-classification-2026-07-16.md`](anam-attachment-hubspot-classification-2026-07-16.md)
- Converged Account Unit + Billing Event model for the two migration candidates: [`anam-account-unit-billing-event-converged-model-2026-07-16.md`](anam-account-unit-billing-event-converged-model-2026-07-16.md)
- Monthly billing upload/ETL, reconciliation and KPI operating model: [`anam-monthly-billing-etl-operating-model-2026-07-16.md`](anam-monthly-billing-etl-operating-model-2026-07-16.md)
- Managed ANAM billing upload/review UI and GCP data-plane architecture: [`anam-managed-billing-intake-ui-2026-07-16.md`](anam-managed-billing-intake-ui-2026-07-16.md)
- Reusable tenant-scoped billing data model and ANAM workbook contract: [`client-billing-intake-data-model-spec-v1.md`](client-billing-intake-data-model-spec-v1.md)
- Proposed Billing Event architecture decision: [`anam-billing-event-hubspot-decision-v1.md`](anam-billing-event-hubspot-decision-v1.md)
- Billing migration and association dry-run: [`anam-billing-event-migration-dry-run-2026-07-16.md`](anam-billing-event-migration-dry-run-2026-07-16.md)
- Exact Billing Event schema preview and gated change set: [`anam-billing-event-schema-preview-2026-07-16.md`](anam-billing-event-schema-preview-2026-07-16.md)
- Meeting synthesis and target object model: [`anam-revops-meeting-synthesis-2026-07-16.md`](anam-revops-meeting-synthesis-2026-07-16.md)
- Commercial-first operating model and gap plan: [`anam-commercial-first-operating-model-2026-07-16.md`](anam-commercial-first-operating-model-2026-07-16.md)
- Runtime schema readback: [`anam-hubspot-schema-readback-2026-07-16.md`](anam-hubspot-schema-readback-2026-07-16.md)
- Full live-schema reconciliation and target RevOps contract: [`anam-revops-schema-reconciliation-2026-07-16.md`](anam-revops-schema-reconciliation-2026-07-16.md)
- Existing line-item to Product/Service catalog dry run: [`anam-commercial-catalog-dry-run-2026-07-16.md`](anam-commercial-catalog-dry-run-2026-07-16.md)
- Executed low-risk RevOps change set: [`anam-revops-change-set-2026-07-16.md`](anam-revops-change-set-2026-07-16.md)
- Property governance and dashboard gates: [`anam-revops-property-governance-2026-07-16.md`](anam-revops-property-governance-2026-07-16.md)
- Canonical implementation roadmap by phase: [`anam-revops-implementation-roadmap-phases-2026-07-16.md`](anam-revops-implementation-roadmap-phases-2026-07-16.md)
- Phase 1 commercial reporting foundation: [`anam-phase-1-commercial-reporting-foundation-2026-07-16.md`](anam-phase-1-commercial-reporting-foundation-2026-07-16.md)
- Phase 1 outcome reporting execution: [`anam-phase-1-outcome-reporting-change-set-2026-07-16.md`](anam-phase-1-outcome-reporting-change-set-2026-07-16.md)
- Product OAuth diagnosis and Kortex runtime drift: [`anam-product-oauth-diagnosis-2026-07-16.md`](anam-product-oauth-diagnosis-2026-07-16.md)
- Executed Service property schema, readback and gated migration contract: [`anam-service-change-set-2026-07-16.md`](anam-service-change-set-2026-07-16.md)
- Phase 3 panel contracts, live Service readiness and no-write verdict: [`anam-phase-3-panel-first-service-readiness-2026-07-16.md`](anam-phase-3-panel-first-service-readiness-2026-07-16.md)
- Phase 3 governed forward capture, TCV/ARR and property-mechanism contract: [`anam-phase-3-forward-service-capture-contract-2026-07-16.md`](anam-phase-3-forward-service-capture-contract-2026-07-16.md)
- Phase 3 five-row forward-pilot simulation and activation gaps: [`anam-phase-3-forward-pilot-dry-run-2026-07-16.md`](anam-phase-3-forward-pilot-dry-run-2026-07-16.md)
- Final scoped QA verdict: [`../../../audits/ANAM_REVOPS_CHANGE_SET_QA_2026-07-16.md`](../../../audits/ANAM_REVOPS_CHANGE_SET_QA_2026-07-16.md)

The Service artifact is a proposed technical contract, not a live capability. Its functional documentation and operator manuals are intentionally deferred until the proposal is accepted and executed. No new ADR is indexed for this package because native Service grain/ownership was already established by the canonical reconciliation.

## Operational dependency

ANAM confirmed on 2026-07-16 that Customer Agent and 30,000 credits were purchased. The one-day notice observed during QA preceded the start of paid-credit consumption; it was not a trial-expiry or agent-deactivation warning. There is no current licensing continuity blocker, but credit consumption remains an operating metric.
