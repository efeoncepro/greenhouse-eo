# TASK-### — [Motion System Name] Motion Contract

## Meta

- Status: `draft|ready-for-implementation|implemented`
- Owner task: `TASK-### — [title]`
- Related wireframe:
- Related flow:
- Motion type: `primitive-default|microinteraction|transition-system|orchestrated|scroll|none`
- Primary primitive / library: `Motion|framer layout|CSS|useGreenhouseGSAP|existing primitive`
- Copy source:

## Motion Brief

- Primary user:
- Motion intent:
- Uncertainty reduced:
- User decision supported:
- Non-goals:

## Motion Inventory

| Element | Trigger | Motion / feedback | Primitive | Required? |
|---|---|---|---|---|
|  |  |  |  |  |

## Microinteraction States

| Element | Idle | Hover | Focus | Pressed | Selected | Pending | Success / error |
|---|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |  |

## Transition Specs

| Transition | From | To | Timing / easing token | Behavior | Reduced-motion fallback |
|---|---|---|---|---|---|
|  |  |  |  |  |  |

## Primitive & Token Mapping

- Primitive:
- Imports allowed:
- Imports forbidden:
- Timing tokens:
- Easing tokens:
- Layout animation:
- CSS properties:
- GSAP/Lottie justification:

## Reduced Motion Contract

- Detection:
- Replacement behavior:
- Meaning preserved:
- Animations removed:
- Animations retained:

## Accessibility & Feedback

- Focus visibility:
- Keyboard activation:
- Live region / status behavior:
- Color-independent state:
- Motion-independent meaning:
- Error/destructive stability:

## Performance Guardrails

- Compositor-only properties:
- Layout reads/writes:
- Animation scope:
- Chart/counter constraints:
- Mobile constraints:

## GVC / Micro Evidence

- Scenario:
- Viewports:
- Required steps:
- Required frame labels:
- Required `data-capture` markers:
- Assertions:
- Reduced-motion evidence:

## Acceptance Checklist

- [ ] The owning task declares this file in `Motion` when required.
- [ ] Motion intent is tied to feedback, orientation, uncertainty reduction or error prevention.
- [ ] Reduced-motion behavior preserves the same meaning.
- [ ] Focus, selected, pending and error states do not rely on motion alone.
- [ ] Imports use approved Greenhouse wrappers/primitives.
- [ ] Performance guardrails avoid layout thrash and excessive animation.
- [ ] GVC/micro evidence proves the meaningful interaction, not only a static screenshot.
