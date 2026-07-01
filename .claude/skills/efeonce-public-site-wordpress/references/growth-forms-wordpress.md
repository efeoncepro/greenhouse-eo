# Growth Forms on WordPress

Use this reference for public Growth Forms embeds and the AEO renderer.

## Architecture

- Greenhouse owns form definitions, versions, render contracts, submissions, consent, validation, destinations, dispatch, and retries.
- WordPress is a host surface. It must not own HubSpot mapping, portal credentials, Turnstile secret, or destination logic.
- Generic public renderer is `<greenhouse-form>`, served from Greenhouse.
- AEO `/aeo-2/` now uses the live `<greenhouse-form>` renderer by stable `form-key` after the governed TASK-1298 cutover (2026-07-01). The temporary bridge was replaced in Elementor widget `convers`; `heroans` stayed stable (`e0b951b2456a83578cd9e22005900521`), Kinsta was purged, and backup meta is `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- TASK-1298's long recovery created reusable platform safeguards. Do **not** assume every new form needs the full AEO ceremony. New forms should use the hardened renderer plus a proportional public API smoke, desktop/mobile 390 frame review, overflow check, and captcha/email-gate smoke when configured. Add a landing-specific pixel-aware gate only for high-value public landings or hostile host CSS.

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

Do not revert AEO `/aeo-2/` to the temporary bridge unless the operator explicitly requests rollback. Any future AEO form/renderer change must keep `heroans` guarded, preserve the `form-key` embed, purge Kinsta after WordPress mutation, and pass `pnpm public-website:verify-aeo-live-contract`.

For non-AEO embeds, the widget/minimal host should be routine:

1. Resolve the target form by `form-key`, not page, screenshot or slug.
2. Confirm public `GET` by `formKey` returns the expected version, `copy.submit`, fields and
   `security.captcha` when required.
3. Render the embed in the real host surface or a faithful local preview, then inspect desktop and
   mobile 390 screenshots.
4. If the host theme can override native controls, reuse the TASK-1298 visual pattern: assert
   fields/selects/CTA by computed styles **and** pixel-sample real control boxes in the PNG.
5. Fix renderer/shared host adapter issues globally before adding one-off page CSS.

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
- AEO-specific live gate: `pnpm public-website:verify-aeo-live-contract` verifies WordPress has `<greenhouse-form>` in `convers`, no bridge, protected `heroans`, public API by slug/formKey + fail-closed captcha, typography, visual integrity desktop/mobile 390, premium dropdowns, focus/ARIA, corporate email gate, Turnstile `captchaToken` boundary, and dataLayer no-PII. This is strict for AEO, but for other forms treat it as a reusable pattern to scale, not a mandatory command.
