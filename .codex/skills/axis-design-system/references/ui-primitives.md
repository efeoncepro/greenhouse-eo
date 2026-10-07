# Product UI primitives — consumption and verification
## Distribución verificada — 2026-10-07

Publicado en GitHub Packages: `axis-ui-primitives@0.6.3`, `axis-tokens@0.6.0`, `axis-ui-contracts@0.7.0`. [Release v0.6.3](https://github.com/efeoncepro/axis-design-system/actions/runs/37630788367) SUCCESS, fuente `7fb549a4ee862f077a05e8ff6bc0fadc58f44ff0`. Instalación limpia, exports DOM/React/integrations, SSR y igualdad byte a byte del JS/CSS con el build verificado: PASS. Think fija registry + lockfile, sin `link:`; build y typecheck PASS, main `cd428c789a4fea2feab3b4b0d08cf68c7f07efd5`, Vercel Production Ready en https://think.efeoncepro.com/preview/video-player. AXIS main y https://axis.efeonce.org/references/video-player/ desplegados.

El incidente intermitente de pintura azul en sesiones antiguas del navegador integrado sigue ABIERTO; esta publicación no acredita su corrección. WordPress conserva bloque candidato sin activación ni modificación del artículo publicado. Dispositivos/AT físicos y streaming real mantienen sus gates. Registry empaquetado 0.7.2 conserva su inventario anterior; no inferir descubrimiento de video desde ese paquete histórico.

Los estados de entrega anteriores conservan la historia; prevalece la distribución verificada anterior.


## Current source and release boundary

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
| Native platform picker / no React | `NativeSelect` or `selectHtml`; native options do not render rich descriptions |
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

## Portable video candidate · 2026-10-07

`@efeoncepro/axis-ui-primitives/video-player` owns DOM/SSR; explicit `/video-player/react` and
`/video-player/integrations` are optional. Always import `/video-player.css`. Tokens: `axisVideoPlayer`;
contract: `efeonce.video-player` 0.5.0 candidate. Cinema/Editorial/Review share one implementation;
`presentation: embedded | contextual` is independent of skin. No new player engine inside a consumer.

Before adoption read AXIS `docs/agent-composition/video-player.md`,
`docs/architecture/VIDEO_PLAYER_SKINS_DECISION_V1.md` and `docs/quality/video-player-0.5.0.md`.
Visual decisions and operator corrections are tracked in
[the graphic-line video reference](../../efeonce-graphic-line/references/video-player.md).
Use token-owned 44px controls resilient to host resets, real caption tracks, automatic chrome hiding
and a static orbital replay with accessible name; do not substitute a loader animation for replay.

Source pushed to `codex/video-player-20261007` in AXIS/Think/WordPress/Greenhouse. Exports remain
unreleased: the published version number alone does not imply availability. Think's local link fails
on Vercel Preview; replace it only with a verified distribution pin before deploying. WordPress is an
unactivated candidate block, not a live article change. The in-app blue-surface painting incident is
still open despite passing fresh playback/decoded-frame checks; verify painted pixels across full
playback, replay and tab changes before release. Preserve consumer authority for review, streaming,
analytics consent and persistence. Push, visual acceptance and production adoption remain separate.

Video release autorizado posteriormente por el operador: target tokens 0.6.0, contracts 0.7.0, primitives 0.6.2, tag `v0.6.2`. Pipeline exige video browser antes de publicar. Sustituir Think link por pin exacto sólo tras registry readback; estado vivo en la referencia de graphic-line video. Publicación no acredita resolución del incidente de pintura azul.

Instrucción posterior: AXIS/Think a main. Target actual primitives 0.6.3; v0.6.1/v0.6.2 no publicaron. Think consume registry privado + pin/lockfile, nunca un link a un checkout hermano en cloud. Cada producto valida y actualiza su versión de la implementación central AXIS. Estado vivo en graphic-line/video-player y QA AXIS.
