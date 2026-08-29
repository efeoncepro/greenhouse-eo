# TASK-1598 — Growth Form premium review — 2026-08-28

## Verdict

`PASS` — average `4.68/5`; every dimension ≥4, critical dimensions ≥4.5. Runtime reviewed after the governed
Elementor save at 1440, 890 and 390 px. Form submission was not exercised with PII; empty-submit validation produced
six local errors and an accessible focused summary without a POST to the Growth Forms API.

## Evidence

- Full landing gate: `.captures/task1598-influencer-fidelity-2026-08-29T02-22-01-382Z/`.
- Focused form captures: `.captures/task1598-form-premium-live-2026-08-29T0206Z/`.
- Live URL: `https://efeoncepro.com/servicios/agencia-de-influencers/`.
- Viewports: `1536×911`, `1440×1000`, `890×911`, `390×844`; reduced motion separately verified.

## Scorecard

| Dimension                   | Score | Evidence                                                                                              |
| --------------------------- | ----: | ----------------------------------------------------------------------------------------------------- |
| Hierarchy                   |   4.8 | Eyebrow → title → context → trust → fields → full-width submit reads immediately.                     |
| Proportions/composition     |   4.7 | Dominant single card balances the sticky editorial intro; 28 px desktop / 22 px mobile radius.        |
| Spacing/rhythm              |   4.7 | 20–24 px field rhythm, tight label proximity and clear section breaks.                                |
| Information density         |   4.4 | Seven governed groups remain long on mobile, but progressive spacing and helpers keep scanning clear. |
| Depth/surface model         |   4.7 | One principal paper, restrained shadow and one justified legal sub-surface.                           |
| Surface economy             |   4.7 | No card soup; the governed meeting CTA remains a separate alternative below the form.                 |
| Visual impact               |   4.6 | Thin blue→green signature edge, restrained radial tint and confident white-on-Midnight contrast.      |
| Typography                  |   4.7 | Poppins only for the host title; Geist for controls; minimum 16 px input text.                        |
| Color/contrast              |   4.7 | Neutral controls, blue functional state, green only as supporting brand accent; focus uses 3 px ring. |
| Iconography                 |   4.8 | Six semantic line icons plus trust/time icons; no decorative disks or mixed families.                 |
| Responsive transformation   |   4.7 | Related pairs on wide containers, single column at 890/390, full-width action and no overflow.        |
| Motion/microinteractions    |   4.5 | Focus, hover and submit lift are causal and disabled under reduced motion.                            |
| Source fidelity             |   4.7 | Preserves Claude Design composition, brand roles and conversion hierarchy while upgrading form craft. |
| Generic-template resistance |   4.8 | Editorial chrome and creator-specific cues avoid a generic SaaS/contact-form treatment.               |

## Functional/a11y checks

- `<greenhouse-form>` registers and mounts seven groups plus submit; host fallback disappears after mount.
- Six visible labels keep explicit input association; icons are decorative and never replace text.
- Inputs are 56 px high with 16 px text; keyboard focus has a 3 px outline plus border/shadow change.
- Empty submit creates six inline errors and focuses the accessible summary; no Growth Forms submission occurs.
- Consent remains an actual checkbox with visible text and the human-readable privacy link `Consulta nuestra Política de privacidad`.
- Native-looking selects keep real `<select>` semantics, a tonal action edge and a visible custom chevron.
- Growth CTA opens the native `discovery` scheduler dialog; no HubSpot URL is exposed and no booking was created.
- `scrollWidth === clientWidth` at every gated viewport; reduced-motion reaches the same final state.

## Remaining risk

The form remains intentionally long because the published contract collects the minimum operational brief. Further
shortening requires a new governed form version and commercial validation, not a visual-only WordPress change.
