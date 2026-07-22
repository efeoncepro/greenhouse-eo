# ADR-NNNN: [Imperative title — what we're deciding]

> Replace `NNNN` with the next sequential number. Use a verb-phrase title (e.g., "Use PostgreSQL with RLS for multi-tenant isolation", "Adopt MCP as the integration layer for Greenhouse data").

## Status

`Proposed` | `Accepted` | `Superseded by ADR-NNNN` | `Deprecated`

## Date

YYYY-MM-DD (the date this status was set)

## Owners and decision authority

- **Decision owner**: [accountable person/team]
- **Implementation owner**: [person/team, if different]
- **Operational owner**: [person/team]
- **Consulted / approving stakeholders**: [roles or STK IDs]

## Decision drivers

> Rank the forces that distinguish the alternatives. Link critical stakeholder concerns and quality scenarios rather than repeating them.

1. [Driver / CON-### / QS-###]
2. [Driver]
3. [Driver]

## Reversibility

`One-way` | `Two-way` | `Two-way but slow`

> Calibrate reversibility to this organization's time, cost, data, contractual, and migration realities; the labels are not universal duration bands.
>
> **One-way**: reversal would be prohibitive or would lose obligations/data/options.
>
> **Two-way**: a tested, bounded reversal path exists.
>
> **Two-way but slow**: reversal is feasible but needs a planned migration or coexistence period.
>
> Describe the reversal path and evidence, not only the label.

## Confidence

`Low` | `Medium` | `High`

> **High**: validated with current evidence; trade-offs well understood; constraints stable.
> **Medium**: thought through, but rests on assumptions that could prove wrong (about scale, vendor behavior, team capacity).
> **Low**: had to decide today; we picked the most reversible option in case we're wrong; flag for early reconsideration.

## Validated as of

YYYY-MM-DD — the date when changeable facts this decision relies on were last verified (vendor pricing, framework version, ecosystem maturity, regulatory text). Use risk-based review triggers below; age alone does not invalidate a decision.

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

### Scope and conformance

- **Applies to**: [systems, domains, environments, future work]
- **Does not apply to**: [explicit exclusions]
- **How conformance is evaluated**: [test, query, review, fitness-function IDs]
- **Exception authority**: [who may approve, required evidence, expiry]

## Alternatives considered

> List each viable alternative and why it was not chosen. Include “do nothing”, delay, or an imposed option when relevant. If the decision is forced by a hard constraint, name that constraint and the evidence instead of inventing alternatives.

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

## Evaluation and review triggers

- **Evidence that the decision is working**: [signals, scenario thresholds, fitness functions]
- **Reconsider when**: [assumption invalidated, threshold breached, incident class, regulation/vendor/ownership change]
- **Review owner**: [person/team]
- **Next scheduled review (only if useful)**: [date / none]
- **Change procedure**: [new ADR, amendment policy, migration/rollback authority]

## Related ADRs (optional)

- Supersedes: ADR-XXXX (if applicable)
- Superseded by: ADR-XXXX (if applicable)
- Related: ADR-XXXX, ADR-XXXX (decisions that interact with this one)

## Sources / evidence

> For decisions that depend on current 2026 reality (vendor pricing, framework versions, ecosystem maturity), cite the sources you validated against, with dates.

- [Source 1 with URL and validated date]
- [Source 2 with URL and validated date]

---

## Skill behavior when generating ADRs

The skill produces ADRs that:

1. **Keep one coherent decision scope per ADR.** Split independently revisitable choices; keep coupled choices together when separating them would hide the real trade-off.
2. **Include all required fields** (Status, Date, Reversibility, Confidence, Validated-as-of, Context, Decision, Alternatives, Consequences). Optional fields are included when relevant.
3. **Have honest Confidence levels.** A `Low` confidence ADR is not a bad ADR — it is honest. The alternative is pretending high confidence and being wrong.
4. **Cite evidence** for any claim that depends on current vendor / framework / pricing reality. Skip the citation only when the claim is universal architecture knowledge (e.g., "Postgres supports ACID transactions").
5. **Prefer a concise decision record.** Move deep analysis and rollout detail to linked artifacts when that improves comprehension; use the length the decision needs.
6. **Preserve accepted rationale as history.** Supersede a changed decision with a new ADR. A governed repository may still update factual metadata, status, backlinks, ownership, or discovered consequences without rewriting what was decided; record material amendments visibly.
7. **Name evaluation and change triggers.** An accepted decision without an owner, evidence path, or reconsideration condition cannot be governed.
