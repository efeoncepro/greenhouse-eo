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
- `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`

## Editorial Premium Brief host

TASK-1598 establishes a reusable public-site composition around the canonical `GrowthFormEmbed`: one editorial
paper surface, clear document hierarchy, trust rail, semantic line icons, surface-mapped primary submit and a
separate meeting alternative. `diagnostic_premium` still owns every interactive behavior and value. The
landing-specific market/activation pictograms are not a renderer API; a second use must promote browser-safe
semantic option metadata instead of copying selectors or observers. Instance details and live evidence stay in
`references/landings/influencer-marketing.md`.

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
7. Host token overrides with a `styleVariant` (e.g. `diagnostic_premium`): the variant re-declares
   `--ghf-*` on the inner `.ghf-root[data-ghf-style-variant]`, so an override on `greenhouse-form` or
   `.ghf-scope` loses (Creativa's live CTA painted the variant teal instead of the host `#0375db`).
   Scope under the host card: `greenhouse-form :is(.ghf-scope,.ghf-root[data-ghf-style-variant]) { --ghf-* }`,
   and verify the submit button's computed style on the live page.

## Canvas-designed forms

A form drawn in a canvas is a brief for configuring the governed renderer; the host never draws fields.
Before approving or implementing the canvas, map each canvas control to an existing renderer type or
`presentation` and configure it in the form version, with visual parity as the acceptance criterion:

- chip/card choices → `type: 'radio'` (renders `ghf-choice-group--cards`), not `select`. **Renderer-version
  dependent:** before Greenhouse `ab622e958`, `radio` outside `hubspot_pillar` rendered as an empty text box.
  Check which renderer is live in production (`/growth-forms/renderer-latest.js`) and preview by interception
  (below) before promising cards to the operator;
- multi-select chips: in production only the `hubspot_pillar` variant draws a multiple selection as chips
  (case `efeonce-media-diagnostic`, Agencia de Medios 2026-10-16); other variants need a renderer release first;
- per-label icons → `presentation.icon` (user, mail, phone, link, linkedin, briefcase, calendar, clock,
  message, file, globe);
- country picker → `presentation.control: 'country_select'`;
- dropdown/listbox for a single `select` in any variant (pillar draws `select` as chips otherwise) → `presentation.control: 'premium_select'` (renderer code complete 2026-10-18, not yet released; Agencia de Medios waits for the release: `scripts/growth/activate-media-diagnostic-premium-select.ts --apply` refuses until production `renderer-latest.js` contains `"premium_select"`);
- two columns are adaptive (`@container (min-width: 520px)` on `greenhouse-form`): the host card's width
  and padding decide it. Creativa measured 516 px inside a 588 px card with 36 px padding → one column, 8
  fields stacked beside an empty column. Fix in the host layout, not the form: give the form column room
  (Creativa 2026-10-15: grid `.82fr / 1.18fr` from 1200 px with the companion column `position: sticky`,
  stacked full-width below → 622 px, two columns);
- privacy link text is form copy, not host markup.

Measure the `greenhouse-form` width (≥520 px for two columns), radio groups and icons live before closing.

Host theming of the action: declare the tokens on `.ghf-actions` (e.g. `--ghf-accent`, `--ghf-accent-contrast`,
`--ghf-action-shadow`) inside the host card instead of fighting the variant with `!important`. Host CSS for a
not-yet-published version can ship ahead if it is forward-compatible (selectors that only match once the new
field types exist), as Creativa did for its two-step version.

Preview before publishing: a contract or renderer change can be seen on the live host page without touching
production by intercepting, in a Playwright test browser, the form contract API response (and, if needed, the
renderer bundle) and serving the candidate version. Use it to validate host width, Ohio CSS and host tokens at
desktop and 390 before promising a design or running a publish.
Only true gaps (exact pill-chip look vs choice cards, AXIS checkbox styling, a custom listbox beyond
`country_select`) become a renderer extension in its own task and renderer release; flag them to the
operator **before** publishing, not after. Field catalog and versioning: `greenhouse-growth-forms`.

### Landing diagnostic forms (cases)

One form per service landing, published by its own script and delivered `direct` to its own HubSpot form
(registry row in `scripts/growth/hubspot-destinations.registry.ts`). Instance detail lives in the landing file.

| Form | Landing | Key / surface | Variant | HubSpot form | Publisher |
| --- | --- | --- | --- | --- | --- |
| `efeonce-media-diagnostic` | Agencia de Medios (2026-10-16) | `d784b9e2-f6e4-4e24-b059-f164fc82f734` / `fhsf-efeonce-media-diagnostic` | `hubspot_pillar` | «Lead Gen - Agencia de Medios» | `scripts/growth/publish-media-diagnostic-form.ts` |
| `efeonce-performance-diagnostic` | Performance Marketing (2026-10-17) | `71ea684f-1ad9-4656-982b-159e4de46dd8` / `fhsf-efeonce-performance-diagnostic` | `hubspot_pillar` / `multi_step_light`, CTA «Pide tu diagnóstico» | «Lead Gen - Performance Marketing» | `scripts/growth/publish-performance-diagnostic-form.ts` |

Performance maps FIRST_NAME, LAST_NAME, EMAIL, COMPANY, WEBSITE, country and
`gh_form_performance_{audiencia,canales,inversion_mensual,objetivo,prioridad,crm,rol}`; live it renders 26 inputs.
It replaces the `efeonce-performance-brief` named in TASK-1865's original contract, which was never published.
Both are pending a first real browser submission (Turnstile blocks automation) and the GA4 `generate_lead`
check; Performance also lacks its TRACKING-PLAN row.

## Inline pill (`inline_pill`) in a host with its own template

Live since release `40b330175855` (2026-10-24, renderer `1.2.0`). First case: the Glitch subscription on the blog
home `/blog/` (plugin `eo-blog-home`; Glitch section + bottom subscription). Form `efeonce-blog-subscription`, key
`6bc62588-a4a0-4214-9501-13b0c2948c81`, surface `fhsf-efeonce-blog-subscription`. Published from Greenhouse with
`pnpm growth:forms:publish-glitch-pill` (dry-run / `--apply` / `--publish`, the last refuses until `origin/main` serves
the consent code); connected to the page with `pnpm public-website:blog-home subscription <form_key> --apply`. Blog
home operation: `references/blog-home-operation.md`.

Consent: the pill has no checkboxes. For a **subscription** pill with a visible notice (`inlinePill.note`), subscribing
under that notice **is** the consent (operator approval 2026-10-24): Greenhouse stores the notice hash and the HubSpot
destination subscribes only with `consentBy: 'submission'` + that hash. Checkbox subscriptions are unchanged. WordPress
never declares or fakes this; it lives in the form version and its destination.

Host recipe (each rule fixed a live break on 2026-10-24):

- Enqueue the renderer from Greenhouse with the shared handle `gh-growth-forms-renderer-latest`
  (`<origin>/growth-forms/renderer-latest.js`), same handle as the Elementor widget, so a page loads it once.
- If the host template re-renders its DOM (morph, slider autoplay), make the element opaque to it — `data-dc-keep` in
  `eo-blog-home`; without it the autoplay erased the mounted form.
- Never reset or style inside `<greenhouse-form>`. The host reset must exclude it (`:not(greenhouse-form *)`); an
  ID-specific `all: revert` reset broke the renderer (duplicated text, squashed pill) and forced a disconnect.
- Give the element `display: block` and an explicit width (480 px = canvas open width, `max-width: 100%`; full width
  on phone). A shrinking flex column (`.gxw`) collapsed it.
- Align with public tokens only: `--ghf-inline-align: flex-start; --ghf-inline-note-align: left` (tablet board).
- Fallback child `a.ghf-fallback` in the idle pill's shape + the notice reserving its place: no layout jump, works
  without JS; the renderer replaces the children when it mounts.
- Without a real published form connected, show no subscription (`data-subscribe="off"`), never a simulated success —
  the canvas forms only simulated a submit and `/blog/` said «¡Listo!» for ~40 min without registering anything.

Host skin: `efeonce-public-site-runtime` → `wp-content/plugins/eo-blog-home/assets/css/eobh-host.css`. Preview with
the real form and no possible submit: `node scripts/public-website/blog-v3/preview/serve.cjs --subscribe <formKey>`.
Full recipe: `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md` §Receta; Greenhouse side:
`greenhouse-growth-forms` → `references/INLINE_PILL_HOST_AND_CONSENT.md`.

Pending (2026-10-24): a real submission by a person (Turnstile rejected the automated browser; do not bypass it) and
the HubSpot check of the contact subscribed to type `535702717`.

## Verification

For form work, verify:

- render contract loads from the browser origin;
- field-level validation and accessible errors;
- corporate email gate when configured;
- Turnstile path without exposing secret;
- submit without token fails as expected and creates no lead;
- HubSpot delivery is async through the dispatcher, never inline from WordPress;
- since 2026-10-09 all eight public-site forms deliver in `direct`, each to its own HubSpot form; `status=delivered` alone is not proof — check `form_destination_attempt` (HTTP 200);
- no horizontal overflow at desktop and mobile 390px;
- no technical/internal metadata is visible in public copy.
- AEO-specific live gate: `pnpm public-website:verify-aeo-live-contract` verifies WordPress has `<greenhouse-form>` in `convers`, no bridge, protected `heroans`, public API by slug/formKey + fail-closed captcha, typography, visual integrity desktop/mobile 390, premium dropdowns, focus/ARIA, corporate email gate, Turnstile `captchaToken` boundary, and dataLayer no-PII. This is strict for AEO, but for other forms treat it as a reusable pattern to scale, not a mandatory command.
