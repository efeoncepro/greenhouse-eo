---
name: hubspot-as-a-service
description: "Deliver and operate HubSpot as a managed client service across Smart CRM, Marketing/Content/AEO, Sales, Revenue lifecycle, Service/Customer Success/Delivery, Data/Integration, and Agent Hub/agentic operations. Use for client HubSpot implementation or managed operations, especially ANAM; do not use for generic HubSpot selling, the Greenhouse write bridge, or CMS-only implementation."
---

# HubSpot as a Service

Operate HubSpot as an accountable managed service, not as a collection of portal clicks.

## Commercial context

The canonical commercial structure is **Efeonce → RevOps & CRM → Kortex (when applicable) → HubSpot as
platform/provider**. Use the service catalog in `docs/services/hubspot-as-a-service/README.md` and its
`HUBSPOT_OFFER_ARCHITECTURE_V2.md` to compose the six outcome families, delivery modes and sector overlays. The
default commercial entry is a limited evaluation without cost; use a paid blueprint only when it produces an
independent technical artifact. Customer Agent is a component of Service/Customer Success and Agentic Operations,
not the root of the AI offer.
For human-agent team transformation, load
`docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md`: portal configuration is only one
part of workflow redesign, named human accountability, autonomy, handoffs, adoption, quality and cost. A first
production team requires operator training and supervision capacity, not only an active agent toggle.
Treat brochures as historical commercial input only; the review and quarantine rules live in
`docs/audits/commercial/HUBSPOT_BROCHURE_REVIEW_2026-07-26.md`. Do not import brochure claims, pricing, bundles or
feature availability without current primary-source verification and an `as-of` date.

## Provider-fit boundary

HubSpot is the default candidate for growth-oriented B2B, mid-market teams and faster adoption, not a universal
enterprise substitute. Salesforce remains a first-class candidate when the client needs a complex installed org,
multi-team or multi-country governance, deep extensibility, high-scale service, or a broader enterprise integration
estate. Treat this as Efeonce positioning, not as a vendor-exclusive market claim. Discovery must be able to return
`HubSpot-first`, `Salesforce-first`, `híbrida` or `no-fit`; a HubSpot Marketing + Salesforce CRM design requires
explicit source of truth, lifecycle, consent, attribution, deduplication and sync contracts.

## Load first

1. Read `project_context.md`, `Handoff.md`, `docs/context/00_INDEX.md`, and client-specific context.
2. Read [service-delivery.md](references/service-delivery.md) for the delivery loop and evidence contract.
3. Load only the workstream reference needed:
   - Customer Agent: [customer-agent.md](references/customer-agent.md)
   - RevOps/schema: [revops-schema.md](references/revops-schema.md)
   - Property types, calculations, sync, rollups, scores or smart properties: [property-types.md](references/property-types.md)
   - Reports, dashboards, native Goals and Goal reports: [report-design.md](references/report-design.md)
   - Marketing/sales email or sequence automation by API: [email-api-routing.md](references/email-api-routing.md)
   - ANAM: [anam-case.md](references/anam-case.md). Para la landing pública y su seam con Customer Agent,
     carga además `docs/architecture/kortex/hubspot-cms/anam-chat-landing.md` y
     `docs/architecture/kortex/hubspot-cms/landing-page-runbook.md`; la implementación CMS sigue bajo ownership
     de esos documentos.
   - Offer/sector qualification: `docs/services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md`
4. When the work derives from a sold implementation, read `../hubspot-solutions-partner/modules/12_IMPLEMENTACION.md`; for agents, also read `../hubspot-solutions-partner/modules/13_AGENTES.md`. Product claims and prices remain owned by that skill's `hubspot-solutions-partner` → `SOURCES.md`.

For Fall 2026 / UNBOUND 2026 product changes, read [`HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md`](../../../docs/services/hubspot-as-a-service/HUBSPOT_FALL_2026_UNBOUND_RELEASES_2026-09-16.md) before qualifying ChatGPT Ads/Lead Gen Ads, MCP/Claude, Agent Hub, Breeze, Scheduled Prompts, Customer Agent Voice, HubSpot Work, Agent CLI or Smart CRM Universal Record Page. The register is cut at 2026-09-19; it is evidence of vendor documentation/demo, not proof of portal eligibility, regional availability, pricing or runtime.

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
- Never conflate Customer Agent `Deployment > Workflows and bots` with agent knowledge, Customer Agent actions, or
  a workflow action that invokes an agent managed through Agent Hub/Agent Builder. Names and eligibility can change;
  inventory the actual portal action and test routing separately.
- Never present a Customer Agent feature as available because HubSpot documents it. Classify it as vendor-documented, portal-eligible, configured/draft, published, and runtime-verified; keep betas, credits, seats, permissions and account state explicit.
- Apply the same availability ladder to Agent Hub, every prebuilt/custom agent, agentic workflow, Revenue Hub,
  Contracts, Customer Success Workspace, Projects and Services. A marketing page or beta label is not portal evidence.
- Never treat Projects or Services as Efeonce service names. They are CRM objects. Never imply that they replace a
  PSA, ERP, billing engine or vertical system of record without a verified architecture.
- For Revenue Hub in Chile, verify seats, territory, payments, tax/e-invoicing, SII, ERP, Finance and Legal before
  claiming an end-to-end quote-to-cash implementation.
- Keep Customer Agent knowledge sources in Markdown when this service owns the content.
- Do not promise API parity. Verify whether a setting is available through CRM APIs, Customer Agent APIs, Agent CLI, CMS APIs or only the authenticated UI.
- Do not publish, activate workflows, change licenses/permissions, or perform destructive writes without explicit approval.
- Treat ChatGPT Ads in HubSpot as a public beta: require Super Admin opt-in, Ads publishing permission, an active OpenAI Ads account, country/account eligibility, consent for every contact shared in conversion matching, and readback of UTMs, pixel, event state and delivery. Keep HubSpot event caps (Starter 5 / Pro 50 / Enterprise 100) and OpenAI budget caps explicit; never infer pricing or Chile availability.
- Treat the HubSpot connector for Claude/MCP, Agent Hub, Agent Builder, Breeze and Scheduled Prompts with the availability ladder. Reauthentication may be required for new Claude scopes; connector writes need approval and validation because bulk limits and HubSpot custom validation behavior apply. A UNBOUND session or vendor announcement is first-look evidence, not GA or runtime evidence.
- Do not report a conversational test as passed from one prompt. Test multi-turn memory, natural phrasing, technical accuracy, escalation and failure modes.
- Native HubSpot transfer/system messages can pre-empt trained answers. Record this as a platform behavior and improve the transfer copy; do not hide it.
- All client-facing metrics require period, baseline, denominator, definition and evidence. ANAM naming in external case studies requires authorization.
- Do not reduce dashboard design to scorecards and bars. Inventory the active report builder and select visualization by decision, cardinality, period and measure semantics using `report-design.md`.
- Treat calculated properties as governed schema, not report-local convenience. Verify the portal allowance, prefer exact business IDs over probability-derived flags, read back both definitions and representative values, and document any mandatory report filter that makes a numeric base semantically valid.
- Treat smart properties as credit-consuming, AI-produced evidence. Never use them as authoritative identity, currency, amount, lifecycle, eligibility, compliance or accounting data.
- Do not describe missing CRM data as a platform defect or commercial-discipline failure without separating capture design, source quality, system behavior and evidenced user adoption.

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
