# Editorial Premium Brief — Growth Forms host recipe

Use this reference when a public landing needs the approved TASK-1598 form treatment.

Canonical visual specification:
`docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`.

## Contract

- Renderer: published Growth Form with `styleVariant=diagnostic_premium`.
- Host: one exterior editorial card, header/trust chrome, layout, scoped tokens and semantic decoration.
- Never move fields, validation, consent, Turnstile, submit, telemetry, destination mapping or listbox state into
  WordPress/Astro.
- Keep `appearance="bare"` and `color-scheme="light"` inside a light host card.
- Use Poppins only for the host title; Geist for all form/control copy.
- Use Core Blue for the public-site submit when the surrounding Efeonce landing establishes blue, not teal.
- Keep one caret per trigger. Country flags are vector circles with explicit optical centering, crisp outline and
  no blur; other options use semantic pictograms.
- The caret is down when closed and rotates the same element 180 degrees around its optical center when opened;
  close follows the inverse path. Drive it from `aria-expanded`/`data-open`, never shift its axis or animate a host
  pseudo-caret, and make reduced motion reach the same final orientation immediately.
- Desktop and 390 px, dropdown-open, focus/error, reduced-motion, overflow and empty-submit behavior require live
  verification.

Host decoration is allowed only when it follows the renderer's current value. It must not create a parallel
control or value store. The current Influencer icon decoration is page-scoped and is not a reusable renderer API.
If option iconography repeats across hosts, promote browser-safe semantic metadata to the form/render contract and
renderer before copying it.
