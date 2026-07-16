# HubSpot Property Types and Selection

> Verified: 2026-07-16
> Scope: managed client portals; confirm subscription, limits and API/UI availability in the target portal before execution.

## Four dimensions of a property

Do not use “property type” as one undifferentiated concept. Record all four dimensions:

1. **Storage type:** `bool`, `enumeration`, `date`, `datetime`, `string` or `number` in the Properties API.
2. **Field type/presentation:** text, textarea, phone, HTML/rich text, file, checkbox, radio, dropdown, date picker, number, calculation equation, etc.
3. **Population mechanism:** human/form, integration, workflow, native HubSpot process, calculation, rollup, property sync, scoring or Breeze/Data Agent.
4. **Governance:** default/custom, editable/read-only, unique, validation, access, sensitivity, source owner, required stage and consumers.

A smart property is not a new deterministic storage type. It is an eligible custom property whose values are filled by a Breeze/Data Agent prompt. API property metadata alone may show the underlying field but not prove the prompt, source selection, credit policy or auto-fill configuration.

## Selection matrix

| Mechanism | Use when | Avoid when | Required evidence |
|---|---|---|---|
| Native/default property | HubSpot already owns the exact fact and semantics. | The label is similar but the grain or currency meaning differs. | Live property definition, editability, coverage and consumer inventory. |
| Custom scalar property | A human or governed integration owns one atomic fact not modeled natively. | The value is derivable or belongs to another associated object. | Object/grain, type, source, owner, validation, requiredness and backfill. |
| Unique identifier | An external system needs deterministic upsert/idempotency. | A display label or mutable business name is being treated as identity. | Stable key design, collision test and object-level unique-property allowance. |
| Calculation/custom equation | A deterministic value derives from properties on the same record. | The logic needs associations, probabilistic evidence, manual judgment or a value written back by an integration. | Exact formula/output type, null branches, limit readback and representative values. |
| Time between/since/until | A duration derives from date fields on the same record. | The downstream builder does not support the relative-time property; time-until/since are not supported in the custom report builder. | Timezone, date-vs-datetime behavior, millisecond semantics and target builder QA. |
| Rollup | A min/max/count/sum/average/earliest/latest value derives from associated records. | The association/cardinality or currency/grain is ambiguous. | Association labels, eligible cohort, aggregation, currency and zero/null behavior. |
| Property sync | One associated record is the canonical source and the target only needs a read-only projection. | Multiple associated records cannot be selected deterministically, two-way editing is needed, or the source has restricted access. | Association label/record-selection rule, source property, latency and consumer migration. |
| Score | Approved fit/engagement criteria require a continuously updated numeric model. | A score is being used to hide missing definitions or as financial/lifecycle truth. | Inputs, weights, inclusion/exclusion cohort, thresholds, owner and performance review. |
| Smart property (Breeze/Data Agent) | Unstructured web, website, PDF, property, activity or transcript evidence needs summarization/categorization for human use. | Identity, currency, amount, lifecycle, compliance, renewal eligibility, accounting or any deterministic control. | Prompt, allowed sources, sample outputs, citations/source view, credit budget, fill policy, error rate and human review. |
| Workflow-populated property | A state transition or cross-object write requires explicit automation. | A native calculation, rollup or one-way sync can provide the value without duplicated writes. | Enrollment/re-enrollment, race/idempotency, writer ownership, failure path and readback. |
| Enrichment/default intelligence | Vendor enrichment owns a standard company/contact fact. | The field is client-authored truth or the provider/source/refresh semantics are unknown. | Provider, confidence, overwrite policy, refresh cadence, credits and access. |

## Base field guidance

- Use single-line text for short atomic values; multi-line text for human narrative, never structured lists that need filtering.
- Use dropdown/radio for one mutually exclusive governed value; multiple checkboxes only when values are independently true and reporting accepts multi-valued semantics.
- Use a single checkbox only for a real binary. If “unknown” matters, use an enumeration with an explicit pending/unknown option.
- Use date when the day is the fact; datetime when time and timezone change the decision.
- Use number with an explicit unit/format. Currency needs a paired currency contract; a currency display hint does not perform exchange conversion.
- Use HubSpot user when the person needs owner-like permissions/behavior. Do not store user identity in free text.
- Use file/rich text/URL/email only for their intended payload and access model. Do not put sensitive data in calculation, rollup, sync, HubSpot user or smart properties.

## Decision order

For every requested fact:

1. Verify object and grain.
2. Reuse an exact native property.
3. Prefer an association over copying another object’s identity.
4. Use property sync for a deterministic read-only associated projection.
5. Use rollup for an approved associated aggregation.
6. Use calculation for deterministic same-record derivation.
7. Use a custom scalar for an irreducible human/integration-owned fact.
8. Use a workflow only when an actual stateful write is required.
9. Use score or smart property only for an approved analytical/advisory question, never to repair missing core data.

## Calculation controls

- Read `/crm/limits/2026-03/calculated-properties` before proposing a calculation.
- API-created calculation properties are API-managed and cannot be edited in the HubSpot UI.
- Match all formula branches to the declared output type. Numeric formulas cannot return a blank string.
- Use `is_present`/`is_known` deliberately for null handling and read back representative positive, negative and unknown records after propagation.
- Keep deterministic absence, pending human review and semantic inconsistency as different outputs. A single “not ready” bucket hides the action required.
- A calculation can derive field readiness but cannot prove Company/Deal associations unless those facts are first materialized through a separately governed mechanism.
- Do not create time-until merely for a 30/60/90 report when direct date filters answer the question more portably.

## Smart-property controls

- Smart fills consume HubSpot Credits even when no value is produced.
- Creating an ordinary property “with Breeze” is not the same as configuring a smart property prompt.
- Smart properties require AI/CRM-data settings and may additionally use conversation or file data settings.
- They cannot use unique-value validation or Sensitive Data.
- Store the prompt, source class, auto-fill trigger/schedule, eligible segment, credit budget and human reviewer in the change set.
- Treat outputs as attributed evidence or working summaries. Preserve source visibility and never silently overwrite a ratified human value.
- Workflow/Data Agent APIs are evolving/beta surfaces; verify parity before promising programmatic creation or fill.

## ANAM application

For ANAM Phase 3:

- Reuse native line-item `hs_product_id`, `amount`, `hs_tcv`, `hs_arr`, `hs_line_item_currency_code`, `recurringbillingfrequency`, `hs_recurring_billing_period` and billing dates as source evidence.
- Reuse native Service `hs_start_date`, `hs_target_end_date`, `hubspot_owner_id`, `hs_pipeline_stage` and `hs_status`.
- Use a unique custom Service external key for idempotency and custom scalar properties only for ANAM facts that have no exact native Service home.
- Use a calculated Service field-readiness classifier only for same-record completeness, separating missing core fields, pending human review and missing recurring value. Associations remain a separate creation/readback gate.
- Defer rollups until Billing Events and association eligibility are live.
- Defer Loyalty scoring until signals, weights and actions are ratified.
- A smart property may later summarize cited activity/transcript risk evidence for human review on an officially supported associated object, or on Service only if the live portal proves that support. The current HubSpot eligibility documentation does not list Service. It must not set renewal eligibility, churn, revenue, lifecycle stage or a red/amber/green health state.

## Official references

- [Properties API guide](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/guide)
- [Property field types](https://knowledge.hubspot.com/properties/property-field-types-in-hubspot)
- [Calculation and rollup properties](https://knowledge.hubspot.com/properties/create-calculation-properties)
- [Property sync](https://knowledge.hubspot.com/properties/create-sync-properties)
- [Smart properties](https://knowledge.hubspot.com/properties/create-smart-properties)
- [Property validation](https://knowledge.hubspot.com/properties/set-validation-rules-for-properties)
- [Calculated-property limits API](https://developers.hubspot.com/docs/api-reference/latest/crm/limits-tracking/get-calculated-properties)
