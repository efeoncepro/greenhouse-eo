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
| `outputs` | non-empty subset of `deck_pdf|report_pdf|web` (intent only until TASK-1846) |
| `brand` | `efeoncePackVersion` (default `axis-current`), `clientBrandRef` optional 1–200 |
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
  with sealed snapshot + frozen plan; `outputs` ⊆ edition outputs and ⊆ `INSIGHT_RENDERABLE_OUTPUTS` (`deck_pdf`).
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
