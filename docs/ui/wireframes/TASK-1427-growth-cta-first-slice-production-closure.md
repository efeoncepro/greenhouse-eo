# TASK-1427 — Growth CTA first-slice production closure

## Meta

- Status: `ready`
- Owner task: `TASK-1427`
- Surfaces: CTA `embedded`/`banner` on Think and WordPress hosts
- Primitive decision: `reuse` — portable renderer from TASK-1340; no new portal primitive
- UI ready target: `yes`

## Brief

Close the already-built first slice in production without redesigning it. The user must see the same CTA hierarchy, states and form handoff on both hosts; the operator must be able to prove consent-aware attribution and the seven-day signal window.

## Layout Skeleton

| Region | Purpose | Source |
|---|---|---|
| Host slot | Reserves space and supplies surface/context | Think or WordPress adapter |
| CTA card/banner | Kicker, title, body, primary action and optional dismiss | Published CTA payload |
| Form handoff | Opens the governed Growth Form when configured | `open_growth_form` action |
| Degraded state | Keeps host content usable if CTA delivery fails | Host + renderer fallback |

## States

- `loading`: reserved non-shifting slot.
- `ready`: published variant rendered with its primary action.
- `dismissed`: CTA removed and focus returned to the host flow.
- `degraded`: host remains usable; no raw runtime error or empty overlay.
- `consent denied`: CTA may render, but analytics collection does not fire.

## Accessibility Contract

- Existing renderer heading and button semantics are preserved.
- Dismiss has an accessible name from the canonical copy layer.
- Opening the Growth Form moves focus to its first meaningful control; closing returns focus to the triggering CTA.
- No state is communicated through color alone.

## Implementation Mapping

- Reuse `GrowthCtaRenderer` and its `embedded`/`banner` variants from TASK-1340.
- Reuse the Think adapter as control and add the equivalent WordPress host integration; do not fork renderer markup or styles.
- CTA payload comes from the published Growth CTA delivery contract. Form submission remains owned by Growth Forms.
- Visible reusable copy stays in the renderer/canonical copy source; the task adds no host-specific hardcoded strings.
- Analytics uses the existing CTA event contract and the consent-aware collection path.

## GVC Scenario Plan

- Scenario: `scripts/frontend/scenarios/task-1427-growth-cta-production-closure.scenario.ts` or the closest existing TASK-1340 scenario extended for both hosts.
- Viewports: `1440` and `390`.
- Capture: Think ready/action/form, WordPress ready/action/form and consent-denied state.
- Assert: no page-level horizontal scroll, no layout shift from the reserved slot, focus return works, CTA events only collect with consent.
- Runtime evidence: staging smoke on both hosts plus GA4 DebugView/Realtime and the seven-day signal record.

## Design Decision Log

- Decision: treat WordPress parity, attribution proof, seven-day signals and lifecycle/doc reconciliation as one production-closure slice.
- Why: none has standalone product value; together they are the evidence required to call the first slice operationally closed.
- Reuse: renderer and event contracts remain canonical. Only the missing host adapter/configuration and evidence are added.
- Non-goal: no new placement, suppression model or operator cockpit.

## Acceptance Checklist

- [ ] Think and WordPress render the same published CTA contract.
- [ ] Consent-aware analytics and focus behavior are verified.
- [ ] GVC captures have been reviewed at desktop and mobile.
- [ ] Seven-day signal evidence and lifecycle documentation agree with runtime.
