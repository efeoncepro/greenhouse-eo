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
