# SKY_TENANT_EXECUTIVE_SLICE_V1.md

## Purpose

Document the requested Sky Airline dashboard slice before implementation.

This file is the source of truth for:
- what Sky asked to see in the client dashboard
- what data already exists in BigQuery
- what is technically feasible now
- what requires new modeling before it is safe to expose

This document must stay aligned with:
- `GREENHOUSE_ARCHITECTURE_V1.md`
- `BACKLOG.md`
- `PHASE_TASK_MATRIX.md`
- `project_context.md`
- `Handoff.md`

## Requested Scope

Sky asked for the dashboard to show:
- on-time percentage by month
- average RpA by month
- First-Time Right derived from RpA
- a capacity section with people assigned to the account
- campaigns delivered per month and how many adjustments each one had
- technology tools assigned to projects
- AI tools assigned to projects
- capacity for the assigned team
- relationship tenure phrased as `Desde hace N meses y N dias formas parte de nuestra Greenhouse`

Named people to show as assigned to the account:
- Daniela Ferreira, Creative Operations Lead / directora de arte
- Mekin or Melkin Hernandez, Senior Visual Designer
- Andres Carlosama, Senior Visual Designer

## Real Data Snapshot

Validation date:
- 2026-03-10 America/Santiago

Tenant found in BigQuery:
- `client_id = hubspot-company-30825221458`
- `client_name = Sky Airline`
- `hubspot_company_id = 30825221458`
- `status = active`

Active service modules already assigned:
- `agencia_creativa`
- `globe`

Project currently in tenant scope:
- `project_id = 23239c2f-efe7-80ad-b410-f96ea38f49c2`
- `project_name = Kick-Off - Sky Airlines`
- project date range in Notion: `2025-08-01` to `2026-07-31`
- project owner in modeled data: `Daniela`
- project `% On-Time` in current source row: placeholder dash, not a usable numeric value
- project `RpA Promedio` in current source row: `0`

Visible operational footprint for that scoped project today:
- earliest visible task creation date: `2025-07-16`
- last visible task edit date: `2025-09-05`
- visible tasks: `2`
- monthly slice currently visible: `2025-07`

Sky-scoped task evidence currently visible:
- `Brochure - Onboarding`
  - created `2025-07-16`
  - status `Listo`
  - `cumplimiento = 100 %`
  - `completitud` indicates completed on time
  - `rpa = 0`
  - `client_change_round_final = 0`
  - responsible `Daniela`
- `Campana Fiestas Patrias 2025`
  - created `2025-07-29`
  - status `Archivadas`
  - `cumplimiento = Incumplida`
  - `completitud` indicates archived
  - `rpa = 0`
  - `client_change_round_final = 0`
  - responsible text includes `Daniela, Melkin Hernandez | Efeonce, Alejo Carreras`

People evidence in Sky-scoped modeled data:
- Daniela is present at project level and task level
- Melkin Hernandez is present in one Sky-scoped task
- Andres Carlosama is not present in the current Sky-scoped project rows or task rows

Client users currently bootstrapped for Sky:
- only the customer contact `dianesty.santander@skyairline.com` is present in `greenhouse.client_users`
- no internal Efeonce staffing assignments exist yet in a first-class Greenhouse model

## Feasibility Assessment

### 1. On-Time % by month

Status:
- feasible now

How it can be sourced today:
- derive it from task-level `cumplimiento` and `completitud`
- do not use project-level `pct_on_time` for Sky right now because the scoped project row is a placeholder dash, not a usable value

Important decision needed:
- choose the month grain
- recommended default: group by task `created_time` until due-date governance is defined

Risk:
- if the business wants due-month instead of created-month, the KPI can drift unless the rule is locked in writing

### 2. Average RpA by month

Status:
- technically queryable but not production-safe for Sky

Why:
- the Sky-scoped project currently has `rpa = 0` on every visible task
- across the full `notion_ops.tareas` table, RpA is effectively sparse and near-zero:
  - `1125` total tasks
  - `1118` tasks with `rpa = 0`
  - only `7` tasks with `rpa > 0`

Conclusion:
- showing average RpA for Sky today would almost certainly be misleading

### 3. First-Time Right based on RpA

Status:
- not viable as a production KPI yet

Why:
- RpA is not mature enough in source data to support tenant-level decision-making

Safe interim alternative:
- use a proxy based on client adjustments:
  - `% deliverables with client_change_round_final = 0`
- this is closer to a true FTR interpretation than the current RpA data

Recommendation:
- do not label anything `First-Time Right` until the definition is approved
- if we need a temporary metric, expose it as:
  - `Entregables sin ajustes cliente`
  - not as `First-Time Right`

### 4. Assigned people on the account

Status:
- partially feasible, but not safe to ship from current source inference

What exists today:
- Daniela appears as project owner
- Melkin appears in Sky task responsibility text
- Andres does not currently appear in Sky-scoped modeled rows

What is missing:
- a dedicated account assignment source of truth
- role titles normalized for internal Efeonce staff
- a clean way to distinguish account assignment from incidental task assignment

Recommendation:
- build an explicit account assignment model before exposing this section in production
- do not infer account staffing from the last task assignee

### 5. Capacity for assigned people

Status:
- not feasible yet

Why:
- there is no reliable allocation source today for contracted capacity, assigned capacity, or actual utilization by account role
- current task assignees are not the same as account capacity allocation

Requires:
- account assignment model
- allocation fields such as monthly capacity percentage, role, and active range

### 6. Campaigns delivered per month plus adjustment counts

Status:
- partially feasible now as a dashboard proxy

What can be done now:
- count scoped deliverables or campaign-like tasks by month
- show client adjustment proxy from `client_change_round_final`
- show review pressure proxy from `revisiones_ids`, `frame_comments`, and `open_frame_comments`

Current Sky evidence:
- visible month `2025-07`
- `2` visible scoped tasks
- `0` client adjustment rounds
- `0` revision records
- `0` frame comments

What is still missing:
- a real campaign entity and mapping layer
- a rule that decides when a task is a campaign, a deliverable, or an operational subtask

Recommendation:
- for Sky, the dashboard can show a provisional `Entregables por mes` block
- reserve the `/campanas` product surface for after the campaign semantic layer exists

### 7. Technology tools assigned to projects

Status:
- not feasible from current modeled data

Why:
- no modeled table currently stores project tool assignments
- no column in the normalized `notion_ops` tables provides a defendable project tooling inventory

Conclusion:
- this requires new modeling, not just new UI

### 8. AI tools assigned to projects

Status:
- not feasible from current modeled data

Why:
- same issue as project tooling
- keyword search in raw Notion JSON is too noisy to be treated as source of truth

Conclusion:
- requires explicit modeling and governance

### 9. Relationship tenure

Status:
- feasible now after a canonical start-date decision

Candidate start dates currently visible:
- first visible work item creation: `2025-07-16`
- project date start in Notion: `2025-08-01`

As of `2026-03-10`:
- from `2025-07-16` -> `7 meses y 22 dias`
- from `2025-08-01` -> `7 meses y 9 dias`

Recommendation:
- use `2025-07-16` if the KPI means first visible operational collaboration
- use `2025-08-01` if the KPI means formal project start
- lock the wording and source before implementation

## Proposed Delivery Shape

### Slice A. Safe to implement first

- monthly on-time percentage for Sky using task-level delivery status
- relationship tenure block once the canonical start date is approved
- monthly output block using scoped deliverables or campaign-like tasks
- monthly adjustments proxy using `client_change_round_final`

### Slice B. Requires new model before implementation

- assigned account team section
- role labels for internal Efeonce staff
- capacity section for assigned people
- project technology tools
- project AI tools

### Slice C. Must stay blocked until data quality improves

- average RpA by month as a decision KPI
- First-Time Right derived from RpA

## Recommended Data Model Additions

### Account assignment

Recommended new tables:
- `greenhouse.account_people`
- `greenhouse.client_account_assignments`

Minimum fields needed:
- person identifier
- full name
- org side: `efeonce` or `client`
- role title
- client_id
- allocation percentage or contracted capacity
- valid_from
- valid_to
- active

### Project tooling

Recommended new tables:
- `greenhouse.project_tool_assignments`
- `greenhouse.project_ai_tool_assignments`

Minimum fields needed:
- assignment identifier
- client_id
- project_id
- tool_code
- tool_label
- tool_category
- assigned_by
- valid_from
- valid_to
- active

### Semantic monthly delivery mart

Recommended derived layer:
- `greenhouse.fact_tenant_delivery_monthly`

Purpose:
- stabilize on-time and adjustment metrics by tenant and month
- avoid rewriting the same business logic in each endpoint

## Product Guardrails

- do not expose RpA or FTR to Sky as if they were trustworthy today
- do not infer account team membership from arbitrary task assignees
- do not create a fake campaign model only for one tenant
- do not use raw JSON keyword matches as source of truth for project tools or AI tools

## Approval Needed Before Build

Approve or decide:
- canonical definition of monthly on-time grain
- canonical relationship start date for tenure
- whether the interim quality metric should be called `Entregables sin ajustes cliente` instead of `First-Time Right`
- whether account staffing should be captured first in BigQuery tables or sourced from a Notion structure

## Recommended Next Step

If approved, implementation should proceed in this order:
1. monthly on-time and tenure
2. monthly deliverables plus adjustments proxy
3. account assignment model
4. capacity section
5. project tools and AI tools
6. RpA and FTR only after source quality is corrected
