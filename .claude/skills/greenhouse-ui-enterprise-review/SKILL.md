---
name: greenhouse-ui-enterprise-review
description: Enterprise UI quality gate for Greenhouse. Use before approving significant UI changes or modern product-quality surfaces.
type: gate
---

# Greenhouse UI Enterprise Review

This is a product-quality gate, not a token-only lint.

Use after implementation and screenshots, before commit or approval.

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
- adaptive sidecar fit when the UI is contextual assistance, inspection, review, preview, or low-risk editing

## Blockers

- No screenshot evidence for a visual-quality request.
- Primary action is unclear or duplicated across competing regions.
- Mobile is a squeezed desktop or has clipped controls/text.
- Partial/degraded data appears complete.
- Important state is color-only.
- UI is generic template composition rather than task-native.
- Copy is vague or reusable copy is hardcoded in JSX.
- New component bypasses established Greenhouse primitives without rationale.
- A desktop contextual sidecar is implemented as a custom drawer/card overlay instead of `AdaptiveSidecarLayout` + `ContextualSidecar`.
- A dirty/replacing sidecar has no idempotent close/replacement guard.

## Verdict Rules

- `PASS`: no blockers and average score >= 4.2.
- `CONDITIONAL PASS`: no blockers, average >= 3.8, polish follow-ups acceptable.
- `BLOCK`: any blocker or average < 3.8.
