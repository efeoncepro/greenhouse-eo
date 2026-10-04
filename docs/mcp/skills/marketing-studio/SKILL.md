---
name: marketing-studio
description: How to use available Efeonce Marketing Studio MCP tools — find what needs attention, open a campaign, read its pieces, copies, ad configurations, media plan and calendar, look at a piece, use versioned channels and validation findings when available, and report states and budgets without inventing. Load it before answering anything about a campaign, a creative piece, a media budget or a publishing date.
---

# Using Efeonce Marketing Studio

Efeonce Marketing Studio is the system of record for Efeonce campaigns: brief and decisions, creative concepts,
pieces (images and videos) with their versions, literal copies per channel, ad configurations, the media plan and
the publishing calendar. This manual teaches you to use the available `studio.*` tools and interpret their results. It grants no
permission: every call is scoped server-side to the organizations your connection may see.

Discover the tools actually available in the current session before acting. The versioned channel catalog
requires a compatible Studio deployment and gateway configuration. Delegated T1 writes also require the
connection to carry the corresponding authority. T2 actions remain in the operator lane. A name in this manual
or in Studio's provider manifest does not prove federation or permission. If a required tool is absent, report the limitation
and prepare a reviewable proposal; do not claim the write happened or substitute a service identity.

## Recommended flow

1. **Start with `studio.attention.get`.** It lists the decisions that are pending (budgets waiting for approval,
   blocked media, scheduled posts whose date passed without a confirmed publication), the upcoming posts and a
   small inventory. It is derived from recorded states, never a prediction.
2. **Find the campaign.** Use `studio.campaigns.list` to see every visible campaign with its three states and
   counts, or `studio.search` when you only have a word from its name, a piece title or a copy.
3. **Open it with `studio.campaign.get`.** You get its states with the operator's notes, concepts and decisions.
4. **Go to the specific part you need:**
   - pieces → `studio.campaign.assets.list` (paginated, filterable by kind, aspect ratio and concept), then
     `studio.asset.get` for one piece in full: all its versions with their previews, the ad configurations that
     use it and the copies of its concept. Prefer `studio.asset.get` over the preview when the person asks about
     data (format, version, which ads use it); look at the image only when they ask what it shows;
   - to actually look at a piece → `studio.asset.preview`. It returns the image itself: by default the
     thumbnail (longest side 640 px), which is enough to recognize and describe a piece. Ask for
     `size: "preview"` (1600 px) only when you must read fine detail such as small text. For a video it is a
     single frame, not the video; whether the person can watch it in Studio is the piece's `playback` (null = no
     light web version yet), not something you can play;
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

- A piece has versions; the current one is the latest imported or approved version. A newly uploaded version
  may still be pending review and is not automatically current. Two versions with the same fingerprint are the same file.
- The original file may live in the team's working folder; the piece still exists in Studio with its versions and
  previews. Do not tell a person a piece "is missing" because its original is not stored in Studio.
- `playback` is a light web copy of a video for watching in Studio (up to 720 px on the short side). It is not the
  original and not what gets published; its `url` is temporary like the previews. `null` means the piece is not a
  video or its web copy is not ready yet, never that the video is missing.
- `thumbUrl` and `previewUrl` are temporary links (one to two weeks). Do not store them or hand them out as
  permanent; read the resource again to get fresh ones, or use `studio.asset.preview` to look at the piece.
- An ad configuration (piece + copy + channel + placement + audience + tracking parameters) is not an active ad.
  Look at its `status` and `checksPending`: while there are pending checks, it is not ready to launch.

## Absent is not zero

`null` means the source has no value. It is not zero, not empty, and must not be inferred or filled in. If a field
you need is `null`, say that the information is not recorded.

## Organizations

Each campaign belongs to one organization, identified by its canonical Greenhouse organization id. Your connection
only sees the organizations it is allowed to. The optional `organizationId` filter narrows the answer to one of
them and never widens it: asking for an organization your connection cannot see does not reveal anything, it
simply answers as not found. Omit the filter unless the person asked about a specific client.

## When a call fails

| Answer | What it means | What to do |
|---|---|---|
| `authorization_denied` | The person you act for does not hold the Marketing Studio read permission. | Tell them; access is granted in Greenhouse, not by retrying. |
| `not_found` | The campaign or piece does not exist **or** is not visible to this connection. The answer is the same on purpose. | Do not speculate about whether it exists. Check the id, or search with `studio.search`. |
| `invalid_request` | A parameter did not match the tool input (an id, a date, a cursor). | Fix the input; never invent a cursor. |
| `upstream_unavailable` | Studio could not answer right now. | Say the information is temporarily unavailable. Do not fill the gap from memory. |

## What never to claim

- That a campaign is live, unless its launch state is `live_observed`.
- That money was spent, unless there are `actual` lines.
- That a post was published because its scheduled date passed.
- An approval that is not recorded in the states.
- Any number, date or text that the tools did not return.

## Versioned channels and ICP (use only tools available in the session)

- Read `studio.channels.list`, optionally with an exact `version`; `studio.channel.get` gives one channel.
  Keep the returned version with the plan. `studio.channel_catalog.versions.list` describes publication history.
  Published and superseded specifications are immutable; publishing another version does not revalidate content.
- A canonical channel separates modality/family from buying platform and appearance. Market and account belong
  to the activation; LinkedIn personal is an account, and UGC is asset content source. Never infer canonical keys
  from historical values such as `linkedin`, `meta` or `meta-vertical`.
- Tracking is scoped by appearance/placement. Null tracking with an unresolved reason is incomplete coverage,
  not permission to invent UTMs. GA4 classification describes manual traffic only; automatic tagging is separate.
- For legacy channels, read `studio.channel_aliases.list`; propose an exact rawValue → channelKey/version mapping
  for human review. When authorized and available, `studio.channel_alias.map` uses that mapping plus status,
  idempotency key and the alias's current revision when it exists. Mapping an alias does not rewrite old snapshots.
  The operator-only backfill CLI is separate and defaults to dry-run.
- Read `studio.campaign.channel_findings.list` for evidence. `channelCatalogVersion` identifies the original
  validation, and `validatedWithPreviousSpec` means a newer catalog exists, not that the record is invalid.
  `studio.campaign.channels.revalidate` is an explicit T1 write: first dry-run with the campaign revision, review
  findings, then apply when authorized. Only records without hard findings advance; blocked records retain their
  snapshot. Reread findings and affected records after applying.
- Copy remains literal. In warn mode a hard finding can accompany a successful write; that success does not
  certify compliance. In enforce mode blocking findings reject the write. Fix the proposed content or reference
  deliberately, never silently truncate copy to pass.
- Catalog governance uses `studio.channel_catalog.draft.create`, `.draft.channel.upsert`, `.version.publish` and
  `.draft.discard`, with `marketing_studio.catalog.manage` (admin/operations). Catalog scope is global, not a
  fabricated organization. Service tokens cannot govern it. Discard is T2 and is not newly federated by this work.
- `studio.customer_model.get` intersects organization authority and returns a versioned Greenhouse model only
  when the customer-model reader is provisioned. Disabled/unavailable is not an empty model. Never fabricate names or ids.
  `studio.campaign.audience.upsert` stores ids/version/buying role and a bow-tie stage independently of creative
  funnel phase; an explicit pending note is the supported fallback. `.audience.remove` is T2.
  `studio.campaign.customer_model_version.set` reports incompatible references without migrating audiences.

These workflows grant no permission and certify no deployment, approval, media launch or spend.


## API clients and available write tools

The operator has a separate HTTP client for the same versioned API, including file uploads and original downloads.
That client does not expose additional MCP tools or grant your connection its credentials. Discover the tools in
this session; if a needed tool is absent, leave a reviewable proposal and report the limitation.

When a T1 tool is available and authorized, read its current schema and target revision. Validate with dry-run when
supported, keep one idempotency key per logical write and send the required revision. On an uncertain outcome,
reread before retrying; on a revision conflict, resolve the change rather than forcing a newer revision. A successful
write in warn mode may contain hard channel findings: report them and do not treat it as approval.

For uploads, bytes go directly to storage through the ticket, never inside a tool call. The service verifies the
size and recomputed fingerprint before creating a pending-review version. Pending verification is not completion;
resuming confirmation does not resume an interrupted byte transfer. An existing fingerprint can resolve as a
duplicate without creating another version. Preserve usage rights and do not claim that downloading grants a license.

The current catalog separates paid/organic/owned/earned modality, family, buying platform, appearance platforms,
placements and formats; spec version, provenance and verification date belong with decisions. Do not collapse
buying and appearance platforms into a single label or infer a market/account from the channel key. API availability,
local-client support and real MCP delegation are separate facts; approvals remain in the authorized operator lane.
