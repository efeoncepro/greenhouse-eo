# Content Marketing: renderer presentation and interactive hosts

Apply these reusable rules when embedding Growth Forms inside an interactive page. The source case
is Content Marketing (2026-08-31); its IDs and rollout version live in
`docs/architecture/growth-public-forms-runtime-contract.md` under **Content Marketing**, not here as
defaults for another form. Pair with `efeonce-public-site-wordpress` for WordPress mutations.

## Keep presentation in its owner

- `styleVariant=content_marketing` is renderer presentation over `multi_step_light`: current step
  label, optional `copy["step.<key>.help"]`, announced progress, decorative dots, one field column
  and action spacing. The published contract owns labels, help and steps; `renderer.ts` / `styles.ts`
  own their markup and styling. The host provides outer card and `--ghf-*` tokens, including
  `--ghf-step-bg`, not a copy of fields or another landing's control CSS.
- Change contract content through draft → review → publish, preserving form key, consent, captcha,
  validation and destination policies. A visual variant does not authorize a new destination.
- Native single selects must restore the current value after their options are attached. Verify
  `initialValues` at first display and retained values after navigating back and forward; do not
  replace behavior tests with string matching against implementation text.

## Preserve the custom element through host updates

A host patcher must treat the form container and its mounted `<greenhouse-form>` as opaque. Preserve
its actual node and descendants; never regenerate them from the host's source template. Otherwise
apparently harmless tab/mode updates remount the renderer and discard values, focus or pending state.

Use public non-sensitive `initial-values` only before editing starts. Content Marketing's mode event
stops updating prefill after the first input; the renderer then owns current values. Do not override
what a person has written or inject field values into telemetry, HTML attributes or screenshots.
Lifecycle cleanup must remove the host listeners without rebuilding the form on every render.

## Pinning a consumer is not deploying the global channel

Content Marketing loads the plugin's `assets/js/content-marketing-forms.js`, built from the canonical
`src/growth-forms-renderer/index.ts`. It is a pinned distribution of the same renderer, not a fork of
its capture logic. A surface's `rendererChannel=stable` does not establish which bytes an explicit
host enqueue serves. Record and check actual URL/hash; avoid competing custom-element registration
from two bundles. A WordPress rollout does not publish Greenhouse's `renderer-latest.js` or update
other consumers. Global promotion requires its own release path and regression verification.

## Proportional verification and honest closure

- Behavioral reference: `src/growth-forms-renderer/__tests__/content-marketing.test.ts` verifies help,
  invalid empty step, advancement, native-select prefill and retained values without a request.
- Browser reference: `scripts/public-website/verify-content-marketing-landing.cjs` and
  `.captures/content-marketing/browser.json` cover the actual host; inspect desktop/mobile frames,
  keyboard, reduced motion and no-JS fallback. Contract availability does not prove those states.
- Separate form publication, mount/validation/navigation, accepted submission, downstream delivery
  and GA4 request. Content Marketing's initial rollout did not exercise an accepted lead or GA4
  conversion, and remains `greenhouse_only`; never infer HubSpot delivery from a visible success UI.
- Keep `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` pending until the actual surface smoke
  confirms the accepted event and GA4 request. Reuse the generic event pipeline; do not mint a
  Content Marketing-specific conversion event merely because a new landing exists.
