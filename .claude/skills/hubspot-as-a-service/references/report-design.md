# HubSpot Report and Dashboard Design

## Operating sequence

1. Inventory existing reports, dashboards, filters, data sources and consumers.
2. Identify the active builder and the visualizations it actually exposes. Single-object and custom builders differ; do not promise parity.
3. Define the business question, period, eligible denominator, measure, dimensions, comparison and action owner.
4. Classify the asset `KEEP`, `RESTYLE`, `REBUILD` or `RETIRE`. Preserve continuity unless a different denominator or data source requires a new report.
5. Choose the visualization from the decision matrix below.
6. Save draft/new first when legacy-editor persistence is uncertain; read back the dashboard result.
7. Record report ID, dashboard ID, filters, date property, denominator, result and residual caveats.

## Visualization decision matrix

| Visual | Use when the decision is | Avoid when |
|---|---|---|
| Summary / KPI | Current value and comparable-period change | Period, denominator or comparison is absent |
| Gauge | Attainment against an approved target/range | No target or owner exists |
| Horizontal bar | Ranking owners or long-labelled categories | One aggregate or a time series |
| Vertical column | Comparing a small set of categories or periods | Labels are numerous/long |
| Line | Trend of one metric over time | Static composition |
| Stacked area | Additive components contributing to a total over time | Only one period or non-additive measures |
| Donut | Low-cardinality composition of one mutually exclusive total | Overlapping categories or many slices |
| Pie | Same composition question when labels remain legible | A donut already answers it; prefer donut with visible total |
| Table | Exact multi-metric values and operational detail | Unprioritized record dump |
| Combination | Two related, differently scaled metrics over time | Axes or semantics would be ambiguous |
| Pivot | Intersection of two dimensions with subtotals | Executive first-glance summary |
| Scatter | Relationship/outliers between two reliable numeric measures | Either numeric contract is incomplete or mutable |
| Funnel | Explicit stage conversion/leakage | Stage metadata or entry/exit semantics are unreliable |

Builder availability is a runtime fact. Standard report editors commonly expose horizontal/vertical bar, line, area, donut/pie, summary, gauge and table. The custom report builder may add KPI comparison, combination, pivot and scatter depending on subscription and data sources.

## Dashboard composition

Use three reading layers:

1. **Executive pulse:** four to six KPI/summary assets with period and comparison.
2. **Drivers and trends:** line, stacked area, donut and comparative columns selected by the analytical question.
3. **Action and diagnosis:** owner rankings, exception queues, tables and pivots.

Do not repeat one metric in bar, pie and donut to create visual variety. Each asset must add a distinct decision, denominator, comparison or drill-down.

## Metric safeguards

- Counts that overlap are not parts of a donut/pie total.
- Current Deal amount is not automatically quoted, awarded, invoiced or collected revenue.
- Pipeline membership does not prove income type.
- A population rate is not a human-validation rate.
- A gauge requires a named target and accountable process.
- Combination charts need explicit dual-axis labels and related measures; split them when scale could mislead.
- Scatter plots require two trustworthy numeric contracts and enough observations.
- Funnel reports require explicit eligible stages; never trust generic closed/open flags after a known stage anomaly.

## Dashboard QA

Verify:

- report title states business meaning and period;
- selected date property matches the question;
- categories are mutually exclusive where composition is shown;
- totals reconcile with source/API readback;
- percentages expose their denominator;
- exact values remain available through table or drill-down;
- visualization remains legible at dashboard tile size;
- owner queues lead to an operational action;
- no report claims revenue, Retention, validation or variance beyond the source contract.

## Live builder lessons

- Do not assume edits to a legacy report persist. When builder behavior is uncertain, preserve the legacy asset, create a governed replacement, add it to the intended dashboard and verify the saved report ID.
- HubSpot's single-object summarized table may expose only one measure. Use a custom pivot for count plus amount across two dimensions instead of fabricating duplicate charts.
- Multi-select filters can remain visually selected but unapplied. Verify the active filter count and wait for the recalculated total before saving.
- Prefer explicit calendar boundaries in diagnostic reports that must remain auditable. Relative labels such as `current quarter` are suitable for pulse reports but can change their cohort after rollover.
- A dashboard save confirmation is insufficient. Reopen the dashboard, confirm the report title is present and reconcile the displayed total with the source cohort.
- Defer a sophisticated visual when the data cannot support its question: one month is not a useful trend, a closed-state anomaly invalidates a funnel, and a static population maximum invalidates a completeness gauge.
