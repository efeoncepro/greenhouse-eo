---
name: greenhouse-digital-brand-asset-designer
description: Vectorize, clean, validate, and apply payment-instrument brand logos and isotypes for the Greenhouse portal. Owns the four-variant matrix (full/mark × positive/negative), raster-to-vector conversion via VTracer, manifest provenance, and visual QA. Invoke when adding a new payment provider logo, fixing a vectorized mark, generating negative variants, or auditing the asset matrix of an existing brand.
user-invocable: true
argument-hint: "[provider slug or describe which brand asset to vectorize, fix, or audit]"
---

# Greenhouse Digital Brand Asset Designer

You are the canonical owner of payment-instrument brand assets in this repo. Use this skill whenever Greenhouse needs payment provider logos, isotypes, SVG conversion, positive/negative variants, selector icons, or visual QA for brand identity files used by the portal.

## Core Rule

**Never draw a brand logo from memory or approximate it by hand.** Start from an official or user-provided source asset, preserve geometry, and leave an auditable source trail.

Acceptable sources, in order:

1. Official SVG from brand site or brand kit.
2. Official raster from brand site, app, favicon, press kit, or user-provided approved source.
3. Existing repo-curated SVG with manifest provenance.
4. Wikimedia / Simple Icons only with explicit review.

## When NOT To Use

Skip this skill when:

- The logo already exists in `public/images/logos/payment/` with the full matrix (`full-positive`, `full-negative`, `mark-positive`, `mark-negative`) verified — no regeneration needed.
- The user only wants to **swap which slug** a UI references (e.g. point `compactLogo` to a different file). That is `src/config/payment-instruments.ts` work, not vectorization.
- The asset target is **email templates, PDFs, social media, or marketing collateral**. This skill only governs portal payment-instrument assets.
- The user wants a **non-payment Greenhouse brand asset** (favicons, app icons, splash screens). Those have their own provenance flow under `public/images/greenhouse/SVG/`.
- The request is to **invent a logo for a brand that doesn't have one yet**. This skill operates on existing brand identities only — never create.
- The task is to **build a UI component** that uses a logo. That is `figma-implement-design` or component-level work, not asset creation.

## Disambiguation From Sibling Skills

| Need | Use |
|---|---|
| Vectorize / clean / publish payment provider logos | **this skill** |
| Translate a Figma design into React code | `figma-implement-design` |
| Generate a brand-new visual asset via AI image gen | `generate-visual-asset` |
| Build or audit a UI component using existing logos | `greenhouse-ui-review` or `modern-ui` |
| Wire `src/config/payment-instruments.ts` provider entries | direct edit (no skill) |

## Variant Model

For each brand, aim for four SVG variants:

- `full-positive` — full lockup for light backgrounds (canonical entry).
- `full-negative` — full lockup for dark backgrounds.
- `mark-positive` — isotype / compact mark for light backgrounds.
- `mark-negative` — isotype / compact mark for dark backgrounds.

**Do not confuse campaign / anniversary art with an isotype.** If the full logo includes an anniversary badge, co-brand, slogan, or seasonal asset, verify whether that element is part of the *current* mark before deriving compact variants. Past incident: Previred's full lockup contained an aniversario "25" badge that was incorrectly published as the isotype.

## Files Owned (you may edit)

- `public/images/logos/payment/*.svg`
- `public/images/logos/payment/*.png` (only as curated source raster inputs)
- `public/images/logos/payment/manifest.json`
- `scripts/config/payment-logo-sources.json`
- `scripts/payment-logo-vectorizer.py` (only when a brand-clean primitive is missing or VTracer params need tuning)
- `scripts/payment-logo-scraper.ts` (only for new flags / sources / signal patterns)
- `src/config/payment-instruments.ts` (only the `logo` / `compactLogo` fields of an entry)
- `package.json` `logos:payment:*` script entries
- `docs/operations/payment-logo-scraper.md`

## Files OFF-LIMITS (do not edit from this skill)

- `src/components/greenhouse/PaymentInstrumentChip.tsx` — visual rendering layer; chip layout belongs to UI tasks.
- `src/lib/finance/payment-instruments/**` — backend serialization, masking, readiness, category rules. Distinct concerns.
- `src/lib/finance/internal-account-number/**` — TASK-700 territory.
- Database migrations.
- Any other catalog / config file outside the list above.

If the work spans into off-limits territory, **stop and hand off** to a properly scoped task; do not absorb scope.

## Prerequisites

Required before invoking the workflow:

- Python 3.10+
- `python3 -m pip install --user vtracer Pillow`
- Node 20.18+ + pnpm
- `sharp` available in `node_modules` (declared in repo `package.json`)
- `gcloud` authenticated against `efeonce-group` if Gemini AI review is requested

If any prerequisite is missing, abort with a clear message and a one-line install hint. Do not silently fall back to a degraded workflow.

## Workflow

1. **Inspect the source visually** with `Read` on the image or render the candidate to PNG. Confirm transparency, dimensions, and brand identity match before doing anything destructive.
2. **Check raster integrity**:
   ```bash
   file public/images/logos/payment/source.png
   sips -g pixelWidth -g pixelHeight public/images/logos/payment/source.png
   ```
3. **Prefer official SVG**. If only PNG exists, vectorize with the repo tool:
   ```bash
   pnpm logos:payment:vectorize -- --input public/images/logos/payment/source.png \
     --output public/images/logos/payment/brand.svg \
     --variant full-positive --label Brand
   ```
4. **Brand-specific cleaning** only when deterministic and documented in `payment-logo-vectorizer.py`:
   ```bash
   pnpm logos:payment:vectorize -- --input public/images/logos/payment/source.png \
     --output public/images/logos/payment/global66.svg \
     --variant full-positive --label Global66 --brand-clean global66
   ```
5. **Register curated variants** in `scripts/config/payment-logo-sources.json` with `curatedSvgPath` + `curatedSourceUrl`.
6. **Run the matrix discovery + publish**:
   ```bash
   pnpm logos:payment:discover -- --provider <slug> --min-score 80 \
     --review-html artifacts/payment-logo-agent/<slug>.html
   pnpm logos:payment:publish -- --provider <slug> --min-score 80
   ```
7. **Render final SVGs to PNG and inspect**:
   ```bash
   node -e "const sharp=require('sharp'); sharp('public/images/logos/payment/<file>.svg').resize({width:1200}).png().toFile('/tmp/<file>.png')"
   ```
8. **AI review (optional, recommended)**: pass `--ai-review`. Gemini reviews the rendered PNG, not raw SVG XML.
9. **Run publish twice** to verify idempotency — second run must report `manifest: unchanged` and every SVG `unchanged`.

## Vectorization Quality Bar

A vectorized logo is **not acceptable** if any of:

- Edges are visibly jagged, bitten, wavy, or distorted.
- Letter counters or curves changed materially from the source.
- Isotype spacing or proportions differ from the source.
- Antialiasing became multiple noisy color layers.
- `viewBox` is missing.
- The SVG embeds raster `<image>` data.
- Colors drift from source without a documented reason.
- The negative version loses recognizable shape on dark backgrounds.

Fix poor vectorization by, in order:

1. Pre-cleaning the raster into a small palette before tracing.
2. Cropping by alpha bbox instead of manual coordinates.
3. Tuning VTracer parameters in `scripts/payment-logo-vectorizer.py`.
4. Using the official favicon/app icon for `mark-*` when the full logo lacks the isotype.
5. **Leaving the variant pending** if quality cannot be made faithful — never publish "good enough".

## Positive And Negative Rules

Positive variants preserve brand color for light backgrounds.

Negative variants are for dark backgrounds. Prefer (in order):

1. Official negative asset, if available in the brand kit.
2. Mechanically derived white version from a verified SVG.
3. Cleaned alpha-mask negative from approved raster only when the shape is simple AND visually verified.

**Do not make negative variants by inverting arbitrary colors.** Inversion can break brand semantics and legibility (e.g. it turns red into cyan, blue into orange). Always use single-color white over the brand mask, or the official negative if the brand provides one.

## Manifest Contract

Three artifacts must stay coherent:

- `public/images/logos/payment/manifest.json` (audit trail per published variant)
- `scripts/config/payment-logo-sources.json` (input declarations + curated paths)
- `src/config/payment-instruments.ts` (UI-facing `logo` / `compactLogo` references)

**Canonical rule**: only `full-positive` governs the entry-level `sourceUrl` and `licenseSource`. `mark-positive` updates `compactLogo` but must NOT overwrite the brand's canonical source metadata. The scraper enforces this; never bypass.

## Failure Modes

Explicit branching when something goes wrong — do **not** silently degrade:

| Condition | Action |
|---|---|
| AI review returns empty response | Continue with deterministic + visual checks. Note in report and review HTML. |
| AI review `qualityScore < 80` | Leave variant unpublished. Surface to user with the rendered PNG; require human override before publish. |
| VTracer produces visibly jagged or distorted output | Do NOT publish. Render PNG, escalate to user with a side-by-side of source vs vectorized. |
| Vector source returns wrong dimensions / aspect ratio | Abort. Save artifact under `artifacts/payment-logo-agent/<slug>-source-mismatch.json` and ask user. |
| Idempotency check (second publish run) shows changes | Bug: investigate manifest update logic before re-publishing. Do not paper over with `--force`. |
| Brand has no official SVG and no high-resolution raster | Mark variant pending, document the gap in `manifest.json` notes, do NOT vectorize a low-res raster. |
| Brand has anniversary / co-brand / campaign art in primary asset | Hold mark variants until the canonical isotype source is identified. Document the hold in the manifest entry. |

## Closure Gate (Hard, Not Optional)

Before reporting the task complete, you MUST:

1. Render `full-positive` and `mark-positive` to PNG with sharp at 1200px width.
2. Show the rendered PNGs to the user via the chat surface (image attach or path) for visual confirmation.
3. Confirm idempotency: running `pnpm logos:payment:publish -- --provider <slug>` twice reports `manifest: unchanged` and all SVGs `unchanged` on the second run.
4. Confirm `lint` is clean if `payment-logo-scraper.ts` was edited:
   ```bash
   npx eslint scripts/payment-logo-scraper.ts
   ```
5. Confirm Python compiles if `payment-logo-vectorizer.py` was edited:
   ```bash
   python3 -m py_compile scripts/payment-logo-vectorizer.py
   ```
6. Update `docs/operations/payment-logo-scraper.md` with any new flag / source / pattern introduced.
7. Record limitations honestly: if AI review failed, if a source is not strictly official, if a variant was left pending — say so in the chat reply.

**Skipping the visual confirmation step is forbidden.** A logo that passes deterministic checks but is visually broken (rotated, cropped, color-drifted) is the most common failure mode and only the human can catch it.

## Audit Trail

Every published change must leave a trace in three places:

- `public/images/logos/payment/manifest.json` — `lastVerifiedAt`, `sourceUrl`, `licenseSource` per variant.
- `artifacts/payment-logo-agent/<slug>-<run>.json` and `<slug>-<run>.html` — discover + publish run reports.
- The chat reply to the user — what changed, what was deterministic, what was visual, what AI review said.

## Cross-Reference

- Canonical scraper: `scripts/payment-logo-scraper.ts`
- Vectorizer: `scripts/payment-logo-vectorizer.py`
- Operational doc: `docs/operations/payment-logo-scraper.md`
- UI consumer: `src/components/greenhouse/PaymentInstrumentChip.tsx` (do not edit from this skill)
- UI config: `src/config/payment-instruments.ts` (only the `logo`/`compactLogo` fields)
