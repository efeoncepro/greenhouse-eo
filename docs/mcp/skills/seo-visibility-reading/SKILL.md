---
name: seo-visibility-reading
description: How to read and report Greenhouse SEO visibility data honestly. The two lenses that must never be averaged, what absence means, how the readers chain, and which tool owns the ordering. Load it before describing where a client ranks or how it is doing.
---

# Reading SEO visibility

Every SEO figure Greenhouse serves comes from one of two lenses, and a number that mixes them
has no referent. This manual gives you the vocabulary, the chain of readers, and the absence
semantics you need to describe a client's visibility without inventing a measurement.

## The two lenses

| Lens | Symbol | Source | What it is |
| --- | --- | --- | --- |
| Measured | ● | Google Search Console, first party | What real users of this domain saw and clicked. Impressions-weighted positions over real queries |
| Estimated | ◑ | Purchased SERP snapshots and market snapshots from an external provider | An exact position for a synthetic query issued from a location we chose, or a market-wide estimate refreshed monthly |

They are complementary and they are not comparable point to point. The measured position is an
average over real impressions; the estimated position is one observation of one query. **Never
average, sum, interpolate or merge them into a single number.** A combined number would be
presented with the confidence of a measurement and mean nothing.

Every figure travels with its provenance and a capture date. Always report which lens a number
comes from and its as-of date.

Estimated traffic (`etv`) carries one more dimension since TASK-1805: `etvMethodology.version`
(`legacy_static_v1` today; `improved_layout_clickstream_v2` becomes mandatory at the provider on
2026-11-01T00:00:00Z). The provider changes the formula behind the same field, so two etv figures
are comparable only when their versions match. Report the version next to any etv figure, never
compute a delta across versions, and read `errorCode: not_available_for_method` as "evidence
exists under another formula", not as zero. The served formula is chosen server-side; no tool
argument selects it. When a payload lists several provenances, the lens is a property
of each figure, not of the whole response.

## What absence means

Absence is never zero. The readers distinguish states on purpose; collapse them and you turn a
gap into a fact.

| You see | It means | You say |
| --- | --- | --- |
| `null` position on a date | No measurement that day. Position zero does not exist | "No data that day", never "position 0" |
| `null` searchVolume or difficulty | The market lookup was never made or the provider had no entry | "Unknown", never "zero volume" |
| `found: false` on a keyword | That keyword was never queried in the market snapshot | "Not looked up" |
| `sin_dato` on a factor | The factor could not be derived | Name it as missing, never as "low" |
| `previous: null` | There is no comparable previous window | "No comparison available", never "+100%" |
| `impressions: 0` on a tracked keyword | No impressions recorded yet | Not a measurement of zero demand |
| `data.ok: false` with an `errorCode` | A state of the organization or platform (`disabled`, `target_not_configured`, `no_seo_data`, `no_aeo_data`, `no_market_data`, `no_data`) | Report the state honestly; it is not a zero and not a retry |
| A lens `unavailable` with a reason | That lens could not be resolved (for example, several active markets and none selected) | A state; it does not invalidate the other lens |

Some absences are structural, not bugs:

- The persisted top-N SERP series starts the day its persistence went live. Earlier days do not
  exist and cannot be bought back, so old dates being absent is expected.
- The purchased position series usually starts later than the measured Search Console history.
  Each lens declares its own window; they can differ.

## Position and CTR semantics

- Position is **inverted**: a lower number is better, and a negative delta is an improvement.
- Average position over a period is weighted by impressions, never a flat mean of daily values.
- CTR over a period is total clicks over total impressions, never a mean of daily ratios.
- Position and CTR are `null` when there were no impressions: "not measured", not zero.

## The chain of readers

Start from measured truth, then add estimated context, then reach for the ordering authority.
Do not start from an estimated tool to answer a measured question.

1. `get_seo_entitlement`: is the module assigned, what tier, what remains of the monthly budget
   and audit allowance. `hasModule: false` means only that the module is not assigned.
2. `get_seo_overview_kpis` (●): the north-star cockpit. Clicks, impressions, weighted position and
   CTR over the period, daily series, and the previous window for comparison.
3. `get_seo_keyword_opportunities` (●): measured striking-distance opportunities. Optional
   estimated enrichment (volume, difficulty) may be attached; it is an estimate of the wider
   market, not this site's demand, so never rank by it as if it were measured.
4. `get_seo_performance_catalog`, then `get_seo_performance`: the standings and series of a
   **chosen set** of keywords or URLs. `items` is required and never inferred; discover valid
   items with the catalog first. A question that names no keyword is not this tool.
5. `get_seo_rank_evolution` (◑): the exact daily positions of the tracked keywords from the
   purchased SERP, including SERP features. Defaults to every tracked keyword.
6. `get_seo_dual_lens_visibility`: both position series for a **known list of keywords**, separated
   and labelled. Use it whenever you are about to say "where this client ranks" and both lenses
   must be shown. There is deliberately no combined field; do not compute one.
7. `get_seo_visibility_360`: the cross of organic rank (●) and AI citability. A 2x2 quadrant per
   keyword and for the domain (`dominante`, `riesgo`, `oportunidad`, `invisible`). The two axes
   are orthogonal and never averaged; a missing lens is a state.
8. `get_seo_domain_overview`, `get_seo_url_visibility`, `get_seo_keyword_market_data` (◑): the
   market snapshot. Ranked keyword counts, estimated traffic volume, position distributions,
   volume and difficulty per keyword. All estimates, refreshed monthly, each with a capture date.
   Estimated traffic volume is a volume, not dollars and not measured visits.
9. `get_seo_serp_top_results` (◑): the persisted top-N of the SERP for tracked keywords, dated
   per slot. Competitive data about who ranks in the client's intent: internal use only, never
   shown to a client.
10. `get_seo_work_queue`: **the single ordering authority of the module.** Every other reader
    returns rows in a neutral order or an order that serves its own chart. If the question is
    "what should we do first", the answer comes from here and only from here.

## The work queue is the only ranking

Do not coin a priority score, do not sort another reader's rows by an estimated figure, and do
not present the keyword gap or the opportunities list as a priority list. The queue's score is an
estimated ceiling of incremental clicks over measured demand, computed with a CTR curve derived
from the client's own site. Two things follow:

- **Bands are not comparable by number and never average.** A band with measured demand and a
  usable curve carries a score in clicks; other bands do not, and a row without a score is not a
  row with score zero.
- **A ceiling is not a forecast.** It assumes the CTR observed at the target position repeats.
  It does not say the page will get there.

When a payload declares how its click estimate was produced (for example, which CTR curve
source was used and whether the site had enough sample), report that declaration with the number.
A site with too few impressions in the relevant position bucket cannot have a ceiling estimated
from its own curve; the honest statement is that the **order** is still measured and valid while
the click figure is not estimable yet.

## The market is declared, never inferred

The market (country and language) comes from the organization's SEO target. If the organization
has several active markets and the question does not name one, **ask** which one instead of
passing a market. Where the operator sits, where the brand comes from, what language they write
in and which target was created first are correlated with the market and none of them declares
it. Pass `market` only when the human named it or there is a single active target.

## How to report

- Side by side, each figure with its lens and its as-of date.
- Name the keywords that came back without data in a lens instead of dropping them.
- Say when a series is young, when a window is short, and when a comparison is unavailable.
- Say what was measured and what was estimated in the same sentence when both appear.
- Keep competitive data (top-N, competitor gap, candidates) out of anything client-facing.
