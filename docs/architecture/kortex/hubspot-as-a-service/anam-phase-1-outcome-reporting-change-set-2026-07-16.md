# ANAM Phase 1 - Outcome Reporting Change Set

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** executed and verified on 2026-07-16
> **Scope:** calculated Deal properties and reports required to close Phase 1
> **Excluded:** pipeline metadata changes, Deal moves, backfill and legacy-report retirement

## Objective

Make won, lost, no-award and open reporting independent from HubSpot's generic probability-based closed flags. The immediate defect is `Radar 0%` (`1034441224`): HubSpot exposes it as closed/lost because its probability is zero even though ANAM uses it as an open commercial stage.

## Runtime evidence

- Calculated-property allowance: 40.
- Custom calculated-property usage before this change: 0.
- Native `hs_is_closed` treats probability `<= 0` or `>= 1` as closed.
- Native `hs_is_closed_lost` treats stage probability `<= 0` as lost.
- Native closed/open amount properties inherit the same probability semantics.
- `Radar 0%` therefore cannot safely use those native properties.

## Approved schema writes

| Surface | Current | Proposed | Impact | Rollback |
|---|---|---|---|---|
| Deal property `resultado_comercial_reportable_anam` | Does not exist | Calculated enumeration with `Abierto`, `Ganado`, `Perdido`, `No adjudicado` or blank, derived only from exact approved stage IDs | Central reporting dimension; Radar resolves to `Abierto` without changing its stage | Remove reports that consume it, then archive the property through the Properties API |
| Deal property `tasa_adjudicacion_base_anam` | Does not exist | Calculated percentage: `1` for exact won stages and `0` otherwise; valid for win-rate aggregation only when the report filters result to Ganado + Perdido | Average over the explicit result filter produces win rate over won + lost only; no-award is visible separately and does not silently change the denominator | Remove reports that consume it, then archive the property through the Properties API |

Both properties live in `dealinformation`. They are API-managed because HubSpot calculation properties created through the API cannot be edited in the portal.

### `resultado_comercial_reportable_anam`

Exact stage mapping:

| Result | Growth stage | Renewal stage |
|---|---:|---:|
| Ganado | `939574324` | `939530924` |
| Perdido | `939574325` | `939530925` |
| No adjudicado | `1002975056` | `1003604761` |
| Abierto | Every other known stage in the two active Deal pipelines, including Radar `1034441224` | Every other known stage |

Deals outside the two active ANAM pipelines remain blank rather than being forced into the commercial denominator.

### `tasa_adjudicacion_base_anam`

- `1` when the stage is one of the two exact won stages.
- `0` for every other stage because the HubSpot 2026 Properties API rejects a string/blank `else` branch in a numeric formula.
- report aggregation: average, displayed as percentage, with the mandatory filter `resultado_comercial_reportable_anam in (ganado, perdido)`.

This defines **adjudicated win rate** as:

```text
won / (won + lost)
```

The base property is not a standalone KPI and must never be averaged without the result filter. `No adjudicado` is reported separately. Including it in the denominator would be a different business metric and requires a named decision.

## Reporting writes

Create governed replacements rather than editing the probability-based legacy reports:

1. one current-quarter count report split by `Ganado`, `Perdido` and `No adjudicado`;
2. one companion current-quarter current-value report with the same mutually exclusive outcomes;
3. one current-quarter adjudicated win-rate summary, averaging `tasa_adjudicacion_base_anam` only after the mandatory `Ganado + Perdido` filter;
4. reuse the existing verified owner-by-business-line pivot for exact count and current Deal amount rather than duplicate it.

Every report must state that Deal amount is current commercial value, not invoiced revenue or historical quote-to-award variance.

## Safety gates

- Do not change `Radar 0%` pipeline metadata.
- Do not move any of the ten Radar Deals.
- Do not write calculated values to Deal records; HubSpot owns recalculation.
- Do not include `No adjudicado` in adjudicated win rate without a later decision.
- Read back both property definitions and representative values before building reports.
- Reconcile every report against the API cohort before accepting it.

## Approval

The operator authorized investigation, creation of useful calculated properties, completion of the remaining Phase 1 work and documentation/skill learning on 2026-07-16. This change set narrows that authorization to two reversible schema writes plus reporting assets; it does not authorize pipeline or record mutation.

## Execution log

### Schema readback

Both Deal properties were created through Kortex portal-scoped OAuth and read back from portal `19893546`:

| Property | Runtime result |
|---|---|
| `resultado_comercial_reportable_anam` | Enumeration calculation created at `2026-07-16T15:45:20.195Z`; exact stages resolve to `abierto`, `ganado`, `perdido` or `no_adjudicado` |
| `tasa_adjudicacion_base_anam` | Percentage calculation created at `2026-07-16T15:45:41.317Z`; exact won stages resolve to `1`, all other stages to `0` |

The first numeric request attempted a blank fallback and failed cleanly with HTTP `400`; no property was created by that request. The accepted 1/0 formula and mandatory eligible-result filter are the governed replacement. Calculated-property usage after execution is `2/40` (`5%`).

Representative all-history readback after propagation:

| Cohort | Records | Calculated distribution |
|---|---:|---|
| Radar `1034441224` | 10 | `abierto | 0` for all 10 |
| Growth won `939574324` | 419 | `ganado | 1` for all 419 |
| Growth lost `939574325` | 69 | `perdido | 0` for all 69 |
| Growth no-award `1002975056` | 84 | `no_adjudicado | 0` for all 84 |
| Retention won `939530924` | 75 | `ganado | 1` for all 75 |
| Retention lost `939530925` | 4 | `perdido | 0` for all 4 |
| Retention no-award `1003604761` | 10 | `no_adjudicado | 0` for all 10 |

### Reports published

The three governed outcome reports were created and added to `Dashboard de Crecimiento` (`19708354`):

| Report | ID | Contract | Authenticated readback at 2026-07-16 12:01 CLT |
|---|---:|---|---|
| `Resultados comerciales - cantidad por desenlace (trimestre actual)` | `340844496` | Close date, current quarter to date; outcome in Ganado, Perdido, No adjudicado; Deal count | Ganado 13; Perdido 0; No adjudicado 1; total 14 |
| `Resultados comerciales - valor actual por desenlace (trimestre actual)` | `340844919` | Same cohort; sum of current company-currency Deal amount | Ganado CLF 5,782.97; Perdido CLF 0; No adjudicado CLF 232,000.00 |
| `Resultados comerciales - tasa de adjudicación (trimestre actual)` | `340845240` | Close date, current quarter to date; mandatory outcome filter Ganado + Perdido; average calculated base | 100%, denominator 13 (13 won, 0 lost) |

The apparent API total of 14 won when using an end-of-day cutoff was not a report defect: one Deal has a close timestamp later on 2026-07-16. Reconciliation with the actual `current quarter to date` cutoff (`2026-07-16T16:01:58Z`) yields 31 Deals: 17 open, 13 won, 0 lost and 1 no-award, exactly matching the rendered reports. Open Deal amount CLF 2,014.10 is excluded from outcome totals.

The existing verified custom pivot `Growth creado - responsable por línea (Q3 2026)` (`340830124`) remains the owner-by-business-line diagnostic for count and current value; it is not duplicated. No legacy report was retired.

### Safety and evidence

- `Radar 0%` metadata remains unchanged and its 10 Deals were not moved.
- No Deal, Company or Contact record was written or backfilled.
- No workflow, form, rule, pipeline or duplicate ANAM Company was changed.
- No-award remains separate from lost and outside adjudicated win rate.
- Current Deal amount remains labelled as commercial value, not invoiced revenue or historical quoted value.
- Authenticated screenshots: [outcome count](evidence/anam-phase-1-outcome-count-2026-07-16.jpg), [outcome amount](evidence/anam-phase-1-outcome-amount-2026-07-16.jpg), [win-rate denominator/filter](evidence/anam-phase-1-outcome-dashboard-2026-07-16.jpg).

Rollback remains report removal followed by API archival of the two calculated properties. No rollback is required: runtime readback and dashboard reconciliation passed.
