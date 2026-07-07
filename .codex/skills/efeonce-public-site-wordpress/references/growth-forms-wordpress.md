# Growth Forms on WordPress

Use this reference for public Growth Forms embeds and the AEO renderer.

## Architecture

- Greenhouse owns form definitions, versions, render contracts, submissions, consent, validation, destinations, dispatch, and retries.
- WordPress is a host surface. It must not own HubSpot mapping, portal credentials, Turnstile secret, or destination logic.
- Generic public renderer is `<greenhouse-form>`, served from Greenhouse.
- AEO `/aeo-2/` now uses the live `<greenhouse-form>` renderer by stable `form-key` after the governed TASK-1298 cutover (2026-07-01). The temporary bridge was replaced in Elementor widget `convers`; `heroans` stayed stable (`e0b951b2456a83578cd9e22005900521`), Kinsta was purged, and backup meta is `_gh_backup_before_aeo_1298_premium_renderer_20260701T065707Z`.
- TASK-1298's long recovery created reusable platform safeguards. Do **not** assume every new form needs the full AEO ceremony. New forms should use the hardened renderer plus a proportional public API smoke, desktop/mobile 390 frame review, overflow check, and captcha/email-gate smoke when configured. Add a landing-specific pixel-aware gate only for high-value public landings or hostile host CSS.
- Ohio child theme owns the shared **host safety layer** for Growth Forms (`wp-content/themes/ohio-child/assets/css/growth-forms-host.css`, enqueued as `ohio-child-growth-forms-host`). It is live on Kinsta after the scoped 2026-07-01 rollout (only `growth-forms-host.css` + `inc/enqueue-and-layout.php`; backup `/tmp/greenhouse-growth-forms-host-layer-20260701T103729Z`). It is scoped to Growth Forms host wrappers and prevents Ohio's broad `input/select/button` CSS from leaking into the renderer. It must not contain form fields, destinations, HubSpot mapping, Turnstile secrets or per-form business logic.

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

## Ohio Child Theme Host Layer

Use the child-theme layer instead of page-specific CSS when Ohio fights a Growth Form:

- runtime repo: `/Users/jreye/Documents/efeonce-public-site-runtime`;
- CSS: `wp-content/themes/ohio-child/assets/css/growth-forms-host.css`;
- enqueue: `wp-content/themes/ohio-child/inc/enqueue-and-layout.php`;
- scope: `.eo-growth-form`, `.gh-growth-form-host`, `.gh-aeo-growth-form-host`,
  `.gh-aeo-growth-form-card` + `<greenhouse-form>`.

Rollout safety:

Live status: the child-theme layer is deployed and hash-synced with the runtime repo as of
2026-07-01 (`pnpm public-website:verify-aeo-live-contract` green after Kinsta purge). The public-site
control plane now includes `eo-elementor-widgets` in the governed export/binding; latest reconciled
report `docs/operations/public-site-drift/drift-2026-07-01T10-54-46-557Z.json` has
`releaseSafety.fullRepoDeploySafe=true`, `content_drift=0`, `repo_pending_release=0` and
`live_untracked_file=0`. Still refresh `runtime-status` immediately before any rollout; green drift
is evidence, not automatic authorization for a full production deploy.

1. Refresh production code before applying: `pnpm public-website:export-live-code` then
   `pnpm public-website:diff-runtime`.
2. If `runtime-status` reports `releaseSafety.fullRepoDeploySafe=false` or
   `eo-elementor-widgets` under `classificationCounts.repo_pending_release`, do not deploy it as
   collateral in a child-theme CSS rollout; it needs its own plugin release decision.
3. Validate by injection or staging before Kinsta mutation: desktop + mobile 390, dropdown
   open, `scrollWidth==clientWidth`, focus/ARIA and relevant captcha/email-gate smoke. Premium
   dropdown stacking is renderer-owned (`data-overlay-open` on the active `.ghf-field`); do not fix
   buried listboxes with one-off page CSS.
4. After a live child-theme update, purge Kinsta and run the landing gate. AEO uses
   `pnpm public-website:verify-aeo-live-contract`.

Do not revert AEO `/aeo-2/` to the temporary bridge unless the operator explicitly requests rollback. Any future AEO form/renderer change must keep `heroans` guarded, preserve the `form-key` embed, purge Kinsta after WordPress mutation, and pass `pnpm public-website:verify-aeo-live-contract`.

For non-AEO embeds, the widget/minimal host should be routine:

1. Resolve the target form by `form-key`, not page, screenshot or slug.
2. Confirm public `GET` by `formKey` returns the expected version, `copy.submit`, fields and
   `security.captcha` when required.
3. Render the embed in the real host surface or a faithful local preview, then inspect desktop and
   mobile 390 screenshots.
4. If the host theme can override native controls, reuse the TASK-1298 visual pattern: assert
   fields/selects/CTA by computed styles **and** pixel-sample real control boxes in the PNG.
5. For premium custom selects, open the listbox and assert `aria-expanded=true`, the top option is
   actually above following fields, selected/hover text stays dark and `scrollWidth==clientWidth`.
6. Fix renderer/shared host adapter issues globally before adding one-off page CSS.

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
