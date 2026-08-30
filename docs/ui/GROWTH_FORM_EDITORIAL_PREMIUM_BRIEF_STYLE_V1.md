# Growth Form — Editorial Premium Brief Style V1

Status: approved reference implementation
Owner: Growth Forms + Public Site + Product Design
Reference surface: `TASK-1598`, `/servicios/agencia-de-influencers/`
Last verified: 2026-08-29

## Purpose

Define the reusable presentation used by the Influencer Marketing campaign brief without turning a
page-scoped WordPress treatment into a second form renderer. The style is named **Editorial Premium Brief**.
It combines the governed Growth Forms renderer variant `diagnostic_premium` with a restrained, editorial host
composition suitable for high-intent public landing pages.

This document owns visual intent and composition. Runtime behavior remains owned by Growth Forms.

## Classification and decision

- Rigor: `ui-standard`.
- Direction mode: `source-led`, refined against the approved TASK-1598 live surface.
- Reuse decision: reuse `<greenhouse-form>` and `diagnostic_premium`; extend only host chrome, layout and
  theming tokens.
- Repeatability: reusable public-site host composition, not a Greenhouse portal primitive and not a new
  `styleVariant` by itself.
- First reference: Growth Form `efeonce-creator-influence-brief`, stable `form-key`
  `d2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3` on surface `fhsf-efeonce-creator-influence`.

Rejected directions:

- glassmorphism and strong glow, because they reduce trust and legibility;
- a multi-step wizard, because the field set does not justify navigation overhead;
- placeholder-as-label controls, because labels disappear during completion;
- card-on-card composition, because the host and renderer would compete for surface ownership;
- native `<select>` popups or a host-built replacement, because they break visual control or duplicate state.

## Ownership boundary

| Layer | Owns | Must not own |
| --- | --- | --- |
| Growth Form definition/version | fields, labels, placeholders, help, validation, consent, success behavior, `styleVariant` | landing layout, decorative chrome |
| Portable renderer | control semantics, custom listbox state, keyboard, focus, errors, pending, Turnstile, telemetry, success rendering | page headline, card shell, landing-specific icons |
| Host | the single exterior card, header, trust strip, responsive placement, scoped token values and semantic decoration | values, validation, submit bridge, mapping, destinations, PII or duplicate selects |

If a behavior or state repeats across hosts, promote it to the renderer. If the treatment only explains the
landing context, keep it in the host.

## Visual thesis

A bright editorial paper sits on a Midnight conversion plane. It should feel precise, calm and high-value: one
dominant white surface, quiet fields, explicit labels and a decisive Core Blue submit. Depth is soft and
structural, never glossy. The form earns attention through hierarchy and spacing rather than decorative effects.

## Anatomy

1. **Exterior card** — the only visible card boundary; large but controlled radius, fine cool border and
   two-layer soft shadow. The reference uses a 28 px desktop radius, 22 px on mobile, a restrained 3 px
   blue-to-green top signature and a very quiet radial paper tint. These are reference values, not global raw
   tokens: map them to the consumer's semantic surface roles.
2. **Header** — semantic document icon, overline, title, one-sentence explanation and compact duration badge.
3. **Trust rail** — two short signals such as protected data and contextual response, separated from the header
   by a divider.
4. **Field grid** — two columns only when labels, helpers and controls fit; otherwise one column.
5. **Full-width intent fields** — activation and objective span the grid because they carry the qualification
   decision.
6. **Consent plane** — a quiet inset surface earned by its legal function, containing disclosure, checkbox and
   a human-readable privacy link.
7. **Submit** — full-width primary action from the form contract.
8. **Meeting alternative** — a separate Growth CTA outside the form card; it never competes inside the submit
   region.

## Typography hierarchy

Use exactly two roles:

- Poppins 700 for the host card title only;
- Geist for overline, explanation, trust signals, labels, controls, help, counter, privacy and actions.

Reference hierarchy:

| Element | Role |
| --- | --- |
| Overline | Geist 600, compact uppercase, deliberate tracking |
| Card title | Poppins 700, line-height about 1.2 |
| Explanation and trust | Geist 400, line-height at least 1.5 |
| Labels and submit | Geist 600 |
| Input value | Geist 400, minimum browser-safe 16 px on public forms |
| Help, counter and privacy | Geist 400, secondary ink, never reduced to illegible fine print |

Do not use intermediate invented weights such as 650. Iconography never replaces the visible label.

## Color and surface roles

- Host plane: Efeonce Midnight/Core Blue structural background.
- Exterior card: white or approved paper surface.
- Field/consent surface: quiet cool neutral (`--ghf-field-bg` role).
- Primary submit: Core Blue `primary`, white text, darker blue border/interaction state.
- Focus: visible blue ring with a second separation cue where the host background is also blue.
- Error/success: semantic roles only; never reuse the landing lime as validation status.
- Lime/green: reserved for the surrounding landing's primary meeting CTA and small branded accents, not the form
  submit or broad field fills.
- Teal is not used on this Efeonce public-site variant because the surrounding landing does not establish it.

Consume Growth Forms `--ghf-*` tokens and host semantic variables. Do not copy screenshot HEX values into a new
consumer without mapping them to that host's approved palette.

## Controls and rhythm

- Controls have a comfortable target; the reference implementation measures at least 56 px high.
- Labels sit above controls and remain visible after entry.
- Field groups use consistent vertical rhythm; help belongs to the field it explains.
- The textarea helper and character counter share the immediate row below the textarea, with the counter aligned
  to the logical end. Do not leave the counter visually detached.
- Full-width submit matches the renderer width and has a comfortable target of at least 56 px.
- Hover may add restrained lift; focus must remain visible without depending on shadow.
- Autofill, disabled, pending, error and success states must remain compatible with the light card.

## Premium selects and semantic iconography

The listbox is the renderer's `diagnostic_premium` combobox. The host may decorate known options, but it must not
own the selected value or input events.

- One caret per trigger; never add a host pseudo-caret.
- Option targets are at least 46 px high.
- Selected state uses a check plus tonal surface; color is not the only signal.
- Listbox stacking, `aria-expanded`, `role=listbox`, `role=option`, focus and keyboard stay renderer-owned.
- Field label icons describe the question: person, email, company, globe, megaphone and target are suitable;
  sparkle is not a semantic substitute.
- Country flags use vector circle assets, not emojis or raster crops. Reference optical treatment: 28 px in the
  list, 26 px in the trigger, explicit vertical centering, crisp 1 px outline and no blurred shadow.
- Regional and unknown-market choices use globe/location pictograms rather than invented flags.
- Activation choices use distinct semantic pictograms for creator, UGC/video, partnership, paid amplification
  and strategy.

When the host decorates the selected option, it observes the renderer's current value and updates only the visual
adornment. It never creates a second select or writes a parallel value.

The current Influencer implementation uses page-scoped decoration for its market and activation choices. That is
an approved local implementation, not a reusable renderer API. A second consumer must not copy its
`MutationObserver`, label matching or `data-value` selectors. Reuse graduates the pictograms to browser-safe,
semantic option metadata in the form/render contract and renderer.

## Responsive contract

- Wide: host narrative and form can share an asymmetric two-column conversion grid; the intro may be sticky only
  while it remains shorter than the form and does not collide with the footer.
- Form card: two-column field pairs collapse before labels/helpers truncate.
- Tablet and mobile: one column, full-width controls and no horizontal overflow.
- At 390 px, card padding and typography reduce proportionally, but targets remain at least 48 px and the current
  select value remains readable.
- Sticky behavior must be removed where stacking makes it overlap adjacent sections.
- Measure `scrollWidth === clientWidth`; a full-page screenshot is insufficient evidence.

## Accessibility and interaction

- Visible labels, programmatic associations and helpful `autocomplete` values.
- Local errors with `aria-invalid` and `aria-describedby`; global summary/focus only when the renderer contract
  provides it.
- Keyboard-operable listboxes with visible focus and honest `aria-expanded`.
- Privacy copy is a sentence with a descriptive link, not a naked URL.
- Icon-only decoration is `aria-hidden`; adjacent text carries meaning.
- Information is never conveyed only by color, flag or icon.
- Reduced motion reaches the same final state; no essential reveal depends on animation.
- Empty submit or missing Turnstile remains fail-closed and must not create a submission or booking during QA.

## Host implementation checklist

1. Embed by stable `form-key` with `surface`, `locale`, `appearance="bare"` and `color-scheme="light"`.
2. Wrap the renderer in one approved exterior card.
3. Apply typography and color through scoped host/`--ghf-*` tokens.
4. Keep fields, labels, copy, validation, consent and submit behavior in the published form version.
5. Keep custom listbox state and overlay behavior in the renderer.
6. Add only semantic host decoration and verify that selected values persist.
7. Keep the meeting CTA outside the form action region.
8. Capture desktop, tablet, 390 px, dropdown-open, focus/error and reduced-motion states.
9. Assert no page overflow, no duplicate caret/native select and no PII in telemetry.
10. For a critical WordPress surface, use backup → `Document::save()` → Kinsta purge → live fidelity + SEO gates.

## Anti-patterns

- Rebuilding fields or submit in Elementor.
- Styling a published form by mutating its version in place.
- Native OS dropdowns presented as a premium controlled menu.
- A host-created select, caret, validation message or value store.
- Sparkles or colored disks used where a semantic icon exists.
- Multiple nested cards, heavy glow, thick shadows or constant gradients.
- Teal/green submit that breaks the host's action hierarchy.
- Naked privacy URLs, detached counters or placeholder-only labels.
- Raster/emoji flags, blurred flag shadows or clipped pseudo-elements.
- Page-scoped `z-index` patches for a renderer overlay bug.

## Evidence and sources

- Task: `docs/tasks/complete/TASK-1598-landing-influencer-marketing-creators-ugc.md`.
- Wireframe: `docs/ui/wireframes/TASK-1598-landing-influencer-marketing-creators-ugc.md`.
- Review: `docs/ui/reviews/TASK-1598-influencer-growth-form-premium-2026-08-28.md`.
- Runtime contract: `docs/architecture/growth-public-forms-runtime-contract.md`.
- Live fidelity dossier: `.captures/task1598-influencer-fidelity-2026-08-29T12-26-32-586Z/`.
- Fresh closure dossier: `.captures/task1598-influencer-fidelity-2026-08-29T12-35-54-355Z/`.
- Published form version: `fver-9c4f447b-a233-46db-b3f3-42c6fce5f9d2` (`diagnostic_premium`).
- Design review: `PASS 4.68/5`.
- Final verified Elementor hash:
  `353bac5d3d7491cb77f337296e5ab0bace14a18e99055d449ea25134217e52a5`.

The dossier is a dated reference, not proof for future consumers. Every new host must produce its own evidence.
