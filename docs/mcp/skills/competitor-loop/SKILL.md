---
name: competitor-loop
description: The governed loop for SEO competitors in Greenhouse - observe the SERP, propose candidates with evidence, get human confirmation, declare with the proposalRef verbatim, read the gap, retire. Load it before proposing, declaring or retiring a competitor.
---

# The competitor loop

"X is a competitor" is a human classification with a spend attached. It is never an inference
you make from data, and it is never something you execute on your own. This manual describes the
loop end to end, which tool owns each step, and what the honest result looks like at each step,
including the empty one.

## The loop

```
observe  ->  propose  ->  confirm  ->  declare  ->  cover  ->  read  ->  retire
serp       candidates    human       declare_    monthly    keyword   retire_
top-N      + evidence    decision    seo_        cycle      gap       seo_
                                     competitors            (derived)  competitors
```

### 1. Observe: `get_seo_serp_top_results`

The daily rank capture already pays for the full top-N of the SERP for every tracked keyword and
persists every dated slot: type (organic, AI overview, people-also-ask, video, local pack, and so
on), domain, URL and title. Reading it costs nothing extra. The series starts the day persistence
went live and cannot be backfilled; old dates being absent is structural.

This is competitive data about who ranks in the client's intent. It is for internal use only and
is never shown to a client.

### 2. Propose: `get_seo_competitor_candidates`

Candidates are domains that appear **organically** in at least N distinct keywords across at
least M distinct days inside the window (the thresholds are versioned; the response declares
them). The client's own domain and non-organic blocks are excluded: a domain cited in a
people-also-ask box is not an organic competitor.

Each candidate carries its evidence: `keywordsCount`, `daysCount`, `medianPosition`,
`bestPosition`, `lastSeen`, whether it is `alreadyDeclared`, and a suggested `proposalRef`.

Two results that are correct and look like failures:

- **An empty list while the series is young** (fewer capture days than the threshold) is the
  expected result. Say that the series is young and when it will be old enough. Do not call it
  an error and do not look for competitors elsewhere to fill the gap.
- **Platform domains** (marketplaces, encyclopedias, video platforms) are not filtered. Present
  them with their evidence; whether they count as competitors is the human's call.

### 3. Confirm: the human

Present the candidates with their evidence and let the human decide which ones are competitors.
A confirmation names the domains. A question, a comment about the evidence, or silence is not a
confirmation. If the human names a domain that is not in the candidate list, that is a direct
declaration (see below), not a confirmation of a candidate.

### 4. Declare: `declare_seo_competitors`

Call it **only after** explicit confirmation, with the confirmed domains, passing each
candidate's `proposalRef` **verbatim**. The reference is opaque evidence linking the declaration
to the observation that motivated it; never construct one, never edit one, never reuse one for
a different domain.

Direct declarations: when the human names a domain on their own, without a candidate behind it,
leave `proposalRef` out. That is the declared, human-authored path.

Declaring commits recurring spend: every active competitor is billed on every monthly coverage
cycle until it is retired. The spend protocol applies in full; load `seo-spend-discipline` if you
have not. There is a governed per-target ceiling; domains beyond it return `capacity_exceeded`
and are **not** declared.

Read the per-domain outcomes and report them verbatim:

| Outcome | Meaning |
| --- | --- |
| `declared` | Newly declared; enters the next coverage cycle |
| `already_declared` | Was already active; nothing changed, nothing new billed |
| `capacity_exceeded` | Rejected: the ceiling is full; not declared |
| `invalid` | Rejected: malformed domain; not declared |

### 5. Cover: the monthly cycle

Coverage runs on its own schedule, not on your call. Right after declaring, the gap for that
competitor is `no_coverage` until the first cycle captures it. That is a state to report, not a
problem to solve by calling something else.

### 6. Read: `get_seo_keyword_gap`

The gap is derived at read time from dated coverage inputs, estimated lens. Its contract keeps
three things apart that must never be merged:

- `content_gap`: the competitor ranks and the client is absent from the provider SERP. New-content
  opportunity.
- `ranks_worse`: both rank, the client below. Optimization; already covered by the opportunities
  surface.
- `declaredTargets`: keywords a human declared as client commitments. Report them as commitments
  in progress with their declaration date, never as new findings.

Keywords with measured Search Console impressions in the window are excluded by design: the
measured lens wins, and their count travels in `excluded.measuredInGsc`. Every row carries its
factors with provenance; a missing factor is `sin_dato`, never zero and never "low".

**The gap reader does not rank.** Rows come in neutral alphabetical order. Do not present them as
a priority list and do not coin a score. Prioritization belongs to the SEO work queue.

Coverage can be `no_coverage` (declared, never captured) or stale. Say so.

### 7. Retire: `retire_seo_competitors`

Retiring closes the competitor's validity window with the retiring actor recorded and cuts the
spend from the next cycle. It does not delete captured coverage. The same domain can be declared
again later, which opens a new window. Pass a reason for the audit trail. Read the per-domain
outcomes (`retired`, `not_declared`, `invalid`) and report them verbatim.

## Where the loop must stop

- Stop after step 2 if the list is empty or the human has not decided.
- Stop before step 4 if the confirmation does not name the domains, or names different ones.
- Stop at any step where `data.ok` is false and report the `errorCode` (`disabled`,
  `no_entitlement`, `target_not_found`, `no_domains`, `query_failed`) as a state.

## What you never do

- Never declare a competitor from candidates without a human confirmation that names it.
- Never fabricate, edit or reuse a `proposalRef`.
- Never treat an empty candidate list on a young series as a failure or fill it from memory.
- Never show top-N, candidates or the competitor gap to a client or in client-facing material.
- Never present the gap as a ranking, and never invent a score for its rows.
- Never retire a competitor to "pause" coverage; propose retirement only when the human wants the
  spend to stop.
