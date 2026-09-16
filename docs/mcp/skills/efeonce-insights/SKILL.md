---
name: efeonce-insights
description: How to operate Efeonce Insights through MCP — build a valid request from the catalog, create an edition, follow its phases, read sealed evidence and the frozen plan honestly, request and follow the rendering of its deck, and know what a machine cannot do (issue, share, send). Load it before creating, rendering or describing an Insights edition.
---

# Operating Efeonce Insights

Efeonce Insights turns a client's evidence (SEO, AEO, ICO delivery metrics) into a frozen, versioned
edition for a period. Greenhouse owns the library, the request, the permissions and the lifecycle.
This manual teaches you to operate it correctly through the four MCP tools. It grants no permission:
everything below is enforced server-side per binding and per organization.

## What exists today and what does not

| Capability | Status through MCP |
| --- | --- |
| Read the eligible catalog for an organization | `get_insights_catalog` |
| List editions / read one edition with evidence and plan | `list_insight_editions`, `get_insight_edition` |
| Create an edition and run its generation up to `ready_for_review` | `create_insight_edition` — internal bindings only |
| Issue, withdraw, recover a failed edition | Not through MCP. Issuing is a human decision with its own capability |
| Request the rendering of an edition's deck and follow it | `request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render` — writes are internal bindings only; today only `deck_pdf` renders |
| A4 report, web view, share by link, send by email, schedule | Not yet: they arrive in later units of the program |

`renderableOutputs` in the catalog lists what the render engine can produce today (`deck_pdf`). An
edition can be created, generated and reviewed, but **it cannot be issued** until every requested
output has been rendered and validated. Rendering is asynchronous and runs in a worker: request it,
then poll the run. If the request answers `service_unavailable` with code `render_disabled`, rendering
is switched off in this runtime — report it and stop. Never tell a human that a report "is ready to send".

## The request, field by field

Always call `get_insights_catalog` first and propose the exact request to the human before creating.

- `modules`: subset of the catalog modules whose `available` is `true`. A module marked
  `module_not_assigned` or `no_active_spaces` will not produce evidence; do not include it.
- `period`: `{ start, endExclusive, timeZone }` with civil dates `YYYY-MM-DD` and an IANA zone.
  The window is `[start, endExclusive)`: August 2026 is `2026-08-01` to `2026-09-01`. Whole calendar
  months unlock monthly sources (ETV, ICO); arbitrary ranges only serve daily sources (Search Console).
- `comparison`: `{ kind }` with `none`, `previous_period` (same length immediately before; for whole
  months, the same number of months before), `previous_year` (same civil dates one year earlier, Feb 29
  becomes Feb 28) or `custom` with its own `start`/`endExclusive` that must not overlap.
- `audience`: `client` or `internal`. An org-scoped binding can only read `client` editions.
- `outputs`: one or more of `deck_pdf`, `report_pdf`, `web`. Declares intent. Only `deck_pdf` can be rendered today; requesting the rendering of another target is rejected, never queued for later.
- `locale` (`es-CL` default, `en-US`), `depth` (`executive`, `standard`, `detailed`).
- `idempotencyKey` (8–200 chars): the same key with the same request returns the same edition; the
  same key with a different request is a `409` conflict. Use one key per distinct human request.
- `policy.allowPartial`: only when the human explicitly accepts visible omissions. Without it, a
  requested module with no evidence stops the edition in `failed` at `validating`. With it, an edition
  whose modules all came back empty still reaches `ready_for_review`: the snapshot records each
  rejection (`no_data`, `unsupported_window`, ...) and the plan lists them as visible limits — never as
  zeros. Say "no evidence for X in this window", never "X was 0".
- `title` (3–200 chars) and `purpose` (3–500 chars): optional; name the report in the library the
  first time it is created. They are ignored when a later edition revises an existing report.
- Window limits: `endExclusive` must be after `start`; the window cannot start in the future (a
  window that ends in the future is accepted as partial); the maximum length is 400 days; `timeZone`
  defaults to `America/Santiago`. Defaults when omitted: comparison `previous_period`, audience
  `client`, locale `es-CL`, depth `standard`.
- `comparison` `custom` shape: `{ "kind": "custom", "start": "YYYY-MM-DD", "endExclusive": "YYYY-MM-DD" }`;
  it must not overlap the period.
- Tool input shape: `create_insight_edition { organizationId, request }` where `request` is the object
  above; `organizationId` is the identifier the organization list already gives you (internal
  bindings must pass it; org-scoped bindings read their own organization only). Success answers
  `202` for a new edition and `200` with `idempotent: true` for a safe replay.

## Following the generation

`create_insight_edition` answers with the edition and `generation.outcome`:

- `ready_for_review`: evidence sealed, plan frozen, figures validated. The next step is a human review
  and, later, issuing — say so.
- `failed` with `failedPhase` and `failureCode`: report the phase and the code verbatim. Typical codes:
  `evidence_rejected` (a required module had no usable evidence), `unsupported_window`,
  `insufficient_data`, `method_mismatch`. A failed edition is recoverable from that phase by an
  authorized human; do not create a duplicate edition to "retry".

States you will see: `draft → collecting → composing → validating → ready_for_review → issued`, plus
`failed` (recoverable by phase) and `withdrawn` (terminal). Org-scoped bindings see a redacted
projection: `in_progress`, `in_review`, `issued`, `needs_attention`, `withdrawn`.

## Listing and reading editions

`list_insight_editions { organizationId, state?, audience?, reportId?, pageSize?, cursor? }` returns
the newest first with a cursor for the next page; `pageSize` is capped at 200. `get_insight_edition
{ organizationId, editionId, includeEvidence: true }` adds the sealed snapshot, the frozen plan and
the transition history when your binding may see them; `includeEvidence` is `false` by default and
you get only the edition header. For a client-audience read, `evidence` and `plan` stay `null`
until the edition is issued — that is not an error and not "0".

## Reading evidence honestly

Ask `get_insight_edition` with `includeEvidence: true`. The snapshot is sealed and hashed; the plan is
frozen and hashed; both are immutable. Every figure in the plan references a fact by `factId`.

- A fact carries `value` (may be `null`), `unit`, `numerator`/`denominator` when it is a rate,
  `population`, `source`, `method.version`, `coverage`, `freshness.asOf`, `observation`
  (`observed` or `estimated`) and `comparisonFactId`. Report the unit and the as-of date with the number.
- A `rejection` explains an absence: `unsupported_window`, `method_mismatch`, `insufficient_data`,
  `suppressed`, `review_required`, `module_disabled`, `not_connected`, `target_ambiguous`, `no_data`.
  **An absence is never a zero.** Say "not available for this window because …", never "0".
- ETV is `estimated` and carries its methodology version; Search Console figures are `observed`.
  Do not average, sum or compare across methods. ICO RpA may be `suppressed` by its evidence policy;
  OTD always carries its numerator and denominator per space and month — never average percentages
  across spaces.
- The plan's `limits` and `methodology` already say what was omitted and how each figure was produced.
  Reproduce them; do not invent causes, forecasts or promises.

## Scope, permissions and negatives

- Org-scoped bindings operate only their organization and only read. Asking for another
  `organizationId` returns `not_found` — do not infer that the other organization exists.
- Internal bindings must pass `organizationId`. They can create, but a machine never issues: a `403`
  on issuing is expected behaviour, not an error to work around.
- An organization without the `insights_v1` module is reported as not found. Enabling the module is a
  human/commercial decision (client service enablement), not something to retry.
- `service_unavailable` on create means the generation flag is off in this runtime. Report it and stop.

## Responses you must interpret correctly

| You see | It means | What to do |
| --- | --- | --- |
| `service_unavailable` with code `generation_disabled` on create | The generation flag is off in this runtime | Report it and stop; a human enables it per runtime |
| `insufficient_scope` on `create_insight_edition` | Your MCP client does not carry the write scope this tool requires; reads are unaffected | Do not retry with another token; ask a human for a governed grant |
| A catalog module with `available: false` and `module_not_assigned` | That producer module is not enabled for the organization | Leave it out of `modules`; enabling it is a commercial decision |
| Same `idempotencyKey` and same request answered again with `idempotent: true` | Safe replay: you got the existing edition, nothing was duplicated | Continue with that edition |
| Same `idempotencyKey` with a different request → conflict | The key is already bound to another request | Use a new key for a genuinely new request |
| `not_found` for an organization you believe exists | Either it does not exist for your binding or it has no Insights module | Do not infer anything else; report it as not available |
| `evidence` and `plan` come back `null` for a client-audience read | The edition is not issued yet; clients only see evidence and plan of issued editions | Say the edition is in review and figures are not yet visible for the client |
| Issuing answers `not_ready` | At least one requested output is not rendered and validated yet (the details name it) | Request or finish the rendering first; do not work around it |
| `request_insight_render` answers `render_rejected` | You asked for an output that cannot be rendered yet, or the frozen plan exceeds a slot budget of the catalog | Request only `deck_pdf`; nothing is truncated silently — report the cause |
| A render run is `partial_failed` | One output succeeded and another failed | Report both states; `retry_insight_render` re-queues only the failed ones |
| An output is `dead_letter` | Attempts exhausted or a non-retryable failure (for example the catalog changed since queuing) | Do not retry from MCP; a human decides |

## Recipes

Monthly SEO + ICO edition for a client, previous month comparison:

1. `get_insights_catalog { organizationId }` → confirm `seo` and `ico` available.
2. Propose to the human: modules `["seo","ico"]`, period `2026-08-01`→`2026-09-01`
   `America/Santiago`, comparison `previous_period`, audience `client`, outputs `["report_pdf"]`,
   idempotencyKey `insights-<org>-2026-08-seo-ico`.
3. `create_insight_edition { organizationId, request }` → read `generation.outcome`.
4. `get_insight_edition { editionId, includeEvidence: true }` → summarize facts with units and as-of,
   list rejections as limits, and state that issuing is pending human review.

Recovering after a failure: report `failedPhase` + `failureCode` and hand off to a human with
`insights.edition.review` capability; do not re-create.
