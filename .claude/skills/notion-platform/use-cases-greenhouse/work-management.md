# Greenhouse work management with Notion

## Domain model

- `Project`: flat initiative/outcome. No parent project and no subprojects.
- `Task`: executable work page in the Tasks data source.
- `Subtask`: the same Task entity with a self-referencing parent relation. No configured domain depth limit.
- Projects relate to tasks; hierarchy never lives in nested page bodies.

## Hierarchy invariants

- Parent and child belong to the same Greenhouse `space_id` and Tasks data source.
- A child inherits the effective project of its ancestor.
- Every task/subtask stores the same direct Project relation as its root task. Child overrides are invalid; project inheritance is materialized for queryability.
- A task cannot become its own ancestor; reject cycles before writes.
- Reparenting a branch updates/validates the effective project for the subtree.
- Traverse iteratively with visited IDs and operational node/request limits.
- Relation reads may truncate at 25 items in a page response; use property-item pagination when `has_more=true`.
- A leaf is a task with no children after a complete paginated relation read. A root with no descendants has `leafTotal=1`; its own normalized terminal state determines leaf completion. Cancelled leaves are excluded from numerator and denominator; an all-cancelled tree returns `leafTotal=0` and ratio `null`.
- Terminal/completed/cancelled status mappings are governed per space; never compare custom labels lexically.

## Reparenting a branch

Notion has no multi-page transaction. Reparenting is a governed saga, not a single optimistic PATCH:

1. Resolve both pages to one `space_id` and Tasks data source; an explicit-space/parent conflict fails.
2. Load the complete moving subtree and target ancestor chain with `page_size=100`, terminal cursors in one session, visited IDs and cycle detection. Reject an incomplete query, exhausted budget, `newParentId===rootId` or a target inside the subtree.
3. Capture parent/project/`last_edited_time` for every affected page and acquire a Greenhouse operation lock/idempotency key. Register every moving-subtree and target-ancestor page ID in an overlap index; reject a saga when either set intersects an active operation, including when another root is an ancestor/descendant. The lock stores `space_id`, moving root, operation owner, TTL and heartbeat. Stale recovery first reconciles the operation ledger; release atomically clears the overlap index only on complete, confirmed rollback or explicit operator resolution. Reads expose `running|partial` so mixed intermediate state is never presented as final.
4. Immediately before the first mutation, re-read and fingerprint the complete moving subtree and target ancestor chain. A changed member, added child, changed ancestor or mismatched governed value means concurrent edit: fail/replan rather than overwrite.
5. PATCH the root task's parent self-relation; do **not** use the page-move endpoint. If the target project differs, PATCH the direct Project relation on the root and every descendant through a throttled resumable queue. A target with no project clears the Project relation across the entire subtree.
6. Before every descendant PATCH, compare current parent/project/`last_edited_time` with the snapshot or prior value written by this saga. Conflict marks the operation `partial` and requires replan; the Greenhouse lock cannot block Notion UI edits.
7. Record each page result in `ReparentBranchPlan` with `planned | running | partial | rolled_back | complete`. On failure, block further branch mutations and offer resume or compensating rollback from the snapshot. Rollback is compare-before-compensate: revert only when the current governed value still equals this saga's write; otherwise record a rollback conflict for operator resolution.
8. Post-saga, re-read the branch to discover descendants added during execution and reconcile or mark `partial`. Never claim atomic success.

Default safety budgets are configurable and depth-independent: `maxNodes=10000`, `maxRequests=20000`, `syncWallTimeMs=30000`. Depth 50 is valid. When sync time expires, persist the traversal frontier and visited page IDs, not a durable Notion cursor. Resume pagination for the interrupted relation from page 1 in a fresh session and deduplicate visited IDs. Budget or 10k-query incompleteness returns a partial/async operation, never a complete tree.

## Create/write path

One canonical command owns:

- space/project/parent resolution;
- normalized DTO validation;
- property-ID mapping and schema fingerprint checks;
- hierarchy guards;
- title convention: verb + deliverable + context, with metadata kept in properties;
- Enhanced Markdown renderer selection;
- idempotency, audit and sanitized errors;
- Notion adapter invocation.

CLI, API, MCP, Nexa and future UI consume the same primitive. MCP is acceptable for interactive one-shots, not as the productive runtime implementation.

## Read and status path

Use live Notion reads for on-demand current state. Synced BigQuery/Postgres projections serve analytics but cannot answer whether someone changed a task moments ago.

Return raw and normalized values plus:

- current status and responsible people;
- due date in the space timezone;
- calendar and business days remaining;
- `unscheduled | on_track | due_soon | due_today | overdue | completed | cancelled`;
- self status separately from recursive tree progress;
- leaf-task completion ratio to avoid parent/child double counting;
- result/evidence completeness;
- source freshness and `queriedAt`.

Never equate `last_edited_time` with progress.

`due_soon` means a positive `businessDaysRemaining` less than or equal to the registry's `dueSoonBusinessDays`; it is not hardcoded globally.

Due-state precedence: normalized `completed` or `cancelled` first; then missing deadline → `unscheduled`; negative remaining → `overdue`; zero → `due_today`; positive within threshold → `due_soon`; otherwise → `on_track`.

### Due-date semantics

- Resolve the space timezone and versioned business calendar from the registry.
- For a date range, the deadline is `end`; otherwise it is `start`.
- A date-only deadline ends on that local calendar date. A timestamp deadline compares instants, then renders in the space timezone.
- `calendarDaysRemaining` is the signed local-date difference `deadlineDate - todayDate`: today `0`, tomorrow `1`, yesterday `-1`.
- `businessDaysRemaining` is signed and uses the versioned calendar: future counts eligible dates after today through the deadline; overdue counts eligible dates after the deadline through today and negates the result.
- Terminal completed/cancelled status wins over due-state labels. Missing timezone/calendar makes business-day output `unknown`, never a weekend-only approximation.

### What counts as advancement

Return `advanced=true` only when a governed baseline exists and at least one material signal improved: normalized status stage advanced according to the space mapping, verified DoD count increased, required result/evidence became more complete, or recursive leaf completion increased. A status regression is reported separately. Body edits, assignee changes and `last_edited_time` alone are not advancement. Default baseline is the delegation snapshot; a query may provide `since`, in which case use the closest observation at or before that instant. Without a comparable baseline, return `advanced="unknown"` and include `advancementReasons`.

The registry maps physical properties to semantic fields such as `title`, `status`, `assignees`, `due`, `project`, `parent_task`, `result_summary`, `progress_updated_at` and optional DoD counters. Missing bindings return `unmapped`; a type/fingerprint mismatch returns `schema_drift` and blocks mutation.

## Change history

The public API provides current state, not a complete property-version history. Maintain a Greenhouse append-only observation/transition ledger:

1. Persist a baseline snapshot when delegating.
2. Receive `page.properties_updated` as a signal.
3. Re-fetch the current page before comparison.
4. Append previous/new normalized values and provenance.
5. Reconcile live during explicit status reads to detect missed events.

Aggregated webhooks can omit intermediate rapid transitions. Report observed history honestly; never synthesize missing steps.

Minimum ledger record: `space_id`, `task_page_id`, semantic field, normalized previous/new values, source event/request ID, observed timestamp, fetched page `last_edited_time`, schema fingerprint and idempotency hash. Order by observation time plus a stable sequence; call the result *observed history*, not the Notion audit log. Tasks first seen outside the command begin with coverage `partial_from_first_observation`.

### Status response contract

Both JSON and human output derive from one normalized response:

```json
{
  "taskId": "opaque-id",
  "spaceId": "stable-space-id",
  "current": { "title": "...", "status": "in_progress", "assignees": [], "projectId": "...", "parentTaskId": null, "impact": "high", "effort": "medium", "propertiesState": "ok" },
  "due": {
    "state": "due_soon",
    "calendarDaysRemaining": 2,
    "businessDaysRemaining": 1,
    "timezone": "America/Santiago",
    "calendarId": "cl-business",
    "calendarVersion": "2026.07"
  },
  "progress": {
    "advanced": true,
    "advancementReasons": ["status_stage_advanced"],
    "regressed": false,
    "selfState": "in_progress",
    "leafCompleted": 3,
    "leafTotal": 5,
    "treeComplete": true
  },
  "completion": { "state": "open", "result": "missing", "evidence": "missing" },
  "history": {
    "coverage": "observed_since_baseline",
    "baselineAt": "2026-07-10T12:00:00Z",
    "observedAt": "2026-07-18T12:00:00Z"
  },
  "freshness": { "queriedAt": "2026-07-18T12:00:03Z", "source": "notion_live" },
  "warnings": []
}
```

Use nullable values plus warnings when a figure is unknown. Result/evidence fields use `missing | partial | complete | not_applicable | unknown`. Include observed transitions and `lastMaterialProgressAt` when the ledger supports them; include requested raw properties only under a redacted `rawProperties` field. `treeComplete=false` whenever relation pagination, permissions, traversal budgets or cycle findings prevent a full tree read. Never publish a recursive percentage as complete in that state.

## Completion contract

Structured properties hold status, due date, assignees and a short result. The page body holds narrative evidence and verified DoD.

- A successful terminal status requires a non-empty result.
- Evidence is required unless policy records a reason it is not applicable.
- Terminal status without required result/evidence is `completion_incomplete`.
- Closure update must target one exact anchor and fail safely if missing or duplicated.
- Read `result_summary` from its governed property and evidence/verified DoD from the unique Markdown closure anchor. If `/markdown` is truncated or has unresolved `unknown_block_ids`, report narrative completion as `unknown`; do not infer it from terminal status.

## Conversation destination resolution

Resolve in order:

1. explicit space;
2. parent task/project binding;
3. unambiguous organization/client mention;
4. active conversation context;
5. unique registry match.

If more than one destination remains, ask once. Never infer solely from assignee or a generic title, and never carry a silent default across conversations.

An explicit destination that contradicts a bound parent/project is an error, not a precedence win.
