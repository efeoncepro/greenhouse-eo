# ANAM Emma premium direction v1

## Evidence and goal

- Surface: `https://anam-2.hubspotpagebuilder.com/agente-anam` (HubSpot portal `19893546`).
- Runtime evidence: annotated browser review from 2026-09-01 and captures under `.captures/anam-emma-build23-2026-09-01/`.
- Goal: turn the current institutional card layout into a modern, premium concierge experience centered on Emma, while preserving the existing HubSpot chat contract.

## Direction choice

### Selected: editorial concierge

Emma is presented as a named digital concierge, not as a decorative stock portrait. The first fold uses one asymmetric composition: editorial copy and a single intent selector on the left; Emma in an integrated, softly art-directed stage on the right. Navy conveys trust, teal signals availability, and a restrained water-inspired line treatment connects the experience to ANAM's environmental context.

### Rejected alternatives

- Institutional dashboard: familiar but too corporate and card-heavy for a human conversation entry point.
- Immersive dark chat: visually dramatic but too technological for an official service channel and weaker for ANAM's light brand expression.

## Composition contract

### Desktop

1. Compact translucent header with ANAM logo and official-channel status.
2. Asymmetric 60/40 hero with one clear narrative and one portrait stage.
3. Headline: `Hola, soy Emma. ¿En qué puedo ayudarte?`.
4. Three intent rows inside one selector surface, with dividers instead of three independent cards.
5. One dominant CTA, `Conversar con Emma`, whose chat intent follows the selected row.
6. Three concise trust facts integrated into Emma's stage: guided attention, protected data, and human routing.
7. Compact footer; no second chat CTA.

### Mobile

1. Compact header keeps the logo and official-channel cue visible without consuming the first viewport.
2. Emma's stage appears before the narrative to establish the character immediately.
3. Intent rows stack with at least 44 px interactive height.
4. The single CTA stays inside the intent surface; the layout reserves bottom space for HubSpot's native chat widget.
5. No horizontal overflow at 390 px.

## Interaction and accessibility

- Intent rows are selection buttons with `aria-pressed`; selecting one does not open chat unexpectedly.
- The final CTA is the only element carrying `data-chat-intent` and preserves the existing delegated HubSpot handler.
- Selection is communicated through icon, text, border, and check indicator rather than color alone.
- Visible keyboard focus is mandatory on selectors and CTA.
- Motion is limited to a short first-paint reveal and direct hover/selection feedback. There are no ambient loops, and `prefers-reduced-motion` disables decorative motion.
- Copy remains understandable without the portrait or color treatment.

## Implementation decision

- Primitive decision: `extend` the existing `KortexLandingHero` module because it already owns the page fields and the live chat routing contract.
- This is a bounded one-off HubSpot CMS React surface; tokens are declared once at the module root and reused throughout the stylesheet.
- Preserve editable HubSpot fields and migrate previous default values through `compactDefault`.

## Verification contract

- Public readback must identify the new HubSpot build.
- Validate at 1440 x 1100 and 390 x 1000.
- Confirm `scrollWidth === clientWidth`, no page/console/network errors, keyboard selection, `aria-pressed` state, and correct `data-chat-intent-key` transfer to the final CTA.
- Do not submit a real conversation during smoke testing.

## Implemented outcome — 2026-09-01

The selected direction is live in HubSpot build `#28`. The implementation preserves one selector surface and one
final CTA, uses the larger horizontal ANAM wordmark without the circle above it, and clips the decorative field
inside the hero so no white band remains below the footer.

Emma is the final female character. Her versioned `anam-virtual-executive-v2.png` asset was corrected with a
generative edit so the shirt reads `ANÁLISIS AMBIENTALES S.A.`. A deterministic text overlay was explicitly
rejected because it would weaken the integrated textile finish; the previous image remains available for
rollback.

Public QA passed at 1440 x 1100 and 390 x 1000 with no horizontal overflow, `body` margin at zero, intact click
and keyboard selection, CTA context transfer, and no console, page, or network errors. No real chat was opened or
submitted. Evidence:

- `.captures/anam-emma-premium-build27-2026-09-01/`
- `.captures/anam-emma-corporate-name-build28-2026-09-01/`
