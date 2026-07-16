# ANAM Email Attachment Synthesis

> **Date:** 2026-07-16
> **Mode:** read-only source review
> **Scope:** non-Customer-Agent attachments sent by Maria Paz Haeger
> **HubSpot writes:** none

## Purpose

These attachments are implementation inputs, not a schema specification. They clarify three different grains that must remain separate:

```text
Customer Ticket = one request, complaint, appeal, compliment or administrative case
Service = one awarded service or contract
Billing event = one EDP/invoice workflow record from the operational source
```

The word `ticket` in the billing workbook is operational language. It does not make each spreadsheet row a HubSpot Ticket.

## Sources reviewed

| Email | Attachment | Role in the target model |
|---|---|---|
| `Ticket Facturación`, 2026-07-01 | `Ticket facturación_010726.xlsx` | Historical billing/EDP event ledger. |
| `Pendientes KPI's Hubspot`, 2026-06-30 | `Tamaño Mercado Sectores Estrategicos Abril 2026.xlsx` | Market-size and sector benchmark working model. |
| `Información Operativa y Administrativa`, 2026-07-08 | `Flujo Oper y adm.docx` | Initial service-follow-up and billing case intake. |
| `RE: Información Operativa y Administrativa`, 2026-07-09 | updated `Flujo Oper y adm.docx` | Adds Quality: compliments, appeals and complaints. |

Brochure, laboratory-parameter, quotation-intake, logo and Customer Agent knowledge attachments were intentionally excluded because that track was already processed.

## Operational case contract

The latest document defines three case families:

| Family | Subtypes/examples | Intended destination |
|---|---|---|
| Service follow-up | Results report, delivery time and other questions about a delivered service | Service or Sales Engineer responsible for the account. |
| Billing | Invoice/administrative question | `facturacion@anam.cl`, copying the responsible engineer. |
| Quality | Compliment, appeal or complaint | `anam-calidad@anam.cl`, copying the responsible engineer. |

The requested intake fields are Company legal name, RUT, Contact name/email/phone, quotation number and responsible engineer. Quality also requests quotation or service detail plus the case narrative.

### RevOps interpretation

- Create a HubSpot Ticket for the customer case. Email is a notification/routing channel, not the system of record.
- Associate the Ticket to Company, Contact and Service. Associate the originating Deal only when quotation context is required.
- Resolve Company/Contact/owner from existing CRM associations before asking the customer to repeat data.
- Store RUT and contact details on their owning objects; do not duplicate them as free-text Ticket fields except as an immutable intake snapshot when compliance requires it.
- Use one initial ANAM customer-case pipeline with family/subtype, queue and SLA dimensions. Split pipelines only if Quality, Billing and Service follow-up prove to have materially different state machines.
- Preserve the original channel and Customer Agent outcome so reporting can distinguish self-service resolution, agent-created Ticket and direct human intake.

### Candidate Ticket data contract

This is a design input, not approval to create properties:

| Dimension | Proposed treatment |
|---|---|
| Family | Service follow-up / Billing / Quality. |
| Subtype | Results report / Delivery time / Other service question / Invoice / Compliment / Appeal / Complaint. |
| Context | Customer narrative, quotation/EDP reference and service detail. |
| Associations | Company, Contact, Service, responsible owner; Deal only when relevant. |
| Routing | Service/Sales Engineer, Billing queue or Quality queue with fallback owner. |
| Control | Priority, opened/first-response/resolution dates, SLA status, waiting reason, reopen reason and resolution code. |
| Agent | Originating intent, self-service result, escalation reason and handoff outcome. |

ANAM must still approve business hours, response/resolution SLAs, queue membership, fallback owners and whether compliments share the same Quality SLA as appeals and complaints.

## Billing workbook findings

### Business objective

ANAM wants these operational amounts inside HubSpot so the team can connect what Commercial sold with what Operations executed and sent to billing for each Company. The target is not a passive archive or an isolated operational dashboard:

```text
Company -> Deal (sold/awarded value) -> Service (delivery/contract)
                                      -> Billing event (billable/invoiced actual)
```

This enables account-level and period-level comparison between sold, delivered, pending-to-invoice, rejected and invoiced value. The distinction from a customer Ticket is about object grain, not about excluding the billing data from HubSpot.

### Grain and coverage

`Ticket facturación_010726.xlsx` is a SharePoint-list export with 16,898 unique rows and 22 columns. IDs are unique in the snapshot. Creation dates run from 2023-06-28 to 2026-07-01.

The source fields are:

- source ID and creation timestamp;
- Company/title, responsible person, zone, ANAM code and RUT;
- quotation/EDP, OC and HAS/HES references;
- service start/end/month and service description;
- net billable amount and currency;
- observation and LIMS references;
- billing status and invoice number;
- SharePoint item type and source path.

Status distribution:

| Status | Rows |
|---|---:|
| Facturado | 15,706 |
| Rechazo Externo | 814 |
| Rechazo Interno | 193 |
| Creada | 119 |
| Facturar | 63 |
| EDP Enviado al Cliente | 2 |
| Refacturado | 1 |

Currency distribution is 8,667 CLP, 8,229 UF, one USD and one blank. Zones are Centro 10,332, Sur 4,546, Norte 2,019 and one blank. Invoice number is missing in 378 rows and observation is missing in 3,800; the other operational columns are nearly complete in this snapshot.

### Data-quality warnings

- Never sum CLP, UF and USD without a dated conversion contract.
- A UF row contains `14,106,359` and dominates the rejected-UF total; it is a probable currency or amount error requiring source validation.
- The only USD row contains `1,729,029`, also requiring validation.
- Company names vary for the same apparent account, so title cannot be the association key.
- RUT, ANAM code, quotation/EDP and OC/HES values are useful matching candidates but need normalization and collision tests.
- Service dates include historical and future values outside the creation period; date validity cannot be inferred from range alone.
- `LIMS` can contain many identifiers in one cell. It is not an atomic association field.

### Target architecture

Do not import these rows as Deals, Companies or customer Tickets.

1. Ingest the historical ledger and subsequent changes into HubSpot at one `Billing event` record per source ID.
2. During migration, keep the current operational source authoritative until reconciliation and cutover are accepted; this is a transition control, not the desired end state.
3. Associate every event directly to Company and, where deterministic, to Service and originating Deal.
4. Preserve repeated EDP, invoice, OC, HES/HAS and LIMS facts at event grain.
5. Roll stable summaries onto Company and Service only when HubSpot calculations/reporting cannot derive them reliably; do not duplicate raw rows into properties.
6. Audit whether the durable HubSpot representation should be a custom object or another supported transaction object. The choice must preserve historical import, associations, workflow, operational editing and reporting.
7. Define the operating cutover: either Operations starts maintaining billing events in HubSpot, or an automated incremental sync keeps HubSpot current from the source system. Manual dual entry is not acceptable.

The connected model should report awarded value, billable value, invoiced value, pending value, internal/external rejection, billing realization and elapsed time from service completion to invoice, by Company, Service, Deal, owner, zone and period. It must expose data-quality exclusions and never combine currencies implicitly.

## Market and sector workbook findings

The workbook is a planning model, not a clean master-data table.

### Competing taxonomies

The email names six strategic sectors: Mining, Desalination, Sanitary, Energy, Aquaculture/Fishing and Associated Services/Consulting.

The workbook introduces Mining Suppliers, Manufacturing and Agroindustry. It also uses both `Desaladoras` and `Desalinizadoras`, and the `Otros` sheet has incomplete codes. The current HubSpot `sector_estrategico` taxonomy has seven options and zero adoption, so no backfill should start until one canonical catalog is approved.

### Competing market values

- The `TAM y Sectores` sheet models national Mining at USD 95-120M and Sanitary at USD 35-45M.
- The `Otros` sheet uses point estimates of USD 200M for Mining and USD 135M for Sanitary.
- National TAM is presented as USD 260-365M and SAM as USD 180-250M, while the point-estimate rows do not reconcile directly to that range.
- Only Mining and Sanitary have populated SAM, base/current sales, penetration, target and gap calculations.
- The workbook uses a 2026-04-06 exchange-rate snapshot and a 2025 UF average in some calculations.
- Relevant formulas have cached values, but the workbook also contains many broken legacy named ranges and external references. Cached outputs are not a governed refresh mechanism.

### Target market benchmark contract

Company should store only its governed strategic-sector classification. Market assumptions need their own versioned dataset with:

- canonical sector code/name;
- geography and effective period;
- TAM lower/upper or point estimate with unit/currency;
- SAM and exclusion logic;
- ANAM sales for the same period and currency basis;
- penetration, target and gap;
- source, methodology, owner, approval status and last refresh date.

The strategic dashboard must display the assumption period and version. It cannot present the April workbook as current truth without Maria Paz/Jose Pedro approving taxonomy, methodology and values.

## Impact on implementation sequence

These inputs reinforce the commercial-first plan while making the Operations phase implementable:

1. Complete the commercial runtime audit and Company/Deal/Service dictionary.
2. Ratify strategic-sector taxonomy and create a versioned market benchmark contract.
3. Audit HubSpot Ticket pipelines, properties, teams, inboxes, SLAs and custom-object/data-sync capability.
4. Approve the customer-case taxonomy, queues, business hours and SLA matrix.
5. Obtain live access to the SharePoint billing source, define incremental synchronization semantics and design the future operational cutover into HubSpot.
6. Run Company/Deal/Service association and billing-data-quality dry-runs before creating billing-event records.
7. Pilot customer Tickets separately from the billing-event ingestion, while connecting both to the same Company and Service context.
8. Build operational dashboards only after runtime QA proves routing, associations, SLA clocks and event freshness.

No HubSpot properties, pipelines, workflows, Tickets or billing records were created during this review.
