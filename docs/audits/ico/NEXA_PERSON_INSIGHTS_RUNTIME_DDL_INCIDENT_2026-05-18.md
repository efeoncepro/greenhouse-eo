# Nexa Person Insights Runtime DDL Incident - 2026-05-18

## Status

Resolved on 2026-05-18.

- Fix commit: `00656a55 fix: remove runtime DDL from person insights readers`
- Branch deployed: `develop`
- Environment verified: Staging (`dev-greenhouse.efeoncepro.com`)
- Runtime: Vercel `nodejs24.x`

## Symptom

The Person profile activity tab showed the Nexa Insights card as empty for members with known weekly digest insights. Example observed case:

- URL: `/people/melkin-hernandez?tab=activity`
- UI state: `Sin datos` / `Aun no hay senales analizadas`
- Contradiction: the weekly Nexa Insights digest did include insights for Melkin Hernandez and other members.

## Root Cause

The Nexa pipeline and data were healthy. The broken part was the Person profile API:

```text
GET /api/people/[memberId]/intelligence
```

That route calls readers for person intelligence, member capacity economics, and LLM enrichment. Two reader bootstrap paths attempted runtime DDL:

- `greenhouse_serving.person_operational_360`
- `greenhouse_serving.member_capacity_economics`

The runtime staging database user (`greenhouse_app`) has read access to those serving tables, but does not have `CREATE` privilege on schema `greenhouse_serving`. Because the route executed `CREATE TABLE IF NOT EXISTS ...` before reading, the API failed with:

```text
permission denied for schema greenhouse_serving
```

The frontend handled the failed API response as an empty Nexa state, so the user saw `Sin datos` even though analyzed insights existed.

## Why Weekly Digest Still Worked

The weekly digest used a separate path that could read the available LLM enrichment data. The failure was specific to the Person profile intelligence route because it invoked runtime table-creation guards before returning the response.

## Fix

Runtime DDL was removed from the read path. The affected `ensure*Schema()` functions now verify table availability with read-only probes:

```sql
SELECT 1
FROM greenhouse_serving.person_operational_360
LIMIT 0;
```

```sql
SELECT 1
FROM greenhouse_serving.member_capacity_economics
LIMIT 0;
```

Files changed in the fix commit:

- `src/lib/person-intelligence/store.ts`
- `src/lib/member-capacity-economics/store.ts`
- `src/lib/person-intelligence/store.test.ts`
- `src/lib/member-capacity-economics/store.test.ts`

## Verification

Post-deploy staging validation with the dedicated agent user:

```text
GET /api/people/melkin-hernandez/intelligence?trend=6
HTTP 200
```

Observed payload summary:

```json
{
  "memberId": "melkin-hernandez",
  "current": true,
  "trendCount": 6,
  "nexa": {
    "totalAnalyzed": 1,
    "activeAnalyzed": 1,
    "historicalAnalyzed": 5,
    "runStatus": "succeeded",
    "summarySource": "active",
    "insightCount": 1,
    "firstMetric": "ftr_pct",
    "firstSeverity": "critical"
  }
}
```

Local validation performed in a clean worktree:

- `pnpm exec vitest run src/lib/person-intelligence/store.test.ts src/lib/member-capacity-economics/store.test.ts 'src/app/api/people/[memberId]/intelligence/route.test.ts' src/lib/ico-engine/ai/llm-enrichment-reader.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint` passed with only pre-existing unrelated warnings.

## Prevention

- Read paths must not execute DDL in runtime request handlers.
- Serving tables owned by migrations/projections should be validated with read-only probes in application readers.
- If a table truly needs creation or schema migration, it belongs in migrations, deployment scripts, or controlled operational jobs, not in user-facing API routes.
