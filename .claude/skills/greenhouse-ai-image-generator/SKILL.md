---
name: greenhouse-ai-image-generator
description: Expertly art-direct, prompt, generate, edit, validate, and apply AI-generated visual assets for Greenhouse, including transparent PNG icons, UI elements, empty states, banners, hero images, thumbnails, layout-design finishing, material/style control, reference-guided edits, and hybrid Seedream 5↔GPT Image 2→Gemini Omni campaign workflows across digital, motion, print and OOH. Use when a user asks to create images with AI, improve image prompts, use OpenAI/GPT Image/Imagen/Nano Banana/Seedream via fal.ai, create transparent assets, or produce and scale polished visuals for Greenhouse UI or campaign production.
---

# Greenhouse AI Image Generator

Use this skill whenever Greenhouse needs AI-generated visual assets: icons, UI elements, empty states, banners, hero imagery, thumbnails, stickers, transparent PNGs, or image edits from references.

Act as both the image-generation operator and the art director. The job is not only to call a model; it is to produce a professional asset with deliberate composition, material, lighting, palette, hierarchy, technical fit, and QA.

## First Reads

Read only what the task needs:

- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `references/seedream-5-gpt-image-2-hybrid-production.md` when the task uses Seedream 5,
  fal.ai still-image generation, multiple image models or campaign profusion
- `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md` when stills hand off to Gemini Omni,
  or the campaign includes motion, print/OOH or explicit branded/brand-light/neutral/client modes
- `../design-studio/modules/13_LAYOUT_DESIGN_AND_FINISHING.md` when static campaign pieces need controlled
  ratio layouts, generative finishing and deterministic copy/brand composition
- `DESIGN.md` when the asset will appear in UI
- `AGENTS.md`, `project_context.md`, `Handoff.md` for repo coordination

If the request is a real third-party logo or payment mark, stop and use `greenhouse-digital-brand-asset-designer` instead.

For art direction, Key Visual design or **audit**, marketing/campaign imagery, visual concept/mood, or choosing which AI model to use for a task (Nano Banana / Midjourney / Ideogram / Recraft / FLUX / Firefly / Seedance / Veo, etc.), the director is the `design-studio` skill — it directs and delegates production back here for assets that live in the Greenhouse UI.

## Core Rule

For assets that will live in Greenhouse, use the canonical helper when possible:

- `src/lib/ai/image-generator.ts`
- output path: `public/images/generated/`
- provider options: `google-imagen` or `openai-image`
- transparent PNG: `format: 'png'`, `background: 'transparent'`

Do not call image providers from parallel scripts if the helper covers the case.

## CLI: `pnpm ai:image` (gpt-image-2)

For terminal/operator-driven generation — `product-design-loop` concepts, mockup fixtures, icon/asset batches — use the canonical CLI instead of writing an ad-hoc `scripts/_gen-*.ts`:

```bash
pnpm ai:image --prompt "<text>" [--out <path>] [--size 1024x1024|1536x1024|1024x1536|2048x...] \
              [--quality low|medium|high|auto] [--background opaque|transparent] \
              [--model gpt-image-2] [--count N] [--timeout 280000] [--open]
pnpm ai:image --prompt-file <path>          # long prompts
pnpm ai:image --batch concepts.json         # [{ "filename": "a.png", "prompt": "…" }, …] — multiple
```

- Wraps the canonical `generateOpenAIImage` (`src/lib/ai/openai-image.ts`). Self-contained: loads `.env.local`, resolves `OPENAI_API_KEY_SECRET_REF` server-side, never prints the secret.
- Defaults: `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated`. Timeout default **280s** (gpt-image-2 `high` exceeds the 125s of the runtime `generateImage` helper).
- `--background transparent` falls back to `gpt-image-1.5` (gpt-image-2 has no alpha). Still **raster** (PNG) — for real vectors use Higgsfield + Recraft V4.1.
- The CLI **operates** the model; THIS skill is the **art direction** (brief, composition, finish, palette, QA). Run the skill to write the prompt, then the CLI to generate, then critique + GVC if it lands in UI.
- Keep exploratory concepts out of commits (gitignored dir, e.g. `.captures/concepts/`).

## Reference edit + character consistency (`--image`)

Canonical path to make **consistent variants** of an existing character/asset (new pose, expression, scene) while preserving its identity, style, and logo — the model edits the reference, it does not re-imagine it.

```bash
pnpm ai:image --image <ref.png> --prompt "keep this exact <subject>, change ONLY <delta>" --out <out.png>
#   --image <path>        reference to edit (repeatable) → switches to editOpenAIImage (image-to-image)
#   --input-fidelity high strict reference preservation (only models ≠ gpt-image-2)
pnpm ai:image:rmbg <in.png> <out.png>   # cut a flat studio bg → transparent (AI matting, soft edges)
```

- El cliente acepta hasta **10** `--image` por request y conserva su orden. Cada referencia debe declarar en el
  prompt su rol: estructura, paleta, identidad, activo oficial o anti-referencia.
- Una **anti-referencia** no tiene peso negativo nativo: es una instrucción semántica. Nombrar el rasgo excluido
  y revisar contaminación en la salida; si persiste, retirar la referencia o cambiar de método.
- Si se exigen cards, gráficos, ejes, microcopy, cifras o logos exactos, detener la generación y usar SVG o
  composición determinística. Una portada puede seguir siendo un problema vectorial.

- **Engine verdict (bake-off 2026-07-05):** for identity + logo fidelity on an edit, `gpt-image-2` (this CLI, our OpenAI key, zero third-party credits) wins. `nano_banana_pro` (Higgsfield) is a strong plan B (slightly better face/expression, costs credits). Do NOT use text-to-image or "character" models (e.g. Soul) for consistency — they treat the reference as inspiration and drift to a different subject + mangled logo.
- **Prompt = identity-lock scaffold + one small delta.** Fix everything (face, hair, outfit, the exact logo, framing, lighting) and change ONLY the requested pose/expression. Big deltas break consistency; small deltas hold it. Anchor every variant to the SAME canonical reference, not to a previous generation.
- **No engine keeps a logo pixel-exact** (~90% redraw). If the mark must be exact, mask its region and re-stamp the real vector (e.g. `public/branding/SVG/isotipo-efeonce-negativo.svg`) by composition. With `gpt-image-2` the logo is faithful enough that this is optional.
- **Background:** `gpt-image-2` returns opaque. `pnpm ai:image:rmbg` cuts it to transparent with **AI matting** (soft, professional hair edges) — a color-key/flood-fill leaves "bitten" edges + white halos in hair and must not be used for character assets. Free/local matting; do not spend Higgsfield/Magnific credits on this. Engine = `@imgly/background-removal-node` (model `medium` default; `small` for speed — `large` is NOT bundled in v1.4.5). Its native deps (`onnxruntime-node` + a nested `sharp`) are approved via `pnpm.onlyBuiltDependencies` in `package.json`, so a plain `pnpm install` builds them; first run has a few-seconds model warm-up.
- **Human-review every variant against the anchor** for identity drift before keeping it.
- **Log durable generations in `ai-generations/`** (repo, not `.captures/`): one subfolder per run named `YYYY-MM-DD_<semantic>/` with `README.md` (verbatim prompts) + `manifest.json`, plus a row in `ai-generations/INDEX.md`. Worked example: `ai-generations/2026-07-05_nexa-fallback-characters/` — the 3D Nexa character (`public/images/illustrations/characters/greenhouse-*.png`) posed per fallback `kind`.

## Provider Choice

- Use `openai-image` for higher prompt fidelity, complex composition, reference-guided edits, UI assets, icon sets, and transparent PNG batches.
- Use `google-imagen` when matching existing Imagen-generated banners or when the current surface already uses that visual language.
- Use Seedream 5 Lite out-of-band for inexpensive creative divergence and Seedream 5 Pro for
  material/color/atmosphere development or semantic regional edits; use `src/lib/ai/fal.ts`,
  never a parallel fal client or product runtime wiring.
- For campaign systems, do not choose one provider globally. Load
  `references/seedream-5-gpt-image-2-hybrid-production.md` and route each operation through an
  explicit anchor/handoff contract. If the system adds Gemini Omni motion or offline outputs, also load
  `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`; keep clean plates separate from the
  deterministic brand/channel layer.
- Campaign derivation uses a governed **star topology**: the approved `anchor_id`/`anchor_revision` is the
  center; ratios, motion plates, print proofs and OOH proofs are independent spokes. A local repair does not
  become the next anchor without explicit human promotion.
- For layout-designed static sets, the model receives only a clean ratio plate. Build the layout contract first,
  use Seedream Pro for material/light/atmosphere or GPT Image 2 for geometry/protected repair, then compose
  final copy, logo, CTA and legal deterministically. Never send the composed ad back through a model.
- Use `generateAnimation()` for small SVG/CSS animations, not raster image generation.
- Use the native chat image tool only for exploratory artifacts or when the user asks for an image in chat rather than a repo asset.

## Editorial cover assets

For an Efeonce editorial cover/featured/hero/OG, load
`docs/operations/public-site-content-factory/EDITORIAL_COVER_KEY_VISUAL_OPERATING_MODEL_V1.md` and follow the
direction from `design-studio`. Treat the cover as a thesis-bearing key visual, not topical decoration. If the
contract requires `gpt-image-2`, the generation evidence must expose that model; visual quality is not proof.
Iterate one variable at a time while restating locked geometry, editorial truth and cultural safety.

Interfaces must visualize the mechanism and remain clearly conceptual, not resemble a generic SaaS dashboard or
a fabricated product screenshot. A premium gradient creates depth and separation without wedges, triangles,
bands, halos or near-black defaults; Efeonce does not use black as a shortcut for punch. For robotic/human hands,
trace thumb, index, middle and little finger from base to tip at original resolution and after every crop: a pose
that reads as middle-finger or little-finger pointing is a blocker, regardless of aesthetics. Deliver and inspect
the master plus featured, OG and card crops independently; the crop can change anatomical and cultural meaning.

## Fal.ai API (video + media aggregator, out-of-band)

Fal.ai is a programmatic media-generation aggregator — one API fronts many models: **video** (Seedance 2.0, Kling v3, PixVerse, Veo, Grok Imagine, Gemini Omni, Runway, Luma Ray, Hailuo, Wan…), **image** (flux, krea), **audio**, **3D**. Canonical client: `src/lib/ai/fal.ts` — `runFalModel({ model, input })` submits to the fal queue and polls to completion; model-agnostic (pass the fal slug, e.g. `bytedance/seedance-2.0/mini/image-to-video`). Secret resolves server-side via `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF` — never hardcode the `<id>:<secret>` key.

- **Out-of-band, NOT runtime** (same rule as Higgsfield): generate here + upload via the canonical uploader; never wire fal into a product runtime flow (runtime image path stays `src/lib/ai/image-generator.ts`).
- **Video is the headline** — for video art direction / model choice use `motion-design-studio`; audio → `audio-studio`; model/aesthetic pick → `design-studio`. THIS skill covers still-image asset craft.
- **Pricing is per-second, public on each model page** (verify at fal.ai/models first): e.g. Seedance 2.0 Standard ~$0.3024/s, Fast ~$0.2419/s, Mini 480p ~$0.0721/s. Audio included free.
- **Full model & capability catalog** (13 categories, verified slugs): `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

### Seedream 5 still-image routing (verified 2026-07-18)

- Lite endpoints: `bytedance/seedream/v5/lite/text-to-image` and
  `bytedance/seedream/v5/lite/edit`; use for parallel divergence before an anchor exists.
- Pro endpoints: `bytedance/seedream/v5/pro/text-to-image` and
  `bytedance/seedream/v5/pro/edit`; use for expressive development, multireference material
  fusion and semantic regional art direction.
- Both edit endpoints accept ordered `image_urls`; assign every reference a role and conflict
  precedence. Pro's marketed region/layer comprehension still returns a flat raster and exposes
  no public mask/layer output contract.
- Large data URIs proved unreliable in the real bridge. For local files, prefer a temporary
  `fal-cdn-v3` upload with short lifecycle and do not persist its input URL. A private GCS object
  with short-lived signed URL is only an alternative when `signBlob` is already authorized;
  never widen IAM or publish a bucket for convenience.
- For the full capability contract, prices, dimensions, GPT limits, measured benchmark and
  hybrid handoff schema, load `references/seedream-5-gpt-image-2-hybrid-production.md`.
- **State (2026-07-06): OPERATIONAL — key persisted + real generation verified end-to-end.** Secret `greenhouse-fal-api-key` in GCP Secret Manager + `FAL_API_KEY_SECRET_REF` in `.env.local`; `runFalModel('fal-ai/flux/schnell')` returns `ok:true` HTTP 200 with a real image (`secretSource=secret_manager`). Key temporary (rotation pending). Not wired to Vercel runtime. **Queue-URL gotcha:** for sub-path models fal returns `status_url`/`response_url` on the PARENT app — never reconstruct polling URLs from the slug (→ 405). Full contract: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

## Workflow

1. Normalize the asset brief: target surface, audience, final size, format, alpha needs, style, constraints, and whether it is exploratory or repo-bound.
2. Build a short art-direction hypothesis: viewer takeaway, silhouette, visual hierarchy, finish, material, lighting, palette, and quality risks.
3. If a visual reference is a webpage, inspect its original SVG/Lottie/CSS/raster source before choosing the
   engine; load `../design-studio/modules/11_PRODUCT_STORY_SCENES.md` for product/editorial scenes.
4. Load the shared guide for professional prompt recipes, finish playbooks, and quality gate.
5. Write a prompt with explicit asset intent, subject, composition, style, material, lighting, palette, background, constraints, and output target.
6. Generate through the canonical helper for repo-bound assets.
7. Critique the result like production design: small-size readability, crop, alpha edge, material believability, brand fit, and integration fit.
8. Refine with single-change follow-ups; restate invariants on every edit. In multi-model flows,
   carry `anchor_id`, parent asset, reference roles, precedence, locks, one delta, safe zones and
   acceptance criteria at every handoff; derive every ratio from the approved anchor using star topology,
   not from the previous ratio or latest available output.
9. If placed in UI, verify the surface with Greenhouse Visual Capture.
10. Report paths, model/provider, transparency validation, visual QA, and limitations.

## Hard Constraints

- Never hardcode API keys or print secret values.
- When the user or contract requires an exact model, use a path that returns the model identity. For
  `gpt-image-2`, prefer `pnpm ai:image --model gpt-image-2 ...` and retain the CLI result with model, quality and
  size. The built-in chat generator may be used for exploration, but its model must remain `unknown` when the
  runtime does not expose `model_id`; never infer it from visual quality.
- Never generate official logos or brand marks from memory.
- Do not include visible text unless the user explicitly asks and accepts risk; image models can still struggle with precise text.
- Treat model-rendered campaign text as concept-only. Final copy, logo, CTA, price, legal and
  localization require deterministic composition unless an explicit exception accepts raster risk.
- Seedream Pro «region/layer editing» is semantic art direction over one flattened raster, not editable
  layers or pixel-perfect locality. Use GPT + alpha mask when protected-region drift has operational cost.
- If a still becomes motion, hand the approved clean plate to `motion-design-studio`. Build the 15/10/6
  family in deterministic post; use Seedance 2.0 only for a genuinely new shot/action/continuity need,
  never to repair timing, crop, copy/logo, grade, foley or other editing defects.
- Do not ship assets with watermarks, fake logos, accidental letters, cropped subjects, dirty alpha edges, or background residue.
- For hands or culturally meaningful gestures, validate topology rather than silhouette: identify palm/dorso,
  locate the thumb/radial side, trace every digit from base to tip and inspect offensive/alternative readings at
  original resolution and thumbnail. A mirrored crop invalidates the previous approval. If text-only prompting
  remains ambiguous, supply a cropped anatomy reference with an explicit `ANATOMY` role and reject the result if
  it does not preserve that topology.
- In multi-reference edits, assign each image one explicit role (`STRUCTURE`, `IMPACT`, `ANATOMY`, `MATERIAL`,
  `IDENTITY` or `ANTI-REFERENCE`) and state which role wins conflicts. Do not ask the model to generically
  “combine” references.
- Keep generated drafts out of commits unless the user asked for an exploration set.

## Closure Bar

A generated asset is done only when it has a clear path, has been visually inspected, and its technical contract has been validated. For transparent PNGs, alpha verification is mandatory. For hybrid outputs, provenance must include the parent asset, `anchor_id`/revision/topology, exact model/endpoint, ordered references, mask, stage/delta, channel/brand modes, latency and request ID/tokens when available. Print/OOH remain `proof-only` until vendor specs/ICC are known; motion remains incomplete until its duration-specific post/audio gates pass.
