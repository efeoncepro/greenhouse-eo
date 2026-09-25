# Efeonce Insights — contracts (verified against code 2026-09-16)

## `InsightRequestV1` (`contracts/request.ts`, validated by `commands/validate-request.ts`)

| Field | Rule |
| --- | --- |
| `requestVersion` | must be `insight_request_v1` |
| `organizationId` | must equal the authorized organization (lane/binding); else input error |
| `modules` | non-empty subset of `seo|aeo|ico`; unavailable modules yield rejections, not silent zeros |
| `period` | `{start, endExclusive, timeZone}`; `YYYY-MM-DD`; `[start,end)`; `endExclusive > start`; ≤ 400 days; start not in the future (end in the future ⇒ partial); `timeZone` IANA, default `America/Santiago` |
| `comparison` | `{kind}` in `none|previous_period|previous_year|custom`; default `previous_period`; `custom` has `start`/`endExclusive` and must not overlap |
| `audience` | `client` (default) or `internal`; a client actor cannot request `internal` |
| `locale`, `depth` | `es-CL` (default) / `en-US`; `executive|standard|detailed` (default `standard`) |
| `outputs` | non-empty subset of `deck_pdf|report_pdf|web`; `deck_pdf` and `report_pdf` render (production since 2026-09-24), `web` is intent only (render ⇒ `render_rejected`) |
| `brand` | `efeoncePackVersion` (default `axis-current`), `clientBrandRef` optional 1–200 (validated, resolved by nobody today); `coverTheme` does NOT exist yet (planned, TASK-1888) |
| `policy.allowPartial` | explicit opt-in to visible omissions; without it a module with no evidence fails the edition at `validating` |
| `idempotencyKey` | optional, 8–200 chars |
| `title`, `purpose` | optional 3–200 / 3–500; name the report on first creation, ignored on revise |

## Responses

- Create: `202` new edition `{report, edition, idempotent:false, generation:{outcome, failedPhase, failureCode}}`;
  `200` + `idempotent:true` + `generation:null` on a domain-level replay. A lane-level replay (same
  `Idempotency-Key` header on the ecosystem lane) returns the cached original response (202, `idempotent:false`).
- Detail `?include=evidence`: `{edition, evidence, plan, history}`; for a client-audience read all three are `null`
  until the edition is issued (by design).
- List: newest first, cursor pagination, `pageSize` capped at 200, ordered `created_at DESC, edition_id COLLATE "C"`.

## Errors (`insights-errors.ts`; identical on both lanes)

| Domain code | HTTP | Meaning |
| --- | --- | --- |
| `not_found` | 404 | org without module, foreign org, unknown edition (anti-oracle) |
| `idempotency_conflict` | 409 | same key, different request |
| `not_ready` | 409 | issue attempted without validated outputs (port not connected) |
| `generation_disabled` / `issuance_disabled` | 503 `service_unavailable` | flag OFF in this runtime |
| `forbidden` / `scope_not_allowed` | 403 | capability missing (e.g. client calling `recover`, which needs `review`); MCP write without scope ⇒ `insufficient_scope` at the gateway |
| `invalid_window` / input errors | 400 | see request rules |

## States

`draft → collecting → composing → validating → ready_for_review → issued`; `failed` (with `failedPhase`, recoverable
from that phase) and `withdrawn` (terminal). Client projection: `in_progress | in_review | issued | needs_attention | withdrawn`.

## MCP tool inputs (internal server and gateway)

`get_insights_catalog {organizationId?}`, `list_insight_editions {organizationId?, state?, audience?, reportId?, pageSize?, cursor?}`,
`get_insight_edition {organizationId?, editionId, includeEvidence?}`, `create_insight_edition {organizationId?, request}`.
Internal bindings must pass `organizationId`; org-scoped bindings read their own org only and never create.

## Rendering (TASK-1846) — verified against code 2026-09-16

- `POST …/insights/editions/{editionId}/render` body `{ organizationId?, outputs?: InsightOutput[] }` → `202 { run, outputs, idempotent:false }`
  or `200 { …, idempotent:true }` when a live run already covers the targets. Precondition: edition `ready_for_review`
  with sealed snapshot + frozen plan; `outputs` ⊆ edition outputs and ⊆ `INSIGHT_RENDERABLE_OUTPUTS` (`deck_pdf`, `report_pdf` since
  TASK-1847: staging 2026-09-22; production since release `ebb9212a32ce`, 2026-09-24; first productive render verified 2026-09-25). Catalog per output: `deck_pdf` → `insights-deck`, `report_pdf` → `insights-report`.
- Idempotency per (org, edition, output, audience), verified in `render/commands.ts` 2026-09-25: an output counts as
  "alive" unless it is `dead_letter` or `cancelled` (so `queued`, `running`, `completed` AND `failed` are alive). If one
  run's alive outputs cover every requested target ⇒ `200 idempotent:true` with THAT run (a `failed` one is recovered
  with `retry`, not with a new request). If only part of the targets is alive in another run ⇒ `422 render_rejected`
  with `details.alive` (never mixes runs). Precondition failure (edition not `ready_for_review`, e.g. already issued) ⇒
  `not_ready`. `outputs` omitted ⇒ every output the edition declared, so an edition that declared `web` is rejected
  whole (`details.unsupported`) unless the caller passes the renderable ones; an undeclared output ⇒ `details.outside`.
- `GET …/insights/editions/{editionId}/render` (paginated runs) · `GET …/insights/render-runs/{renderRunId}` → run DTO
  `{ renderRunId, editionId, audience, requestedOutputs, state, startedAt, finishedAt, cancelledAt, createdAt, outputs[] }`,
  output DTO `{ insightOutputId, output, state, attempts, failureCode, outputAssetId, manifestHash, finishedAt }`.
- `POST …/render-runs/{id}/retry` → re-queues only `failed` outputs (`idempotent:true` when none). `dead_letter` is terminal.
- `POST …/render-runs/{id}/cancel` → `{ run, outputs, cancelled, stillRunning, idempotent }`; running outputs are not lied about.
  `cancelled` is TERMINAL: `retry` on a cancelled run answers `200` without re-queuing (verified in staging 2026-09-16);
  to get the deck, request a new render.
- A failed output relaunched by `retry` keeps its sealed manifest: a content failure (e.g. `sectionItems` slot
  validation) fails again honestly as `render_error`, attempts climb to max 3, then `dead_letter`. Completed outputs are untouched.
- Audience: a client actor on an `internal` edition gets `404` on request and on GET, and no output is created.
- Actor audit: runs and `insight_render_events` record the human actor (`member` or `client_user`) on request, enqueue
  event, retry and cancel; `system` only for the worker/dispatcher.
- Timing contract (observed, not an SLA): 1 output per 2-min dispatcher tick; poll every 30–60 s.
- Run states: `pending|running|completed|partial_failed|failed|cancelled`. Output states: `queued|running|completed|failed|dead_letter|cancelled`.
- Failure codes: `audience_violation, semantic_rejected, size_rejected, geometry_rejected, font_fallback_detected, missing_asset, blank_slide, manifest_drift, render_error, timeout, dispatch_error, cancelled`; non-retryable: `audience_violation, semantic_rejected, manifest_drift, cancelled`.
- Errors: `render_disabled` → 503 `service_unavailable`; `render_rejected` → 422 `bad_request` (details carry the cause; nothing is truncated).
- Events: `insights.render.requested`, `insights.render.output_completed`, `insights.render.output_failed` (aggregate `insight_render_run`).
- Port: `assertOutputsValidated(edition)` requires every `edition.outputs` `completed` with asset, same audience → `{ outputs: [{ output, assetId, manifestHash }] }`.

## Evidence rejections — `scope` (TASK-1847, 2026-09-22)

- `EvidenceRejectionV1.scope?: 'current' | 'comparison'` (optional, additive). Absent = the current window (every snapshot
  sealed before 2026-09-22). Adapters mark what they collected for the comparison window with `asComparisonRejections`;
  the planner writes it as «<métrica>: en el período anterior, <causa>». Never read a comparison rejection as a gap of the
  current window.
- Plan text (limits, methodology, chart titles, units) never carries `metricId`, `method.name`, reader names or the
  adapter `detail`: it comes from `GH_INSIGHTS` (`metrics`, `sources`, `units`).

## Sharing, delivery, schedules (TASK-1848) — verified against code 2026-09-18

In production since release `bda1cf2cd938` (2026-09-18) with the lane flags OFF there (ON in staging). Shapes below are
the ones in `sharing/`, `delivery/`, `schedules/` and the lanes.

### Share links

- `POST …/insights/editions/{editionId}/shares` body `{ expiresInDays?: 1–90 (default 30), downloadOutputs?: subset of
  the edition outputs among deck_pdf|report_pdf (empty = view only), label?: 1–120 }` →
  `{ share: InsightShareGrantDto, token, url }`. The token is returned ONCE; `url` =
  `${INSIGHTS_SHARE_PUBLIC_BASE_URL ?? 'https://think.efeoncepro.com'}/insights/r/<token>`.
- Preconditions: flag ON, need `share_create`, edition `issued` + audience `client` (internal edition ⇒ `not_ready` for an
  internal actor, `not_found` for a client), max 20 active grants per edition ⇒ `quota_exceeded` 429.
- `GET …/editions/{editionId}/shares` → `InsightShareGrantDto[]` `{ shareGrantId, editionId, status: active|revoked|expired,
  downloadOutputs, label, source: manual|delivery, expiresAt, createdAt, createdByActorKind, revokedAt, revokeReason }`.
  Never token nor digest.
- `POST …/insights/shares/{shareGrantId}/revoke` → `{ share, idempotent }`; works with the flag OFF; never reactivates.
  Revoke reasons: `manual|edition_withdrawn|delivery_superseded|delivery_failed|authority_revoked`.
- Token format `isg_` + 32 bytes base64url (256 bits). Only `sha256` digest stored.

### Public reader (Think consumes it)

- `GET /api/public/insights/shared/{token}` → `InsightSharedEditionResponseV1 { modelVersion: '1.0', header {organizationName,
  reportCode, reportTitle, editionVersion, periodLabel, periodStart, periodEndExclusive, timeZone, issuedAt, asOfMax},
  model: InsightWebModelV1, downloads [{ output, status: available|unavailable, href? }], expiresAt }`.
- `InsightWebModelV1`: executiveSummary, chapters (claims, charts = `ChartSpecV1` + table resolved to formatted figures,
  tables, limits), actions (no ownerRef), limits, methodology, references (no evidenceRef), facts (`display` formatted
  per locale, value, unit, observation, source, asOf, `absentReason: 'no_data'` when value is null). Never
  authoringMode, modelId, prompts, history or actor ids.
- `GET /api/public/insights/shared/{token}/outputs/{output}` → bytes via private-asset proxy; grant revalidated just
  before reading. Already-downloaded files cannot be revoked.
- Status codes: `404` unknown, malformed, expired, flag OFF, org suspended or module retired (indistinguishable);
  `410` revoked or edition withdrawn; `429` rate limit (per IP 300 view / 60 download per minute; per grant 60 / 20;
  FAILS CLOSED if the DB does not answer); `503` sanitized.
- Headers on every answer: `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, `Referrer-Policy: no-referrer`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex, nofollow, noarchive`,
  CSP `default-src 'none'; frame-ancestors 'none'`. Deliberately NOT the Grader's `public, max-age=300`.
- Access events outcomes: `served|not_found|revoked|expired|withdrawn|unavailable|rate_limited`; `client_hint`
  `unknown|robot|prefetch`. A hit is never reading evidence.

### Email delivery (App lane only, human internal actor)

- `POST …/editions/{editionId}/deliveries` body `{ modality: share_link|attachment (portal_link ⇒ not_ready in V1),
  recipientUserIds: 1–50 active user ids of the org or active internal users (never free emails), outputs,
  subject: 3–200, message?: ≤2000, idempotencyKey: 8–200, shareTtlDays? (share_link only; default 30),
  acknowledgeIrrevocableAttachment: true (required for attachment, with outputs) }` → `{ delivery: InsightDeliveryIntentDto,
  idempotent }`. Idempotency `(org, key)` + hash of the authorized payload. Needs `delivery_send`; edition `issued` + client.
- `GET …/editions/{editionId}/deliveries`, `GET …/deliveries/{deliveryIntentId}` (both lanes) → DTO
  `{ deliveryIntentId, editionId, modality, outputs, subject, state, shareTtlDays, authorizedByActorKind, cancelledAt,
  cancelReason, createdAt, recipients[{ deliveryRecipientId, recipientUserId, recipientKind, recipientEmailMasked,
  state, skipReason, transportStatus, attempts, shareGrantId, lastErrorCode, finishedAt }] }`.
- `POST …/deliveries/{id}/cancel`, `POST …/deliveries/{id}/retry` (only `failed` → `pending`, max 5 attempts),
  `POST …/delivery-recipients/{id}/reconcile` body `{ operatorDecision?: accepted|failed, reason?: ≥10 chars }`.
- Intent states `pending|dispatching|completed|partially_failed|failed|cancelled` (honest rollup: any
  pending/claimed/ambiguous ⇒ `dispatching`). Recipient states `pending|claimed|accepted|failed|ambiguous|skipped|cancelled`.
  Skip reasons `duplicate_delivery|recipient_inactive|recipient_undeliverable|email_type_paused|asset_unavailable|edition_unavailable`.
- Transport status (from `email_deliveries`): `not_sent|pending|accepted|delivered|delivery_delayed|bounced|complained|failed|suppressed|skipped`.
  Never "read".
- Reconcile outcomes `accepted|failed|unresolved|not_ambiguous`: ledger row sent/delivered/resend_id ⇒ accepted; no row or
  failed without dispatch_unknown ⇒ failed (grant revoked, retryable); pending/dispatch_unknown ⇒ unresolved unless
  `operatorDecision` + `reason`.
- Email correlation per attempt: `source_event_id` = `idlr-<uuid>` (attempt 1) / `idlr-<uuid>:aN` (N=2..5).
- `share_link` sends through the token-sensitive EmailType: the ShareGrant (`source=delivery`) is issued in the SAME
  transaction that claims the `email_deliveries` row (`claimTokenSensitiveEmailIntent`); the bearer lives only in memory
  for that send. A definitive failure revokes that grant; a retry issues a new one. The attachment EmailType is a separate,
  non-sensitive type and never carries a ShareGrant in the same email.
- `accepted` (provider took it) ≠ `delivered` ≠ read; `ambiguous` = outcome unknown, stays unresolved until reconciled.

### Schedules (App lane only for writes)

- `POST …/app/insights/schedules` body `{ label: 3–120, cadence: weekly|monthly, timeZone? (default America/Santiago),
  consolidationDays?: 0–15 (default 3), catchUpLimit?: 1–3 (default 1), reviewPolicy?: 'draft_for_review' only,
  requestTemplate: InsightRequestV1 without period / idempotencyKey / organizationId }`; template validated with
  `validateInsightRequest` against the last closed period. `POST …/schedules/{id}/activate|pause|retire`
  (activator = durable authority; max 10 active per org; pause/retire work with the flag OFF; retired never reactivates).
- `GET …/schedules`, `GET …/schedules/{id}` (both lanes) → `InsightScheduleDto` (record without `authorizedByUserId`) +
  `recentOccurrences[{ occurrenceId, periodStart, periodEndExclusive, state, editionId, failureCode }]`.
- States `draft|active|paused|retired`; pause reasons `manual|authority_revoked|module_unavailable|repeated_failures`;
  occurrence states `pending|generating|generated|render_requested|failed|skipped`. Occurrence idempotency key
  `sched-<scheduleId>-v<version>-<periodStart>`; stops at `ready_for_review` (never issues, never sends).

### New error codes (shared lane table)

`sharing_disabled`, `delivery_disabled`, `schedules_disabled` → 503 `service_unavailable`; `quota_exceeded` → 429
(existing row, now backed by `InsightsQuotaExceededError`).

### MCP tool inputs (TASK-1848)

`create_insight_share {organizationId?, editionId, expiresInDays? 1–90, downloadOutputs? (deck_pdf|report_pdf)[], label? 1–120}` (write),
`list_insight_shares {organizationId?, editionId}`, `revoke_insight_share {organizationId?, shareGrantId}` (write),
`list_insight_deliveries {organizationId?, editionId}`, `get_insight_delivery {organizationId?, deliveryIntentId}`,
`list_insight_schedules {organizationId?}`, `get_insight_schedule {organizationId?, scheduleId}`. No MCP tool sends,
cancels, retries or reconciles email, nor creates/activates/pauses/retires schedules.

Gateway mapping (`efeonce-mcp` 1.7.0, contract `task-1848-v1`): 503 `sharing_disabled|delivery_disabled|schedules_disabled`
⇒ `policy_blocked`; 429 `quota_exceeded` ⇒ `rate_limited`; 404 anti-oracle preserved; `create_insight_share` /
`revoke_insight_share` need `efeonce.mcp.insights.write` (no client carries it ⇒ 403 challenge), the 5 reads the base scope.

## Planned in TASK-1888 (NOT built — not available in any runtime)

Summary of the editorial contract v2 as the task defines it on 2026-09-25. **Nothing below exists in code**: requests,
plans and specs today are `insight_request_v1` / `editorial_plan_v1` / `chart_spec_v1`, and `CHART_FAMILIES` has 7
families. Never send these fields to a lane or describe them to a human as available; re-verify against code once the
task closes and move what shipped into the sections above.

- **Additive by rule:** a sealed v1 plan/spec keeps composing with the same result; no new field becomes mandatory for
  sealed plans. Whether the plan stays `editorial_plan_v1` with optional fields or becomes `_v2` is an open question.
- **Chart families (15):** today's `bar`, `bar_grouped`, `bar_stacked`, `line`, `pie`, `donut`, `scatter` plus
  `bullet`, `waterfall`, `funnel`, `gauge`, `heatmap`, `waffle`, `venn_two`, `upset`, each with its own data shape and the
  invariants of `chart-geometry.ts` (bars from zero; pie/donut ≤ 3 non-overlapping parts; Venn of two sets only, real
  areas; UpSet sorted descending; funnel stages are subsets of the previous; 270° gauge with previous value and target
  as references; bullet with the target as a mark; heatmap with the value printed; scatter with complete pairs). A
  family is emitted only when the family × evidence matrix (architecture §6) marks it `productor ahora`.
- **Plan fields (optional):** per-figure reading `meaning` and `nextStep`, each with `factIds`; hero figure with its
  subline; chapter entry; essential facts of the summary (max 5); «Qué mide este informe» lines per module from
  `src/lib/copy/insights.ts` (not written by the LLM). All go through `plan-validation.ts` with the same figure rule.
- **`channelId`:** stable id on every series or dimension that represents a channel — `google`, `google_ai_overview`,
  `chatgpt`, `gemini`, `claude`, `perplexity`; AEO provider mapping `openai→chatgpt`, `anthropic→claude`; an unknown
  provider has no `channelId` and does not break generation.
- **Cover preference per organization:** `auto|dark|light` (default `auto`; no row ⇒ `auto`) in a new
  `greenhouse_insights` table; command `setInsightCoverPreference` (upsert by org derived from the authenticated
  authority, no-op when unchanged, outbox event with actor and previous value) + reader; new capability with a grant;
  app and ecosystem lanes; MCP tool federated in `efeonce-mcp`.
- **Request override:** `InsightBrandV1.coverTheme?: 'auto'|'dark'|'light'`; a request without it keeps **exactly the
  same `request_hash`** as before the task.
- **Sealed resolution:** `coverTheme(edition)` = request override if present and ≠ `auto` → else the organization's
  preference if ≠ `auto` → else `dark` (navy) only if the organization has a logo fit for a dark background (variant via
  the account-360 command) → else `light` (white). The result and the logo asset are sealed in the edition; a re-render of
  the same edition draws the same cover. The white cover's variant (with or without channel satellites) is chosen by the
  catalog from `modules` and `channelId` (TASK-1889), with no extra field.
- **ICO:** the adapter additionally reads `ftr_pct` from the ICO snapshot (owner-computed; Insights computes nothing).
- **Flag:** `INSIGHTS_EDITORIAL_V2_ENABLED`, default OFF; with OFF the planner emits v1 and the resolver does not apply
  (the preference can still be saved). Turned on in production only together with the TASK-1889 release.
