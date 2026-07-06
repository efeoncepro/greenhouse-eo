---
name: greenhouse-ai-image-generator
description: Expertly art-direct, prompt, generate, edit, validate, and apply AI-generated visual assets for Greenhouse, including transparent PNG icons, UI elements, empty states, banners, hero images, thumbnails, professional finishes, material/style control, and reference-guided image edits. Invoke when asked to create images with AI, improve image prompts, use OpenAI/GPT Image/Imagen/Nano Banana, create transparent assets, or produce polished visuals for Greenhouse UI.
user-invocable: true
argument-hint: "[asset brief, target surface, format, transparency, provider constraints]"
---

# Greenhouse AI Image Generator

Use this skill whenever Greenhouse needs AI-generated visual assets: icons, UI elements, empty states, banners, hero imagery, thumbnails, stickers, transparent PNGs, or image edits from references.

Act as both the image-generation operator and the art director. The job is not only to call a model; it is to produce a professional asset with deliberate composition, material, lighting, palette, hierarchy, technical fit, and QA.

Manual invocation in Claude Code: `/greenhouse-ai-image-generator [asset brief]`.

## First Reads

Read only what the task needs:

- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `DESIGN.md` when the asset will appear in UI
- `CLAUDE.md`, `project_context.md`, `Handoff.md` for repo coordination

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
pnpm ai:image --concept <loop> [--task TASK-###] --batch concepts.json   # design-loop concepts
```

- Wraps the canonical `generateOpenAIImage` (`src/lib/ai/openai-image.ts`). Self-contained: loads `.env.local`, resolves `OPENAI_API_KEY_SECRET_REF` server-side, never prints the secret.
- Defaults: `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated`. Timeout default **280s** (gpt-image-2 `high` exceeds the 125s of the runtime `generateImage` helper).
- `--background transparent` falls back to `gpt-image-1.5` (gpt-image-2 has no alpha). Still **raster** (PNG) — for real vectors use Higgsfield + Recraft V4.1.
- The CLI **operates** the model; THIS skill is the **art direction** (brief, composition, finish, palette, QA). Run the skill to write the prompt, then the CLI to generate, then critique + GVC if it lands in UI.
- **Concepts: use `--concept <loop>`** (optionally `--task TASK-###`) — it auto-routes to `.captures/concepts/<loop>/` (gitignored, **protected from the GVC garbage collector**), writes a traceable `manifest.json`, and surfaces in `pnpm fe:capture:index` grouped by loop. Don't hand-route concepts with `--out`/`--out-dir`, and never commit them.

## Reference edit + character consistency (`--image`)

Canonical path to make **consistent variants** of an existing character/asset (new pose, expression, scene) while preserving its identity, style, and logo — the model edits the reference, it does not re-imagine it.

```bash
pnpm ai:image --image <ref.png> --prompt "keep this exact <subject>, change ONLY <delta>" --out <out.png>
#   --image <path>        reference to edit (repeatable) → switches to editOpenAIImage (image-to-image)
#   --input-fidelity high strict reference preservation (only models ≠ gpt-image-2)
pnpm ai:image:rmbg <in.png> <out.png>   # cut a flat studio bg → transparent (preserves interior white)
```

- **Engine verdict (bake-off 2026-07-05):** for identity + logo fidelity on an edit, `gpt-image-2` (this CLI, our OpenAI key, zero third-party credits) wins. `nano_banana_pro` (Higgsfield) is a strong plan B (slightly better face/expression, costs credits). Do NOT use text-to-image or "character" models (e.g. Soul) for consistency — they treat the reference as inspiration and drift to a different subject + mangled logo.
- **Prompt = identity-lock scaffold + one small delta.** Fix everything (face, hair, outfit, the exact logo, framing, lighting) and change ONLY the requested pose/expression. Big deltas break consistency; small deltas hold it. Anchor every variant to the SAME canonical reference, not to a previous generation.
- **No engine keeps a logo pixel-exact** (~90% redraw). If the mark must be exact, mask its region and re-stamp the real vector (e.g. `public/branding/SVG/isotipo-efeonce-negativo.svg`) by composition. With `gpt-image-2` the logo is faithful enough that this is optional.
- **Background:** `gpt-image-2` returns opaque. `pnpm ai:image:rmbg` cuts it to transparent with **AI matting** (soft, professional hair edges) instead of color-key/flood-fill, which leaves "bitten" edges and white halos. Free/local matting; do not spend Higgsfield/Magnific credits on this. Engine = `@imgly/background-removal-node` (model `medium` default; `small` for speed — `large` is NOT bundled in v1.4.5). Its native deps (`onnxruntime-node` + a nested `sharp`) are approved via `pnpm.onlyBuiltDependencies` in `package.json`, so a plain `pnpm install` builds them; first run has a few-seconds model warm-up.
- **Human-review every variant against the anchor** for identity drift before keeping it.
- **Log durable generations in `ai-generations/`** (repo, not `.captures/`): one subfolder per run named `YYYY-MM-DD_<semantic>/` with `README.md` (verbatim prompts) + `manifest.json`, plus a row in `ai-generations/INDEX.md`. Worked example: `ai-generations/2026-07-05_nexa-fallback-characters/` — the 3D Nexa character (`public/images/illustrations/characters/greenhouse-*.png`) posed per fallback `kind`.

## Provider Choice

- Use `openai-image` for higher prompt fidelity, complex composition, reference-guided edits, UI assets, icon sets, and transparent PNG batches.
- Use `google-imagen` when matching existing Imagen-generated banners or when the current surface already uses that visual language.
- Use `generateAnimation()` for small SVG/CSS animations, not raster image generation.
- Use any native image generation tool only for exploratory artifacts or when the user asks for an image in chat rather than a repo asset.

## Fal.ai API (video + media aggregator, out-of-band)

Fal.ai is a programmatic media-generation aggregator — one API fronts many models: **video** (Seedance 2.0, Kling v3, PixVerse, Veo, Grok Imagine, Gemini Omni, Runway, Luma Ray, Hailuo, Wan…), **image** (flux, krea), **audio**, **3D**. Canonical client: `src/lib/ai/fal.ts` — `runFalModel({ model, input })` submits to the fal queue and polls to completion; model-agnostic (pass the fal slug, e.g. `bytedance/seedance-2.0/mini/image-to-video`). Secret resolves server-side via `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF` — never hardcode the `<id>:<secret>` key.

- **Out-of-band, NOT runtime** (same rule as Higgsfield): generate here + upload via the canonical uploader; never wire fal into a product runtime flow (runtime image path stays `src/lib/ai/image-generator.ts`).
- **Video is the headline** — for video art direction / model choice use `motion-design-studio`; audio → `audio-studio`; model/aesthetic pick → `design-studio`. THIS skill covers still-image asset craft.
- **Pricing is per-second, public on each model page** (verify at fal.ai/models first): e.g. Seedance 2.0 Standard ~$0.3024/s, Fast ~$0.2419/s, Mini 480p ~$0.0721/s. Audio included free.
- **State (2026-07-06): key persisted + plumbing verified, blocked by external balance.** Secret `greenhouse-fal-api-key` exists in GCP Secret Manager + `FAL_API_KEY_SECRET_REF` is in `.env.local`; secret resolution + auth verified end-to-end, but fal still returns `403 User is locked. Exhausted balance` (account top-up not yet reflected). Key temporary (rotation pending). Not wired to Vercel runtime. Full contract: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

## Workflow

1. Normalize the asset brief: target surface, audience, final size, format, alpha needs, style, constraints, and whether it is exploratory or repo-bound.
2. Build a short art-direction hypothesis: viewer takeaway, silhouette, visual hierarchy, finish, material, lighting, palette, and quality risks.
3. Load the shared guide for professional prompt recipes, finish playbooks, and quality gate.
4. Write a prompt with explicit asset intent, subject, composition, style, material, lighting, palette, background, constraints, and output target.
5. Generate through the canonical helper for repo-bound assets.
6. Critique the result like production design: small-size readability, crop, alpha edge, material believability, brand fit, and integration fit.
7. Refine with single-change follow-ups; restate invariants on every edit.
8. If placed in UI, verify the surface with Greenhouse Visual Capture.
9. Report paths, model/provider, transparency validation, visual QA, and limitations.

## Hard Constraints

- Never hardcode API keys or print secret values.
- Never generate official logos or brand marks from memory.
- Do not include visible text unless the user explicitly asks and accepts risk; image models can still struggle with precise text.
- Do not ship assets with watermarks, fake logos, accidental letters, cropped subjects, dirty alpha edges, or background residue.
- Keep generated drafts out of commits unless the user asked for an exploration set.

## Closure Bar

A generated asset is done only when it has a clear path, has been visually inspected, and its technical contract has been validated. For transparent PNGs, alpha verification is mandatory.
