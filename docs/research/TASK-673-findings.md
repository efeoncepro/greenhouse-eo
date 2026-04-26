# TASK-673 Findings — Mercado Público Commercial Fit POC

## Date Of Run

2026-04-26 smoke validation.

## Sample Size

- Active tenders fetched: 4,346.
- Smoke processed with detail hydration: 25 tenders; 25 details hydrated; 0 matches.
- Smoke processed without detail hydration: 900 tenders; 2 matches exported.

## Quantitative Findings

Smoke run with listing-only mode:

```text
total_fetched: 4346
total_processed: 900
total_hydrated: 0
total_matched: 2
distribution_by_bu: {'globe': 2}
distribution_by_matched_field: {'nombre': 2}
```

Smoke run with detail hydration:

```text
total_fetched: 4346
total_processed: 25
total_hydrated: 25
total_matched: 0
distribution_by_bu: {}
distribution_by_matched_field: {}
```

## Field Distribution

- `nombre`: 2 in listing-only smoke.
- `descripcion`: 0 in detail smoke.
- `items`: 0 in detail smoke.

## Manual Review

Review 50 matched rows manually and record:

- False positives: initial smoke exposed `SEO` matching inside `aseo`, and `documental` matching generic document management. Both were corrected by word-boundary matching and removing the broad `documental` keyword.
- False positive rate: pending full manual sample.
- Common false positive patterns: short acronyms inside unrelated words; overly broad single-word keywords.
- Strong fit examples: `1217466-22-LE26` and `1232565-9-L126` matched `produccion_audiovisual` through `audiovisual` in `Nombre`.

## Keywords To Add

- Add stricter phrases for UX, CRM and performance services after reviewing a larger sample.
- Add public-sector synonyms only after observing true positive examples in detail payloads.

## Keywords To Remove

- Avoid short acronyms without word-boundary matching.
- Avoid broad one-word terms that describe generic administrative work.

## Recommended Next Steps

- Promote the productive integration to TypeScript and converge with `src/lib/integrations/mercado-publico/tenders.ts`.
- Add persistent `greenhouse_commercial.public_tenders*` tables only in a separate implementation task.
- Use `source_sync_runs` and `source_sync_watermarks` for production observability.
- Keep noncanonical Reach/PR/media hits as `signals` until the commercial catalog explicitly adds a canonical service.
