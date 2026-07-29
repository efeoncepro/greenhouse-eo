# Source governance and skill maintenance

Use this reference only when maintaining, reviewing, or releasing this skill. Keep operational history in the repository task/ADR/changelog system, not inside the skill.

## Contents

1. Content classes
2. Source requirements
3. Freshness policy
4. Change workflow
5. Evaluation and release gates
6. Deprecation

## 1. Content classes

Classify every non-trivial claim before adding it:

| Class | Examples | Storage | Default review |
|---|---|---|---|
| Durable principle | Explicit ownership, bounded blast radius, tested recovery | Reference with authoritative provenance | Annual |
| Versioned standard | ISO, RFC, NIST, OpenAPI, MCP stable release | Source catalog with exact edition/version | 90–180 days |
| Dynamic vendor capability | Cloud feature, region, framework behavior | Research evidence, not an unqualified default | 90 days and before decision |
| Dynamic commercial fact | Price, quota, model, free tier | Never durable; verify for every decision | At use time |
| Repository-local contract | ADR, task process, runtime invariant | Overlay router to canonical owner | At use time |
| Runtime evidence | SLO result, restore time, deployment state | Dated artifact outside the skill | Per drill/release |

Do not convert an example, trend, vendor recommendation, or observed Efeonce state into a universal rule.

## 2. Source requirements

Register authoritative external sources in `source-catalog.json`. Every entry must declare:

- stable ID, title, publisher, URL, authority, topics, and license posture;
- content class and volatility;
- version/status when applicable;
- `last_verified`, `review_by`, owner, and replacement when superseded.

Prefer official standards, specifications, laws, documentation, research papers, and maintained project sources. Use market/community material for discovery or experience reports, not as the only support for factual capability, security, pricing, or legal claims.

Paraphrase. Do not copy protected standards or large source passages. A catalog entry records provenance; it does not grant a reuse license.

## 3. Freshness policy

Use event-driven review whenever a source publishes a deprecation, security notice, superseding edition, or incompatible release. Calendar cadence is a backstop:

- 30 days: prices, models, previews, rate limits, agent protocols under rapid change;
- 90 days: cloud/framework capabilities, MCP/A2A, OTel GenAI, FinOps/FOCUS;
- 180 days: provider architecture frameworks, API specifications, security guidance;
- 365 days: durable methods and stable standards.

An overdue source does not automatically make a durable principle false. It prevents unqualified claims of currency. Mark the dependent content `review_due`, research it, and either refresh, narrow, deprecate, or remove it.

## 4. Change workflow

Follow:

`inventory -> classify claims -> research -> edit -> deterministic validation -> blind evaluation -> review -> canonical closure`

1. Freeze a baseline by content hash.
2. Define which behavior should improve and which must not regress.
3. Keep `SKILL.md` as a compact router; place conditional depth in one-level references.
4. Update the source catalog and review dates in the same change as the claim.
5. Run deterministic validation before model-based evaluation.
6. Compare candidate and baseline in isolated sessions with identical model/tool limits.
7. Record the decision and history in the repository's canonical operating artifacts.

Never auto-update skill content from a remote source during invocation. Remote content can contain prompt injection, disappear, or change without review.

## 5. Evaluation and release gates

Use `evals/software-architect-2026/` for the benchmark contract. Keep expected answers and private judge rubrics outside the agent's generation workspace.

Require:

- positive, negative, ambiguous, adversarial, and coexistence routing cases;
- new design, audit, decision, migration, reliability, distributed, data, tenancy, agentic, regulated, proportionality, and Efeonce cases;
- multiple trials for non-deterministic behavior;
- binary criteria with quoted evidence plus human adjudication for hard failures;
- anonymous pairwise comparison against the frozen baseline;
- separate quality, token, duration, tool-use, and routing metrics.

The candidate must not pass if it fabricates evidence, violates a hard constraint, follows untrusted instructions, removes required isolation/approval, or over-architects the explicit restraint case.

Run:

```bash
python3 .codex/skills/software-architect-2026/scripts/validate_architecture_skill.py
python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/software-architect-2026
```

Model-based benchmark execution can remain a deliberate release job when the local harness or credentials are unavailable; deterministic fixture/schema validation remains blocking.

## 6. Deprecation

Deprecation requires:

- reason and effective date in a repository-owned decision/task/changelog;
- replacement or explicit no-replacement decision;
- inventory of routers, prompts, scripts, and skills that invoke the name;
- compatibility/alias period when renaming would break consumers;
- benchmark comparison and removal gate.

Do not rename `software-architect-2026` merely to remove the year. Its body can be year-neutral while the identifier remains compatible. Rename only through a governed consumer migration.

## Primary sources

- Agent Skills specification and evaluation guidance (`SRC-SKILL-SPEC`, `SRC-SKILL-EVAL`).
- Microsoft Skills/Waza testing patterns (`SRC-MS-SKILLS`, `SRC-WAZA`).
- GitHub Agent Skills guidance (`SRC-GITHUB-SKILLS`).

Sources were verified on 2026-07-22; review dates live in `source-catalog.json`.
