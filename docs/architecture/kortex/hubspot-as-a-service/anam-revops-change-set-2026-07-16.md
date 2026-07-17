# ANAM RevOps Change Set

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** A1 reverted after semantic correction; A2 complete; Slice B remains blocked
> **Baseline:** [`anam-hubspot-schema-readback-2026-07-16.md`](anam-hubspot-schema-readback-2026-07-16.md)

## Execution decision

After the business-logic review, the full Notion meeting history and authenticated consumer inventory established the boundary for the low-risk reconciliation:

- `Down-sell` is continuity at a lower comparable quantity/value, but the operator clarified that it was intentionally removed because it is not a type of income.
- `Down-sell` is a Retention movement, distinct from churn and from a first award below quotation.
- The four reports consuming `tipo_de_ingreso` must not receive Down-sell as another income category.
- `variacion_contrato` has zero records and zero declared consumers, so visible vocabulary can be reconciled while preserving internal values.
- The operator explicitly authorized implementation after the meeting review. No structural schema, record, pipeline, workflow or requiredness change was authorized.

See [`anam-revops-property-governance-2026-07-16.md`](anam-revops-property-governance-2026-07-16.md).

## Approval boundary

This change set records both the reversible execution and its correction. The current runtime is the authority: Down-sell hidden, quote-variance presentation reconciled.

Approving Slice A does not authorize Slice B, record backfills, requiredness, workflow activation, property archival or pipeline mutation.

## Slice A: low-risk property reconciliation

> **A1 was executed and reverted; A2 remains applied. Both were verified through CRM API readback.**

### A1. `Down-sell` visibility - reverted

Target: Deal property `tipo_de_ingreso`.

| Attribute | Before | After |
|---|---|---|
| Property label | Tipo de ingreso | No change |
| Option value | `Down-sell` | No change |
| Option label | Down-sell | No change |
| Option visibility | `hidden=true` | `hidden=true` after correction |
| Existing records | 0 Down-sell | No record write |

The option was briefly exposed and returned to `hidden=true` at `2026-07-16T09:13:40.908Z`. All labels, values, record counts and display order remained unchanged.

Proposed request:

```http
PATCH /crm/v3/properties/deals/tipo_de_ingreso
```

```json
{
  "options": [
    { "label": "Venta nueva", "value": "Venta nueva", "description": "", "displayOrder": 0, "hidden": false },
    { "label": "Upsell", "value": "Upsell", "description": "", "displayOrder": 1, "hidden": false },
    { "label": "Cross-sell", "value": "Cross-sell", "description": "", "displayOrder": 2, "hidden": false },
    { "label": "Renovación", "value": "Renovación", "description": "", "displayOrder": 3, "hidden": false },
    { "label": "Down-sell", "value": "Down-sell", "description": "", "displayOrder": 4, "hidden": true }
  ]
}
```

Current effect: users cannot select Down-sell as `tipo_de_ingreso`. The legacy option remains in the schema only for compatibility and has zero records. Future contraction reporting must come from the Retention/Service model.

### A2. Reconcile `variacion_contrato` presentation

Target: Deal property `variacion_contrato`.

| Attribute | Before | After |
|---|---|---|
| Property label | Variación contrato | Variación vs. cotizado |
| Description | Empty | Comparación del monto adjudicado respecto del monto cotizado. Se completa en Adjudicación. |
| Option label/value | Mismo valor / `Mismo valor` | Igual / `Mismo valor` |
| Option label/value | Mayor valor / `Mayor valor` | Mayor / `Mayor valor` |
| Option label/value | Menor valor / `Menor valor` | Menor / `Menor valor` |
| Existing records | 0 populated | No record write |

The visible labels adopt the business vocabulary while internal option values remain stable. This avoids breaking an unseen workflow, form, list or report that may compare the current literal values.

Proposed request:

```http
PATCH /crm/v3/properties/deals/variacion_contrato
```

```json
{
  "label": "Variación vs. cotizado",
  "description": "Comparación del monto adjudicado respecto del monto cotizado. Se completa en Adjudicación.",
  "options": [
    { "label": "Igual", "value": "Mismo valor", "description": "", "displayOrder": 0, "hidden": false },
    { "label": "Mayor", "value": "Mayor valor", "description": "", "displayOrder": 1, "hidden": false },
    { "label": "Menor", "value": "Menor valor", "description": "", "displayOrder": 2, "hidden": false }
  ]
}
```

Expected effect: the property appears with the wording approved in Maria Paz's email without migrating records or changing API values.

Rollback: restore the previous property label, empty description and previous option labels while preserving the same option values.

### Slice A verification

Execution readback:

- `tipo_de_ingreso.updatedAt`: `2026-07-16T09:13:40.908Z` after correction;
- all five options preserve internal values and order; `Down-sell.hidden=true`;
- `variacion_contrato.updatedAt`: `2026-07-16T09:07:24.158Z`;
- visible label, description and option labels match this change set; internal values are unchanged;
- Deal counts remain 1,240 total, Venta nueva 446, Upsell 141, Cross-sell 87, Renovación 234, Down-sell 0 and quote variation 0;
- no related workflow was activated.

After each PATCH:

1. GET the property and compare name, type, field type, group, options, order and visibility against this change set.
2. Re-run Deal value distributions and confirm no record changed.
3. Confirm `Down-sell` is not selectable as an income type.
4. Confirm `Variación vs. cotizado` displays `Igual`, `Mayor`, `Menor`.
5. Record timestamp, actor and response in the execution log.

Current CLI scopes do not expose creation-form requiredness or stage conditional rules. Slice A does not alter either setting.

## Slice B: blocked structural changes

### B1. Correct Growth stage metadata

`Radar 0%` (`1034441224`) is the first stage of `Crecimiento - Nuevos Negocios`, but runtime metadata says `isClosed=true`.

Current cohort:

- 10 active Deals in Radar;
- 8/10 have no `tipo_de_ingreso`;
- 4/10 only carry obsolete renewal=`false` without the canonical income type;
- at least two records appear to be test/deletion candidates: `Prueba` and `__BORRAR__`.

Proposed target after dependency review: keep stage ID and probability `0.0`, set `isClosed=false`. Do not change the stage ID or migrate records in the same operation.

Blocked by: Automation and pipeline v3 consumer visibility. A closed-state change can affect forecasts, lifecycle transitions, workflows, reports and stage analytics.

### B2. Requiredness and conditional display

Business target:

- `tipo_de_ingreso` required at the approved commercial capture point;
- `variacion_contrato` shown/required at `Adjudicación`.

Blocked by: the current credential cannot read stage rules, record creation forms or workflow consumers. No requiredness change should be inferred from email alone.

### B3. Region ownership

Do not copy Deal `zona` blindly into Company `region_de_chile`:

- Deal `zona` has 399 populated records and supports multiple values;
- Company `region_de_chile` has 0 records and supports one official region;
- several Deal values represent cities and surrounding areas rather than administrative regions;
- six Deals contain multiple regions.

Decision required: Company headquarters/legal region versus Deal execution region. Both can remain valid if their definitions are explicit.

### B4. Duplicate and obsolete properties

Do not archive yet:

- `resultado_de_retencion`;
- `es_la_renovacion_de_un_negocio_similar_anterior_`;
- `tipo_de_servicio`;
- duplicated technical quotation properties on Company and Deal.

They require workflow/form/list/report dependency inspection, target-grain approval and a record-level migration plan. `resultado_de_retencion` already has 12 values and the obsolete renewal boolean has 557.

Of those records, 122 have the obsolete renewal boolean but no `tipo_de_ingreso`; archiving the field now would remove their only available renewal classification. Another 210 Deals have neither field and belong in the backfill exception queue.

## Dependency access required

The current HubSpot personal access key is missing:

| Surface | Required read access |
|---|---|
| Workflows | `automation` or the compatible legacy automation read scope |
| Forms | `forms` / `forms-read` |
| Lists/segments | `crm.lists.read` |
| Tickets | `tickets-read` or `tickets-access` |
| Custom objects | `crm.schemas.custom.read` |
| Pipeline v3 details | credential type accepted by the endpoint |

These are read dependencies for the audit. They do not justify write scopes.

## Remaining approval boundary

A2 is complete and A1 is reverted. Slice B remains explicitly unapproved and blocked pending dependency inspection and business decisions. Follow the commercial-first operating model before proposing further writes.
