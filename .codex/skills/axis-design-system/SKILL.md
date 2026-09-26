---
name: axis-design-system
description: "Use for Efeonce AXIS tokens, contracts, registry, adapters and releases, including advertising typography, semantic collaboration selection, and candidate AEO creative graphics for AI search, ChatGPT/Gemini composers, turns, answers and citations, and the Efeonce graphic line «La órbita» (tokens, contract and the `axis-graphic-line` orbit package)."
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

Efeonce's own-brand graphic line (orbit: thin ring, arc with sphere, halo; lens and spotlight) became canonical on
2026-09-25. Greenhouse is the control plane: the [ADR](../../../docs/architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
and the [manual](../../../docs/operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) live there; the
operating summary is [`graphic-line-orbit.md`](../efeonce-brand-studio/references/graphic-line-orbit.md). Published
set (versions are independent per package): `axis-tokens`, `axis-ui-contracts`, `axis-ui-registry` and
`axis-brand-assets` `0.3.0`; `axis-graphic-line` `0.3.1`. AXIS holds:

- **Tokens:** `efeonceGraphicLine` in `packages/tokens/src/tokens.ts` (`@efeoncepro/axis-tokens`, `status:
  'canonical'`, opt-in branch outside the `axisTokens` aggregate). Groups: `color`, per-brand `family`, `sphere`,
  `orbit` (per `baseWidthPx` 794, social ×1.75 up to `socialMaxWidthPx`), `trajectory`, `lens` (`anatomy`; the
  `accentSphere*` ratios are deprecated), `portrait` (orbit around a person photo: email signature, team cards),
  `pieces` (fixed-format pieces measured one by one: `lens` wall/deck-cover/post/story/campaign-post/linkedin,
  `spotlight` photo/event, `deck` cover/section/content/close), `spotlight`, `urlBubble`, `signature`, `slogan`,
  `state` and `brandClose`.
- **Contract:** `efeonce.graphic-line-orbit` `0.3.0` (`stable`), manifest `axis.graphic-line-orbit-composition.v1`.
  An agent declares `orbit`, `measure` (value 0–1 **with a source**), `progress`, `lens`, `spotlight`, `family-map`,
  `url-bubble`, `voice`, `logo-inline`, `signature`, `slogan`, `state` or `brand-close`; the resolver enforces the
  line's rules and resolves every value from the tokens. Rejections, adapter checks and entry points: see the
  operating reference; in AXIS `pnpm orbit:resolve` (manual `docs/agent-composition/graphic-line-orbit.md`, ADR
  `GRAPHIC_LINE_ORBIT_COMPOSITION_DECISION_V1.md`).
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
- **Greenhouse consumption:** pins the four `0.3.0` packages on `develop` (reaches `main` with the next release) and
  does **not** use `axis-graphic-line`: its adapter `scripts/creative/layout-compiler/graphic-line.mjs` keeps its own
  raster-safe painter on contract `0.3.0` (lens with arc + sphere, deck one ring), and `axis-advertising.mjs`
  requires collaboration-selection `0.3.0`. Entry points `pnpm creative:orbit:resolve|render`, the per-format
  `graphic_line` layer and `brand.signature` of `pnpm creative:layout`, and `marcaEnEscena` of
  `pnpm foto:componer:cta`. Never copy the Lab painter.
- **Signature rule (operator, 2026-09-26):** the Efeonce logo, centered. The URL bubble signs instead ONLY when the
  logo already appears in the image (`signature.brandInScene: true`), centered, luminosity-blended on the real pixels
  at opacity 1, ≥ 4.5:1 measured (passes only on very dark beds); never beside the logo. Footer uses keep the baked
  variants. Threshold 4.5 vs 3:1 pending the operator.
- **The orbit never replaces the photographic composition** and never crosses subject, text reserves, bed or
  signature (`orbit-never-over-subject-or-reserves`).
- **Official files:** `@efeoncepro/axis-brand-assets` `0.3.0`: 19 brand SVG (logo/isotype per brand, URL bubble
  source and baked variants) plus the 48 static orbits, SHA-256 sealed; `findBrandAsset`, `brandAssetUrl`,
  `findOrbitAsset`. Consumers read the package, never a hand copy (Greenhouse guards its local copies with
  `src/config/efeonce-brand-assets.test.ts`). Not `efeonce.brand-logos` (third-party logo provenance).
- **Motion:** the orbit animation (no logo) comes from this package (`ORBIT_MOTION_CSS`, `pnpm orbit:video`); the
  three logo animations V1.1 (reveal, opening, sting) are rendered in Greenhouse — see `motion-design-studio`.
- Scope: Efeonce's own brand and its family. Never Greenhouse product UI and never client work.

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
`NPM_CONFIG_USERCONFIG` file outside the repo, removed afterwards; never commit or print it. A **new** AXIS package
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
