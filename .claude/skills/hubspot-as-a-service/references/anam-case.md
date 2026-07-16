# ANAM Case Routing

## Client boundary

ANAM is an Efeonce client, not a Greenhouse product initiative, internal dashboard or Efeonce CRM dataset. ANAM owns portal `19893546`, its records and its dashboards. Any separate ANAM representation in Greenhouse does not make this HubSpot work an internal capability. Greenhouse stores only engagement canon, QA, decisions and skills; Kortex provides approved portal-scoped execution. Never project ANAM client data into Greenhouse CRM, Finance, Income, Account 360 or product analytics without a separately authorized integration contract.

## Stable identifiers

- HubSpot portal: `19893546`
- Customer Agent: `Agente de clientes de ANAM`
- Human handoff owner: Maria Paz Haeger
- Public chat landing: `https://anam-2.hubspotpagebuilder.com/agente-anam`
- CMS project: `kortex-cms-react`, project `103589049`
- CLI account/profile: `anam-19893546` / `anam`; never replace the Kortex/Efeonce default.

## Canonical documentation

- `docs/architecture/kortex/hubspot-cms/anam-chat-landing.md`
- `docs/architecture/kortex/hubspot-cms/anam-portal-access.md`
- `docs/architecture/kortex/hubspot-cms/landing-page-runbook.md`
- `docs/architecture/kortex/hubspot-as-a-service/README.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-data-model-and-object-synergies-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-meeting-synthesis-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-email-attachment-synthesis-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-attachment-hubspot-classification-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-account-unit-billing-event-converged-model-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-monthly-billing-etl-operating-model-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-managed-billing-intake-ui-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/client-billing-intake-data-model-spec-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-hubspot-decision-v1.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-migration-dry-run-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-billing-event-schema-preview-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-schema-reconciliation-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-commercial-catalog-dry-run-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-phase-3-panel-first-service-readiness-2026-07-16.md`
- `docs/architecture/kortex/hubspot-as-a-service/anam-phase-3-forward-service-capture-contract-2026-07-16.md`
- `docs/audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`

## RevOps object model

Load the living data-model/synergies document before changing any ANAM object, property, association, automation or panel. It owns current grain, fact ownership and allowed projections; dated discovery documents preserve evidence but may contain superseded proposals.

- Contact -> Lead -> Company -> Deal -> Service is the meeting-ratified lifecycle.
- Deal owns opportunity, quotation, award and primary income classification.
- Standard HubSpot Service (`0-162`) is already active and owns each adjudicated/contracted service, term, recurrence and renewal. Extend it through an approved data dictionary; do not invent a parallel contract custom object.
- Line items preserve quote/service components and compound opportunity detail.
- Ticket owns support, Quality, claim, billing and administrative cases with SLA; it does not own the contract.
- Company owns durable account, parent-child, legal/HQ geography and governed sector data.
- Billing execution needs a source, unique key and event grain before synchronization; do not flatten repeated invoices/EDP/HES/HAS/LIMS rows into Deal or Company.
- Billing Event is the proposed custom-object grain: one source List item, idempotent composite key, original currency preserved, direct Company association and Service/Deal association only when deterministic. Current matching coverage is insufficient for import, so identity remediation precedes backfill.
- Account Unit ANAM is the proposed intermediate grain for one normalized Código ANAM/CeCo. One Company can own multiple Units; Billing Events resolve by exact Unit code and receive direct Company association only after the Unit-to-Company link is reviewed. Do not store multiple codes in a unique Company property or create child Companies without proof that the code represents a real CRM account/branch.
- The monthly billing "service" is an ETL integration, not a HubSpot Service-per-row factory. Prefer an authenticated managed Greenhouse upload/review surface backed by private GCS, Cloud Run and the external run ledger; SharePoint is an optional source adapter. Require validation plus explicit approval, upsert Billing Events by source key, and associate existing Services only through deterministic contract lineage.
- ANAM is an external client and owns the workbook, its customers and all target HubSpot objects. Greenhouse is only a tenant-scoped managed control plane. Never project ANAM billing rows into Efeonce/Greenhouse CRM, Finance, Income or Account 360, and never use the ANAM Company record in its own portal as the row identity.
- Physical ingestion tables are reusable `client_billing_*` contracts with mandatory session-derived `space_id`; ANAM is a dataset configuration bound to portal `19893546`, never a hardcoded schema or request-supplied portal.
- Billing averages must declare grain and currency. Report mean plus median per Billing Event, aggregate invoice rows by invoice number+currency before computing invoice averages, and calculate per-Unit/per-Company monthly averages only from matched eligible events. Never average or sum mixed CLP/UF/USD.
- The SharePoint workbook called `Ticket Facturación` contains billing events, not HubSpot customer Tickets. Those events must be ingested into the HubSpot model and associated to Company plus, where deterministic, Service and originating Deal so ANAM can compare sold/awarded value with billable/invoiced actuals. Customer Tickets separately cover Service follow-up, Billing inquiries and Quality cases.
- `tipo_de_ingreso` remains single-select and its legacy `Down-sell` option stays hidden: contraction is a Retention movement on comparable Services, not an income type, churn or an award below quote.
- For Service portfolio reporting use line-item TCV in original currency. For Retention compare ARR only inside a reviewed recurring/renewable cohort. Never collapse these into one “comparable awarded value.”
- Blank line-item billing frequency is unknown, not proof of one-time revenue. Billing cadence is not delivery/service frequency; Deal-level service date/frequency fields are review hints, not automatic line-item truth.
- Smart properties are credit-consuming AI evidence, never ANAM identity, money, lifecycle, renewal eligibility, churn or health-state truth. Current official eligibility does not list native Service, so Service support must be proven rather than assumed.
- GRR/NRR remain blocked until Service has comparable recurring values, currency, periodicity, start/end dates and a complete renewable cohort.
- Five controlled pilot Services are live in `New` in portal `19893546`; all are `incomplete_core` and excluded from official KPIs until Maria Paz Haeger reviews activation facts. This is not authorization for historical backfill, workflows or final dashboards. Load `anam-phase-3-forward-pilot-execution-2026-07-16.md` for IDs and rollback.
- ANAM delivery is commercial-first: close Company/Contact -> Lead -> Deal/line items -> Service -> renewal and the Data Quality/Growth/Retention/Loyalty dashboards before expanding Ticket, billing sync and operational dashboards.

## Landing and agent seam

Landing intents are `cotizar`, `seguimiento_servicio` and `requerimiento_calidad`. The supported seam is URL intent + `HubSpotConversations.widget.refresh({ openToNewThread: true })` and chatflow targeting. Composer prefill is not reliable in the current widget, especially before privacy consent.

## Operational lessons

- HubSpot may return the same Company under labeled and unlabeled association types. Deduplicate associations by target object ID before deciding that a Deal has multiple Companies.

- Persona and empathy must survive when handoff is tightened; do not replace them with a purely procedural prompt.
- Billing/administrative information should be answered when documented. Escalate only the action requiring a person.
- Technical quotation needs service-specific intake and can require more than two questions.
- Native transfer can pre-empt short answers. Transfer copy is part of the experience.
- Customer Agent and 30,000 credits were confirmed purchased on 2026-07-16. There is no current deactivation blocker; monitor paid-credit consumption and the assignee's Service access as separate runtime dependencies.
- Classify client attachments before modeling: migration source records, configuration inputs, reference-only evidence and exclusions are different contracts. For ANAM, only the billing ledger and customer-segmentation workbook are migration candidates, and both remain no-go until identity, mapping, dry-run and approval gates close.
- Do not upload vendor subscription PDFs, presentation slides, email signatures, voicemail artifacts or superseded process documents into CRM records or Customer Agent knowledge merely because they were attached to a client email.
