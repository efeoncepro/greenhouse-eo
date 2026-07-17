# ANAM RevOps Discovery - Email + Notion

> **Date:** 2026-07-16
> **Mode:** read-only discovery
> **Sources:** corporate Outlook threads from Maria Paz Haeger and ANAM tasks/projects in Notion
> **Execution status:** no HubSpot schema or data writes were performed

Runtime readback is now available in [`anam-hubspot-schema-readback-2026-07-16.md`](anam-hubspot-schema-readback-2026-07-16.md).

## Executive finding

The next ANAM workstream is not a blank-slate property build. Several fields and relationships were already configured or partially backfilled, while their business definitions, task statuses and acceptance evidence drifted.

The safe sequence is:

```text
runtime schema inventory -> reconcile definitions -> approve target dictionary
-> dry-run changes -> schema read-back -> backfill/data-quality QA
-> dashboards -> dependent automation
```

## Sources reviewed

Seven non-Customer-Agent email threads contained material RevOps decisions:

| Date | Subject |
|---|---|
| 2025-11-17 | `Hubspot: KPI's y detalle personal` |
| 2026-04-24 | `RE: 18 de abril de 2026 | Definiciones de indicadores` |
| 2026-06-04 | `RE: Minuta reunión ANAM - KPIs y Ejecutivo Virtual (03-06)` |
| 2026-06-10 | `RE: Seguimiento reunión ANAM 10/06 - Ejecutivo Virtual y KPIs` |
| 2026-06-30 | `Pendientes KPI's Hubspot` |
| 2026-07-01 | `Ticket Facturación` |
| 2026-07-08/09 | `Información Operativa y Administrativa` / reply with Quality requirements |

The non-agent attachments were reviewed in detail after the initial discovery. See [`anam-email-attachment-synthesis-2026-07-16.md`](anam-email-attachment-synthesis-2026-07-16.md) for the source inventory, billing-ledger profile, operational case contract and market-model quality findings.

Notion sources:

- [Tareas](https://app.notion.com/p/32539c2fefe780de808ef6fd6a43767b)
- [Proyectos](https://app.notion.com/p/32539c2fefe7805394f7c06eb3bbf530)
- [FASE 1: Arquitectura de Datos](https://app.notion.com/p/32739c2fefe781f39b1bf5fbf44991ae)
- [FASE 2: Service Hub + Tickets + Eventos](https://app.notion.com/p/32739c2fefe78161ab06f7eec421ce8d)

Both active phases are high priority and remain in `Planificación`. Older ANAM projects were cancelled after consolidation into these phases.

## Confirmed RevOps definitions

### Deal: Tipo de ingreso

Current visible income labels:

- `Venta nueva`
- `Renovación`
- `Upsell`
- `Cross-sell`

Confirmed behavior:

- property lives on Deal;
- it was described as a dropdown and made mandatory on deal creation;
- historical notes/tasks discussed adding `Down-sell`, but the operator clarified on 2026-07-16 that it was intentionally removed because it is not an income type;
- `renovación del negocio similar anterior` became obsolete;
- `Churn` is loss/non-renewal, not an income type;
- AI-inferred historical values require human validation.

Current analytical separation:

- **Growth:** Venta nueva, Upsell, Cross-sell.
- **Retention:** renewal outcome on comparable Services: expansion, no material change, contraction/Down-sell or churn.

Down-sell remains a hidden legacy option with zero records. It must not be re-enabled in `tipo_de_ingreso`. The remaining semantic conflict is how compound `Venta nueva + Cross-sell` and `Renovación + Cross-sell` cases are represented without turning the field into multi-select.

### Deal: Variación vs. cotizado

Confirmed business behavior:

- visible/applicable at `Adjudicación`;
- options `Igual`, `Mayor`, `Menor`;
- `Mayor` represents captured opportunity.

Runtime readback found `variacion_contrato` as a Deal single-select with `Mismo valor`, `Mayor valor`, `Menor valor` and zero populated records. Its label and options do not match the email contract. Conditional visibility and requiredness remain unverified because the accessible API credential does not expose stage rules.

### Company hierarchy and identity

- The operational identifier is the HubSpot company ID, not only RUT.
- Parent-to-child company associations were agreed.
- The portfolio was described as roughly 100 parent companies, with close to 80% of billing concentrated in about 50.

### Commercial activity

- Confirmed target: 40 commercial actions per executive, combining emails, calls and meetings.
- Service-engineer targets remain pending.

## Properties and data work in Notion

| Work item | Notion state | Discovery finding |
|---|---|---|
| [Región ANAM en Company](https://app.notion.com/p/32739c2fefe781678a6cf1cb83dd8fbe) | En curso | Summary says blocked awaiting 16-region list; status/completion metadata conflict. |
| [Downselling en tipo_de_ingreso](https://app.notion.com/p/34839c2fefe78156a283c1bbbc4fba4f) | Listo | Task premise is superseded: runtime option is intentionally hidden because Down-sell belongs to Retention movement, not income type. |
| [Backfill tipo_de_ingreso Q1-Q2](https://app.notion.com/p/37439c2fefe781f28b3dfc396a5d5d73) | En curso | 908/1,240 Deals have a value; distribution is 446 Venta nueva, 141 Upsell, 87 Cross-sell, 234 Renovación and 0 Down-sell. Human-validation evidence remains absent. |
| [Variación vs. cotizado](https://app.notion.com/p/37439c2fefe78157b828df25fb7b8504) | Listo | Runtime property is unused and differs in label/options from the agreed definition. |
| [Empresa matriz/hija](https://app.notion.com/p/34839c2fefe781ff8f12eb13206ad402) | Listo | HubSpot-defined Parent/Child association labels exist; relationship coverage and acceptance evidence still need validation. |
| [Fechas de vencimiento de contratos](https://app.notion.com/p/33439c2fefe781029145e6917c2cc231) | Sin empezar | Requires contract dataset; blocks 60-day renewal workflow. |

## Reporting backlog

Requested KPI families include:

1. new leads and lead-to-customer conversion;
2. won customers/deals by region and regional share movement;
3. qualified and won deals by pipeline/service;
4. win rate by service, count and UF amount;
5. sales ranking by engineer, count and amount;
6. meetings versus proposals;
7. calls, emails, meetings, fairs and congresses;
8. market size, SAM, penetration and gap by sector;
9. activity by engineer.

Current Notion sequence:

- [Dashboard Crecimiento](https://app.notion.com/p/32739c2fefe781e7b5efd1dd1297a1dd): in progress; depends on backfill and disciplined capture.
- [Dashboard Fidelización](https://app.notion.com/p/32739c2fefe7819bac79fd1ced660f99): in progress; depends on service-engineer goals.
- [Dashboard Estratégico](https://app.notion.com/p/32739c2fefe781b5b722f4081600f09e): not started; depends on market/plan/backlog data.
- [Dashboard Operacional](https://app.notion.com/p/32739c2fefe78118aa6bc071ebcc8fa9): not started; depends on tickets, SLA and activity quality.

Do not accept dashboards before measuring source-field coverage and validating the denominator for each KPI.

## Billing dataset decision required

The `Ticket facturación_010726.xlsx` attachment contains 16,898 rows from Services and Contracts. Source columns include company/title, owner, zone, ANAM code, RUT, quotation/EDP, OC, HAS/HES, service dates/month, description, net amount, currency, observation, LIMS, status, invoice number, item type and access path.

The snapshot has 16,898 unique source IDs. Statuses are `Facturado` 15,706; `Rechazo Externo` 814; `Rechazo Interno` 193; `Creada` 119; `Facturar` 63; `EDP Enviado al Cliente` 2; and `Refacturado` 1. Currencies are CLP 8,667; UF 8,229; USD 1; and blank 1. Probable UF/USD amount outliers block trusted currency reporting until source validation.

The updated operational-flow attachment also confirms three customer-case families: Service follow-up, Billing and Quality. These belong in HubSpot Ticket with Company/Contact/Service associations and SLA/routing; they must not be conflated with billing-ledger rows.

The business objective is to bring the operational amounts into HubSpot and connect them to the sale, Service and Company. The emails do not yet decide which durable HubSpot representation should hold each billing event:

- a HubSpot ticket;
- a custom object;
- Deal properties;
- or another supported transaction/custom object synchronized during migration and then maintained in HubSpot or through governed integration.

Before implementation, decide migration source of truth, unique key, object/association model, update semantics, operational cutover, retention and reporting consumers. Manual dual entry is not an acceptable target. This decision may require an ADR if Greenhouse/Kortex becomes a runtime consumer.

## Data-quality dependencies

- [EDP SyC -> HubSpot](https://app.notion.com/p/32739c2fefe781fe98c0f12b87cb7bf4): blocked pending Jose Pedro's Excel snapshot.
- [ETL Excel -> HubSpot](https://app.notion.com/p/33439c2fefe7813a8077c7d3e4bea33d): not started; depends on raw EDP and final schema.
- [Importación histórica](https://app.notion.com/p/33439c2fefe78181a55cc0e498df5bae): not started; depends on ETL and source data.
- [Tamaño de mercado por sector](https://app.notion.com/p/32739c2fefe7813b907af4c8e8617099): blocked pending EDM data; blocks strategic KPI/dashboard.

Strategic-sector taxonomy also drifts: the executive email lists Minería, Desaladoras, Sanitarias, Energía, Acuícola/Pesqueras and Servicios asociados/Consultoras; the spreadsheet adds mining suppliers, manufacturing and agroindustry.

## Recommended execution plan

### 1. Reconcile state before writes

- Use the completed Deal/Company/Contact schema readback as the baseline.
- Verify requiredness and stage rules for `Tipo de ingreso` and `Variación vs. cotizado`.
- Measure parent/child association coverage and reconcile Deal `zona` against Company `region_de_chile`.
- Reconcile Notion states against runtime evidence.

### 2. Close three business decisions with ANAM

1. Representation of compound Cross-sell cases.
2. Canonical strategic-sector taxonomy.
3. Billing source-of-truth/object model and unique key.

### 3. Approve a target data dictionary

For each property record object, standard-property check, label/internal name, type/options, source, owner, required stage, backfill, consumers and privacy classification.

### 4. Execute schema and data work separately

- Schema writes with dry-run/change set and read-back.
- Backfill with coverage report, conflict log and human validation sample.
- No workflow activation in the same unverified batch.

### 5. Validate dashboards in dependency order

1. Growth.
2. Retention.
3. Strategic.
4. Operational.

### 6. Activate dependent automation

- stage validations after focal QA;
- renewal workflow after contract dates are complete;
- Breeze-to-ticket and billing routing after the ticket/data model is approved;
- opportunity auto-creation only after qualification rules are explicit.

## Inputs required from ANAM

- 16-region list/confirmation;
- final sector taxonomy;
- service-engineer goals and EBITDA allocation;
- EDP snapshot and EDM/market data;
- contract expiry dataset;
- decision on compound Cross-sell representation;
- decision on billing data model;
- access to the Quality mailbox and remaining operational knowledge inputs.

## Separate Customer Agent/landing track

Customer Agent and landing work remains active but separate from RevOps schema. Relevant Notion items include the knowledge base, client-segment knowledge, human-validated pre-quotation, Quality routing, mailbox connection, landing validation and WhatsApp/600-number dependency. See the dated QA report and `../hubspot-cms/anam-chat-landing.md`.
