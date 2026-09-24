# Greenhouse AI Image Generation Agent Skill V1

> **Tipo:** operating guide para agentes
> **Estado:** Accepted
> **Creado:** 2026-06-01
> **Ultima actualizacion:** 2026-09-16 por Claude (brechas de `pnpm ai:image` y `pnpm ai:fal` corregidas en el commit `17196ead1`: estimación de costo previa, `--yes`/`--max-usd` en `ai:fal`, resolución barata por defecto, `--format` en `ai:image`, validaciones locales; antes: puntero a la guía canónica de selección de modelos; correcciones: el costo de GPT Image 2.5 sí se estima antes, 2.5 publica rate limits, OpenAI recomienda 2.5 para integraciones nuevas, precios de fal por escalón de resolución, Wan 3.0 Prime más cara, fórmula de tokens de Seedance válida, Seedream 5 Pro tope 2048², brechas conocidas de ambos CLIs; antes, `pnpm ai:fal` con dos cuentas y failover por saldo, `--balance`, `--detach`/`--status`, registro 47 de 55 verificado, costo real y filtro de contenido de Seedance; antes, Wan 3.0 en `pnpm ai:fal`, estado real de Nano Banana Pro y Kling 3 / Grok Imagine revisados sin conectar; antes, Flux 3 en `pnpm ai:fal` —video, no imagen— y contrato real de Seedance video a video; antes, Minimax H3 en `pnpm ai:fal`, retome por `--request-id`, brecha de `--task` cerrada; antes, CLI `pnpm ai:fal`: Seedream 5 + layerize y Seedance 2.5/2.0; antes, TASK-1851 — el helper transporta 2.5; `google-imagen` renombrado a `google-gemini-image`; línea base de consumo medida)
> **Fuentes externas verificadas:** OpenAI developer docs 2026-08-21 y fichas oficiales Fal.ai 2026-07-18

## Purpose

> **➡️ Qué modelo elegir, cuándo y cómo:** la guía canónica es
> [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
> (todos los modelos de `pnpm ai:image` y `pnpm ai:fal`). Esta guía operativa cubre cómo ejecutar, dirigir y validar;
> si la matriz de decisión de abajo contradice la guía canónica, prevalece la guía.

Esta guia convierte la investigacion de generacion de imagenes con IA en un workflow operativo para Codex y Claude. Cubre iconos, elementos de UI, empty states, ilustraciones, fondos, thumbnails, assets con PNG transparente y edicion con imagenes de referencia.

La regla principal: en Greenhouse, los assets que van al repo deben pasar por el helper canonico `src/lib/ai/image-generator.ts` siempre que cubra el caso. Los tools nativos del chat sirven para exploracion o entrega conversacional, pero no reemplazan la ruta versionable del repo.

## Source-Checked Facts

Fuentes oficiales consultadas:

- OpenAI Image Generation guide: `https://developers.openai.com/api/docs/guides/image-generation`
- OpenAI image generation tool guide: `https://developers.openai.com/api/docs/guides/tools-image-generation`
- OpenAI Images API reference: `https://developers.openai.com/api/reference/resources/images`
- OpenAI API overview/auth: `https://developers.openai.com/api/reference/overview`
- OpenAI Cookbook GPT Image prompting guide: `https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide`
- Matriz canónica de la familia: `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`
- Fal Seedream 5.0 Lite: `https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image`
- Fal Seedream 5.0 Lite Edit: `https://fal.ai/models/bytedance/seedream/v5/lite/edit`
- Fal Seedream 5.0 Pro: `https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image`
- Fal Seedream 5.0 Pro Edit: `https://fal.ai/models/bytedance/seedream/v5/pro/edit`
- Fal Seedream 5.0 Pro Layerize: `https://fal.ai/models/bytedance/seedream/v5/pro/layerize`
- Slugs, contratos y estado de verificación de fal (2026-09-16): `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Carril operativo. Seedream 5 va **sin** prefijo `fal-ai/`; el prefijo depende del endpoint, no del proveedor.

Facts operativos vigentes al 2026-06-01:

- OpenAI expone dos carriles para imagenes: Image API para una generacion/edicion directa, y Responses API con `image_generation` para flujos conversacionales o multi-step.
- Image API es la opcion preferida para un asset puntual desde un prompt o una edicion acotada.
- Responses API es la opcion preferida para iterar sobre una imagen, usar contexto conversacional, o forzar `action: "generate" | "edit" | "auto"`.
- **Delta 2026-09-08 — la familia `gpt-image-2.5` (Sunburst y Flare) es la frontera del proveedor.** Trae los
  niveles de calidad `xhigh` y `max` (antes el techo era `high`), transparencia con soporte pleno y hasta 16
  referencias por edit. **No** soporta Batch. ~~No publica rate limits y su costo por imagen no se estima~~ →
  **corregido 2026-09-16:** las fichas de Flare y Sunburst publican rate limits iguales a `gpt-image-2` (Tier 1
  100.000 TPM / 5 IPM … Tier 5 8.000.000 / 250), y la calculadora de la guía oficial ya cubre 2.5: su fórmula
  reproduce exactamente el `usage` medido (fórmula en `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.5).
  OpenAI recomienda 2.5 para integraciones nuevas. **NUNCA enviar `input_fidelity` a un modelo 2.5** — la guía lo excluye explícitamente.
  Contrato completo: `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`.
- ✅ **Delta 2026-09-16 (TASK-1851) — el helper Greenhouse YA transporta la familia 2.5.** Queda superseded el
  bloqueo anterior, que decía que 2.5 no se podía probar por ninguno de los dos caminos. Estado real:
  `src/lib/ai/openai-image.ts` acepta `gpt-image-2.5-flare` y `gpt-image-2.5-sunburst` (más sus snapshots
  `…-2026-09-08`), verificados contra `GET /v1/models`; `pnpm ai:image --model gpt-image-2.5-flare` resuelve la
  grilla de tamaños moderna (16:9 → `2048x1152`) y **no** envía `input_fidelity`; `--quality` acepta `xhigh` y
  `max`.
- 🔴 **Las tres puertas de entrada del modelo fallan ruidosamente, no en silencio.** Un `--model` o un
  `--quality` inválido aborta **antes de cualquier I/O**, con mensaje accionable; pedir `xhigh`/`max` a un modelo
  anterior a 2.5 aborta al arrancar el CLI; y un `OPENAI_IMAGE_MODEL` desconocido en el entorno **lanza** en vez
  de degradar callado a `gpt-image-2`. Degradar en silencio era el modo de falla que hacía pagar un modelo
  creyendo que se usaba otro.
- **`input_fidelity` sólo lo transportan `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini`.** En 2.5 la guía de
  OpenAI lo excluye y el helper ya no lo envía; la identidad se pide **por prompt**.
- `gpt-image-2` **no** quedó deprecado: sigue siendo el reemplazo recomendado en la tabla de deprecations y el
  único de la familia con Batch (mitad de precio). **Corrección 2026-09-16:** costo estimable y rate limits
  publicados ya no lo distinguen (2.5 tiene ambos); lo que hoy justifica elegirlo es Batch o la continuidad de un
  flujo existente. En tokens, GPT Image 2 `medium` = 2.5 `high` y GPT Image 2 `high` = 2.5 `max`. `organization-logo-generation.ts` lo fija a propósito.
- **Delta 2026-09-16 — el provider `google-imagen` DEJÓ DE EXISTIR.** Se renombró a `google-gemini-image` y se
  migró a `gemini-3.1-flash-image` vía `generateContent`, porque `imagen-4.0-generate-001` fue retirado (probe
  propio 2026-09-16 contra `efeonce-group`: HTTP 404 `NOT_FOUND`). El `DEFAULT_IMAGE_PROVIDER` pasó a
  `openai-image`: antes apuntaba a un modelo muerto. `generateAnimation()` y el carril SVG siguen intactos.
- `gpt-image-1` se apaga el **2026-10-23**; `gpt-image-1.5`, `gpt-image-1-mini` y `chatgpt-image-latest` el
  **2026-12-01**. No rutear trabajo nuevo a ninguno.
- `gpt-image-2` soporta `background: "transparent"` en preview con PNG o WebP. El helper local conserva la
  identidad pedida, rechaza JPEG transparente antes de red y nunca cambia silenciosamente a `gpt-image-1.5`.
- Transparencia solo es compatible con formatos que soportan alpha, principalmente `png` y `webp`.
- OpenAI recomienda calidad `medium` o `high` para transparencia; `low` es util para drafts rapidos.
- GPT Image puede tardar hasta unos minutos con prompts complejos. No marcar fallo prematuro si el helper tiene timeout largo y progreso claro.
- La generacion puede fallar por filtros de seguridad/moderacion. Reescribir el prompt hacia el resultado visual permitido, no intentar bypassear.
- Las imagenes de entrada cuentan como tokens/costo. En `gpt-image-2`, las referencias se procesan en alta fidelidad automaticamente, asi que editar con muchas referencias puede costar mas.
- **Limitaciones que 2.5 NO cerro** (siguen vigentes en la doc de OpenAI): el modelo "can still struggle with
  precise text placement and clarity"; puede fallar la consistencia visual de personajes o elementos de marca
  recurrentes; y tiene dificultad para ubicar elementos con precision en composiciones sensibles al layout.
  Un entregable con texto pequeno, sistema de personaje o jerarquia fija **sigue exigiendo QA humano por pieza**.
- **OpenAI no afirma mejora de tipografia ni de texto multilingue en 2.5.** No prometerlo en un brief.
- **Provenance:** las imagenes de 2.5 salen con C2PA Content Credentials + SynthID. El C2PA **se puede perder**
  al convertir o recomprimir el archivo; verificar en `openai.com/verify` antes de prometerle a un cliente que
  el entregable final llega firmado.
- Para edicion con mascara, la mascara guia al modelo pero no garantiza una geometria exacta pixel-perfect.
- Las keys de API son secreto de servidor. Nunca escribir `sk-*` en codigo, docs, logs, tests, prompts commiteados ni env examples con valor real.

## Costo de la familia 2.5 — medido y ahora estimable (2026-09-16)

> **Corrección 2026-09-16:** la calculadora de la guía oficial de OpenAI cubre 2.5 y su fórmula reproduce
> exactamente estas mediciones (196 / 1.756 / 7.024 tokens), así que el costo **se estima antes de gastar**. La
> fórmula está en `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.5; el `usage` sigue siendo la
> confirmación. La ficha de 2.5 todavía dice lo contrario: contradicción oficial vigente.

La medición existe: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/` (manifest por corrida, salida
cruda, instrumento reproducible). Sustituye a la instrucción anterior de "no lo estimes, mídelo" **sólo** en el
sentido de que ya hay una medición que citar — no en el de que exista una tarifa estable.

A `1024x1024`, PNG, leyendo `usage` de respuestas reales:

| Quality | Output tokens | USD derivado por imagen | Latencia flare | Latencia sunburst |
|---|---|---|---|---|
| `low` | 196 | 0,0061 | 13,3 s | 11,6 s |
| `high` | 1 756 | 0,0529 | 18,7 s | 29,1 s |
| `max` | 7 024 | 0,2110 | 46,0 s | 80,6 s |

Para qué sirve: **decidir `quality` y modelo en `pnpm ai:image` y en el helper canónico**. Lo que cambia:

- **El costo por imagen no depende de cuál de los dos modelos elijas.** Flare y Sunburst consumieron
  exactamente los mismos tokens en los tres escalones. Presupuesta por `quality × size`, nunca por modelo.
- **Lo que separa a los modelos es la latencia, y la brecha crece con la calidad**: en `max`, Sunburst tardó
  1,75× lo de Flare. Elegir Sunburst se paga en tiempo, no en dinero.
- **`background: transparent` no costó extra**: los mismos 1 756 tokens que `high` opaco.
- La escalera es ~9× de `low` a `high` y ~4× de `high` a `max`. Una pieza en `max` cuesta lo mismo que 36
  exploraciones en `low`.

### Editar cuesta MÁS que generar, no menos

Misma medición, `gpt-image-2.5-flare` · `low` · `1024x1024`, leyendo `usage` real:

| Caso | Input (img / txt) | Output | Total | USD derivado |
|---|---:|---:|---:|---:|
| Generar | 37 (0 / 37) | 196 | 233 | 0,0061 |
| Editar **con** máscara | 1.056 (1.024 / 32) | 196 | 1.252 | 0,0142 |
| Editar **sin** máscara | 1.056 (1.024 / 32) | 196 | 1.252 | 0,0142 |

- **La máscara controla el resultado, no el gasto.** El modelo devuelve la imagen **completa** aunque la máscara
  acote qué cambia: el `output` se cobra idéntico al de una generación (196 en los tres casos).
- **La imagen base se paga como entrada**: 1.024 tokens de imagen por una de `1024x1024`. En `low`, editar costó
  **2,3× generar**.
- **La máscara es gratis**: el `usage` fue idéntico con y sin ella.
- **El sobrecosto relativo se diluye al subir la calidad**, porque el output domina: ~2,3× en `low`, ~1,15× en
  `high`, ~1,04× en `max` (derivado de los outputs de la tabla anterior: 196 / 1.756 / 7.024).
- 🔴 **Para recortar el fondo de una imagen que ya existe, usa `pnpm ai:image:rmbg`** (matting local, cero costo
  de proveedor). Pedirle el recorte al modelo cuesta como una imagen nueva.

Tarifas aplicadas: image in USD 8,00/1M · text in USD 5,00/1M · image out USD 30,00/1M. El `input` de la fila
"Generar" difiere de la tabla anterior porque el prompt es otro; el `output` es el mismo 196.

🔴 **Esto es evidencia fechada, no una tarifa.** USD derivado con las tarifas vigentes al 2026-09-16 (input
texto de entrada USD 5,00 / 1M; output imagen USD 30,00 / 1M). **Sigue vigente la regla:** ninguna cifra de costo de 2.5
entra a una propuesta ni a un pricing sin volver a medir — precios, escalones y
snapshots de modelo rotan sin aviso.

## Greenhouse Decision Matrix

| Necesidad | Carril canonico | Opciones |
|---|---|---|
| Edicion de precision o pieza final de campana | `gpt-image-2.5-sunburst` | OpenAI lo posiciona para "workflows where editing precision matters most". Transportado por el helper y por `pnpm ai:image --model gpt-image-2.5-sunburst` desde TASK-1851. Cuesta lo mismo que Flare; se paga en latencia (ver linea base) |
| Generacion cotidiana / volumen / social | `gpt-image-2.5-flare` | "default choice for most applications". Transportado por el helper y por `pnpm ai:image --model gpt-image-2.5-flare` desde TASK-1851 |
| Batch (mitad de precio) | `gpt-image-2` | 2.5 no tiene Batch. Costo estimable y rate limits publicados ya no lo distinguen: 2.5 tiene ambos (corrección 2026-09-16) |
| Icono raster, sticker, elemento UI aislado | GPT Image 2 por Image API | `format: "png"`, `background: "transparent"`, `quality: "high"`; el helper conserva GPT Image 2 y falla cerrado para JPEG |
| Lote de PNG transparentes | GPT Image 2 por Image API | Usar nombres deterministas, validar alfa real y controlar costo con lotes pequeños |
| Banner, hero, thumbnail, empty state ilustrado | `generateImage()` | `openai-image` (default) para fidelidad/composicion; `google-gemini-image` para continuidad con assets ya generados por ese carril. El provider `google-imagen` ya no existe |
| Edicion de imagen existente | `editOpenAIImage()` | Referencias/mask server-only, maximo del helper vigente |
| Iteracion multi-turn sobre una imagen | `runOpenAIImageTool()` | Mantener `responseId` o `imageGenerationCallId`; ideal para refinar direccion visual |
| Concept art no versionable en chat | Tool nativo de imagen del entorno, si existe | Usarlo solo como exploracion; pasar el asset final por repo si se va a servir |
| Logo real de marca externa | No generar desde IA | Usar `greenhouse-digital-brand-asset-designer` y fuente oficial |
| SVG animado simple | `generateAnimation()` | Gemini via helper, no JavaScript, reduced-motion |
| Separar una pieza plana en capas editables | `pnpm ai:fal --capability seedream5-pro-layerize` | Una imagen, sin prompt; devuelve base + hasta 16 capas PNG con alfa real + `layers.json` (nombre, z_index, bounding box) |
| Divergencia o materialidad Seedream 5 | `pnpm ai:fal --capability seedream5-lite` / `seedream5-pro` (+ `-edit`) | Out-of-band; no hay `usage` por corrida. Pro: tope 2048² (no 4K), JPEG por defecto (el CLI deriva el formato de la extensión de `--out`), USD 0,0675/0,135; Lite: más área, PNG, series con `max_images`, USD 0,035 |
| Video desde texto, imagen o referencias | `pnpm ai:fal --capability seedance25-*` / `seedance20-*` | 2.5 de 4 a 30 s y hasta 1080p (1080p sin verificar); 2.0 base de 4 a 15 s y única con 4K; presupuestar con `tokens = alto × ancho × segundos × 24 / 1024`; r2v exige imagen o video de referencia; el CLI valida límites antes de encolar |
| Video desde primer/último cuadro o keyframes, borrador barato → final | `pnpm ai:fal --capability flux3-*` | Flux 3 es **video** en fal (no imagen); 12 endpoints verificados; draft (registrado USD 0,03/s; publicado 0,06/s, final 0,17/s a 720p) → `flux3-enhance --draft-cache` |
| Editar o extender un video existente | `flux3-edit` / `flux3-extend` (verificados) · `seedance25-r2v --task editing\|extension` (verificados; el filtro de ByteDance rechaza marcas y personas reales y cobra el intento) | Flux 3 extend exige audio en el origen y entrega sólo la continuación; en Seedance 2.0 el video sólo guía |
| Video de largo elegido por el modelo, o basado en una web o un documento | `pnpm ai:fal --capability wan3-*` / `wan3prime-*` | Wan 3.0: 2–30 s o `auto`, default del proveedor 1080p, el CLI envía 480p sin `--resolution` (USD 0,20/s base a 1080p, 0,28/s Prime; 480p 0,05/0,068); r2v con `--thinking --web-url`/`--file`; las 6 verificadas |

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

**Inpainting por máscara desde el CLI (desde 2026-09-16).** `pnpm ai:image` expone `--mask`, así que el
inpainting ya no exige escribir un script contra `editOpenAIImage()`:

```bash
pnpm ai:image --image base.png --mask mask.png --prompt "<qué va en la zona marcada>" --out out.png
```

- La máscara es un **PNG con las zonas a reemplazar en TRANSPARENTE**, con el **mismo formato y las mismas
  dimensiones** que la primera `--image`. El cliente canónico lo valida y falla **antes de gastar**.
- `--mask` sin `--image` **aborta antes de cualquier I/O**. Sin esa guarda el request saldría como una
  generación desde cero, ignorando la máscara en silencio.
- El prompt describe **qué va en la zona marcada**, no la imagen completa.
- El CLI imprime `usage` en cada corrida (`usage: in N (img N · txt N) · out N · total N`), que confirma el costo;
  desde 2026-09-16 el de 2.5 también se estima antes con la fórmula oficial, y la CLI imprime esa estimación
  (`$ costo estimado ≈ USD X …`, sólo informativa). Corregido en el commit `17196ead1`: `--size` y `--background` se
  validan en local, existe `--format png|jpeg|webp` (o se deduce de la extensión de `--out`) y `--count N` avisa que
  son N pedidos pagados.
- 🔴 **Editar no abarata.** El output se cobra igual que una generación y la imagen base se suma como input —
  en `low`, 2,3× generar. **Si sólo necesitas recortar el fondo de una imagen que ya existe, usa
  `pnpm ai:image:rmbg`**, que es matting local y no gasta proveedor. Ver §Costo de la familia 2.5.

## Repo Execution Patterns

### Generate via Greenhouse helper

Use the canonical helper. It preserves exact model identity and validates the format boundary; the caller must
still inspect the decoded alpha before accepting the asset:

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

Para flujos de referencia/máscara hay dos caminos: `pnpm ai:image --image <base> --mask <mask> --prompt "…"`
desde la terminal, o importar `./src/lib/ai/openai-image` cuando el flujo vive en código.

### Generate via fal CLI (`pnpm ai:fal`)

CLI hermano de `pnpm ai:image` para Seedream 5 (imagen, edición y capas) y video con Seedance 2.5/2.0, Minimax H3 y
Flux 3 y Wan 3.0. No lo
reemplaza: `ai:image` habla el contrato OpenAI y fal tiene un esquema de input por endpoint. Es out-of-band; el
runtime de imagen del producto sigue en `src/lib/ai/image-generator.ts`. Manual paso a paso:
`docs/manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md`.

```bash
pnpm ai:fal --list                                                     # gratis: capacidades + estado de verificación
pnpm ai:fal --capability seedream5-pro --prompt "<texto>" --out out.png          # .png pide PNG (Pro entrega JPEG por defecto)
pnpm ai:fal --capability seedream5-pro-edit --image base.png --prompt "<delta>" --out out.png
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ai-generations/<fecha>_<slug>/capas
pnpm ai:fal --capability seedance25-i2v --image plate.png --prompt "<movimiento>" \
  --duration 5 --resolution 720p --aspect 9:16 --out clip.mp4
pnpm ai:fal --model <slug/fal> --prompt "<texto>" --input '{"campo":"valor"}'   # slug fuera del registro
```

Flags: `--list` · `--capability <id>` · `--model <slug>` · `--prompt` / `--prompt-file` · `--image <path|url>`
(repetible; los locales se suben al storage de fal con `uploadFalFile`) · `--size` (enum o `WxH`) · `--count` ·
`--format jpeg|png` (sólo Seedream Pro) · `--max-usd <n>` · `--yes` · `--input <json>` · `--out` / `--out-dir` · `--timeout <ms>` · `--json`. Video:
`--duration <n|auto>` · `--resolution` · `--aspect` · `--bitrate standard|high` · `--task reference|editing|extension`
· `--no-audio` · `--end-image <path|url>` · `--audio <path|url>` (repetible) · `--video <path|url>` (repetible) · `--seed <n>`
(sólo donde el endpoint lo declara). LoRA y entrenadores H3: `--lora <path>[@escala][#weight_name]` · `--frames <n>` · `--split-threshold <s>`.
Timeout por defecto 180 s; sube solo a 30 min en capacidades de video (antes 15 min) y a 3 h en entrenamiento. Cuentas y
cola: `--balance` · `--fal-account <FAL_API_KEY|FAL_API_KEY_B>` · `--detach` · `--status --request-id <id>` (ver delta de dos cuentas abajo).

Reglas operativas:

- 🔴 **Toda corrida sin `--list` (ni `--balance`) gasta dinero real.** fal no devuelve `usage`; desde el commit
  `17196ead1` el CLI **estima antes de encolar** (`$ costo estimado ≈ USD X · <base>`) y, si supera el tope (USD 1,
  `FAL_COST_CONFIRM_USD` o `--max-usd <n>`), se detiene y pide `--yes`. Sin estimación posible avisa y no bloquea. Leer
  la estimación antes de confirmar; no poner `--yes` por costumbre. En video, sin `--resolution` envía la resolución
  más barata y lo avisa (el proveedor usaría Wan 1080p a 0,20/s o H3 base 2K a 0,13/s): para entrega pasarla
  explícita. Flux 3 publica el doble de lo registrado. Tabla: catálogo fal §Precios por escalón de resolución. Con duda, medir con
  `--balance` antes y después de una corrida aislada.
- **Brechas de `pnpm ai:fal` corregidas el 2026-09-16 (commit `17196ead1`):** Seedream Pro deriva el formato de la
  extensión de `--out` y el CLI corrige la extensión si los bytes no coinciden; `--format` en Lite se rechaza; `--seed`
  sólo en los 19 endpoints que lo declaran; más de 10 `--image` se rechaza; `--lora …#weight_name`, `--frames` y
  `--split-threshold` validados (también por `--input`). Siguen abiertos: `--size`/`--count` de imagen sin validar,
  capas de layerize y la mitad de precio que devuelve la API para Flux 3. Detalle: catálogo fal §Estimación de costo
  y validaciones del CLI.
- Sin `--out`/`--out-dir` la salida cae en `public/images/generated/`. Para exploración usar `--out-dir` bajo
  `ai-generations/`, fuera de `public/` y de `.captures/`.
- Las validaciones fallan **en local, antes de encolar**: prompt faltante, `--image` faltante o sobrante, duración
  sobre el máximo, resolución/aspecto no soportados, `--bitrate` en mini y `--task` fuera de `seedance25-r2v`.
  **Delta 2026-09-16:** la brecha de `--task` está cerrada; sólo Seedance 2.5 reference-to-video lo acepta y el CLI
  lo rechaza en local en cualquier otra capacidad (antes, el r2v de 2.0 lo rechazaba después de encolar).
  Verificado en local (el CLI rechaza `--task` en `seedance20-r2v` sin encolar); `seedance25-r2v` con `--task` quedó verificado en real el mismo día.
- **Delta 2026-09-16 — Minimax H3 conectado** (`h3-*`, `h3max-*`, `h3turbo-*`, `h3-train-*`; 9 de 17 verificados).
  Flags propios: `--prompt-expansion`, `--lora <path[@scale]>`, `--camera-trajectory <json>` y, en entrenadores,
  `--training-data`/`--steps`/`--rank`/`--learning-rate`/`--trigger`. H3 exige duración entera 5–15 s, resolución
  en mayúsculas, sin `--aspect` en image-to-video y sin `--bitrate`/`--no-audio`. `h3max-director` no es operable
  por cola. Contrato y precios: catálogo fal §Minimax H3; comandos: manual `operar-cli-fal-seedream-seedance.md`.
- **Delta 2026-09-16 — Flux 3 conectado** (`flux3-*`, 12 de 12 verificados en real; slugs
  `blackforestlabs/flux-3/…` sin prefijo). En fal es un modelo de **video**; los Flux de imagen (`fal-ai/flux-2-*`)
  no están en el registro. Flags propios: `--keyframe <imagen>@<frame_index>` (1–10), `--safety-tolerance 0-4` y
  `--draft-cache <url>` (sólo `flux3-enhance`). Duración `auto` o 5–20 s (flf y keyframes sin `auto`; edit y enhance
  sin duración); `--resolution 720p|1080p` sólo en finales; flf exige `--image` + `--end-image`; edit/extend reciben
  `--video`. `flux3-extend` exige pista de audio en el origen (con `--no-audio` fal devuelve 422 tras encolar) y
  entrega sólo la continuación. Contrato: catálogo fal §Flux 3; comandos: manual `operar-cli-fal-seedream-seedance.md`.
- **Delta 2026-09-16 — Seedance video a video:** no hay endpoint video-to-video; vive en reference-to-video. Sólo
  2.5 edita (`--task editing`, sin `--duration`/`--aspect`) o extiende (`--task extension`, sin `--aspect`), ambos con
  `--video`; en 2.0 el video sólo guía. Duración mínima 4 s; al menos una imagen o video de referencia; topes de
  referencias validados en local. ~~`seedance25-r2v` sigue sin corrida real~~ → verificado en real el 2026-09-16 en `reference`, `editing` y `extension` (ver delta de verificación completa).
- **Delta 2026-09-16 — Wan 3.0 conectado** (`wan3-*`, `wan3prime-*`; slugs `alibaba/wan-3.0{,-prime}/…` sin prefijo;
  USD 0,05/s según la API de pricing — **corregido:** es el escalón 480p de base; 1080p base 0,20/s y Prime 0,28/s, Prime más cara). Las 6 verificadas en real el 2026-09-16 (`wan3-t2v` primero; las otras 5 tras sumar la cuenta B). Flags:
  `--duration auto` (viaja como `null`), `--no-audio` (campo `audio`), `--no-prompt-expansion`, `--thinking`,
  `--seed <n>` (general) y, sólo en r2v, `--web-url`/`--file` (ambos exigen `--thinking`). Referencias: 10 imágenes,
  5 videos, 5 audios. Default del proveedor **1080p**; desde el commit `17196ead1` el CLI envía `480p` si se omite
  `--resolution` (pasar `720p`/`1080p` para entrega). Contrato: catálogo fal
  §Wan 3.0.
- **Delta 2026-09-16 — Kling 3 y Grok Imagine revisados, no conectados:** Kling O3/V3 (multi-shot, `elements` con
  voz, 4K, motion-control; USD 0,112–0,42/s) y Grok Imagine (video v1.5 USD 0,01/s; edit/extend sólo en la versión
  sin número; imagen v2.0). Correrlos hoy sería `--model` fuera del registro y sin verificación. Detalle: catálogo
  fal §Candidatos evaluados, no conectados.
- **~~Delta 2026-09-16 — saldo de fal agotado~~ (superado el mismo día):** el 403 `User is locked. Reason: Exhausted
  balance` venía de la cuenta A en negativo; la recarga se había hecho en otra cuenta (B).
- **Delta 2026-09-16 — dos cuentas con failover:** el cliente usa `FAL_API_KEY` (cuenta A) y `FAL_API_KEY_B` (secreto
  `greenhouse-fal-api-key-b`, cuenta B). Elige la de más saldo y, ante 403 `User is locked` al encolar o subir, pasa a
  la siguiente (ese bloqueo no cobra; otros errores no cambian de cuenta). `pnpm ai:fal --balance` lista saldos gratis.
  `--request-id` y `--status` buscan el request en la cuenta que lo creó. Si **todas** están bloqueadas, el agente no
  recarga ni ingresa medios de pago: reporta el bloqueo con los saldos. Rotación de la clave B pendiente (se compartió
  en una conversación). Detalle: catálogo fal §"Cuentas, saldo y operación del CLI (2026-09-16)".
- **Delta 2026-09-16 — verificación completa: 47 de 55.** Sin verificar sólo 3 variantes LoRA de H3 + 4 entrenadores;
  no operable `h3max-director`. Costo real de la tanda: USD 7,71 por 17 corridas (3 rechazadas por filtro, cobradas);
  Seedance costó ~2× lo estimado con la equivalencia de tokens de OpenArt: no usarla para presupuestar; **la fórmula
  de fal sí sirve** (`tokens = alto × ancho × segundos × 24 / 1024`, calza dentro de ~5 %).
  **Filtro de Seedance (ByteDance):** rechaza después de encolar (422 `content_policy_violation`) referencias con
  marcas (isotipo de Efeonce) o personas reales. Video a video con personas o marcas → Flux 3 edit/extend o Wan 3.0.
- **Nano Banana Pro:** nunca por fal (decisión del operador 2026-09-16). En Google, `gemini-3-pro-image` está
  disponible en Vertex pero ninguna superficie lo usa; el provider `google-gemini-image` corre Nano Banana 2
  (`gemini-3.1-flash-image`) y no hay CLI de Gemini Image (`pnpm ai:image` es sólo OpenAI). No cambiar
  `GOOGLE_GEMINI_IMAGE_MODEL` para probarlo: cambia todo el carril. Ver arquitectura del generador §Carril Google.
- El CLI imprime el `request_id` al encolar. Ante `HTTP 408` el trabajo **sigue cobrando en fal**: retomarlo con
  `pnpm ai:fal --capability <id> --request-id <id>` (no reenvía ni vuelve a cobrar), nunca relanzarlo.
  Alcance de la verificación: el retome se probó en real con `h3turbo-t2v` y, el 2026-09-16, con Seedance 2.5 referencias (superó 15 min y se recuperó con `--request-id`); Seedream usa el mismo código (`awaitFalRequest`) sin corrida propia de retome. Para no bloquear la terminal, `--detach` encola y termina; `--status` consulta sin costo.
- Una capacidad con `verifiedAt: null` imprime una advertencia antes de gastar. Si la corrida funciona, anotar la
  fecha en `src/lib/ai/fal-capabilities.ts`; nunca marcarla sin haber corrido.
- Layerize: el CLI escribe `NN-<nombre>.png` por capa (orden `z_index`) y `layers.json` con nombre, descripción,
  `z_index` y `bounding_box`. Conservar `layers.json` junto a los PNG: sin él se pierde la posición de cada capa.
- Si el output no trae la clave esperada, correr con `--json` para ver la forma real antes de tocar el registro.

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

## Multimodal Campaign Production: Seedream 5 + GPT Image 2 + Gemini Omni

La unidad de diseño no es el modelo aislado: es la **secuencia de manos**. Para campañas still/motion y
digital/offline a escala, usar por defecto:

`brand/channel -> diverge -> develop -> anchor -> organize -> extend -> animate -> compose/post -> prepress -> release`

- **Seedream 5 Lite:** divergencia rápida, búsqueda de familias visuales y variaciones de un lenguaje.
- **Seedream 5 Pro:** desarrollo de materialidad, color, atmósfera, energía y continuidad visual de una dirección seleccionada.
- **GPT Image 2:** organización espacial, instrucciones complejas, reparación localizada, adaptación de formatos y creación de campos de copy.
- **Gemini Omni Flash:** motion 9:16/16:9 desde un clean plate, audio nativo y edición conversacional. Se conecta directo por las plataformas de Google, no por fal ni por `pnpm ai:fal`, aunque fal lo liste (reafirmado por el operador 2026-09-16: por Google es más barato con la misma calidad).
- **Gemini Omni 1.1 Cloud, carril local vigente:** `pnpm ai:omni` usa `gemini-omni-1.1-flash-preview` en `global`. Conecta texto, imagen, primer/último cuadro, referencias, edición y extensión; las seis rutas tuvieron canary MP4 el 2026-09-24. Para parámetros, costo estimado, GCS privado y recuperación por ID, seguir el [manual de `ai:omni`](../manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md). El modelo anterior del piloto de 2026-07-18 no determina los límites de 1.1.
- **Composición determinista:** texto, logos, claims, legal, grillas y exports finales. Un modelo generativo no es la fuente de verdad tipográfica.

El paso `anchor` es obligatorio antes de escalar. Debe aprobar identidad, silueta, paleta, sistema de luz, fondo, zona de copy y invariantes protegidos. Desde ese anchor se derivan todas las piezas en una topología estrella; no se encadenan treinta derivados entre sí.

Cada relevo debe registrar el contrato `model-handoff-contract.yaml`: origen, destino, operación, referencia, regiones editables, invariantes protegidos, formato de trabajo, criterio de aceptación, aprobadores y `target_executor`. El siguiente modelo recibe una tarea de edición acotada, no un brief creativo abierto.

Dos relevos reales quedaron verificados el 2026-07-18:

1. **GPT Image 2 -> Seedream 5 Pro:** GPT fijó anatomía y composición; Seedream elevó atmósfera y color conservando estructura. Correlación de bordes `0.9212`, MAE normalizado `0.0926` y cromaticidad media `+12.1%` relativa.
2. **Seedream 5 Pro -> GPT Image 2:** Seedream creó el sistema de material/energía; GPT lo convirtió en banner `3:1` con un solo cuerpo y campo de copy. El seleccionado obtuvo `4.67/5`, con `48%` del lienzo reservado como campo limpio. Tres intentos previos enseñaron que anatomía temporal y escala deben expresarse con límites duros, no con “aproximadamente”.

Para pasar una imagen local de GPT a Fal sin hacerla pública, usar `uploadFalFile` (`POST /storage/upload/initiate` → `PUT` a `upload_url` → `file_url`); `pnpm ai:fal --image <local>` lo hace solo y entrega el `file_url` a Seedream. No persistir esa URL en manifests. No ampliar IAM ni hacer público un bucket para resolver el puente.

Canon detallado:

- `.codex/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md`
- `.codex/skills/design-studio/modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md`
- `.codex/skills/design-studio/templates/model-handoff-contract.yaml`
- `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md`

Worked example E2E:

- `ai-generations/2026-07-18_high-frequency-campaign-e2e/`
- valida `3 territorios Lite -> 1 anchor Pro -> 3 plates GPT Image 2 -> 18 stills -> 2 masters motion 10 s + 2 bumpers 6 s`;
- prueba que el primer render no es un gate suficiente: la inspección visual detectó copy sobre el sujeto y una violación de safe zones antes del release;
- incluye digital, A2/OOH proof-only, motion, modos de marca, handoffs, prompts, usage/costo, hashes, matrices,
  QA, contact sheets, package creativo y un flujo reutilizable de activación/aprendizaje.

**Regla aprendida y bloqueante:** un clip de duración mínima usado para comprobar acceso, codec, identidad o
handoff es un `technical-probe`, nunca una pieza de campaña. Motion profesional debe declarar su familia de
entrega —al menos master y cutdown en los ratios acordados—, arco temporal, end card, audio, poster, captions/
muted comprehension y QA. Un límite de modelo no autoriza llamar “spot” a un smoke test.

### Layout Design & Finishing

Para sets estáticos con alta exigencia compositiva, no pedir al modelo que invente y termine simultáneamente el
anuncio. Después del anchor, fijar un layout contract por ratio y separar:

- `clean_plate`: sujeto, ambiente, material y luz;
- `optical_underlay` y `campaign_hook`: integración y sistema gráfico;
- `type` y `brand`: copy, logo, CTA, legal y locale exactos;
- `channel`: crop, safe zone, color, tamaño, compresión o prepress.

Seedream Pro cierra material/luz/color/atmósfera; GPT Image 2 cierra geometría/safe zones/región protegida. El
modelo recibe sólo el clean plate y un delta. Figma/Adobe/código/Sharp compone la pieza final. Nunca se reenvía
el anuncio compuesto al modelo. Detener la inferencia cuando el scorecard no mejora o el siguiente delta es
determinístico.

Canon y evidencia:

- `.codex/skills/design-studio/modules/13_LAYOUT_DESIGN_AND_FINISHING.md`;
- `.codex/skills/design-studio/templates/layout-design-contract.yaml`;
- `docs/documentation/ai-tooling/layout-design-and-finishing.md`;
- `ai-generations/2026-07-18_high-frequency-campaign-e2e/brief/layout-design-pilot.md`.

## Safety And Governance

- Do not generate official third-party logos, payment marks, legal signatures, IDs, documents, or brand marks from memory.
- Do not imitate a living artist by name. Describe visual traits instead.
- Do not include real people, clients, employee likenesses, or sensitive work data in prompts unless the task has explicit authorization and a safe data path.
- Do not paste secrets into prompts or generated asset metadata.
- Do not use generated images as source of truth for legal, finance, payroll, identity, medical, or compliance content.
- **Las rutas internas de generación están gateadas en producción por `ENABLE_ASSET_GENERATOR`.**
  `POST /api/internal/generate-image` y `/api/internal/generate-animation` responden **403** en producción salvo
  que el flag valga `true`; hoy está **ausente en todos los environments de Vercel** (verificado 2026-09-16), y
  ése es su estado diseñado, no un rollout pendiente. El guard sólo actúa con `NODE_ENV === 'production'`, así
  que en local y en Preview esas rutas responden sin el flag. Se lee **sólo en Vercel** — ningún Cloud Run la
  declara. La generación versionable de assets **no** depende de ese flag: pasa por `pnpm ai:image` y
  `src/lib/ai/image-generator.ts`. Fila y runbook: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- If generation is blocked by safety filters, reframe the request to a safe visual alternative and report the limitation.

## Closure Report

When reporting back, include:

- asset path(s);
- provider/model and fallback reason if present;
- whether transparency was verified;
- visual QA performed;
- any limitations or human review needed.
