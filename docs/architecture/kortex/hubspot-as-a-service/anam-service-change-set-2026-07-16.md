# ANAM Service Schema and Migration Change Set

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Object:** native Service `0-162`
> **Status:** Service property schema executed and read back; record/workflow/association writes not executed
> **Execution:** 2026-07-16 17:23 UTC

> **2026-07-16 semantic correction:** the forward-capture evidence in [`anam-phase-3-forward-service-capture-contract-2026-07-16.md`](anam-phase-3-forward-service-capture-contract-2026-07-16.md) supersedes the earlier single comparable-value and service-frequency model. TCV and ARR are separate facts, blank billing frequency is unknown, and billing cadence is not delivery frequency. Do not execute an older copy of this change set.

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

All properties belong to the native Service object and the dedicated property group below. They are non-form fields. Provenance/value projections are integration-managed; revenue model, renewal facts and activation evidence require governed human review; calculated readiness is API-managed.

| Group contract | Value |
|---|---|
| Object | native Service `0-162` |
| Internal group name | `anam_service_contract` |
| Visible group label | `Contrato y renovación ANAM` |
| Requested display order | `-1` |
| Live display order after HubSpot normalization | `1` |

Create/read back the group before any property:

```json
{
  "name": "anam_service_contract",
  "label": "Contrato y renovación ANAM",
  "displayOrder": -1
}
```

Property `name` values are stable internal identifiers in `snake_case`; property `label` values are human-readable sentence-case names shown to ANAM users.

| Internal name | Label | Type / field type | Contract |
|---|---|---|---|
| `anam_service_external_key` | Clave externa de servicio ANAM | string / text, unique | deterministic idempotency key; required for migrated production Services |
| `anam_source_line_item_id` | ID del line item de origen | string / text | immutable HubSpot line-item provenance |
| `anam_service_family` | Familia de servicio ANAM | enumeration / select | exact commercial family |
| `anam_revenue_model` | Modelo de ingreso del servicio | enumeration / select | reviewed one-time/recurring/usage/mixed classification; blank billing cadence does not decide it |
| `anam_service_currency` | Moneda del servicio | enumeration / select | original currency of TCV and ARR projections |
| `anam_awarded_contract_value` | Valor contractual adjudicado | number / number | line-item TCV in `anam_service_currency`; portfolio measure |
| `anam_annual_recurring_value` | Valor recurrente anual | number / number | line-item ARR in `anam_service_currency`; only meaningful for reviewed recurring/renewable scopes |
| `anam_renewal_eligibility` | Elegibilidad de renovación | enumeration / select | whether the scope can renew |
| `anam_renewal_status` | Estado de renovación | enumeration / select | current renewal outcome/work state |
| `anam_service_field_readiness` | Preparación de datos del servicio | calculated enumeration | same-record completeness only; associations remain a separate gate |

### Exact property-create requests

The scalar-property requests below are the current approval preview. Send each approved object independently as `POST /crm/v3/properties/0-162`; do not translate or regenerate options at execution time. The calculated readiness request is previewed separately because HubSpot does not expose a non-mutating parser-validation endpoint.

```json
[
  {
    "groupName": "anam_service_contract",
    "name": "anam_service_external_key",
    "label": "Clave externa de servicio ANAM",
    "description": "Clave determinística e idempotente del servicio materializado desde el Deal y line item de origen.",
    "type": "string",
    "fieldType": "text",
    "hasUniqueValue": true,
    "formField": false
  },
  {
    "groupName": "anam_service_contract",
    "name": "anam_source_line_item_id",
    "label": "ID del line item de origen",
    "description": "ID inmutable del line item de HubSpot que originó este servicio.",
    "type": "string",
    "fieldType": "text",
    "hasUniqueValue": false,
    "formField": false
  },
  {
    "groupName": "anam_service_contract",
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
    "groupName": "anam_service_contract",
    "name": "anam_revenue_model",
    "label": "Modelo de ingreso del servicio",
    "description": "Clasificación revisada del modelo económico del servicio; no se infiere desde una frecuencia de cobro vacía.",
    "type": "enumeration",
    "fieldType": "select",
    "hasUniqueValue": false,
    "formField": false,
    "options": [
      { "label": "Una vez", "value": "one_time", "displayOrder": 0, "hidden": false },
      { "label": "Recurrente", "value": "recurring", "displayOrder": 1, "hidden": false },
      { "label": "Por uso", "value": "usage_based", "displayOrder": 2, "hidden": false },
      { "label": "Mixto", "value": "mixed", "displayOrder": 3, "hidden": false },
      { "label": "Pendiente de revisión", "value": "pending_review", "displayOrder": 4, "hidden": false }
    ]
  },
  {
    "groupName": "anam_service_contract",
    "name": "anam_service_currency",
    "label": "Moneda del servicio",
    "description": "Moneda original de TCV y ARR del servicio; CLF representa UF en el contrato CRM.",
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
    "groupName": "anam_service_contract",
    "name": "anam_awarded_contract_value",
    "label": "Valor contractual adjudicado",
    "description": "TCV del line item de origen en la moneda original del servicio; no representa facturación.",
    "type": "number",
    "fieldType": "number",
    "hasUniqueValue": false,
    "formField": false
  },
  {
    "groupName": "anam_service_contract",
    "name": "anam_annual_recurring_value",
    "label": "Valor recurrente anual",
    "description": "ARR del line item de origen en la moneda original; usar sólo en alcances recurrentes o renovables revisados.",
    "type": "number",
    "fieldType": "number",
    "hasUniqueValue": false,
    "formField": false
  },
  {
    "groupName": "anam_service_contract",
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
    "groupName": "anam_service_contract",
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

### Calculated readiness preview

The formula classifies same-record readiness only. It does not inspect associations.

```json
{
    "groupName": "anam_service_contract",
  "name": "anam_service_field_readiness",
  "label": "Preparación de datos del servicio",
  "description": "Clasifica completitud determinística, revisión humana pendiente y ausencia de ARR para modelos recurrentes o mixtos. No valida asociaciones.",
  "type": "enumeration",
  "fieldType": "calculation_equation",
  "calculationFormula": "if (not is_present(string(hs_name)) or not is_present(string(hs_pipeline_stage)) or not is_present(string(hs_status)) or not is_present(string(hubspot_owner_id)) or not is_present(hs_start_date) or not is_present(hs_target_end_date) or not is_present(string(anam_service_external_key)) or not is_present(string(anam_source_line_item_id)) or not is_present(string(anam_service_family)) or not is_present(string(anam_service_currency)) or not is_present(anam_awarded_contract_value) or anam_awarded_contract_value <= 0 or not is_present(string(anam_revenue_model)) or not is_present(string(anam_renewal_eligibility)) or not is_present(string(anam_renewal_status))) then 'incomplete_core'\nelseif (string(anam_revenue_model) equals 'pending_review' or string(anam_renewal_eligibility) equals 'pending_review') then 'review_pending'\nelseif ((string(anam_revenue_model) equals 'recurring' or string(anam_revenue_model) equals 'mixed') and (not is_present(anam_annual_recurring_value) or anam_annual_recurring_value <= 0)) then 'recurring_value_missing' else 'fields_ready'",
  "hasUniqueValue": false,
  "formField": false,
  "options": [
    { "label": "Datos base incompletos", "value": "incomplete_core", "displayOrder": 0, "hidden": false },
    { "label": "Revisión humana pendiente", "value": "review_pending", "displayOrder": 1, "hidden": false },
    { "label": "ARR recurrente faltante", "value": "recurring_value_missing", "displayOrder": 2, "hidden": false },
    { "label": "Campos preparados", "value": "fields_ready", "displayOrder": 3, "hidden": false }
  ]
}
```

Validation basis:

- native Service fields and types were read back live on 2026-07-16;
- enumeration/string casting, `is_present`, `not`, `and`/`or`, comparisons and `if`/`elseif` branches match HubSpot's current Properties API grammar;
- the live Phase 1 property `resultado_comercial_reportable_anam` proves this portal accepts calculated-enumeration branches and internal option values;
- HubSpot accepted the create request and normalized only redundant parentheses around `is_present(...)`; all branches, comparisons and internal option values survived readback.

Representative truth table:

| Case | Expected output | Reason |
|---|---|---|
| Missing Company or originating Deal association, all fields complete | `fields_ready` | Associations are deliberately outside the calculation; final creation/readback gate still fails. |
| Missing name, owner, dates, TCV or another required same-record field | `incomplete_core` | Deterministic core is absent or TCV is non-positive. |
| Revenue model or renewal eligibility equals `pending_review` | `review_pending` | A human decision remains; it is not a data-ingestion error. |
| `recurring` or `mixed` with missing/zero ARR | `recurring_value_missing` | Recurring comparison value is not usable. |
| `one_time` or `usage_based` with ARR empty, all other fields reviewed | `fields_ready` | ARR is not fabricated for a non-recurring model. |
| Complete reviewed `recurring`/`mixed` Service with positive ARR | `fields_ready` | Same-record field contract passes; association gates still apply. |

Final panel eligibility is:

```text
anam_service_field_readiness = fields_ready
AND exactly one distinct Company association
AND exactly one originating Deal association
AND no external-key or source-line-item conflict
AND the panel-specific Service lifecycle-stage filter
```

The calculated property was created only after all nine scalar properties passed readback. Its value remained `null` through the immediate four-read/~30-second window, then propagated naturally to `incomplete_core` on the sole sample-like Service. No record was touched to force recalculation.

## Schema execution readback

Execution through the approved Kortex portal-scoped runtime produced:

| Surface | Result |
|---|---|
| Property group | `anam_service_contract` / `Contrato y renovación ANAM`, active; HubSpot normalized display order `-1` to `1` |
| Scalar properties | 9 created; names, labels, group, types, field types, uniqueness and option values passed readback |
| Calculated property | `anam_service_field_readiness` created; enumeration options and normalized formula passed semantic readback |
| Calculated-property limits | 3 / 40 overall: Deal 2, Service 1 |
| CRM record writes | 0 |
| Workflow/association/report writes | 0 |
| Existing Service value | naturally propagated to `incomplete_core`, as expected for missing core fields |

Created timestamps range from `2026-07-16T17:23:15.159Z` to `2026-07-16T17:23:21.125Z`. `anam_service_external_key` is the only new unique property. All ten properties are in the dedicated native Service group and their visible labels are human-readable rather than `snake_case`.

Do not archive `fecha_de_vencimiento_del_contrato`, `monto_original` or populate `hs_total_cost` in this slice. First inventory consumers and compare their semantics with `hs_target_end_date`, `anam_awarded_contract_value` and `anam_annual_recurring_value`.

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
4. amount, TCV, ARR, currency and stable line-item ID are present;
5. deterministic key is absent from existing Services.

Deterministic key:

```text
ANAM-SVC:HS-DEAL:<dealId>:LINE:<lineItemId>
```

One eligible line item produces one proposed Service row. The dry-run output must include Deal, Company, line item, proposed Service name/key, family, reviewed revenue model, billing-cadence evidence, currency, TCV, ARR, dates, lifecycle stage and every quarantine reason. Blank billing frequency remains unknown and does not become `one_time`.

Stage mapping:

- `New`: awarded but operational activation is not confirmed;
- `In progress`: contracted service is active;
- `Closed`: service delivery is completed/ended, never merely because the Deal is won.

Quarantine, with no write, when Company cardinality is not one, mapping is `Otros`, `Monitoreo Integral Minero` remains unratified, dates/currency/TCV are missing, a source line item maps twice, or the stable key already exists with conflicting data. Missing ARR requires review for recurring/renewable scopes; it is not silently converted to zero.

## Gates and acceptance

Before any record execution:

- approve the two remaining catalog mappings, TCV as portfolio value and ARR as the recurring Retention comparison value;
- snapshot current Service schema, association definitions and records;
- dry run reports 100% of candidate line-item value as mapped or explicitly quarantined;
- zero duplicate external keys;
- no sample-like Service is silently reused as production data.

Schema execution acceptance — completed:

- [x] GET every property and compare type, options, uniqueness and group;
- [x] verify visible labels and internal names separately;
- [x] verify the calculated formula after HubSpot normalization;
- [x] verify calculated-value propagation on the existing sample-like Service without forcing a record write (`incomplete_core`);
- GET all association label definitions and record returned type IDs in the execution log;
- create no Service until schema readback passes.

After a separately approved migration:

- every created Service has exactly one Company, one originating Deal and one source line-item ID;
- all migrated Services have unique external key, family, currency, TCV, reviewed revenue model and appropriate dates; recurring/renewable Services also have reviewed ARR semantics;
- renewal fields are populated or explicitly pending/not applicable;
- rerunning the migration creates zero duplicates;
- record counts and quarantines reconcile to the approved dry run.

Rollback: property/label creation is reversible only before consumers and records depend on it. Record migration rollback must archive only IDs emitted by the execution ledger; it must never delete or mutate pre-existing Services.

Executed schema approval did not approve migration writes, workflows, pipeline changes, association-label creation, archival of legacy properties or dashboard publication.
