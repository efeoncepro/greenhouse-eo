---
name: marketing-studio
description: How to read Efeonce Marketing Studio through MCP — find what needs attention, open a campaign, read its pieces, copies, ad configurations, media plan and calendar, look at a piece, and report states and budgets without inventing. Load it before answering anything about a campaign, a creative piece, a media budget or a publishing date.
---

# Reading Efeonce Marketing Studio

Efeonce Marketing Studio is the system of record for Efeonce campaigns: brief and decisions, creative concepts,
pieces (images and videos) with their versions, literal copies per channel, ad configurations, the media plan and
the publishing calendar. This manual teaches you to read it correctly through its `studio.*` tools. It grants no
permission: every call is scoped server-side to the organizations your connection may see.

Everything here is read-only today. You cannot create, edit or approve anything yet; if a person asks for a change,
say so and point them to the Studio web app.

## Recommended flow

1. **Start with `studio.attention.get`.** It lists the decisions that are pending (budgets waiting for approval,
   blocked media, scheduled posts whose date passed without a confirmed publication), the upcoming posts and a
   small inventory. It is derived from recorded states, never a prediction.
2. **Find the campaign.** Use `studio.campaigns.list` to see every visible campaign with its three states and
   counts, or `studio.search` when you only have a word from its name, a piece title or a copy.
3. **Open it with `studio.campaign.get`.** You get its states with the operator's notes, concepts and decisions.
4. **Go to the specific part you need:**
   - pieces → `studio.campaign.assets.list` (paginated), then `studio.asset.get` for one piece in full
     (all versions, the ads that use it, the copies of its concept);
   - to actually look at a piece → `studio.asset.preview` (a still image; for a video it is a frame);
   - copies → `studio.campaign.copies.list`;
   - ad configurations → `studio.campaign.ads.list`;
   - budget, flight and audiences → `studio.campaign.media_plan.get`;
   - organic posts → `studio.campaign.posts.list`;
   - dates across all campaigns → `studio.calendar.get` with `from` (included) and `to` (excluded), `YYYY-MM-DD`.
5. Paginated tools return `nextCursor`. Pass it back as `cursor`; never build one yourself.

## The three states are independent

A campaign has three separate states. There is no general "approved".

| State | Values | What it does NOT mean |
|---|---|---|
| Creative | `unknown`, `in_production`, `final_available`, `approved` | Approved creative says nothing about budget or launch. |
| Media authorization | `unknown`, `pending`, `authorized`, `blocked`, `not_applicable` | Authorized media is not a launched campaign. `blocked` always comes with a note: read it. |
| Launch | `not_launched`, `launch_unverified`, `live_observed`, `paused`, `ended` | Only `live_observed` proves the platform shows it running. `launch_unverified` means someone said it went out, without platform evidence. |

When you summarize a campaign, report the three states separately, in words the person understands.

## Budgets: never add them up

The media plan separates budget lines by nature:

- `proposed` — a proposal. It is not a commitment to spend.
- `approved` — approved, with a reference.
- `actual` — spend observed on the platform. An empty list means there is no spend data, **not zero spend**.

Never add proposed, approved and actual together, and never present a proposed amount as approved or spent. When
you mention an amount, always say which of the three it is and its currency.

## Dates and publications

- A scheduled post is not a published post. The date is the schedule in the planner; only the observation (with
  the date it was observed) says what happened.
- If a scheduled date already passed and the observation does not confirm publication, the post needs
  verification. Say exactly that; do not claim it went out.
- A campaign without dates appears in the calendar's `undated` list with its reason (blocked media or no calendar).

## Copies are literal

Copies are stored exactly as they will be published. Never rewrite, shorten, translate or "fix" them when you quote
them. Mentions, emojis and line breaks are intentional. Character counts are given for platform limits.

## Pieces and versions

- A piece has versions; the current one is the latest. Two versions with the same fingerprint are the same file.
- The original file may live in the team's working folder; the piece still exists in Studio with its versions and
  previews. Do not tell a person a piece "is missing" because its original is not stored in Studio.
- `thumbUrl` and `previewUrl` are temporary links (one to two weeks). Do not store them or hand them out as
  permanent; read the resource again to get fresh ones, or use `studio.asset.preview` to look at the piece.
- An ad configuration (piece + copy + channel + placement + audience + tracking parameters) is not an active ad.
  Look at its `status` and `checksPending`: while there are pending checks, it is not ready to launch.

## Absent is not zero

`null` means the source has no value. It is not zero, not empty, and must not be inferred or filled in. If a field
you need is `null`, say that the information is not recorded.

## Organizations

Each campaign belongs to one organization. Your connection only sees the organizations it is allowed to; the
optional `organizationId` filter narrows the answer and never widens it. A campaign or piece you cannot see answers
as not found — do not speculate about whether it exists.

## What never to claim

- That a campaign is live, unless its launch state is `live_observed`.
- That money was spent, unless there are `actual` lines.
- That a post was published because its scheduled date passed.
- An approval that is not recorded in the states.
- Any number, date or text that the tools did not return.
