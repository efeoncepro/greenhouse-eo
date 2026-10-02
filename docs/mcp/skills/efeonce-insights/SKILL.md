---
name: efeonce-insights
description: How to operate Efeonce Insights through MCP — build a valid request from the catalog, create an edition, follow its phases, read sealed evidence and the frozen plan honestly, request and follow the rendering of its deck and A4 report, manage read-only share links of issued editions, read email deliveries and recurring schedules honestly, and know what a machine cannot do (issue, send email, manage schedules). Load it before creating, rendering, sharing or describing an Insights edition.
---

# Operating Efeonce Insights

Efeonce Insights turns a client's evidence (SEO, AEO, ICO delivery metrics) into a frozen, versioned
edition for a period. Greenhouse owns the library, the request, the permissions and the lifecycle.
This manual teaches you to operate it correctly through its MCP tools (four for editions, four for rendering, three for share links, two for email deliveries, two for schedules and two for the report cover). It grants no permission:
everything below is enforced server-side per binding and per organization.

## What exists today and what does not

| Capability | Status through MCP |
| --- | --- |
| Read the eligible catalog for an organization | `get_insights_catalog` |
| List editions / read one edition with evidence and plan | `list_insight_editions`, `get_insight_edition` |
| Create an edition and run its generation up to `ready_for_review` | `create_insight_edition` — internal bindings only |
| Issue, withdraw, recover a failed edition | Not through MCP. Issuing is a human decision with its own capability |
| Request the rendering of an edition's deck and A4 report and follow it | `request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render` — writes are internal bindings only; `deck_pdf` (16:9 deck) and `report_pdf` (A4 report) render, `web` does not |
| Create, list and revoke read-only share links of an issued edition | `create_insight_share`, `list_insight_shares`, `revoke_insight_share` — create and revoke are internal bindings only |
| Read email deliveries of an edition and their per-recipient outcome | `list_insight_deliveries`, `get_insight_delivery` — read only |
| Read recurring schedules and their latest occurrences | `list_insight_schedules`, `get_insight_schedule` — read only |
| Send an edition by email; cancel, retry or reconcile a delivery | Not through MCP. A person does it in the Greenhouse portal |
| Create, activate, pause or retire a schedule | Not through MCP. A person does it in the Greenhouse portal |
| Read or set the organization's preferred report cover (automatic, navy or white) | `get_insight_cover_preference`, `set_insight_cover_preference` — setting is internal bindings only |
| The in-portal edition page and the web version of an edition | Not yet: they arrive in later units of the program |

`renderableOutputs` in the catalog lists what the render engine can produce today (`deck_pdf`, `report_pdf`). An
edition can be created, generated and reviewed, but **it cannot be issued** until every requested
output has been rendered and validated. Rendering is asynchronous and runs in a worker: request it,
then poll the run. If the request answers `service_unavailable` with code `render_disabled`, rendering
is switched off in this runtime — report it and stop. Never tell a human that a report "is ready to send".

## Rendering: timing and semantics

- **It is a queue, not a call.** The engine starts one render roughly every two minutes and produces one
  output per turn. A single output (deck or A4 report) is typically ready three to four minutes after the
  request (longer on a cold start); a batch of N outputs takes about 2·N minutes, so asking for both the deck
  and the A4 report of one edition takes about two turns. Drawing the document itself takes seconds — the
  wait is the queue. Other document types may be served first. Poll `get_insight_render_run` every 30–60
  seconds; do not poll in a tight loop and do not promise the human a delivery in seconds.
- **States.** Outputs go `queued` → `running` → `completed` | `failed` | `dead_letter` | `cancelled`. A run
  summarises them (`partial_failed` = one succeeded, another failed). A `completed` output carries
  `outputAssetId`; that id is not a download link and the document is not shared or sent.
- **Retry** (`retry_insight_render`) re-queues only failed outputs; completed ones are never touched. A
  failure caused by the content (for example text that does not fit a slide) fails again with the same
  cause and, after its attempts are exhausted, becomes `dead_letter`. Report the cause; the fix is a
  corrected edition, not more retries.
- **Cancel** (`cancel_insight_render`) stops what has not started; what is already rendering finishes and
  the answer says so (`stillRunning`). A cancelled run is **terminal**: retrying it answers successfully
  but re-queues nothing. To get the document after cancelling, request a new render.
- **Asking twice does not draw twice.** If the outputs you ask for already have a live render in one run
  (`queued`, `running`, `completed` or `failed`), `request_insight_render` answers with that same run and
  `idempotent: true`; nothing new is queued. A failed output is recovered with `retry_insight_render`; a new
  render is possible only after `dead_letter` or a cancel. If only some of the requested outputs are live in
  another run, the request is rejected with `render_rejected` naming them: follow that run, or ask for the
  missing output alone.
- **Only an edition in review renders.** The edition must be in `ready_for_review`; any other state (for
  example an issued one) answers `not_ready`.
- **Name the outputs.** `outputs` must be outputs the edition declared. If you omit it, every declared output
  is requested — and if the edition also declared `web`, the whole request is rejected with `render_rejected`.
  Pass the renderable ones explicitly.
- **Audience.** Asking to render or read the render of an edition you cannot see answers `not_found`, and
  nothing is created. Do not infer that the edition exists.
- Every request, retry and cancel is recorded under the identity that made it.

## Distribution: share links, email deliveries and schedules

If a tool below is not listed by your client, it is not available in that environment yet — say so and stop.

### Share links (read-only link to one issued edition)

- A share link opens exactly one **issued, client-audience** edition in the public viewer, read only. It never opens
  the library, never creates editions, never sends email and never acts as the client. Draft, in-review, withdrawn and
  internal editions are rejected with `not_ready`.
- `create_insight_share { organizationId, editionId, expiresInDays?, downloadOutputs?, label? }`: `expiresInDays`
  1–90 (default 30; every link expires); `downloadOutputs` is a subset of the edition outputs among `deck_pdf` and
  `report_pdf` (empty means view only); `label` 1–120 chars to recognise it later. At most 20 active links per edition
  (`quota_exceeded` beyond that).
- **The link is shown once.** The answer carries the link and the token a single time; they are never stored in
  readable form and cannot be recovered. Hand the link only to the human who asked. Never paste it into logs, tickets,
  summaries, shared channels or tool arguments of other systems. If it is lost, revoke it and create a new one.
- `list_insight_shares { organizationId, editionId }` shows each link's `status` (`active`, `revoked`, `expired`),
  expiry, allowed downloads, label and `source` (`manual` or created by an email delivery). It never returns a token.
- `revoke_insight_share { organizationId, shareGrantId }`: the next view or download through that link fails; a revoked
  link is never reactivated; revoking twice answers `idempotent: true`. Files already downloaded cannot be revoked —
  say so when you report. Withdrawing an edition revokes all of its links automatically.
- A visit to a link is never evidence that a person read the report. Do not claim it.
- `service_unavailable` (or `policy_blocked` through the gateway) with code `sharing_disabled` means sharing is off in
  this runtime: report it and stop. Any `*_disabled` code means the same for its lane. Lists can still answer while a
  lane is off; that does not mean the lane is on.
- Creating and revoking links need a write scope that most MCP clients do not carry: `insufficient_scope` there is
  expected, reads are unaffected. Do not retry with another token; ask a human for a governed grant.
- **Revoking is irreversible.** Confirm with the human which link (by label) before calling `revoke_insight_share`.

### Email deliveries (read only)

- Sending an edition by email, cancelling, retrying and reconciling a delivery are **human actions in the Greenhouse
  portal**, not MCP. If a human asks you to send, explain that and offer to prepare the list of recipients and the
  subject for them to confirm there.
- `list_insight_deliveries { organizationId, editionId }` and `get_insight_delivery { organizationId, deliveryIntentId }`
  show the modality (`share_link`: each person receives a personal link; `attachment`: the PDF travels in the email),
  the delivery state (`pending`, `dispatching`, `completed`, `partially_failed`, `failed`, `cancelled`) and, per
  recipient, a masked address, `state`, `skipReason` and `transportStatus`.
- **Accepted ≠ delivered ≠ read.** `accepted` means the email provider took the message; `delivered` is a separate
  provider signal; nothing in these tools means a person read it. Report exactly the status you see.
- **`ambiguous` means unresolved**: the outcome of the send is unknown and nothing will be resent until a person
  reconciles it against the email records. Report it as unresolved — never as sent, never as failed.
- A `skipped` recipient carries its reason (`duplicate_delivery`, `recipient_inactive`, `recipient_undeliverable`,
  `email_type_paused`, `asset_unavailable`, `edition_unavailable`); report it verbatim. `partially_failed` means some
  recipients were accepted and others failed: report both groups.

### Schedules (read only)

- Creating, activating, pausing and retiring a recurring schedule are **human actions in the Greenhouse portal**, not MCP.
- `list_insight_schedules { organizationId }` and `get_insight_schedule { organizationId, scheduleId }` show cadence
  (`weekly`, `monthly`), IANA time zone, consolidation days, state (`draft`, `active`, `paused`, `retired`) with the
  pause reason, the request template and the latest occurrences with the edition each one produced.
- **Occurrences stop at review.** Each occurrence creates the edition for a closed period and requests its rendering,
  then waits in review: the review policy is always `draft_for_review`. Nothing is issued or emailed automatically —
  never tell a human that a scheduled report "went out".
- Occurrence states: `pending`, `generating`, `generated`, `render_requested`, `failed`, `skipped`. A schedule paused
  with `authority_revoked` or `module_unavailable` stopped itself; `repeated_failures` means three failures in a row.
  Report it; reactivating is a human decision.

### Distribution recipes

Share an issued edition with a client contact for two weeks, deck downloadable:

1. `get_insight_edition { organizationId, editionId }` → confirm it is issued and client-audience.
2. Confirm with the human: expiry 14 days, `downloadOutputs: ["deck_pdf"]`, a label naming the recipient.
3. `create_insight_share { organizationId, editionId, expiresInDays: 14, downloadOutputs: ["deck_pdf"], label }` →
   hand the link to the human once, in the reply only; do not repeat it later.
4. To cut access: `list_insight_shares` → find it by label → `revoke_insight_share`; say that already-downloaded files
   stay with whoever downloaded them.

Check whether an email delivery reached its recipients:

1. `list_insight_deliveries { organizationId, editionId }` → pick the delivery.
2. `get_insight_delivery { organizationId, deliveryIntentId }` → per recipient report `state` and `transportStatus`.
3. Say "accepted by the email provider" or "delivered", never "read"; list `ambiguous` recipients as unresolved and
   hand them to a person in the portal.

Explain what a schedule will do next:

1. `list_insight_schedules { organizationId }` → `get_insight_schedule { organizationId, scheduleId }`.
2. Report cadence, time zone and the latest occurrences; state that each one lands in review and needs a person to
   issue and send it.

## Report cover

- The cover of an edition is resolved once, when the edition is generated, and sealed with it: the request's
  `brand.coverTheme` (if not `auto`) wins, then the organization's preference (if not `auto`), then `auto`. `auto` means
  a navy cover only when the organization has a logo prepared for dark backgrounds, otherwise white. A navy cover
  never shows the regular logo: without the dark-ready logo it goes without the client's logo.
- `get_insight_cover_preference { organizationId }` returns `coverTheme` and `isDefault` (`true` = never set, reads as
  `auto`). `set_insight_cover_preference { organizationId, coverTheme }` writes; the same value again answers
  `changed: false`. It affects editions generated afterwards; editions already generated keep their sealed cover and
  nothing is re-rendered.
- Before setting `dark` for an organization, tell the human that without a dark-ready logo the cover goes without the
  client's logo, and confirm.
- New editions carry the sealed cover in their frozen plan (`plan.cover`, with `cover.source` = `request`,
  `organization` or `auto`). Editions generated before the current editorial contract have no `cover` in their plan;
  they are immutable and keep the design they were sealed with. If one of these tools is not in your tool list, it is
  not published in this gateway yet: say so, do not look for another path.

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
- `outputs`: one or more of `deck_pdf`, `report_pdf`, `web`. Declares intent. `deck_pdf` and `report_pdf` can be rendered; `web` cannot yet, and requesting its rendering is rejected, never queued for later.
- `locale` (`es-CL` default, `en-US`), `depth` (`executive`, `standard`, `detailed`).
- `brand.coverTheme` (optional): `auto`, `dark` (navy) or `light` (white) for THIS request only. Leave it out unless
  the human asked for a specific cover: then the organization's preference applies. Adding it changes the request, so
  a replay with the same `idempotencyKey` must repeat it exactly.
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

A module marked `available` in the catalog means the organization may request it, not that the window has
data. A demonstration or test organization, for example, can have delivery (ICO) enabled and no monthly
delivery snapshots at all: without `allowPartial`, an edition there fails at `validating` with
`evidence_rejected`. That is the correct outcome, not an outage. Report it, do not create more editions to
"retry", and ask the human for an organization and window that actually have evidence.

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
- ICO targets and bands (for example the official on-time delivery target) travel as **reference** facts
  (`role: 'reference'`), not as results: use them to say where a result stands against its target, never report them as
  the period's performance. Each value fact carries `dimension.direction` (`higher_is_better` or `lower_is_better`; the
  average search position is `lower_is_better`): read "better" or "worse" from it, never from the sign of the change.
- Channels (Google, Google AI Overviews, ChatGPT, Gemini, Claude, Perplexity) carry a stable `channelId`; group by it,
  not by display names.

## What a frozen plan carries

Every new edition is sealed with the current editorial contract. Its frozen plan carries, besides the figures:

- **A reading per figure** (`readings[]`): the headline figure with a short caption, the conclusion in one sentence,
  an optional "what it means" and a next step only when the evidence supports one (a result that already met its
  target has none — do not add one).
- **A chapter opening** per module; the first reading of each chapter is its main finding.
- **Essentials** (`essentials`): at most five, and only findings.
- **Scope lines** (`scopeLines`) stating what the edition covers, and the sealed **cover** (`cover`).
- **A backing table** per module ("<module>: all figures") and **actions** with impact, effort and weeks.

When you summarise a plan for a human, follow the same editorial rules the plan follows:

- A superlative ("the highest", "the channel with most presence") requires a **unique** maximum among the printed
  values. With a tie, say it is a tie and give the tied value; never pick one of the tied items as "the top".
- Essentials and the thesis cite only findings: a target met or missed, a printed change, a unique maximum or a tie.
  Never a bare value without comparison, and never a 0.0 % change as a finding.
- Quote readings, limits and methodology as written; they are validated against the facts. Do not rewrite a number.

A plan without `scopeLines` and `cover` was sealed with the previous editorial contract. That is not an error and it
does not change: plans are immutable. Describe it as it is.

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
| `request_insight_render` answers `render_rejected` | You asked for an output that cannot be rendered yet (`web`, also when you omitted `outputs` and the edition declared it) or that the edition did not declare, part of the outputs is already live in another run (the details name them), or the frozen plan exceeds a slot budget of the catalog | Request only outputs listed in `renderableOutputs`; follow the named run or ask for the missing output alone; nothing is truncated silently — report the cause |
| `request_insight_render` answers `idempotent: true` | The requested outputs already have a live render; you got that earlier run | Follow that run; do not request again — use `retry_insight_render` if one output failed |
| `request_insight_render` answers `not_ready` | The edition is not in `ready_for_review` (for example it is already issued) | Do not retry; report the edition's state |
| A new edition fails at `validating` with `evidence_rejected` | A requested module had no usable evidence for that organization and window (common in demonstration organizations) | Report it; do not re-create; choose an organization and window with evidence, or use `allowPartial` only if the human accepts visible omissions |
| A render run is `partial_failed` | One output succeeded and another failed | Report both states; `retry_insight_render` re-queues only the failed ones |
| An output is `dead_letter` | Attempts exhausted or a non-retryable failure (for example the catalog changed since queuing) | Do not retry from MCP; a human decides |
| An output stays `queued` for several minutes | Normal queue wait: one output per turn of about two minutes | Estimate about 2·N minutes by position; report it as queued, not as failed |
| `retry_insight_render` on a cancelled run answers successfully but nothing changes | Cancelled is terminal | Request a new render with `request_insight_render` |
| `not_found` when rendering an edition | The edition is not visible to your binding (for example an internal edition read by a client binding) | Do not retry; report it as not available |
| `policy_blocked` / `service_unavailable` with `sharing_disabled`, `delivery_disabled` or `schedules_disabled` | That distribution lane is switched off in this runtime | Report it and stop; do not retry or look for another path |
| `insufficient_scope` on `create_insight_share` or `revoke_insight_share` | Your client does not carry the write scope; list tools still work | Do not retry with another token; ask a human for a governed grant |
| `rate_limited` / `quota_exceeded` when creating a link | The edition already has 20 active links | Review `list_insight_shares`; a human decides which link to revoke before creating another |
| `not_ready` when creating a link | The edition is not issued or is not client-audience | Share only issued client editions; issuing is a human decision |
| A delivery recipient in `ambiguous` | The send outcome is unknown and nothing is resent until a person reconciles it | Report it as unresolved, never as sent or failed |

## Recipes

Monthly SEO + ICO edition for a client, previous month comparison:

1. `get_insights_catalog { organizationId }` → confirm `seo` and `ico` available.
2. Propose to the human: modules `["seo","ico"]`, period `2026-08-01`→`2026-09-01`
   `America/Santiago`, comparison `previous_period`, audience `client`, outputs `["report_pdf"]`,
   idempotencyKey `insights-<org>-2026-08-seo-ico`.
3. `create_insight_edition { organizationId, request }` → read `generation.outcome`.
4. `get_insight_edition { editionId, includeEvidence: true }` → summarize facts with units and as-of,
   list rejections as limits, and state that issuing is pending human review.

Rendering the deck and the A4 report of an edition in review:

1. `request_insight_render { organizationId, editionId, outputs: ["deck_pdf", "report_pdf"] }` (only outputs the
   edition declared) → note `renderRunId`. If the answer says `idempotent: true`, follow that existing run instead.
2. Tell the human both documents are queued and will take a few minutes (about two minutes per output).
3. `get_insight_render_run { organizationId, renderRunId }` every 30–60 s until the output is `completed` (report
   `outputAssetId`) or `failed`/`dead_letter` (report `failureCode`).
4. If `failed` with a transient cause, `retry_insight_render { organizationId, renderRunId }` once; if the same cause
   repeats, stop and hand off.

Recovering after a failure: report `failedPhase` + `failureCode` and hand off to a human with
`insights.edition.review` capability; do not re-create.
