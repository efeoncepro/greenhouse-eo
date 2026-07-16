# ANAM Service Schema and Migration Change Set

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Object:** native Service `0-162`
> **Status:** approval-ready preview; no schema or record writes executed

## Target grain

One Service represents one awarded service component or contracted scope, normally derived from one Closed Won Deal line item. A Deal may therefore create several Services. Renewal creates a new Service linked to the prior Service; it never overwrites the historical Service.

## Live baseline

- one sample-like Service: `Muestreo y Análisis de agua - nestlé`;
- pipeline `ba9cdbd6-e220-45b2-a5a2-d67ebdcbade6` with stages New, In progress and Closed;
- native Service -> Deal association type `794`, Service -> Company type `792`;
- no Service self-association labels and no Service -> line item association labels;
- legacy custom properties `fecha_de_vencimiento_del_contrato` and `monto_original`, both with zero coverage at the inventory cut.

Native fields retained:

| Field | Use |
|---|---|
| `hs_pipeline`, `hs_pipeline_stage` | lifecycle placement |
| `hs_start_date` | contracted/operational start |
| `hs_target_end_date` | anticipated end |
| `hubspot_owner_id` | accountable owner |
| `hs_status` | delivery health/status, not lifecycle stage |

`hs_total_cost` is explicitly described by HubSpot as the total value in US dollars. It cannot safely represent ANAM's awarded value across CLF/CLP/USD, so this change set leaves it untouched.

## Property data dictionary

All properties belong to `service_information`, are non-form fields and are integration-managed unless stated otherwise.

| Internal name | Label | Type / field type | Contract |
|---|---|---|---|
| `anam_service_external_key` | Clave externa de servicio ANAM | string / text, unique | deterministic idempotency key; required for migrated production Services |
| `anam_source_line_item_id` | ID line item de origen | string / text | immutable HubSpot line-item provenance |
| `anam_service_family` | Familia de servicio ANAM | enumeration / select | exact commercial family |
| `anam_service_frequency` | Frecuencia del servicio | enumeration / select | contracted recurrence, not billing status |
| `anam_service_currency` | Moneda del servicio | enumeration / select | currency of awarded comparable value |
| `anam_comparable_awarded_value` | Monto adjudicado comparable | number / number | awarded amount in `anam_service_currency`, normalized to the approved comparison period |
| `anam_renewal_eligibility` | Elegibilidad de renovación | enumeration / select | whether the scope can renew |
| `anam_renewal_status` | Estado de renovación | enumeration / select | current renewal outcome/work state |

### Exact property-create requests

Send each object below as an independent `POST /crm/v3/properties/0-162`. Options and their internal values are part of the approval boundary; do not translate or regenerate them at execution time.

```json
[
  {
    "groupName": "service_information",
    "name": "anam_service_external_key",
    "label": "Clave externa de servicio ANAM",
    "description": "Clave determinística e idempotente del servicio materializado desde el Deal y line item de origen.",
    "type": "string",
    "fieldType": "text",
    "hasUniqueValue": true,
    "formField": false
  },
  {
    "groupName": "service_information",
    "name": "anam_source_line_item_id",
    "label": "ID line item de origen",
    "description": "ID inmutable del line item de HubSpot que originó este servicio.",
    "type": "string",
    "fieldType": "text",
    "hasUniqueValue": false,
    "formField": false
  },
  {
    "groupName": "service_information",
    "name": "anam_service_family",
    "label": "Familia de servicio ANAM",
    "description": "Familia comercial aprobada del alcance adjudicado.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "Muestreo y Análisis de Laboratorio", "value": "M&A", "displayOrder": 0, "hidden": false },
      { "label": "Diagnóstico y Control de Olores", "value": "D&CO", "displayOrder": 1, "hidden": false },
      { "label": "Flujo, Instrumentación y Control", "value": "FIC", "displayOrder": 2, "hidden": false },
      { "label": "Outsourcing Operativo de Laboratorios", "value": "Outs.", "displayOrder": 3, "hidden": false },
      { "label": "Capacitaciones y Auditorías", "value": "C&A", "displayOrder": 4, "hidden": false }
    ]
  },
  {
    "groupName": "service_information",
    "name": "anam_service_frequency",
    "label": "Frecuencia del servicio",
    "description": "Recurrencia contractual del alcance; no representa estado de facturación.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "Una vez", "value": "one_time", "displayOrder": 0, "hidden": false },
      { "label": "Mensual", "value": "monthly", "displayOrder": 1, "hidden": false },
      { "label": "Trimestral", "value": "quarterly", "displayOrder": 2, "hidden": false },
      { "label": "Semestral", "value": "semiannual", "displayOrder": 3, "hidden": false },
      { "label": "Anual", "value": "annual", "displayOrder": 4, "hidden": false },
      { "label": "Personalizada", "value": "custom", "displayOrder": 5, "hidden": false }
    ]
  },
  {
    "groupName": "service_information",
    "name": "anam_service_currency",
    "label": "Moneda del servicio",
    "description": "Moneda original del monto adjudicado comparable; CLF representa UF en el contrato CRM.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "UF", "value": "CLF", "displayOrder": 0, "hidden": false },
      { "label": "CLP", "value": "CLP", "displayOrder": 1, "hidden": false },
      { "label": "USD", "value": "USD", "displayOrder": 2, "hidden": false }
    ]
  },
  {
    "groupName": "service_information",
    "name": "anam_comparable_awarded_value",
    "label": "Monto adjudicado comparable",
    "description": "Monto adjudicado en la moneda del servicio y normalizado al período de comparación aprobado; no usar como monto facturado.",
    "type": "number",
    "fieldType": "number",
    "hasUniqueValue": false,
    "formField": false
  },
  {
    "groupName": "service_information",
    "name": "anam_renewal_eligibility",
    "label": "Elegibilidad de renovación",
    "description": "Define si el alcance contratado puede participar en una cohorte de renovación.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "Elegible", "value": "eligible", "displayOrder": 0, "hidden": false },
      { "label": "No elegible", "value": "not_eligible", "displayOrder": 1, "hidden": false },
      { "label": "Condicional", "value": "conditional", "displayOrder": 2, "hidden": false },
      { "label": "Pendiente de revisión", "value": "pending_review", "displayOrder": 3, "hidden": false }
    ]
  },
  {
    "groupName": "service_information",
    "name": "anam_renewal_status",
    "label": "Estado de renovación",
    "description": "Estado actual de la renovación del servicio; no reemplaza la etapa del Service ni del Deal.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "Aún no corresponde", "value": "not_due", "displayOrder": 0, "hidden": false },
      { "label": "Próxima", "value": "upcoming", "displayOrder": 1, "hidden": false },
      { "label": "Negocio de renovación abierto", "value": "renewal_deal_open", "displayOrder": 2, "hidden": false },
      { "label": "Renovado", "value": "renewed", "displayOrder": 3, "hidden": false },
      { "label": "No renovado", "value": "not_renewed", "displayOrder": 4, "hidden": false },
      { "label": "No aplica", "value": "not_applicable", "displayOrder": 5, "hidden": false }
    ]
  }
]
```

Do not archive `fecha_de_vencimiento_del_contrato`, `monto_original` or populate `hs_total_cost` in this slice. First inventory consumers and compare their semantics with `hs_target_end_date` and `anam_comparable_awarded_value`.

## Association labels

### Renewal lineage

```http
POST /crm/associations/v4/0-162/0-162/labels
```

```json
{
  "name": "anam_service_renewal_lineage",
  "label": "Renovado por",
  "inverseLabel": "Renovación de"
}
```

Direction: prior Service -> renewed Service is `Renovado por`; the inverse is `Renovación de`. Capture the returned type IDs and use readback instead of hardcoding them. HubSpot's paired-label behavior is documented in the [association labels guide](https://developers.hubspot.com/docs/api-reference/latest/crm/associations/associations-schema/guide).

### Deal roles

Create two paired label definitions from Service to Deal. Send each object independently to `POST /crm/associations/v4/0-162/0-3/labels`:

```json
[
  {
    "name": "anam_originating_deal_service",
    "label": "Negocio de origen",
    "inverseLabel": "Servicio adjudicado"
  },
  {
    "name": "anam_renewal_deal_service",
    "label": "Negocio de renovación",
    "inverseLabel": "Servicio renovado"
  }
]
```

The originating Deal label applies to the award that materialized the Service; the renewal Deal label applies only to a future renewal motion. Keep the standard unlabeled association for compatibility. Company association remains standard/unlabeled. Source line-item lineage is stored in `anam_source_line_item_id`; do not invent a line-item association without portal support.

## Won Deal line-item migration dry run

Candidate rule:

1. Deal is Closed Won;
2. Deal has one unambiguous associated Company;
3. line item is associated to that Deal and maps to an approved service family;
4. amount, currency and stable line-item ID are present;
5. deterministic key is absent from existing Services.

Deterministic key:

```text
ANAM-SVC:HS-DEAL:<dealId>:LINE:<lineItemId>
```

One eligible line item produces one proposed Service row. The dry-run output must include Deal, Company, line item, proposed Service name/key, family, frequency, currency, comparable amount, dates, lifecycle stage and every quarantine reason.

Stage mapping:

- `New`: awarded but operational activation is not confirmed;
- `In progress`: contracted service is active;
- `Closed`: service delivery is completed/ended, never merely because the Deal is won.

Quarantine, with no write, when Company cardinality is not one, mapping is `Otros`, `Monitoreo Integral Minero` remains unratified, dates/currency/amount are missing, a source line item maps twice, or the stable key already exists with conflicting data.

## Gates and acceptance

Before execution:

- approve the two remaining catalog mappings and exact comparison-period semantics for awarded value;
- snapshot current Service schema, association definitions and records;
- dry run reports 100% of candidate line-item value as mapped or explicitly quarantined;
- zero duplicate external keys;
- no sample-like Service is silently reused as production data.

After schema execution:

- GET every property and compare type, options, order, uniqueness and visibility;
- GET all association label definitions and record returned type IDs in the execution log;
- create no Service until schema readback passes.

After a separately approved migration:

- every created Service has exactly one Company, one originating Deal and one source line-item ID;
- all migrated Services have unique external key, family, currency, comparable value and appropriate dates;
- renewal fields are populated or explicitly pending/not applicable;
- rerunning the migration creates zero duplicates;
- record counts and quarantines reconcile to the approved dry run.

Rollback: property/label creation is reversible only before consumers and records depend on it. Record migration rollback must archive only IDs emitted by the execution ledger; it must never delete or mutate pre-existing Services.

Approving schema creation does not approve migration writes, workflows, pipeline changes, archival of legacy properties or dashboard publication.
