---
name: seo-technical-health
description: How to read the technical and off-page health of a site in Greenhouse - the site audit report, the weekly backlink profile and the backlink detail with its three states. Which absences are positive findings, which are unknowns, and what never to certify. Load it before get_seo_site_audit_report, get_seo_backlink_profile or get_seo_backlink_detail.
---

# Reading technical and off-page health

Three readers describe the health of a site: the technical crawl, the weekly link profile and
the nominal link detail. All three are served from captures that already happened; none of them
calls the provider when you read. This manual explains what each one asserts, which of their
absences are findings and which are unknowns, and the one thing you never say.

## The site audit: `get_seo_site_audit_report`

A technical crawl of the organization's target site: a sitewide health score from 0 to 100, the
number of crawled pages, and findings grouped by severity (`critical`, `warning`, `notice`) with
stable issue types such as `is_4xx_code`, `no_description` or `has_micromarkup_errors`.

| You see | It means |
| --- | --- |
| `status: running` | The crawl is still in progress. A fact, not an error; read it later |
| `status: succeeded` with zero findings | The site is technically clean for what the crawl checks |
| `errorCode: run_not_found` | The `auditRunId` you passed does not exist for this organization |
| `errorCode: no_data` | No audit has run yet for this target |

Pass `auditRunId` to read a specific historical run; without it you get the latest. Audits
consume a monthly allowance per organization (see `get_seo_entitlement`); reading a report does
not.

## The weekly link profile: `get_seo_backlink_profile`

A weekly time series of the backlink profile of the target: referring domains, total backlinks,
a domain rank on a 0-100 scale comparable to DR or DA, a toxic share between 0 and 1 derived
from the average spam score of the incoming profile, and new and lost deltas over the provider's
30-day window. Points are weekly snapshots; widen the window with `rangeDays` (default 365).

The toxic share is a spam-score proxy. It says how spammy the profile looks on average; it does
not name domains and it does not say what moved. For that, read the detail.

## The nominal detail: `get_seo_backlink_detail`

The actionable layer behind the weekly aggregate: which referring domains link to the target
(with rank and per-domain spam score), which domains are new or lost in the window with a sample
link and anchor, the anchor-text profile, and a server-derived anchor over-optimization reading.

It is captured only when the weekly aggregate shows movement. That is why the response has
**three distinct states**, and reporting them correctly is the whole point of this reader:

| State | What happened | How you report it |
| --- | --- | --- |
| `available` | The profile moved and the detail was purchased | Name the domains, the new and lost ones, and the anchor reading |
| `skipped_no_movement` | The profile was stable that week, so no detail was bought | A **positive finding**: "the link profile was stable". Never "no data" |
| `drilldown_failed` | The aggregate moved, the detail was attempted and failed | "Something moved and we do not know what". Never disguise it as stable |

Two metrics that answer different questions and are never interchangeable:

- **Toxic share** (from the profile) is a spam-score proxy of who links to you.
- **Anchor over-optimization** (from the detail) is the concentration of the dominant anchor and
  the mix of brand, generic, URL and exact-match anchors. A high concentration is a pattern
  signal, not a spam signal.

Pass `captureDate` to read the detail of a specific weekly snapshot.

## Time and cost semantics

- All three readers are free to call: they read persisted captures.
- The audit spends allowance when it **runs**, not when it is read; the link profile and detail
  are captured on a weekly schedule the organization does not trigger from a tool.
- Every figure carries a capture date. Report the as-of date; a health score from three weeks ago
  is a fact about three weeks ago.

## What you never do

- Never certify a site as healthy. A clean crawl says the crawl found nothing; it does not
  certify the site, and none of these readers produces a verdict.
- Never report `skipped_no_movement` as missing data, and never report `drilldown_failed` as a
  stable profile.
- Never swap toxic share for anchor over-optimization or average them.
- Never fabricate findings when `data.ok` is false; report the `errorCode` as a state.
