# ANAM — Commercial backlog dashboard QA — 2026-07-24

## Verdict

`CONDITIONAL PASS`

The commercial backlog cohort, operational report and pilot dashboard are live and reproducible. A 2026 native
revenue Goal now exists for `Crecimiento - Nuevos Negocios`; the requested `budget vs real` KPI remains
conditional because the dashboard cohort also includes `Fidelización - Renovaciones`, which has no approved
target.

## Runtime under test

| Item | Runtime value |
|---|---|
| HubSpot portal | `19893546` |
| Dashboard | `ANAM — Backlog comercial (PILOTO)` |
| Dashboard ID | `21329151` |
| Dashboard URL | `https://app.hubspot.com/reports-dashboard/19893546/view/21329151` |
| Operational report | `ANAM — Backlog abierto por etapa (UF)` |
| Report ID | `342125020` |
| Report timezone | UTC-04:00 |

## Cohort

Included pipelines:

- `Crecimiento - Nuevos Negocios`;
- `Fidelización - Renovaciones`.

Included open stages:

- Growth: `Potencial 10%`, `Calificado 30%`, `Interesado 50%`, `Hot 85%`;
- Renewal: `Por revisar`, `Elegibilidad confirmada`, `Contacto iniciado`,
  `Propuesta en negociación`.

Excluded:

- `Radar 0%`;
- every won, lost, not-renewed or dismissed stage;
- delivery and billing facts;
- cross-currency additions.

## Readback evidence

| Check | Observed result | Verdict |
|---|---|---|
| Dashboard exists and reopens | ID `21329151`, title and content visible | PASS |
| Native coverage retained | All eight `Analíticas de negocio` reports present | PASS |
| Pipeline filter persisted | Both ANAM Deal pipelines shown in the dashboard filter | PASS |
| Open-stage filter persisted | Eight approved open stages shown in the report | PASS |
| Radar and closed stages excluded | Neither appears in the operational report filter | PASS |
| Currency is explicit | Report uses `CLF`, the portal company currency for UF | PASS |
| Records are actionable | Name links to Deal; owner, close date and `Paso siguiente` are visible | PASS |
| Count reconciles | 23 pages × 25 rows = 575 open Deals | PASS |
| Nominal amount reconciles | 205,005.55 UF across the eight open stages | PASS |
| Weighted amount remains separate | 77,134.72 UF | PASS |
| Interpretation is visible | Dashboard note defines backlog, real and the original Goals blocker | PASS; note must be refreshed |
| Growth budget source exists | Native 2026 Goal totals 24,600 UF/year | PASS |
| Renewal budget source exists | No approved fidelity target in the Notion source task | BLOCKED |
| Goal visualizations are available | Nine native reports: aggregate, time series and per-user views for revenue, emails and meetings | PASS |

## Amount reconciliation

| Slice | Nominal UF | Weighted UF |
|---|---:|---:|
| Growth open stages | 90,398.45 | 37,898.59 |
| Renewal open stages | 114,607.10 | 39,236.14 |
| Total commercial backlog | 205,005.55 | 77,134.72 |

The values are live CRM state, not a financial ledger or invoiced revenue. They must be described as commercial
value or Deal amount.

## Remaining gate

The approved growth targets were loaded as native individual Goals: 400 UF/month for each of four sales
engineers and 150 UF/month for each of three commercial assistants, totaling 2,050 UF/month and 24,600 UF/year.
The Goal is restricted to `Crecimiento - Nuevos Negocios`.

ANAM must still provide a fidelity target or explicitly approve a growth-only strategic comparison. After that
scope decision, the operator must add budget, actual won amount, gap and coverage reports, update the dashboard
interpretation note, and reconcile the first month before removing `(PILOTO)`.

The dashboard now includes three native visualizations for each live Goal: aggregate indicator, time series and
per-user bars. These panels visualize the Goals independently; they do not resolve the remaining Growth versus
Growth-plus-Renewal scope mismatch.

Delivery backlog and billing backlog remain separate workstreams with different facts and source owners. This
dashboard does not imply those backlogs are operational.

## Work-management readback

The Notion task `Dashboard Estratégico: KPIs #5, #6, #10` was updated to `En curso`, its deliverable field now
links to the HubSpot dashboard, and `Pendiente insumo cliente` is enabled. A page-level comment records the live
baseline and the original missing-Goals input. The task remains non-terminal because the renewal target and the
aligned `budget vs real` view are not yet complete.
