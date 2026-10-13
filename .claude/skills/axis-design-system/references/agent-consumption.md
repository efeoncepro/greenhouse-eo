# Consuming AXIS as an agent

## Entry points and ownership

- [Lab](https://axis.efeonce.org/): grouped navigation and visual resource search.
- [Search index](https://axis.efeonce.org/search-index.json): static resource discovery, previews and exact anchors.
- [Agent guide](https://axis.efeonce.org/agents/) and [capabilities](https://axis.efeonce.org/agents/capabilities.json): what can execute, required access, inputs, outputs and checks.
- [LLM entry](https://axis.efeonce.org/llms.txt): navigation for text agents; follow the catalog rather than inventing a command.

AXIS source: `packages/registry/src/capabilities.ts`; decision:
`docs/architecture/AGENT_CAPABILITIES_DECISION_V1.md`. At AXIS `df2de617`, the catalog exposes 52 capabilities:
40 contract-adoption entries and 12 checkout routes (3 artifact starters, 9 manifest resolvers).
Counts are a 2026-10-04 inventory, not a limit; enumerate the current catalog when operating.

| Surface | Owns | Boundary |
| --- | --- | --- |
| Private packages | Portable values, contracts, assets, metadata and explicitly exported renderers | Requires package access and a published compatible export |
| Public Lab | Discovery, reference, schemas/examples and lifecycle | Not a production dependency or approval of the resulting piece |
| AXIS checkout | Local authoring CLIs | Not published npm bins; source/build requirements apply |
| Consumer repo | Runtime adapter and adoption evidence | Package availability does not update the consumer |

The Lab reports `workspaceVersion`, not verified registry publication. The earlier 2026-10-04 cut below
is historical; the current form package matrix and release boundary are in [UI primitives](ui-primitives.md).
The `v0.7.2` package set is now published and clean-install verified; registry `/capabilities` and
`/evidence` are included. Product adoption remains separate.
At that earlier cut,
`axis-graphic-line@0.17.0` is published (AEO/SEO/Authority); the new registry `/capabilities` and `/evidence`
and brand-assets `/logos` exports are source-only until their own package releases. Brand-assets remains
`0.4.18`; that version must not be claimed to include `/logos`. Verify installed exports and exact pins.
Publication/readbacks belong to Greenhouse's `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`; do not
infer them from a package.json version, public Lab or a pushed source commit.

## Approved UI before implementation

For AXIS-owned controls, inspect [UI primitives](ui-primitives.md) before writing markup. In the Lab,
use `LabSelect.astro` for finite lists; in React use the package `Field` + `Select`. Both consume the
approved renderer. A native picker is an explicit, documented exception, not an Astro shortcut.
Confirm the actual rendered popup, selected option, keyboard/focus and mobile fit; native SSR fallback
without JavaScript must retain its label. Run `approved-selects.test.ts` from the Lab's unit suite.
The frozen native-selector inventory is debt to remove when migrating a surface, never permission
to add or restyle another native selector. Canon: [approved controls decision](https://github.com/efeoncepro/axis-design-system/blob/main/docs/architecture/LAB_APPROVED_CONTROLS_DECISION_V1.md).

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

For runtime changes, run the package build/typecheck/tests and `pnpm design:check`; for agent changes run `pnpm agent:check`.
Lab gates include unit tests and focused desktop/mobile E2E for the changed surface. The editorial typography
suite (`apps/lab/src/test/e2e/editorial-typography.spec.ts`) enumerates built routes and uses Chrome CDP to
verify the font actually paints glyphs, plus specimen isolation. The 65-route / 132-check baseline from
2026-10-04 is evidence of that revision, not a substitute for rerunning after a typography change.
CI, public deployment, private package publication and consumer adoption are four separate readbacks.

## CI scope and release proof

Decision accepted 2026-10-07; implementation locally validated, first remote verification pending.
Canon: AXIS [CI decision](https://github.com/efeoncepro/axis-design-system/blob/main/docs/architecture/CI_COST_AND_VERIFICATION_DECISION_V1.md)
and [verification/readback](https://github.com/efeoncepro/axis-design-system/blob/main/docs/quality/ci-efficiency.md).

- `scripts/ci-scope.mjs` owns selection. Admitted Markdown/static documentary evidence uses the fast path
  without dependency/browser installation. Dedicated video changes run common checks plus video;
  mapped families include cross-dependencies. Shared, unknown, workflow or invalid-diff changes run full.
- Only superseded PR runs are canceled. Main uses per-SHA groups so a later docs push cannot cancel an
  earlier code verification. Package publication is serialized and is not canceled by a later release.
- Release always rebuilds, validates tag/package versions and checks the registry. It reuses individual
  checks only from successful trusted same-repository CI `push/main` at the exact tag SHA, with matching
  rebuilt package digest and explicit successful coverage. A scoped green run does not cover omitted suites.
  Missing or mismatched proof means full release fallback; uncovered required suites still run.
- Ubuntu 24.04 uses installed Google Chrome and prepares only needed engines; Chrome/WebKit coverage is
  preserved. Official HTTPS Ubuntu mirrors and bounded timeouts limit installation stalls. pnpm caching
  does not cache OS dependencies. Do not claim savings or remote timings before measuring actual runs.
- `workflow_dispatch` requests a full audit; no additional scheduled cloud run is introduced. Known
  product geometry failures remain open and must still fail the full check until fixed.

## Native buttons (distribution history, 2026-10-04)

For the current compatible forms/compact/button package set, use [UI primitives](ui-primitives.md).
The following release snapshots preserve their original evidence, not current consumer pins.

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

Verified earlier release: primitives **0.2.1**, registry **0.5.1**, tokens 0.3.43, contracts 0.4.0.
AXIS `13db367`, tag `v0.5.1`, release `37223839523` succeeded on 2026-10-04. A fresh private
registry install verified HTML/CSS without React and SSR of all eight exports with React 18.3.1.
The public Lab and modal menu focus were checked; product adoption remains separate.


## Colores de La órbita en packages y Lab — 2026-10-04

Registro de preparación anterior: los estados locales de estas tres secciones quedan superados por
el [corte de primitives y formularios](ui-primitives.md). Se conservan las decisiones y versiones de origen.

Decisión: La órbita prevalece como identidad; el operador exige tokens en packages y rampas propias.
Implementación local en AXIS, base `13db367`, tokens **0.4.0 preparado, no publicado**:
`axisColorSystem` (`axis.color-system.v1`) referencia `efeonceGraphicLine.color` y `.lines`;
`resolveAxisColorRoles(line, surface)` entrega fondo, tinta, acento y contraste, con validación de claves.
`axisOrbitRamp`, `axisOrbitRampContrast`, `axisOrbitRampMethod` aportan seis líneas × dos anclas
× nueve pasos (100–900): 500 conserva el acento canónico; el resto son tonos técnicos derivados
por `orbit-oklab-v1`, sin asignación automática de roles ni promoción a acentos canónicos.
CSS genera `--axis-orbit-<paleta>`, `--axis-orbit-<linea>-<light|dark>-<background|text|accent>`
y `--axis-orbit-<linea>-<light|dark>-<100…900>`. No transcribir HEX ni reconstruir las rampas.
La hoja `/references/colors/`, su JSON y DESIGN.md consumen esta autoridad. `axisRamp` conserva
compatibilidad de producto; no gobierna la identidad. El acento sólo en texto ≥24 px; el contraste
se evalúa sin redondear. Estado no se comunica sólo por color. Botones conservan su contrato de estados.
ADR dueño: AXIS `docs/architecture/COLOR_SYSTEM_ORBIT_DECISION_V1.md`; consumo en
`packages/tokens/README.md`. Sin cambio de pins de Greenhouse ni publicación en esta sesión.

> Verificado contra: axis-design-system@13db367 + cambios locales de color — 2026-10-04.


### Destino de adopción Greenhouse — 2026-10-04

El operador confirma que Greenhouse migrará eventualmente a los colores de La órbita.
Las rampas heredadas son compatibilidad de transición, no una identidad paralela permanente.
`axisColorSystem.adoption.greenhouse` declara el destino como `planned`; el mapeo de roles y el
rollout siguen pendientes. La futura implementación debe mapear superficie, texto, borde, acción,
foco y estados mediante un adapter semántico del theme sobre los tokens del package, preservando
Vuexy y validando claro/oscuro y estados reales. El resolver de composición de marca no es todavía
un theme completo de producto. Esta dirección no inicia la migración ni cambia pins de Greenhouse.


### Botones conectados a La órbita; siguientes primitives — 2026-10-04

Implementación local AXIS: `axisButton` consume `axisColorSystem`/`axisOrbitRamp`, con roles de reposo,
hover, presionado, foco y deshabilitado. La carga conserva la paleta normal. `default` usa Growth;
neutral/peligro conservan función. El acento 500 es identidad; si no permite texto pequeño AA, se
selecciona un tono de la rampa para el fondo del componente (Growth claro: teal vivo del ancla oscura, texto oscuro y borde teal profundo; corrección visual del operador), sin cambiar la marca.
HTML/React/Lab usan el mismo CSS. Tokens 0.4.0 y primitives 0.3.0 preparados, aún sin publicación;
Greenhouse no cambia pins ni theme. Dueño: AXIS `docs/architecture/BUTTON_ORBIT_COLOR_DECISION_V1.md`.

Chips y badges están **implementados en el checkout de AXIS; publicación pendiente**:
`Badge`, `CountBadge`, `Chip`, `FilterChip`, `ChoiceChipGroup`, `ActionChip` y `RemovableChip`;
HTML/CSS sin framework y React opcional en primitives 0.3.0. Tokens 0.4.0 (`axisCompact`, `axisChip`,
`axisBadge`), contracts 0.5.0 y registry 0.6.0 preparados. `efeonce.chip` y `efeonce.badge` 1.0.0
candidate; chip 0.1.1 se sustituye por API discriminada, sin animaciones implícitas.
El Lab consume los mismos exports en `/patterns/efeonce.chip/`, `/patterns/efeonce.badge/` y
`/docs/chips-badges/`. Fuentes: AXIS `packages/primitives/README.md`,
`docs/architecture/CHIPS_BADGES_PRIMITIVES_PLAN_V1.md` y `docs/quality/compact.md`.
Badges informan; filtros y choices son campos nativos; action/removable tienen acciones explícitas.
El producto posee lógica, operaciones asíncronas y foco al quitar. Soft por defecto;
outline sólo donde el borde aporta jerarquía. No migrar pins de Greenhouse por un push de fuente.

### Incremental publication correction — 2026-10-07

The 0.6.6 release succeeded but repeated 19 minutes of browser gates. Do not dispatch its tag while
same-commit main CI is pending. Use `pnpm release:packages <version>` after commit/push: the local
command waits for trusted successful exact-SHA main CI, then pushes the tag. A manual tag without
successful CI fails before installing/building in the publication runner.

`ci-release-plan.mjs` compares the full diff from a verified successful ancestor release. Only unchanged
families inherit its validation; affected families need exact-SHA CI plus identical build digest, or run.
Version-only package JSON changes retain scope; dependencies, exports, scripts, lockfile, shared code,
workflow/control changes and unknown paths retain broad verification. Never pass a hand-authored narrowed plan.
Each suite has its own Actions step and timing summary, sharing install/build per job. No fake release to
benchmark this. Local 55-test gate and readback against real release 37696704305/CI 37696699810 passed;
first future incremental publication still needs its own observed timing. Full CI for this control-plane
change is separate from the already successful 0.6.6 release.


### Continuous AXIS editing — operator default (2026-10-07)

For frequent visual edits use `pnpm dev` in the active AXIS checkout, then the live Lab on port 4349
(or `--port`). The supervisor builds packages once, then rebuilds changed packages and downstream
workspace dependents; Astro reloads the Lab. It never installs, publishes, changes consumer pins or
runs cloud CI. Static `astro preview` is for artifact verification, not the edit/review loop.

Batch visual refinements into one deliverable. Do not bump versions, tag, or update every consumer
for each visual approval. If publication/rollout is explicitly in the requested scope, finish it;
otherwise close local review with focused validation and report its state. Keep production consumers
on exact published versions. Restart dev after manifest/dependency changes to reload its graph.

Canonical procedure: AXIS `docs/quality/continuous-development.md`; local command tests:
`pnpm test:dev`. Release builds packages to compare the CI digest; the Lab is rebuilt only when
browser gates remain. Astro check runs in typecheck, not again inside Lab test. No coverage reduction
or cache-based success claim is permitted.
