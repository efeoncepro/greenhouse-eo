# Greenhouse Software Architect Skill Governance V1

> **Status:** Accepted
> **Date:** 2026-07-22
> **Scope:** Codex agent workflow, architecture method, evidence, maintenance

## Context

The repository architecture skill had useful patterns but mixed durable method with dated vendor
claims, copied Greenhouse contracts into an overlay, and lacked a source inventory, deterministic
integrity checks, and a repeatable evaluation suite. That made freshness and regression quality
depend on manual review.

## Decision

Greenhouse adopts a governed, progressively disclosed architecture skill with these properties:

1. The installed identifier `software-architect-2026` remains temporarily stable for compatibility,
   while its behavior and display name are year-neutral.
2. `SKILL.md` is the concise method and router. Specialist material lives one level below in
   references, checklists, templates, and the Efeonce routing overlay.
3. The method separates stakeholder concerns, architecturally significant requirements, measurable
   quality scenarios, views, decisions, distributed contracts, evolution, fitness functions, and
   operational readiness.
4. AI and agentic systems use an explicit autonomy/evidence model: deterministic control owns
   authorization and effects; evaluation, abstention, isolation, recovery, and promotion gates are
   first-class.
5. Volatile technology, price, version, legal, provider, and benchmark facts are resolved at use
   time. A machine-readable source catalog records authority, volatility, owner, verification date,
   and review date; it is not a vendored copy of external content.
6. A deterministic local validator checks structure, links, budgets, stale high-risk statements,
   source metadata, and the external evaluation schema.
7. Evaluation scenarios and acceptance criteria live outside the skill at
   `evals/software-architect-2026/` so agents under test cannot read expected answers by loading the
   skill.
8. The Claude architecture skill remains independently governed and outside this decision's scope.
9. Maintenance is review-driven, not automatic mutation: refresh due sources, run integrity and
   blind regression tests, review the diff, then update deliberately.

## Alternatives considered

### Keep the existing monolithic skill

Rejected. It preserved accumulated detail but coupled methodology to stale implementation facts and
provided no reproducible quality gate.

### Replace it with links to external frameworks

Rejected. External standards are useful authority, but links alone do not produce a practical,
risk-scaled workflow or Greenhouse handoff.

### Auto-update the skill from remote sources

Rejected. Remote mutation would introduce supply-chain, licensing, semantic drift, and review risks.
The catalog supports scheduled review without making the network a write authority.

### Create a new year-named skill immediately

Deferred. Renaming now would break existing routers and prompts. A later compatibility migration may
introduce a neutral identifier with an explicit deprecation window.

## Consequences

- Architecture responses should become more evidence-based, testable, operable, and appropriately
  restrained, including for distributed and agentic systems.
- The method can evolve without inflating the entrypoint or duplicating Greenhouse domain truth.
- Maintainers now own review dates and eval quality for the Codex skill.
- The source catalog proves provenance and freshness metadata, not that every source remains correct;
  human review and runtime verification remain mandatory.

## Verification and maintenance

Run:

```bash
python3 .codex/skills/software-architect-2026/scripts/validate_architecture_skill.py
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  .codex/skills/software-architect-2026
```

Then execute the blind protocol in `evals/software-architect-2026/protocol.md`, compare against the
frozen prior version, and record failures before accepting a material method change. Review the
source catalog on or before each `review_by` date and whenever a cited standard publishes a new
stable release.

Initial representative A/B evidence is recorded in
[`SOFTWARE_ARCHITECT_SKILL_REGRESSION_2026-07-22.md`](../audits/SOFTWARE_ARCHITECT_SKILL_REGRESSION_2026-07-22.md).

## Revisit when

- the installed identifier can be migrated without breaking routers;
- the agent runtime offers a native skill evaluation harness or signed update channel;
- a new architecture domain repeatedly requires enough material to justify its own specialist skill;
- blind regressions reveal that the entrypoint or reference routing is no longer producing reliable
  behavior.

## Self-critique

This decision improves governance but cannot guarantee architectural judgment. The validator checks
integrity, not factual truth, and blind scenarios sample behavior rather than every domain. Claude
may evolve independently, so differences between agents are expected and are not treated as drift.
These limits are accepted because they are visible and testable.
