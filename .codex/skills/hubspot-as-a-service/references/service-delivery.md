# Managed Service Delivery

## Evidence ladder

Use the strongest available evidence:

1. Runtime read-back from HubSpot or the live surface.
2. API/CLI response with object IDs and effective values.
3. Portal screenshot or authenticated DOM evidence.
4. Source document or approved client email.
5. Inference, clearly labelled and never executed as fact.

## Change-set format

Before a write, capture:

| Surface | Object/asset | Current | Proposed | Impact | Approval | Rollback |
|---|---|---|---|---|---|---|

Batch independently reversible writes. Separate schema creation, backfill, automation activation and reporting changes.

## Service workstreams

| Workstream | Typical deliverables |
|---|---|
| Portal foundation | users, seats, teams, permissions, naming, environments |
| RevOps | lifecycle, properties, pipelines, associations, ownership, SLAs |
| Data quality | duplicates, required fields, normalization, backfills, monitoring |
| Automation | workflows, routing, notifications, tasks, exception handling |
| Marketing, Content & AEO | Marketing Studio/campaigns, segments, content, AEO, forms, consent, attribution |
| Sales & AI Pipeline | Sales Workspace, leads/targets, sequences, forecast, coaching, eligible sales agents |
| Revenue Lifecycle | catalog, quote, Contract, change/renewal, billing/revenue integration and controls |
| Service, Success & Delivery | help desk, tickets, knowledge, Customer Agent, CS Workspace, health, Projects/Services |
| Agentic Operations | readiness, Agent Hub/Builder, agents/workflows, tools, evaluation, cost, handoff, observability |
| Reporting | baseline, funnel/service metrics, dashboards, definitions |
| Managed operation | backlog, release cadence, QA, incident/recovery, QBR |

The default pre-sale evaluation is limited and free. Use a paid blueprint only when it delivers an independent
inventory, target design, roadmap and risk artifact. Never convert a product surface or CRM object into a service
workstream without an owned outcome and acceptance contract.

## Data-quality operating contract

- Separate platform/schema defects, source/migration defects and operational capture/adoption debt. Attribute a gap to commercial discipline only when the required capture point, owner and expected process are documented and the omission is evidenced by record, period and owner; otherwise state the cause as unresolved.
- A Data Quality dashboard is an operating queue, not a cosmetic scorecard or blame surface. Expose eligible denominator, exception count, coverage, owner, correction action and review cadence.
- Keep correction approval separate from diagnosis. Apply only deterministic, independently reversible cohorts; quarantine duplicate, ambiguous and inferred matches for human review.
- Client closeouts must separate live-and-verified, pilot/synthetic, proposed, blocked and approval-pending assets. State which population is excluded before describing any metric as official.

## Client report rules

- State what was tested, not merely what was configured.
- Count scenarios and conversation turns separately.
- Separate `PASS`, `PASS WITH LIMITATION`, `FAIL`, and `NOT TESTED`.
- Include exact residual platform constraints and operational dependencies.
- Do not expose credentials, private URLs, internal emails or unrelated personal data.

### Premium document delivery

- Treat HTML/CSS as the editable source and PDF as the client-facing visual master when office formats cannot
  preserve the approved fonts, layout or brand system. Do not label a degraded Word conversion as equivalent.
- Apply an explicit brand hierarchy: Efeonce is the service provider, HubSpot is the partnership/platform and the
  customer is the client. Client colors may support recognition without taking over the provider's document system.
- Use the approved type system consistently. For Efeonce external reports, Poppins owns display and Geist owns
  body/data unless the current brand canon says otherwise.
- Rasterize and inspect every page in isolation. Verify page size, embedded fonts, footer clearance, text
  extraction, overflow and density before delivery; a successful export is not visual QA.
- Preserve the editable source, final PDFs, visual direction and page previews. Exclude superseded drafts from
  the client package and state which format is authoritative.
- Every closeout that includes support must state the exact start date, end date and included/excluded scope.
  Support for delivered behavior is not authorization for new features, metrics, workflows, integrations,
  redesigns or innovation.

## Client closeout message

1. Read the latest source threads and distinguish client confirmations, requests, pending inputs and superseded
   statements before drafting.
2. Consolidate multiple threads into one new draft when no single thread owns the full closeout. Use reply-all
   only when one thread already contains the complete audience and context.
3. Link only client-appropriate live surfaces; describe pilot, partial and blocked assets explicitly.
4. Default to a draft. Never report that a draft exists until the mailbox write returns success.
5. If the email connector returns an access denial, preserve the ready-to-send plain-text body in the governed
   client follow-up document, report the permission blocker and do not retry as a send.
6. Name every attachment and its purpose, distinguish a draft from a sent message, and record future delivery
   commitments such as a SharePoint as pending until the link is actually shared.
