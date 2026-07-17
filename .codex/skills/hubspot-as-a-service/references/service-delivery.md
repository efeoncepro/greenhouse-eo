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
| Customer service | help desk, inbox, tickets, knowledge, Customer Agent, handoff |
| Content/CMS | landing, forms, chat entry, consent, tracking, attribution |
| Reporting | baseline, funnel/service metrics, dashboards, definitions |
| Managed operation | backlog, release cadence, QA, incident/recovery, QBR |

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
