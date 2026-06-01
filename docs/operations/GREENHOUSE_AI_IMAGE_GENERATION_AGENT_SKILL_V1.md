# Greenhouse AI Image Generation Agent Skill V1

> **Tipo:** operating guide para agentes
> **Estado:** Accepted
> **Creado:** 2026-06-01
> **Fuentes externas verificadas:** OpenAI developer docs, 2026-06-01

## Purpose

Esta guia convierte la investigacion de generacion de imagenes con IA en un workflow operativo para Codex y Claude. Cubre iconos, elementos de UI, empty states, ilustraciones, fondos, thumbnails, assets con PNG transparente y edicion con imagenes de referencia.

La regla principal: en Greenhouse, los assets que van al repo deben pasar por el helper canonico `src/lib/ai/image-generator.ts` siempre que cubra el caso. Los tools nativos del chat sirven para exploracion o entrega conversacional, pero no reemplazan la ruta versionable del repo.

## Source-Checked Facts

Fuentes oficiales consultadas:

- OpenAI Image Generation guide: `https://developers.openai.com/api/docs/guides/image-generation`
- OpenAI image generation tool guide: `https://developers.openai.com/api/docs/guides/tools-image-generation`
- OpenAI Images API reference: `https://developers.openai.com/api/reference/resources/images`
- OpenAI API overview/auth: `https://developers.openai.com/api/reference/overview`
- OpenAI Cookbook GPT Image prompting guide: `https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide`

Facts operativos vigentes al 2026-06-01:

- OpenAI expone dos carriles para imagenes: Image API para una generacion/edicion directa, y Responses API con `image_generation` para flujos conversacionales o multi-step.
- Image API es la opcion preferida para un asset puntual desde un prompt o una edicion acotada.
- Responses API es la opcion preferida para iterar sobre una imagen, usar contexto conversacional, o forzar `action: "generate" | "edit" | "auto"`.
- `gpt-image-2` es el modelo OpenAI mas reciente documentado para generacion/edicion, con tamanos flexibles y buen seguimiento de instrucciones.
- `gpt-image-2` no soporta `background: "transparent"`. Para PNG/WebP transparente, usar el fallback del helper a `gpt-image-1.5` o fallar cerrado si el modelo exacto importa.
- Transparencia solo es compatible con formatos que soportan alpha, principalmente `png` y `webp`.
- OpenAI recomienda calidad `medium` o `high` para transparencia; `low` es util para drafts rapidos.
- GPT Image puede tardar hasta unos minutos con prompts complejos. No marcar fallo prematuro si el helper tiene timeout largo y progreso claro.
- La generacion puede fallar por filtros de seguridad/moderacion. Reescribir el prompt hacia el resultado visual permitido, no intentar bypassear.
- Las imagenes de entrada cuentan como tokens/costo. En `gpt-image-2`, las referencias se procesan en alta fidelidad automaticamente, asi que editar con muchas referencias puede costar mas.
- Para edicion con mascara, la mascara guia al modelo pero no garantiza una geometria exacta pixel-perfect.
- Las keys de API son secreto de servidor. Nunca escribir `sk-*` en codigo, docs, logs, tests, prompts commiteados ni env examples con valor real.

## Greenhouse Decision Matrix

| Necesidad | Carril canonico | Opciones |
|---|---|---|
| Icono raster, sticker, elemento UI aislado | `generateImage()` con `provider: "openai-image"` | `format: "png"`, `background: "transparent"`, `quality: "high"`, `aspectRatio: "1:1"` |
| Lote de PNG transparentes | `generateImage()` o `generateOpenAIImage()` en script server-only | Usar nombres deterministas, validar alpha, controlar costo con lotes chicos |
| Banner, hero, thumbnail, empty state ilustrado | `generateImage()` | OpenAI para fidelidad/composicion, Imagen para continuidad con assets existentes |
| Edicion de imagen existente | `editOpenAIImage()` | Referencias/mask server-only, maximo del helper vigente |
| Iteracion multi-turn sobre una imagen | `runOpenAIImageTool()` | Mantener `responseId` o `imageGenerationCallId`; ideal para refinar direccion visual |
| Concept art no versionable en chat | Tool nativo de imagen del entorno, si existe | Usarlo solo como exploracion; pasar el asset final por repo si se va a servir |
| Logo real de marca externa | No generar desde IA | Usar `greenhouse-digital-brand-asset-designer` y fuente oficial |
| SVG animado simple | `generateAnimation()` | Gemini via helper, no JavaScript, reduced-motion |

## Prompt Anatomy

Un prompt robusto debe incluir estos bloques, en este orden:

1. **Asset intent:** icono, empty state, UI element, hero image, thumbnail, background, sticker, illustration.
2. **Subject:** objeto principal y entidades secundarias.
3. **Use context:** donde se usara en Greenhouse, tamano final, densidad, si debe funcionar en dark/light mode.
4. **Composition:** centrado, margen/padding, vista frontal/isometrica/top-down, recorte, espacio negativo.
5. **Style system:** material, render style, nivel de realismo, textura, iluminacion, sombras.
6. **Palette:** Greenhouse/Vuexy compatible, evitar paletas one-note si sera UI visible.
7. **Background/alpha:** transparente, solido, ambiente, sin fondo, sin suelo.
8. **Hard constraints:** sin texto, sin letras, sin logos, sin watermark, sin marco, sin crop, sin manos/personas si no hacen falta.
9. **Output target:** `PNG transparent 1:1`, `16:9 webp`, etc.

Template:

```text
Draw a [asset intent] for [Greenhouse surface/use].
Subject: [main object], [secondary details].
Composition: [centered/isometric/frontal], [padding], [negative space], [no crop].
Style: [material/render], [lighting], [texture], [level of detail].
Palette: [tokens or color family], compatible with light and dark UI.
Background: transparent / opaque / simple studio / full-bleed scene.
Constraints: no text, no letters, no logos, no watermark, no border, no UI chrome.
Output: [png/webp/jpeg], [aspect ratio or size], [transparent if needed].
```

## Professional Art Direction

La skill debe comportarse como directora de arte de produccion, no solo como wrapper de prompts. Antes de generar, construir una hipotesis visual breve.

### Creative Brief Fields

Capturar o inferir:

- **Asset role:** decorativo, instructional, state feedback, navigation affordance, hero, product reveal, marketing illustration, icon.
- **Viewer task:** que debe entender el usuario en menos de 2 segundos.
- **Surface constraints:** tamano final, fondo, dark/light mode, crop container y responsive behavior.
- **Visual hierarchy:** silueta primaria, detalle secundario y acento.
- **Brand fit:** Greenhouse enterprise tone: moderno, calmo, preciso, operacional; no infantil salvo pedido explicito.
- **Production finish:** vector-like crisp, clay 3D, photoreal product, editorial photo, soft 3D, isometric, technical diagram, premium card.
- **Quality risk:** texto, detalles minusculos, layout exacto, consistencia de marca, personaje repetido, halo de transparencia, contraste dark-mode.

### Prompt Levers For Premium Finish

Usar lenguaje visual concreto en vez de frases genericas como "make it high quality":

- **Material:** soft clay, frosted glass, brushed aluminum, translucent acrylic, matte ceramic, warm paper, satin plastic, polished enamel.
- **Lighting:** softbox lighting, diffuse studio light, rim light, ambient occlusion, gentle contact shadow, no harsh cast shadows.
- **Camera/render:** orthographic isometric, 3/4 view, front-facing, macro product photo, 50mm natural perspective, shallow depth of field.
- **Edges:** crisp silhouette, rounded bevels, smooth chamfered edges, clean contour, no jagged edges.
- **Surface detail:** subtle grain, realistic micro-texture, delicate bevel highlights, controlled reflections.
- **Composition:** centered with padding, generous negative space, symmetrical balance, safe text area, object fully visible, no crop.
- **Color:** restrained palette, one accent, token-compatible neutrals, no color noise, balanced warm/cool contrast.
- **Finish:** production-ready, app-store-quality icon, premium SaaS illustration, editorial product photography, clean vector-like render.

Evitar:

- depender de "8K", "ultra detailed", "masterpiece", "award-winning" o cadenas largas de adjetivos;
- mezclar estilos incompatibles como "flat vector photorealistic clay watercolor" sin explicar la fusion;
- pedir layouts de UI complejos como raster si el resultado debe ser UI productiva; UI real vive en codigo/Figma.

### Professional Prompt Formula

Usar esta formula para assets importantes:

```text
Create [asset role] for [surface/use].

Viewer takeaway:
[One sentence: what the viewer should understand immediately.]

Subject and hierarchy:
- Primary: [main object, silhouette, action]
- Secondary: [limited supporting detail]
- Exclude: [anything that would distract]

Composition:
[camera/viewpoint], [padding/crop], [safe area], [negative space], [orientation].

Visual finish:
[style], [material], [lighting], [edge quality], [texture], [shadow/reflection].

Brand and palette:
[Greenhouse/Vuexy-compatible palette], [semantic accent only if meaningful], [dark/light compatibility].

Output contract:
[format], [aspect/size], [transparent/opaque], [quality target].

Hard constraints:
No text, no letters, no logos, no watermark, no frame, no background residue, no extra objects, no cropped subject.
```

### Iteration Protocol

No regenerar a ciegas. Iterar como direccion de arte:

1. **Base generation:** prompt limpio, 1-4 variantes si la exploracion aporta.
2. **Critique:** evaluar silueta, crop, material, luz, brand fit, alpha y lectura a tamano final.
3. **Single-change refinement:** cambiar una variable por iteracion: luz, crop, textura, color o densidad de detalle.
4. **Invariant restatement:** en edits, repetir lo que no debe cambiar: geometria, identidad, layout, proporciones, colores.
5. **Finalization:** elegir el asset mas fuerte, validar alpha/dimensiones y descartar rejects.

Buenos follow-ups:

- "Keep the exact silhouette and composition. Make only the material more matte and clay-like."
- "Preserve object geometry and colors. Remove the background residue and improve the transparent alpha edge."
- "Keep the current style. Increase padding so the full object remains readable at 32px."
- "Do not redesign the icon. Simplify secondary details so it reads clearly at small UI sizes."

Malos follow-ups:

- "Make it better."
- "More professional."
- "Try again but nicer."
- "Make everything more detailed."

## Finish Playbooks

### Clay 3D UI Icon

Use for friendly feature icons, stickers, operational badges.

Prompt cues:

- soft clay 3D, rounded forms, tactile matte material;
- simple silhouette readable at 32-64px;
- 3/4 isometric or front-facing, centered;
- subtle ambient occlusion and internal shadows;
- transparent background, no square tile, no pedestal unless requested.

Reject if: plastic toy look, muddy detail, over-shiny surface, fake floor, cropped edges, tiny unreadable props.

### Premium SaaS Illustration

Use for empty states, onboarding panels, operational explainers.

Prompt cues:

- quiet enterprise illustration, polished 3D/vector hybrid;
- limited object cluster, clear metaphor, restrained detail;
- token-compatible palette, one semantic accent;
- transparent or light neutral background;
- no fake UI text, no decorative clutter.

Reject if: generic stock art, one-hue blob palette, illegible mini charts, cartoonish mascots, marketing hero overkill.

### Photoreal Product Or Scene

Use for realistic hero imagery, object previews, scenario visuals.

Prompt cues:

- describe as a real capture: lens feel, camera height, light source, surface material;
- natural imperfections, real texture, believable scale;
- avoid cinematic overgrading unless requested;
- preserve inspectability of the subject.

Reject if: dark blurred stock look, impossible geometry, glossy AI sheen, fake text, warped details.

### Technical Diagram Or Infographic

Prefer real SVG/React/Figma for production diagrams. Use image generation only for conceptual drafts or static illustrative explainers.

Prompt cues:

- simple labeled structure only if text is essential;
- high quality, clear hierarchy, large readable labels;
- exact copy quoted verbatim;
- ask for no extra words.

Reject if: wrong labels, fake numbers, crowded panels, inconsistent arrows, low contrast.

### Transparent Product Cutout

Use `editOpenAIImage()` with reference input when extracting or polishing an existing object.

Prompt cues:

- preserve geometry, label, proportions and color exactly;
- transparent RGBA PNG;
- crisp silhouette, no halos/fringing;
- optional soft contact shadow inside alpha only;
- do not restyle, redraw or invent missing details.

Reject if: altered product label, alpha halo, clipped edges, over-smoothed texture, shadow outside intended bounds.

## Professional QA Rubric

Score each final candidate from 1-5:

- **Purpose clarity:** the asset communicates the intended idea immediately.
- **Silhouette:** recognizable at final UI size and not dependent on tiny details.
- **Craft:** edges, lighting, texture, shadows and material feel intentional.
- **Brand fit:** modern enterprise Greenhouse tone, neither childish nor generic.
- **Technical fit:** right dimensions, format, alpha, file size and safe crop.
- **Integration fit:** works on target background and does not fight surrounding UI.

Do not ship any asset below 4/5 on purpose clarity, silhouette or technical fit.

## Asset Recipes

### Transparent Icon

Use for app icons, feature icons, badges, stickers and cards.

Recommended options:

- Provider: `openai-image`
- Format: `png`
- Background: `transparent`
- Quality: `high`
- Aspect ratio: `1:1`
- Filename: deterministic slug

Prompt pattern:

```text
Draw a compact 3D clay icon for Greenhouse.
Subject: a small greenhouse with glass panels, rounded roof, tiny leaves inside.
Composition: centered, 12 percent padding, full object visible, no crop.
Style: soft clay 3D, smooth rounded edges, subtle studio lighting, soft contact shadow only if it remains inside the object alpha.
Palette: fresh green, clear glass tint, warm white highlights, compatible with Greenhouse UI.
Background: transparent.
Constraints: no text, no letters, no logo, no watermark, no square tile, no border.
Output: transparent PNG, 1:1.
```

### UI Empty State Illustration

Use for operational states: no results, healthy state, pending sync, degraded pipeline.

Prompt pattern:

```text
Draw a refined UI empty-state illustration for a Greenhouse enterprise dashboard.
Subject: [domain metaphor] with [simple operational detail].
Composition: horizontal 4:3, centered object cluster, generous whitespace, no screen mockup.
Style: polished vector-like 3D illustration, quiet enterprise tone, crisp edges.
Palette: Greenhouse primary accents with restrained neutrals and one semantic color.
Background: transparent or very light neutral.
Constraints: no readable text, no fake charts with numbers, no logos.
Output: PNG, 4:3.
```

### Hero Or Banner

Use only when a surface needs a real image. For product/venue/object pages, the asset must reveal the actual subject.

Prompt pattern:

```text
Create a wide 16:9 hero image for [surface].
Subject: [actual product/state/place/object], visible and inspectable.
Composition: full-bleed, [where safe text area is], no dark blur, no stock-photo cliches.
Style: [photoreal/editorial/3D] with clean production lighting.
Palette: balanced, not dominated by one hue family.
Constraints: no text, no logos, no UI overlays, no watermark.
Output: PNG or WebP, 16:9.
```

### Reference-Guided Edit

Use `editOpenAIImage()` when preserving an object, product, face, brand shape, or existing composition matters.

Prompt pattern:

```text
Edit the provided image. Preserve [object/person/product] identity, proportions, silhouette and key colors.
Change only [specific region or attribute].
Do not alter [protected details].
Output should be [format/background/size].
```

If using a mask, describe the masked region semantically. Do not assume pixel-perfect compliance; inspect the result.

## Repo Execution Patterns

### Generate via Greenhouse helper

Use this pattern from the repo root for one-off asset generation:

```bash
GCP_PROJECT=efeonce-group GOOGLE_CLOUD_PROJECT=efeonce-group \
GREENHOUSE_IMAGE_PROVIDER=openai-image \
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs -e "
import { generateImage } from './src/lib/ai/image-generator'

const result = await generateImage('Draw a compact 3D clay icon...', {
  provider: 'openai-image',
  format: 'png',
  background: 'transparent',
  quality: 'high',
  aspectRatio: '1:1',
  filename: 'greenhouse-clay-icon-transparent'
})
console.log(result)
"
```

For reference/mask workflows, import from `./src/lib/ai/openai-image`.

### Use native image tool

Use the native chat image generation tool only when:

- the user asks for an image artifact in chat;
- the output is exploratory and not meant to be committed;
- the repo helper is not available in the current environment.

If the image becomes a product asset, save it into the repo through the canonical output path, validate it, and document provenance in the final response.

## Quality Gate

Before calling an asset done:

1. Inspect it visually with `view_image` or an equivalent render.
2. Confirm format and dimensions:
   ```bash
   file public/images/generated/<asset>.png
   sips -g pixelWidth -g pixelHeight public/images/generated/<asset>.png
   ```
3. For transparent assets, verify alpha exists and the corners are transparent. A quick Node check can parse PNG alpha or use `sharp` if available.
4. Confirm it works over light and dark backgrounds when used in UI.
5. Check crop and padding at intended render size, not only at full resolution.
6. Reject assets with fake text, accidental logos, watermarks, cut-off subjects, muddy edges, inconsistent lighting, or background residue.
7. For UI-visible changes, use Greenhouse Visual Capture (`pnpm fe:capture` or `pnpm fe:capture:review`) when the asset is placed in an actual surface.
8. Do not commit draft generations unless the user explicitly wants an exploration set.

## Safety And Governance

- Do not generate official third-party logos, payment marks, legal signatures, IDs, documents, or brand marks from memory.
- Do not imitate a living artist by name. Describe visual traits instead.
- Do not include real people, clients, employee likenesses, or sensitive work data in prompts unless the task has explicit authorization and a safe data path.
- Do not paste secrets into prompts or generated asset metadata.
- Do not use generated images as source of truth for legal, finance, payroll, identity, medical, or compliance content.
- If generation is blocked by safety filters, reframe the request to a safe visual alternative and report the limitation.

## Closure Report

When reporting back, include:

- asset path(s);
- provider/model and fallback reason if present;
- whether transparency was verified;
- visual QA performed;
- any limitations or human review needed.
