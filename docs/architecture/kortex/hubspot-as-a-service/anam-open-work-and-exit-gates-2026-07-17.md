# ANAM — Open work, dependencies and exit gates — 2026-07-17

> **Portal:** HubSpot ANAM `19893546`
> **Purpose:** canonical backlog after the commercial-pipeline governance rollout
> **Runtime boundary:** records and configurations belong to ANAM; Greenhouse stores only operating canon and evidence
> **Default rule:** documentation of an item is not authorization to execute it

## How to read this backlog

`Data Quality (DQ)` means **Calidad de Datos**. DQ is not a cosmetic score: it is an operating queue with an
eligible denominator, exception population, accountable owner, correction action, review cadence and exit gate.
Missing data may be attributed to commercial discipline only when the capture point, responsible owner and
omission are evidenced; otherwise the cause remains schema/platform, source/migration, integration or unresolved.

States used here:

- **ready for controlled slice:** design and dependencies are sufficient to prepare an exact change set;
- **approval pending:** execution changes runtime and requires the named approval;
- **blocked:** an external fact or prerequisite prevents truthful execution;
- **pilot:** useful for QA, not eligible for official client KPI;
- **operational program:** recurring owner-led work, not a one-time backfill.

## Executive priority map

| Priority | Workstream | Current state | Next accountable action | Exit gate |
|---:|---|---|---|---|
| P0 | Pipeline automations | Ready for controlled slice | Efeonce proposes exact task contracts; ANAM ratifies operational parameters | Eight workflows tested on future stage entry, with no historical task wave |
| P0 | Controlled pipeline QA | Ready after automation draft | Efeonce runs positive/negative test Deals in each pipeline | Required fields block and allow exactly as designed; test records quarantined/cleaned |
| P0 | Customer Agent availability | Operational on 2026-07-24 | Efeonce monitors channel, credits and conversation QA | Channel remains active, new conversations respond and credit behavior is observable |
| P0 | Customer Agent follow-up/Quality refinement | Draft QA passed; publication pending | Approve and publish the neutral handoff and intent-specific guidelines | Live regression passes without naming an assignee |
| P1 | DQ adoption and baseline refresh | Operational program | Deal owners correct omissions; Efeonce reads back coverage and queues | Stable cadence, named owners and trustworthy denominator by cohort |
| P1 | Service fact ratification | Approval pending ANAM | Maria Paz/ANAM ratifies or replaces the five synthetic pilot inputs | Pilot facts become reviewed facts or remain explicitly excluded |
| P1 | Deal/line item → Service materializer | Blocked by ratified mapping/operating contract | Efeonce builds idempotent per-line-item proposal/execution path | Retry-safe creation, exact lineage, positive/negative tests and rollback |
| P1 | Renewal lineage | Blocked by production Service cohort/materializer | Efeonce links prior Service → renewal Deal → successor Service | Comparable reviewed renewal cohort exists without overwriting history |
| P2 | Official Retention/Fidelización KPI | Pilot | ANAM ratifies facts, periods, definitions, owners and targets | `(PILOTO)` removed only after complete eligible cohort and denominator readback |
| P2 | Billing integration | Design ready; construction pending | Build no-write profiler, then approve schema and exact write cohort | Reconciled Account Unit/Billing Event model, idempotency, currencies and rollback |
| P3 | Tickets and SLA | Planned | Ratify taxonomy, routing, owners, SLA and Customer Agent escalation seam | Controlled Ticket flow tested with Company/Contact/Service associations |

## 1. Pipeline automations — next executable slice

The pipeline configuration is already live: Company is required at manual Deal creation, the artificial 60-day
close-date default is off, Growth starts at `Potencial 10%`, Renewal starts at `Por revisar`, and stage properties
govern advancement. `Radar 0%` is intentionally unchanged because pre-qualification belongs to Lead.

Eight task actions remain designed but unpublished:

| Pipeline / stage | Task purpose | Proposed owner resolution | Required operating parameters before publish |
|---|---|---|---|
| Growth / Calificado | Confirm activity and actionable `Paso siguiente` | Deal owner | Title, due date, notification, dedupe/re-enrollment |
| Growth / Hot | Refresh proposal, awarded/quoted components and close date | Deal owner | Same, plus line-item evidence checklist |
| Growth / Cierre ganado | Validate primary Company, awarded lines and Service readiness | Deal owner with Service-review escalation | Same, plus handoff destination and exception path |
| Renewal / Por revisar | Validate source Service, expiry and renewal eligibility | Renewal Deal owner | Same, plus source-Service evidence requirement |
| Renewal / Contacto iniciado | Record activity and actionable `Paso siguiente` | Renewal Deal owner | Same, plus contact-attempt evidence |
| Renewal / Propuesta en negociación | Refresh proposal, values and close date | Renewal Deal owner | Same, plus comparable-value evidence |
| Renewal / Renovado | Validate prior/successor Service lineage and comparable values | Renewal Deal owner with Service-review escalation | Same, plus successor materialization boundary |
| Renewal / No renovado | Validate loss reason and churn treatment | Renewal Deal owner | Same, plus reviewed churn/contraction distinction |

For every action, the change set must specify:

1. exact task title and description;
2. owner fallback when the Deal has no owner;
3. due-date policy and business-day behavior;
4. notification channel and recipient;
5. re-enrollment and deduplication rule;
6. positive future-entry test and negative non-entry test;
7. proof that existing Deals do not receive a retrospective task wave;
8. disable/rollback procedure and treatment of tasks already created.

Do not activate workflows `1805870398` or `1805693705`: both derive `Venta nueva` from pipeline membership and
would corrupt the explicit income classification.

## 2. Controlled pipeline QA

Use one quarantined test Deal per pipeline or the smallest independently reversible fixture accepted by ANAM.
The test matrix must cover:

| Scenario | Expected evidence |
|---|---|
| Create Growth | Only `Potencial 10%` is available/default for an ordinary user; Company and chosen close date required |
| Advance Growth open stages | `Paso siguiente` blocks Calificado/Interesado; Hot also blocks without `Monto original` |
| Close Growth won | Countries, original amount and quote variance required; Chilean `Región` remains optional |
| Close Growth negative | Lost reason required in both negative outcomes |
| Create Renewal | Only `Por revisar` is available/default for an ordinary user |
| Advance Renewal | All four open stages require `Paso siguiente` |
| Close Renewal | `Renovado` requires countries; both negative outcomes require lost reason |
| Excluded stage | `Radar 0%` label, metadata, rule absence and ten-Deal count remain unchanged |
| Automation | Exactly one expected task on future entry; no task on negative path or historical cohort |

Record screenshots/DOM readback, record IDs, before/after stage, task ID when applicable and cleanup outcome.

## 3. DQ adoption and baseline refresh

The latest verified Company-association coverage is `629/1,240` (`50.73%`) after the approved 34-pair exact
slice. The current portal contains 1,241 Deals, so the denominator and residual queue require a fresh live
readback before publishing a new coverage percentage. The previous `611` missing value is calculated, not a
newly verified widget value.

Monitor at least these cohorts after the prospective gates have operated long enough to observe adoption:

- Deals without a primary Company;
- open Deals without `Paso siguiente` or future activity;
- open Deals with past close date;
- Hot Deals without `Monto original`;
- won Deals without countries, original amount or quote variance;
- negative outcomes without loss reason;
- Companies without governed segment, strategic sector or HQ region;
- duplicate/ambiguous Company candidates held from automated correction.

The operating review should publish denominator, exception count, owner distribution and aging. A recommended
first checkpoint is two full working weeks after the pipeline rollout, followed by weekly review until the
capture rate stabilizes. This is not permission for inferred backfill, Company merge or automatic association.

The gate for official segment/sector/region reporting remains at least `95%` eligible Deal→Company plus
dimension coverage, with explicit period and metric definition. Multi-select region/country groups must be
deduplicated by Deal before consolidated totals.

## 4. Service fact ratification and materialization

Five controlled Services and workflow `1852406585` are live. Their activation inputs are synthetic and visibly
marked; `fields_ready` proves formula and dashboard behavior only.

Remaining work:

1. Maria Paz/ANAM reviews each pilot Service and ratifies, replaces or rejects dates, recurrence, eligibility,
   delivery state and comparable value facts.
2. Efeonce freezes the approved source mapping from Closed Won Deal + primary Company + awarded line item.
3. Build a Kortex/integration materializer that creates at most one Service per eligible line item using a
   deterministic external key and retry-safe upsert/search behavior.
4. Read back Company, originating Deal, source line-item provenance, owner, currency, TCV/ARR and lifecycle.
5. Test incomplete, ambiguous, duplicate and retry paths; quarantine rather than infer.

Historical Service migration remains `NO-GO` until a bounded cohort passes the same gates. A plain Deal workflow
must not create one ambiguous Service for a multi-line Deal.

## 5. Renewal lineage and official Retention/Fidelización

The Renewal Deal pipeline is governed, but Service-based renewal automation is not complete. The target chain is:

```text
eligible expiring Service -> review queue -> renewal Deal -> successor Service
                          -> prior/successor Service association
```

The prior Service is immutable history. A won renewal creates or links a successor; it never overwrites the
original. Comparable Retention uses reviewed recurring/mixed Services, same currency and compatible periods.

Before Retention `21152855` and Fidelización `21152950` become official:

- replace or ratify all synthetic inputs;
- define eligible period, denominator, currency policy and accountable owner;
- create a complete renewable cohort and read back prior/successor lineage;
- validate expansion, stable, contraction and churn semantics;
- ratify Loyalty evidence and preventive-action owner;
- obtain ANAM approval to remove `(PILOTO)`.

Until then, the four Retention reports and three Fidelización reports are QA/operating pilots, not GRR, NRR,
NPS or deterministic health score.

## 6. Customer Agent availability

The configuration, landing, chatflow and 23 knowledge sources remain present. On 2026-07-24 the agent was
operational again, with active live chat, all-hours coverage and draft-preview responses. The billing blocker
recorded on 2026-07-17 is historical evidence and no longer the current operating state.

The remaining controlled slice is behavioral:

1. publish the drafted Follow-up scope: results/reports, scheduling and billing, without redirecting to residues;
2. publish the Quality intake requirement: name, company, email and specific detail;
3. keep customer-facing handoff generic (`una persona del equipo`) and the assignee internal;
4. rerun live Follow-up, Quality and unavailable-agent regressions;
5. record credits, timestamp, published version and rollback.

Configuration presence alone still does not prove availability; validate a new conversation and response.

## 7. Billing integration

Billing remains the next construction program, not a permission to import the 16,898-row source. The correct
grain is one immutable Billing Event per source row/event plus an Account Unit for each normalized Código
ANAM/CeCo. Company, Deal and Service associations require deterministic lineage.

Execution order:

1. private, tenant-scoped upload and malware/format validation;
2. no-write profiler for schema, totals, currencies, duplicates and anomalies;
3. reviewed Unit→Company identity reconciliation;
4. exact Billing Event schema/change set and dry run;
5. totals reconciliation by source, state, period and original currency;
6. explicit ANAM approval of the exact write cohort;
7. idempotent upsert with before/after/readback and rollback ledger;
8. only then, dashboards comparing sold/contracted/billable/invoiced facts.

CLP, UF and USD remain separate. SharePoint may be a source adapter; it is not the canonical object model. The
source workbook named `Ticket Facturación` contains billing events, not customer-support Tickets.

## 8. Tickets and SLA

Tickets remain planned after the commercial foundations. They must represent human cases requiring tracked
action: service follow-up, Quality, claims, billing inquiries and administrative requests. Informational
questions resolved by Customer Agent do not need a Ticket by default.

Before activation ANAM must ratify:

- type/subtype taxonomy and priority;
- routing owner/team and fallback;
- first-response and resolution SLA by class;
- statuses, closure reason and reopen behavior;
- required Company, Contact and Service associations;
- Customer Agent escalation and duplicate-case behavior;
- reporting definitions and exception queues.

Exit requires positive/negative routing tests, SLA timer evidence, association readback, notification behavior
and an operator runbook.

## Approval map

| Decision | Efeonce may prepare | ANAM approval required before runtime write? |
|---|---|---|
| Pipeline workflow/task specifications and test plan | Yes | Yes, for final operational parameters and publish |
| Controlled test Deals | Yes | Yes, unless an already approved isolated QA cohort exists |
| DQ readback and owner queues | Yes, read-only | Correction writes remain separately approval-gated |
| Pilot Service fact review packet | Yes | Yes, ANAM owns the facts |
| Materializer code/dry run | Yes | Yes before Service writes/backfill |
| Remove `(PILOTO)` / publish official KPI | No unilateral publication | Yes |
| Customer Agent billing regularization | No | ANAM billing administrator owns it |
| Customer Agent activation retry after regularization | Yes | Use existing approval or obtain renewed approval if scope changed |
| Billing profiler | Yes, no-write | Writes/schema/import require separate approval |
| Ticket taxonomy/SLA | Efeonce proposes | ANAM ratifies before activation |

## Definition of program completion

The ANAM HubSpot managed service is not “finished” merely because configuration exists. This backlog closes only
when live runtime, documentation and operating ownership agree:

- pipeline gates and automations pass controlled future-entry QA;
- DQ has current denominators, accountable owners and a working cadence;
- Service facts are real/ratified and materialization is idempotent;
- renewal lineage supports a complete comparable cohort;
- official KPI gates are satisfied or the pilot labels remain visible;
- Customer Agent accepts new conversations and passes real QA;
- billing and Tickets either pass their rollout gates or remain explicitly excluded from the delivered scope.

Every closure must preserve portal `19893546`, record IDs, approvals, readback and rollback. No pending item in
this document authorizes bulk inference, duplicate-Company merge, historical record movement or KPI publication.
