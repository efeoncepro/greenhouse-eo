# ANAM Case Routing

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
- `docs/architecture/kortex/hubspot-as-a-service/anam-revops-meeting-synthesis-2026-07-16.md`
- `docs/audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md`

## RevOps object model

- Contact -> Lead -> Company -> Deal -> Service is the meeting-ratified lifecycle.
- Deal owns opportunity, quotation, award and primary income classification.
- Standard HubSpot Service (`0-162`) is already active and owns each adjudicated/contracted service, term, recurrence and renewal. Extend it through an approved data dictionary; do not invent a parallel contract custom object.
- Line items preserve quote/service components and compound opportunity detail.
- Ticket owns support, Quality, claim, billing and administrative cases with SLA; it does not own the contract.
- Company owns durable account, parent-child, legal/HQ geography and governed sector data.
- Billing execution needs a source, unique key and event grain before synchronization; do not flatten repeated invoices/EDP/HES/HAS/LIMS rows into Deal or Company.
- `tipo_de_ingreso` remains single-select and its legacy `Down-sell` option stays hidden: contraction is a Retention movement on comparable Services, not an income type, churn or an award below quote.
- GRR/NRR remain blocked until Service has comparable recurring values, currency, periodicity, start/end dates and a complete renewable cohort.
- ANAM delivery is commercial-first: close Company/Contact -> Lead -> Deal/line items -> Service -> renewal and the Data Quality/Growth/Retention/Loyalty dashboards before expanding Ticket, billing sync and operational dashboards.

## Landing and agent seam

Landing intents are `cotizar`, `seguimiento_servicio` and `requerimiento_calidad`. The supported seam is URL intent + `HubSpotConversations.widget.refresh({ openToNewThread: true })` and chatflow targeting. Composer prefill is not reliable in the current widget, especially before privacy consent.

## Operational lessons

- Persona and empathy must survive when handoff is tightened; do not replace them with a purely procedural prompt.
- Billing/administrative information should be answered when documented. Escalate only the action requiring a person.
- Technical quotation needs service-specific intake and can require more than two questions.
- Native transfer can pre-empt short answers. Transfer copy is part of the experience.
- Customer Agent and 30,000 credits were confirmed purchased on 2026-07-16. There is no current deactivation blocker; monitor paid-credit consumption and the assignee's Service access as separate runtime dependencies.
