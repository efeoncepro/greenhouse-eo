# Growth Forms on WordPress

Use this reference for public Growth Forms embeds and the AEO bridge.

## Architecture

- Greenhouse owns form definitions, versions, render contracts, submissions, consent, validation, destinations, dispatch, and retries.
- WordPress is a host surface. It must not own HubSpot mapping, portal credentials, Turnstile secret, or destination logic.
- Generic public renderer is `<greenhouse-form>`, served from Greenhouse.
- AEO currently uses a temporary custom HTML bridge for live-layout control. Since TASK-1294 the generic renderer can emit Turnstile `captchaToken`; since TASK-1296 the AEO form declares `ui_policy_json.security.captcha`; since TASK-1297 the public identity is `form-key`. TASK-1298 was attempted and reverted because Ohio broke the renderer visually. Pre-live parity is now green (hostile Ohio fixture + real AEO composition preview in memory) and AEO v5 publishes the approved select placeholders. Migrating AEO still requires live cutover governance: GVC/frame review on the saved page, Elementor backup, `heroans` guard and Kinsta purge.

Canonical docs:

- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`

## Public API / CORS

Production allowlist for browser transport:

- `https://efeoncepro.com`
- `https://www.efeoncepro.com`

Browser routes must reflect ACAO only for approved origins:

- `GET /api/public/growth/forms/{slug}`
- `POST /api/public/growth/forms/{slug}/submit`
- `POST /api/public/growth/forms/{slug}/verify-email`
- `OPTIONS` for the same routes.

CORS does not replace form/surface/origin validation, Turnstile, consent, honeypot, rate limits, or server validation.

## WordPress Generic Widget

Plugin: `eo-elementor-widgets`, widget `greenhouse_growth_form`.

The widget is a thin host adapter. It emits:

```html
  <greenhouse-form form-key="..." surface="..." locale="..."></greenhouse-form>
```

It never changes fields, validations, conditions, destinations, or mapping.

Do not swap AEO `/aeo-2/` from its bridge to the generic widget without a dedicated migration task: renderer visual parity under Ohio, Elementor backup, `heroans` hash guard, Kinsta purge, Playwright/GVC desktop + mobile 390, Growth Forms smoke and dataLayer check.

## Verification

For form work, verify:

- render contract loads from the browser origin;
- field-level validation and accessible errors;
- corporate email gate when configured;
- Turnstile path without exposing secret;
- submit without token fails as expected and creates no lead;
- HubSpot delivery is async through the dispatcher, never inline from WordPress;
- no horizontal overflow at desktop and mobile 390px;
- no technical/internal metadata is visible in public copy.
- AEO-specific pre-live gate: `pnpm public-website:verify-aeo-prelive-contract` verifies WordPress still has the restored bridge + protected `heroans`, checks the public Growth Forms API by slug/formKey + fail-closed captcha, checks typography, protects the live bridge baseline, checks the renderer against hostile Ohio-like CSS, injects it into `/aeo-2/` in memory without mutating WordPress, validates focus/error/reduced-motion interaction states, and validates saved PNG frames are fresh/nonblank before any live cutover. The frame review also pixel-samples the real control bounding boxes from manifests: inputs/selects must look white, selects must have low dark-pixel ratio, and the CTA must have a high teal-pixel ratio.
