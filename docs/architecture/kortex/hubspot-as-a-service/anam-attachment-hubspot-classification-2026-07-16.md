# ANAM Attachment Classification for HubSpot

> **Date:** 2026-07-16
> **Scope:** 12 non-agent Outlook attachments preserved under `anam-source-attachments-2026-07-16/`
> **Decision boundary:** classification only; no HubSpot schema, record or workflow write is authorized

## Executive decision

| Class | Files | Meaning |
|---|---:|---|
| HubSpot migration candidates | 2 | Useful source records, but neither is import-ready. Both require governed identity, mapping, dry-run and approval. |
| HubSpot configuration inputs | 3 | Useful for properties, forms, Ticket taxonomy, routing or KPI definitions; do not import their rows as CRM records. |
| Reference only | 5 | Preserve for contractual, historical or presentation context; do not carry into CRM objects. |
| Exclude from HubSpot work | 2 | No usable CRM grain or configuration value. Preserve only as email provenance if required. |

The physical classification view lives in [`anam-source-attachments-2026-07-16/classification/`](anam-source-attachments-2026-07-16/classification/). It uses links to the immutable sender-organized originals, so the evidence is not duplicated or rewritten.

## 1. HubSpot migration candidates

### Billing ledger - Maria Paz

**File:** `2026-07-01_ticket-facturacion.xlsx`

**Decision:** `CANDIDATE / NO-GO FOR IMPORT NOW`

- 16,898 data rows and 16,898 unique external IDs.
- 22 source fields, including Company name, RUT, ANAM code, quotation/EDP, purchase order, service dates, description, net billable amount, currency, status and invoice number.
- Statuses: 15,706 Facturado; 814 Rechazo Externo; 193 Rechazo Interno; 119 Creada; 63 Facturar; 2 EDP Enviado al Cliente; 1 Refacturado.
- Currency: 8,667 CLP; 8,229 UF; 1 USD; 1 blank.
- Quality findings: 378 rows without invoice number, 113 zero amounts, one blank RUT/code/quotation/currency row and a maximum amount of 163,063,043 requiring outlier review.

**Correct destination:** one Billing Event per external SharePoint item, associated to Company and, where deterministically resolvable, Service and originating Deal. It is not a Ticket import and must not become repeated Company amount properties.

**Required before import:** approve Billing Event grain/key; create Company ANAM-code identity; reconcile RUT/code to Company; define quotation/EDP linkage; approve currency and UF/FX rules; define Refacturado/credit behavior; profile outliers; run idempotent no-write migration and reconciliation totals.

### Customer segmentation - Pablo Puga

**File:** `2026-04-01_segmentacion-clientes.xlsx`

**Decision:** `CANDIDATE / NO-GO FOR IMPORT NOW`

- 2,611 populated customer rows with 2,611 unique CeCo values.
- Candidate Company attributes: ANAM/CeCo code, legal name, fantasy name, commune, business activity, region and market segment.
- 2,605 unique fantasy names but only 1,726 populated legal names; 884 rows lack legal name.
- 72 rows contain more than one CeCo in the source cell.
- Region includes legacy numeric codes plus anomalous values such as `0` and `I`.
- Segment labels are populated, but the workbook uses formulas for the mapping and includes categories requiring ratification (`Otros Rubros`, `Desconocido`, spelling variants and legacy taxonomy).
- No RUT is present, so name-only matching against HubSpot is unsafe.

**Correct destination:** governed Company enrichment after an ANAM-code property and deterministic identity crosswalk exist. Do not create Companies from unmatched names and do not overwrite existing Company geography or industry without precedence rules.

**Required before import:** flatten/recalculate formulas; split or resolve multi-CeCo rows; approve market taxonomy and region mapping; crosswalk CeCo to Company using verified RUT/code evidence; classify unmatched/conflicting rows; dry-run before/after values with named reviewer.

## 2. HubSpot configuration inputs, not record imports

### Current operational, administrative and Quality flow

**File:** `2026-07-09_flujo-operativo-administrativo-calidad.docx`

**Decision:** `USE FOR CONFIGURATION`

Defines three human-work categories: service-result/follow-up, billing and Quality requirements (compliments, appeals and complaints). It supplies intake fields, routing addresses and the need to preserve the responsible service/sales engineer. Use it for Ticket type/subtype, required intake, associations, routing, SLA and Customer Agent handoff. Do not import its bullet points as records.

### HubSpot form observations

**File:** `2025-06-19_observaciones-plantilla-hubspot.docx`

**Decision:** `USE FOR FORM/PROCESS DESIGN; REVALIDATE AGE`

Contains actionable requirements: hide matrix/parameter questions outside sampling and analysis; always capture comparison standard; conditionally hide sampling-point conditions; rename location copy; accept the environmental instrument as an attachment; capture whether the report recipient is a third party and collect its details; consolidate the journey into one form. Use as a design input after comparing it with the current live form. It is not a backfill source.

### Market size and strategic sectors

**File:** `2026-06-30_tamano-mercado-sectores-estrategicos-abril-2026.xlsx`

**Decision:** `USE FOR TAXONOMY/KPI DESIGN; DO NOT IMPORT`

The workbook contains exchange-rate assumptions, market-sector codes, TAM/SAM estimates, penetration targets, mining contract history and narrative research. It mixes incompatible or insufficiently sourced estimates: for example, mining TAM appears as US$200M in one sheet and US$95-120M in another, while a North-zone model uses US$45M. Several sector rows lack SAM, sales and target values. Use it to facilitate approval of sector taxonomy, methodology, period, FX source and KPI owner. Do not populate Company segments, targets or dashboards directly from it.

## 3. Reference only

| File | Why it is retained | Why it should not enter CRM |
|---|---|---|
| `2026-07-08_flujo-operativo-administrativo.docx` | Prior version for change provenance | Superseded by the 2026-07-09 version, which adds Quality |
| `2026-06-19_template-slide.pptx` | Shows an intended executive KPI slide style and sample labels | One presentation slide with manually composed values, no stable grain or period contract |
| `2025-04-24_hubspot-order-7208281.pdf` | Subscription, seat and term evidence | Account/billing contract already belongs to HubSpot account administration, not CRM records |
| `2025-04-24_hubspot-invoice-613551177.pdf` | Billing provenance for the HubSpot subscription | Vendor invoice, not ANAM customer billing or commercial pipeline data |
| `2025-04-24_hubspot-credit-memo-1726706.pdf` | Documents the seat downgrade credit | Vendor credit memo, not a customer, Deal, Service or Billing Event |

The three HubSpot commercial PDFs contain sensitive contractual and billing details. Keep them access-controlled; do not attach them to the ANAM Company record or expose them to Customer Agent knowledge.

## 4. Exclude from HubSpot work

| File | Finding | Treatment |
|---|---|---|
| `2025-03-24_formulario-proximos-pasos.png` | Visual inspection confirms it is Julio Reyes' email-signature banner, not a form screenshot | Exclude; the original archive README description was corrected |
| `2025-04-24_voicemail-9-seconds.mp3` | Ten-second voicemail artifact with no structured identity or process contract; no transcript accompanies it | Exclude from CRM migration and knowledge. Human review is only warranted if email provenance requires it |

## Import order implied by this classification

1. Use the configuration documents to finish Ticket/form design; this does not authorize writes.
2. Resolve Company identity and ANAM code before either spreadsheet can update CRM records.
3. Reconcile and approve the Company segmentation taxonomy before a bounded enrichment dry-run.
4. Close Billing Event architecture and currency/association gates before staging the 16,898-row ledger.
5. Keep reference and excluded files outside HubSpot objects, knowledge bases and agent prompts.

## Safety conclusion

No file in the archive is ready for direct import today. Two are valuable migration sources after prerequisites; three are design inputs; the remaining seven should not create or update HubSpot records.

The two migration candidates were subsequently modeled together in [`anam-account-unit-billing-event-converged-model-2026-07-16.md`](anam-account-unit-billing-event-converged-model-2026-07-16.md). The key decision is to introduce a provisional Account Unit grain between Company and Billing Event rather than forcing multiple ANAM/CeCo codes into Company.
