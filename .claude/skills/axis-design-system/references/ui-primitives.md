# Product UI primitives — consumption and verification

## Current source and release boundary

Verified source: AXIS `df2de617a9a2033049c5a889f487e970de85a345`, 2026-10-04. These are independent package versions, not a single
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
