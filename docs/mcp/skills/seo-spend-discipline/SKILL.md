---
name: seo-spend-discipline
description: How to call the Greenhouse SEO tools that commit provider budget without spending money nobody approved. Load it BEFORE track_seo_keywords, declare_seo_competitors, discover_seo_keywords or run_seo_prospect_diagnostic.
---

# SEO spend discipline

Some Greenhouse SEO tools are not reads. Calling them commits real money with an external data
provider, and part of that money keeps being billed every cycle until a human reverses the call.
This manual tells you which tools do that, what each one bills, and the only protocol under which
you may call them.

## The tools that commit budget

| Tool | What it commits | When it bills |
| --- | --- | --- |
| `track_seo_keywords` | Adds keywords to the monitored set | **Recurring.** Every tracked keyword is billed on every daily rank-capture cycle until it is untracked |
| `declare_seo_competitors` | Adds competitor domains to the coverage cycle | **Recurring.** Every active competitor is billed on every monthly coverage cycle until it is retired |
| `discover_seo_keywords` | Queues a keyword-discovery run | **Immediate.** Each provider call and each returned row is billed when the run executes |
| `run_seo_prospect_diagnostic` | Runs a one-shot diagnostic of a prospect domain | **Immediate.** Roughly a quarter of a US dollar per run, with a hard per-run ceiling and a daily per-actor cap |

Two tools are the reversals. They write, but they cut spend instead of committing it:

- `untrack_seo_keywords` closes the tracking window of a keyword.
- `retire_seo_competitors` closes the validity window of a competitor.

Neither reversal deletes history. Past measurements stay. The same keyword or domain can be
tracked or declared again later, which opens a **new** window: the days in between are not
recovered. Do not untrack or retire something to "pause" it if the human intends to resume soon.

## Why recurring spend is the dangerous class

An immediate spend is bounded by the call you make. A recurring spend is bounded only by the
day someone reverses it. Tracking one keyword or declaring one competitor is a **deferred spend
commitment**: the write itself costs nothing and calls no provider, so nothing in the response
looks expensive. The invoice arrives later, every cycle, under someone else's name.

That is why the protocol below is not optional and applies to recurring commitments with the
same rigor as to a run that spends today.

## The protocol

1. **Read the entitlement first.** Call `get_seo_entitlement` for the organization. If
   `hasModule` is false the organization has no SEO module: stop, report it, infer nothing else.
   If the module is present, note the remaining monthly provider budget and the remaining audit
   allowance. Proposing spend against an exhausted budget wastes the human's time.
2. **Build the exact proposal.** The exact list of keywords or domains, the exact seeds and
   methods for discovery, the exact domain and market for a prospect diagnostic. For discovery,
   call `discover_seo_keywords` with `preview: true` first and show the human the cost formula
   the preview returns. Never propose "some keywords" or "the top candidates": propose the list.
3. **Get explicit human confirmation of that proposal.** A question that mentions competitors
   is not a confirmation. Silence is not a confirmation. A confirmation of a different list is
   not a confirmation of yours.
4. **Call once, with the confirmed list, verbatim.** Do not add items the human did not see. Do
   not retry a call that answered.
5. **Read the per-item outcomes. Never trust `data.ok` alone.** `data.ok: true` means the
   command ran, not that every item was accepted. Each keyword or domain carries its own outcome:

   | Outcome | Meaning | Spend |
   | --- | --- | --- |
   | `tracked` / `declared` | Newly added | Commits recurring spend from the next cycle |
   | `already_tracked` / `already_declared` | Was already in the set | Nothing changed, nothing new billed |
   | `intent_changed` | The keyword stayed tracked; its declared intent changed | No new spend, no capacity consumed |
   | `capacity_exceeded` | Rejected: the governed ceiling of the set is full | Not added, not billed |
   | `invalid` | Rejected: malformed item | Not added, not billed |
   | `untracked` / `retired` | Window closed | Spend stops from the next cycle |
   | `not_tracked` / `not_declared` | Reversal of something that was never active | Nothing changed |

6. **Report the outcomes verbatim.** Reporting "done" when half the list came back
   `capacity_exceeded` describes a change that did not happen. Name what was added, what was
   already there, and what was rejected, with the reason.
7. **When `data.ok` is false, report the `errorCode` as a state, not as a retry hint.**
   `disabled`, `no_entitlement`, `budget_exhausted`, `target_not_found` and `query_failed` are
   facts about the organization or the platform. None of them is fixed by calling again.

## Idempotency: what it protects and what it does not

- A keyword already tracked with the same intent returns `already_tracked` and costs nothing.
- A domain already declared returns `already_declared` and costs nothing.
- A discovery run with the same intent (organization, target, seeds, market, methods, actor)
  returns the existing run of the **current month** without spending again. A new month allows a
  fresh run, because the provider refreshes its market metrics monthly.
- A prospect diagnostic of the same domain and market on the same **day** returns the existing
  diagnostic with zero spend. Another day is a new human decision that passes every ceiling again.

Idempotency protects you from a transport retry double-billing. It does not protect the human
from a proposal they did not approve: it makes a wrong call cheaper to repeat, not right.

## Capacity ceilings

Both recurring sets have a governed per-target ceiling. Items beyond it return
`capacity_exceeded` and are **not** added. Do not treat the ceiling as an obstacle to route
around: it exists so that no single conversation can grow an organization's invoice without a
human deciding to raise the limit. If the set is full, the honest move is to propose which items
to untrack or retire, with the human, before proposing what to add.

## Declaring intent on a tracked keyword

`track_seo_keywords` accepts an optional `intent` (`target` or `opportunity`). It is a declared
fact with an author, not a default. Omit it unless a human stated why the keyword is in the set.
Guessing `opportunity` fabricates a classification nobody made. A `target` keyword may sit at
position 60 and that is the distance left, not a failure.

## The ETV methodology evaluator is a separate spend

Estimated traffic (ETV) from the provider carries a formula version, and every read tool that
serves it reports that version as `etvMethodology.version`. Since 2026-09-03 the served version is
`improved_layout_clickstream_v2`; the exact A/B against the legacy formula already ran that day
(26 requests, USD 1.09536, approved and reconciled against the ledger) and the history was
rebaselined (`breakpointDate` stays `null`). Improved figures sit roughly 60 % below legacy ones
for the same subject and day: a change of scale by formula, never a loss. Comparing the legacy
formula with the improved one is **not** a read and not part of any capture: it is a separate spend with its own
controls. It stays off by default and runs only behind its own gate, an allowlist of subjects, a
maximum number of requests and a USD ceiling; when any of those is unset it fails closed. Its dry
run declares `providerCalls: 0` and lists what it would execute and why, and that dry run is the
only step you may report without a recorded approval.

What the money looks like:

- An **exact A/B** doubles the provider calls of every cell, one per formula, so the forecast is
  twice a normal capture of the same subjects.
- The **improved formula carries no surcharge**: switching formulas does not change the price of
  a call.
- **Clickstream-based traffic is a different lane**, priced at twice the rate, and is not part of
  this comparison. Do not fold it into an ETV forecast.

Never run the evaluator from a read tool or as a side effect of reading visibility. The read tools
serve persisted evidence with its formula version; none of them buys a comparison, and none of
them accepts a formula argument. If a human wants the comparison, it is a proposal with a dry run,
a subject list, a request cap and a USD cap, confirmed before anything is called.

## What you never do

- Never call a spending tool "to see what happens", to test, or to demonstrate the tool.
- Never call a spending tool on your own initiative because the data would be useful.
- Never present a spending tool as a read, or a recurring commitment as a one-time cost.
- Never declare a competitor straight from a candidate list without the human confirming it.
  The competitor loop has its own manual: load `competitor-loop`.
- Never assume a rejection is transient. Read the outcome or the error code and report it.
- Never trigger a formula comparison of estimated traffic from a read, without its dry run, or
  without an approved subject list, request cap and USD cap.
- Never close a window (untrack or retire) as a way to pause; propose it only when the human
  wants the spend to stop.
