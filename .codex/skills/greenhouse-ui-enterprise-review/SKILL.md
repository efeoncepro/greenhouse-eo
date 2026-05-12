---
name: greenhouse-ui-enterprise-review
description: Enterprise UI quality gate for Greenhouse. Invoke before committing significant UI changes or when a surface must meet a modern Lovable/Stitch-level product quality bar. Blocks generic, junior, inaccessible, or screenshot-unverified UI.
type: gate
---

# Greenhouse UI Enterprise Review

This is a product-quality gate, not a token-only lint.

Use after implementation and screenshots, before commit or approval.

## Inputs

- target files
- design intent or Product UI ADR
- screenshots: desktop, laptop, mobile
- relevant tests/commands

## Gate Rubric

Score 1-5:

- product intent clarity
- first-fold hierarchy
- action clarity
- information architecture
- visual maturity
- responsive quality
- state coverage
- accessibility cues
- microinteraction affordance
- repo consistency
- implementation maintainability

## Blockers

- No screenshot evidence for a visual-quality request.
- Primary action is unclear or duplicated across competing regions.
- Mobile is a squeezed desktop or has clipped controls/text.
- Partial/degraded data appears complete.
- Important state is color-only.
- UI is generic template composition rather than task-native.
- Copy is vague or reusable copy is hardcoded in JSX.
- New component bypasses established Greenhouse primitives without rationale.

## Verdict Rules

- `PASS`: no blockers and average score >= 4.2.
- `CONDITIONAL PASS`: no blockers, average >= 3.8, polish follow-ups acceptable.
- `BLOCK`: any blocker or average < 3.8.

## Output Format

```md
# Enterprise UI Review — [surface]

## Verdict
PASS | CONDITIONAL PASS | BLOCK

## Scores
| Dimension | Score | Notes |
| --- | ---: | --- |

## Blockers
1. ...

## Enterprise Bar
1. ...

## Polish
1. ...

## Required Next Iteration
...
```
