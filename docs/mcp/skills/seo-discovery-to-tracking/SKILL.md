---
name: seo-discovery-to-tracking
description: The governed path from a keyword idea to a tracked keyword in Greenhouse - preview the cost, queue discovery, poll the run, read candidates as one keyword each, resolve cannibalization, then track only what a human approved. Load it before discover_seo_keywords, get_seo_keyword_discovery or track_seo_keywords.
---

# From discovery to tracking

A keyword idea becomes a tracked keyword through four separate steps, each with its own tool and
its own cost. None of them is automatic, and the last one commits recurring spend. This manual
tells you what each step returns, what is billed, and where the human decides.

## The path

```
preview  ->  queue  ->  poll  ->  read candidates  ->  human review  ->  track
discover_    discover_   get_seo_    get_seo_keyword_       decision      track_seo_
seo_keywords seo_keywords keyword_   discovery (runId)                     keywords
(preview:    (confirmed)  discovery
 true)
```

## 1. Preview before queueing: `discover_seo_keywords` with `preview: true`

A discovery run bills the provider per call and per returned row. Always call the tool first
with `preview: true`: it returns the estimated cost formula without spending. Show that estimate
to the human together with the exact seeds, methods and market, and get explicit confirmation.
Never queue speculatively.

Seed sources you can declare:

| `seedSource` | Where the seeds come from | Provider cost to resolve seeds |
| --- | --- | --- |
| `manual` | `manualSeeds` you pass (up to 10) | None |
| `gsc_queries` | Top measured queries of the site | None (measured data) |
| `tracked_keywords` | Keywords already tracked | None |
| `target_domain` | The organization's target domain (`keywords_for_site` only) | Billed when the run executes |
| `mixed` | Measured seeds plus manual seeds | None for the measured part |

## 2. Queue: the same tool without `preview`

The response is a `202`: the run was durably queued and will execute asynchronously in a worker.
That is all it means. Do not claim results exist right after queueing, and do not queue twice.

Idempotency lives in the provider's monthly refresh cycle: the same intent (organization, target,
seeds, market, methods, actor) returns the existing run of the current month without spending
again. A new month allows a fresh run, because the provider refreshes market metrics monthly.

Queueing never tracks anything. Candidates enter the monitored set only through
`track_seo_keywords`, after human review.

## 3. Poll: `get_seo_keyword_discovery`

Without `runId` it lists recent runs with their status: `pending`, `running`, `succeeded`,
`partial`, `no_results`, `failed`, `budget_blocked`. With `runId` it returns the composed
candidates. `partial` and `no_results` are honest states of a finished run, not errors to retry;
`budget_blocked` means the organization's provider budget stopped the run, which is a fact about
the budget, not about the seeds.

## 4. Read candidates: one keyword is one candidate

A candidate is **one normalized keyword**, not one provenance row. When several methods found
the same keyword it is a single candidate whose `candidateIds` and provenance list every source,
and `totalCandidates` counts distinct keywords. Never treat a provenance entry as its own
candidate, and never propose spending on the same keyword twice.

Each candidate carries estimated market data from the provider (volume, difficulty, link barrier,
intent). All of it is the estimated lens: an estimate of the wider market, never measured demand
for this site. Report the capture date with any figure, and report `null` as unknown, never as
zero.

## 5. Cannibalization: `clusterConflict`

`clusterConflict.status = conflict` means a keyword the target **already tracks** shares this
candidate's core keyword; `trackedMembers` names up to five of them. The sound move is to
consolidate around the existing keyword rather than add a second bet on the same intent. This is
separate from `alreadyTracked`, which is an exact match: an exact match costs nothing to
re-track, a cluster conflict costs a second slot for the same intent.

## 6. Human review, then `track_seo_keywords`

Present the shortlist with its evidence and let the human choose. Tracking is a recurring spend
commitment: every tracked keyword is billed on every daily rank-capture cycle until it is
untracked. The full protocol lives in `seo-spend-discipline`; the short form:

- Call once with the exact confirmed list.
- Declare `intent` (`target` or `opportunity`) only when a human stated it. There is no default;
  guessing fabricates a classification nobody made.
- Read the per-keyword outcomes (`tracked`, `already_tracked`, `intent_changed`,
  `capacity_exceeded`, `invalid`) and report them verbatim. `data.ok` alone says nothing about
  which keywords were accepted.
- If the set is full, propose what to untrack with the human before proposing what to add.

## What you never do

- Never queue discovery without a preview the human saw.
- Never report that candidates exist because the queue returned `202`.
- Never count provenance rows as candidates or propose the same keyword twice.
- Never track from a candidate list without a human choosing the keywords.
- Never present estimated volume or difficulty as measured demand, and never rank measured
  opportunities by them.
