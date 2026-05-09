# ADR-NNNN: [Imperative title — what we're deciding]

> Replace `NNNN` with the next sequential number. Use a verb-phrase title (e.g., "Use PostgreSQL with RLS for multi-tenant isolation", "Adopt MCP as the integration layer for Greenhouse data").

## Status

`Proposed` | `Accepted` | `Superseded by ADR-NNNN` | `Deprecated`

## Date

YYYY-MM-DD (the date this status was set)

## Reversibility

`One-way` | `Two-way` | `Two-way but slow`

> **One-way**: undoing this costs more than 1 quarter of effort.
> **Two-way**: undoing this costs days to weeks.
> **Two-way but slow**: undoing this is feasible but costs weeks to a couple months.
>
> If one-way, also describe what would force reconsideration: "We would reconsider this if [specific trigger]."

## Confidence

`Low` | `Medium` | `High`

> **High**: validated with current evidence; trade-offs well understood; constraints stable.
> **Medium**: thought through, but rests on assumptions that could prove wrong (about scale, vendor behavior, team capacity).
> **Low**: had to decide today; we picked the most reversible option in case we're wrong; flag for early reconsideration.

## Validated as of

YYYY-MM-DD — the date when the facts this decision relies on were last verified (vendor pricing, framework version, ecosystem maturity, regulatory text). After 12 months without re-validation, treat the ADR as suspect.

## Context

> The forces at play. What problem are we solving? What constraints bound the solution space? What's pushing us to decide now? Be honest about deadline pressure if any.
>
> Keep this concrete and scoped to this decision. If the reader needs to understand the entire system to follow this section, the decision is too entangled — split the ADR or write a separate context document and link it.
>
> Aim for 100-200 words.

[Replace this with the actual context]

## Decision

> What we decided, in 1-3 sentences. "We will [X]." Make it precise enough that an engineer could implement against it without ambiguity.

[Replace this with the actual decision]

## Alternatives considered

> List each meaningful alternative with one or two sentences on why it was not chosen. If no alternatives were seriously considered, the decision is probably not significant enough for an ADR — or you didn't think hard enough.

### Alternative 1: [name]

[1-2 sentences: what it is, why not chosen]

### Alternative 2: [name]

[1-2 sentences]

### Alternative 3: [name]

[1-2 sentences]

## Consequences

> What changes because of this decision. Both positive and negative.

### Positive

- [What this enables]
- [What this makes easier]
- [What problem it solves]

### Negative

- [What this prevents or makes harder]
- [What it costs (operationally, in complexity, in lock-in)]
- [What new failure modes it introduces]

### Neutral / contextual

- [Things that are neither clearly good nor bad — facts about the new state]

## Implementation notes (optional)

> If the decision involves a multi-step rollout or migration, brief notes on how it's being executed. For complex migrations, link to a separate plan document.

## Related ADRs (optional)

- Supersedes: ADR-XXXX (if applicable)
- Superseded by: ADR-XXXX (if applicable; this is the only edit allowed on an Accepted ADR)
- Related: ADR-XXXX, ADR-XXXX (decisions that interact with this one)

## Sources / evidence (optional but recommended)

> For decisions that depend on current 2026 reality (vendor pricing, framework versions, ecosystem maturity), cite the sources you validated against, with dates.

- [Source 1 with URL and validated date]
- [Source 2 with URL and validated date]

---

## Skill behavior when generating ADRs

The skill produces ADRs that:

1. **State exactly one decision per ADR.** If you find yourself writing about two decisions, split into two ADRs.
2. **Include all required fields** (Status, Date, Reversibility, Confidence, Validated-as-of, Context, Decision, Alternatives, Consequences). Optional fields are included when relevant.
3. **Have honest Confidence levels.** A `Low` confidence ADR is not a bad ADR — it is honest. The alternative is pretending high confidence and being wrong.
4. **Cite evidence** for any claim that depends on current vendor / framework / pricing reality. Skip the citation only when the claim is universal architecture knowledge (e.g., "Postgres supports ACID transactions").
5. **Keep length 1-2 pages.** If the ADR is longer, the decision is probably too coupled or the writer is over-explaining.
6. **Never edit an Accepted ADR.** If the decision changes, write a new ADR with `Supersedes`. The old ADR's status becomes `Superseded by ADR-NNNN` — that is the only edit allowed.
