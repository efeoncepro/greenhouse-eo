# ANAM Phase 3 — Controlled Forward Pilot Execution

> **Date:** 2026-07-16
> **Client:** ANAM, client of Efeonce
> **Portal:** HubSpot `19893546`
> **Status:** five controlled pilot Services created and read back; operational activation pending
> **Boundary:** this is client-portal data, not Greenhouse CRM, Finance or Account 360 data

## Authorized scope

The operator approved creating the five rows from the documented dry run so the Service model can be exercised before building Portfolio and Expiry panels. This approval covered:

- three paired association-label definitions;
- five native Service records in stage `New`;
- Deal-owner inheritance;
- Company and originating-Deal associations;
- deterministic commercial projections already present on the source line item.

It did not approve bulk historical backfill, workflows, renewal automation, panel publication, invented dates/statuses or inclusion in official KPIs.

## Association-label readback

| Direction | Label | Type ID |
|---|---|---:|
| Service → Deal | Negocio de origen | `1` |
| Deal → Service | Servicio adjudicado | `2` |
| Service → Deal | Negocio de renovación | `3` |
| Deal → Service | Servicio renovado | `4` |
| prior Service → renewed Service | Renovado por | `5` |
| renewed Service → prior Service | Renovación de | `6` |

The five pilot Services use both the standard unlabeled Service → Deal association (`794`) and `Negocio de origen` (`1`). Their Company association remains the standard unlabeled type `792`. Renewal labels are live for future use but no renewal Deal or Service-to-Service association was created.

## Execution ledger

| Company | Service ID | Deal / source line item | Company ID | Owner | Family | TCV / ARR | Readiness |
|---|---:|---|---:|---:|---|---:|---|
| Gasmar | `571105526327` | `60275616884` / `55275824439` | `54596735849` | `117391937` | M&A | CLF 10 / 0 | `incomplete_core` |
| Hidrogistica | `571100062843` | `61055146300` / `55917369471` | `54446552579` | `166644139` (Maria Paz Haeger) | FIC | CLF 60 / 0 | `incomplete_core` |
| Härting | `571115856266` | `60177850427` / `55191473805` | `54759669515` | `117391937` | M&A | CLF 10 / 0 | `incomplete_core` |
| Golden Omega | `571105038195` | `60781506633` / `55733568331` | `31619387666` | `117391937` | M&A | CLF 10 / 0 | `incomplete_core` |
| McDonald's Corporation | `571114173986` | `57397025855` / `52603258999` | `6064059205` | `117391937` | M&A | CLF 10 / 0 | `incomplete_core` |

Every record has:

- one unique `anam_service_external_key` with the approved Deal + line-item pattern;
- one `anam_source_line_item_id`;
- exactly one distinct Company;
- exactly one distinct originating Deal with both association types `794` and `1`;
- native pipeline `ba9cdbd6-e220-45b2-a5a2-d67ebdcbade6` and stage `New` (`8e2b21d0-7a90-4968-8f8c-a8525cc49c70`);
- owner copied from the source Deal;
- source TCV, ARR and CLF currency preserved;
- `anam_revenue_model=pending_review` and `anam_renewal_eligibility=pending_review`.

`hs_start_date`, `hs_target_end_date`, `hs_status` and `anam_renewal_status` remain blank because the source evidence does not establish them. ARR zero and blank billing cadence were not reinterpreted as one-time revenue.

## Validation and observed platform behavior

- Gasmar was created and fully validated before the remaining four records.
- A second run produced no duplicate because the unique property rejected the same key.
- HubSpot's CRM search index temporarily returned no result immediately after create, while the object write and unique constraint were already active. Idempotent tooling must therefore fall back to a direct/list read or retry before attempting another create; a search miss alone is not proof of absence.
- Paired association labels are directional: Service → Deal readback returns the forward label and Deal → Service returns its inverse. Validation must read both directions.
- All five records resolved to `incomplete_core`, which is correct and keeps them outside official panel cohorts.

## Panel and activation gate

These records enable a draft Service inventory and data-quality review. They do not yet enable official Portfolio totals, Expiry, GRR, NRR or Loyalty metrics.

Maria Paz Haeger (`166644139`, `mhaeger@anam.cl`) is the named activation reviewer. ANAM must confirm, per Service:

1. start and target end dates;
2. delivery status;
3. reviewed revenue model;
4. renewal eligibility and current renewal status;
5. whether lifecycle should remain `New` or move to `In progress`.

Only `fields_ready` records with valid Company and originating-Deal associations can enter panel-specific cohorts.

## Rollback boundary

If the controlled pilot is rejected, archive only the five Service IDs in this ledger. Do not archive the pre-existing sample Service, alter source Deals/line items/Companies, or remove labels while any retained record depends on them.

