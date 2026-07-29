# Investor readiness eval protocol

1. Freeze the scenario prompt and repository snapshot.
2. Run the skill with only the resources selected by routing.
3. Score every criterion in `acceptance-criteria.md` as pass/fail.
4. Mark any critical hard-fail as scenario failure, regardless of aggregate score.
5. Record tool calls, sources, artifacts, unsupported claims and context cost.
6. Repeat after any material skill change.
7. Keep expected criteria outside the agent prompt for blind evaluation.

Minimum release bar: 100% pass on hard-fails and at least 90% on required behaviors across all scenarios.
