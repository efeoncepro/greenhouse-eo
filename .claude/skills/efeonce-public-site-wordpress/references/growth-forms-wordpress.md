# Growth Forms on WordPress

Use this reference for public Growth Forms embeds and the AEO bridge.

## Architecture

- Greenhouse owns form definitions, versions, render contracts, submissions, consent, validation, destinations, dispatch, and retries.
- WordPress is a host surface. It must not own HubSpot mapping, portal credentials, Turnstile secret, or destination logic.
- Generic public renderer is `<greenhouse-form>`, served from Greenhouse.
- AEO currently uses a temporary custom HTML bridge for live-layout control. Since TASK-1294 the generic renderer can emit Turnstile `captchaToken`; since TASK-1296 the AEO v3 form declares `ui_policy_json.security.captcha`. Migrating AEO still requires a separate governed WordPress/visual task and the TASK-1294 code rollout that serializes `security` in public `GET`.

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
<greenhouse-form form="..." surface="..." locale="..."></greenhouse-form>
```

It never changes fields, validations, conditions, destinations, or mapping.

Do not swap AEO `/aeo-2/` from its bridge to the generic widget without a dedicated migration task: Elementor backup, `heroans` hash guard, Kinsta purge, Playwright/GVC desktop + mobile 390, Growth Forms smoke and dataLayer check.

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
