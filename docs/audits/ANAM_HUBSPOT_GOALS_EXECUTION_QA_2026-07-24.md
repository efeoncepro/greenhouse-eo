# ANAM — HubSpot Goals execution QA — 2026-07-24

## Verdict

`PARTIAL PASS — faithful native goals created; unsupported contracts documented`

Three goals that map exactly to available HubSpot templates are live in portal `19893546`. Contracts that cannot
be represented without changing their meaning were not approximated.

## Source contract

| Source | Approved target |
|---|---|
| Notion revenue task `32739c2fefe781b483b5fed42f2bb283` | 400 UF/month per sales engineer; 150 UF/month per commercial assistant |
| Notion activity task `32739c2fefe7813294a2e9e78de9437e` | 25 typed calls/week; 50 emails/week; 5 meetings/week; qualified opportunities/quotes by role; won rate >30% |
| Notion fidelity task `38939c2fefe7813c9f41f8124657e2e6` | No numeric target, metric, cadence or population supplied |

## Live goals

| Goal | Native template | Scope | Target | Readback |
|---|---|---|---:|---:|
| `ANAM — Meta mensual de adjudicación (UF)` | `Ingresos` | 7 individual users; `Crecimiento - Nuevos Negocios`; monthly FY 2026 | 24,600 UF/year | 10,586.851 UF / 43% |
| `ANAM — Meta semanal de correos enviados` | `Emails sent` | Same 7 individual users; weekly FY 2026 | 18,200 emails/year | 1,696 / 9% |
| `ANAM — Meta semanal de reuniones programadas` | `Reuniones programadas` | Same 7 individual users; weekly FY 2026 | 1,820 meetings/year | 79 / 4% |

Revenue allocation is 400 UF/month for each of four sales engineers and 150 UF/month for each of three commercial
assistants: 2,050 UF/month in aggregate. Email and meeting totals are the seven-person annual aggregation of
50/week and 5/week respectively.

Runtime evidence: `https://app.hubspot.com/goals/19893546/overview`.

## Dashboard panels

Nine native Goal reports were saved and added to `ANAM — Backlog comercial (PILOTO)`:

| Goal family | Aggregate | Time series | Per user |
|---|---|---|---|
| Adjudication UF | `ANAM — Meta adjudicación UF — Indicador` | `ANAM — Meta adjudicación UF — Evolución` | `ANAM — Meta adjudicación UF — Por responsable` |
| Weekly emails | `ANAM — Meta correos semanales — Indicador` | `ANAM — Meta correos semanales — Evolución` | `ANAM — Meta correos semanales — Por responsable` |
| Weekly meetings | `ANAM — Meta reuniones semanales — Indicador` | `ANAM — Meta reuniones semanales — Evolución` | `ANAM — Meta reuniones semanales — Por responsable` |

Authenticated dashboard readback found all nine report titles. The revenue time series also exposed the expected
2,050 UF monthly target and the monthly actual series. Dashboard evidence:
`https://app.hubspot.com/reports-dashboard/19893546/view/21329151`.

## Deliberately not created

| Requested contract | Platform finding | Decision / next gate |
|---|---|---|
| 25 calls/week limited to five approved call types | `Llamadas hechas` counts all Call records by record ID and exposes no Call Type filter | Do not create an inflated all-calls proxy. Requires custom Goal/report support or a subscription capability change. |
| Qualified opportunities/quotes by role | No equivalent native Goal template | Model with a governed report/dashboard or unlock custom Goals after the business event is defined precisely. |
| Won rate >30% | No native percentage/win-rate Goal template | Calculate in a governed report with explicit numerator, denominator, close-date period and exclusions. |
| Fidelity goal | Source task has no usable target contract | ANAM must supply metric, value, cadence and population before implementation. |

`Crear desde cero` is locked in the current subscription. Therefore none of the unsupported items can be made
faithful merely by configuring another available template.

## Dashboard implications

The revenue Goal and its three panels are Growth-only. The commercial backlog dashboard combines Growth and
Renewal, so comparing its full cohort directly against the new Goal would mix scopes. Keep the dashboard labeled
`(PILOTO)` until ANAM either supplies the Renewal target or approves a Growth-only `budget vs real` view.

Email and meeting Goals depend on activities being logged in HubSpot. They are operational activity targets, not
independent evidence that every external email or calendar event was captured.

## Work-management evidence

Page-level comments were added to all three source tasks:

- revenue: exact live configuration and HubSpot evidence URL;
- activities: created Goals plus the native-template limitations;
- fidelity: the missing target contract and required inputs.

## Reusable execution lessons

- Verify the Goal template definition before relying on its label. `Llamadas hechas` aggregates Call record IDs
  and therefore counts every call; it does not implement ANAM's five-type subset.
- `Crear desde cero` is subscription-dependent. A locked custom-Goal surface is a real capability boundary, not
  permission to reinterpret the metric through `Negocios creados`, revenue or another nearby template.
- Reconcile at three levels before saving: one period for one user, annual total for that user and aggregate total
  for all assignees. This caught the expected 2,050 UF/month, 24,600 UF/year, 18,200 emails/year and 1,820
  meetings/year totals.
- HubSpot can retain an inherited Goal-name filter after creation. Clear overview filters before concluding that
  previously created Goals disappeared.
- Goal reports require a separate save path from Goals. Choose the source Goal, assignee grain and visual, rename
  the generated report, explicitly select the existing dashboard and reopen the dashboard to confirm the title.
- Aggregate Goal reports and time-series reports can hydrate at different moments. One newly created aggregate
  preview initially showed zero while Goal overview and the monthly series showed progress. Treat the first render
  as provisional until the surfaces reconcile.
- The three useful visual contracts are distinct rather than decorative duplicates: aggregate attainment answers
  current position, the line compares actual versus target over time, and bars expose assignee variance.
- Hidden portal checkboxes were less reliable than their visible option rows during authenticated automation.
  Verify the final checked state and saved artifact instead of assuming a click changed the intended control.
