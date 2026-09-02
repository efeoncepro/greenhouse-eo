---
name: seo-prospect-diagnostic
description: How to run and report the one-shot SEO diagnostic of a prospect domain in Greenhouse - it spends real money per run, every figure is estimated, it never certifies health, and it is idempotent per domain, market and day. Load it before run_seo_prospect_diagnostic or get_seo_prospect_diagnostic.
---

# The prospect diagnostic

The prospect diagnostic quantifies the organic loss of a domain that is **not** a client, using
provider data only, without any access to the prospect's own analytics. It exists for the sales
conversation: it puts a magnitude on the problem after a first assessment and before showing how
the problem is fixed. This manual covers the spend, the idempotency, the lens of every figure and
the sentences you are not allowed to produce.

## Two tools, two roles

| Tool | Role | Cost |
| --- | --- | --- |
| `run_seo_prospect_diagnostic` | Executes a one-shot diagnostic of `rootDomain` in `market`, optionally against up to five `competitorDomains` | **Spends real money**: roughly a quarter of a US dollar per run, with a hard per-run ceiling and a daily per-actor cap enforced server-side |
| `get_seo_prospect_diagnostic` | Reads diagnostics already executed: `diagnosticId` for the full facts, or `rootDomain` and `limit` to list | None |

Always try the read first. If a diagnostic of that domain and market already exists, there is no
reason to spend.

## Before running

1. Propose the exact `rootDomain` and `market` to the human, and the competitor domains if any.
2. Get explicit confirmation. Never trigger a run on your own initiative, to "check something",
   or to demonstrate the tool.
3. Call once. A transport retry is safe because of idempotency; a second deliberate call is a
   second decision the human did not make.

## Idempotency

The same `rootDomain` and `market` on the same day returns the existing diagnostic with zero
spend. Another day is a new human decision that passes every ceiling again. There is **no
recurring capture** on prospects: nothing keeps billing after a run, unlike tracked keywords or
declared competitors.

## Reading the result

The diagnostic returns dated facts: ranked surface, keywords on the first page and within
striking distance, citations in AI overviews, estimated traffic volume, the real competitors of
the SERP, a link gap against them, and technical evidence of the site. Each fact carries its
capture date, and every figure is the **estimated lens** (external provider), because there is
no first-party data for a prospect.

| You must say | You must never say |
| --- | --- |
| "Estimated, as of <date>" with every figure | A figure as if it were measured |
| "The diagnostic enumerates quantified loss" | "The site is healthy" or any health verdict |
| The facts of this domain, with their dates | Industry benchmarks, average lifts or promised rankings |
| A crawl block as a finding about the site | A crawl block as an obstacle that invalidates the diagnostic |

The output has no score and no verdict by design. A prospect with few findings is a prospect
with few findings, not a certified site.

## Error states

`data.ok: false` with an `errorCode` is a state of the platform or of the request, not a retry
hint: `disabled` means the capability is off in this environment, a validation error means the
domain or market was malformed, and a ceiling error means the per-run or daily cap stopped the
run. Report the state; do not retry blindly.

## What you never do

- Never run without a human confirming the exact domain and market.
- Never run against a domain that is a current client: clients have measured data and their own
  tools.
- Never present an estimate as a measurement, and never certify health.
- Never quote industry figures or lifts around the diagnostic; only this domain's facts.
- Never schedule or repeat diagnostics to build a series: there is no recurring capture on
  prospects, by design.
