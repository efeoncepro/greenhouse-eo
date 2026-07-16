# ANAM Phase 1 - Commercial Reporting Foundation

> **Date:** 2026-07-16
> **Portal:** `19893546`
> **Status:** in progress
> **Scope:** current commercial Deal reporting and data-quality readiness
> **Write state:** no new CRM schema or record writes authorized by this document

## Phase decision

The business definitions are sufficiently closed to begin reporting. Phase 1 is not another discovery cycle and does not wait for Product, Service, Ticket or Billing Event implementation.

Evidence refreshed from Notion:

- [Second ANAM session - 10 Nov 2025](https://app.notion.com/p/2a739c2fefe78083bcc0ea0c9c535872): two reporting domains were agreed, Growth and Loyalty/renewal, with Growth first; requested measures include active clients, new Deals, offers, awards, win rate, owner performance and contract-review/commercial-action programs.
- [KPI implementation meeting - 9 Mar 2026](https://app.notion.com/p/31e39c2fefe78002b056c3c0ccbbbd0f): Growth, cross-sell, upsell, new sales, strategic-sector penetration, commercial activity and contract performance were defined; data discipline and separate Commercial versus Service & Contracts adoption were explicit dependencies.
- [Implementation meeting - 3 Jun 2026](https://app.notion.com/p/37439c2fefe780ae8012ce22b31fd2a0): `tipo_de_ingreso`, Growth/Retention grouping, `Variación vs. cotizado` and Q1-Q2 completion were confirmed as the operating path.
- [Ratification task](https://app.notion.com/p/37439c2fefe7818db9d4c4113c6028a8): status `Listo`, no client input pending.
- [Variation task](https://app.notion.com/p/37439c2fefe78157b828df25fb7b8504): status `Listo`; the property is independent from income type and belongs at adjudication.
- [Q1-Q2 income-type backfill](https://app.notion.com/p/37439c2fefe781f28b3dfc396a5d5d73): status `En curso`; the ANAM team owns human validation of inferred values.
- [CRM progress meeting - 24 Jun 2026](https://app.notion.com/p/38939c2fefe7805294e6c0a48b9ec569): build dashboards from available data, show sales by income type and representative, and review adoption rather than wait for perfect history.

The later explicit operator correction supersedes older notes that included Down-sell in income type. Down-sell remains hidden and is measured later as a Service-to-Service Retention movement.

## Closed business contract

| Concept | Phase 1 treatment |
|---|---|
| Venta nueva | Primary Deal income type; part of Growth. |
| Upsell | Primary Deal income type; part of Growth for current proxy reporting. |
| Cross-sell | Primary Deal income type; part of Growth for current proxy reporting. Compound components remain a later line-item concern. |
| Renovación | Primary Deal income type; reported separately from Growth and used as a Retention proxy until Services exist. |
| Down-sell | Not an income type. Deferred to Service comparison in Phase 5. |
| Churn | Not an income type. Deferred to the full renewable Service cohort. |
| Variación vs. cotizado | Separate axis: Igual / Mayor / Menor at adjudication. It cannot yet produce a monetary variance report because historical quoted value is not reliable. |
| Growth | Venta nueva + Upsell + Cross-sell, reported by count and current Deal amount. |
| Retention | Renewal outcome on comparable Services. In Phase 1 only Renewal Deal counts/amounts are labelled as a proxy. |
| Loyalty | Preventive activity, relationship and risk before renewal. Not calculated in Phase 1. |

## Runtime baseline

| Fact | Current readback | Phase 1 implication |
|---|---:|---|
| Deals | 1,240 | Reporting denominator. |
| Deal `amount` | 1,239/1,240 | Can support a current amount view, but the exact quoted-versus-awarded mutation point remains a caveat. |
| `tipo_de_ingreso` | 908/1,240 (73.23%) | 332 Deals are outside classified Growth/renewal reporting until validated. |
| Venta nueva | 446 | Growth proxy. |
| Upsell | 141 | Growth proxy. |
| Cross-sell | 87 | Growth proxy. |
| Renovación | 234 | Retention proxy, not GRR/NRR. |
| Down-sell | 0 and hidden | Correct current state. |
| `linea_de_negocio_anam` | 1,239/1,240 | Strongest current service-line classifier. |
| `tipo_proceso_comercial_anam` | 1,229/1,240 | Suitable for Licitación versus Venta Directa reporting. |
| `variacion_contrato` | 0/1,240 | Capture/process adoption gap; no historical result yet. |
| Deal `zona` | 399/1,240 | Execution-geography view is incomplete and non-additive when multiple values exist. |
| Growth `Radar 0%` | `isClosed=true`; 10 active records | Stage metadata can corrupt open/closed denominators; isolate before correction. |

## Work packages

### P1.1 - Existing report and automation inventory

Read before building:

- four reports consuming `tipo_de_ingreso`;
- two workflows consuming it;
- its create-record form, conditional rule and property card;
- three views and one form consuming `linea_de_negocio_anam`;
- the dependent rules on `resultado_de_retencion` and `zona`.

Output: `REUSE / ADJUST / RETIRE / CREATE` inventory with report owner, filters, date property, denominator, amount property and dashboard placement. No duplicate report is created until this inventory is complete.

#### Live automation, form and rule inventory - 2026-07-16

The remaining P1.1 consumers were inspected read-only in the authenticated portal. P1.1 is now complete; no workflow, form, rule, card, view or pipeline was changed during the inventory.

| Consumer | ID / route | Runtime contract | Classification | Phase 1 treatment |
|---|---|---|---|---|
| Workflow `Fidelización - Nuevos Negocios` | `1805870398` | Disabled. Enrols Deals whose pipeline is `Fidelización - Renovaciones`, with re-enrolment enabled, then sets `tipo_de_ingreso=Venta nueva`. | `RETIRE / DO NOT ACTIVATE` | Its action contradicts the pipeline and would corrupt Growth/renewal classification. Keep disabled; replace only in the later governed renewal automation phase. |
| Workflow `Crecimiento - Nuevos Negocios` | `1805693705` | Disabled. Enrols Deals whose pipeline is `Crecimiento - Nuevos Negocios`, with re-enrolment enabled, then sets `tipo_de_ingreso=Venta nueva`. | `RETIRE / DO NOT ACTIVATE` | Pipeline membership does not prove Venta nueva; activation would overwrite Upsell/Cross-sell/Renovación semantics. Keep disabled. |
| `Create Deal form` | `/object-manager-settings/19893546/creator-editor/0-3` | Globally requires amount, currency, close date, owner, offer description, branch, Deal type, `linea_de_negocio_anam`, commercial-process type and `tipo_de_ingreso`; conditional logic exposes stage-specific fields. | `REUSE / ADJUST LATER` | Preserve as the operator capture surface. Do not remove current requiredness during reporting work; changes require adoption QA because the form is already live. |
| Conditional capture: income type | Deal stage `Interesado 50%` (`939574321`) | Shows required `tipo_de_ingreso`. Last updated 2026-06-24. | `REUSE` | This is the current approved capture point for new operator-created Deals. Data Quality reporting must still expose older/migrated Deals that bypassed it. |
| Conditional capture: execution region | Deal stage `Calificado 30%` (`939574320`) | Shows Deal `zona` (visible label `Región`) and `monto_original`. Last updated 2026-06-24. | `REUSE WITH CAVEAT` | Keep for execution geography. Do not interpret its multi-select values as Company legal region or additive revenue allocation. |
| Conditional capture: Retention result | Deal stage `Cierre ganado 100%` (`939574324`) | Shows `resultado_de_retencion`. Last updated 2026-06-24. | `ADJUST LATER` | Preserve while its 12 populated records are analysed. It is not a Phase 1 Growth dimension and must not be used as final Service-level Retention. |
| Default Deal property card | `Acerca de este objeto` | Includes `tipo_de_ingreso`; last updated 2026-04-14. | `REUSE` | Maintains record-level visibility for operator correction. |
| Historical Deal views | `Revisión 2024 FIC y DYCO` (`35304694`), `DYCO y FIC (2023)` (`17165376`), `PRUEBA_1` (`16110000`) | Consume `linea_de_negocio_anam`. | `REUSE / REVIEW PRUEBA LATER` | Preserve the two named historical views. The test-labelled view is not a dashboard dependency and can be reviewed under a separate hygiene decision. |

#### Pipeline denominator contract

The legacy pipeline endpoint and portal settings agree on the current stage IDs. Reports must use explicit eligible stages rather than generic `isClosed` while the Radar anomaly remains unresolved.

| Stage | ID | Runtime closed state | Phase 1 denominator treatment |
|---|---:|---:|---|
| Radar 0% | `1034441224` | `true` (invalid) | Open pipeline by explicit inclusion; exclude from closed outcome. |
| Potencial 10% | `939574319` | `false` | Open pipeline. |
| Calificado 30% | `939574320` | `false` | Open pipeline. |
| Interesado 50% | `939574321` | `false` | Open pipeline. |
| Hot 85% | `939574322` | `false` | Open pipeline. |
| Cierre ganado 100% | `939574324` | `true` | Won outcome. |
| Cierre perdido 0% | `939574325` | `true` | Lost outcome. |
| Desestimado o Desierto | `1002975056` | `true` | Lost/no-award outcome; report separately or include only under an explicit no-award definition. |

The Growth pipeline itself is `636797559`. `Radar 0%` currently contains 10 Deals and is reported by HubSpot as `Perdidos (0%)`; changing its metadata remains a separate rollback-ready pipeline operation. The reporting-safe first action is explicit stage filtering, not silently trusting the closed-state flag.

#### Live report inventory - 2026-07-16

Dashboard inspected in the authenticated ANAM portal: `Dashboard de Crecimiento`, view `19708354`. It already contains the four known consumers of `tipo_de_ingreso`; none should be recreated as a duplicate.

| Report | ID | Current contract | Classification | Required treatment |
|---|---:|---|---|---|
| Negocios por tipo de ingreso | `165952568` | Count of Deals by `tipo_de_ingreso`; `Fecha de creación`; current quarter to date; one filter; 32 records in the live view. | `ADJUST / REUSE` | Preserve as a created-pipeline report, make the date basis explicit in the title, and limit the Growth version to Venta nueva + Upsell + Cross-sell. Show Renovación in a separate Retention-proxy report. This is not won sales. |
| Comparativa de tipos de ingreso por Q' | `165953398` | Unique Deal count by income type, broken down by `Fecha de creación`; current quarter versus previous quarter; one filter. Its summary denominator displays all 908 classified Deals while the chart displays Q2/Q3. | `ADJUST / REUSE` | Relabel as created Deals by quarter, separate Growth from Renewal, and prevent the all-history summary metric from being read as the chart denominator. Add a separate closed-won comparison using close date if the existing report builder cannot represent both contracts clearly. |
| Comparativa de tipos de ingreso - Valor de Negocio por Q' | `165953474` | Sum of `Valor en la divisa de la empresa` in CLF by income type, broken down by `Fecha de creación`; current quarter versus previous quarter; one filter. | `ADJUST / REUSE` | Keep only as current pipeline value grouped by creation quarter and label it accordingly. It must not be called sales or awarded revenue. A won-sales report requires Closed Won eligibility and close date; quote-to-award variance remains out of scope until value history is reliable. Separate Renewal from Growth. |
| Tipos de ingreso x rep por Q' | `165955106` | Unique Deal count by owner, broken down by income type; one filter; no visible date dimension or period; all 908 classified Deals and 11 owners are displayed. | `ADJUST` | The title is currently false: the report is historical, not quarterly. Add an explicit date contract and active reporting period, or rename it as historical. For the Phase 1 dashboard use current-period Growth only; create the distinct Closed Won/close-date owner outcome only if this report cannot be safely adapted. Move Renewal to its proxy section. |

Live values observed are evidence of report behavior, not final KPI outputs:

- current-quarter created Deals: Venta nueva 15, Cross-sell 7, Upsell 7 and Renovación 3;
- Q2 versus Q3 created-Deal counts: 67/15 Venta nueva, 33/7 Upsell, 10/7 Cross-sell and 18/3 Renovación;
- current report-value comparison uses CLF and the current Deal value, not a preserved award transaction;
- the owner report spans Belén Robles, Carlos Venegas, Dulia Sandoval, Isabel Aguilera, José Pedro De Oliveira, Julio Reyes, María Cecilia Pinto, María Paz Arellano, Maria Paz Haeger, Pablo Puga and Ricardo Miralles.

#### Approved reporting split for implementation

The existing dashboard conflates three different questions. Phase 1 separates them without changing the underlying business definitions:

1. **Pipeline created:** creation date; eligible created Deals; count and current value; Growth types only.
2. **Commercial outcome:** close date; Closed Won/Closed Lost eligibility; count, current value and win rate only after isolating the invalid `Radar 0%` closed metadata.
3. **Renewal proxy:** Renewal Deals reported separately and explicitly labelled as a Deal proxy, never included in Growth or presented as GRR/NRR.

No existing report is retired yet. The first implementation action is to correct titles, filters and dashboard placement where the report builder supports the required contract; a new report is justified only for a genuinely different denominator/date contract, especially Closed Won outcomes.

#### Controlled reporting execution - 2026-07-16

Authenticated dashboard readback exposed a legacy-editor inconsistency: edits submitted against the four existing reports appeared in the report builder but did not replace the titles or category sets rendered by `Dashboard de Crecimiento`. They therefore remain legacy consumers and are not counted as corrected Phase 1 evidence.

Two reports with distinct, explicit contracts were created and added to dashboard `19708354` instead:

| Report | ID | Date contract | Eligible income types | Live readback | Status |
|---|---:|---|---|---|---|
| `Pipeline creado - Growth por tipo de ingreso (trimestre actual)` | `340814384` | Deal creation date; current quarter to date | Venta nueva, Upsell, Cross-sell | 15 Venta nueva, 7 Upsell, 7 Cross-sell; Renovación absent | `CREATE / VERIFIED` |
| `Renovaciones creadas - proxy Deal (trimestre actual)` | `340814269` | Deal creation date; current quarter to date | Renovación only | 3 Renewal Deals | `CREATE / VERIFIED PROXY` |

The new reports are not won-sales or Retention metrics. The first measures Growth-classified Deals created in the period; the second is explicitly a Deal-level renewal proxy. The original reports remain visible for continuity while the new Growth dashboard set is completed, after which retirement requires a separate approval and consumer readback.

### P1.2 - Data Quality control tower

First report set:

1. Deals missing `tipo_de_ingreso`: denominator all eligible Deals; current count 332.
2. Deals missing amount: denominator all Deals; current count 1.
3. Deals missing `linea_de_negocio_anam`: denominator all Deals; current count 1.
4. Deals missing `tipo_proceso_comercial_anam`: denominator all Deals; current count 11.
5. Deals in `Radar 0%` affected by invalid closed metadata: current count 10.
6. Deals at adjudication/closed-won stages missing `variacion_contrato`: explicit denominator Growth `939574324` plus Retention `939530924`; current count 494.
7. Q1-Q2 2026 Deals created in the period and missing `tipo_de_ingreso`, pending human validation; current count 82.

Every report must expose period, eligible denominator, missing count, completion rate and owner queue. A quality report is not a silent bulk-edit instruction.

#### Controlled Data Quality execution - 2026-07-16

A separate dashboard was created so data-remediation queues do not contaminate the commercial performance narrative:

| Asset | ID | Contract | Live readback | Status |
|---|---:|---|---|---|
| `Calidad de Datos Comercial` | `21144697` | Shared dashboard for commercial completeness controls and owner queues | Dashboard created with access for all users to view and edit | `CREATE / VERIFIED` |
| `DQ - Negocios sin tipo de ingreso por responsable` | `340815405` | Horizontal bar; all Deal creation dates; filter `tipo_de_ingreso` unassigned; dimension Deal owner; metric Deal count | 332 Deals across ten owner buckets | `CREATE / VERIFIED` |
| `DQ - Negocios sin proceso comercial por responsable` | `340816805` | Horizontal bar; all Deal creation dates; filter `tipo_proceso_comercial_anam` unassigned; dimension Deal owner; metric Deal count | 11 Deals: Maria Paz Haeger 7, Isabel Aguilera Bruna 3, unassigned owner 1 | `CREATE / VERIFIED` |
| `DQ - Negocios sin monto` | `340817239` | KPI/scorecard; all Deal creation dates; advanced filter Deal `amount` unknown; metric Deal count | 1 Deal, with no Deal owner | `CREATE / VERIFIED` |
| `DQ - Negocios sin línea de negocio` | `340817563` | KPI/scorecard; all Deal creation dates; advanced filter `linea_de_negocio_anam` unknown; metric Deal count | 1 Deal, with no Deal owner | `CREATE / VERIFIED` |
| `DQ - Negocios en Radar 0% por responsable` | `340818897` | Horizontal bar; all Deal creation dates; exact stage `Radar 0% (Crecimiento - Nuevos Negocios)`; dimension Deal owner; metric Deal count | 10 Deals: Ricardo Miralles 5, José Pedro De Oliveira Barrios 2, Julio Reyes Rangel 1, María Cecilia Pinto Figueroa 1, unassigned owner 1 | `CREATE / VERIFIED` |
| `DQ - Ganados sin variación vs cotizado` | `340822900` | KPI/scorecard; exact stages Growth `Cierre ganado 100%` (`939574324`) and Retention `Cierre ganado` (`939530924`); filter `variacion_contrato` unknown; metric Deal count | 494 Closed Won Deals, all missing the classifier | `CREATE / VERIFIED` |
| `DQ - Q1-Q2 2026 sin tipo de ingreso por responsable` | `340823200` | Horizontal bar; Deal creation date from 2026-01-01 through 2026-06-30 inclusive; filter `tipo_de_ingreso` unassigned; dimension Deal owner; metric Deal count | 82 Deals: Ricardo Miralles 49, Isabel Aguilera Bruna 13, Belén Robles Escalona 12, Carlos Venegas 3, Pablo Puga 2, María Cecilia Pinto Figueroa 2, unassigned owner 1 | `CREATE / VERIFIED` |

##### Operating definitions

| Control | What it measures | What it does not measure | Operational action |
|---|---|---|---|
| Missing income type | Deals where `tipo_de_ingreso` has no value, across all Deal creation dates, grouped by Deal owner. The field classifies Venta nueva, Upsell, Cross-sell or Renovación. | Revenue, win rate, seller performance or the correct inferred income type. | The Deal owner reviews source evidence and assigns the approved classification; no automatic inference or bulk write is authorized. |
| Missing commercial process | Deals where `tipo_proceso_comercial_anam` has no value, across all Deal creation dates, grouped by Deal owner. The field distinguishes Licitación from Venta Directa. | Commercial success, bid outcome, seller productivity or whether a Licitación was won. | The Deal owner identifies the actual selling mechanism and completes the field so pipeline and amount can be compared by commercial process. |
| Missing amount | Count of Deals whose native Deal `amount`/visible `Valor` is unknown. | Quoted value, awarded value, invoiced value, billing actuals or quote-to-award variance. | Recover the current Deal value from the governing commercial record and confirm its stage convention before completing it. |
| Missing business line | Count of Deals where `linea_de_negocio_anam` is unknown. | Product-level composition, Service contract scope or Company sector. | Validate the primary ANAM business line against the opportunity/service evidence and complete the Deal classifier. |
| Radar anomaly queue | Deals currently in exact stage `Radar 0%` of the Growth pipeline, grouped by owner. It exposes the records affected by that stage being incorrectly marked closed. | Lost Deals, won Deals, a legitimate closed outcome or permission to move records. | Review dependencies and correct stage metadata through the approved pipeline change; only move an individual Deal if its real lifecycle state is separately validated. |
| Won Deals missing quote variation | Closed Won Deals in the exact Growth and Retention won stages whose `variacion_contrato` is unknown. It measures adoption of the Igual/Mayor/Menor classifier at award. | A calculated monetary variance, income type, Down-sell, Retention, or proof that quoted and awarded amounts are available. Lost and no-award stages are excluded. | Recover both quoted and awarded evidence, then classify. Do not infer from the current Deal amount or fill the historical backlog automatically. |
| Q1-Q2 income-type validation queue | Deals created from 2026-01-01 through 2026-06-30 whose `tipo_de_ingreso` is unknown, grouped by owner. It is the first bounded human-review cohort. | Deals closed in the period but created earlier, the validity of already-populated historical values, or permission to infer from pipeline, stage or owner. | Review evidence and approve Venta nueva, Upsell, Cross-sell or Renovación through a traceable change set. `Down-sell` is not valid here. |

Every control uses the full available history unless its title and contract state a bounded period. Counts are current-state operational queues, not historical snapshots; the dashboard refresh date must be considered when comparing runs.

The live owner queue for the 332 Deals is: Ricardo Miralles 107; Isabel Aguilera Bruna 50; Belén Robles Escalona 45; Carlos Venegas 32; Pablo Puga 31; María Cecilia Pinto Figueroa 29; Maria Paz Haeger 26; María Paz Arellano Rojas 6; José Pedro De Oliveira Barrios 5; unassigned owner 1. These counts sum to the portal-wide missing-value denominator of 332.

Presentation follows the operational question: scorecards are used for single-value completeness gaps, while horizontal bars are reserved for multi-owner remediation queues. A one-record gap is not rendered as a comparative chart.

This is a minimum rule, not the complete dashboard grammar. HubSpot's report builders also support vertical columns, lines, areas, donut/pie, summary/KPI, gauge and table; the custom report builder adds combination, pivot and scatter views where the portal subscription and selected data sources permit them. The visualization selection contract is defined under P1.3 and applies to all subsequent dashboards.

These reports are remediation controls, not permission to infer or bulk-write values. Assigned owners must validate commercial meaning against source evidence before backfill. The Radar report detects the ten affected Deals but does not change the invalid closed-stage metadata; that correction still requires a dependency readback and explicit approval.

`Adjudicación` is a business event, not a literal current pipeline stage. The variation scorecard therefore uses the two exact positive-award outcomes: Growth `Cierre ganado 100%` (`939574324`) and Retention `Cierre ganado` (`939530924`). It excludes lost and no-award stages because they have no amount awarded to ANAM. All 494 eligible won Deals currently lack `variacion_contrato`. This is an adoption backlog, not a trustworthy historical monetary-variance result: `monto_original` and native Quotes do not provide sufficient quoted-value coverage for automatic reconstruction.

The Q1-Q2 queue uses Deal creation date, matching the ratified created-pipeline reporting contract: start 2026-01-01 inclusive and end 2026-07-01 exclusive in the portal timezone. A separate close-date cohort would answer a different outcome question. The current report deliberately starts with the 82 missing values; already-populated but unverified historical values require a second review cohort rather than being silently accepted or overwritten.

##### Human validation and evidence contract

Evidence is evaluated in this order:

1. Accepted quote, contract, purchase order, award record or documented Deal-owner confirmation.
2. Deterministically associated prior Deal or Service proving account/unit continuity and comparable scope.
3. Current and prior line items, Products, SKUs, quantities, frequency and associated Quote as corroborating evidence.
4. Confirmed Company, branch/unit and parent-child identity; deterministic billing references may corroborate prior service.
5. Deal name, description, business line, commercial process, legacy renewal flags and AI suggestions only as review signals, never as conclusive evidence.

The classification contract is: first sale to an unserved account/unit = Venta nueva; greater scope/value of the same service = Upsell; a different service = Cross-sell; materially comparable continuation = Renovación. Pipeline membership, stage, owner, Company age, an amount increase, a business-line change or name similarity cannot determine the answer alone. Conflicting primary evidence sets the case to `conflict`; insufficient evidence sets it to `pending_evidence` or `unclassifiable`. Every approved correction must preserve before/after, reviewer, timestamp, reason and evidence references.

##### Data Quality visual enhancement

The existing scorecards and owner bars remain valid but are not the final panel composition. Add these decision layers without changing their denominators:

| Metric | Current baseline | Target / visual | Caveat |
|---|---:|---|---|
| Income-type population | 908/1,240 = 73.23% | Gauge to 100%, plus missing-by-owner bar | Population is not proof of human validation. |
| Commercial-process population | 1,229/1,240 = 99.11% | Gauge to 100%, plus missing-by-owner bar | Licitación/Venta Directa semantics still require source evidence. |
| Amount population | 1,239/1,240 = 99.92% | KPI with target/comparison; table for the one exception | Does not establish quoted versus awarded meaning. |
| Business-line population | 1,239/1,240 = 99.92% | KPI with target/comparison; table for the one exception | Primary line is not line-item composition. |
| Won quote-variation population | 0/494 = 0% | Gauge to 100%, plus backlog KPI | Historical recovery remains evidence-bound. |
| Q1-Q2 income-type population | 337/419 = 80.43% | Gauge labelled `population`, plus the 82-record owner queue | Must not be labelled validation progress until populated values have review state. |

The dashboard should not use a donut for “share of missing fields”: the same Deal may be missing more than one property, so those counts are not mutually exclusive parts of a total. A table with field, eligible denominator, populated, missing, completion rate and owner is the correct cross-control summary.

### P1.3 - Commercial Growth dashboard

Build or adjust the existing reports to answer:

- Growth Deal count and amount by month;
- Venta nueva / Upsell / Cross-sell split;
- Growth count and amount by Deal owner;
- Growth count and amount by `linea_de_negocio_anam`;
- Growth count and amount by Licitación versus Venta Directa;
- pipeline and won/lost count by owner and service line;
- win rate only after excluding or correcting the invalid `Radar 0%` closed-state behavior.

Required visible caveat: Deal `amount` is nearly complete, but its exact change from expected/quoted to awarded value is not yet a reliable historical quotation contract. Phase 1 reports current Deal value, not quote-to-award variance.

#### HubSpot visualization inventory and selection contract

Portal inspection and the current [HubSpot chart-type reference](https://knowledge.hubspot.com/reports/understand-different-chart-styles-in-your-hubspot-reports) establish the following visual grammar. Richness means matching the visual to the decision, not using every chart type indiscriminately.

| Visualization | Decision it should answer in ANAM | Appropriate Phase 1 use | Misuse to avoid |
|---|---|---|---|
| Summary / KPI | What is the current value, and how did it change against a comparable period? | Growth Deals created, current pipeline amount, Closed Won count/value, completeness rate with prior-period comparison. | A naked count without period, denominator or comparison. |
| Gauge | Are we above or below an approved target or threshold? | Data completeness or adoption against an explicit target such as 95%/100%; later SLA or commercial target attainment. | Using a gauge when no target, range or ownership exists. |
| Horizontal bar | Who or which long-labelled category ranks highest/lowest? | Owner queues, owner performance, service-line rankings with long labels. | A single aggregate or a time series. |
| Vertical column | How do a small number of categories or periods compare? | Amount/count by business line; monthly won/lost comparisons; Licitación versus Venta Directa by period. | Many long category labels or unrelated measures on one axis. |
| Line | How is one metric changing over time? | Monthly Growth creation, Closed Won amount, win rate trend after the Radar denominator is safe. | Static category composition. |
| Stacked area | How do components contribute to a changing total over time? | Venta nueva/Upsell/Cross-sell contribution by month or quarter. | A short snapshot with only one period or non-additive metrics. |
| Donut | What is the current low-cardinality composition of one total? | Current-quarter Growth mix by income type or commercial process, with total and percentages visible. | Owner rankings, more than a few slices, or exact multi-metric comparison. |
| Pie | Same composition question as donut when labels remain legible. | No default use; donut is preferred because it preserves the total in the centre. | Duplicating an existing donut or showing many slices. |
| Table | What are the exact values behind the executive visual? | Owner/business-line count and amount, DQ queue detail, period/denominator/completion rate. | Treating a large unprioritized record dump as a dashboard. |
| Combination | How do two differently scaled metrics move together? | Monthly Deal count as columns plus current/Closed Won amount as a line, with both axes explicitly labelled. | Combining metrics with no causal or operational relationship, or hiding scale effects. |
| Pivot table | Where does the intersection of two dimensions concentrate? | Owner x business line and owner x commercial process, with count and amount subtotals. | Executive first-glance summary; it is a diagnostic/drill-down asset. |
| Scatter | Is there a relationship, cluster or outlier between two numeric measures? | Later: amount versus sales-cycle days or quote-to-award variance, once both measures are reliable. | Current Phase 1 use with weak or semantically mutable monetary baselines. |

Specialized funnel reporting is appropriate for explicit stage conversion and leakage, but only after `Radar 0%` is excluded or corrected and stage-entry/exit semantics are verified. It is not a substitute for a generic closed/open filter.

Dashboard composition follows three reading layers:

1. **Executive pulse:** four to six KPI/summary tiles with period and comparison.
2. **Drivers and trends:** line, stacked area, donut and comparative columns chosen by the questions above.
3. **Action and diagnosis:** horizontal owner rankings plus table/pivot drill-downs.

No panel should repeat the same metric in bar, pie and donut merely to appear richer. Every report must add a distinct decision, denominator or drill-down path.

#### P1.3 current-quarter readback - 2026-07-16

The governed cohort is Deal creation date from 2026-07-01 in the portal timezone and `tipo_de_ingreso` in Venta nueva, Upsell or Cross-sell. The API readback reconciles exactly to report `340814384`: 29 Deals, split into 15 Venta nueva, 7 Upsell and 7 Cross-sell.

| Dimension | Current-quarter count | Current Deal amount (CLF) | Reporting treatment |
|---|---:|---:|---|
| M&A | 23 | 975.09 | Comparative bar/category, not a scorecard. |
| D&CO | 3 | 1,232.00 | Comparative bar/category. |
| FIC | 3 | 236.80 | Comparative bar/category. |
| Venta Directa | 27 | 1,943.89 | Comparative process split. |
| Licitación | 2 | 500.00 | Comparative process split. |
| **Total Growth cohort** | **29** | **2,443.89** | Current pipeline value, not awarded revenue. |

All 29 records have both business line and commercial process populated, so these two current-quarter charts have a complete cohort. Four Growth-classified records are currently in the Retention pipeline and 25 in the Growth pipeline. This is valid evidence that pipeline membership cannot determine `tipo_de_ingreso`; the reports group by the explicit income-type property and expose pipeline mismatch as a separate quality question rather than rewriting the records.

The next dashboard assets are revised accordingly:

1. `Growth creado - pulso trimestre actual`: KPI count and current Deal amount, each compared with the previous equivalent period where HubSpot supports a correct comparison.
2. `Growth creado - composición por tipo de ingreso`: donut for the 15/7/7 current-quarter mix, with the 29-Deal total visible.
3. `Growth creado - valor por línea de negocio`: vertical columns for M&A, D&CO and FIC using current Deal amount; a companion table exposes exact count and amount.
4. `Growth creado - proceso comercial por mes`: 100% stacked columns for Licitación versus Venta Directa when the selected period contains enough months; the current-quarter snapshot can use a donut until a trend exists.
5. `Growth creado - evolución mensual`: combination chart with Deal count as columns and current Deal amount as line, if the custom builder preserves explicit dual-axis labels; otherwise two aligned reports.
6. `Growth creado - responsable x línea`: pivot/table diagnostic with count and amount, not an executive chart.

The 29-Deal current-quarter cohort is too short for a meaningful area trend or scatter plot. Those visuals become eligible only when the period and data contract support the analytical question.

#### P1.3 live report execution - 2026-07-16

The following reports were created, added to `Dashboard de Crecimiento` (`19708354`) and read back in the authenticated portal. Existing legacy reports were preserved; none was silently repurposed because their prior editor persistence and period contracts were not reliable enough for an in-place change.

| Report | ID | Visualization and contract | Verified readback |
|---|---:|---|---|
| `Growth creado - total de negocios (trimestre actual)` | `340827168` | Summary/KPI; Deal creation date in the current quarter; income type Venta nueva, Upsell or Cross-sell | 29 Deals |
| `Growth creado - valor actual total (trimestre actual)` | `340827503` | Summary/KPI; same cohort; sum of current Deal amount in company currency | CLF 2,443.89 |
| `Growth creado - composición por tipo de ingreso (trimestre actual)` | `340826108` | Donut; same cohort; Deal count by income type | 15 Venta nueva, 7 Upsell, 7 Cross-sell |
| `Growth creado - valor por línea de negocio (trimestre actual)` | `340826655` | Vertical columns; same cohort; current Deal amount by business line | M&A CLF 975.09; D&CO CLF 1,232.00; FIC CLF 236.80 |
| `Growth creado - composición por proceso comercial (trimestre actual)` | `340826976` | Donut; same cohort; Deal count by commercial process | 27 Venta Directa, 2 Licitación |
| `Growth creado - detalle de valor por línea (trimestre actual)` | `340828194` | Summarized table; same cohort; exact current Deal amount by business line | Reconciles to the three line values and CLF 2,443.89 total |
| `Growth creado - responsable por línea (Q3 2026)` | `340830124` | Custom-builder pivot; explicit 2026-07-01 through 2026-09-30 creation dates; income type Venta nueva, Upsell or Cross-sell; rows Deal owner, columns business line, values count and current Deal amount | 29 Deals and CLF 2,443.89; owner subtotals and line totals reconcile |

The simple report builder permits only one summarized measure in the companion line table, so count plus amount is provided by the custom pivot rather than by forcing an ambiguous second chart. A monthly combination or stacked-area trend is deferred while the governed Q3 cohort contains only July data. The funnel remains blocked until the `Radar 0%` closed-state anomaly is corrected or safely excluded. Static Data Quality gauges were also rejected: a manually entered maximum based on today's 1,240-Deal population would become stale; a gauge is eligible only after a dynamic completeness denominator and an approved target are available.

### P1.4 - Adoption queue

ANAM operators own classification of current and historical Deals. Efeonce owns schema/report correctness and the exception view. The queue must support:

- Q1-Q2 2026 first, matching the Notion commitment;
- current/new Deals continuously;
- AI-inferred values marked for human validation rather than assumed correct;
- no historical backfill outside the agreed period without a separate decision.

The first visible queue is report `340823200` and contains the 82 missing Q1-Q2 values. A governed review sidecar or equivalent change-set surface must add review state (`pending_evidence`, `ready_for_review`, `conflict`, `validated_keep`, `validated_change`, `unclassifiable`, `suspected_test`) before any record write. Suggested values remain proposals until a named reviewer approves them.

## Phase 1 acceptance

Phase 1 is complete when:

- every existing income-type report is inventoried and classified;
- the Data Quality dashboard is published with denominators and owner queues;
- the Growth dashboard reports count and amount by type, owner, service line and commercial process;
- Q1-Q2 adoption progress is visible without claiming unvalidated inferred values as truth;
- `Radar 0%` no longer corrupts win-rate/open-pipeline reporting, either through an approved metadata correction or an explicit temporary report exclusion;
- Renewal is labelled as a Deal proxy and no GRR, NRR, Down-sell or churn metric is presented as final;
- readback evidence and screenshots are attached to the execution log.

## Started in this session

- Notion meetings and tasks were re-read; no new client-definition blocker was found.
- Closed definitions were reconciled with the later Down-sell correction.
- The runtime completeness baseline above was established from the current portal readback.
- The live `Dashboard de Crecimiento` and all four income-type reports were inventoried read-only in the authenticated ANAM portal.
- The two dependent workflows, Deal creation form, conditional rules, property card and historical views were inspected; the complete P1.1 dependency inventory is recorded above.
- Both pipeline-membership workflows remain disabled and must not be activated because they assign `Venta nueva` indiscriminately.
- Two distinct reports were published and read back: current-quarter Growth created pipeline and a separate Renewal Deal proxy.
- The separate `Calidad de Datos Comercial` dashboard (`21144697`) now contains seven verified controls: income type and commercial-process owner queues, KPI scorecards for the single missing amount and business line, the ten-Deal Radar owner queue, a 494-Deal Closed Won variation-adoption scorecard and an 82-Deal Q1-Q2 income-type validation queue.
- No HubSpot record, schema, workflow, form, rule, view or pipeline metadata was changed.
- P1.1 and the first P1.2 control set are complete. Backfill remains a separate approved P1.4 operation.
- P1.3 current-quarter Growth publication is complete: seven verified reports now provide KPI pulse, income-type and commercial-process composition, business-line value, exact line detail and an owner-by-line pivot. All reconcile to 29 Deals and CLF 2,443.89 of current Deal value.
- The next reporting action is explicit won/lost outcome reporting after correcting or excluding the invalid Radar closed-state behavior. Monthly trend and target-gauge assets remain intentionally deferred until their time-series and denominator contracts are valid.
