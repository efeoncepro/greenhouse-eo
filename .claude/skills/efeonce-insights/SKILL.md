---
name: efeonce-insights
description: Operate and extend Efeonce Insights (EPIC-045) — the frozen-edition library (deck/A4/web) over SEO/AEO/ICO evidence, live in production since 2026-09-15. Use when creating or reading Insights editions through API/MCP, when adding a module adapter, when wiring rendering (TASK-1846), charts/catalogs (TASK-1847 v1 in production; editorial contract v2 TASK-1888 deployed and verified by a synthetic Production canary on 2026-09-26 after correcting a trailing newline in the Vercel flag value; the canary sealed three scope lines and a frozen cover, while evidence validation correctly failed on an empty synthetic snapshot), premium catalogs TASK-1889 code complete 2026-09-25, not pushed, rollout pending), sharing/delivery (TASK-1848), the portal UI (TASK-1849) or the Think web render (TASK-1875), when rolling out or rolling back the domain, or when a human asks how an Insights figure was produced. Every EPIC-045 task MUST update this skill at closure (see Skill Maintenance Contract).
---

# Efeonce Insights (living skill)

Efeonce Insights is a **commercial capability inside Greenhouse**: one request per organization and
window produces a versioned, immutable edition whose evidence, plan and (later) outputs share the same
facts. Greenhouse owns library, request, permissions and lifecycle; the Composer owns composition; the
producer modules (SEO, AEO, ICO) own their metrics; Email owns transport; Think renders the shared web.

This skill is the **accumulated operating knowledge of the program**, not a copy of the docs. The
architecture and the ADR say what the domain *is*; this skill says what an agent must know to *work on
it without repeating what already cost a day*. It grows with every task: see the maintenance contract.

## Read order

1. This file (rules + routing).
2. [`references/program-ledger.md`](references/program-ledger.md) — what each task built, what is
   live where, what it left for the next one. **Start here to know the current state.**
3. [`references/architecture-map.md`](references/architecture-map.md) — where every piece lives.
4. [`references/contracts.md`](references/contracts.md) — request, responses, errors, idempotency.
5. [`references/operations.md`](references/operations.md) — flags, module assignment, canaries,
   rollback, deploy traps.
6. [`references/lessons.md`](references/lessons.md) — the traps that already bit someone.
7. Canon docs only when you need the full contract:
   `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§5 windows, §7 API/MCP/authz, §10 gates,
   §14 state), `EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md` (ADR), and the exhaustive
   `EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md` (file-by-file record of the foundation).

## Hard rules (verbatim in `.claude/rules/efeonce-insights.md`, auto-loaded by path)

- **Windows are `[start, endExclusive)` civil dates in an IANA zone**, resolved only by `window.ts`
  (DST two-pass, "previous month" is not 30 days, Feb 29 → Feb 28, max 400 days, never starts in the
  future). NEVER recompute a window inline in an adapter, lane or renderer.
- **Idempotency is `(organization_id, idempotency_key)` + `request_hash`**: same key + same request ⇒
  same edition (`200`, `idempotent: true`); different request ⇒ `409 idempotency_conflict`. NEVER
  create a second edition "to retry"; failed editions are recovered from their phase.
- **Adapters consume only the owner readers** (`readSeoOverviewKpisForWindow`, the AEO run whose
  `asOfDate` falls in the window, the ICO materializers). NEVER import `@/lib/client-portal/*` from
  the domain (it is a leaf of the DAG; lint enforces it) and NEVER read producer tables directly.
- **Sealed snapshot and frozen plan are immutable** (no-update/no-delete triggers, hashes). A
  correction is `revise` → new edition version. NEVER `UPDATE` them, never re-author a frozen plan.
- **Issuing needs validated outputs + a human gate.** The real `InsightOutputsPort` (TASK-1846, wired when
  `commands/index.ts` loads) validates only outputs `completed` with an asset for the SAME audience as the
  edition; a missing one is `not_ready` with `missing`. Ecosystem/MCP actors never issue nor withdraw.
- **Durable rendering is asynchronous and fail-closed** (`render/**`): only `INSIGHT_RENDERABLE_OUTPUTS`
  (`deck_pdf` → catalog `insights-deck`, `report_pdf` → `insights-report`, per `INSIGHT_RENDER_CATALOG_BY_OUTPUT`; both in
  production since release `ebb9212a32ce`, 2026-09-24) can be queued; another target (`web`) is `render_rejected`, never
  "for later". A render request whose outputs already exist answers `200 idempotent:true` with the previous run. The mapper NEVER
  truncates a figure or a claim to fit a slot (it rejects with the cause). Lease and fencing ship together:
  finalization presents the `fence_token` or writes nothing. `INSIGHTS_RENDER_ENABLED` is read in THREE runtimes
  (Vercel to queue, the `ops-worker` dispatcher that launches the Job, the `artifact-worker` Job to claim) and must
  be ON in all three. Job and ops-worker are single instances shared by staging and production: the per-environment
  product gate is the Vercel enqueue, never a lane-dependent Job config. Throughput is 1 output per 2-min tick.
  Live in staging AND production since 2026-09-16 (release `917491fd02e4`, flag ON in the three runtimes, gateway
  v1.6.0). A cold Job start can make the dispatcher launch TWO executions for one output; claim + fencing let only
  one finalize — expected, not a double render.
- **Three access planes on every command** (`authz.ts`): module `insights_v1` assigned per organization
  + capability `insights.*` + audience. An organization without the module is `not_found` (404
  anti-oracle), never `403`. Clients see evidence/plan only of issued editions.
- **Flags are multi-gate and default OFF**: `INSIGHTS_GENERATION_ENABLED` (create/revise),
  `INSIGHTS_ISSUANCE_ENABLED` (issue), `INSIGHTS_AUTHORING_AI_ENABLED` (Gemini). Since TASK-1848 the
  `ops-worker` also reads `INSIGHTS_GENERATION_ENABLED`, `INSIGHTS_DELIVERY_ENABLED` and `INSIGHTS_SCHEDULES_ENABLED`
  (declared in its `deploy.sh`); a worker that reads one must declare it in its `deploy.sh`. A Vercel deployment created
  before `vercel env add` does not see the variable: redeploy.
- **Share links (TASK-1848): the bearer is never persisted** — not even encrypted; only its sha256 digest. It is
  returned once on create and lives only in memory during an email send. A lost link is revoked and replaced, never
  recovered. Only ISSUED client editions; TTL 1–90 days (default 30); max 20 active links per edition (429
  `quota_exceeded`). Revoking works with the flag OFF and never reactivates; withdrawing an edition revokes its live
  grants (`edition_withdrawn`). The access log is not proof of reading.
- **The public reader is anti-oracle and uncacheable**: `404` for unknown/malformed/expired/flag OFF/suspended org/
  retired module (indistinguishable), `410` revoked or withdrawn, `429` rate limit that FAILS CLOSED, and always
  `Cache-Control: private, no-store` + `noindex`. Never copy the Grader's link (token in clear, `public, max-age=300`).
  Think consumes it server-side as `InsightWebModelV1` (`modelVersion '1.0'`, client-facing projection only). NEVER
  probe its limits with concurrent bursts: the DB-backed limiter spends a connection before rejecting (ISSUE-174).
- **Email delivery and schedule writes are App lane only, human internal actor** (capabilities without `own`: a
  client never sends). Ecosystem lane and MCP only read deliveries and schedules; MCP never sends email.
- **Schedules never issue nor send**: `review_policy = 'draft_for_review'` (DB CHECK); each occurrence creates the
  edition and requests its render, then stops at `ready_for_review`. A revoked authority or missing module pauses it.
- **An `ambiguous` delivery is reconciled against the email ledger, never resent blindly**; a definitive failure
  revokes its grant and a retry issues a new one with a per-attempt correlation (`…:aN`). Accepted ≠ delivered ≠ read.
  The link email uses the token-sensitive EmailType: its grant is issued in the same transaction that claims the
  `email_deliveries` row. EmailTypes are seeded OFF (the config table fails open without a row).
- **TASK-1848 state (2026-09-18):** in production since release `bda1cf2cd938` with sharing/delivery/schedules flags
  OFF there (ON in staging) until the Think reader (TASK-1875) exists. Gateway `efeonce-mcp` 1.7.0 federates the 7 tools
  (58 total): share create/revoke require `efeonce.mcp.insights.write` (no client carries it ⇒ fail-closed), the 5
  reads use the base scope; sending email and scheduling do not exist over MCP.
- **Figures are never invented, never "0" when absent.** `no_data`, `unsupported_window`,
  `insufficient_data` are rejections recorded in the snapshot and shown as limits in the plan. The AI
  author only rewrites validated text; if a figure changes, the deterministic plan wins.
- **Federating an MCP tool is part of "done"**: manifest entry in Greenhouse → sync to the gateway →
  policy + scope class → parity test → surface baseline → version bump → canary. A write tool gets a
  blast-radius scope class (`efeonce.mcp.insights.write` exists; never wire it into the shared PKCE client).
- **Vocabulary**: editions created by canaries are **synthetic** (org sandbox "Greenhouse Demo");
  "production" names the runtime, not the nature of the data. Never write "real editions in production"
  for them — it made a peer session stop a rehearsal.

## Routing

- Rendering, PDF/deck, Artifact Worker → `references/program-ledger.md` § TASK-1846 + `artifact-composer` docs; Proposal stays a compatible consumer adapter (behaviour untouched).
- Charts/catalogs → `dataviz-design` + `deck-studio` + TASK-1847 (v1 catalogs, what production serves today).
  Contract changes (15 chart families, per-figure reading, `channelId`, sealed cover) → TASK-1888 (code deployed
  since 2026-09-26; staging and ops-worker flag ON; Production v2 plan verified by synthetic canary after correcting
  the exact Vercel flag value; see `references/contracts.md` § Editorial contract v2 and `references/program-ledger.md`).
  Premium A4/deck templates → TASK-1889 (code complete 2026-09-25 in local `develop`, not pushed; see
  `references/contracts.md` § Render contract of the premium catalogs and `references/operations.md` § TASK-1889) with the approved direction
  `docs/ui/visual-directions/TASK-1889-efeonce-insights-premium-catalogs-direction.md`, its wireframe and its fidelity
  contract (41 reference pages in `…/TASK-1889-efeonce-insights-premium-catalogs/paginas/`, `pixelmatch` 0.1, ≤ 1 % of
  differing pixels per page). **The approved canvas is built but not deployed:** until TASK-1889 releases with
  `INSIGHTS_EDITORIAL_V2_ENABLED`, every report comes out with the v1 design — never describe the redesign as live.
- Brand graphic line «La órbita» (canonical for the Efeonce brand since 2026-09-25; manual
  `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md`, operational reference
  [`graphic-line-orbit.md`](../efeonce-brand-studio/references/graphic-line-orbit.md)): the orbit was born in the
  Insights covers (`insights-report/report-cover*.html`, `report-back-cover.html`), and the brand canvas tested it
  over Insights as boards **P-01 (A4 report)** and **P-02 (plan/deck)**. That is a **canvas proposal, not adopted**:
  it is not implemented in the runtime catalogs (those are governed by TASK-1889). Never describe P-01/P-02 as the
  Insights design, and never add the orbit to a catalog outside that task. The URL bubble in the Insights report and
  deck **footers** stays as it is: the operator's 2026-09-26 signature rule (centered Efeonce logo; the bubble only
  when the logo is already inside the image) governs graphic pieces such as social posts and ads, not report footers.
  The catalogs' `assets/url-lum.svg` copies are the `url-bubble-source` drawing of `@efeoncepro/axis-brand-assets`,
  guarded by `src/config/efeonce-brand-assets.test.ts` — never edit them by hand.
- Sharing/email/schedules → `resend-email-platform`, `greenhouse-email` + TASK-1848.
- Portal UI → `greenhouse-ux` + `greenhouse-ai-design-studio` + TASK-1849 (Composition Shell, GVC).
- Shared web render → `efeonce-think` repo + `astro` skill + TASK-1875 (headless model, token server-side).
- Metrics semantics → `greenhouse-ico`, `seo-aeo`, growth SEO docs; never re-derive a formula here.
- MCP exposure/federation → `efeonce-mcp-platform` + `mcp-craft`.
- Release/rollback → `greenhouse-production-release` (+ `references/operations.md` here for the domain specifics).

## Skill Maintenance Contract (binding for every EPIC-045 task and every session that builds Insights)

A task of EPIC-045 (TASK-1846, 1847, 1848, 1849, 1875, 1888, 1889 and any future child) is **not closable** until
this skill reflects what it built. At closure, in the same commit as the task's lifecycle change:

1. `references/program-ledger.md`: fill your task's row and section — what exists, commits/SHAs,
   what is deployed where (runtime × component × state × evidence), flags and their state, what you
   deliberately left out, and the exact hand-off to the next task.
2. `references/architecture-map.md`: add/adjust every new file, table, route, tool, worker, event,
   signal or flag with one line of responsibility.
3. `references/contracts.md`: any new/changed field, enum, error code, HTTP status, idempotency rule,
   projection rule or tool input shape. Keep the "verified against" date.
4. `references/operations.md`: any new flag (and its runtime), env var, canary recipe, rollback step,
   assignment/provisioning step, or deploy trap.
5. `references/lessons.md`: every trap that cost more than 15 minutes, with the date, the symptom and
   the rule that avoids it. Traps are the most valuable content of this skill.
6. `SKILL.md`: update the description/frontmatter if the trigger surface changed; add a hard rule only
   if a new invariant was born (verified in code, not aspirational).
7. Mirror to `.codex/skills/efeonce-insights/` (`rsync -a --delete .claude/skills/efeonce-insights/ .codex/skills/efeonce-insights/`), run
   `pnpm skills:mirrors`, and if `docs/mcp/skills/efeonce-insights/SKILL.md` (the MCP-served manual)
   needs the same knowledge for an external agent, update it too and regenerate with
   `pnpm mcp:skills:generate` + `pnpm mcp:skills:check` (no TASK ids, paths, UUIDs, org ids, secrets).

Sessions that do partial work (a slice, a canary, an incident) append to `references/lessons.md`
and to the ledger's "sessions" list immediately, not at task closure. Codex, Claude and Cursor all
own this contract; the `.codex/` mirror is the same file, so edit `.claude/` and mirror.

## Verification that counts

- Unit: `pnpm vitest run src/lib/efeonce-insights src/lib/api-platform/resources` (+ MCP tests
  `src/mcp/greenhouse`) — states/matrix parity, windows (DST, Feb 29, custom overlap), adapters
  (unsupported_window, no_data ≠ 0, RpA suppressed, OTD denominator), editorial (figure guard),
  commands (idempotency, authz, three planes), lanes (same error table), manifest/skill leak tests.
- Live: `pnpm test:live` for `stores.live.test.ts` (org isolation, triggers, code sequence).
- Runtime: the canaries in `references/operations.md` against staging and production, per lane, with
  the synthetic organization; a deny (404) on an organization without the module is part of every canary.
- Catalogs: `pnpm composer:visual-gate --catalog=insights` (scoped; never re-freeze `deck-axis`/SKY frames) and a real
  PDF opened page by page — a render canary needs an organization with data, not the sandbox (see `operations.md`).
- Docs: `pnpm task:lint`, `pnpm docs:context-check:strict`, `pnpm skills:mirrors`, `pnpm mcp:skills:check`.
