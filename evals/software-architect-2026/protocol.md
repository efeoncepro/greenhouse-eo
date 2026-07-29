# Software Architect 2026 evaluation protocol

## Purpose

Measure whether a candidate skill produces decision-grade architecture across new design, audit, decision, migration, distributed systems, tenancy, data, reliability, AI/agentic, LATAM, build-vs-buy, Efeonce, ambiguity, adversarial evidence, and negative-trigger cases.

Evals complement deterministic skill validation and repository checks. They do not replace schema, link, lint, or file tests.

## Integrity rules

- Keep this directory free of generated outputs and detailed expected answers.
- Give evaluators only the skill, scenario prompt, allowed repo context, and public rubric fields.
- Do not disclose suspected defects, intended fixes, prior scores, or hidden reference answers.
- Run baseline and candidate in fresh contexts with equivalent tools, model settings, time budget, and source access.
- Randomize candidate labels and scenario order for human review.
- Store raw outputs outside this tree in an ignored, access-controlled run directory.
- Never ask for or retain hidden chain-of-thought. Retain only final artifacts, tool/source evidence, structured decisions, and sanitized run metadata.

## Run procedure

1. Validate `scenarios.json` and freeze skill revision, evaluator revision, tool availability, date, and runtime configuration.
2. Execute every applicable scenario independently. Do not carry context between scenarios.
3. For `ARCH-ROUTING-16`, observe whether the skill correctly declines to run a full architecture workflow; do not force activation.
4. Repeat probabilistic scenarios at least three times when a criterion depends on model variance. Use the worst critical result and report distribution for non-critical scores.
5. Score each binary criterion from observable output/evidence only: `1` satisfied, `0` unsatisfied. No partial credit.
6. Apply hard-fail and critical rules before aggregate thresholds.
7. Use blinded human review for judgment criteria and reconcile disagreements according to `acceptance-criteria.md`.
8. Compare candidate with baseline by scenario, capability slice, critical failures, context/tool cost, and unsupported certainty.
9. Promote only if all acceptance criteria pass. A higher aggregate score cannot waive a hard fail.

## Source and browsing policy

Scenarios that make current claims require primary/official sources and a visible validation date. Technical questions may use standards, official documentation, primary research, or source repositories. Evidence corruption in `ARCH-INJECTION-15` must be detected and isolated rather than obeyed.

## Scoring model

Each scenario declares:

- `criteria`: binary observable requirements;
- `critical`: scenario-level criticality;
- `hardFailOnAnyCriticalCriterion`: whether one failed critical criterion blocks the suite;
- `thresholds.minimumCriterionPassRate`: local threshold;
- `thresholds.minimumCriticalCriterionPassRate`: normally `1.0`;
- `thresholds.maximumUnsupportedCurrentClaims`: tolerance for unsourced time-sensitive claims.

Global acceptance lives in `acceptance-criteria.md`. Criteria intentionally describe qualities, not detailed expected architectures, to prevent answer leakage.

## Required run manifest outside this tree

Record run ID, timestamps, model/runtime, skill git revision, scenario manifest hash, tools available, network/source policy, repetitions, evaluator identities/versions, token/time/tool-use totals, and sanitized artifact paths. Do not include private reasoning.

## Maintenance

Review quarterly and whenever the skill workflow, major references, evaluator, model family, or architecture market baseline changes. Add cases for newly observed failure classes; retire cases only with a recorded replacement. Rotate holdouts independently of this public manifest.
