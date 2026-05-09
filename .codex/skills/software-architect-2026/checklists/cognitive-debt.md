# Cognitive Debt Checklist

> Run during Step 6 (self-critique) of every design. Always. The point is to surface debt that's about to be created, not just track debt that exists.
>
> See `references/10-cognitive-debt.md` for the full theory.

## Legibility check

- [ ] **A senior engineer with no context could understand this design from the spec alone in <30 minutes**
  - If no: what's making it hard? Too many novel abstractions? Missing diagrams? Too coupled to other systems?
- [ ] **The architecture spec is current** (not 6 months old with major drift)
- [ ] **Diagrams (C4 L1 + L2 minimum) exist and reflect current state** (not aspirational)
- [ ] **The "why" of the design is captured somewhere** (not just the "what")

## Decision documentation

- [ ] **All major decisions have ADRs**
- [ ] **ADRs are honest** (confidence levels accurate; alternatives genuinely considered)
- [ ] **ADRs are append-only** (no edits to Accepted ADRs; superseding ADRs created when decisions change)
- [ ] **ADRs are validated**: dates on them are recent enough to be trusted

## Conventions enforced

- [ ] **CONSTITUTION (or equivalent) exists** documenting invariants
- [ ] **Naming conventions documented**: file structure, IDs, function naming
- [ ] **One way to do common things**: auth, error handling, DB queries, background jobs
- [ ] **The agent loads the conventions** when generating code (skill or rule)
- [ ] **The team follows the conventions** in human-written code too

## Boring architecture

- [ ] **The design uses well-known patterns** for 80%+ of the system
- [ ] **Novel abstractions are justified** (not "for future flexibility" but "we've needed this 3 times")
- [ ] **Modular monolith preferred over microservices** unless there's a real reason
- [ ] **Three-layer abstraction depth maximum** unless complexity genuinely demands more
- [ ] **A senior engineer can explain it on a whiteboard in 5 minutes**

## Reuse before create

- [ ] **Existing components / services / patterns identified** that this work could leverage
- [ ] **The design extends rather than parallels** where reuse is possible
- [ ] **Where novel work is justified, the rationale is documented**
- [ ] **The skill itself reuses existing skills** (doesn't duplicate doc-creation patterns from `xlsx`, `docx`, `pptx`)

## Agent-generated code mitigations

- [ ] **The architect (human) understands the design** they're handing to the agent
- [ ] **The agent will follow conventions** because conventions are documented in the loaded context
- [ ] **The implementer (agent or human) is expected to ask questions** if the spec is ambiguous, not to invent answers
- [ ] **Code review by a human will check** not just correctness but adherence to design intent
- [ ] **The 18-month test passes**: if the architect leaves and is replaced, can the new architect maintain the system?

## Onboarding / knowledge transfer

- [ ] **A new engineer joining the team in 6 months could navigate this system** by reading the docs
- [ ] **Critical "tribal knowledge" is documented**, not just in someone's head
- [ ] **Runbooks exist for the most likely incidents**
- [ ] **The system's structure communicates intent** (file layout, module names, public API surface)

## Anti-patterns to flag

If any of these are present, **call them out in the self-critique output**:

### "We'll figure it out"
- [ ] Is any part of the design described as "we'll figure out the details later"?
  - If yes: name the parts. Defer-to-later is fine when intentional, dangerous when it's hiding unresolved complexity.

### Implicit decisions
- [ ] Are there architectural choices that aren't in any ADR?
  - Common culprits: language choice, framework version, hosting platform, auth provider — these are sometimes treated as "obvious" and never documented. Document them.

### Single point of human knowledge
- [ ] Is there exactly one person who can explain a critical part of the system?
  - If yes: get it written down before that person leaves.

### Multiple ways to do the same thing
- [ ] Are there two or three different ways the codebase does common operations (auth, logging, DB queries)?
  - Pick one, document it, refactor toward it. Or accept the inconsistency consciously and document why.

### Speculative abstractions
- [ ] Are there abstractions in the design that exist for "future flexibility" without proven need?
  - The cost of a bad abstraction is higher than the cost of small duplication. Push back on speculative abstractions.

### Documentation drift
- [ ] Are there docs you stopped trusting because they're stale?
  - Stale docs are worse than no docs. Either update or delete.

## Mitigation prompts

If cognitive debt risk is significant, the design should include:

- **Documentation requirements**: what must exist before the system goes to production
- **Onboarding test plan**: how the team will validate cognitive debt isn't accumulating
- **Refactor budget**: time allocated each sprint / quarter to pay down debt before it compounds
- **CONSTITUTION updates** as new patterns emerge

## Specific to skill-using systems (Efeonce overlay)

- [ ] **The IDD methodology is applied** if working in Efeonce repos (CONSTITUTION, TASK docs, plan.md)
- [ ] **The TASK docs serve as documentation** for the agent and the team
- [ ] **Plan Mode Protocol** runs for P0/P1 work
- [ ] **Agent corrections propagate** to the CONSTITUTION when they reveal new invariants

---

## Output of this checklist

The self-critique output should include a **Cognitive Debt section** that names:

- **Specific risks** (not generic "could become hard to maintain" but "the agent built the financial intelligence layer alone; if that engineer leaves, the team loses understanding of how the alert thresholds are computed")
- **Specific mitigations** (not "improve documentation" but "write ADR-XXX documenting the alert threshold logic; add it to the architecture spec; have someone other than the original author review")
- **Specific cadence** (not "review periodically" but "monthly architecture review with onboarding test on one module")

If cognitive debt risk is **High**, the recommendation should call this out as the top risk to mitigate, ahead of technical risks.

The honest reality: cognitive debt is the risk the team will be carrying in 12-18 months, after most of this code has shipped. Designing against it now costs days. Discovering it later costs months.
