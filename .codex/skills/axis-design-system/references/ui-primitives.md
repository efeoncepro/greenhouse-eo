# Product UI primitives — consumption and verification
## Distribución verificada — 2026-10-07

Publicado en GitHub Packages: `axis-ui-primitives@0.6.5`, `axis-tokens@0.6.0`, `axis-ui-contracts@0.7.0`. [Release v0.6.5](https://github.com/efeoncepro/axis-design-system/actions/runs/37669427070) SUCCESS, fuente `88f1ecc9c529d1d2cbeb3b24efb5f41199740f2d`. Instalación limpia, exports DOM/React/integrations, SSR y igualdad byte a byte del JS/CSS con el build verificado: PASS. Think fija registry + lockfile, sin `link:`; build y typecheck PASS, main `474250195059ad0db42ec3aa3f2d24ad60f3e7fc`, Vercel Production Ready en https://think.efeoncepro.com/preview/video-player. AXIS main y https://axis.efeonce.org/references/video-player/ desplegados.

El incidente intermitente de pintura azul en sesiones antiguas del navegador integrado sigue ABIERTO; esta publicación no acredita su corrección. WordPress conserva bloque candidato sin activación ni modificación del artículo publicado. Dispositivos/AT físicos y streaming real mantienen sus gates. Registry empaquetado 0.7.2 conserva su inventario anterior; no inferir descubrimiento de video desde ese paquete histórico.

Los estados de entrega anteriores conservan la historia; prevalece la distribución verificada anterior.


## Forms baseline and release history — 2026-10-04

Published forms baseline: AXIS `df2de617a9a2033049c5a889f487e970de85a345`, 2026-10-04. Specialized
inputs have a later source cut below. These are independent package versions, not a single
version to apply to every dependency:

| Package | Compatible version | Owns |
| --- | --- | --- |
| `@efeoncepro/axis-tokens` | 0.5.0 | La órbita color roles/ramps, `axisButton`, `axisCompact`, `axisForms` |
| `@efeoncepro/axis-ui-contracts` | 0.6.0 | Options, resolvers, candidate contracts and `formRecipes` |
| `@efeoncepro/axis-ui-primitives` | 0.4.0 | HTML/CSS and optional React controls |
| `@efeoncepro/axis-ui-registry` | 0.7.2 | Pattern lookup and 52 capabilities, including ten form families |

Release `v0.7.2` is published: [run 37239150937](https://github.com/efeoncepro/axis-design-system/actions/runs/37239150937)
succeeded for `df2de617`. Remote registry readback confirmed all four versions above. Fresh private
installs passed HTML/CSS without React, ten HTML builders, `forms.css`, 52 capabilities and `/evidence`;
React SSR passed with 18.3.1 and 19.2.7. This is package-consumption evidence, not product adoption or
promotion of the ten candidate form contracts. The separate CI run `37239148653` also succeeded for this source cut;
its result was verified independently of publication.

Earlier attempts did not publish: `v0.7.0` preflight stopped on removable-chip overflow at 400% text
enlargement in mobile WebKit/Linux ([run 37238026404](https://github.com/efeoncepro/axis-design-system/actions/runs/37238026404));
`v0.7.1` runs were cancelled after CI exposed timeouts in aggregated context/route tests. Source
`df2de617` fixes reflow and separates those cases without extending the timeout or reducing coverage.

Use the [private-package runbook](../../../../docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md)
for confirmed registry installation and consumer evidence. Pin exact published compatible versions.
Package access, public Lab deployment, package publication and adoption by a product are separate checks.
Greenhouse's future La órbita migration is planned; this source does not change its MUI/Vuexy theme or pins.

Canonical API and contracts live in AXIS: `packages/primitives/README.md`, `packages/contracts/src/forms.ts`
and `docs/architecture/FORM_PRIMITIVES_DECISION_V1.md`. Public references:
[forms guide](https://axis.efeonce.org/docs/forms/), [Field](https://axis.efeonce.org/patterns/efeonce.field/),
[Select](https://axis.efeonce.org/patterns/efeonce.select/). Verify the deployed revision before treating
public content as evidence of the source cut above.

## Choose the control and entry point

Import `/forms.css` once. The package root is usable without React; `/react` is the explicit React adapter.
Do not copy Astro, Lab CSS or its configuration controls into a product.

| Need | Export / boundary |
| --- | --- |
| Label, help, error, field identity | `Field` wraps one known direct control; `FieldRoot`, `FieldLabel`, `FieldDescription`, `FieldMessage`, `useFieldControl` support compound adapters |
| Text, email, URL, telephone | `Input`; `SearchField` adds explicit clear and `PasswordField` adds a named visibility action |
| Multiline text | `Textarea`, optional growth/counter with explicit accessible copy |
| One binary choice | `Checkbox`; partial state belongs here, not to Switch |
| Exclusive choice | `RadioGroup`, native fieldset/legend and radio behavior |
| Immediate binary preference | `Switch`, stable label and native checkbox semantics |
| Multiple choices | `CheckboxGroup`, required means at least one enabled member |
| Short finite list with context | `Select`, rich descriptions and committed-selection check |
| Explicit native-platform or no-hydration requirement (document the reason) | `NativeSelect` or `selectHtml`; native options do not render rich descriptions |
| Search among supplied options | `Combobox`, React-only, explicit single selection; no freeform/multiselect |
| Incrementable quantity | `NumberField`; use text/inputMode for IDs, phone or exact financial decimals |

Ten candidate contracts cover Field, Input, Textarea, Checkbox, RadioGroup, Switch, CheckboxGroup,
Select, Combobox and NumberField. Helpers are not additional contract families. HTML has nine native
family builders plus `formErrorSummaryHtml`; it does not acquire React-only interactions from markup.
HTML IDs must be explicit and unique. `bindCheckboxGroup` and its cleanup provide group-required behavior;
`setCheckboxIndeterminate` synchronizes native partial state. React handles those bindings.

`FormProvider` inherits line/surface/size/density; explicit props win. Choose controlled value/checked OR
uncontrolled defaultValue/defaultChecked. The product resets controlled state; uncontrolled reset remains
native. Disabled fields do not submit; readOnly text does. `FormErrorSummary` links to real controls and
focuses on a failed submission attempt; it is not an automatic alert on every edited character.

## Select, keyboard and popup ownership

**Approved default (2026-10-07):** finite-choice product UI uses AXIS `Field` + `Select`.
The AXIS Astro Lab uses `components/LabSelect.astro`, which SSR-renders and hydrates those same
exports. Do not recreate the dropdown with bare `<select>` and local CSS. Native controls require
a documented platform/no-hydration reason; existing Lab exceptions are frozen, not approval.
The ordinary Lab test `approved-selects.test.ts` rejects new handwritten controls. Astro without a React integration is not an exception: `LabSelect.astro` supplies the approved hydration adapter. Never update legacy fingerprints solely to clear this gate. Verify pointer/keyboard selection, focus return, selected-state marker, popup fit on mobile and labeled no-JavaScript fallback. Canon:
[Lab approved controls](https://github.com/efeoncepro/axis-design-system/blob/main/docs/architecture/LAB_APPROVED_CONTROLS_DECISION_V1.md).


`Select` renders native markup on the server and enhances after hydration. The visible trigger owns its
Field name; a native select owns `name`, `form`, autocomplete, validation and FormData. The forwarded ref
still reaches the select; focus redirects to the trigger. Use `onValueChange` or native `onChange` as documented.
Options have unique value/label, optional description and disabled state. Required and placeholder work;
readOnly does not apply. Disabled/removed choices cannot submit a stale value after hydration.

Arrows/Home/End/PageUp/PageDown move active choice; typing matches labels, repeated letters cycle.
Enter/Space/Tab commit; Escape cancels. Descriptions, active focus and committed check have distinct roles.
Select and Combobox share tokenized popovers, viewport collision handling and reduced motion. The popup
stays in the same DOM tree, including dialogs. Without Popover API support a containing block can clip the
fixed fallback: choose NativeSelect for that environment. The product owns fetching, cancellation, async
errors and its focus trap. Keyboard pattern: [WAI-ARIA select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/).

## Visual grammar and icons

Consume `axisForms`, `axisButton`, `axisCompact` and their generated CSS. Business-line identity derives
from `axisColorSystem`/`axisOrbitRamp`; the canonical accent is not automatically a small-text foreground.
Functional error, warning, success and neutral meanings remain independent of line. Existing `axisRamp`
is compatibility during a future product migration, not an alternative own-brand identity.

Text fields have one continuous wrapper focus contour. The inner input must not acquire another global
outline; do not disable focus visibility to hide doubled rings. Error meaning survives focus and hover.
`leadingIcon="mail"` and `leadingIcon="folder"` supplement the persistent label with shared packaged
functional icons (`buttonOptions.icons`). They are decorative/aria-hidden. Trazo/Plastilina artwork from
`axis-graphic-line` is a separate visual resource; do not substitute it for dense functional-control glyphs.

Buttons keep the 0.75rem radius, orbital loading and opt-in CTA `arrowMotion: "nudge"`. Chips and badges
use `/compact.css`: Badge/CountBadge inform; Chip labels; FilterChip/ChoiceChipGroup use native checkbox/radio
semantics; ActionChip/RemovableChip expose named actions. Prefer soft surfaces; outline only when the border
clarifies hierarchy. The product owns pending results, announcements and focus recovery after removal.

## Verify in the consuming runtime

Run the owning package build/typecheck/tests, `pnpm design:check` and `pnpm agent:check` for catalog changes.
AXIS `docs/quality/forms.md`, `buttons.md` and `compact.md` own their exact browser/visual commands and
revision-bound evidence. Do not copy historical passing counts into a new release result.

Validate native submit/reset, required/error focus, keyboard selection/dismissal, disabled/readOnly,
320px reflow, RTL, text enlargement, reduced motion and each adopted light/dark business-line context.
Inspect pixels with menus open and fields focused. Automated axe and emulated WebKit do not certify
VoiceOver/NVDA, physical touch, autofill/password managers or consumer server validation. macOS baselines
are not Linux baselines. Persistence, permissions, retries and draft/navigation policy stay product-owned.

CSS that embeds a data URI ships it **unquoted and fully percent-encoded** (`url(data:…)`). Bundlers that
rewrite quoted `url("…")` as file paths can crash the consumer build: Astro 7's `astro:tsconfig-alias-css` pass
failed Think with `ENAMETOOLONG` on the mention mask (primitives 0.6.8), which the alias-free AXIS Lab did not
reproduce. Before releasing CSS consumed by another host, build that consumer against the local AXIS `dist`.

Date/file controls and multiselect Combobox are outside this delivery. Published packages do not authorize
replacing Greenhouse's existing MUI controls: record reuse/extend/adapt and verify the product boundary first.

## Specialized inputs · source 0.5.0 (not published)

Source `a0c6130` is pushed to AXIS `main`; `6fff346` synchronizes Lab asset references. This does not
publish primitives 0.5.0 or prove consumer adoption. The new pure `/input-behavior` and separate
`/input-phone` exports accompany React `PhoneField`, `EmailField`, `UrlField`, `DocumentField`, `RutField`
and `DecimalField`. Canonical API: AXIS `packages/primitives/README.md`.

- Keep editable `display` separate from canonical `value: string | null`; preserve incomplete/invalid
  text. Format on blur, leave IME composition intact, and let the product reset controlled state.
  `ready` is formatting readiness, never server validation, number ownership or deliverability.
- Email has no mask and preserves case/aliases. RUT formatting does not validate its checksum; URL
  normalization is not destination/SSRF policy. Decimal uses an explicit locale and exact strings.
- Use `phoneCountryOptions(locale, allowlist?)` from `/input-phone`, not copied country tables. It
  localizes/sorts metadata countries with `Intl.DisplayNames`/`Intl.Collator`; the current dependency
  supplies 245 countries/territories. An optional nonempty, unique supported-country list narrows the
  selector explicitly; locale does not choose a country or impose a submission allowlist.
- `PhoneField` takes controlled `country`/`onCountryChange`, `countries` and `countryLabel`. For long
  lists pass `countrySearch: {emptyMessage, invalidMessage, placeholder?}` to enable search by name or
  calling code; without it the selector remains `Select`. Keep accessible copy product-owned.
- Compose matching fields in shared grid rows so wrapped help does not misalign independently stacked
  columns. The Lab demonstrates the package; do not copy its layout as component implementation.

Growth Forms has a local injected opt-in port, without activation or pin/theme changes. Its legacy
selector still derives 18 country prefixes from `CALLING_CODES`; it does not inherit AXIS's catalog.
That list is not a strict allowlist for explicit international `+` values. Catalog adoption requires
an explicit product decision and server/payload/host verification; follow the
[Growth Forms decision](../../../../docs/architecture/GROWTH_FORMS_AXIS_INPUT_BEHAVIOR_DECISION_V1.md).
Promotion requires an exact published package and consumer evidence.


## Product compositions and Growth CTA · approved source, 2026-10-05

`TASK-2007` owns the local product primitives and the native AXIS scheduler/Growth CTA composition.
Operator visual approval received on 2026-10-05 («Aprobado todo»); source observed on AXIS
`3c8a6dd` plus local changes. New product exports and `/growth-cta` remain **unreleased** in
`packages/registry/src/package-availability.ts`; approval, source push, package distribution and
consumer adoption are separate planes. Do not infer those exports from primitives 0.5.0.

- Product: remote/media/group options, feedback, Disclosure/Dialog/Complementary, MultiSelect,
  Tabs/Pagination, DateField/DateRange and FileField; API and QA are in AXIS
  `PRODUCT_PRIMITIVES_DECISION_V1.md` and `docs/quality/product-primitives.md`. Date/file controls
  are now local source additions, superseding the earlier delivery boundary above. No rich editor,
  universal drag-and-drop, DataGrid or multiselect Combobox was added.
- Scheduler: native `/scheduler`, `axisScheduler`, model snapshots and actions. Consumer owns
  availability, validation, CAPTCHA, booking and confirmed receipt. Details and evidence:
  AXIS `SCHEDULER_COMPOSITION_DECISION_V1.md` and `docs/quality/scheduler.md`.
- CTA: `/growth-cta` plus `/growth-cta.css`, `axisGrowthCta`, serializable `GrowthCtaModel`.
  Three actual placements (`embedded`, `inline_banner`, `slide_in`), three appearances and five
  actions. Form/meeting adapters own mounting/AbortSignal/disposal; Growth owns policy, campaigns,
  network and measurement. Sticky banner, popup modal and floating button remain unimplemented.

Approved banner recipes: `inline_banner/minimal` is compact editorial with fine rules;
`inline_banner/spotlight` uses deep navy with larger headline and action/note grouped. Both stack
in narrow containers. Opt-in `content.headlineMarks: 'ring-and-sphere'` puts ring only in eyebrow
and sphere at headline end via `answerHtml` from `axis-graphic-line`. `content.headlineEmphasis`
selects one exact phrase; Bricolage lead 400/main 700 derives from tokens without changing accessible
copy. Keep canonical action padding in hover/focus. `meetingPresentation: 'dialog' | 'inline'`
selects a visual surface of the same action and retained state; it is not another booking path.

API and QA: AXIS `packages/primitives/README.md`, `GROWTH_CTA_COMPOSITION_DECISION_V1.md`,
`docs/quality/growth-cta.md`, `/references/growth-cta/#banners`. Final local CTA verification:
40/40 journeys and 4/4 affected cases, build/typecheck, 198 contracts, design/agent PASS.
AT physical/manual, exact release/install and consumer adaptation remain pending. Before adoption
verify CSS and graphic-line dependency in an installed set, then policy/events/Shadow DOM/bundle
in the Growth renderer and a freshly loaded host; no pins or theme changed here.

## Portable video — published 2026-10-07

`@efeoncepro/axis-ui-primitives/video-player` owns DOM/SSR; `/video-player/react` and
`/video-player/integrations` are optional. Import `/video-player.css`. Published primitives 0.6.5
uses tokens 0.6.0 and contracts 0.7.0; contract `efeonce.video-player` remains 0.5.0 candidate.
Cinema/Editorial/Review share one implementation; `presentation: embedded | contextual` is independent.
Think consumes an exact registry pin + lockfile, never a sibling checkout or vendored player in cloud.

Before adoption read AXIS `docs/agent-composition/video-player.md`,
`docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md` and `docs/quality/video-player-0.5.0.md`.
[The graphic-line reference](../../efeonce-graphic-line/references/video-player.md) owns current visual criteria,
features, verified delivery and open limits. Use token-owned 44px controls resilient to host resets,
real captions, automatic overlay hiding and static orbital replay with an accessible name.

Approved replay follow-up (2026-10-07, published primitives 0.6.6 / tokens 0.6.1): image-bound centering excludes the dock,
with shared responsive orbit/halo/scrim tokens under `axisVideoPlayer.replay`. Ended uses the model
poster when available and leaves the last frame otherwise; replay and seek clear the overlay.
Keep this inside the portable renderer, never consumer CSS. Release 37696704305 SUCCESS;
Think d36ba40 and Studio 3ba7cff consume registry 0.6.6 with Vercel SUCCESS. WordPress stays unactivated.

Consumer adapters must expose the full model and client callbacks, not only source/poster. Think and the
WordPress candidate use `axis-video:configure` ({model,options}) before enhancement and `axis-video:ready`
({player}) afterward. Keep functions out of serialized props/block attributes. Parity fixtures supply actual
tracks, thumbnails, chapters and transcript; tests must reject omissions before changing skins. Build the
standalone WordPress artifact from the installed published package with `--package-root`; retain its version
and SHA256 manifest, all engine chunks and content-based cache version. No separate player implementation.
Test co-loaded primitive styles as well as host resets: `.axis-button__spinner` hid the video replay orbit
until its own selector explicitly set display (0.6.4 patch). DOM presence alone is not visual parity.

WordPress remains an unactivated candidate block. The in-app blue-paint incident remains open;
fresh playback and decoded frames do not prove its resolution. Native adapters, physical AT/devices,
streaming providers, review persistence and analytics consent remain consumer responsibilities.
No new package release or full browser matrix is required for this documentation consolidation.

Verified against AXIS release `7fb549a`, main documentation `15b1898`; Think `cd428c7` — 2026-10-07.

## Efeonce mention (`efeonce.mention`) — published 2026-10-18

Inline link to an Efeonce service or product: isotype in front, pill in the accent of the service line,
isotype tilt on hover (none under reduced motion; forced colors keep a LinkText border and the isotype).
Only for Efeonce destinations; few per section, short labels (2–4 words); not a CTA, not for external links.
Brand meaning and when to use it: [graphic-line applications](../../efeonce-graphic-line/references/applications.md#a14-mención-efeonce-en-texto-corrido-2026-10-18).

| Layer | Owns |
| --- | --- |
| `axisMention` (`packages/tokens/src/mention.ts`) | Palette per line (growth, brand, engine, voice, revenue-hubspot, revenue-salesforce) × surface (light/dark): isotype accent ≥3:1 vs ground, pill tint rest/hover, ink ≥4.5:1; lengths in em, weight 500 |
| Contract `efeonce.mention` 1.0.0 `candidate` (`packages/contracts/src/mention.ts`) | `resolveMention`, `isEfeonceHref`, `mentionOptions`, `MentionValidationError` (INVALID_INPUT, LABEL_REQUIRED, NOT_EFEONCE_HREF, INVALID_LINE, INVALID_SURFACE, INVALID_OPTION). Accepts a root-relative path or https on `efeoncepro.com` / `efeonce.org` and subdomains; rejects http, credentials, `//host`, `#`, mailto, tel and look-alike hosts. Defaults: surface light, line growth; `newTab` adds `target=_blank rel=noopener` |
| `axis-ui-primitives` | `mentionHtml`, `mentionAttributes`, `mentionTree`, `mentionCss`, export `./mention.css`, React `<Mention>` in `/react`. Markup `<a class="axis-mention" href data-line data-surface>label</a>`, no JS |
| Registry / Lab / quality | Capability `efeonce.mention`; `/patterns/efeonce.mention/`; AXIS `docs/quality/mention.md` |

The isotype is a CSS mask data URI generated from the sealed `axis-brand-assets/assets/efeonce-isotype-negative.svg`
by `node packages/primitives/scripts/mention-isotype.mjs`; a test fails when it drifts and another forbids quoted
urls. Never put the isotype in markup or alt text. The doubled selector `a.axis-mention.axis-mention` plus
`background-image:none` resists host link styles; a host may set `--axis-mention-accent|-tint|-tint-hover|-ink`
on the anchor instead of forking the CSS.

Published set: tag `v0.7.5` (`dd833d5`) = tokens 0.6.5, contracts 0.7.5, registry 0.7.3, primitives 0.6.8;
tag `v0.6.9` (`69492cf`; mask fix `701a164`) = primitives 0.6.9 with the unquoted mask (see the data-URI rule above). **Pin primitives
0.6.9 or later; never 0.6.8 in Astro hosts.**

Consumers (verified 2026-10-18):

- **WordPress** (`efeonce-public-site-runtime`, plugin `eo-elementor-widgets`): `assets/css/axis-mention.css` is a
  byte copy of primitives 0.6.9 `dist/mention.css` with a header recording package version and sha256
  (`baacdd7053ec7c6b70a881cefb32cae03b77ca8e77ca94c4d311fa8f0f8cee4f`); recopy it from
  the package, never edit it. `includes/eo-mention.php` enqueues handle `axis-mention` site-wide (frontend, Elementor
  preview, block editor). Live on the Inbound landing (`data-line="revenue-hubspot" data-surface="dark"`).
- **Think**: exact pin 0.6.9; `src/components/EfeonceMention.astro` wraps `mentionHtml` + `mention.css` (props =
  `MentionOptions`; a non-Efeonce href fails the build); noindex preview `https://think.efeoncepro.com/preview/mention`
  (Think routes have no trailing slash; `/preview/mention/` answers 308). Live: commit `f603060`, Vercel production
  Ready, 200 with 3 mentions, noindex, no overflow, `astro check` 0 errors. Published 0.6.9 `mention.css` sha256 =
  the WordPress copy's.

AXIS owns the mention; a landing or product never forks its CSS. The mention is a mechanism, not a template for
the page that first used it.

## Site navigation (`efeonce.site-nav`) — published, live on efeoncepro.com since 2026-10-23

Global site menu (header, mega menus, onepage, CTA slot) written once in AXIS and consumed by WordPress. Program
EPIC-055 (TASK-2040 AXIS, TASK-2042 rollout); decision PDR-027. Live on every page of efeoncepro.com except `/blog/`.

**Current versions:** `@efeoncepro/axis-ui-contracts` **0.7.12** + `@efeoncepro/axis-ui-primitives` **0.7.12**
(tags `v0.7.8`, `v0.7.9`, `v0.7.10`, `v0.7.12`; the `v0.7.2` tag was already taken, so 0.7.8 is the first site-nav
tag; `v0.7.11` stopped before publishing and is not a package). Pin 0.7.12 or later.

| Layer | Owns |
| --- | --- |
| Contract `efeonce.site-nav` (`packages/contracts/src/site-nav.ts`) | Document schema, validation, context matchers, «Estás aquí» and current-page derivation; export `siteNavLocalPath(site, href)` (0.7.9) |
| Primitives (`packages/primitives/src/site-nav*.ts`) | `siteNavHtml` (server-side render, links ship in the HTML), `siteNavLinks`, `siteNavCss`, browser `createSiteNav` / `enhanceSiteNav` (framework-free progressive enhancement); it fetches nothing and only exposes the CTA slot |
| Tokens | `axisSiteNav` (includes `motion.onepage.radiusPx`, see 0.7.10) |
| Lab | `/patterns/efeonce.site-nav/` |

Releases:

- **0.7.8:** desktop island 61 px + border (63) with loose items and a 45 px scheduler button; host offset
  `--axis-site-nav-offset`; host isolation (see the host contract).
- **0.7.9 (contracts + primitives):** «Estás aquí» is derived from the service's own `href` when no context matcher
  matches — root-relative, or https on `doc.site` or `www.` + site. Another host (e.g. think.efeoncepro.com) never
  marks a page of the site; two services sharing a URL mark nothing; a matcher wins and stays only for exceptions.
  `aria-current="page"` follows the same host rule, and the page path may come absolute. New export `siteNavLocalPath`.
- **0.7.10 (primitives):** the onepage circle grows to the farthest corner of the window, computed in JS on open and
  resize (`--asn-op-r`, measured in the onepage box so the host offset keeps the centre on the hamburger); `150vmax`
  without JS. It fixed an uncovered corner past ~1500 px wide. The token `axisSiteNav.motion.onepage.radiusPx` (1720)
  stays as the 1440-board measure and is **no longer the radius**; never use it to size the circle.
- **0.7.12 (primitives):** the island's tone reading. Without `data-site-nav-tone`, a background gradient decides by the
  mean luminance of its opaque stops, a background image counts as dark, a color under 0.5 alpha does not decide, and
  fixed or sticky host chrome (theme bar, chat, cookie notice, the landing dock) is skipped. It fixed a light island
  over the navy E-E-A-T gradient band of /servicios/posicionamiento-seo/ (verified live 2026-10-23).

**Host contract** (AXIS `PRIMITIVES.md`):

- The host **never styles inside `.axis-site-nav`**. Its only inputs are `--axis-site-nav-offset` and
  `--axis-site-nav-z`. Any visual fix goes to AXIS and reaches the host by a version bump.
- The host loads the fonts: Bricolage Grotesque opsz/wght 200–800 (the menu does not use the width axis) and Poppins
  300–700.
- Isolation: every rule carries `:not(#axis-site-nav-isolation)` (id weight) and the root restores browser defaults for
  inherited type, links and hover, buttons, lists, `li` margins, image `vertical-align`, `overflow-wrap`/`word-break`.
  A browser test runs it against a hostile host sheet copied from Ohio.

Consumers (verified 2026-10-23):

- **WordPress** (`efeonce-public-site-runtime`): plugin `eo-site-nav` renders with `EOSN_Render`, byte-identical to
  `siteNavHtml` (17 parity cases at AXIS 0.7.12) plus a validator (35 parity cases); theme `ohio-child` pins the files in
  `assets/vendor/axis/site-nav/0.7.12/` (`VERSION.json` with sha256, copied from the published package by
  `scripts/vendor-axis-site-nav.mjs`) and the constant `EO_SITE_NAV_AXIS`. Bump procedure and operation:
  `efeonce-public-site-wordpress` → `references/global-site-navigation.md`.

Approved design: below 1440 a service description is one line with an ellipsis (canvas board Mega1280, confirmed by
the fidelity session on 2026-10-23); at 1440 it must be whole.

Do not confuse it with `efeonce.surface-composition`: its `nav` field is **descriptive** (a header drawn inside a
composed hero), not a running menu.

Architecture: [`PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md`](../../../../docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).
Brand criteria: [graphic-line applications](../../efeonce-graphic-line/references/applications.md#a15-encabezado-y-navegación-del-sitio-web-diseño-aprobado-2026-10-18-implementación-planificada).
