# QA Release Audit — Layout Design & Finishing Pilot

## Verdict

**PASS**

Closure state: **complete for the digital-static creative pilot**. Media activation, print/OOH mastering and client/legal approval remain outside scope.

## Scope

- Changed files reviewed: pilot brief/config, Seedream finishing prompts, three production scripts, manifests, deterministic overlays, three digital masters, delivery package and campaign index/README.
- Runtime or environment reviewed: local GCP/ADC access, Secret Manager visibility for `greenhouse-fal-api-key`, canonical `runFalModel` consumer and three real Seedream Pro requests.
- Out of scope: Vercel runtime, product UI, production deployment, media trafficking, print ICC/vendor proof, Gemini/Seedance motion and changes to the existing V3 release ZIP.

## Risk Classification

| Risk | Level | Why |
| --- | ---: | --- |
| Local production tooling | Low–Medium | New reversible campaign-local scripts; no product runtime path changed |
| External integration | High | Three paid Fal/Seedream calls depend on provider access and response contract |
| Secret/env reference | High | Local `FAL_API_KEY_SECRET_REF` was missing; corrected without exposing or rotating the secret |
| Creative release | Medium | Visible campaign output requires original-size and thumbnail review |
| Documentation | Medium | A reusable workflow needs prompts, lineage, QA and reproduction commands |

## Injected Skills

- `design-studio`: art direction, layout grammar and KV rubric.
- `greenhouse-ai-image-generator`: canonical Seedream/GPT routing, provenance and still-image QA.
- `imagegen`: raster edit and project-bound asset rules.
- `greenhouse-secret-hygiene`: provider secret reference and consumer verification.
- `software-architect-2026`: confirmed this is a reversible campaign-local workflow; no new shared ADR is required.
- `greenhouse-documentation-governor`: documentation ownership and closure.
- `greenhouse-qa-release-auditor`: risk-based final verdict.

The generic QA router also suggested Teams, HubSpot and Vercel skills from the broad `integration` flag. They were intentionally not loaded because no Teams, HubSpot or Vercel file/runtime/configuration was touched.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Real provider execution | PASS | Three `bytedance/seedream/v5/pro/edit` requests completed and are recorded in `manifests/12-layout-design-finish.json` |
| Visual review | PASS | Original-size three-format review plus `review/layout-design-pilot-contact-sheet.jpg` |
| Anatomy/identity | PASS | One complete bird in every output; no clone, extra wing, text or watermark observed |
| Deterministic copy/brand | PASS | Poppins outlines + `public/branding/logo-negative.svg`; exact copy asserted from generated SVG metadata |
| Dimensions/color/weight | PASS | `scripts/13-qa-layout-design-pilot.mjs`: 3/3, correct JPEG/sRGB dimensions and all below 5 MB |
| Contrast | PASS | White P95 17.15–18.30; mint P95 12.84–13.69 |
| Bounded finishing delta | PASS | Normalized MAE 0.0209–0.0308 versus approved source plates |
| Package integrity | PASS | `unzip -t`; SHA-256 `6efa884d9b10a2d442bbc5a786a00948a41cbffeaafb507ffc35a797a31ab912` |
| Repo QA router | PASS | `pnpm qa:gates --changed --agent codex --integration --security --docs` |
| Documentation closure | PASS | `pnpm docs:closure-check`, zero warnings |
| Canonización del método | PASS | Owner operativo, documentación funcional, manual y skills Codex/Claude sincronizados el 2026-07-19 |
| Skill resources | PASS con excepción conocida | Espejos Codex/Claude byte-equivalentes; YAML y Prettier pasan. `quick_validate.py` pasa en ambas skills de imagen y rechaza en ambos `design-studio` sólo los campos preexistentes `user-invocable`/`argument-hint` |
| Operations lint | PASS | `pnpm ops:lint --changed`, zero errors/warnings |
| Diff hygiene | PASS | `git diff --check` |

## Blockers

None for the stated digital-static creative pilot.

## Conditional Follow-Ups

1. Creative director and campaign owner approve final copy/objective before paid media activation.
2. If extended to print or OOH, perform manual 100% retouch plus vendor dimensions, bleed and ICC proofing.
3. Do not treat the Seedream pass as mandatory when the clean plate already passes craft; stop when the delta is not visible or does not improve the scorecard.

## False-Closure Traps Checked

- tests green but runtime missing: real Fal consumer executed successfully; no product runtime claim is made.
- UI screenshot/capture absent: not a product UI change; original-size images and campaign contact sheet are the applicable visual evidence.
- env/flag/redeploy/backfill pending: local secret reference is present and ignored by Git; no deploy or Vercel env is required for this out-of-band pilot.
- docs/task lifecycle drift: owner operativo, documentación funcional, manual, campaign README/index, brief,
  prompts, manifests, delivery docs, QA, changelog, context y handoff están sincronizados; no se abrió TASK.
- Sentry/observability not verified: not applicable to an out-of-band local production run; request IDs and latency remain in the manifest.

## Final Call

The pilot can be called complete because the three requested ratios were generated, composed, inspected, packaged and documented through the same reproducible contract. The claim is deliberately limited to creative production; it does not imply media activation or print readiness.
