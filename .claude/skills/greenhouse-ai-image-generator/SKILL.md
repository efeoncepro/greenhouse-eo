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

## Core Rule

For assets that will live in Greenhouse, use the canonical helper when possible:

- `src/lib/ai/image-generator.ts`
- output path: `public/images/generated/`
- provider options: `google-imagen` or `openai-image`
- transparent PNG: `format: 'png'`, `background: 'transparent'`

Do not call image providers from parallel scripts if the helper covers the case.

## Provider Choice

- Use `openai-image` for higher prompt fidelity, complex composition, reference-guided edits, UI assets, icon sets, and transparent PNG batches.
- Use `google-imagen` when matching existing Imagen-generated banners or when the current surface already uses that visual language.
- Use `generateAnimation()` for small SVG/CSS animations, not raster image generation.
- Use any native image generation tool only for exploratory artifacts or when the user asks for an image in chat rather than a repo asset.

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
