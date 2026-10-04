# Consuming AXIS as an agent

## Entry points and ownership

- [Lab](https://axis.efeonce.org/): grouped navigation and visual resource search.
- [Search index](https://axis.efeonce.org/search-index.json): static resource discovery, previews and exact anchors.
- [Agent guide](https://axis.efeonce.org/agents/) and [capabilities](https://axis.efeonce.org/agents/capabilities.json): what can execute, required access, inputs, outputs and checks.
- [LLM entry](https://axis.efeonce.org/llms.txt): navigation for text agents; follow the catalog rather than inventing a command.

AXIS source: `packages/registry/src/capabilities.ts`; decision:
`docs/architecture/AGENT_CAPABILITIES_DECISION_V1.md`. The catalog currently exposes 41 capabilities:
29 contract-adoption entries and 12 checkout routes (3 artifact starters, 9 manifest resolvers).
Counts are a 2026-10-04 inventory, not a limit; enumerate the current catalog when operating.

| Surface | Owns | Boundary |
| --- | --- | --- |
| Private packages | Portable values, contracts, assets, metadata and explicitly exported renderers | Requires package access and a published compatible export |
| Public Lab | Discovery, reference, schemas/examples and lifecycle | Not a production dependency or approval of the resulting piece |
| AXIS checkout | Local authoring CLIs | Not published npm bins; source/build requirements apply |
| Consumer repo | Runtime adapter and adoption evidence | Package availability does not update the consumer |

The Lab reports `workspaceVersion`, not verified registry publication. At the 2026-10-04 cut,
`axis-graphic-line@0.17.0` is published (AEO/SEO/Authority); the new registry `/capabilities` and `/evidence`
and brand-assets `/logos` exports are source-only until their own package releases. Brand-assets remains
`0.4.18`; that version must not be claimed to include `/logos`. Verify installed exports and exact pins.
Publication/readbacks belong to Greenhouse's `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`; do not
infer them from a package.json version, public Lab or a pushed source commit.

## Execute and verify

With authorized checkout/package access, follow `pnpm agent:help`. From the AXIS repository:

```bash
pnpm install
pnpm --filter @efeoncepro/axis-ui-registry... build
pnpm --filter @efeoncepro/axis-graphic-line... build
pnpm agent:list
pnpm agent:show aeo-search
pnpm agent:doctor aeo-search
pnpm agent:run aeo-search --input docs/examples/ai-search-graphic/efeonce-suggestions.json --out-dir /tmp/axis-aeo-new
```

Choose a new output directory. The doctor checks local prerequisites; AEO uses Google Chrome.
`social-basic` requires an existing local raster photograph relative to the intent; it does not generate one.
`deck-basic` renders only cover/section/content/close, not the full gallery of 100 deck recipes.
The other nine executable routes resolve manifests, which still need the declared renderer/adapter.
`adopt-*` entries return `CONSUMER_ADAPTER_REQUIRED` when run; implement and verify in the consumer.
Public `schemaUrl`/`exampleUrl` resources preserve source bytes; downloading a JSON does not fetch its photo.

Preserve input, output and `agent-output.json`. After independently observing each required check:

```bash
pnpm agent:verify aeo-search --out-dir /tmp/axis-aeo-new --evidence /tmp/axis-aeo-observations.json
```

Evidence is an array with `check`, `status`, `artifactSha256`, `reference`, and `reason` for
`not-applicable`. States are `passed`, `failed`, `not-applicable`, `missing`; missing coverage is
`incomplete`, never passed. Verification recomputes file hashes and rejects stale evidence. It does not
prove the truth of an asserted measurement or replace pixel inspection, accessibility review or approval.
Preserve structured failure/recovery output; never overwrite an earlier artifact to silence an error.

## Logos

[Logos](https://axis.efeonce.org/references/logos/) and [JSON](https://axis.efeonce.org/references/logos.json)
project `packages/brand-assets/src/logos.ts`: `AXIS_LOGO_FAMILIES`, `AXIS_LOGO_ASSETS`, `findLogoAsset`,
`logoAssetUrl`. Source export: `@efeoncepro/axis-brand-assets/logos` (release boundary above).
At the 2026-10-04 cut: 223 files / 52 brands, 99 own and 124 third-party files. Choose identity,
variant, surface and intended use; download the official bytes, never reconstruct a lockup.

The catalog is a projection of sealed inventories, not another brand registry. Preserve provenance,
authorization, claims and hashes. Its public partner allowlist admits `authorized-by-partner` or `in-stack`,
never `client-logo`; client-only marks, HubSpot Gold under internal review and pending Claudeforce remain
excluded. Presence in the Lab does not enlarge licensed use or verify a current partner tier.
Owner: AXIS `docs/architecture/LOGO_CATALOG_DECISION_V1.md`; existing brand/product rules still apply.

## Iconography

[Main catalog](https://axis.efeonce.org/references/iconography/) and
[JSON](https://axis.efeonce.org/references/iconography.json) are the first lookup. The Lab projection
`apps/lab/src/data/icon-catalog.ts` deduplicates by voice/key and preserves `status`, `collections`,
`package`, `renderer` and exact anchor. It contains 134 entries: 109 canonical (60 Trazo + 49 Plastilina)
and 25 candidates. `ICON_CATALOG` itself remains the 109 canonical entries; do not confuse these inventories.

| Collection | Entries at 2026-10-04 | Package subpath |
| --- | --- | --- |
| [AEO](https://axis.efeonce.org/references/aeo-iconography/) | 19: 18 canonical + Brand Authority candidate | `@efeoncepro/axis-graphic-line/icons/aeo` |
| [SEO](https://axis.efeonce.org/references/seo-iconography/) | 37: 12 canonical + 25 candidates | `@efeoncepro/axis-graphic-line/icons/seo` |
| [Authority](https://axis.efeonce.org/references/authority-iconography/) | 13 candidates shared with SEO; Brand Authority also in AEO | `@efeoncepro/axis-graphic-line/icons/authority` |

Collections overlap. Follow the main entry's renderer: canonical `resolveIcon`, candidate `resolveSeoIcon`.
Specialized helpers retain the same status; exported/published does not mean visually approved.
Authority bars are conceptual, not charts of DA/DR/Authority Score. Preserve provider/method on metrics;
Brand Authority is not a universal AI score, and mentions, citations and recommendations stay distinct.
Criterion and QA: `efeonce-graphic-line/references/iconography.md` and its AEO/SEO/Authority references.

## Lab maintenance

Search is static and browser-filtered, with an index generated from the owning catalogs. Add data to the
package/source projection; do not maintain separate visual, JSON and search inventories or introduce a DB.
Logos, icons, references, contract adoption and executable capabilities are distinct discovery routes.

Editorial headings use `apps/lab/src/components/LabHeading.astro`, whose family resolves from
`efeonceGraphicLine.type.answer.family` through `--lab-font-display`. Shared font loading lives in
`apps/lab/src/styles/editorial-typography.css`, imported by Layout. Pages own size, weight, axes and spacing.
Do not apply a global Bricolage reset to product specimens: Insights stat values remain Poppins, and the
Typography specimen retains its own families. A CSS family declaration alone does not prove the loaded font.

Run the package build/typecheck/tests and `pnpm design:check`; for agent changes run `pnpm agent:check`.
Lab gates include unit tests and focused desktop/mobile E2E for the changed surface. The editorial typography
suite (`apps/lab/src/test/e2e/editorial-typography.spec.ts`) enumerates built routes and uses Chrome CDP to
verify the font actually paints glyphs, plus specimen isolation. The 65-route / 132-check baseline from
2026-10-04 is evidence of that revision, not a substitute for rerunning after a typography change.
CI, public deployment, private package publication and consumer adoption are four separate readbacks.

## Native buttons (private distribution, 2026-10-04)

The `efeonce.button` 1.0.0 candidate contract now has a portable implementation in
`@efeoncepro/axis-ui-primitives` (initial private release 0.1.0 verified from GitHub Packages, tag v0.3.43).
Use `buttonHtml` plus `/button.css`, or `Button` from `/react`; the default entry has no React dependency.
`axisButton` tokens own the 0.75rem radius, sizes and accessible light/dark palettes.
Five appearances (`solid`, `outline`, `soft`, `ghost`, `link`), three tones/sizes, leading/trailing/only icons,
CTA arrows, loading/disabled and full width compose through `resolveButton`. Keep actions as native buttons
and navigation as anchors; icon-only always carries `label`. The consumer connects events, async progress
and focus recovery. Do not recreate the Lab CSS or SVGs. Use the AXIS package README
`packages/primitives/README.md` and `/docs/buttons/`; the Lab `/patterns/efeonce.button/` consumes the package.
The registry advertises its imports under `adopt-efeonce-button`; it is not a checkout composer CLI.
Before installing remotely, verify a compatible tokens/contracts/registry/primitives release and repository
package access. This source change does not update Greenhouse, Globe or Studio pins.

Button loading now uses a compact orbit (fixed ring, moving sphere and short trail), not a CSS spinner.
`arrowMotion: "nudge"` opts into a trailing-arrow shift on hover/focus; default `none`.
The resolver requires a direction arrow. RTL, disabled/loading and reduced motion are handled
in the shared package. Values live in `axisButton.loader`/`arrowMotion`; initial registry installation is verified; consumer adoption is separate.

Optional business-line context: `line` uses default/growth/brand/engine/voice/revenue-hubspot/revenue-salesforce.
Only brand tone changes; neutral/danger keep meaning. `/react` also exports ButtonGroup, ToggleButton,
MenuButton and SplitButton. The Lab hydrates real React; browser gates cover forms, state, focus,
menu keyboard/typeahead/dismissal and split actions. `buttonOptions.icons` lists 26 functional icons.
Native ARIA, form attributes and focus handlers are forwarded. Publication and opt-in product adoption
remain separate from local package implementation.

Previous verified distribution: primitives 0.1.1, registry 0.4.1, tokens 0.3.43, contracts 0.4.0
(AXIS 31b146e, v0.4.1). HTML-only npm consumers can use `--omit=peer`; React consumers install
React/React DOM explicitly. The documentation patch changes no button API/CSS.


### Composed controls and verification

`ButtonProvider` inherits line/tone/size/surface; explicit props win. `RadioButtonGroup` is exclusive
selection with one Tab stop and optional submitted value. `ButtonToolbar` gives AXIS actions roving
arrow focus; a normal ButtonGroup keeps native Tab order. MenuButton supports controlled open state,
stable dynamic items and portalContainer. It stays in the dialog DOM and uses native popover top layer
to escape drawer clipping; older engines need an unclipped host. SplitButton forwards native form/ref
props to its primary action and configures alternatives independently. The product still owns its
focus trap, confirmations, validation and async result announcements.

Canonical API: AXIS `packages/primitives/README.md`; evidence: `docs/quality/buttons.md`.
The button Playwright config covers Chromium, Firefox, desktop WebKit and emulated iPhone WebKit,
with axe/ARIA, keyboard, 320px reflow, text scaling 200/400%, reduced motion and reviewed screenshots.
Manual VoiceOver/NVDA, actual browser zoom and physical iOS are not inferred from these checks.

Verified current release: primitives **0.2.1**, registry **0.5.1**, tokens 0.3.43, contracts 0.4.0.
AXIS `13db367`, tag `v0.5.1`, release `37223839523` succeeded on 2026-10-04. A fresh private
registry install verified HTML/CSS without React and SSR of all eight exports with React 18.3.1.
The public Lab and modal menu focus were checked; product adoption remains separate.
