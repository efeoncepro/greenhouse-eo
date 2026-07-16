# ANAM Phase 3 — Forward Pilot Dry Run

> **Date:** 2026-07-16
> **Client:** ANAM, client of Efeonce
> **Portal:** HubSpot `19893546`
> **Mode:** live read-only simulation after Service property-schema execution
> **Status:** superseded as execution input; the five rows were later approved as a controlled pilot
> **HubSpot record writes in this dry-run step:** none

> **Execution update:** the operator subsequently approved these exact five rows as a controlled incomplete pilot. Their creation/readback is recorded in [`anam-phase-3-forward-pilot-execution-2026-07-16.md`](anam-phase-3-forward-pilot-execution-2026-07-16.md). The dry-run evidence remains immutable; its original `NO-GO` applied before that separate approval.

## Purpose

Exercise the forward-capture contract against five recent, deterministic Closed Won line items without creating Services. These are historical simulation rows, not an approved backfill and not the actual future pilot. The real pilot starts with newly awarded work after ANAM ratifies owner inheritance and the activation reviewer.

## Selection

Readback covered all 1,240 Deals. The exact won stages contain 186 Deals that have at least one line item and exactly one distinct Company after association deduplication. The dry run selected the five most recent rows with distinct Companies and complete commercial identity/economic evidence:

- exact Closed Won stage;
- one distinct Company ID;
- stable Deal and line-item IDs;
- known Product;
- owner ID;
- original currency, amount, TCV and ARR fields present;
- no existing Service external-key conflict.

Blank billing frequency is retained as unknown and does not become `one_time`.

## Candidate output

| Closed date | Company | Deal / line item | Product → family | TCV / ARR | Proposed external key | Award gate | Activation gate |
|---|---|---|---|---:|---|---|---|
| 2026-07-01 | Gasmar (`54596735849`) | `60275616884` / `55275824439` | M&A - Integral → M&A | CLF 10 / 0 | `ANAM-SVC:HS-DEAL:60275616884:LINE:55275824439` | PASS | FAIL |
| 2026-06-19 | Hidrogistica (`54446552579`) | `61055146300` / `55917369471` | FIC - Contrastación Banco Pruebas → FIC | CLF 60 / 0 | `ANAM-SVC:HS-DEAL:61055146300:LINE:55917369471` | PASS | FAIL |
| 2026-06-10 | Härting (`54759669515`) | `60177850427` / `55191473805` | M&A - Integral → M&A | CLF 10 / 0 | `ANAM-SVC:HS-DEAL:60177850427:LINE:55191473805` | PASS | FAIL |
| 2026-06-01 | Golden Omega (`31619387666`) | `60781506633` / `55733568331` | M&A - Integral → M&A | CLF 10 / 0 | `ANAM-SVC:HS-DEAL:60781506633:LINE:55733568331` | PASS | FAIL |
| 2026-05-23 | McDonald's Corporation (`6064059205`) | `57397025855` / `52603258999` | M&A - Integral → M&A | CLF 10 / 0 | `ANAM-SVC:HS-DEAL:57397025855:LINE:52603258999` | PASS | FAIL |

The zero ARR values are native source evidence, not a conclusion that the Services are one-time. All five have blank billing frequency, billing period and billing start/end fields.

## Proposed rows if a future award had the same shape

The award gate can deterministically propose:

- native Service name from reviewed Company + line-item display names;
- `anam_service_external_key` from Deal + line-item IDs;
- `anam_source_line_item_id`;
- mapped `anam_service_family`;
- `anam_service_currency`;
- `anam_awarded_contract_value` from TCV;
- `anam_annual_recurring_value` from source ARR without reinterpreting it;
- proposed native owner inherited from Deal, subject to ratification;
- native Service stage `New` only.

It cannot populate as truth:

- `hs_start_date` or `hs_target_end_date` from Deal close date;
- `anam_revenue_model` from blank billing frequency or zero ARR;
- `anam_renewal_eligibility` or `anam_renewal_status`;
- delivery `hs_status`;
- operational activation.

## Expected readiness

If these rows were created exactly from available commercial evidence, `anam_service_field_readiness` would resolve to `incomplete_core` because dates, delivery status and reviewed renewal/model facts are absent. This is the intended behavior: schema readiness makes missing operational evidence visible; it does not manufacture it.

## Verdict

### `GO`

- Use this deterministic award-gate projection for the next real won line item.
- Present missing activation facts to ANAM's named reviewer.
- Keep the proposed Service in `New` until activation is confirmed.

### `NO-GO`

- Creating these five historical simulation Services.
- Treating zero ARR or blank frequency as proof of one-time revenue.
- Inferring dates from close date.
- Publishing Portfolio, Expiry, Retention or Loyalty panels from these rows.

## Remaining approval before first Service record

1. Confirm whether the Deal owner is copied as the proposed Service owner or whether another owner rule applies.
2. Name the ANAM operator who reviews dates, revenue model, renewal eligibility/status and activation.
3. Approve the first actual forward Service record after seeing its dry-run payload.

No Company, Deal, line item, Service or other CRM record was created or updated by this dry-run operation. The later controlled execution was a separate authorized change.
