# Efeonce Insights — contracts (verified against code 2026-09-28)

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
| `brand` | `efeoncePackVersion` (default `axis-current`), `clientBrandRef` optional 1–200 (validated, resolved by nobody today); `coverTheme` optional `auto|dark|light` (TASK-1888): only enters the request when sent, so a request without it keeps the exact pre-1888 `request_hash` (pinned by a test against the old validator) |
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

- `GET /api/public/insights/shared/{token}` → `InsightSharedEditionResponseV1 { modelVersion: '1.1', header {organizationName,
  reportCode, reportTitle, editionVersion, periodLabel, periodStart, periodEndExclusive, timeZone, issuedAt, asOfMax,
  clientLogo?},
  model: InsightWebModelV1, downloads [{ output, status: available|unavailable, href? }], expiresAt }`.
- `InsightWebModelV1`: executiveSummary, chapters (claims, charts = `ChartSpecV1` + table resolved to formatted figures,
  tables, limits), actions (no ownerRef), limits, methodology, references (no evidenceRef), facts (`display` formatted
  per locale, value, unit, observation, source, asOf, `absentReason: 'no_data'` when value is null). Never
  authoringMode, modelId, prompts, history or actor ids.
- **`InsightWebModelV1` 1.1 (TASK-1875, 2026-09-28; code complete locally, not deployed) — additive over 1.0.**
  `INSIGHT_WEB_MODEL_VERSION = '1.1'`; Greenhouse always emits `'1.1'`, a 1.0 consumer ignores the new fields and Think
  accepts any `/^1\.\d+$/`. All new fields are optional and come only from a sealed editorial v2 plan (TASK-1888):
  - `chart.derived?.funnelStepRates?: Array<{ stageId, display: string | null }>` — computed by `deriveChart` with the
    SAME `funnelGeometry` (`@/lib/artifact-composer/pure`) the PDFs use, formatted with `formatFactValue(rate, 'percent',
    locale)`; first stage `display: null`; a growing funnel (geometry error) gets no `derived` at all. The web never
    re-derives it.
  - `chapter.opening?` (claim) and `chapter.readings?: InsightWebReadingV1[]` (≤ 1 per `chartId`):
    `{ chartId, keyFigure?: { factId, value, caption }, conclusion?, meaning?, nextStep: claim | null }` (`projectReading`).
  - Model level: `essentials?` (claims), `decision?`, `measurement?`, `ask?` (claims), `scopeLines?: string[]`.
  - `header.clientLogo?: { href, variant: 'on_dark' | 'default' }` — present only when the sealed `plan.cover` has
    `logoAssetId` AND `logoVariant`; `href = /api/public/insights/shared/{token}/logo` (relative to the Greenhouse API).
  - A v1 plan (no editorial v2) projects exactly as 1.0 did (conditional spreads; test in `sharing.test.ts`).
- `GET /api/public/insights/shared/{token}/logo` → sealed cover logo bytes via `downloadPrivateAsset`
  (`readSharedInsightClientLogo`), same gate as the view (grant, edition, org, module, cover fields); same
  `INSIGHT_SHARE_PUBLIC_HEADERS` (private `no-store`, `noindex`, `no-referrer`).
- `GET /api/public/insights/shared/{token}/outputs/{output}` → bytes via private-asset proxy; grant revalidated just
  before reading. Already-downloaded files cannot be revoked.
- Status codes: `404` unknown, malformed, expired, flag OFF, org suspended or module retired (indistinguishable);
  `410` revoked or edition withdrawn; `429` rate limit (per IP 300 view / 60 download per minute; per grant 60 / 20;
  FAILS CLOSED if the DB does not answer); `503` sanitized.
- **Two different 429s (TASK-1876, code complete 2026-09-28, WAF apply pending).** In front of every `/api/public/**`
  route there is a Vercel Firewall rate limit: 20 req / 10 s per IP (`src/lib/security/public-burst-guard/firewall-rules.ts`,
  synced by `pnpm security:public-burst-guard [--apply]`). `enforce` in staging/preview, `observe` (log only) in
  production. An edge 429 never invokes the function nor opens a PG connection, so it carries NO domain body
  (`{ error, code: 'rate_limited' }`), NO domain `Retry-After: 60` and NO `rate_limited` access event. The domain 429
  (per IP / per grant limits above, from `sharing/http.ts`) is still behind it, unchanged. Think's server-side consumer
  (TASK-1875) is exempted with an explicit condition in those rules, never by raising the limit for everyone: header
  `x-efeonce-think-key` (`THINK_SERVER_KEY_HEADER`) equal to the Think key ⇒ the request is not counted
  (`{type:'header', key, op:'eq', value: thinkKey, neg: true}` added by `buildPublicBurstGuardRule(spec, {thinkKey})`);
  `planPublicBurstGuardChanges` reports drift when the live rule lacks it. The key reaches the script only as
  `PUBLIC_BURST_GUARD_THINK_KEY` and Think only as `GREENHOUSE_THINK_KEY`; it is never printed or logged
  (code complete 2026-09-28, `27b458aec`; WAF apply with the key pending — operator).
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
- `insight_delivery_recipients.email_delivery_id` = the `email_deliveries` row of THAT recipient, never the batch.
  `share_link` stores the row claimed by `claimTokenSensitiveEmailIntent`; `attachment` resolves the row AFTER sending
  via `readInsightDeliveryTransportForAttempt(source_event_id)` (fix `8882af0e3`, 2026-09-28). In the sequential
  first-attempt path `sendEmail()` returns the batch id in BOTH `deliveryId` and `recipientResults[].deliveryId`, so
  neither can be stored as the row (the earlier attempt `34d763460` used `recipientResults[0]` and did not fix it).
  Rows written before the fix may point to a batch. Verified in real data: 1 `email_deliveries` row per recipient via
  `source_event_id`, 0 duplicated keys.
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

## Editorial contract v2 (TASK-1888 — complete 2026-09-26, in production, `INSIGHTS_EDITORIAL_V2_ENABLED` ON)

Verified against 2026-09-26 (code + Production canary). The flag is ON in Vercel staging, Vercel Production and the
`ops-worker`; editions generated since then seal v2 plans. **Additive**: `specVersion` stays `chart_spec_v1` and `planVersion` stays
`editorial_plan_v1`; the presence of a v2 field is the signal. A sealed v1 plan/spec validates and composes the same.
With the flag OFF the adapters return v1 evidence and the planner emits a v1 plan (only the pp correction applies).

- **Chart families (15)** — `contracts/chart-spec.ts`. Series families (`bar`, `bar_grouped`, `bar_stacked`, `line`,
  `pie`, `donut`, `scatter`) keep `series` + `dimensionLabels`. Data families (`bullet`, `waterfall`, `funnel`, `gauge`,
  `heatmap`, `waffle`, `venn_two`, `upset`) carry `data` (discriminated by `kind === family`, every number a `factId`)
  and an empty `series`. New relations: `target`, `decomposition`, `conversion`, `overlap`. Structural validation:
  `validateChartSpec(spec, knownIds)` (pie/donut ≤ 3 parts = `MAX_COMPOSITION_PARTS`, mirror of the geometry's
  `MAX_SLICES`; tabular equivalent mandatory; every factId known, references included). Value validation:
  `validateChartSpecValues(spec, values)` in `editorial/chart-values.ts`, which calls `chart-geometry.ts` (rule codes
  `geometry_<reason>`, e.g. `geometry_stage_grows`, `geometry_empty_set`). It cannot live in `contracts/`: the
  composer's `pure` entry pulls Node crypto.
- **Channels** — `contracts/channels.ts`: `INSIGHT_CHANNEL_IDS` = `google`, `google_ai_overview`, `chatgpt`, `gemini`,
  `claude`, `perplexity`; `channelForAeoProvider` (`openai→chatgpt`, `anthropic→claude`, `gemini`, `perplexity`,
  `google_ai_overview`); unknown provider ⇒ field ABSENT (not null). On `EvidenceFactV1.channelId`,
  `ChartSeriesV1.channelId`, `ChartSpecV1.dimensionChannelIds` (parallel to `dimensionLabels`, null = not a channel) and
  the channel fields of bullet/waffle/venn/upset data. Rule (2026-09-25): `dimensionChannelIds` ONLY when the dimensions
  are distinct channels (AEO presence per engine); when the whole chart measures ONE channel (SEO: clicks, impressions…
  are all Google) the channel goes on `series[].channelId` and the dimensions carry none.
- **Reference facts** — `EvidenceFactV1.role?: 'measure' | 'reference'` (absent = measure). ICO targets are
  `role: 'reference'`, metricId `target.{otd|ftr|rpa}`, value from `ICO_METRIC_REGISTRY` (optimal min, or max for
  lower-is-better), `dimension.direction`; plus `band.{otd|ftr|rpa}` = outer edge of the registry's `attention` zone
  (attention.min, or max for lower-is-better), cited by each bullet item as optional `bandFactId` (validated: exists,
  positive, on the not-yet-reached side of the target). They never produce claims, tables or references and never count
  as module evidence in `validating`. The render draws the band only from that fact — never `target × 0.85`.
- **Direction per fact** — every ICO value fact carries `dimension.direction` taken from `ICO_METRIC_REGISTRY`; SEO
  marks the average position `lower_is_better`. «Better/worse» and target sides are read from that field, never
  inferred from the metric name.
- **Plan (all optional)** — `contracts/plan.ts`: `chapter.opening` (claim), `chapter.readings[]` =
  `{ chartId, keyFigure?: { factId, value (must equal formatFactValue), caption }, conclusion?, meaning?, nextStep | null }`
  — the v2 planner ALWAYS emits `conclusion` as a deterministic FINDING (bullet: meets/misses the target of <metric>;
  bars: the largest change among ≥ 2 comparables, the direction of a single fact, or the highest value; line: the
  direction from/to), using only numbers the validator already admits (value, target, previous, delta — never
  «by how much» vs the target). `meaning` only when it adds something (other spaces/series, or the previous period
  for a bullet); `meaning === conclusion` is rejected (`invalid_field`);
  `essentials` (≤ `PLAN_ESSENTIALS_MAX` = 5); `scopeLines` (copy, no numbers allowed); `decision`, `measurement`, `ask`
  (claims; NO deterministic producer); `cover`; actions gain `impact`/`effort` 1–3 and `weeks` `N` or `N-M` (1–4).
  Every text is a `PlanClaimV1` checked by the same figure rule (`invalid_field` for shape errors). Text caps live in
  `PLAN_TEXT_LIMITS` (`contracts/plan.ts`): `conclusion` 90, `keyFigureValue` 9, `keyFigureCaption` 96, `meaning` 160,
  `nextStep` 160, `summaryThesis` 120, `summaryLead` 200, `decision` 140, `essential` 170, `tableTitle` 80 (the A4
  backing table «<module>: todas las cifras»; the deck draws no tables). `PLAN_CONCLUSION_MAX_CHARS` is a deprecated
  alias of `conclusion`.
- **Findings rules (`editorial/editorial-v2.ts`)** — a superlative («the highest», «the largest change», «first»)
  requires a UNIQUE maximum in the PRINTED values (two facts that format the same are a tie). With a tie the plan says
  the tie: the key figure is the tied value and its caption is the common name — never the first tied fact.
  Essentials and the thesis cite only findings (target met/missed, a change that prints, a unique superlative or a
  tie), never a bare value nor a 0,0 % variation. Chapter claims keep subject–verb agreement. The first reading of
  every chapter is its main finding (ordering only; figure pages keep their order). Sealed editions are immutable: an
  edition sealed before a fix keeps its text (e.g. the internal Berel staging edition with the pre-fix tie caption).
- **Cover** — `contracts/cover.ts`: `resolveInsightCover({ requested, organization, logos })` = request (≠ auto) >
  organization (≠ auto) > auto (navy only with `logoOnDarkAssetId`). `PlanCoverV1 = { theme: dark|light, source:
  request|organization|auto, logoAssetId, logoVariant: on_dark|default|null }`; dark never carries the default logo
  (validator enforces). Sealed at composing, never decided at render.
- **Cover preference API** — `getInsightCoverPreference` (need `cover_preference_read` = `insights.report.read`) →
  `{ organizationId, coverTheme, isDefault, updatedAt, updatedByActorKind }`; `setInsightCoverPreference({ coverTheme })`
  (need `cover_preference_manage` = `insights.cover_preference.manage`, Admin + Account) → `{ preference, changed }`;
  same value ⇒ `changed: false`, no write, no event; invalid value ⇒ 400 `invalid_request`. Event
  `insights.cover_preference.updated` `{ version: 1, organizationId, coverTheme, previousCoverTheme, actorKind }`.
  Lanes: `GET|POST /api/platform/{app,ecosystem}/insights/cover-preference` (ecosystem write = internal binding only).
  MCP: `get_insight_cover_preference` (base scope), `set_insight_cover_preference` (`efeonce.mcp.insights.write`,
  reused; set works only for internal bindings). Gateway `efeonce-mcp` v1.9.0 (PR #18, merged `2cf78af91`, revision
  `efeonce-mcp-gateway-00062-ct5` at 100 %, contract `task-1888-v1`).
- **Percent deltas** — a metric already in percent varies in pp (`formatDeltaPoints`, «+1,8 pp»; two decimals under
  0,05 pp). Relative deltas stay for absolute metrics. Sealed plans with the old relative text still validate.

## Render contract of the premium catalogs (TASK-1889 — complete 2026-09-26, in production)

Verified against code on 2026-09-25. Detail: architecture §14.9.

- **Catalogs v2 only** — `insights-report` (A4 794×1123) and `insights-deck` (1280×720). No legacy template may exist
  (`__tests__/insights-catalogs-v2-only.test.ts`). A v1 plan still composes on the v2 templates.
- **Family → page** (`render/figure-slots.ts`, shared by both mappers). `bar_grouped` whose dimensions are METRICS →
  comparison (each metric on its own scale); `bar`, or `bar_grouped` whose dimensions are DISTINCT CHANNELS
  (`dimensionChannelIds` all non-null and distinct) → columns on one axis; `bullet` → targets; `line` → trend (≤ 3 series
  by role `primary`/`reference`/`detail`). contentType → template: `report-figure-{comparison,columns,targets,trend}` →
  `ReportFigure*Page`; `insights-figure-{…}` → `InsightsFigure*Slide`. A family without a page ⇒
  `InsightsRenderRejectedError` with its cause; a figure without enough facts is NOT emitted (the chapter narrates it).
- **Capacities** (`FIGURE_CAPACITY`): A4 `metrics 5, groups 6, bulletRows 6`; deck `metrics 4, groups 4, bulletRows 5`;
  overflow splits with `balancedPages` (7 groups → 4+3).
- **Figure content** — key figure, conclusion and «Lo que significa / Próximo paso» from `chapter.readings` (TASK-1888);
  without a reading (v1 plan): first fact + the claim that cites the figure. Only derived number: percent of target
  (achieved ÷ target, integer).
- **Targets (`bullet`)** — own scale per row (1.1 × max), target mark, «mayor brecha» decided over all rows and the
  direction. Attention zone ONLY from `band` = `bandFactId`; without it, a single track. Never a hand-written threshold.
  `lower_is_better` ⇒ class `bullet--lower` (inverts the dark side).
- **«Lo esencial»** (`plan.essentials`) — `report-summary` / `insights-summary`: thesis, lede, ≤ 5 essentials (figure =
  primary fact formatted, title = metric, A4 detail = claim), real folio = first page drawing the fact, else the
  chapter opening; decision «Para decidir en la reunión» (A4) / «Para decidir» (deck). No essentials ⇒ narrated summary.
- **Cover** — white (`ReportCoverLightPage`) or navy per `plan.cover`; deck always navy. Client logo travels as the sealed
  ref `asset-ref:org-logo:<id>` (`render/cover.ts` `orgLogoRef`); bytes arrive through `ComposeOptions.externalAssets`.
  The worker reads them with `readOrganizationLogoForRender` (only the attached logo of THAT org, image, ≤ 2 MB, access
  log). No bytes ⇒ fail closed; non-embeddable logo ⇒ `semantic_rejected` (`services/artifact-worker/classify-failure.ts`).
- **Color** — only `fig-*` classes painted by each catalog; zero HEX in code. `delta-tone` = direction, not judgment.
- **Composer contract** — `SlotContract.example?` / `SlotFieldContract.example?` (`artifact-composer/contracts.ts`): the
  visual-gate probe (`synthesize.ts`) uses it verbatim; catalog data, not engine data (runbook `composer-visual-gate.md`).


## Client-fit presentation (TASK-1957 — code complete local 2026-10-02)

- `InsightWebModelV1` **1.2** (aditivo): `InsightWebFactV1.source` = nombre legible (vocabulario común con el PDF;
  hasta 1.1 viajaba la tabla lectora), `unitLabel`, `asOfLabel`; `InsightWebChartV1.unitLabel`;
  `InsightWebClaimV1.role` (`finding`|`backing`, sólo en claims de capítulo de planes nuevos).
- `PlanClaimV1.role` opcional; planes congelados antes de TASK-1957 no lo traen y se renderizan como antes.
- Límites: `GH_INSIGHTS.readerLimits` (`outOfScope`, `noComparison`, `insufficientData`); `GH_INSIGHTS.rejections`
  queda como vocabulario de diagnóstico interno y el gate lo trata como prohibido en límites.
- Gate `clientFitViolations({ model, reportTitle, facts })`: reglas `internal_identifier`, `raw_unit_code`,
  `raw_iso_date`, `internal_limit_wording`, `duplicated_limit`, `chart_without_information`,
  `count_without_denominator`, `rank_as_bars_from_zero`, `shared_axis_incomparable` (magnitudes ≥10× en un eje sin
  `scale.perDimension`). Claves estructurales (ids, `unit`, `asOf`, `spec.data`,
  `spec.tabularEquivalent`…) no se leen como texto. Emitir una edición cliente con violaciones ⇒ `409 not_ready`
  con `details.reason = client_fit` y hasta 20 violaciones.

- **AEO evidence v2** (`aeo_report_adapter_v2`, TASK-1957 Slice 6): `mention_rate.<provider>` (percent, num = present,
  den = resolved, `channelId`), `share_of_model` (percent over all measured engines), `sov.brand` /
  `sov.competitor.<slug>` (percent of total mentions, `buildCompetitiveBenchmark`, top 5 competitors) and
  `citation_share` (percent of answers with citations that cite the own site). No competitors ⇒ rejection
  `share_of_voice`/`insufficient_data`. `presence.*` is only read from snapshots sealed before v2.
- Planner: AEO percent facts group by family (`mention_rate`, `sov`, `single`); `single` never charts; headline
  metrics (`share_of_model`, `sov.brand`, `citation_share`) are always `finding`.
- No competitors and `competitive_sov` scored > 0 ⇒ neither `dimension.competitive_sov` nor `overall_score` is emitted
  (the Grader weights that dimension 15 % of the global); rejection `overall_score`/`insufficient_data`.
- `ChartScaleV1.perDimension` (aditivo, 1.2): distinct metrics of one channel, each with its previous period, are ONE
  `bar_grouped` figure read row by row on its own scale (the PDF «comparison» page already did this; Think must honor
  it, TASK-1958). Magnitude bands apply only to shared-axis charts; a one-figure band is never a chart. Score readings
  rank last for the summary thesis and essentials.

## Portada y alcance por servicio (TASK-1957, 2026-10-02)

- `request.scope?: InsightScopeKey[]` (≤4, sin repetir): alcance que muestra la portada, del catálogo
  `presentation/scope-catalog.ts` (seo, aeo, ico, creative, design, content, performance, paid_social, social, revenue,
  crm, email, automation, web, analytics). Cada clave trae etiqueta (`GH_INSIGHTS.scopeChips`), glifo Trazo de AXIS y
  línea de marca. Sin `scope` el hash no cambia y los chips se derivan de `modules`. `get_insights_catalog` lista los
  alcances. Un alcance nuevo = entrada en el catálogo + etiqueta; el test exige que el glifo exista en AXIS.
- Cabecera compartida: `header.scopeChips` (Think los dibuja con `/branding/icons/trazo-<glyph>-dark.svg`, exportados
  con `pnpm insights:think-icons`; nunca a mano).
- Modelo web 1.2 suma `metricId`, `comparisonFactId` por hecho y `figure {display, direction, kind: change|level}` por
  frase de resumen/esencial (cambio sólo si la frase lo dice; si no, el valor citado).
- Portada con UNA fecha (el período); el título por defecto no lleva período (`defaultReportTitle(modules)`).
- El adapter AEO lee el análisis que TERMINÓ dentro de la ventana, del mercado principal
  (`readClientGraderReport({ finishedWithin })` → `getLatestClientGraderRunInWindow`).
- **Submarcas de producto** (`presentation/product-marks.ts`, línea gráfica «La órbita», aprobadas 2026-09-29): cada
  capítulo con producto trae `chapter.productMark {key, label}` (`seo`→`sv360`, `aeo`→`aeo`; ICO no tiene). Think
  dibuja el lockup oficial `/branding/products/<clave-con-guion>-lockup-positive.svg` EN LUGAR de la etiqueta del
  módulo (reemplaza, nunca se suma; una por sección; nunca firma). La fuente de los hechos AEO se nombra
  «Efeonce AEO Assessment» (`GH_INSIGHTS.sources.ai_visibility_grader`). Los lockups (`positive|negative|white`) se
  exportan con `pnpm insights:think-icons` desde `@efeoncepro/axis-brand-assets`; nunca se copian ni se arman a mano.
  Reservado: `ai_visibility_report` (enlazar el entregable cuando exista el vínculo) y portadas PDF/deck.

## Contrato de contenido y su mantenimiento (TASK-1962 — en código local 2026-10-02)

- **Qué dice un informe**: ocho preguntas del cliente en `presentation/content-contract.ts` (resultado, causas,
  competencia, trabajo entregado, recomendaciones, peticiones, medición, límites), con veredicto por módulo
  (`producer_now | no_evidence | policy_blocked | needs_input | agent_task`) y su evidencia. Espejo legible en la
  arquitectura §15.
- **Agregar un dato** = hecho en el adapter dueño + regla en `CONTENT_METRIC_RULES` + veredicto `producer_now` + productor
  del planner (+ fila de la matriz de familias si dibuja) + subir `CONTENT_CONTRACT_VERSION`, en el mismo cambio.
  Gate: `content-contract.test.ts` (consistencia en las dos direcciones) y `expectContentContract` en
  `adapters/adapters.test.ts` (un hecho emitido sin regla rompe).
- **Competencia SEO al cliente: `policy_blocked`** (auditoría §7 del módulo SEO). La de IA (Share of Voice) sí va.
- **Prefijos con sección propia en el planner**: `driver.*` (causas: figura de la misma escala, hallazgo de
  descomposición, tabla con `lead`) y `opportunity.*` (hechos de PLAN: sólo sostienen acciones). Ninguno compite como
  hallazgo de resultado ni va a la tabla general.
- **Modelo web 1.3**: `claim.module`, `claim.evidence`, `essentialsByModule`, `chapter.label`, `chart.note`,
  `fact.priorLabel`, `action.module`, `table.lead`. Think los consume y no deduce ninguno (la muestra de Think los
  emula SÓLO en fixtures).
- **Grader ya medido** (`content_contract_v2`): `cited_source.*` y `source_type.*` responden «¿por qué?» y `sentiment.*`
  «¿cómo nos fue?»; los dominios citados nunca van en columnas (sólo hallazgo y tabla `table.aeo.sources`).
- **Peticiones**: sólo `gsc` `not_connected` (Search Console sin conectar) produce `ask`; lo interno no se le pide al
  cliente.
