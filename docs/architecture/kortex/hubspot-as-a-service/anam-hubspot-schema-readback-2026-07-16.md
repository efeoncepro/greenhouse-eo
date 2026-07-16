# ANAM HubSpot Schema Readback

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Mode:** initial read-only CLI inventory plus authenticated portal readback
> **Execution status:** Slice A property presentation reconciled after approval; no CRM records, pipelines, workflows or associations changed

## Executive finding

ANAM already has a substantial CRM schema and active historical use. The next step is schema reconciliation, not bulk property creation.

The most important findings are:

1. `tipo_de_ingreso` is populated on 908 of 1,240 Deals; `Down-sell` remains intentionally hidden because it is not an income type and has no records.
2. `variacion_contrato` now matches the agreed visible label and options, while preserving internal values; it has no records.
3. region is represented twice: `zona` on Deal has 399 records, while the more canonical `region_de_chile` on Company has none.
4. technical quotation fields are duplicated between Deal and Company; the Company copies have only two records and most Deal copies have none.
5. retention and service classifications overlap across multiple properties with different vocabularies.
6. the Growth pipeline starts with `Radar 0%` marked as closed, which can distort reporting and automation.
7. Ticket remains close to the HubSpot default: generic English stages and no custom Ticket properties were visible through the accessible schema endpoint.
8. The standard Service object (`0-162`) is active but has only one sample-like record, a default English pipeline and no complete contract model.

## Inventory and access boundary

| Object | Properties | Custom properties | Records |
|---|---:|---:|---:|
| Deal | 262 | 25 | 1,240 |
| Company | 268 | 28 | 1,023 |
| Contact | 406 | 6 | 8,859 |
| Ticket | 186 through legacy readback | 0 detected | Not readable with current scope |
| Service (`0-162`) | 43 through portal readback | 2 | 1 |

The personal access key can read Deal, Company and Contact properties and records. Current limitations:

- pipeline v3 endpoints reject user-level OAuth tokens;
- Ticket v3 properties require `tickets-read` or `tickets-access`;
- custom-object schemas require `crm.schemas.custom.read` or an equivalent custom-object read scope;
- stage-level required properties and conditional visibility were not exposed by the accessible endpoints.
- Service API readback requires `crm.objects.services.read`; the current CLI credential does not have it.

These limits mean requiredness and conditional rules still need an authenticated portal readback or a credential with the missing scopes before any change is approved.

### Dependency audit result

Read attempts against Workflows, Forms and Lists returned explicit missing-scope errors:

- Workflows: `automation` / compatible legacy automation access;
- Forms: `forms`, `forms-read` or compatible legacy access;
- Lists/segments: `crm.lists.read`;
- Ticket v3: `tickets-read` or `tickets-access`.

The API-only conclusion was that consumers were **indeterminate**, not that no consumers existed. A later authenticated portal readback resolved aggregate usage for selected high-risk Deal fields: `tipo_de_ingreso` has 9 consumers (4 reports, 2 workflows, one create-record form, one dependent conditional rule and one property card); `linea_de_negocio_anam` has 4; `resultado_de_retencion` and `zona` each have one dependent rule; `variacion_contrato`, the obsolete renewal boolean and `tipo_de_servicio` report zero. Individual workflow/report contracts still require focal inspection. No matching references were found in the Greenhouse workspace or the ANAM CMS React project.

## Standard Service object

The 17 June meeting identified HubSpot Service as the post-award contract/service grain. Authenticated runtime inspection confirms it is active.

- Pipeline `Service Pipeline` (`ba9cdbd6-e220-45b2-a5a2-d67ebdcbade6`) has `New`, `In progress` and `Closed`; no pipeline rules are configured.
- One record exists: `Muestreo y Análisis de agua - nestlé`, associated to Nestlé but not to an originating Deal.
- Its category is `Incorporación a Marketing Hub`, which does not fit ANAM's taxonomy and should be treated as a setup/sample anomaly.
- Two custom properties exist: `fecha_de_vencimiento_del_contrato` and `monto_original`; both have zero coverage.
- Relevant standard properties include category, total cost, state, start date, target end date, close date, paid amount, remaining amount, pipeline, stage and owner.

This object should be extended through an approved data dictionary, not replaced with a new custom contract object. Repeated billing events still require their own source/grain decision.

## Deal revenue and retention

### `tipo_de_ingreso`

Configuration: `enumeration/select`, group `dealinformation`.

| Option | Visible | Records |
|---|---|---:|
| Venta nueva | Yes | 446 |
| Upsell | Yes | 141 |
| Cross-sell | Yes | 87 |
| Renovación | Yes | 234 |
| Down-sell | **No** | 0 |

Total coverage is 908/1,240 Deals, or 73.2%. Four options are visible; the legacy Down-sell option stays hidden. Down-sell belongs to Retention movement on comparable Services, not income classification. The open semantic issue remains: a single-select field cannot represent compound `Venta nueva + Cross-sell` or `Renovación + Cross-sell` cases; line items and a separately approved mechanism must preserve those components.

Related overlap:

| Property | Configuration | Current use | Finding |
|---|---|---:|---|
| `resultado_de_retencion` | Upselling / Downselling / Sin variacion | 12 | Candidate Retention movement field, but its definition and dependent rule require inspection before reuse. |
| `es_la_renovacion_de_un_negocio_similar_anterior_` | Yes / No | 557 | Still populated although email decisions described it as obsolete. |
| `tipo_de_contrato` | Retainer / Spot | 0 | Created but unused. |
| `monto_original` | Number | 3 | Insufficient coverage for variation analysis. |

The 12 populated `resultado_de_retencion` records contain 9 `Upselling` and 3 `Sin variacion`, distributed across Venta nueva, Cross-sell, Upsell and Renovación. This may reflect a separate retention movement rather than duplication. Do not retire, rename or backfill it until the capture event, eligible cohort and dependent rule are understood.

The canonical and obsolete renewal fields overlap as follows:

- 435 Deals have both fields;
- 473 have only `tipo_de_ingreso`;
- 122 have only the obsolete renewal boolean;
- 210 have neither.

The 122 records that depend exclusively on the obsolete boolean require migration review before that property can be archived.

### `variacion_contrato`

Runtime definition after Slice A:

- label: `Variación vs. cotizado`;
- internal name: `variacion_contrato`;
- type: `enumeration/select`;
- visible options: `Igual`, `Mayor`, `Menor`;
- preserved internal values: `Mismo valor`, `Mayor valor`, `Menor valor`;
- description: `Comparación del monto adjudicado respecto del monto cotizado. Se completa en Adjudicación.`;
- current records: 0.

The property now matches the agreed visible vocabulary without changing internal option values. It remains manual and empty; monetary quote and award sources are still required before deriving or reporting the result reliably.

## Commercial and service classification

| Property | Options | Records | Finding |
|---|---|---:|---|
| `linea_de_negocio_anam` | Five ANAM business lines | 1,239 | Near-universal and the strongest current service classifier. |
| `tipo_proceso_comercial_anam` | Licitación / Venta Directa | 1,229 | Near-universal and actively useful. |
| `tipo_de_servicio` | DyCo / Fic / Otro | 0 | Unused and overlaps business line with different vocabulary. |
| `sector_estrategico` on Company | Seven sectors | 0 | Taxonomy exists but has no adoption. |

`linea_de_negocio_anam` should be treated as the current service classification source unless ANAM approves a replacement. `tipo_de_servicio` should not become mandatory while its ownership and relationship to the business-line property remain unresolved.

## Region and company model

Two geographic models coexist:

| Object/property | Type | Values | Records | Finding |
|---|---|---:|---:|---|
| Deal `zona` | Multi-checkbox | 16 operational labels/values | 399 | Values mix regions with cities or surrounding areas. |
| Company `region_de_chile` | Single-select | 16 official Chilean regions | 0 | Better canonical company geography, but not backfilled. |

`zona` values are not stable region identifiers: examples include `Atacama -> Copiapó y alrededores`, `Metropolitana -> Santiago y alrededores` and `Maule -> Talca y alrededores`. A migration cannot be a blind copy if multi-region Deals are valid.

Company-to-company schema exposes HubSpot-defined `Parent Company` and `Child Company` associations. No custom association label was found. Company also exposes standard read-only parent/child fields, but association coverage was not measured in this cut.

Company identity and administration gaps:

- custom `rut` exists but is not unique and is populated on 18 Companies;
- `razon_social`, `giro` and legal-representative name exist;
- no dedicated billing contact, billing email, payment terms, invoice identifier, OC/HES/HAS field, external customer ID or external contract ID exists on Company;
- contract dates are absent from the custom schema, so the planned 60-day renewal workflow has no reliable source field.

## Technical quotation data

Several water/laboratory intake fields exist on both Deal and Company with inconsistent types. Current coverage indicates that neither copy is an established operational source.

| Concept | Deal | Company | Deal records | Company records |
|---|---|---|---:|---:|
| Number of samples | `numero_de_muestras` number | same | 0 | 2 |
| Matrix | `tipo_de_matriz` select | `matriz` select | 0 | 2 |
| Parameters | `parametros_por_cotizar` multi-checkbox | select/text variants | 0 | 2 |
| Frequency | `frecuencia_del_servicio` select | same | 0 | Not material |
| Sample taker | multi-checkbox | single-select | Not material | 2 |
| Estimated service date | datetime | date | Not material | Not material |

This schema should not be expanded service by service until the grain is decided:

- Company for durable client attributes;
- Deal for the commercial opportunity and quote-level requirements;
- a line item or custom object for repeated sampling points, matrices, parameters or service executions.

The 16,898-row billing/service dataset cannot safely fit into one set of Company or Deal properties because it contains repeated services, dates, amounts, invoices and operational identifiers.

## Pipelines

### Growth: `Crecimiento - Nuevos Negocios`

Stages: `Radar 0%`, `Potencial 10%`, `Calificado 30%`, `Interesado 50%`, `Hot 85%`, `Cierre ganado 100%`, `Cierre perdido 0%`, `Desestimado o Desierto`.

`Radar 0%` is marked `isClosed=true` despite being the first stage. This must be verified in the portal before changing it because any automation or reporting based on closed-state metadata may already be affected.

There are 10 active Deals currently in Radar. Eight lack `tipo_de_ingreso`; four of those only contain the obsolete renewal flag set to `false`. Two records appear to be hygiene/test candidates (`Prueba` and `__BORRAR__`).

### Retention: `Fidelización - Renovaciones`

Stages: `Potencial 10%`, `Calificado 30%`, `Intereado `, `Hot 85%`, `Cierre ganado`, `Cierre perdido`, `Desestimado o Desierto`.

The exact runtime label `Intereado ` contains a spelling error and a trailing space.

### Ticket: `Support Pipeline`

Stages remain the default English set: `New`, `Waiting on contact`, `Waiting on us`, `Closed`. No ANAM-specific Ticket properties were detected. This does not yet represent the billing and operational case taxonomy requested by Maria Paz.

## Reconciliation decisions required

1. Decide how compound Cross-sell cases are represented without corrupting Growth/Retention reporting.
2. Confirm `region_de_chile` as canonical Company geography and define how multi-region Deal execution remains represented.
3. Ratify the strategic-sector taxonomy before backfill.
4. Choose the grain and source of truth for technical quotation requirements.
5. Approve the standard Service data contract and the billing synchronization grain/unique external key.
6. Decide whether `resultado_de_retencion`, the obsolete renewal boolean and unused duplicate fields should be archived after dependency analysis.

## Proposed change sequence

Slice A is complete. No remaining change in this list is authorized by this readback.

The proposed, rollback-ready split is documented in [`anam-revops-change-set-2026-07-16.md`](anam-revops-change-set-2026-07-16.md).

1. Prepare and approve the standard Service data dictionary, associations, pipeline and migration dry-run.
2. Verify and correct the Growth pipeline closed-state anomaly separately.
3. Approve canonical owners for region, service classification and technical quotation data.
4. Run a dry-run backfill report with coverage, conflicts and sample human validation.
5. Configure requiredness only after backfill and focal workflow QA.
6. Design Ticket and billing synchronization after the source-of-truth decision, not by flattening the spreadsheet into ad hoc properties.

## Reproducibility

Primary read paths:

```bash
hs api /crm/v3/properties/deals --account 19893546
hs api /crm/v3/properties/companies --account 19893546
hs api /crm/v3/properties/contacts --account 19893546
hs api /crm/v4/associations/companies/companies/labels --account 19893546
hs api /crm/v3/objects/deals/search --account 19893546 -X POST --data '<read-only search>'
hs api /crm/v3/objects/companies/search --account 19893546 -X POST --data '<read-only search>'
hs api /crm-pipelines/v1/pipelines/deals --account 19893546
hs api /crm-pipelines/v1/pipelines/tickets --account 19893546
hs api /properties/v2/tickets/properties --account 19893546
```

The `POST` search requests were read-only queries against HubSpot CRM Search. Slice A was changed through the authenticated property editor and read back through the CRM properties API; no record mutation endpoint was called.
