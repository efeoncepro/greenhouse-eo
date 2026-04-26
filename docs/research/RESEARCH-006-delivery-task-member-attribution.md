# RESEARCH-006 — Delivery Task Member Attribution

## Status

- Lifecycle: `Research Brief`
- Status: `Active`
- Created: 2026-04-26
- Domain: Delivery / ICO / People metrics
- Resulting tasks: `TBD`

## Purpose

Explore whether Greenhouse needs an explicit enterprise-grade attribution layer between Notion delivery tasks and ICO member metrics.

This research is intentionally not a build task yet. The goal is to document the current behavior, the risk, and the policy decisions needed before changing any metric contract.

## Current Behavior

Greenhouse currently evaluates each Notion task row independently.

If a task has one responsible person, that person becomes the metric owner for that task.

If a task has multiple responsible people, Greenhouse stores all mapped members in `assignee_member_ids`, but member-level ICO metrics credit only the first mapped responsible person:

- `assignee_source_id`: first Notion responsible user.
- `assignee_member_id`: Greenhouse member mapped from that first Notion user.
- `assignee_member_ids`: all mapped Greenhouse members from the Notion responsible list.
- `primary_owner_member_id`: current canonical member attribution for ICO.

The current explicit policy is:

```txt
primary_owner_first_assignee
```

Current implementation references:

- `scripts/sync-source-runtime-projections.ts`
  - Reads Notion responsible user ids.
  - Deduplicates them.
  - Uses the first responsible as `assignee_source_id`.
  - Maps all known responsible users into `assignee_member_ids`.
- `src/lib/ico-engine/schema.ts`
  - Builds `ico_engine.v_tasks_enriched`.
  - Resolves `primary_owner_member_id` from `assignee_member_id`.
  - Tracks `has_co_assignees`.
- `src/lib/ico-engine/shared.ts`
  - Maps ICO `member` dimension to `primary_owner_member_id`.
  - Declares `OWNER_ATTRIBUTION_POLICY = 'primary_owner_first_assignee'`.
- `src/lib/ico-engine/materialize.ts`
  - Materializes `ico_engine.metrics_by_member` grouped by `primary_owner_member_id`.
- `src/lib/ico-engine/performance-report.ts`
  - Documents that top performer credit goes only to the primary owner.

## Simple Example

Given this Notion structure:

```txt
Project: Campaign X

Main task:
- Name: Landing design
- Responsible: Daniela

Subtasks:
- Copy: Pedro
- Design: Daniela
- QA: Maria
```

Greenhouse currently attributes metrics as:

```txt
Landing design -> Daniela
Copy           -> Pedro
Design         -> Daniela
QA             -> Maria
```

Greenhouse does not currently apply a canonical rule that says "subtasks inherit the main task owner."

The main weakness appears when one task or subtask has multiple responsible people:

```txt
Task: Design
Responsible: Daniela, Pedro, Maria
```

Current attribution:

```txt
Metric credit -> Daniela
Co-assignees  -> Pedro and Maria are retained as data, but do not receive member metric credit.
```

## Why This Matters

The current behavior is simple and stable, but it is not yet an enterprise-grade attribution model.

Risks:

- Ordering in Notion becomes business-critical because the first responsible receives all metric credit.
- Co-assignees are visible in data but not credited in member-level metrics.
- There is no explicit role distinction between owner, producer, reviewer, approver, collaborator, or client owner.
- There is no metric-specific attribution policy.
- There is no historical attribution ledger that explains why a person received or did not receive credit in a locked monthly period.
- Payroll and performance workflows may eventually need stronger auditability than "first assignee wins."

This does not mean ICO is broken. It means ICO has a clear current policy, and the next enterprise step is to make attribution an explicit contract instead of an inferred column.

## Non-Goals

- Do not change existing ICO numbers as part of research.
- Do not replace `metrics_by_member` immediately.
- Do not reinterpret historical payroll without a signed-off policy.
- Do not force every task to split credit equally by default.
- Do not make task-parent inheritance implicit without business approval.

## Candidate Attribution Model

Introduce a canonical attribution fact, initially populated from existing delivery task data:

```txt
greenhouse_delivery.task_member_attributions
```

Candidate fields:

```txt
attribution_id
task_source_id
project_source_id
space_id
member_id
source_user_id
role
weight
is_primary_owner
attribution_policy
period_year
period_month
valid_from
valid_to
snapshot_status
source_system
sync_run_id
created_at
updated_at
```

Candidate roles:

```txt
primary_owner
co_assignee
producer
reviewer
approver
client_owner
observer
```

Candidate policies:

```txt
primary_owner_only
equal_split
weighted_split
role_weighted
manual_override
inherit_parent_owner_when_unassigned
```

Initial default should preserve current ICO behavior:

```txt
primary_owner_only
```

## Recommended Evolution Path

### Phase 1 — Document and observe

Keep existing ICO outputs unchanged.

Add data quality and reporting around:

- tasks without primary owner;
- tasks with multiple assignees;
- tasks where Notion users do not map to Greenhouse members;
- subtasks without owner;
- subtasks with owner different from parent task owner;
- tasks linked to multiple projects.

### Phase 2 — Add attribution fact in shadow mode

Materialize attribution rows from current delivery task data, but do not make ICO consume them yet.

Expected default output:

```txt
primary owner row: weight = 1.0
co-assignee rows: weight = 0.0 under primary_owner_only
```

This keeps the current metric contract while making the attribution auditable.

### Phase 3 — Add ICO shadow metrics

Create a parallel metric table or view:

```txt
ico_engine.metrics_by_member_attributed
```

Compare it against current:

```txt
ico_engine.metrics_by_member
```

Required comparison:

- current primary-owner-only result;
- attributed result under `primary_owner_only`;
- hypothetical `equal_split`;
- count of tasks whose attribution would change under a new policy;
- member-level delta for RpA, OTD, FTR, throughput.

### Phase 4 — Policy decision

Select policy by metric and operational use case:

| Use case | Likely policy |
|---|---|
| Delivery accountability | `primary_owner_only` |
| Team contribution visibility | `equal_split` or `role_weighted` |
| Payroll / bonus | `primary_owner_only` until signed-off |
| Performance coaching | show both primary and co-assignee context |
| Client-facing reporting | project-level only, avoid person-credit semantics |

### Phase 5 — ICO adoption

Only after shadow validation, allow ICO to read attribution fact as its member dimension source.

Compatibility rule:

```txt
If no attribution fact exists, fall back to primary_owner_member_id.
```

## Open Questions

1. Should Notion list order remain meaningful, or should Greenhouse require an explicit primary owner field?
2. Should subtasks without responsible person inherit the main task owner, project owner, or remain unassigned?
3. Should co-assignees ever receive metric credit, or only visibility?
4. Should RpA, OTD, FTR, throughput, and cycle time share the same attribution policy?
5. Should payroll consume only primary-owner metrics even if performance dashboards show split contribution?
6. Should attribution be locked monthly with ICO snapshots?
7. Who can override attribution manually, and how is that audited?
8. Should reviewers and approvers influence FTR differently from producers?
9. Should client owners ever be represented in attribution, or only internal members?

## Ready For Task Criteria

This research is ready to become one or more `TASK-###` entries when:

- current multi-assignee volume is measured;
- business selects the default attribution policy for Delivery;
- payroll and performance use cases are explicitly separated;
- parent/subtask inheritance policy is decided;
- shadow-mode acceptance criteria are defined;
- migration/backfill scope is known;
- the ICO fallback contract is agreed.

## Recommended First Task

Create a non-invasive discovery/observability slice:

```txt
TASK-### — Delivery Attribution Observability
```

Scope:

- Add queries or a small report for multi-assignee, unassigned, unmapped-user, and subtask-owner patterns.
- Do not alter `metrics_by_member`.
- Do not change payroll.
- Produce numbers that support the final policy decision.

## Decision Bias

Favor explicit attribution facts over hidden inference.

Favor compatibility over metric churn.

Favor policy versioning over silent behavior changes.

The enterprise target is not "split all metrics." The enterprise target is "every metric credit can explain who got it, why, under which policy, and for which locked period."
