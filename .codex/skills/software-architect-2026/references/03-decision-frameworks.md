# Decision Frameworks

Architecture is the accumulation of decisions. The decisions that matter — the ones worth documenting — share a few traits: they affect the system's structure or quality attributes, they involve real trade-offs, and they're hard to reverse later. Most "decisions" don't qualify; they're operational choices that don't need a record.

This file gives you the frameworks to identify which decisions to record, how to write them, how to compare options rigorously, and how to handle the special cases (low-confidence decisions, decisions made under time pressure, decisions that supersede previous ones).

## When a decision deserves an ADR

Write an ADR when **at least two** of the following are true:

- The decision is **architecturally significant** (affects system structure, key quality attribute, or is hard to reverse)
- There are **real alternatives** that were considered (not just one option)
- The **rationale will be questioned later** by a teammate, a successor, or an auditor
- The decision **constrains future work** (other decisions depend on this one)
- The decision **costs more than 1-2 weeks** to undo

Don't write ADRs for: variable naming, file organization within a module, choice of npm package for a one-off utility, or any decision a single engineer can reverse in a day without consequences.

When in doubt, the heuristic is: "If a new senior engineer joined the team and asked 'why did you do it this way?', would they expect a written answer?" If yes, write the ADR.

## The two-way door / one-way door framework

Borrowed from Bezos. Every decision is one of:

**Two-way door** — reversible. You can walk through, see the consequences, and walk back. Most decisions are two-way doors. Move fast on these. Don't over-document.

**One-way door** — irreversible (or expensive to reverse). Once you commit, the cost of going back is high enough that it's effectively a permanent decision.

Examples:

| Decision | Door type | Why |
|---|---|---|
| Choice of database (Postgres vs MongoDB) | One-way (mostly) | Migrating production data is months of work |
| Choice of cloud provider (AWS vs GCP vs Azure) | One-way | Re-platforming costs quarters, not weeks |
| Multi-tenancy pattern (shared / schema / silo) | One-way | Migrating tenants is a 6-12 month project |
| Programming language for a service | Mostly one-way | Rewriting takes months unless the service is trivial |
| API contract (v1 published to customers) | One-way | Breaking changes erode trust |
| Choice of UI component library | Two-way (slow) | Replacable but tedious; weeks-to-months |
| Specific npm package for a utility | Two-way (fast) | Swap in a day |
| Frontend framework (React vs Vue) | One-way for an existing app | Two-way for a greenfield prototype |
| Auth provider (Auth0 vs Clerk vs custom) | One-way (mostly) | User store migration is painful |
| Choice of LLM (Anthropic vs OpenAI vs Gemini) | Two-way *if* you wrap behind an interface; one-way if not | Design for swappability, treat as two-way |
| Open vs closed table format (Iceberg vs proprietary) | One-way at scale | Reformatting petabytes is real work |

**Rule**: spend the architecture energy on one-way doors. For two-way doors, decide quickly, document briefly (or not at all), and adjust later.

## ADR anatomy (2026 version)

The classic Nygard format (Context / Decision / Consequences) is the foundation. The 2026 version adds three fields that account for AI-accelerated development reality.

### Required fields

**Title**: Short imperative phrase (e.g., "Use PostgreSQL for OLTP", "Choose Anthropic API for Kortex intelligence layer"). One decision per ADR.

**Status**: Proposed | Accepted | Superseded by ADR-XXX | Deprecated

**Date**: When the decision was made (the date the ADR was Accepted, not Proposed).

**Context**: The forces at play. What problem are we solving, what are the constraints, what's pushing us to decide now? Keep this concrete and scoped to this decision.

**Decision**: What we decided, in a sentence or two. The "we will..." sentence.

**Alternatives considered**: For each meaningful alternative, list it with one or two sentences on why it was not chosen. If you didn't seriously consider any alternatives, the decision is probably not significant enough to warrant an ADR — or you didn't think hard enough.

**Consequences**: What changes because of this decision. Both positive and negative. What does this enable, what does this prevent, what does this cost?

### New in 2026

**Reversibility**: One-way / Two-way / Two-way-but-slow. Explicitly state how hard this is to undo. If it's one-way, name what would have to change for the team to reconsider.

**Confidence**: Low / Medium / High. Honest labels. Low means "we picked this because we had to decide today, but we could be wrong"; high means "we've validated this with research and the trade-offs are well understood." Low-confidence decisions are flagged for early reconsideration as evidence accumulates.

**Validated as of**: YYYY-MM-DD. The date you verified the facts that this decision rests on (vendor pricing, framework version, ecosystem maturity). If a year passes without validation, treat the ADR as suspect.

### Optional but useful

**Supersedes / Superseded by**: Link to prior or successor ADR. ADRs are append-only — never edit an Accepted ADR. If the decision changes, write a new ADR that references the old one.

**Related ADRs**: Other decisions in the log that interact with this one.

**Implementation notes**: For multi-step migrations or rollouts, brief notes on how the decision is being executed.

## Writing the Context section well

The Context is the part most ADRs get wrong. Common failure modes:

- **Too long**: rehashing the entire system. If the reader needs to know the whole system to understand this decision, the decision is too entangled.
- **Too vague**: "We needed a database." That's not context, that's a category.
- **Hides the actual forces**: the real reason something was decided was schedule pressure, but the ADR claims technical superiority.

A good Context names:

1. The **problem** (not the solution direction).
2. The **constraints** that bound the solution space.
3. The **forces** pushing toward different alternatives.
4. The **deadline pressure** if any (be honest).

Example of a good Context (~150 words):

> We need to choose a multi-tenancy pattern for Kortex, which targets HubSpot agencies (each a tenant) managing N HubSpot portals (each tenant's clients). Expected scale at 12 months: 50 tenant agencies, ~500 client portals total, ~5GB data per portal. Hard constraints: (a) HubSpot data residency varies by tenant; (b) some agencies will require enterprise compliance (SOC 2 Type II) by Q4. Soft constraints: (a) operational burden — we're a small team; (b) reuse of Greenhouse Postgres patterns. Forces: shared-schema is cheapest to operate but doesn't isolate enterprise tenants; schema-per-tenant adds operational cost but isolates well; database-per-tenant is overkill for current scale. We need to decide before infrastructure provisioning in two weeks.

## Trade-off matrix

When the decision involves comparing real alternatives across multiple criteria, use a trade-off matrix. The matrix forces you to articulate criteria and to evaluate every option against every criterion — which catches the case where you fell in love with one option and didn't evaluate the others fairly.

### Structure

| Criterion | Weight | Option A | Option B | Option C |
|---|---|---|---|---|
| Tenant isolation | High | Medium (RLS) | High (schema) | High (silo) |
| Operational cost | High | Low | Medium | High |
| Migration to enterprise tier | High | Easy (move tenant to silo) | Medium | N/A (already silo) |
| Team familiarity | Medium | High | Medium | Low |
| Scaling path | High | Up to ~5k tenants | Up to ~500 tenants | Bounded by ops capacity |
| Cost at scale | Medium | Best | Medium | Worst |

### Rules for a useful matrix

1. **Pick 4-7 criteria.** Fewer is shallow, more is noise.
2. **Weight criteria** as High / Medium / Low. Don't give numbers; the precision is fake.
3. **Use qualitative cells** ("Low", "Medium / mitigated by X", "Hard — requires Y") rather than numeric scores. Numbers in a qualitative comparison are almost always made up.
4. **Identify dealbreakers** explicitly. If Option B fails on a High-weight dealbreaker, it's eliminated, not "weighted down."
5. **Annotate**, don't just mark. "Medium (RLS)" tells the reader what kind of medium.

The matrix doesn't tell you which option to pick. It makes the choice visible. The pick still requires judgment about which trade-offs hurt least.

## Confidence levels and what they mean

| Confidence | Meaning | What to do |
|---|---|---|
| **High** | We've validated the decision with current evidence; the trade-offs are well understood; the constraints are stable. | Proceed; revalidate in 12 months as a routine. |
| **Medium** | We've thought it through, but we have some assumptions (about scale, about a vendor's behavior, about team capacity) that could be wrong. | Proceed; flag the assumptions; revisit when evidence arrives. |
| **Low** | We had to decide today and we're not sure. We picked the option that's most reversible if we're wrong. | Proceed; write a follow-up note about what would force reconsideration; revisit at the next planning cycle. |

A Low confidence ADR is **not a bad ADR**. It is honest. The alternative — pretending high confidence and being wrong — is worse.

When you see a Low confidence ADR in the log, treat it as a flag: this decision deserves attention sooner.

## How to handle a decision that was already made implicitly

In an audit (Step 0 mode = Audit), you'll find decisions that were never written down. Things "the way we do it" with no record of why. Write **retroactive ADRs** for the most consequential of these:

- Title and Decision are obvious from current state.
- Context is reconstructed from interviews, commit history, or inference.
- Status is "Accepted" with a note: "Retroactive — decision made in [approximate period], formalized [today]."
- Confidence is Medium at best (because reconstruction is imperfect).
- Validated as of: today's date, with explicit notes on what the audit validated.

Retroactive ADRs are valuable: they make implicit assumptions explicit, which is a precondition to challenging them.

## Append-only discipline

ADRs are an **append-only log**. You don't edit an Accepted ADR.

If the decision changes:

1. Write a new ADR (next number in sequence).
2. Set the new ADR's "Supersedes" to the old ADR.
3. Edit the old ADR's status to "Superseded by ADR-NNN" — this is the only edit allowed.

This preserves the history of thinking. A future engineer looking at the log can see not just "we use Postgres" but "we considered MongoDB in 2024 (ADR-0007), switched to Postgres in 2026 (ADR-0042 supersedes ADR-0007), and the trigger was the discovery that we needed transactional joins."

## Decision-making techniques

Different kinds of decisions benefit from different techniques.

**For technical choices with clear criteria**: Trade-off matrix.

**For decisions involving non-obvious second-order effects**: Pre-mortem. "Imagine it's 12 months from now and this decision turned out to be wrong. What's the most likely reason?" Run this before committing.

**For decisions where the team is divided**: Disagree-and-commit. Document the dissent in the Consequences section ("This decision was made over the objection of X, who argued Y. We accept the risk that Y is correct because Z."). The dissenter's position is in the record.

**For decisions made under heavy uncertainty**: Spike. A time-boxed (1-3 days) experiment that produces evidence, then a full ADR. The spike's result is referenced from the ADR.

**For decisions with strong ego attachments**: Blind comparison. Each team member writes their preferred option independently before the discussion. Reveal simultaneously. Discussion is forced to engage with the merits, not the personalities.

**For decisions in agentic/AI contexts**: Run the decision past a "red team" version of the LLM. Prompt: "Here's the proposed architecture. What are the top 3 ways this fails in 18 months?" The output isn't truth, but it's a cheap way to surface obvious failure modes you missed.

## Anti-patterns to avoid

- **The novel-length ADR**: 5+ pages of prose. The reader gives up. Keep ADRs to 1-2 pages of dense, useful content.
- **The wallpaper alternative**: listing alternatives that were never seriously considered, just to look thorough. Be honest — "we considered MongoDB but didn't seriously evaluate it because [reason]" is fine.
- **The retro-justification**: writing the ADR after the code is in production, with the decision section reverse-engineered from what's already built. Worse than no ADR.
- **The "we'll figure it out later" ADR**: punting hard questions to "future work". If you can't answer them, the decision isn't ready.
- **The ADR that doesn't actually decide**: "We're considering X or Y." Write the ADR when you decide. Until then, it's a design doc, not an ADR.
- **The ADR with no Consequences section**: half the value of the ADR is naming what changes. Without consequences, future engineers don't know what to expect when they touch this part of the system.

## Storage and discoverability

ADRs live in the repo. `docs/adr/` or `docs/decisions/`. One markdown file per ADR, named `NNNN-short-title.md` where NNNN is a zero-padded sequence (0001, 0002...).

A `README.md` in that directory lists all ADRs in a table with title, status, and date. Updated whenever a new ADR is added.

Cross-link from code where useful: a comment in a critical file pointing to the ADR that explains why it's structured this way ("see docs/adr/0042-multi-tenancy-pattern.md").

If the repo has multiple services, each service can have its own ADR log, but cross-cutting decisions go in a top-level `docs/adr/`.
