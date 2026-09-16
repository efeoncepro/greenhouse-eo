---
name: greenhouse-ai-image-generator
description: Expertly art-direct, prompt, generate, edit, validate, and apply AI-generated visual assets for Greenhouse, including transparent PNG icons, UI elements, empty states, banners, hero images, thumbnails, layout-design finishing, material/style control, reference-guided edits, and hybrid Seedream 5↔GPT Image 2→Gemini Omni campaign workflows across digital, motion, print and OOH. Covers the GPT Image 2.5 family (Sunburst/Flare, 2026-09-08) and its quality tiers xhigh/max. Use when a user asks to create images with AI, improve image prompts, use OpenAI/GPT Image/Imagen/Nano Banana/Seedream via fal.ai, create transparent assets, or produce and scale polished visuals for Greenhouse UI or campaign production.
---

# Greenhouse AI Image Generator

Use this skill whenever Greenhouse needs AI-generated visual assets: icons, UI elements, empty states, banners, hero imagery, thumbnails, stickers, transparent PNGs, or image edits from references.

Act as both the image-generation operator and the art director. The job is not only to call a model; it is to produce a professional asset with deliberate composition, material, lighting, palette, hierarchy, technical fit, and QA.

### Tipografía creativa Efeonce

Para key visuals, campañas y piezas social/editoriales fuera de la UI, puedes usar `Bricolage Grotesque` como
familia display expresiva. El asset local es `src/assets/fonts/BricolageGrotesque-Variable.ttf`, con ejes `opsz`,
`wdth` y `wght`; la licencia y procedencia están en `src/assets/fonts/BricolageGrotesque-SOURCE.md`.

Esta disponibilidad no activa una tercera familia en el runtime de Greenhouse: la UI sigue usando Poppins para
display y Geist para texto. En assets con texto exacto, conserva la familia elegida en la composición determinista
final; el texto generado por el modelo sigue requiriendo revisión humana y no prueba fidelidad tipográfica.

En **seasonality/trendjacking**, cargar primero
[social-media-studio](../social-media-studio/modules/11_TRENDJACKING_CREATIVE_PRODUCTION.md): clasificar
la oportunidad, justificar participación, definir mecanismo creativo y papel de marca antes del prompt.
Para Efeonce, aplicar [SEASONAL_CONTENT](../social-media-studio/efeonce/SEASONAL_CONTENT.md): el oficio debe
ser demostrable y la atribución reconocible. No forzar un objeto corporativo para cumplir branding. Color,
marco o tipografía oficiales no equivalen a activos distintivos reconocidos sin evidencia.

Separar dos rutas: **firma editorial**, con zona reservada y activo exacto compuesto después del modelo;
**marca física**, con soporte pertinente, geometría y acabado definidos, usando arte oficial como referencia
si se elige materialización generativa. La segunda no exige regenerar titulares ni acepta deformación del logo.
Aplicar [brand-in-scene](../social-media-studio/references/brand-in-scene.md). Mantener la marca fuera de objetos
rituales sin revisión cultural específica. No añadir nombre de ocasión/fecha/CTA si no tiene función o fue retirado.

## First Reads

Read only what the task needs:

- `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`
- `docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md` whenever the task
  uses GPT Image, transparency, editing, masks, flexible sizes, streaming, pricing or model selection
- `references/seedream-5-gpt-image-2-hybrid-production.md` when the task uses Seedream 5,
  fal.ai still-image generation, multiple image models or campaign profusion
- `docs/operations/GREENHOUSE_MULTIMODAL_CAMPAIGN_PRODUCTION_V1.md` when stills hand off to Gemini Omni,
  or the campaign includes motion, print/OOH or explicit branded/brand-light/neutral/client modes
- `../design-studio/modules/13_LAYOUT_DESIGN_AND_FINISHING.md` when static campaign pieces need controlled
  ratio layouts, generative finishing and deterministic copy/brand composition
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` when generation runs through
  Creative Studio / Efeonce Globe or the task asks for estimates, reservations, credits, retries or refunds
- `DESIGN.md` when the asset will appear in UI
- `AGENTS.md`, `project_context.md`, `Handoff.md` for repo coordination

If the request is a real third-party logo or payment mark, stop and use `greenhouse-digital-brand-asset-designer` instead.

For art direction, Key Visual design or **audit**, marketing/campaign imagery, visual concept/mood, or choosing which AI model to use for a task (Nano Banana / Midjourney / Ideogram / Recraft / FLUX / Firefly / Seedance / Veo, etc.), the director is the `design-studio` skill — it directs and delegates production back here for assets that live in the Greenhouse UI.

## Core Rule

For assets that will live in Greenhouse, use the canonical helper when possible:

- `src/lib/ai/image-generator.ts`
- output path: `public/images/generated/`
- provider options: `openai-image` (default) or `google-gemini-image`. 🔴 **`google-imagen` ya no existe**:
  se renombró a `google-gemini-image` y se migró a `gemini-3.1-flash-image` el 2026-09-16 (TASK-1851),
  porque `imagen-4.0-generate-001` fue retirado. El `DEFAULT_IMAGE_PROVIDER` pasó a `openai-image`.
- transparent PNG: `format: 'png'`, `background: 'transparent'`

Do not call image providers from parallel scripts if the helper covers the case.

## GPT Image 2.5 — Sunburst y Flare (delta de proveedor 2026-09-08)

OpenAI publicó `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare` (snapshots `…-2026-09-08`). Contrato completo,
precios, ciclo de vida y contradicciones documentales: `OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`.
Cárgala antes de fijar modelo, tamaño, calidad o costo. Lo que esta skill necesita saber:

**Elección de modelo (la única diferencia de contrato entre ambos es el valor de `model`):**

| Pieza | Modelo | Razón |
|---|---|---|
| Edición donde la precisión manda; entregable final de campaña o producto | `gpt-image-2.5-sunburst` | OpenAI lo posiciona para "workflows where editing precision matters most" |
| Generación cotidiana, exploración, social, volumen | `gpt-image-2.5-flare` | el más rápido; el anuncio lo llama "the default choice for most applications" |
| Necesitas Batch API, costo por imagen estimable **antes** de gastar, o rate limits conocidos | `gpt-image-2` | 2.5 no tiene Batch, ni calculadora de costo, ni tabla de rate limits publicada |

**Calidad — el techo subió.** `low · medium · high · xhigh · max · auto` (default `auto`). `xhigh` y `max`
existen **sólo** en 2.5. Regla de la casa: `low` para exploración, `high` como piso para texto pequeño,
infografía o retrato, y `xhigh`/`max` **sólo** para el entregable final. OpenAI no documenta qué significa cada
escalón ni cuánto consume; **hay que medirlo** (ver costo abajo).

**Tamaño — ya no estás atado a los tres clásicos.** Custom `WIDTHxHEIGHT` con las cuatro reglas simultáneas:
ejes múltiplos de 16, ratio entre 1:3 y 3:1, ningún borde &gt; 3840 px, total entre 655.360 y 8.294.400 px.
**Arriba de `2560x1440` la doc lo marca experimental** — no lo mandes a un entregable de cliente sin QA visual.

**NUNCA envíes `input_fidelity` con un modelo 2.5.** La guía lo ubica bajo "Earlier GPT Image models" con la
frase explícita *"not Sunburst or Flare"*. En 2.5 la preservación de identidad se pide **por prompt**, con la
lista de invariantes repetida en cada turno (patrón abajo).

**Transparencia:** `background: "transparent"` + `output_format` `png` o `webp`. En 2.5 es soporte pleno (en
`gpt-image-2` sigue en preview). El prompt además debe pedir sujeto aislado y **prohibir** escenografía, backdrop
sólido, checkerboard y sombras; en cada edición, repetir "preserve the transparent background". Validar alfa
decodificando bytes, nunca por metadata ni por ver un checkerboard.

**Costo: ya está medido (2026-09-16).** OpenAI declara verbatim que la calculadora de GPT Image 2 **no** estima
el consumo de 2.5, así que la única fuente es `usage` de respuestas reales — y esa medición ya existe:
`ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/` (manifest por corrida, salida cruda, instrumento
reproducible). A `1024x1024`, output tokens **196** (`low`) / **1 756** (`high`) / **7 024** (`max`),
**idénticos entre Flare y Sunburst** → USD **0,0061** / **0,0529** / **0,2110** por imagen con las tarifas
vigentes al medir (output imagen USD 30,00 / 1M; texto de entrada USD 5,00 / 1M).

El **edit** tiene su propia línea base en el mismo directorio (ver el bloque de `--mask` abajo): editar no abarata, suma la imagen base como input.

Para qué sirve: **decidir `quality` y modelo en `pnpm ai:image` y en el helper**. Tres cosas que cambia: **(1)** el costo por imagen **no depende del modelo** — presupuesta
por `quality × size`, nunca por Flare vs Sunburst; **(2)** lo que separa a los modelos es la **latencia**, y la
brecha crece con la calidad (en `max`, Flare 46,0 s vs Sunburst 80,6 s = 1,75×): elegir Sunburst se paga en
tiempo, no en dinero; **(3)** `background: transparent` **no costó extra**. La escalera es ~9× de `low` a `high`
y ~4× de `high` a `max`: una pieza en `max` cuesta lo mismo que 36 exploraciones en `low`.

🔴 **Es evidencia fechada, no una tarifa estable.** La regla **sigue vigente**: ninguna cifra de costo de 2.5
entra a una propuesta ni a un pricing sin volver a medir. Y cualquier cifra que
venga de un blog **no entra** nunca.

### 🔴 Lo que 2.5 NO mejora — no lo prometas en un brief ni en una propuesta

- **Tipografía y texto dentro de la imagen.** OpenAI **no** declara mejora de texto. Al contrario: la limitación
  *"can still struggle with precise text placement and clarity"* sigue vigente en la doc.
- **Texto multilingüe / scripts no latinos.** Cero menciones en anuncio, help center y system card.
- **Consistencia de personaje o de elementos de marca recurrentes** — sigue declarada como limitación.
- **Control de composición en layouts con jerarquía fija** — sigue declarada como limitación.
- **Preservación de identidad garantizada.** El lenguaje oficial es "more likely to carry through", nunca
  "preserves". Sigue exigiendo revisión humana por variante contra el ancla.
- **"2.5 es más seguro".** El system card mide una mejora que **no alcanza significancia estadística**, y la
  categoría Abuse **empeora** respecto a Images 2.0. No es argumento comercial.

Las cuatro limitaciones anteriores siguen abiertas: un entregable con texto chico, un sistema de personaje o un
layout con jerarquía **sigue necesitando QA humano por pieza**. 2.5 no lo convierte en un paso automatizable.

### Patrones de prompt oficiales (guía vigente = abril 2026, escrita para `gpt-image-2`)

⚠️ Al 2026-09-08 **OpenAI no publicó guía de prompting para 2.5**: la del cookbook está fechada 2026-04-21 y
escrita para `gpt-image-2`. Cítala como guía de la familia GPT Image, nunca como guía de 2.5.

- **Orden del prompt:** background/escena → sujeto → detalles clave → constraints, más el uso previsto (ad, UI
  mock, infografía) que fija el "modo" y el nivel de acabado. Para pedidos complejos, segmentos etiquetados y
  saltos de línea, no un párrafo largo.
- **Edición quirúrgica:** `"change only X"` + `"keep everything else the same"`, y **repetir la lista de
  preservación en cada iteración** para frenar la deriva. Si debe ser quirúrgica, decir explícitamente que no
  altere saturación, contraste, layout, flechas, labels, ángulo de cámara ni objetos alrededor.
- **Texto en imagen:** literal entre comillas o en MAYÚSCULAS, con tipografía como constraint (estilo, tamaño,
  color, posición). **Deletrear letra por letra** marcas y palabras raras. Calidad ≥ `medium` para texto pequeño
  o paneles densos.
- **Multi-referencia:** indexar y describir cada input ("Image 1: product photo… Image 2: style reference…") y
  cómo interactúan. Al componer, explicitar qué elemento va dónde.
- **Consistencia de personaje:** generar primero una lámina de personaje con fondo neutro y estilo bloqueado, y
  usar **esa imagen** como input de `images.edit` en cada escena, repitiendo el bloque de invariantes. Anclar
  siempre al mismo canónico, nunca a la generación anterior.
- **Fotorrealismo:** la palabra "photorealistic" engancha el modo directamente; specs de cámara detalladas se
  interpretan de forma laxa — úsalas para look y composición, no como simulación física.
- **Iterar, no sobrecargar:** base limpia + follow-ups de un solo cambio.

### Provenance: toda imagen sale firmada

2.5 emite **C2PA Content Credentials + SynthID** (watermark invisible) en ChatGPT, Codex y API. Consecuencias:

- Si el entregable va a un cliente que exige disclosure o a un pitch público, **decláralo**.
- El C2PA **se puede perder** al convertir, recomprimir o editar el archivo — justo lo que hace un pipeline de
  derivados. No prometas que el entregable final llega firmado sin verificarlo en `openai.com/verify`.
- Un `not_detected` **no prueba** que la imagen sea humana.
- Existe además marca de agua **visible** opcional por prompt ("Include a visible OpenAI watermark in the image").

### Novedades de la app ChatGPT (dirección de arte fuera de banda)

Útiles cuando exploras dirección en la app antes de bajar el prompt al CLI. No son camino de producción de
assets repo-bound.

- **Sketch** — `@Sketch` en el compositor: dibujas y ese trazo va como guía visual. El help center lo describe
  **como app móvil**; no hay confirmación oficial en web/desktop.
- **Templates** — sidebar → Images → Templates. Formatos nombrados oficialmente: Poster, Merch, flyers, product
  photos, logo. El listado completo **no está publicado** — no inventes categorías. **No disponible en Work mode.**
- **Comentarios sobre la imagen** — seleccionas un área y describes el cambio. Advertencia oficial repetida:
  *"highlights are not always precise, and edits may extend beyond the area you selected"*.
- **Compartir prompt** — en móvil: Share → Prompt template → Copy link.
- Disponible en todos los tiers, web/iOS/Android y Codex. **Los límites de generación por plan NO están
  publicados por OpenAI**; las cifras que circulan en blogs son rumor y no entran a una propuesta.

## CLI: `pnpm ai:image` (familia GPT Image, 2.5 incluida)

For terminal/operator-driven generation — `product-design-loop` concepts, mockup fixtures, icon/asset batches — use the canonical CLI instead of writing an ad-hoc `scripts/_gen-*.ts`:

```bash
pnpm ai:image --prompt "<text>" [--out <path>] [--size 1024x1024|1536x1024|1024x1536|2048x1152|WxH] \
              [--quality low|medium|high|xhigh|max|auto] [--background opaque|transparent] \
              [--model gpt-image-2|gpt-image-2.5-flare|gpt-image-2.5-sunburst] \
              [--count N] [--timeout 280000] [--open]
pnpm ai:image --prompt-file <path>          # long prompts
pnpm ai:image --batch concepts.json         # [{ "filename": "a.png", "prompt": "…" }, …] — multiple
```

- Wraps the canonical `generateOpenAIImage` (`src/lib/ai/openai-image.ts`). Self-contained: loads `.env.local`, resolves `OPENAI_API_KEY_SECRET_REF` server-side, never prints the secret.
- ✅ **El helper YA transporta la familia 2.5** (delta 2026-09-16, TASK-1851). Queda **superseded** la
  advertencia anterior de esta skill, que decía que 2.5 no se podía probar por ningún camino. Contrato real,
  verificado en `src/lib/ai/openai-image.ts`:
  1. `gpt-image-2.5-flare` y `gpt-image-2.5-sunburst` (más sus snapshots `…-2026-09-08`) están en el allowlist
     canónico, verificados contra `GET /v1/models`.
  2. `pnpm ai:image --model gpt-image-2.5-flare` resuelve la **grilla de tamaños moderna** (16:9 → `2048x1152`,
     no `1536x1024`) y **no** envía `input_fidelity`.
  3. `--quality` acepta `xhigh` y `max`, que existen **sólo** en 2.5.
- 🔴 **Las tres puertas de entrada fallan RUIDOSAMENTE, y de eso depende que no pagues un modelo creyendo que
  usas otro.** Un `--model` o un `--quality` inválido **aborta antes de cualquier I/O**; pedir `xhigh`/`max` a un
  modelo anterior a 2.5 aborta al arrancar el CLI con mensaje accionable; y un `OPENAI_IMAGE_MODEL` desconocido
  en el entorno **lanza** en vez de degradar callado a `gpt-image-2`. **NUNCA** reintroduzcas una degradación
  silenciosa "por robustez": el modo de falla que esto cierra es facturable e invisible.
- **`input_fidelity` sólo lo transportan `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini`.** En 2.5 la guía
  de OpenAI lo excluye ("not Sunburst or Flare") y el helper ya no lo envía: la identidad se pide **por prompt**.
- Defaults: `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated` — el default del
  CLI **no** cambió con TASK-1851; 2.5 se pide explícito con `--model`. Timeout default **280s** (`high` excede
  los 125s del helper runtime `generateImage`; `max` en 2.5 midió hasta ~81s, ver la línea base de costo).
- OpenAI documents native `background: transparent` for `gpt-image-2` in **preview**, with PNG or WebP. The
  canonical helper/CLI preserves the requested GPT Image 2 identity, rejects transparent JPEG before network I/O
  and never falls back silently to deprecated `gpt-image-1.5`.
- GPT Image outputs are still **raster**. For real vectors use Higgsfield + Recraft V4.1 (fal slug verified live
  2026-07-19: `fal-ai/recraft/v4.1/text-to-vector`, text-driven, carries the `fal-ai/` prefix).
- The CLI **operates** the model; THIS skill is the **art direction** (brief, composition, finish, palette, QA). Run the skill to write the prompt, then the CLI to generate, then critique + GVC if it lands in UI.
- For a slide-integrated, extractable asset, generate on a **uniform studio background**
  (not a baked checkerboard), then run `pnpm ai:image:rmbg` and inspect the resulting
  alpha at original size and on the destination slide. This reduces matting halos and
  keeps the asset reusable across layouts.
- Keep exploratory concepts out of commits (gitignored dir, e.g. `.captures/concepts/`).

## Reference edit + character consistency (`--image`)

Canonical path to make **consistent variants** of an existing character/asset (new pose, expression, scene) while preserving its identity, style, and logo — the model edits the reference, it does not re-imagine it.

```bash
pnpm ai:image --image <ref.png> --prompt "keep this exact <subject>, change ONLY <delta>" --out <out.png>
#   --image <path>        reference to edit (repeatable) → switches to editOpenAIImage (image-to-image)
#   --mask <path>         INPAINTING: PNG con las zonas a reemplazar en TRANSPARENTE. Requiere --image
#                         (sin ella aborta), mismo formato y mismas dimensiones que la primera --image.
#   --input-fidelity high strict reference preservation — SÓLO gpt-image-1.5 / gpt-image-1 / gpt-image-1-mini.
#                         En 2.5 no se envía (la guía lo excluye); la identidad se pide por prompt.
pnpm ai:image:rmbg <in.png> <out.png>   # cut a flat studio bg → transparent (AI matting, soft edges)
```

🔴 **Editar NO abarata — medido 2026-09-16, `flare · low · 1024x1024`:** el modelo devuelve la imagen
**completa** aunque la máscara acote qué cambia, así que el output se cobra **idéntico** a una generación
(196 tokens), y encima la imagen base entra como **1 024 tokens de input**. Editar costó **2,3× generar** en
`low`; el sobrecosto se diluye al subir calidad (~1,15× en `high`, ~1,04× en `max`) porque el output domina.
**La máscara es gratis**: con y sin máscara el `usage` fue idéntico. Corolario operativo: para recortar un
fondo de una imagen que ya existe, usa `pnpm ai:image:rmbg` (local, cero costo de proveedor), no un edit.
El CLI ahora imprime `usage` en cada corrida — úsalo, es la única fuente de costo real de 2.5.

- El cliente acepta hasta **10** `--image` por request y conserva su orden. Cada referencia debe declarar en el
  prompt su rol: estructura, paleta, identidad, activo oficial o anti-referencia.
- Una **anti-referencia** no tiene peso negativo nativo: es una instrucción semántica. Nombrar el rasgo excluido
  y revisar contaminación en la salida; si persiste, retirar la referencia o cambiar de método.
- **Multi-referencia ordenada = patrón cross-model, no propio de este CLI.** La edición basada en referencias
  acepta **VARIAS referencias ordenadas con rol + precedencia** en toda la matriz: este CLI (`--image` ×10, orden
  preservado), Seedream 5 `edit` (array `image_urls` ordenado, cada URL con su rol y prioridad de conflicto) y la
  edición multi-imagen de GPT-Image-2 / Nano Banana (varias imágenes inline). Asigna a cada referencia un rol
  (`STRUCTURE`/`IDENTITY`/`MATERIAL`/`ANATOMY`/`ANTI-REFERENCE`) y declara cuál gana; nunca pidas "combinar" a
  secas. En motion, Gemini Omni (`reference_to_video`) acepta multi-referencia **+ refs combinadas imagen+video**
  en un mismo set — verificado en vivo 2026-07-20 en ambas superficies.
- **Una referencia degenerada no es una referencia (verificado en vivo 2026-07-20).** Un PNG de 1×1 px lo rechaza
  Gemini/Omni con `Failed to decode image data`. No uses un placeholder mínimo para "probar el camino" de un
  edit: usa una imagen real pequeña. Ese fallo se parece a un bug de payload y no lo es.
- **Sinergia — el mismo patrón ya existe como capability gobernada.** Fuera de banda decides rol y precedencia a
  mano; dentro de la plataforma gobernada (Efeonce Globe · Model Lab) refinar un candidato es **una sola
  semántica** (`editFrom = { experimentId }`) con dos paradigmas nativos: *stateful* (encadena por la sesión del
  proveedor, sólo dentro del mismo proveedor) y *reference-based* (re-inyecta el output del padre como base — es
  el que habilita el **edit cross-model**, p.ej. refinar un candidato de Seedream con Nano Banana). El set va
  siempre **edit base primero** (el orden es condicionamiento) y cada ruta **falla cerrado** al exceder su tope
  (`too_many_references`): truncar devuelve trabajo que parece correcto y no lo es. Contrato:
  `docs/architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md` §"Edit / refine cross-model".
- Si se exigen cards, gráficos, ejes, microcopy, cifras o logos exactos, detener la generación y usar SVG o
  composición determinística. Una portada puede seguir siendo un problema vectorial.

- **Engine verdict (bake-off 2026-07-05):** for identity + logo fidelity on an edit, `gpt-image-2` (this CLI,
  direct OpenAI route) wins. `nano_banana_pro` (Higgsfield) is a strong plan B (slightly better
  face/expression, with separate vendor usage). Do NOT use text-to-image or "character" models (e.g. Soul) for
  consistency — they treat the reference as inspiration and drift to a different subject + mangled logo.
- **Prompt = identity-lock scaffold + one small delta.** Fix everything (face, hair, outfit, the exact logo, framing, lighting) and change ONLY the requested pose/expression. Big deltas break consistency; small deltas hold it. Anchor every variant to the SAME canonical reference, not to a previous generation.
- **Reference-guided generation does not guarantee logo identity.** Do not assign a universal fidelity percentage or exempt a model from review. Exact editorial marks use the official vector. Physical marks require identity, geometry and material review together; a re-stamp without physical integration is insufficient. If unacceptable drift persists, use controlled photographic composition or 3D/material rendering.
  - **Social piece with a logo seal** (worked 2026-09-11, Efeonce "We are Hiring", LinkedIn 4:5): here the logo is
    never generated. Generate only the art (Higgsfield MCP `generate_image`, `gpt_image_2`, `resolution 2k`,
    `quality high`, `count 2`) with approved brand blues only and the bottom band left empty. `gpt_image_2` offers
    no 4:5: generate `3:4` and crop to 4:5 **from the bottom only** (the headline moves toward the optical center
    and the bottom band stays free), then resize to 1080×1350. Compose the real SVG with sharp (Node) — that run:
    `public/branding/logo-negative.svg` at 300 px wide, centered, 104 px from the bottom edge, thin white rule
    (56 px, 45% opacity) 34 px above. Zoom-inspect the seal at 100% before hosting. Campaign log:
    `docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md`.
  - **Pieza 4:5 con mockup de dispositivo y pantallas exactas** (funcionó 2026-09-11, trendjacking «Nuestro
    Duo»; caso: [`2026-09-11-iphone-duo-trendjack.md`](../../../docs/operations/social/2026-09-11-iphone-duo-trendjack.md)).
    El modelo genera sólo el **clean plate**; pantallas, titular y logo se componen. Receta híbrida:
    1. `pnpm ai:image --model gpt-image-2 --size 1600x2000 --quality high --count 2`: manos + plegable abierto
       con **ambas pantallas en verde chroma plano (#00FF00)**, fondo en azules de marca y tercio superior vacío
       para el titular. A diferencia de la ruta Higgsfield de arriba (sin 4:5), el CLI directo acepta
       `1600x2000` como custom size de `gpt-image-2`: 4:5 nativo, sin recorte. La evidencia del CLI debe decir
       `gpt-image-2 · 1600x2000`.
    2. Chroma key con despill en Node + sharp. Separa las dos mitades por la bisagra (la columna con menos verde
       en el tercio central) y toma las 4 esquinas de cada mitad por los extremos de `x+y` y `x−y`; agrándalas
       ~2,5% para cubrir las esquinas redondeadas.
    3. Renderiza la UI exacta en HTML con Playwright a 2x y proyéctala con **homografía → CSS `matrix3d`**,
       detrás del plate ya keyed, así los pulgares quedan delante. Suma una sombra de pliegue hacia la bisagra y
       un brillo diagonal de vidrio para que la pantalla no se vea pegada.
    4. Titular, bajada y logo real (`public/branding/logo-negative.svg`) se componen de forma determinística;
       nunca el logo generado.
    QA: zoom al 100% de pulgares, esquinas y bisagra; cualquier halo verde bloquea. Trampas medidas:
    - `page.setContent()` **no carga recursos `file://`** (fuentes, imágenes, SVG) porque el documento es
      `about:blank`: sale un plate vacío con fuente de reserva y sin error. Escribe el HTML a disco y usa
      `page.goto('file://…')`.
    - `text-shadow` en el padre de un span con `background-clip:text` + `color:transparent` se transparenta y
      agrisa el degradado. Pon `text-shadow:none` en ese span.
    - Para reemplazar un asset público en GCS, súbelo con **nombre nuevo**: la caché pública sigue sirviendo el
      anterior.
    Esta receta es **sólo para la imagen fija**. En video el operador rechazó reemplazar pantallas de forma
    determinística (el texto pegado no recibe luz, reflejos ni movimiento): ahí las pantallas las renderiza el
    modelo con referencias. Receta: `motion-design-studio` → `modules/09_AI_VIDEO_PIPELINE.md` §7.
- **Background:** GPT Image 2 can return native transparency in preview when the request uses
  `background: 'transparent'` with PNG or WebP. Validate alpha from the decoded bytes; metadata or prompt copy is
  insufficient. Use `pnpm ai:image:rmbg` only as local post-processing for an intentionally opaque source or a
  provider output that failed alpha QA—not as a claim that GPT Image 2 lacks alpha. AI matting gives softer hair
  edges than color-key/flood-fill, but it can erase white interior details and must be inspected over light/dark
  backgrounds. Engine = `@imgly/background-removal-node` (model `medium` default; `small` for speed—`large` is not
  bundled in v1.4.5). Its native dependencies are approved through `pnpm.onlyBuiltDependencies`.
- **Human-review every variant against the anchor** for identity drift before keeping it.
- **Log durable generations in `ai-generations/`** (repo, not `.captures/`): one subfolder per run named `YYYY-MM-DD_<semantic>/` with `README.md` (verbatim prompts) + `manifest.json`, plus a row in `ai-generations/INDEX.md`. Worked example: `ai-generations/2026-07-05_nexa-fallback-characters/` — the 3D Nexa character (`public/images/illustrations/characters/greenhouse-*.png`) posed per fallback `kind`.

## Provider Choice

- Use `openai-image` for higher prompt fidelity, complex composition, reference-guided edits, UI assets, icon sets, and transparent PNG batches.
- **OpenAI model targeting (delta 2026-09-08).** La frontera del proveedor es la familia **2.5**
  (`gpt-image-2.5-flare` por defecto, `gpt-image-2.5-sunburst` para precisión de edición). `gpt-image-2`
  **no** está deprecado y sigue siendo la elección correcta cuando necesitas Batch, costo por imagen estimable
  antes de gastar, o rate limits publicados: 2.5 no tiene ninguno de los tres. Desde 2026-09-16 el helper
  transporta **ambas** familias, así que la elección ya es de necesidad, no de lo que el código soporta.
  `organization-logo-generation.ts` fija `gpt-image-2` a propósito y no se toca sin decisión explícita.
  Nunca rutees trabajo nuevo a `gpt-image-1.5`, `gpt-image-1`, `gpt-image-1-mini` ni `chatgpt-image-latest`:
  todos deprecados, con apagado en octubre (`gpt-image-1`, **2026-10-23**) o diciembre 2026. Lee la matriz de
  capacidades antes de cambiar modelo, precios o constraints de salida.
- 🔴 **`google-imagen` DEJÓ DE EXISTIR (2026-09-16, TASK-1851).** El provider se renombró a
  `google-gemini-image` y se migró a `gemini-3.1-flash-image` vía `generateContent`, porque
  `imagen-4.0-generate-001` fue retirado (probe propio contra `efeonce-group`: HTTP 404 `NOT_FOUND`). El
  `DEFAULT_IMAGE_PROVIDER` pasó de `google-imagen` a **`openai-image`**: el default anterior apuntaba a un
  modelo muerto. **NUNCA** rutees a `google-imagen` ni prometas "continuidad con banners de Imagen": ese carril
  ya no genera. Usa `google-gemini-image` cuando la superficie ya use ese lenguaje visual.
  `generateAnimation()` y el carril SVG siguen intactos.
- Use Seedream 5 Lite out-of-band for inexpensive creative divergence and Seedream 5 Pro for
  material/color/atmosphere development or semantic regional edits; operate them with `pnpm ai:fal`
  (built on `src/lib/ai/fal.ts`), never a parallel fal client, ad-hoc script or product runtime wiring.
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
  final copy, editorial logo, CTA and legal deterministically. After approving the finish, use `pnpm creative:layout` for
  reproducible composition/QA when the contract fits V1. The compiler never calls a provider. Never send the
  composed ad back through a model.
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

Fal.ai is a programmatic media-generation aggregator — one API fronts many models: **video** (Seedance 2.5/2.0, Minimax H3, Kling v3, PixVerse, Veo, Grok Imagine, Runway, Luma Ray, Hailuo, Wan…; Gemini Omni does NOT run through fal — it goes direct via Google), **image** (flux, krea), **audio**, **3D**. Canonical client: `src/lib/ai/fal.ts` — `runFalModel({ model, input })` submits to the fal queue and polls to completion; model-agnostic (pass the fal slug, e.g. `bytedance/seedance-2.0/mini/image-to-video`). Secret resolves server-side via `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF` — never hardcode the `<id>:<secret>` key.

- **Out-of-band, NOT runtime** (same rule as Higgsfield): generate here + upload via the canonical uploader; never wire fal into a product runtime flow (runtime image path stays `src/lib/ai/image-generator.ts`).
- **Video is the headline** — for video art direction / model choice use `motion-design-studio`; audio → `audio-studio`; model/aesthetic pick → `design-studio`. THIS skill covers still-image asset craft.
- **Provider pricing is volatile and internal to routing.** Verify the exact endpoint/model pricing at execution
  time and persist an evidence snapshot; never convert a vendor price directly into customer-facing Studio
  Credits or copy a point-in-time vendor price into a commercial offer.
- **Full model & capability catalog** (13 categories, verified slugs): `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

### CLI de fal: `pnpm ai:fal` (Seedream 5 + layerize, Seedance 2.5/2.0, Minimax H3)

Hermano de `pnpm ai:image` (`scripts/ai/fal-image.ts`), **out-of-band, NUNCA runtime del producto**. Es la mano
de producción de fal: no escribas scripts ad-hoc sobre `runFalModel`. El registro model-agnostic vive en
`src/lib/ai/fal-capabilities.ts` (slug entero, campo de entrada, salida, límites de video y `verifiedAt`).

```bash
pnpm ai:fal --list                                    # gratis: capacidades, slugs y estado de verificación
pnpm ai:fal --capability seedream5-pro --prompt "…" --out kv.png
pnpm ai:fal --capability seedream5-pro-edit --image base.png --image material.png --prompt "…" --out v2.png
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ./capas
pnpm ai:fal --model <cualquier/slug/fal> --prompt "…" --input '{"campo":"valor"}'   # fuera del registro
pnpm ai:fal --capability <id> --request-id <request_id>  # retoma un trabajo ya encolado: no reenvía ni cobra
```

- Flags: `--prompt|--prompt-file`, `--image` (repetible; los archivos locales se suben solos al storage de fal),
  `--size`, `--count`, `--format jpeg|png`, `--out|--out-dir`, `--timeout`, `--json`. Video (`--duration`,
  `--resolution`, `--aspect`, `--bitrate`, `--task`, `--no-audio`, `--end-image`, `--audio`, `--video`,
  `--prompt-expansion`, `--lora`, `--camera-trajectory`), entrenamiento (`--training-data`, `--steps`, `--rank`,
  `--learning-rate`, `--trigger`) y la elección entre Seedance y H3 viven en `motion-design-studio`
  (`workflows/engine-selection-by-fidelity-contract.md`). El CLI valida cada flag contra el contrato del endpoint
  **antes** de gastar: flags de video en una capacidad de imagen, o de entrenamiento fuera de un entrenador, fallan.
  `--task` quedó corregido: **sólo** Seedance 2.5 reference-to-video lo acepta (antes Seedance 2.0 lo rechazaba
  después de encolar; verificado en local (el CLI rechaza `--task` en `seedance20-r2v` sin encolar); `seedance25-r2v` con `--task` no tiene corrida real y sigue sin verificar.) `--list` agrupa IMAGE / VIDEO / TRAINING y marca `[NO OPERABLE POR COLA]`.
- 🔴 Todo `--capability`/`--model` sin `--list` **gasta dinero**. fal no devuelve `usage`: el CLI no reporta
  costo por corrida; no inventes precios. Si la capacidad figura SIN VERIFICAR, el CLI lo advierte antes de gastar.
- **Retome (request_id):** el CLI imprime el `request_id` apenas fal encola. Si el polling local vence (HTTP 408)
  el trabajo **sigue corriendo y cobrando** en fal: no relances; usa el comando de retome que imprime el CLI
  (verificado: mismo archivo byte a byte; alcance de la verificación: el retome se probó en real sólo con `h3turbo-t2v`; Seedream y Seedance usan el mismo código (`awaitFalRequest`) pero no tienen corrida propia de retome.) La cola se direcciona por APP (dos primeros segmentos del slug), no por
  slug completo. Timeouts por defecto: imagen 3 min, video 15 min, entrenamiento 3 h.
- Minimax H3 (17 endpoints, 9 verificados 2026-09-16): Max Turbo / Max / base + variantes LoRA y 4 entrenadores
  (sin verificar). `h3max-director` es stream realtime: el CLI se niega a operarlo por cola. Detalle y precios en
  `motion-design-studio`.
- Seedream 5 (las 5 verificadas 2026-09-16): `seedream5-lite` / `seedream5-lite-edit` (divergencia barata),
  `seedream5-pro` / `seedream5-pro-edit` (desarrollo; edit hasta 10 referencias) y `seedream5-pro-layerize`.
  No existe Seedream 5.1 al 2026-09-16.
- **Layerize** recibe UNA imagen, sin prompt obligatorio, y devuelve la base + hasta 16 capas por `z_index`
  (nombre, descripción, bounding box y recorte con **alfa real**, reconstruyendo lo ocluido). El CLI guarda
  `NN-<nombre>.png` + `layers.json`. Uso: rescatar un key visual aprobado como capas editables (texto, sujeto,
  fondo) para recomponer, retocar o animar por separado **sin volver a generar**. No reemplaza la composición
  determinística: el logo oficial y el copy final siguen saliendo del vector y del compositor.

### Seedream 5 still-image routing (verified 2026-07-18)

- Lite endpoints: `bytedance/seedream/v5/lite/text-to-image` and
  `bytedance/seedream/v5/lite/edit`; use for parallel divergence before an anchor exists.
- Pro endpoints: `bytedance/seedream/v5/pro/text-to-image` and
  `bytedance/seedream/v5/pro/edit`; use for expressive development, multireference material
  fusion and semantic regional art direction.
- **The `fal-ai/` prefix depends on the ENDPOINT, not the provider — hard rule (re-verified 2026-09-16):**
  Seedream 5 and Seedance 2.x go **without** it (the slugs above are correct as-is); Seedream 4/4.5 and
  Seedance v1/v1.5 go **with** it (e.g. `fal-ai/bytedance/seedream/v4.5/text-to-image`). FLUX, Recraft,
  GPT Image, Topaz etc. keep `fal-ai/`. With the wrong prefix the submit is accepted (200) but the **result
  404s** (`Path /... not found`, `inference_time` ≈ 0.02s) — a silent failure. Never compose a slug from
  provider + version: take it whole from `src/lib/ai/fal-capabilities.ts` or the catalog.
- **Cheap slug check before generating (no spend):** `POST {}` (empty body) to `https://fal.run/<slug>`
  → **404** = the app does not exist · **422** = the app exists (input validation failed). Confirm any
  slug this way before a run.
- Both edit endpoints accept ordered `image_urls`; assign every reference a role and conflict
  precedence. Pro Edit's region/layer comprehension still returns a flat raster with no mask
  contract; real layers come only from the separate `seedream5-pro-layerize` endpoint (see CLI above).
- Large data URIs proved unreliable in the real bridge. For local files, prefer a temporary
  `fal-cdn-v3` upload with short lifecycle and do not persist its input URL. A private GCS object
  with short-lived signed URL is only an alternative when `signBlob` is already authorized;
  never widen IAM or publish a bucket for convenience.
- For the full capability contract, prices, dimensions, GPT limits, measured benchmark and
  hybrid handoff schema, load `references/seedream-5-gpt-image-2-hybrid-production.md`.
- **State (2026-07-06): OPERATIONAL — key persisted + real generation verified end-to-end.** Secret `greenhouse-fal-api-key` in GCP Secret Manager + `FAL_API_KEY_SECRET_REF` in `.env.local`; `runFalModel('fal-ai/flux/schnell')` returns `ok:true` HTTP 200 with a real image (`secretSource=secret_manager`). Key temporary (rotation pending). Not wired to Vercel runtime. **Queue-URL gotcha:** for sub-path models fal returns `status_url`/`response_url` on the PARENT app — never reconstruct polling URLs from the slug (→ 405). Full contract: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

## Studio Credits boundary

This skill executes image operations; it does not define price, packages or credit bands. In Creative Studio:

- `image_generate`, `image_transform` and generative upscale may accrue Studio Credits when estimated,
  approved and auditable;
- selecting candidates, art direction, QA, rights review, deterministic copy/logo composition, layout, export,
  local matting and reuse of an approved asset accrue **0 Studio Credits** while still consuming
  governance/capacity;
- a post, carousel, KV or adaptation is never itself the credit unit: count the governed generative operations
  inside it;
- a technical/provider/platform failure without usable output follows release/refund policy and is not silently
  charged twice; a client-directed branch after a valid output needs a new estimate;
- provider spend is internal evidence. Rights, stock, talent, likeness and licences remain separate lines.

The lifecycle is `estimate → reservation → approval → execution → settlement | release | refund adjustment`.
Do not publish `1 credit = money`, vendor→credit conversion, per-piece tables or illustrative bands as approved.

## Workflow

1. Normalize the asset brief: target surface, audience, final size, format, alpha needs, style, constraints, and whether it is exploratory or repo-bound.

For social posts that contain real reports, dashboards or exact product UI, also load
`docs/operations/GREENHOUSE_SOCIAL_VISUAL_REPORT_PRODUCTION_V1.md`. The generator may produce a clean plate or
supporting texture, but must not regenerate the final report, score, UI, copy or logo. Those layers remain
deterministic and are composed after any generative finish.
2. Build a short art-direction hypothesis: viewer takeaway, silhouette, visual hierarchy, finish, material, lighting, palette, and quality risks.
3. If a visual reference is a webpage, inspect its original SVG/Lottie/CSS/raster source before choosing the
   engine; load `../design-studio/modules/11_PRODUCT_STORY_SCENES.md` for product/editorial scenes.
4. Load the shared guide for professional prompt recipes, finish playbooks, and quality gate.
5. Write a prompt with explicit asset intent, subject, composition, style, material, lighting, palette, background, constraints, and output target.
6. For a Creative Studio run, obtain the governed estimate/reservation/approval; then generate through the
   canonical capability route. For a repo-bound Greenhouse asset outside Globe, use the canonical helper.
7. Critique the result like production design: small-size readability, crop, alpha edge, material believability, brand fit, and integration fit.
   When the image contains channel iconography or marks, inspect every light/white
   interior (for example the LinkedIn “in” and YouTube play) after matting; a clean
   silhouette with erased logo details is a failed asset.
8. Refine with single-change follow-ups; restate invariants on every edit. In multi-model flows,
   carry `anchor_id`, parent asset, reference roles, precedence, locks, one delta, safe zones and
   acceptance criteria at every handoff; derive every ratio from the approved anchor using star topology,
   not from the previous ratio or latest available output.
9. If placed in UI, verify the surface with Greenhouse Visual Capture.
10. Report paths, model/provider, transparency validation, visual QA, and limitations.

## Hard Constraints

- Never hardcode API keys or print secret values.
- Never present provider support or local code as live runtime evidence. GPT Image 2 transparency is implemented
  locally in the Greenhouse helper and Globe contract/adapter with byte-level alpha validation; Globe remains
  rollout-pending until an authenticated billable canary and runtime readback prove the deployed route.
- When the user or contract requires an exact model, use a path that returns the model identity. For
  `gpt-image-2`, prefer `pnpm ai:image --model gpt-image-2 ...` and retain the CLI result with model, quality and
  size. The built-in chat generator may be used for exploration, but its model must remain `unknown` when the
  runtime does not expose `model_id`; never infer it from visual quality.
- Never generate official logos or brand marks from memory.
- 🔴 **El logotipo de Efeonce es `efe[isotipo]nce`: el símbolo ES la letra «o», no la acompaña.** Una sola
  pieza. **NUNCA** pongas un isotipo grande al lado de la palabra — duplica el símbolo y produce un lockup
  que no existe. El isotipo suelto (`public/branding/SVG/isotipo-full-efeonce.svg`) es una variante válida
  **por separado**, para cuando la marca aparece sin el nombre; no se combina con el wordmark
  (`public/branding/logo-full.svg`). Al materializar la marca, pasa el activo correcto como referencia y
  declara en el prompt que el símbolo aparece **exactamente una vez**.
- **Mira el activo oficial renderizado antes de describirlo.** No infieras su estructura del nombre del
  archivo, de un render anterior ni de la lectura natural del término "logo completo". Caso fuente
  2026-09-16: leer el logotipo de Efeonce como "isotipo + palabra" costó dos corridas facturables y produjo
  una pieza peor que la anterior, mientras el diagnóstico decía que la estaba corrigiendo.
- Do not include visible text unless the user explicitly asks and accepts risk; image models can still struggle with precise text.
- Treat model-rendered campaign text as concept-only. Final copy, editorial logo, CTA, price, legal and
  localization require deterministic composition unless an explicit exception accepts raster risk. Physical
  brand materialization uses official references and the separate identity/material review above.
- Seedream Pro Edit «region/layer editing» is semantic art direction over one flattened raster, not editable
  layers or pixel-perfect locality. Use GPT + alpha mask when protected-region drift has operational cost; when
  you need separable layers of an approved piece, run `seedream5-pro-layerize` instead of regenerating.
- If a still becomes motion, hand the approved clean plate to `motion-design-studio`. Build the 15/10/6
  family in deterministic post; use Seedance (2.5/2.0 via `pnpm ai:fal`) only for a genuinely new shot/action/continuity need,
  never to repair timing, crop, copy/logo, grade, foley or other editing defects.
- Do not ship assets with watermarks, fake logos, accidental letters, cropped subjects, dirty alpha edges, or background residue.
- Do not accept a full-bleed scene or dashboard collage when the brief requires an
  extractable slide asset. Prefer one clear visual thesis, a clean plate/alpha channel,
  and deterministic placement inside the deck. Preserve white logo details during
  background removal; if a logo must be exact, use the real vector asset in composition.
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

### Evidencia de cierre social

Conservar input oficial, plate, resultado del pase físico, detalle comparativo y master tipografiado como
revisiones identificables. Reportar por separado idea/pertinencia, identidad, geometría, material, lectura móvil
y checks técnicos. V5 de la silla fue rechazada pese a checks verdes; V6 no implica aprobación humana ni
resultados de audiencia. No publicar, reutilizar como aprobado ni promover a release por completar una generación.
