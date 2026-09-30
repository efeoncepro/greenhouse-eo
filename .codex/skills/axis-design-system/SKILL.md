---
name: axis-design-system
description: "Use for Efeonce AXIS tokens, contracts, registry, adapters and releases, including advertising typography, semantic collaboration selection, and candidate AEO creative graphics for AI search, ChatGPT/Gemini composers, turns, answers and citations, the Efeonce graphic line «La órbita» (tokens, contract and the `axis-graphic-line` orbit package), and the Efeonce Insights brand assets (`axis-brand-assets` 0.4.0) and Lab reference page `/references/insights/` (published 2026-09-28, AXIS main `3dfbf0e`), the SEO/AEO product sub-brands SV360, AEO, AEO Assessment and AI Visibility Report (`axis-brand-assets` 0.4.2, Lab `/references/seo-aeo/`), and the Efeonce email modules — footer, primary CTA, agenda card and footer brand block (`efeonceEmail`, contract `efeonce.email-modules`, email-safe PNGs in `axis-brand-assets` 0.4.6, Lab `/references/email/`; 0.3.38 set)."
---

# AXIS Design System

## Purpose and boundaries

AXIS is the portable, versioned package foundation for tokens, contracts and registry metadata. It
is not MUI, Vuexy, a product runtime, or a replacement for Greenhouse's domain UI. Keep AXIS
runtime-agnostic and keep product-specific behavior in adapters.

Before changing a contract, token, package, consumer, canary or release, read only the relevant
canonical source:

- Architecture and ownership: [shared UI platform decision](../../../docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md).
- Distribution and credentials: [private package runbook](../../../docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md).
- Current continuity and evidence: [AXIS continuity map](../../../docs/operations/AXIS_CONTINUITY_MAP_2026-07-29.md).
- Ownership decision: [AXIS ownership ADR](../../../docs/architecture/EFEONCE_AXIS_DESIGN_SYSTEM_OWNERSHIP_DECISION_V1.md).
- Agent-facing visual guide: [AXIS `DESIGN.md`](https://github.com/efeoncepro/axis-design-system/blob/main/DESIGN.md), generated from the token package and pushed at commit `0e3c4d6`.
- Color ownership cutover: [TASK-1600](../../../docs/tasks/complete/TASK-1600-axis-color-ownership-inversion.md).
- Foundation history and task status: [TASK-1589](../../../docs/tasks/in-progress/TASK-1589-efeonce-ui-package-foundation.md) when present.
- Release procedure: \`.codex/skills/greenhouse-production-release/SKILL.md\`.
- Secret procedure: \`.codex/skills/greenhouse-secret-hygiene/SKILL.md\`.

## Non-negotiable invariants

- \`@efeoncepro/axis-tokens\`, \`axis-ui-contracts\` and \`axis-ui-registry\` remain portable: no
  imports from MUI, Vuexy, Next, browser globals or product logic.
- AXIS owns the portable value and semantic role; each product owns materialization in its own
  styling engine. AXIS may publish values, never painted components or engine-specific appearance. The one
  declared exception is `@efeoncepro/axis-graphic-line` (the Efeonce orbit brand form, below); do not extend it.
- AXIS owns portable color values, semantic roles, neutral light/dark data and chart palettes. Products own
  engine-specific materialization such as MUI's `axisSemanticPalette`, product flags and layout/painted components.
  Brand-value changes are signed through the Greenhouse ADR/task governance before an AXIS package release.
- Consumers use exact published versions. Never use a floating range for a release-critical
  consumer, and never repoint an existing contract id to a different shape.
- Lifecycle promotion (\`candidate → trial → stable → deprecated → retired\`) is additive metadata.
  A shape change requires a major contract version or a new id.
- Adapters are \`reuse | extend | new\` decisions. Do not duplicate an existing primitive or move
  product UI into AXIS merely because it shares a visual token.
- Production release does not equal product-wide promotion: keep adapters opt-in until the
  consumer evidence and commercial/product gates explicitly authorize broader rollout.

## Choose the workflow

### Tokens, contracts or registry

1. Inspect the current ADR and package exports before editing.
2. Update the owning SSOT and its drift/shape gates together.
3. Keep package version, contract version and lifecycle metadata distinct.
4. Run the AXIS repository's build, typecheck, tests and promotion gates.
5. Record the published package version and consumer evidence in the runbook.

### Styling with AXIS CSS tokens (`--efeonce-*`)

A `var()` pointing to a token that does not exist fails **silently**: the whole declaration falls back to its
initial value (`gap: 0`, `padding: 0`), and in a shorthand such as `padding: var(--efeonce-spacing-4)
var(--efeonce-spacing-5)` the valid value is lost too. Only use names that `@efeoncepro/axis-tokens/css` emits:

- **Spacing:** only `--efeonce-spacing-1|2|3|4|6|8` (0.25 / 0.5 / 0.75 / 1 / 1.5 / 2rem). There is no `-5` or `-7`.
- **Color:** `--efeonce-color-danger` (never `-error`); `--efeonce-color-info` exists only since `axis-tokens`
  `0.3.10`; there is no `--efeonce-color-border-strong` (use `--efeonce-color-border`).
- **Elevation:** the CSS publishes no `--efeonce-shadow-*`. Elevation comes from the `axisElevation` roles; a dense
  card with a border goes with elevation `none`.

The AXIS Lab enforces this with `apps/lab/src/test/unit/design-tokens.test.ts`: it fails (with file:line) when a Lab
sheet uses a `var(--efeonce-*)` without fallback that is neither in `@efeoncepro/axis-tokens/css` nor defined in the Lab,
and it tolerates no exceptions (AXIS `ed97c0b`/`0a6da3b`, 2026-09-27). The token build (`packages/tokens/scripts/emit-css.mjs`)
emits each property once and fails if two groups give it different values.

### Agent-facing visual guide

`../axis-design-system/DESIGN.md` is the AXIS visual guide for humans and coding agents. It follows the
Google `DESIGN.md` alpha format and passes the official linter with zero errors and warnings. It is a
generated projection, not a second source of truth: standard frontmatter values come from
`packages/tokens/src/tokens.ts`, while AXIS-specific brand, mode and role mappings remain governed by the
packages and ADRs.

When token values change, run `pnpm design:generate` in the AXIS repository and verify
`pnpm design:check`. Do not edit generated frontmatter by hand. Do not treat the AXIS guide as a replacement
for Greenhouse's root `DESIGN.md`, which remains the product-specific MUI/Vuexy contract.

### Advertising typography

AXIS owns `axisAdvertising` and `efeonce.advertising-typography`; the consumer owns only the translation to
Tailwind, CSS, canvas or motion. For an advertising/social piece, compose this skill with
`efeonce-advertising-creative` and the active typography skill. Read the sibling guide at
`../axis-design-system/docs/creative-applications/advertising-social/DESIGN.md` instead of copying recipes into
Greenhouse. The contract remains `trial`: do not claim stable or make its Lab adapter global before a second
consumer and cross-runtime evidence exist.

Use the sources in this order for every piece with advertising text:

1. Read the sibling guide and the current `axisAdvertising` contract to establish roles, allowed ranges and
   hard limits. The versioned contract remains the source of truth.
2. Open the public [Creative Typography Workbench](https://axis.efeonce.org/references/creative-typography/)
   and use its adviser with the real support, title length and intention. Treat the resulting Bricolage weight,
   Poppins role, optional Guttery gesture, rhythm, safe area and comparison case as a candidate recipe.
3. Resolve the exact values from the contract, compose with the real licensed files supplied by the consumer
   and validate the final pixels. If the Workbench and contract diverge, stop and report the drift; never copy
   the visual projection back into tokens by eye.

The Workbench signs with the centered Efeonce logo by default (`signatureMode` `logo`); `url-bubble` only when the
logo already appears in the image, following the graphic line signature rule below.

The Workbench is the guided visual projection of the guide, not another source of truth and not creative
approval. Its recommendation does not authorize a brand decision, client delivery, scheduling or publication.
Do not make its adapter, families or recipes global, and do not package licensed font files with AXIS.

For a support sentence tied to a primary lockup, consume
`axisAdvertising.compositions.supportingTagline`. It defines a continuous ordered sentence, Poppins structural
base, uniform fitting to the lockup inline measure, natural word spacing, balanced-wrap fallback and at most two
semantic emphasis segments. `growth` and `intervention` describe intent, not reserved words. The Lab sentence is
fixture evidence only; adapters accept arbitrary copy and must measure their own rendered result.

### Collaboration selection

AXIS source owns the candidate `efeonce.collaboration-selection` contract and
`axis.collaboration-selection-composition.v1` manifest. Agents author semantic intent rather than pixels:
`targetId`, `targetKind`, selection variant, proportional padding, overlay and cursor relationships. Normalize it
from the sibling AXIS repository with:

```bash
pnpm collaboration:resolve -- \
  --input docs/examples/collaboration-selection-intent.json \
  --out /absolute/path/collaboration-selection.manifest.json
```

The command validates and resolves defaults, cursor direction/action and multiplayer attachment. It does not
render, call a model, approve or publish. A surface adapter consumes only the normalized manifest, binds
`target.id` to real text/object/group geometry and verifies the hotspot/selection relationship at narrow and wide
formats. Never copy the Lab Astro/CSS or fall back to free `top`/`left` coordinates. If no adapter exists, report
the capability as pending.

The bound geometry is the rendered group: when the text closes with the graphic-line sphere (a voice answer or an
own-brand display headline), the selection, crop marks and cursors include the sphere — it is part of the text,
never an ornament beside it (operator, 2026-09-26). Source contract `0.3.0` declares
`target.bounds: 'rendered-group-including-terminal-sphere'`; the graphic line adds the adapter check
`answer-period-part-of-text`, and `@efeoncepro/axis-graphic-line` exposes `answerHtml` and `answerGroupBox`.
Greenhouse adopted it on `develop` with the `0.3.0` set (2026-09-26).

The portable advertising and collaboration contracts were first published in the AXIS `0.2.5` package set.
Greenhouse pins the `0.3.0` set on `develop` (not in `main` until the next release) and
its Campaign Layout Compiler implements the first non-Lab adapter for
`headline|support|hook|lockup`; this evidence does not imply that Globe or another runtime has adopted it.

### AEO creative graphics for agents (local candidate)

For a commercial piece evoking AEO, search with AI, a ChatGPT/Gemini conversation or citability, start at the sibling AXIS
[agent composition index](../../../../axis-design-system/docs/agent-composition/README.md) and the
[public Creative Resources Lab](https://axis.efeonce.org/references/creative-resources/). Compose this skill with
`efeonce-advertising-creative`; the [Greenhouse manual](../../../docs/manual-de-uso/creative/componer-recursos-aeo-con-axis.md)
describes how to place the output in a campaign piece. Select the smallest requested resource:

| Intent | Command in `../axis-design-system` | Do not infer |
| --- | --- | --- |
| Search field, AI action, icon or suggestion | `pnpm search:compose --input docs/examples/ai-search-graphic/efeonce-suggestions.json --out-dir /tmp/axis-search` | Google suggestions or answer from an Efeonce editorial field |
| Text in one of the four original search SVGs | `pnpm search:compose-original --input docs/examples/original-search-intent.json --out-dir /tmp/axis-original` | Static pointers/checks as live interaction |
| Standalone ChatGPT or Gemini composer | `pnpm llm-composer:compose --input docs/examples/llm-composer-chatgpt-intent.json --out-dir /tmp/axis-composer` | A submitted turn or response |
| Full conversation, provider app, user turn, answer, citation or related source | `pnpm aeo:compose --input docs/examples/aeo-composition/efeonce-chatgpt.json --out-dir /tmp/axis-conversation` | Source evidence from a merely plausible URL |

Edit the JSON intent, not the SVG geometry. The local commands emit editable SVG and `manifest.json`; use
`modules` and `targets` for an isolated turn, answer or citation. The ChatGPT search tool belongs in the
composer, not the sent user bubble. The Google AI Mode magnifier has a sparkle and no rainbow ring; the
Efeonce rainbow field is a separate hypothesis. Keep provider-specific logos, controls and citation anatomy
separate. Verify each cited passage, favicon host, provenance and final pixels. `editorial-sample` is an
example; `captured-output` needs a real interaction, reference and date. These tools are local candidate
resolvers, not published package contracts, a Greenhouse/Globe adapter, an MCP tool, a live model result or
creative approval.

### Efeonce graphic line «La órbita» (tokens, stable contract, orbit package)

> **Owning skill:** [`efeonce-graphic-line`](../efeonce-graphic-line/SKILL.md) (living) holds the full API map (tokens, contracts, `axis-graphic-line` recipes), composition, applications and motion. Load it before composing; this section keeps only the AXIS release and consumption boundary.

Efeonce's own-brand graphic line (orbit: thin ring, arc with sphere, halo; lens and spotlight) became canonical on
2026-09-25. Greenhouse is the control plane: the [ADR](../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
and the [manual](../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) live there; the
operating summary is [`graphic-line-orbit.md`](../efeonce-brand-studio/references/graphic-line-orbit.md). Package
set of the first graphic-line releases (history; versions are independent per package and the versions Greenhouse pins
today are listed under «Greenhouse consumption» below): `axis-tokens` `0.3.4` (`0.3.2` shipped `emailSignature`, `0.3.3` adds
`motion`, `0.3.4` the team signature); `axis-ui-contracts` `0.3.4` (`0.3.2` ships `efeonce.email-signature`, `0.3.4` its
`team` variant); `axis-ui-registry` and `axis-brand-assets`
`0.3.0`; `axis-graphic-line` `0.3.1`. AXIS holds:

- **Tokens:** `efeonceGraphicLine` in `packages/tokens/src/tokens.ts` (`@efeoncepro/axis-tokens`, `status:
  'canonical'`, opt-in branch outside the `axisTokens` aggregate). Groups: `color`, per-brand `family`, `sphere`,
  `orbit` (per `baseWidthPx` 794, social ×1.75 up to `socialMaxWidthPx`), `trajectory`, `lens` (`anatomy`; the
  `accentSphere*` ratios are deprecated), `portrait` (orbit around a person photo: email signature, team cards),
  `pieces` (fixed-format pieces measured one by one: `lens` wall/deck-cover/post/story/campaign-post/linkedin,
  `spotlight` photo/event, `deck` cover/section/content/close), `spotlight`, `urlBubble`, `signature`, `slogan`,
  `state`, `brandClose`, `emailSignature` (the approved email signature v3.1) and `motion` (since `0.3.3`: the orbit
  motion language of the approved logo animations V1.1 — `principles`, `curves` by role, `overshoot`, `pulse`,
  `impactScale`, `settle`, `wave`, `halo`, `letters`, `motionBlur`, `colorMix`, `cameraZoom`, `layout` and `sound`,
  plus the segment timings of `pieces.reveal|open|sting`; tested in `tokens.test.ts`). The rules behind those numbers
  are the Greenhouse norm
  [`EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md`](../../../docs/operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md).
- **Contract:** `efeonce.graphic-line-orbit` `0.3.0` (`stable`), manifest `axis.graphic-line-orbit-composition.v1`.
  An agent declares `orbit`, `measure` (value 0–1 **with a source**), `progress`, `lens`, `spotlight`, `family-map`,
  `url-bubble`, `voice`, `logo-inline`, `signature`, `slogan`, `state` or `brand-close`; the resolver enforces the
  line's rules and resolves every value from the tokens. Rejections, adapter checks and entry points: see the
  operating reference; in AXIS `pnpm orbit:resolve` (manual `docs/agent-composition/graphic-line-orbit.md`, ADR
  `GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`).
- **Contract:** `efeonce.email-signature` `0.3.0` (`stable`, approved v3.1 on 2026-09-26), manifest
  `axis.email-signature-composition.v1`. Zones in a fixed order; the line that ends in the sphere appears **once**;
  the partner endorsement is its own zone opened by a thin `section-rule` **without a sphere**, and only shows
  partners whose registry status allows the claim (`active`, `accepted`, `declared`). A closing phrase or a second
  sphere is an error; `reply` is one line of live text. Variant `team` (since 0.3.4): a team mailbox signs with
  `area-mark` (the portrait orbit around the area icon) instead of `portrait`; areas live in
  `efeonceGraphicLine.emailSignature.team.areas`. In AXIS `pnpm signature:resolve` (guide
  `docs/agent-composition/email-signature.md`, Lab board 4.5). Greenhouse manual §10.2.
- **Package `@efeoncepro/axis-graphic-line`** (declared exception to "values, not painted components", only for this
  brand form): `orbitSvg`, `measureSvg`, `composeGraphicLine`/`paintGraphicLine`, `runAdapterChecks`, recipes
  `lensRecipe`, `spotlightRecipe`, `deckSlideHtml` (with `stats`/note), `portraitOrbitSvg`, `sphereDividerSvg`,
  `recipeHtml`, `answerHtml`/`answerGroupBox`; `/motion` (`ORBIT_MOTION_CSS`, `orbitMotionFrameCss`), `/react`
  (`<AxisOrbit>`) and `/element` (`<axis-orbit>`). SVG is deterministic and decorative. It also generates the 48
  static orbits sealed in `axis-brand-assets` (`orbit/orbit-<line>-<surface>-<channel>`, `findOrbitAsset`). In AXIS,
  `pnpm orbit:video` exports the orbit animation (**no logo**) to MP4 from this package.
- **Canvas-measured rules (2026-09-26), enforced by recipes and contract:** the accent arc is centered on its
  position (`upper-start` → 200°–250°); arc and sphere at the low end of their range (3.81 / 8.33 px on a 1080
  social canvas); ring at 16 %, 22 % only with inner orbits or satellites. Fixed-format pieces are **reproduced**
  from `pieces`/`portrait`, never re-derived from a scale. The lens always carries the orbit (ring, 50° arc, sphere
  at its tip), never a loose disc. The spotlight always has its ring, concentric with the light, lamp upper right.
  One ring around content: inner orbits never around a word, logo, object or lens (rejection
  `inner-orbits-never-around-content`). The sphere closing an answer/headline is part of the text (collaboration
  selection above).
- **Reference page:** public https://axis.efeonce.org/references/graphic-line (source
  `apps/lab/src/pages/references/graphic-line.astro`): 5.7 «Componer con agentes», 4.9 «Oficina en foto»; 4.3, 4.6
  and 4.7 show each flat piece beside its AI photo («plano · foto», mock-up label); 4.4.2 «Animaciones de marca»
  (`#animaciones`) has web versions and cards of the three logo animations. Heavy masters live in the public
  bucket `gs://efeonce-group-axis-public-media/motion/logo/v1.1/<anim>/<format>/<scheme>/`, never in git. The Lab
  deploys on every push to `main` and syncs brand-assets on each build (`pnpm brand:sync`).

Rules for agents:

- Consume the token or the package; **never transcribe HEX or px** from the manual, PDF, canvas or page. A value
  change means changing the token and its test in AXIS, signed through the Greenhouse ADR, not editing a document.
- Before pinning a consumer, confirm which **published** package version contains the export; do not assume the
  workspace source is released.
- **Greenhouse consumption (verified 2026-09-29, night, with `grep '"@efeoncepro/axis' package.json`):** `develop`
  pins `axis-tokens` `0.3.37`, `axis-ui-contracts` `0.3.37` (AXIS tag `v0.3.37`: Glitch and Marketing con Manzanitas
  stable), `axis-graphic-line` `0.11.0`, `axis-brand-assets` `0.4.5` and `axis-ui-registry` `0.3.1`. **AXIS is at the
  `0.3.38` set** (tag `v0.3.38`, 2026-09-29, `main` `c92160b`: tokens/contracts `0.3.38`, graphic-line `0.13.0`,
  brand-assets `0.4.6`, registry `0.3.3`; see «Efeonce email modules (0.3.38 set)»), so Greenhouse is behind on
  graphic-line (`0.12.0` and `0.13.0` not adopted: no `/report`, no travelled path), brand-assets (no email PNGs) and
  registry; tokens/contracts `0.3.37` already carry the orbit contract `0.4.0` and the report token/contract. The layout-compiler orbit adapter accepts only
  orbit contract `0.3.1`: moving to orbit `0.5.0` needs adapter support (the measure's `travelled`), not just a bump.
  Graphic-line visual gate: 89 frames at 0 px on the `0.3.36` bump (73 on `v0.3.29`, 66 after TASK-1928). A bump runs
  the three token regenerations below.
  Series: `0.3.11`…`0.3.14` (TASK-1927), `0.3.12` (TASK-1922, Glitch), `0.3.15`…`0.3.21` (TASK-1928), `0.3.24` (Glitch Flash, contracts `0.3.22`); table in
  the surface-composition section below.
  It does not use `efeonce.email-signature` yet, nor `efeonce.email-modules` (its emails in `src/emails/` are unchanged). `axis-graphic-line` paints the orbit only in the Artifact Composer
  brand surfaces (`src/lib/brand-surfaces`, `src/lib/artifact-composer/catalogs/graphic-line-*`); the layout-compiler
  adapter `scripts/creative/layout-compiler/graphic-line.mjs` still resolves the contract from `axis-ui-contracts` and
  keeps its own raster-safe painter (lens with arc + sphere, deck one ring), and `axis-advertising.mjs` requires
  collaboration-selection `0.3.0`. Entry points `pnpm creative:orbit:resolve|render`, the per-format
  `graphic_line` layer and `brand.signature` of `pnpm creative:layout`, and `marcaEnEscena` of
  `pnpm foto:componer:cta`. Never copy the Lab painter.
- **Every `axis-tokens` bump regenerates BOTH compiled token sets (lesson, 2026-09-28):** after pinning a new
  `@efeoncepro/axis-tokens` in Greenhouse, run `pnpm brand:tokens` (the «La órbita» tokens of the Composer:
  `graphic-line-{deck,stills,overlays}/graphic-line-tokens.css` + `graphic-line-shared/graphic-line-tokens.json`) **and**
  `pnpm glitch:tokens`, then `pnpm brand:tokens --check` and `pnpm glitch:tokens --check`, all before the commit. Even
  when only the version stamp changes, a stale file fails `scripts/brand-surfaces/__tests__/graphic-line-tokens-sync.test.ts`
  in CI. Source case: the `0.3.24` pin (`53002b352`) ran only `glitch:tokens`, CI went red on 4 tests, and the fix was
  `609353e83` (regenerated tokens, version stamp only). Since 2026-09-29 (TASK-1939) there is a THIRD set: also run
  `pnpm manzanitas:tokens` and `pnpm manzanitas:tokens --check` (the Marketing con Manzanitas catalog tokens and its
  per-line precoloured assets; `scripts/manzanitas/__tests__/manzanitas-tokens-sync.test.ts` fails on a stale stamp).
- **Signature rule (operator, 2026-09-26):** the Efeonce logo, centered. The URL bubble signs instead ONLY when the
  logo already appears in the image (`signature.brandInScene: true`), centered, luminosity-blended on the real pixels
  at opacity 1, ≥ 4.5:1 measured (passes only on very dark beds); never beside the logo. Footer uses keep the baked
  variants. Threshold 4.5 vs 3:1 pending the operator.
- **The orbit never replaces the photographic composition** and never crosses subject, text reserves, bed or
  signature (`orbit-never-over-subject-or-reserves`).
- **Official files:** `@efeoncepro/axis-brand-assets` (first sealed in `0.3.0`; `0.4.2` published 2026-09-29, AXIS `main` `7f9c8bb`; `0.4.3`, tag `v0.3.30`, only re-stamps the 48 static orbits with orbit contract `0.4.0`; `0.4.4`/`0.4.5` add `AXIS_PARTNER_ASSETS`; `0.4.6`, tag `v0.3.38`, adds the email PNGs `AXIS_EMAIL_ASSETS` and re-stamps the orbits with contract `0.5.0`; Greenhouse pins `0.4.5`): 58 brand SVG since
  `0.4.2` (19 until `0.3.6`: logo/isotype per brand, URL bubble source and baked variants; `0.4.0` adds the Insights
  logo/isotype and the `lockup` kind, see «Efeonce Insights in AXIS»; `0.4.2` adds 33 SEO/AEO sub-brand files and the `white` variant, see «SEO/AEO product sub-brands in AXIS») plus the 48 static orbits, SHA-256 sealed; `findBrandAsset`, `brandAssetUrl`,
  `findOrbitAsset`. Consumers read the package, never a hand copy (Greenhouse guards its local copies with
  `src/config/efeonce-brand-assets.test.ts`). Not `efeonce.brand-logos` (third-party logo provenance).
- **Motion:** the orbit animation (no logo) comes from this package (`ORBIT_MOTION_CSS`, `pnpm orbit:video`); the
  three logo animations V1.1 (reveal, opening, sting) are rendered in Greenhouse (`scripts/creative/brand-motion/`),
  which reads every timing and ratio from `efeonceGraphicLine.motion` (verified byte-identical: 90 key frames and three
  sounds). Any new Efeonce motion follows the norm above and takes its numbers from that token; a missing value is
  added to the token with its reason, never written in a script — see `motion-design-studio`.
- Scope: Efeonce's own brand and its family. Never Greenhouse product UI and never client work.

### Surface composition (`efeonce.surface-composition`, `candidate`)

> **Owning skill:** [`efeonce-graphic-line`](../efeonce-graphic-line/SKILL.md) (`references/applications.md` §L) and,
> for decks, [`deck-studio`](../deck-studio/SKILL.md). This section keeps only the AXIS contract and release boundary.

The line composed **by surface** (web, DOOH, pDOOH, motion, audiovisual, deck): tokens `efeonceGraphicLine.surfaces`,
contract `efeonce.surface-composition`, manifest `axis.surface-composition.v1`, resolver `pnpm surface:resolve --
--input <intent.json> --out <manifest.json>`. Sources in AXIS: `docs/agent-composition/README.md`,
`docs/agent-composition/surfaces/*.md`, ADR `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`, examples
`docs/examples/surfaces/`. Greenhouse norm:
[`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md).

- **Current: contract `0.1.2` with its deltas (b)…(l) (ADR `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`),
  published in AXIS tag `v0.3.21` (`@efeoncepro/axis-tokens` `0.3.21` + `@efeoncepro/axis-ui-contracts` `0.3.19`).**
  `0.1.2` was first published on 2026-09-27 as tokens `0.3.9` + contracts `0.3.8` (tag `v0.3.9`, AXIS
  `main@ff0505a`). Additive (a `0.1.0`/`0.1.1` intent resolves as before): deck `use: 'proposal' | 'brochure'`
  (without it AXIS resolves the recipe's use; `use-not-for-recipe`); `layout`, always explicit and never inferred
  (`layout-field-required` / `layout-field-not-allowed` / `layout-not-in-recipe`); `selection.anchor`; and the
  **document** API `resolveSurfaceDocument` / `validateSurfaceDocumentIntent` (schema
  `surface-document-intent.schema.json`, manifest `axis.surface-document.v1`). `pnpm surface:resolve` detects `pages`
  and resolves a document. Document codes exercised by Greenhouse: `brochure-cover-first`, `brochure-close-last`,
  `brochure-needs-service-page`, `document-line-mismatch`, `frame-photo-must-alternate`, `document-pages-required`,
  `document-surface-invalid`, and page issues prefixed `page[i]:<code>`.
- **Deck layouts in `0.3.21`** (`efeonceGraphicLine.surfaces.deck.recipes.<recipe>.layouts`, default in
  `defaultLayout`): `proposal-cinematic` `service | hero | lines`; `section-split` `corner-top | corner-bottom |
  panel-end`; `cover-brochure` `document | document-selection | line`; `cover-proposal` `orbit | dawn`;
  `close-brochure` `orbit | photo`; `section-cine` `team | services | about | purpose`; `method-staircase`
  `steps | flat`; `method-hybrid-workforce` `ladder | scene`; `content-day` `clock | tools | live-progress |
  live-results`; `content-pricing` `table | stage | live`. The token carries 37 deck recipes, all `approved`;
  `cover-classic` / `close-classic` keep `supersededBy` and are never used.
- **`document-selection` (delta (l), `v0.3.21`, operator 2026-09-28):** the only `cover-brochure` layout that admits a
  selection. Same column and photo as `document`; eight handles on the answer («Crecer.»), never on the person; one
  collaborator cursor «Nexa» (`participantKind: person`) at `bottom-end`, scale 1.1, overlay none; the answer drops
  `column.answerWithSelectionExtraPx` (28) and the evidence sits `bodyBelowAnswerPx.withSelection` (130) below it;
  logo top 200. `document` and `line` still reject a selection (`selection-not-in-recipe`). A relaxed rule enters as
  its **own composition**, never by loosening the recipe.
- **Other contract changes of the `v0.3.15`…`v0.3.21` series:** a composition may declare `progress: false`;
  `voice.maxWords` per recipe (`decision-testimonial` 6, the rest 3); steps without icons (`steps.icons: false`) and
  `steps.min`; colors by palette name.
- **Releases made for the deck (AXIS `main`)** — each one bumps `axis-tokens` and republishes `axis-ui-contracts`:

  | Tag | `axis-tokens` | `axis-ui-contracts` | Task | What it ships |
  | --- | --- | --- | --- | --- |
  | `v0.3.11` | `0.3.11` | `0.3.9` | TASK-1927 | Deltas (b) and (c) of surface-composition `0.1.2` |
  | `v0.3.13` | `0.3.13` | `0.3.11` | TASK-1927 | Delta (e): the frame tokens (covers and back covers), listed below |
  | `v0.3.14` | `0.3.14` | `0.3.12` | TASK-1927 | Full typography of the back covers |
  | `v0.3.15` | `0.3.15` | `0.3.13` | TASK-1928 | Delta (f): the sober proposal (`proposal-service`) |
  | `v0.3.16` | `0.3.16` | `0.3.14` | TASK-1928 | Delta (g): the method family |
  | `v0.3.17` | `0.3.17` | `0.3.15` | TASK-1928 | Delta (h): pricing, next steps and breather |
  | `v0.3.18` | `0.3.18` | `0.3.16` | TASK-1928 | Delta (i): the proof family |
  | `v0.3.19` | `0.3.19` | `0.3.17` | TASK-1928 | Delta (j): sections and «who we are» (`section-cine` `about`, `purpose`) |
  | `v0.3.20` | `0.3.20` | `0.3.18` | TASK-1928 | Delta (k): content and the working day (`content-day` `tools`, `live-*`) |
  | `v0.3.21` | `0.3.21` | `0.3.19` | TASK-1928 | Delta (l): `cover-brochure` `document-selection` |

  `v0.3.12` sits between them and belongs to TASK-1922 (Glitch); `v0.3.24` (tokens `0.3.24`, contracts `0.3.22`,
  2026-09-28, commit `5b3056f`) is the Glitch Flash release.
- **Release flow used for each row (verified in the `v0.3.19`…`v0.3.21` commits and the workflows):** (1) token
  change in `packages/tokens/src/tokens.ts` + contract test in `packages/contracts/src/surface-composition.test.ts`
  (and contract source when the contract changes); (2) bump `packages/tokens/package.json` and
  `packages/contracts/package.json`; (3) update the version table of `README.md`; (4) append the delta to
  `docs/architecture/SURFACE_COMPOSITION_DECISION_V1.md`; (5) update the Lab summaries in
  `apps/lab/src/data/surfaces.ts`; (6) `pnpm build && pnpm test && pnpm lint && pnpm typecheck` at the root; (7) if the
  change moves an example, re-resolve it (`pnpm surface:resolve -- --input docs/examples/surfaces/<x>-intent.json
  --out docs/examples/surfaces/<x>-manifest.json`; none of the three verified commits touched `docs/examples/`);
  (8) one commit `release(surfaces): axis-tokens X y axis-ui-contracts Y — <familia>`, push to `main` (operator
  authorization), wait for `ci.yml` green; (9) push the tag `vX.Y.Z`: `release-packages.yml` («Release UI packages»,
  on `v*.*.*` tags) re-runs install, build, typecheck and tests and publishes to GitHub Packages; (10) in Greenhouse,
  pin both exact versions, install with the ephemeral credential, `pnpm brand:tokens` **and** `pnpm glitch:tokens`
  (then both with `--check`), compose the pieces and run `pnpm composer:visual-gate --catalog=graphic-line`. Validate against the local AXIS build before step 8 (lesson
  below) so a family does not cost two releases.
- **Why `axis-ui-contracts` is republished without a code change:** most contracts releases of the series (e.g.
  `0.3.11`, `0.3.12`, `0.3.19`) carry no code change. The
  package pins the **exact** `axis-tokens` version and the manifests resolve over those tokens, so new tokens reach a
  consumer's resolver only through a contracts release that pins them. Verified in the installed packages
  (2026-09-28): `axis-ui-contracts` `0.3.19` depends on `axis-tokens` exactly `0.3.21`; `axis-graphic-line` `0.7.0`
  still depends on `axis-tokens` `0.3.12` and `axis-ui-contracts` `0.3.10` (it does not carry the deck surfaces).
- **Delta (e) tokens and where they live:** every value is under
  `efeonceGraphicLine.surfaces.deck.recipes.<recipe>`; read it from the token, never from a document.

  | Token (under the recipe) | Recipes that carry it | What it governs |
  | --- | --- | --- |
  | `column.top` (`defaultPx`, `byReference`) | `cover-brochure`, `cover-proposal`, `close-brochure` | Height of the voice column; the intent overrides it with `column.topPx` |
  | `column.body`, `column.closeOffsetsPx` | same | Evidence block and the offsets of a back cover |
  | `axis` | `cover-proposal` | The dawn axis (`layout: 'dawn'`) |
  | `orbitPaint` (`giant`, `rising`) | `cover-proposal`, `close-brochure` | Paint of the giant orbit and of the rising one |
  | `contact.style` | `close-brochure`, `close-proposal` | Style of the contact block (the data comes from the consumer) |
  | `clientLogo.box` | `cover-proposal` | Box of the client logo and of its placeholder |
  | `progress.startFromTopDeg`, `progress.sweep` | `section-split` | Where the indicator starts and what it sweeps |

  `section-split.progress.sweep` carries an open operator question (`openQuestion`): whether to unify the sweep to
  current-of-sections. Do not resolve it in a consumer.
- **Cine gate:** `photo.register: 'cine'` passes with `photo.subject: 'nexa'` or with one of the recipes listed in
  `efeonceGraphicLine.surfaces.photo.cine.recipes` (same list in `0.3.21`: `proposal-cinematic`, `cover-brochure`,
  `close-brochure`, `close-proposal`, `section-cine`, `section-split`); otherwise issue
  `cine-requires-nexa-or-proposal`. The register itself (camera, the
  line as light, wardrobe, traps) is the Greenhouse doc
  [`EFEONCE_PHOTO_REGISTER_CINE_V1.md`](../../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md).
- **Greenhouse consumption (TASK-1927 and TASK-1928, both `complete`, pushed to `origin/develop`):**
  `pnpm brand:compose -- --intent <intent.json> [--out <dir>]` (`src/lib/brand-surfaces`) runs on contract `0.1.2`
  with tokens `0.3.21` + contracts `0.3.19`. The catalog `graphic-line-deck` has **50 templates covering all 69 deck
  recipes** (16 from TASK-1927, 34 from TASK-1928; `cover-brochure` `document-selection` reuses `CoverBrochure`).
  Recipe → `contentType` → template: `src/lib/artifact-composer/catalogs/graphic-line-deck/recipe-map.json` +
  `registry.json` (full table in the `deck-studio` skill, `composition.md`). A document intent (`pages`) goes through
  `planSurfaceDocument` (`src/lib/brand-surfaces/document.ts`), which validates with `resolveSurfaceDocument` and plans
  nothing when AXIS returns a single issue. Greenhouse-side fields (not in the AXIS intent type): `column.topPx` (must
  fall in the logo reserve, otherwise `invalid-intent`), `clientLogo: { path, alt }`, `selected` (1-based item for
  proof/content recipes; `recommended` in pricing) and recipe-specific content arrays read by the builders; the
  contact data of the back covers comes from `EFEONCE_CONTACT` in `src/config/efeonce-brand.ts` (AXIS only defines
  the style). Tasks:
  [TASK-1927](../../../docs/tasks/complete/TASK-1927-surface-composition-0-1-2-greenhouse-integration.md) and
  [TASK-1928](../../../docs/tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md). Operating
  detail: [manual](../../../docs/manual-de-uso/creative/componer-por-superficie-con-axis.md) and
  [functional doc](../../../docs/documentation/creative/composicion-de-decks-y-brochures.md).
- **Still pending (do not state as done):** the governed production route is TASK-1921 (`in-progress` in another
  session; it must also accept the document intent); TASK-1929…1932 (deck plan validation, real slot data, governed
  plate bank, Proposal Studio); `section-split` has no focus control (its builder does not read `photo.focus`).
- **Lesson — validate the consumer against the LOCAL AXIS build before publishing tokens:** copy
  `packages/tokens/dist` of the AXIS checkout over `node_modules/@efeoncepro/axis-tokens/dist` in the consumer, run the
  consumer's pieces and its visual gate, then reinstall to restore the published package. TASK-1927 avoided a fourth
  release this way. The temporary copy never gets committed and never replaces the pinned version.
- **Lesson — run AXIS gates as standalone commands from a Claude Code session (2026-09-28):** one command per call,
  `pnpm -C /Users/jreye/Documents/axis-design-system <script>` and `git -C /Users/jreye/Documents/axis-design-system <cmd>`.
  A compound command with `cd` plus logs redirected to `/tmp` was blocked by the permission classifier during the Glitch
  Flash release (`v0.3.24`), and the gates and the push had to be run by Codex.
- **Per-slide deck recipes (operator, 2026-09-27):** all **69** slides of the canvas «Deck» are approved and each has a
  recipe in Greenhouse:
  [`docs/operations/brand-graphic-line/deck-recipes/`](../../../docs/operations/brand-graphic-line/deck-recipes/README.md)
  (JSON `efeonce.deck-slide-recipes.v1`; ids **reuse the AXIS Lab id** when the slide exists in
  `apps/lab/src/data/surfaces.ts` / `references/surfaces/deck/<id>.jpg`, new ids are kebab-case English; recipes that
  point to AXIS-only families use `axisRecipeFamilies`). Synced into the token by TASK-1927 (verified in `0.3.14`):
  `section-split` rises on the **left** (`progress.rises: 'start'`) and has the layouts `corner-bottom` and
  `panel-end`; `triptych` is one word per panel, each with its sphere (`voice.sphere: 'per-panel'`,
  `voice.wordsPerPanel: 1`; a panel with more than one word fails). The 38 remaining recipes were measured into the
  token by deltas (f)…(k) (`v0.3.15`…`v0.3.20`), `decision-next-steps` included (its template reads `agenda` +
  `nextSteps`); the Lab pages were only summarized (`apps/lab/src/data/surfaces.ts`). **The Greenhouse norm
  and the recipe catalog win**; never «fix» a slide back to the Lab state, and never publish a new Lab recipe without
  the approved Greenhouse recipe.
- **Covers and back covers (operator, approved 2026-09-27):** they are contract recipes since delta (e):
  `cover-brochure` (use brochure; photo plus voice column; no URL bubble; selection only in `document-selection`), `cover-proposal` (use
  proposal; **no photo**; client logo or its placeholder with the selection on its box, plus the URL bubble),
  `close-brochure` (use brochure) and `close-proposal` (use proposal; with photo; no voice, the message is the slogan).
  Rule: a cover with photo pairs with a back cover without photo, and the reverse (`frame-photo-must-alternate`).
  `cover-classic` and `close-classic` were not approved: the token keeps them with `supersededBy` and Greenhouse has
  no template for them. Since `v0.3.21` the reference `cover-brochure-cine-lines-selection` composes with the
  `cover-brochure` layout `document-selection` (the only cover-brochure layout with a selection). Do not invent
  recipe IDs. Norm: Greenhouse
  [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../../docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md)
  §4.6.
- **Third-party (partner) marks — convention since `axis-brand-assets` `0.4.4` (tag `v0.3.31`, 2026-09-29,
  TASK-1942).** A mark that belongs to someone else (a platform's product icons, a partner-program badge, a co-brand
  wordmark, a tool isotype) never goes into `AXIS_BRAND_ASSETS`. It lives in `assets/partners/`, sealed apart in
  `src/partner-manifest.ts` and exported as `AXIS_PARTNER_ASSETS` (`findPartnerAsset`, `partnerAssetUrl`). Each entry
  must carry **`provenance`** (`source`, `retrievedOn`, `method`, `transformed`) and **`authorization`** (`status`:
  `pending-written-authorization` or `in-stack` — and, since `axis-brand-assets` 0.4.5 (tag `v0.3.36`),
  `authorized-by-partner` with `authorizedBy` and `reference` —, `holders`, `declaredOn`, `note`); a
  partner-program badge also carries **`claim`** (`requires: 'readback-current'`, `status`, `owner`, `fallback`). Files are byte copies of the source —
  never recolored or redrawn; a mark assembled because no vector is published (the Claudeforce wordmark) says so in
  `provenance`. A mark with `pending-written-authorization` does not go to a client or to paid media until the missing
  holder's written authorization is archived (Greenhouse TASK-1937); a badge needs the reference of its authorization or
  current program readback. The Salesforce marks and the «Salesforce Partner» badge are **authorized by Salesforce**
  (declared by the operator 2026-09-29, reference `salesforce-partner-authorization-2026-09-29`): the Salesforce deck carries the badge by
  default; Claudeforce still waits for Anthropic. A mascot
  interpretation that is not the official art (the edited Agent Astro) stays out of every published package
  (`AXIS_PARTNER_ASSETS_EXCLUDED`) and is used only by explicit local path. Surfaces expose these marks only as
  **optional** slots (`partnerMark`, rule `partner-claim-readback`; product icons only where the product is named),
  never fixed in a template; the Lab lists them (section «Marcas de terceros», `/references/surfaces/partner-assets.json`,
  metadata only). A new partner (e.g. HubSpot, TASK-1943) follows the same shape. Detail: Greenhouse skill
  `efeonce-graphic-line` → `references/package-and-tokens.md` §6 and `references/criteria.md`.
- **Deck Salesforce releases (2026-09-29):** `v0.3.31` (twelve recipes, delta (o), `AXIS_PARTNER_ASSETS`), `v0.3.32`
  (four recipes, `LayoutToken.reservesByLine` — a line-specific column reserve applied by `withLayout` only when the
  intent declares that line — and `sloganBlock.appliesTo`, delta (p)) and `v0.3.33` (what the approved slides paint and
  the recipes did not measure, delta (q)). Greenhouse pins tokens/contracts `0.3.33` and brand-assets `0.4.4`
  (`2e002673e`). `0.3.34` (AXIS `4f370d1`, delta (r)) is a no-render cleanup (steps resolver only
  resolves declared `steps.layouts`; `method-waves` steps anatomy; alert-triangle geometry; explicit `ink` colors;
  `loop.number.color` soft); the Greenhouse bump was in progress in another session when TASK-1942's sweep closed —
  check `package.json` before citing the pin.
- **Bump impact from `axis-tokens` `0.3.10` (already absorbed by Greenhouse):**
  `src/@core/theme/axis-package-drift.test.ts` requires `Object.keys(efeonceTokens.color)` to be exactly the
  compatibility roles plus neutrals, so a consumer pinning ≥ `0.3.10` fails it until `info: axisSemanticHex.info` is
  added to `COMPATIBILITY_ROLES` in the same change (Greenhouse did it in TASK-1927 Slice 1). `efeonceTokens.motion`
  now aliases `axisMotion.duration` (`fast` 150ms, `standard` **200ms** — was 220ms in TS, the CSS already emitted
  200ms —, `slow` 300ms); the drift test only checks the keys, so review any TS consumer of those values.

### Efeonce iconography (Trazo and Plastilina)

Canonized by the operator on 2026-09-26 (D22). Values in `efeonceGraphicLine.icons` (`axis-tokens` `0.3.6`); geometry
(79 glyphs since `0.6.0`: 36 Trazo + 43 Plastilina; `0.5.0` shipped 60 and `0.4.0` the 30 base glyphs) and executable
rules in
`@efeoncepro/axis-graphic-line/icons`:
`resolveIcon`, `iconSvg`, `auditIconGroup`, `skewedOrbitHeroSvg`, `iconVoiceForLine`, `strokeSphereClearance`. Commands in
AXIS: `pnpm icons:export`, `pnpm icons:check` (gate for a new glyph), `pnpm icons:vectorize` (Plastilina sheet → glyph
JSON). Guide `docs/agent-composition/iconography.md`, ADR `ICONOGRAPHY_DECISION_V1.md`, Lab `/references/iconography/`
and `/references/iconography.json`. State: first published 2026-09-26 with tag `v0.3.6` (AXIS `main@5b8ab20`); current
catalog published with tag `v0.6.0` (see D26 below). Never draw a glyph by hand inside a piece; a new glyph needs `icons:check` and operator approval. Criterion and
history: `efeonce-graphic-line` → `references/iconography.md`.

**Plastilina en volumen (D24, 2026-09-27):** third layer — each Plastilina glyph in inflated matte clay, 1024 px PNG with
alpha, generated from its approved vector. Only for hero moments (cover, key visual, single-object social piece), one per
piece, ≥ 160 px; never in lists, tables, deck content, dashboards or UI. Tokens `efeonceGraphicLine.icons.volume`
(`axis-tokens` `0.3.7`); files `@efeoncepro/axis-brand-assets` `0.3.2` `assets/volume/<glyph>.png` (18, sealed in
`src/volume-manifest.ts`; API `AXIS_VOLUME_ICONS`, `findVolumeIcon`, `volumeIconUrl(glyph)`); command
`pnpm icons:volume -- refs|key|check|publish`. Canonical on AXIS `main` (`c18e3d3`) and in the Lab
(`/references/iconography/#volumen`). **Both packages are published** (tag `v0.3.7`, 2026-09-27, on `main@c0020b6`:
`axis-tokens` `0.3.7`, `axis-brand-assets` `0.3.2`, `axis-ui-contracts` `0.3.6`, released together with the surfaces work;
`axis-graphic-line` stays at `0.4.0`). Greenhouse already pins these versions (commit `f3f93c926`, 2026-09-27: tokens `0.3.7`,
contracts `0.3.6`, brand-assets `0.3.2`, and `axis-graphic-line` `0.4.0` as a direct dependency). Guide §9, ADR delta D24.

**Craft glyphs (D25, 2026-09-27; verified against AXIS main@aa66225, 2026-09-27):** 30 new glyphs approved — 15 Trazo (`correo`,
`llamada`, `calendario`, `reunion`, `objetivo`, `presentacion`, `contrato`, `checklist`, `codigo`, `base-de-datos`,
`nube`, `integracion`, `seguridad`, `ubicacion`, `reloj`) and 15 Plastilina (`lapiz`, `rodillo`, `aerosol`, `escuadra`,
`postit`, `encuadre`, `pelicula`, `vinilo`, `guitarra`, `reproducir`, `varita`, `taza`, `lampara`, `trofeo`, `estrella`),
the Plastilina ones also in volume. The set is now 27 Trazo + 33 Plastilina = 60, with 33 volume PNGs. Published with tag
`v0.5.0`: `axis-graphic-line` `0.5.0` and `axis-brand-assets` `0.3.3` (`axis-tokens` stays at `0.3.7`). Keys are unique across voices (the phone Trazo is `llamada`; `telefono` is the Plastilina), and
Trazo never uses elliptical arcs (`samplePath` only measures circular ones: ovals are four tangent circular arcs). Guide
§«Catálogo aprobado» (with the design notes), ADR delta D25.

**AI, social and staff glyphs (D26, 2026-09-27; AXIS main@cf77452 (2026-09-27)):** operator, verbatim: «Subelos todos a excepción
del hoodie de trazo que no parece un hoodie». 19 new glyphs — 9 Trazo (`ia`, `composer`, `buscador`, `influencer`,
`prensa`, `social`, `multimedia`, `assets`, `staff-gorra` labeled «Staff») and 10 Plastilina (`chispa`, `prompt`,
`barra-busqueda`, `aro-de-luz`, `television`, `like` «Me gusta», `galeria`, `biblioteca` «Biblioteca de assets»,
`hoodie` «Hoodie Efeonce», `gorra` «Gorra Efeonce»), each Plastilina with its volume. The Trazo hoodie (`staff-hoodie`)
was rejected (it did not read as a hoodie): the hoodie exists only in Plastilina. One key per voice per concept
(ia/chispa, composer/prompt, buscador/barra-busqueda, influencer/aro-de-luz, prensa/television, social/like,
multimedia/galeria, assets/biblioteca, staff-gorra/gorra). None imitates a third-party assistant's UI or logo (ChatGPT,
Gemini); hoodie and cap carry no drawn logo — the sphere is the brand (on the hood, on the cap's front panel). Usage
notes: `influencer` (Trazo) in response resembles `talent`, never together; `chispa` never with `estrella` or `varita`;
`galeria` and `biblioteca` look alike, use them apart; `prompt` is the weakest at 32 px. The set is now **36 Trazo + 43
Plastilina = 79**, with **43 volume PNGs**. Published with tag `v0.6.0`: `axis-graphic-line` `0.6.0` and
`axis-brand-assets` `0.3.4` (`axis-tokens` was at `0.3.8`, published by another session with the surfaces work, and
did not change for D26; its latest is `0.3.21`, see Surface composition). Greenhouse pinned `axis-graphic-line` `0.6.0` and `axis-brand-assets` `0.3.4` at that release; it now pins `0.7.0` and `0.3.5` (D27 below). Guide §«Catálogo
aprobado», ADR delta «IA, social y staff: 19 glifos nuevos (D26)», Lab `/references/iconography/` (79 glyphs, 43 volumes).

**Glitch action glyphs (D27, 2026-09-27; AXIS tag `v0.3.12`, commit `29a40b5`):** 5 new Plastilina glyphs in
`PLASTILINA_GLYPHS` — `guardar`, `compartir`, `recomendar`, `comentar` and the gesture `deslizar`. Their volumes were
generated with the D24 method and approved by the operator before sealing (the `icons:check` warnings on `comentar` and
`deslizar` were reviewed, not ignored). The set is now **36 Trazo + 48 Plastilina = 84**, with **48 volume PNGs**.
Published in `axis-graphic-line` `0.7.0` and `axis-brand-assets` `0.3.5`; Greenhouse pins both. They are ordinary catalog
glyphs, but **in Glitch pieces they are always flat**: `glitchLine.icons.actions` (`row` = back cover «SI TE SIRVIÓ»
with guardar/compartir/recomendar/comentar; `swipe` = `deslizar` on covers and interior slides; `rendering: 'flat'`,
`volume: 'never'`). Operator, verbatim: «si es para la slide de cierre de glitch, prefiero los iconos plastilina en
vectores que en 3d en esa lámina». The Glitch contract rejects volume with `icon-volume-not-applicable`.

### Glitch sub-line (tokens, contract, assets; published 2026-09-27, tag `v0.3.12`; Flash in tag `v0.3.24`)

Glitch (Efeonce's weekly magazine) has a sub-line of «La órbita» that applies **only to Glitch**. TASK-1922 published it
in AXIS tag **`v0.3.12`** (commit `29a40b5`, push authorized by the operator; CI and release-packages green):

- **Token `glitchLine`** (`@efeoncepro/axis-tokens` `0.3.12`, top-level export, type `GlitchLine`, `status: candidate`):
  `color` (`ground` is `efeonceGraphicLine.color.dark` by reference; `accent`, `navy`, `onLight`, `accentOnLight`,
  `explorationAccents`…), `type` (headline entry 300 / wdth 100 / 0.72 em, close 800 / wdth 78, `headlineContrast`
  entry ≤ 400 / close ≥ 700, `narrator` Guttery licensed web + video, rotation −5..−3, installed on the render machine),
  `masthead`, `bytes`, `apple` (`glitch-apple`, viewBox `[539,0,118,154]`, `perPiece: 1`, halo =
  `efeonceGraphicLine.orbit.halo`), `assets`, `dots`, `signature` (Efeonce logo; slogan Growth only on the back cover;
  `urlBubble: false`), `icons` (actions flat, never volume), `formats` (`linkedin-4x5`, `landscape-16x9`, `square-1x1`,
  `blog-inline-16x9`, `reel-9x16`), `safeZones`, `motion` (`approved`, 30 fps, curves by reference to
  `efeonceGraphicLine.motion`; pieces apertura 120 frames / tarjetaFinal 90 frames / preroll 96 frames landscape only;
  `mnemonicSync` apertura f48 sound B; kit; transitions; `reducedMotion: 'final-frame'`), `pieces`, `coverRotation`
  (A/B/C, never the same as the previous week) and `pendingDecisions`. Nothing in `efeonceGraphicLine` or the La órbita
  contracts references it (tested).
- **Contract `efeonce.glitch-line` `0.1.0` (candidate)** in `@efeoncepro/axis-ui-contracts` `0.3.10`:
  `AXIS_GLITCH_LINE_CONTRACT`, `AXIS_GLITCH_LINE_ACCEPTED_VERSIONS`, `AXIS_GLITCH_LINE_ISSUE_CODES` (23, es-CL messages in
  `AXIS_GLITCH_LINE_ISSUE_MESSAGES`), `validateGlitchLineIntent(intent, { narratorLicenseStatus? })` and
  `resolveGlitchLineIntent` → manifest `axis.glitch-line-composition.v1`. Fails closed: any issue → `status: 'invalid'`,
  no body. CLI in AXIS: `pnpm glitch:resolve -- --input <intent.json> --out <manifest.json>`; schema
  `docs/agent-composition/glitch-line-intent.schema.json`; examples `docs/examples/glitch/` (8 valid with committed
  manifests, 5 invalid + `invalid-expected-issues.json`); AXIS ADR `docs/architecture/GLITCH_LINE_TOKEN_CONTRACT_DECISION_V1.md`.
- **Assets** in `@efeoncepro/axis-brand-assets` `0.3.5`: `AXIS_GLITCH_ASSETS`, `findGlitchAsset`, `glitchAssetUrl(id)`
  (`glitch-logo-positive`, `glitch-logo-negative`, `glitch-apple`, sealed in `GLITCH_ASSET_SEALS`), deliberately outside
  `AXIS_BRAND_ASSETS` / `AXIS_BRAND_ASSET_BRANDS`. Fonts (Guttery included) never ship in AXIS.
- **Lab** `/references/glitch/` and `/references/glitch.json` now read the token (the JSON adds `tokens`, `contract`,
  `assets`; schema still `axis.glitch-line.v1`); `apps/lab/src/data/glitch.ts` holds no HEX nor Glitch measures.

Greenhouse `develop` pinned these versions in commit `4dfb147f7`; since `53002b352` it pins `axis-tokens` `0.3.24` and
`axis-ui-contracts` `0.3.22` (Glitch Flash, below); `axis-brand-assets` stays at `0.3.5`.

**Glitch Flash (2026-09-28, AXIS tag `v0.3.24`, commit `5b3056f`; operator-authorized push, CI and release-packages green):**
`glitchLine.editions` declares the two formats — `weekly` (Monday, numbered, 8-segment progress) and `flash` (a one-off
news piece: no edition number, masthead «NO ESPERA AL LUNES» + byte trail + «FLASH», chips `LA NOTICIA`/`ANUNCIO`,
`progress: 'none'`, variable narrator line) — plus six `flash-*` pieces. Contract `efeonce.glitch-line` **0.2.0**
(`@efeoncepro/axis-ui-contracts` `0.3.22` over `axis-tokens` `0.3.24`): `edition` accepts a number or `{ kind, number? }`;
new codes `flash-edition-number-not-allowed`, `flash-progress-not-allowed`, `edition-kind-invalid`,
`edition-kind-mismatch`, `progress-invalid`; a `0.1.0` intent resolves as before. Greenhouse pins `0.3.24`/`0.3.22`
(test `src/config/axis-glitch-line-package.test.ts`). **The Artifact Composer composes the Flash** (commit `24e4c72ee`):
`GlitchFlashManifest` in `src/lib/glitch-composition/manifest.ts` (each slide validated with contract `0.2.0` and
`edition: { kind: 'flash' }`; a number fails with `flash-edition-number-not-allowed`), six templates `flash-*` in
`src/lib/artifact-composer/catalogs/glitch/` (cover, interior, back cover, 16:9 blog banner, 1600×900 news banner,
Threads), the deterministic byte trail `src/lib/glitch-composition/flash-trail.ts` (`pnpm glitch:tokens` writes
`assets/flash-trail.svg` and `--gx-flash-trail-*`) and `pnpm glitch:compose -- --manifest <flash.json>` (example
`src/lib/glitch-composition/examples/flash-sonnet-5-5.example.json`). Criterion: `efeonce-graphic-line` →
`references/glitch.md` §14. Consumers read `glitchLine` or resolve an intent; **never copy Glitch values** into
templates, overlays or scripts. The weekly Composer catalogs (TASK-1923) are complete. Still pending: the governed
production route (TASK-1921: `src/lib/brand-surfaces/production/plan.ts` still calls `planGlitchEdition`, so the Flash
composes only locally); three trail measures not yet in the AXIS token (large width 150 px, compact gap 8 px, news
banner gap 10 px — canvas measures in `glitch.css` until AXIS takes them); and the workshop motion reading the token
and assets instead of its mirror (TASK-1924). Human canon:
`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md`; criterion: `efeonce-graphic-line` →
`references/glitch.md`. Never use the apple, Glitch green, byte glitch, Guttery or the «EDICIÓN #N» masthead in Efeonce pieces.

### Marketing con Manzanitas register (approved 2026-09-28; published in AXIS `v0.3.26`, TASK-1936)

Marketing con Manzanitas (MCM, Efeonce's evergreen editorial brand) has a **register that complements «La órbita» and
does not replace it** (operator, 2026-09-28: «esta línea gráfica no reemplaza The Orbit … sino que la complementa con un
nuevo registro para marketing con Manzanitas»). The operator approved the whole line on the canvas v39
(https://claude.ai/artifact/JxyMSQhwKuty6T6Kdhd4dG): theme-line accents on the apple, its three dots, the orbit and the
highlighted figure; the header; the Pizarra/Escena/Lente/Recreo formats; the fixed «Desliza» spot and signature; back
cover A; 9 charts computed from data; 3 dense-text slides. It is a sibling of the Glitch sub-line and never mixes with it.

- **Published 2026-09-28** under tag `v0.3.26` (AXIS `main` `06cb62d`, CI and `release-packages.yml` green, with the
  operator's explicit authorization; the Glitch release `v0.3.25` went out first in the same push):
  `axis-tokens` `0.3.26` exports the top-level `manzanitasRegister` (outside `axisTokens`; what it inherits from La órbita
  is a reference with an identity test; isolated from `glitchLine`); `axis-ui-contracts` `0.3.24` (patched to `0.3.27` under `v0.3.27`: contract `0.1.1`, the carousel opens with
  its cover and closes with its back cover) exports
  `efeonce.manzanitas-register` `0.1.0` `candidate` (`validateManzanitasRegisterIntent`, `resolveManzanitasRegisterIntent`,
  `resolveManzanitasChart`; 45 es-CL codes; fails closed and returns `pending-decision` when a rule depends on an open
  decision; `pnpm manzanitas:resolve`); `axis-graphic-line` `0.10.0` adds `/charts` (`manzanitasChartSvg`, one function per
  recipe, `runManzanitasChartChecks`; not re-exported from the root; the measure is `measureSvg`); `axis-brand-assets`
  `0.4.1` seals `AXIS_MANZANITAS_ASSETS` apart (accent group `[data-axis-accent="topic-line"]`). AXIS ADR
  `docs/architecture/MANZANITAS_REGISTER_TOKEN_CONTRACT_DECISION_V1.md`, guide `docs/agent-composition/manzanitas.md`,
  examples `docs/examples/manzanitas/`, Lab https://axis.efeonce.org/references/manzanitas/ + JSON.
- **Current release: tag `v0.3.29`** (2026-09-29, AXIS `main` `f722a6f`, operator-authorized): `axis-tokens` `0.3.29`,
  `axis-ui-contracts` `0.3.29` (contract `0.3.0`), `axis-graphic-line` `0.11.0`. No open decision is left
  (`pendingDecisions: []`, ten in `resolvedDecisions`): the close copy varies with the context and its length is bounded
  (`closeCopy.maxChars`, `close-copy-too-long`); the cine photos may show the real current team from the roster Greenhouse
  keeps (`teamPeople`, the token names nobody); the Trazo `republicar` and `enviar` joined the icon set (88 glyphs). The
  slogan is sized from the logo (`efeonceGraphicLine.slogan.widthEmByWord`; `closeLockup.sloganPx` removed), chart labels
  are part of the contract and the step orbit lives in the token. The logo navy `#022a4e` is shared editorial ink
  (`glitchLine.scope.sharedWithEditorialFamily`).
- **Greenhouse pins that set and composes with it**: the Artifact Composer catalog `manzanitas` (TASK-1939,
  `pnpm manzanitas:compose`, `pnpm manzanitas:tokens --check`, visual gate `--catalog=manzanitas`). Every `axis-tokens`
  bump also runs `pnpm manzanitas:tokens --check`. The governing docs stay the Greenhouse norm
  `docs/operations/brand-graphic-line/manzanitas/MANZANITAS_REGISTER_V1.md`, the ADR
  `docs/architecture/MANZANITAS_REGISTER_DECISION_V1.md` and `efeonce-graphic-line` → `references/manzanitas.md`; the team
  roster is `docs/operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md`. A value change goes through the token and its
  test in AXIS, signed in the Greenhouse ADR — never by editing the norm or a canvas.

### Efeonce sonic identity (Lab page + public bucket; recommended)

State: **recommended by the operator on 2026-09-26, NOT canon.** What AXIS publishes (PR
`efeoncepro/axis-design-system#4`, squash-merged to `main` as `55486aa` on 2026-09-26; live): the Lab page
`/references/sonic-brand/`, the agent JSON `/references/sonic-brand.json` (schema `axis.efeonce-sonic-brand.v1`: URL,
duration, LUFS, peak and SHA-256 per file), the guide `docs/agent-composition/sonic-brand.md`, Lab sources
`apps/lab/src/data/sonic-brand.ts` (criterion) and `sonic-brand-assets.ts` (generated from the bucket). Files live in the
public bucket `gs://efeonce-group-axis-public-media/sonic/v1/` (`masters/` + `web/`, 65 files).

- **No audio package and no tokens yet, on purpose:** while the identity is only recommended, nothing enters
  `@efeoncepro/axis-tokens`. On canonization its values go to tokens next to `efeonceGraphicLine.motion.sound`, and the
  sound of the V1.1 logo masters (`motion/logo/v1.1/`, still rendered with Greenhouse `orbit-sound.mjs`) is replaced.
- **How it was published:** PR #4 was built on `origin/main` with a temporary git index, because the shared AXIS
  checkout held another session's WIP. The Lab navigation entry merged cleanly next to «Surfaces».
- **Rules for agents:** use the kit files by URL and verify their `sha256` from the JSON; never regenerate a sound
  that the kit already has. Motif, per-line sphere timbre, voice (Brian) and loudness rules come from the guide, not from
  memory. **Glitch is not part of this kit:** its own sound design and music (approved 2026-09-27, Glitch only) live in
  `/references/glitch/#sonido` and `#musica` (`glitch.json` → `sound`, `music`); never mix them with this kit. Never in client
  work or Greenhouse UI. Production and criterion live in Greenhouse: `docs/operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md`
  and `audio-studio` → `efeonce/EFEONCE_OVERLAY.md`.

### Efeonce Insights in AXIS (brand assets + Lab reference; 2026-09-28)

What AXIS holds for Efeonce Insights, and nothing more:

- **Brand assets** in `@efeoncepro/axis-brand-assets` **`0.4.0`** (tag `v0.4.0`; AXIS `25b5ecf` logo/isotype +
  `4760e3e` lockup, on `main`): brand `insights` in `AXIS_BRAND_ASSET_BRANDS` (`src/index.ts`); ids
  `insights-logo-{positive,negative}`, `insights-isotype-{positive,negative}` and `insights-lockup-{positive,negative}`
  (`src/manifest.ts`; new asset kind `lockup`, a fixed two-brand composition used as one file and never rebuilt). Rules
  in the package README: the mark sits next to the Efeonce logo and never signs; in the lockup Insights goes in the
  brand gray (`#6b6b6b` on paper `#f7f8f6`, 5.0:1; `#6f89a2` on the dark ground `#001a33`, 4.83:1 — on navy `#023c70` it drops to
  3.07:1) and only the sphere keeps the Growth accent. Files are generated in
  Greenhouse by `scripts/brand/build-insights-logo.mjs` and re-sealed with `packages/brand-assets/scripts/seal.mjs`; never edited by hand. The
  Lab copies them to `apps/lab/public/branding/` via `apps/lab/scripts/sync-brand-assets.mjs`.
- **Greenhouse pinned `0.3.5`** on 2026-09-28 (today it pins `0.4.1`, which carries these files; the PDF/deck covers still do not use them); Think uses manual copies. The Greenhouse PDF/deck covers
  show a type version (Efeonce logo + rule + «INSIGHTS» set in spaced capitals — `text-transform: uppercase` +
  `letter-spacing: 0.34em`, not font small caps), not the official lockup file. **Open operator decision:** on those
  navy covers «INSIGHTS» is painted in the accent (`navyAccent` = teal-500, 12 px) with its own proportions, which
  conflicts with «next to Efeonce, Insights lowers its brightness; only the sphere keeps the accent» and with «the accent
  never on text under 24 px»; changing it touches TASK-1889's fidelity contract, so no agent changes it. In Think the
  negative lockup goes on the dark hero and on the presentation cover; the positive one only when printing.
  Switching them to the file, or adding the mark to email, favicon, portal or MCP, is an open operator decision (criterion and application map in
  `efeonce-graphic-line` → `criteria.md` and `applications.md` §B3b).
- **Lab reference page** `/references/insights/` — **published 2026-09-28 (AXIS main `3dfbf0e`)**: page, agent JSON and
  agent guide (`apps/lab/src/pages/references/insights.astro`, `insights.json.ts`, `docs/agent-composition/insights.md`)
  are on AXIS `main`; `https://axis.efeonce.org/references/insights/` and `/references/insights.json` answer 200, and the
  SVG copies `apps/lab/public/branding/insights-*.svg` ship with it. Reviewed by its builder before merge (no WAF details
  on the public page, facts corrected, live gallery recaptured, e2e 2/2). The sample `think.efeoncepro.com/insights/muestra`
  remains the live example of the product itself. It documents the mark and lockup, the approved applications, the report
  sections and the live-report UI as a **reference**, the same way Glitch documents its approved pieces. The Lab is
  public: sample data only (a fictitious organization, a «Logo del cliente» placeholder, illustrative figures), never
  Berel, Sky or any client's data. The earlier boards 7.1/7.2 in `/references/graphic-line/` stay design tests.
- **Boundary (binding):** AXIS publishes values, meaning and brand assets; it does **not** publish Insights product UI
  (report templates, the Think components, chart renderers) as components or contracts. Product adapters stay in their
  consumers until a second real consumer justifies extraction (`axis-design-system/docs/ARCHITECTURE.md`; ADR
  `GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md` §Adapters; Lab §Boundary).
- **Extraction candidates — follow-up, not implemented:** there are already two consumers with hand copies of (1) the
  data-color roles (`greenhouse-eo/src/lib/artifact-composer/brand-packs/axis/editorial-roles.json` ↔
  `efeonce-think/src/lib/insights-tokens.ts`; they once diverged on «prior on paper», fixed in Think `b3c5820` to `#1f9e94`) and (2) the
  geometry of the 15 chart families (`greenhouse-eo/src/lib/artifact-composer/chart-geometry.ts` +
  `catalogs/insights-shared/figure-svg.ts` ↔ `efeonce-think/src/lib/insights-chart-geometry.ts`). Extracting them needs
  its own decision and task; never add them to AXIS inline.
- **Known drift:** the root README table and `docs/ARCHITECTURE.md` §Official brand files («0.3.0 … 19 SVGs») still
  describe older `axis-brand-assets` versions.
- Detail of the report and the live UI: `efeonce-insights` → `references/ui-and-brand.md`.

### SEO/AEO product sub-brands in AXIS (brand assets + Lab; 2026-09-29)

The operator approved four **Efeonce product sub-brands** for the SEO/AEO practice, with logos («todas estas son
submarcas de producto de Efeonce»; «están aprobados todos»; canvas of record «Marcas SEO y AEO de Efeonce»,
https://claude.ai/artifact/3wPmSbb24fm1pJqAPcv9ac): **Efeonce | SV360** (Search Visibility 360, the full SEO + AEO
product capability), **Efeonce | AEO** (brand visibility in AI answers), **Efeonce | AEO Assessment** (the process that
evaluates the brand) and **Efeonce | AI Visibility Report** (the deliverable). Same pattern as Insights: they accompany
Efeonce in a lockup and **never sign alone**. Naming: Greenhouse ADR `EFEONCE_AEO_BRAND_NAMING_DECISION_V1.md` §Delta
2026-09-29 (it updates the earlier «not a product brand» clause; legacy aliases unchanged).

- **Brand assets** in `@efeoncepro/axis-brand-assets` **`0.4.2`** (tag `v0.4.2`, published 2026-09-29, AXIS `main`
  `7f9c8bb`): export `AXIS_SEO_AEO_BRANDS` (`sv360`, `aeo`, `aeo-assessment`,
  `ai-visibility-report`) and the new variant `white`; 33 new SVG (58 total):
  `{sv360,aeo,aeo-assessment,ai-visibility-report}-logo-{positive,negative,white}`, `{sv360,aeo}-isotype-{…}` (Assessment
  and Report have no isotype), `{…}-lockup-{positive,negative,white}` and `sv360-name-lockup-{…}` (lockup with the full
  «Search Visibility 360»). Surfaces: positive = light, negative = dark, white = any.
- **Construction («the orbit lives in the O»):** the o of the Efeonce logo is already the ship in orbit; each sub-brand
  inherits it in its own O — AEO's O (sphere at 1:30), SV360's 0 (a full turn: the sphere back at 12, the line at 100 %)
  and the o of «Report» (the smallest orbit of the family, weakest at small sizes). Poppins Bold; the descriptors
  «Assessment» and «Search Visibility 360» in Poppins Medium, smaller. Thin ring in the word's ink, sphere in the
  **Engine** line accent (`#0375db`, `efeonceGraphicLine.lines` key `engine`), a cut in the ring around the sphere; the
  full ring was rejected (it reads as a C with a dot). Lockups use the Insights measures (Efeonce 30 px high, 20 air,
  rule 1 × 26, 20 air), sub-brand in measured gray (`#6b6b6b` on paper; `#6f89a2`: 4.83:1 on `#001a33`, 4.55:1 on
  `#091951`), only the sphere in the accent. `white` is all white (sphere and Efeonce logo included) for photos and
  colored grounds; on the line's dark ground use the negative.
- **Line:** SEO/AEO pieces belong to **Engine** (web, infrastructure, SEO and measurement): accent `#0375db`, dark ground
  `#091951`, slogan word «Engine» («Empower your Engine») in the closes.
- **Generation:** Greenhouse `scripts/brand/build-seo-aeo-logos.mjs` (fontkit Poppins outlines; colors read from
  `@efeoncepro/axis-tokens`), then copy to `packages/brand-assets/assets/` and re-seal; never edit the SVG by hand.
- **Lab reference page** `/references/seo-aeo/` + `/references/seo-aeo.json`, agent guide
  `docs/agent-composition/seo-aeo.md` — published 2026-09-29 (answering 200 per `efeonce-graphic-line` →
  `sources-and-assets.md`).
- **Greenhouse pinned `0.4.1`** when these files shipped; it now pins `0.4.5`, which carries them. Their first
  application is TASK-1938 (Grader report PDF with the «Efeonce | AI Visibility Report» lockup, Engine palette).
- Criterion and application map: `efeonce-graphic-line` → `criteria.md` («Submarcas de producto SEO/AEO») and
  `applications.md` §B3c; Greenhouse norm `docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md` §7.2.
- **In the SEO/AEO deck (operator-approved 2026-09-30, TASK-1949):** the lockups enter deck slides as the optional
  slot `productMark` (closed list `sv360-lockup-negative`, `sv360-logo-negative`, `aeo-lockup-negative`,
  `aeo-assessment-lockup-negative`, `ai-visibility-report-lockup-negative`, `insights-lockup-negative`; one per slide),
  and the eyebrow of `proposal-cinematic-seo`/`-aeo` becomes `requiredUnless: productMark`. Declared so far only in the
  Greenhouse recipe catalog (`EFEONCE_DECK_SLIDE_RECIPES_V1.json`, 100 recipes). **AXIS side pending (TASK-1949
  Slice 3):** the six new recipes in `efeonceGraphicLine.surfaces.deck.recipes`, `requiredUnless` in the contract, Lab
  references `apps/lab/public/references/surfaces/deck/<id>.jpg` and the BICECORP and Banco BICE client logos with
  provenance (`ai-generations/2026-09-29_deck-seo-aeo-documentos/logos/PROCEDENCIA.txt`) and authorization state
  (client logos are third-party marks: never generated, used only with the client's authorization, TASK-1937). Norm:
  `EFEONCE_SURFACE_COMPOSITION_V1.md` §4.6 «Deck SEO/AEO».

### Efeonce AI Visibility Report (0.3.30 set)

The operator approved the **Efeonce AI Visibility Report** (the PDF deliverable of the Efeonce AEO Assessment; product
sub-brand, «La órbita», Engine line) and asked to canonize it in AXIS. Published 2026-09-29, AXIS `main` `26097c5`,
tag **`v0.3.30`**, registry verified: `axis-tokens` `0.3.30`, `axis-ui-contracts` `0.3.30`, `axis-graphic-line`
`0.12.0`, `axis-brand-assets` `0.4.3`, `axis-ui-registry` `0.3.2`.

- **Tokens:** `efeonceGraphicLine.measureSeverity` (`canonical`, `allowedFor: ['scored-diagnostic']`) — only a score
  with a published severity scale may color trail, sphere, sphere glow and label dot; ring, origin mark and figure do
  not change; text label required and scale visible. Dark: `axisRamp.error[400]` `#e25a61`, `warning[500]` `#ffb703`,
  `success[400]` `#46a877` (each ≥ 4.5:1 on `#091951`); light: `error[600]`, `warning[900]`, `success[500]` (each
  ≥ 3:1 on paper and white); `sphereGlow` ofSphere 3, opacity 0.5; no data = ring + origin only, «—», no «de 100».
  New top-level export `aiVisibilityReport` (`candidate`): palette, type, A4 page, order cover → what-to-do → why →
  where → market → back-cover, chapters with Trazo glyphs, the two audiences (prospect: agenda CTA with UTM, never
  email; client: account lead, no offer), cover orbit geometry (box 400, r 172, 4 px trail of 50°, sphere 10, glow 30),
  interior header/footer, back cover, locales `es`/`en`/`pt-BR` (fallback `es`) and the `never` list.
- **Contracts:** new `efeonce.ai-visibility-report` `0.1.0` (`candidate`), manifest
  `axis.ai-visibility-report-composition.v1`, 22 issue codes, 9 adapter checks, CLI `pnpm report:resolve` in AXIS.
  `efeonce.graphic-line-orbit` `0.3.1` → **`0.4.0`**: `measure` gains `severity`, `severityLabel`, `scaleVisible`,
  `glow`; codes `measure-severity-label-required`, `measure-severity-scale-required`, `measure-severity-invalid`,
  `measure-severity-label-without-severity`.
- **Recipe:** `@efeoncepro/axis-graphic-line/report` — `aiVisibilityReportOrbitSvg({ score, severity, surface?,
  idPrefix? })` and `aiVisibilityReportSeverityColor`; `measureSvg` accepts the severity options and the painter draws
  the sphere glow. `axis-brand-assets` `0.4.3` re-stamps the 48 static orbits with contract `0.4.0` (same drawing).
- **Lab:** https://axis.efeonce.org/references/ai-visibility-report/ + `.json` (schema
  `axis.efeonce-ai-visibility-report.v1`): live severity states with a slider, anatomy, the 24 approved pages in three
  languages, an agents section. **Docs:** ADR `docs/architecture/AI_VISIBILITY_REPORT_COMPOSITION_DECISION_V1.md`,
  guide `docs/agent-composition/ai-visibility-report.md`, the intent schema, `docs/examples/ai-visibility-report/`;
  the orbit guide and ADR updated for `0.4.0`.
- **Boundaries (binding):** the thresholds belong to the producer (the contract receives the resolved level; never put
  them in a token). The severity exception is limited to a scored diagnostic: it is **not** a permission for the state
  mark, which stays without traffic lights, nor for coloring a measure without a published scale. Unlike Insights, AXIS
  holds a contract for this document; the PDF renderer is Greenhouse's.
- **Travelled path (decided 2026-09-29, night; `0.3.38` set):** the operator decided «aplícalo en todas»: every
  measure, this cover included, also draws the travelled path from 12 o'clock under the trail, in the trail's (or
  severity's) color at 0.6 opacity and 0.75 × the trail stroke. `aiVisibilityReportOrbitSvg` draws it since
  `axis-graphic-line` `0.13.0` (`aiVisibilityReport.cover.orbit.travelled`: 3 px under the 4 px trail). Details in
  «Efeonce email modules (0.3.38 set)» below.
- **Greenhouse does not pin it yet:** `develop` pins tokens/contracts `0.3.37`, graphic-line `0.11.0`, brand-assets
  `0.4.5` (the report tokens and contract arrive with the `0.3.3x` pins, but not `/report` nor the travelled path);
  adopting the report is part of TASK-1938 (its renderer is not implemented). Sealed design:
  `docs/ui/visual-directions/TASK-1938-ai-visibility-report-pdf-la-orbita-direction.md`. Criterion and inventory:
  `efeonce-graphic-line` → `criteria.md` §3.4, `package-and-tokens.md` §2.19/§2.20/§7.10, `ledger.md`.

### Efeonce email modules (0.3.38 set)

The operator approved the **Efeonce Insights delivery email** (canvas https://claude.ai/artifact/1FHPWVxQ2rbK6jdxw2EqNd
v21, page «Correo», boards: share link desktop, mobile, PDF attached) and asked to canonize, with this scope: the
Insights email is **one application**, not the email template. What is canonical is the **footer**, the **CTA modules**
and the **footer brand block**; other emails build their own body on the same base. Published 2026-09-29, AXIS `main`
`c92160b`, tag **`v0.3.38`**, registry verified: `axis-tokens` `0.3.38`, `axis-ui-contracts` `0.3.38`,
`axis-graphic-line` `0.13.0`, `axis-brand-assets` `0.4.6`, `axis-ui-registry` `0.3.3`.

- **Token `efeonceEmail`** (top-level export outside `efeonceGraphicLine`, `canonical`, `complements:
  'efeonceGraphicLine'`, `scope: 'modules'`, `template: false`): `width` (desktop card 600 in a 680 frame; mobile 390
  full-bleed), `palette`, `type`, `modules` (`ctaPrimary`: full-width navy `#001a33` pill, e.g. «Ver el informe
  completo →»; `ctaAgenda`: card `#023c70`, radius 16, title «¿Lo revisamos juntos?» Bricolage 700 22 px, body 13 px
  `#cfe4fa`, white pill «Agendar una reunión», URL `https://efeoncepro.com/contacto/` with UTM `utm_medium=email`,
  `utm_source` = product, `utm_content=pie`, never overwriting a UTM the URL already carries), `brandBlock` (logo 220 px,
  slogan **below** at 64 % of the logo width with the **service line** word — Growth, Brand, Engine, Voice or Revenue,
  never the product; white under 24 px, so always white at 220 px), `institutional` (mirrors Greenhouse
  `src/config/efeonce-brand.ts`), `retired: ['cta-subscribe']` («Suscribirme» is retired; the agenda replaces it in
  every email), `applications` (`efeonce-insights-delivery`, line `growth`), `emailSafe` and `assets`.
- **Footer order:** agenda card → brand block → URL bubble + 4 social circles (LinkedIn, Instagram, YouTube, Threads) →
  hairline → legal block (11 px `#9fb3c8`: «Efeonce Group SpA» 600 `#cfe4fa` · RUT; address; phones · email) →
  hairline → preferences and unsubscribe (11 px) → reason and © (10 px). Ground `#001a33` for every line.
- **Contract `efeonce.email-modules` `0.1.0` (`candidate`)**, manifest `axis.email-modules-composition.v1`,
  `validateEmailModulesIntent` / `resolveEmailModulesIntent`, 23 es-CL issue codes (including `cta-subscribe-retired`,
  `agenda-never-email`, `cta-agenda-required`, `footer-unsubscribe-required`, `line-invalid`), 6 adapter checks
  (`images-png-with-dimensions`, `no-inline-svg-in-email`, `legal-block-live-text`, `bulletproof-buttons`,
  `footer-contrast`, `dark-mode-safe`). CLI `pnpm email:resolve -- --input <intent.json> [--out <manifest.json>]`; the
  manifest has no HTML and no coordinates: the consumer's adapter builds table-based email HTML.
- **Email-safe PNGs** in `axis-brand-assets` `0.4.6` (`AXIS_EMAIL_ASSETS`, `findEmailAsset`, `emailAssetUrl`; generated
  by `pnpm email:assets`, sealed in `src/email-manifest.ts`, @2x RGBA): `email-logo-negative` (220 × 52),
  `email-slogan-{growth,brand,engine,voice,revenue-hubspot,revenue-salesforce}-negative`,
  `email-social-{linkedin,instagram,youtube,threads}-white` (40 × 40), `url-bubble-baked-dark-email` (163 × 32).
  **Logo and slogan are separate assets**, stacked with the seal's `stack.gapBelowLogoImagePx`, because the brand SSOT
  says the slogan is never merged into the logo; a logo of another width needs its own generated slogan, never a
  scaled one.
- **Travelled path of the measure** (same release): `efeonceGraphicLine.trajectory.measure.travelledPath` (`opacity
  0.6`, `strokeOfTrail 0.75`, `full: 'ring-at-100'`, `none: 'at-zero'`); orbit contract `0.4.0` → **`0.5.0`** (every
  `measure` resolves `travelled`, anatomy part `travelled-path`, no new intent field); the painter, `measureSvg` and
  `aiVisibilityReportOrbitSvg` draw it (`data-axis-part="travelled"`); the 48 static orbits re-stamped, same geometry.
  It supersedes «never an arc growing from the origin». Why: 62 % with only a short trail read as less.
- **Lab and docs:** https://axis.efeonce.org/references/email/ + `/references/email.json` (the Insights email shown as
  an application); ADR `docs/architecture/EMAIL_MODULES_DECISION_V1.md`, guide `docs/agent-composition/email-modules.md`,
  intent schema, examples `docs/examples/email-modules/`. Greenhouse sealed design:
  `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1-direction.md` + PNGs in
  `docs/ui/visual-directions/EFEONCE_EMAIL_MODULES_V1/`.
- **Not the email signature:** a person's signature stays `efeonce.email-signature` / `emailSignature`.
- **Greenhouse has not adopted it:** it pins the older set (above), and `src/emails/InsightsEditionDeliveryEmail.tsx`
  and `src/emails/components/EmailLayout.tsx` are unchanged. Skills: `greenhouse-email`, `resend-email-platform`,
  `efeonce-graphic-line` → `applications.md` §C4.
- **Footer by purpose (operator decision 2026-09-29; resolves the TASK-1764 tension for Insights):** the Insights
  delivery email goes to clients, so it is `relationship_transactional`, with the explicit exception
  `efeonce-insights-delivery` that keeps the full footer (agenda, socials, preferences and unsubscribe «Dejar de
  recibir estos informes»). Every other email follows the Greenhouse policy: no agenda, socials or unsubscribe in
  transactional/service emails; unsubscribe required in subscription and marketing; socials optional in subscription,
  required in marketing. **Contract `efeonce.email-modules` `0.2.0`** (publishing in v0.3.39: tokens and contracts
  0.3.39, registry 0.3.4): required `purpose` and an `application` that references an exceptions registry;
  `cta-agenda-required` removed; new codes `cta-agenda-not-allowed`, `footer-socials-not-allowed`,
  `footer-unsubscribe-not-allowed`, `application-unknown`, `application-purpose-mismatch`. Exceptions are per type,
  with approver, date and reason; no adapter removes modules on its own.

### AXIS Lab

The Lab lives in `../axis-design-system/apps/lab`, not in Greenhouse. Its current runtime is Astro 7.1.6
with `output: 'static'`, public Vercel delivery, and no consumer adapter imports. The static reference is
derived from the published/workspace registry and tokens. Astro Content Loader validates contracts and generates
the catalog, per-pattern routes, MDX usage docs and sitemap; search uses a minimal vanilla script rather than a
hydrated React application.

For Lab work, run `pnpm --filter @efeonce/axis-design-system-lab build`, `typecheck`, `test` and `lint` in
the AXIS repository. `astro check` is the type/lint gate; `test` runs Vitest and `test:e2e` runs Playwright
desktop/mobile smoke. Do not add SSR, Actions, secrets, Greenhouse imports or product-specific adapters to
the Lab; a missing portable contract is an AXIS gap.

### Color ownership cutover (TASK-1600)

Treat this as a staged provenance migration, not a visual redesign:

1. Slice 0: align this skill with the accepted ownership ADR.
2. Slice 1: publish the complete portable color data in `@efeoncepro/axis-tokens@0.2.0`, preserving
   the existing `0.1.5` roles and values.
3. Slice 2: invert the consumer drift gate so Greenhouse proves it reflects AXIS; ship this before
   removing the local declaration.
4. Slice 3: make the five Greenhouse `axis-*.ts` files consume AXIS while keeping MUI materialization
   local; no consumer import path should change.
5. Slice 4: verify non-theme consumers, including Finance PDF and report artifacts.

Slice 1 publishes explicit light/dark neutrals; products resolve the active mode. `axisSemanticPalette` remains
local because it is MUI-shaped. Charts are portable AXIS data; product-specific subsets remain local. Do not run
Slice 3 before Slice 2 is green. Require unchanged contrast/drift tests, GVC diffs at 1440 px and 390 px
in light and dark, and before/after PDF comparisons. No feature flag is needed: exact package versions
provide pull-based rollback, and `0.1.5` remains the fallback if `0.2.0` is not adopted.

The boundary is: AXIS owns **what** (`#dc2e39`, semantic roles, portable data); the product owns **how**
(`theme.palette`, Tailwind utilities, layout and painted components). The separate `axis-headless` behavior
axis is not part of TASK-1600 and needs its own task.

### Private package consumption

Use \`GITHUB_TOKEN\` for GitHub Actions when repository package access is configured. Cloud Build uses
only \`projects/efeonce-group/secrets/axis-packages-read-token\` with least-privilege access for the
required build identities. The legacy \`efeonce-globe\` secret is retired and must not be recreated.

Never print, paste, commit, screenshot or log a credential. Stream a temporary \`read:packages\`
credential directly to Secret Manager; retain only non-sensitive metadata. The current temporary
operator-owned credential is an interim risk: replace it with a dedicated machine identity before
external/customer rollout.

A local install of AXIS packages needs a `read:packages` credential: pass it through an ephemeral
`NPM_CONFIG_USERCONFIG` file outside the repo, removed afterwards; never commit or print it. On 2026-09-27 the local
installs of TASK-1927 used the token of the operator's `gh` CLI (`gh auth token`), authorized by the operator for that
task and for the local install only: it is read inside the command, never printed, never stored, and never placed in
CI, Cloud Build or Secret Manager (runbook, Delta 2026-09-27 (e)). A new task needs its own authorization. A **new** AXIS package
also needs "Manage Actions access → Read" granted to each consuming repository in its GitHub package settings
(done for `axis-graphic-line`), or CI installs fail.

For a migration, inventory active consumers first; create/enable the replacement; grant IAM; run
non-leaking package-install/build checks; deploy and verify revision/SHA/digest; only then disable
and revoke the legacy credential. Do not delete or revoke anything before production evidence is
green.

### Consumer canary

Canaries are opt-in, deterministic and read-only unless the contract requires a mutation. Use
\`playwright-core\` and \`chromium.launch({ channel: 'chrome' })\`; never download browsers or hardcode
an author's local executable/profile path. Exercise the real consumer surface, not a mock invented
by the canary. Artifacts may contain target SHA, package version, URL, assertions and redacted
console/network diagnostics, but never cookies, authorization headers or secrets.

### Release and rollback

Release evidence must include target SHA, package versions, CI/build run, image/deployment digest,
active revision, smoke/health result, canary result and the previous known-good rollback target.
Verify the artifact contains neither \`.npmrc\` nor the package credential. If a canary or runtime
check fails, stop promotion or restore the previous deployment, then verify health and smoke again;
preserve both digests and the build/credential configuration needed to reproduce the rollback.

## Stop conditions

Stop and surface the blocker when the requested change would:

- put a secret in source, logs, images, lockfiles or chat;
- move a color source or remove a local declaration before the preceding drift, visual and PDF evidence is green;
- change a shared contract without an owning ADR/gate;
- promote adapters beyond opt-in without product/commercial authorization;
- require a new machine identity or external account decision not yet approved;
- rely on a stale document when runtime, schema or deployed evidence says otherwise.
