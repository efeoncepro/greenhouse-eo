# TASK-1328 — AI Visibility Report Signal Completeness Motion Contract

## Meta

- Status: `draft`
- Owner task: `TASK-1328 — AI Visibility public report signal completeness`
- Related wireframe: `docs/ui/wireframes/TASK-1328-ai-visibility-report-signal-completeness.md`
- Related flow: `none`
- Motion type: `microinteraction`
- Primary primitive / library: `existing primitive`
- Copy source: `src/lib/copy/*` or external report bridge copy

## Motion Brief

- Primary user: prospect or decision maker reading the public report.
- Motion intent: preserve the approved ladder/liquid microinteraction while adding more evidence sections around it.
- Uncertainty reduced: the ladder continues to feel alive and premium, but new evidence blocks remain calm and scannable.
- User decision supported: understand maturity stage and drill into evidence without visual noise.
- Non-goals:
  - No new GSAP/Lottie/Framer animation work.
  - No rewrite of `MaturityLadder`.
  - No animated waves or liquid effects in the new report evidence sections.

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
| `MaturityLadder` liquid fill | first render | existing approved liquid settle/fill behavior | existing external hub primitive | yes, preserve |
| `MaturityLadder` liquid fill | hover / focus | existing liquid response inside stage card | existing external hub primitive | yes, preserve |
| New evidence sections | scroll into view | no new required motion; static enterprise layout | none | no |
| Optional info control | hover / focus | subtle CSS state only, if introduced | CSS | optional |
| Fix-it CTA | hover / focus | existing button feedback only | CSS/existing hub button | optional |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
| `MaturityLadder` | approved liquid/static state | approved liquid response | visible focus + same feedback | no destructive change | current stage remains clear | n/a | n/a |
| Evidence table rows | static | subtle row emphasis if used | visible focus for interactive cells only | n/a | n/a | n/a | degraded state is textual |
| Fix-it CTA | enabled if available | subtle hover | visible focus | pressed state | n/a | disabled/pending if endpoint unavailable | error copy, no motion-only signal |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
| Ladder existing entrance | initial render | settled | existing primitive timing | preserve exactly unless bug found | static filled state |
| Ladder hover response | idle | hover | existing primitive timing | preserve | color/text state only |
| New sections | not visible | visible | none | no required animation | no change |

## Primitive & Token Mapping

- Primitive: existing `MaturityLadder` in `efeonce-think`.
- Imports allowed: existing hub-local CSS/JS already used by `MaturityLadder`.
- Imports forbidden: direct new GSAP, Lottie, ad-hoc animation libraries for this task.
- Timing tokens: existing hub tokens only.
- Easing tokens: existing hub tokens only.
- Layout animation: none for new sections.
- CSS properties: prefer opacity/transform for optional lightweight state; avoid layout-affecting animations.
- GSAP/Lottie justification: none.

## Reduced Motion Contract

- Detection: use the existing `prefers-reduced-motion` handling in the hub/primitive.
- Replacement behavior: ladder remains legible as static stage/fill; evidence blocks remain static.
- Meaning preserved: stage, score, measured/coverage state and CTA availability are all visible without motion.
- Animations removed: ladder fill/hover motion if reduced motion is active.
- Animations retained: no essential animation required.

## Accessibility & Feedback

- Focus visibility: every interactive info control/CTA has visible focus.
- Keyboard activation: optional tooltip/popover controls keyboard reachable.
- Live region / status behavior: no live region needed for static report sections.
- Color-independent state: all measured/coverage/no-data states have text labels.
- Motion-independent meaning: score, stage and evidence are readable without animation.
- Error/destructive stability: no destructive action in scope.

## Performance Guardrails

- Compositor-only properties: required for any optional hover polish.
- Layout reads/writes: do not introduce JS layout loops around evidence sections.
- Animation scope: ladder only.
- Chart/counter constraints: no animated counters required.
- Mobile constraints: hover-only effects must degrade cleanly to static/tap/focus.

## GVC / Micro Evidence

- Scenario: public AI Visibility report signal completeness.
- Scenario file: same scenario declared in the wireframe.
- Route: `think.efeoncepro.com/brand-visibility/r/<valid-token>` or preview equivalent.
- Viewports: 1440x1000 and 390x844.
- Required steps:
  - Capture ladder on first load.
  - Hover/focus ladder stage if automation supports it.
  - Capture new evidence sections to prove they did not steal motion focus.
- Required captures:
  - `report-ladder`
  - `report-engine-coverage`
  - `report-source-evidence`
- Required frame labels: `ladder-initial`, `ladder-hover`, `evidence-static`.
- Required `data-capture` markers: `report-ladder`, `report-engine-coverage`, `report-source-evidence`.
- Assertions:
  - Ladder remains nonblank and visually consistent.
  - No new section animates layout or causes overlap.
  - Reduced motion keeps all meaning.
- Reduced-motion evidence: one capture or browser emulation if available.

## Design Decision Log

- Decision: preserve existing ladder microinteraction and add no new motion system in this task.
- Alternatives considered:
  - Rebuild ladder motion while adding signals: rejected; too risky and outside the user request.
  - Add reveal animations to evidence sections: rejected; enterprise report should prioritize scanning and trust.
- Why this pattern: protects the approved premium interaction while keeping evidence dense and calm.
- Reuse / extend / new primitive: reuse existing `MaturityLadder`; no new primitive.
- Open risks: external hub primitive is outside this repo, so verification must happen in `efeonce-think` preview/prod.
- Follow-up: if the ladder is promoted into Greenhouse UI platform later, move this contract into that primitive's platform docs.

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved wrappers/primitives or existing hub-local primitive code.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
- [ ] Design decision log explains why this motion is needed and what was rejected.
