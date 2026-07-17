# ANAM Phase 3 — Forward Service Capture Contract

> **Date:** 2026-07-16
> **Client:** ANAM, client of Efeonce
> **Client portal:** HubSpot `19893546`
> **Status:** property schema executed/read back; forward record pilot still requires separate approval
> **Mode:** live read-only evidence plus deterministic design
> **HubSpot writes:** one Service property group and ten Service property definitions; zero CRM record/workflow/association/report writes

## Purpose and boundary

Create trustworthy native Services prospectively from awarded Deal line items so ANAM can operate the Service Portfolio, Expiry/Renewal, Retention and Loyalty panels without inventing historical data. ANAM owns the portal, records, definitions and dashboards. Greenhouse stores only the Efeonce engagement canon and skills; Kortex supplies the approved portal-scoped runtime.

Historical bulk backfill remains `NO-GO`. This contract starts with future awards and a human-reviewed pilot.

## Two separate gates

### 1. Award gate — commercial evidence

A line item may enter the Service proposal queue only when:

1. its Deal is in an exact approved Closed Won stage;
2. the Deal resolves to exactly one Company after deduplicating associations by Company object ID;
3. the Deal has at least one line item and the current line item has a stable HubSpot ID;
4. `hs_product_id` resolves to a reviewed Product/service-family mapping;
5. original currency, `amount`, `hs_tcv` and `hs_arr` are available;
6. an accountable owner can be proposed under the approved inheritance rule; and
7. the deterministic external key does not already exist with conflicting evidence.

Failure creates a review/quarantine item. It never creates an inferred Service.

### 2. Activation gate — operational evidence

Passing the award gate creates, after separately approved execution, a proposed Service in `New`; Closed Won does not prove that delivery started. A human reviewer must confirm Service start, target end, revenue model, renewal eligibility and owner. Move the Service to `In progress` only when operational activation is confirmed, and to `Closed` only when delivery has ended.

## Source and semantic mapping

| Target fact | Canonical source | Rule |
|---|---|---|
| Service identity | Deal ID + line-item ID | Unique key `ANAM-SVC:HS-DEAL:<dealId>:LINE:<lineItemId>`; never name-based identity. |
| Customer | native Company association | Exactly one distinct Company ID; duplicate association labels do not create multiple customers. |
| Originating sale | native Deal association + label | Preserve the originating Deal; a later renewal Deal has a separate role. |
| Sold component | native line item and `hs_product_id` | Product supplies reviewed family mapping; line item remains the awarded grain. |
| Contract value | line-item `hs_tcv` | Original-currency total contract value for portfolio reporting; never sum across currencies. |
| Comparable recurring value | line-item `hs_arr` | Annualized recurring value for renewable/recurring cohort comparisons; not a universal awarded amount. |
| Currency | `hs_line_item_currency_code` | Persist original currency with every monetary projection. |
| Revenue model | reviewed human classification | `one_time`, `recurring`, `usage_based`, `mixed` or `pending_review`; blank billing frequency means unknown, not one-time. |
| Billing cadence | native line-item billing fields | Evidence about charging cadence only. It is not delivery/service frequency. |
| Service dates | native Service `hs_start_date`, `hs_target_end_date` | Human-confirmed operational/contract dates. Never infer from Deal close date. |
| Owner | native Service `hubspot_owner_id` | Proposed by approved inheritance rule and confirmed at activation. |
| Lifecycle and delivery state | native Service stage and `hs_status` | Stage controls lifecycle; status expresses delivery health/outcome, not commercial outcome. |
| Renewal eligibility | reviewed custom Service fact | Default `pending_review`; never inferred from Product name, billing cadence or AI. |

The existing Deal properties `fecha_estimada_del_servicio` and `frecuencia_del_servicio` are Deal-grain hints. They may support human review for an unambiguous single-line-item Deal, but they are not the Service source of truth and cannot be copied automatically for multi-component sales.

## Why TCV and ARR are separate

The read-only Closed Won cohort contains 220 line items and all 220 expose `amount`, `hs_tcv`, `hs_acv`, `hs_arr` and `hs_mrr`. The five line items with recurring-frequency evidence show that `amount` behaves as a periodic/net line amount while TCV represents the total contract value. The 215 blank-frequency records have zero ARR/MRR, but their blank cadence does not prove they are one-time.

Therefore:

- portfolio awarded value uses `hs_tcv` in original currency;
- Retention compares `hs_arr` only for a reviewed recurring/renewable cohort;
- `amount` remains source evidence, not the universal portfolio measure;
- the former single `anam_comparable_awarded_value` proposal is rejected as semantically overloaded.

## Proposed Service properties

Native Service fields remain the first choice. The minimum custom set belongs to native Service group `anam_service_contract`, visible as `Contrato y renovación ANAM`. Internal property names use `snake_case`; visible labels use human-readable sentence case.

| Internal name | Mechanism | Purpose |
|---|---|---|
| `anam_service_external_key` | unique custom text | Idempotent Service identity. |
| `anam_source_line_item_id` | custom text | Immutable line-item provenance. |
| `anam_service_family` | custom enumeration | Reviewed ANAM service family. |
| `anam_service_currency` | custom enumeration | Original currency for both monetary projections. |
| `anam_awarded_contract_value` | custom number | Line-item TCV in original currency. |
| `anam_annual_recurring_value` | custom number | Line-item ARR in original currency; meaningful only for reviewed recurring/renewable scopes. |
| `anam_revenue_model` | custom enumeration | `one_time`, `recurring`, `usage_based`, `mixed`, `pending_review`. |
| `anam_renewal_eligibility` | custom enumeration | `eligible`, `not_eligible`, `conditional`, `pending_review`. |
| `anam_renewal_status` | custom enumeration | Renewal work/outcome state; does not replace Service or Deal stage. |
| `anam_service_field_readiness` | calculated enumeration | Same-record completeness only: `incomplete_core`, `review_pending`, `recurring_value_missing`, `fields_ready`. |

The calculated readiness property checks the custom fields plus native name, stage, delivery status, dates and owner on the same Service. `review_pending` is distinct from missing deterministic data. `recurring_value_missing` applies only when the reviewed revenue model is `recurring` or `mixed` and ARR is absent or non-positive; a repeatable one-time service is not silently converted into recurring revenue. It cannot prove exactly-one Company, originating Deal, association labels or absence of conflicts; those remain creation/readback gates.

The exact API formula and truth table live in the reconciled Service change set. HubSpot accepted the formula and normalized redundant parentheses without changing its semantics. The portal now uses 3 of 40 calculated-property slots: two on Deal and one on Service. After the immediate propagation delay, the sole sample-like Service naturally resolved to `incomplete_core`; no record was modified to trigger it.

Do not create a duplicate custom billing-frequency field merely for convenience. Consumers should follow the originating line item unless a later report proves that a governed read-only projection is necessary.

## Smart properties and other advanced mechanisms

Smart properties are not part of the Phase 3 core. They are AI/Data Agent outputs that consume HubSpot Credits and require prompt, source, fill-policy and human-review governance. Official eligibility currently lists contacts, companies, deals, tickets and custom objects, not native Service; Service support must not be assumed.

A later Loyalty experiment may summarize cited activity or transcript evidence on a supported object for human review. It must not set identity, money, currency, lifecycle, renewal eligibility, churn, GRR/NRR or a red/amber/green health state. Rollups wait for governed Billing Events and associations; scoring waits for ratified signals, weights, cohorts, thresholds and actions; property sync is considered only for a deterministic read-only projection from one selected associated record.

## Pilot and approvals

Run the forward pilot on 3–5 future won Deal line items:

1. dry-run award-gate output and quarantines;
2. schema creation/readback — completed on 2026-07-16;
3. calculated-value propagation without modifying the sample-like Service — completed (`incomplete_core`);
4. approve first Service records separately;
5. review activation fields with ANAM's designated operator;
6. rerun idempotency and association checks;
7. publish panels only after the governed cohort reconciles.

The following decisions still require ANAM/operator ratification:

| Decision | Recommendation |
|---|---|
| Portfolio contract value | Use line-item TCV in original currency. |
| Retention comparison value | Use ARR only for reviewed recurring/renewable Services. |
| Service owner | Inherit a proposed owner from the Deal, then confirm at activation. |
| Blank billing frequency | Treat as unknown and review; never coerce to one-time. |
| Activation reviewer | Assign an explicit ANAM RevOps/operations owner before workflow activation. |

The completed schema execution does not approve Service creation, workflow activation, historical migration, association-label creation, legacy-property archival or dashboard publication.

## Official HubSpot references

- [Properties API guide](https://developers.hubspot.com/docs/api-reference/latest/crm/properties/guide)
- [Property field types](https://knowledge.hubspot.com/properties/property-field-types-in-hubspot)
- [Calculation and rollup properties](https://knowledge.hubspot.com/properties/create-calculation-properties)
- [Property sync](https://knowledge.hubspot.com/properties/create-sync-properties)
- [Smart properties](https://knowledge.hubspot.com/properties/create-smart-properties)
- [Calculated-property limits API](https://developers.hubspot.com/docs/api-reference/latest/crm/limits-tracking/get-calculated-properties)
