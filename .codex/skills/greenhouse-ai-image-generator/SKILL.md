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

- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` — **guía canónica de qué modelo elegir,
  cuándo y cómo** (todos los modelos de `pnpm ai:image` y `pnpm ai:fal`). El resumen operativo está abajo en
  §Elegir modelo; ante duda o conflicto, manda la guía.
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

## Elegir modelo (leer ANTES de generar)

Resumen operativo de la guía canónica `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`
(as-of 2026-09-16). Etiquetas: **[verificado]** corrida real del repo · **[oficial]** proveedor · **[tercero]**
ranking fechado · **[decisión]** del operador · **sin dato** = no existe evidencia, no se rellena.

### Carriles: dónde vive cada motor

| Carril | Superficie | Motores |
|---|---|---|
| OpenAI directo | `pnpm ai:image` (out-of-band) · runtime `generateImage` provider `openai-image` (default del producto) | GPT Image 2 (default del CLI), GPT Image 2.5 Sunburst y Flare |
| Google directo (Vertex, `global`) | **sólo** runtime `generateImage` provider `google-gemini-image`; **no hay CLI** | Nano Banana 2 (`gemini-3.1-flash-image`, default); Nano Banana Pro (`gemini-3-pro-image`) disponible pero **sin superficie** |
| Higgsfield CLI (out-of-band) | `higgsfield` | Recraft V4.1, **vectores SVG reales**. Estado 2026-09-16: `Not authenticated` → sin vía hasta que una persona corra `higgsfield auth login` |
| fal.ai (out-of-band, NUNCA runtime) | `pnpm ai:fal` | Seedream 5 Pro/Lite/edit/layerize (imagen); Seedance, Minimax H3, Flux 3, Wan 3.0 (video) |
| Higgsfield API (out-of-band, NUNCA runtime) | `pnpm ai:fal --capability hf-*` | SOUL 2/Cinema, Marketing Studio, Ideogram 4.0, Qwen Image 3, Z-Image Turbo, Grok Image 2.0, Recraft 4.1 (SVG **sin confirmar**: `model_type: vector` de la app, sin probar por API); video Kling/PixVerse/LTX/Happy Horse y otra vía para Seedance/Wan/H3. `--estimate` cotiza exacto sin cobrar. Estado 2026-09-16: 44/44 cotizan, **0 generaciones reales** (cuenta de API sin créditos). Guía §5.8 |

Nano Banana Pro y Gemini Omni Flash van **siempre directo por Google, nunca por fal** [decisión]. Recraft por fal
(23 endpoints) no está conectado.

### Árbol de decisión — imagen

1. **¿Necesitas vector real (SVG)?** → Recraft V4.1 vía Higgsfield. GPT Image y Seedream son **raster siempre**.
2. **¿La pieza lleva copy, logo, CTA, precio o legal finales?** → el modelo entrega **sólo el clean plate**;
   texto y marca se componen de forma determinística. Esto no cambia con ningún modelo.
3. **¿Edición donde la precisión manda, zona protegida con máscara o entregable final?** →
   `gpt-image-2.5-sunburst` en `xhigh`/`max`, con `--mask` si hay zona protegida. Sunburst es #1 en edición en
   Arena y Artificial Analysis [tercero, 2026-09-07/16]; la máscara alfa tuvo menos deriva protegida que la
   edición semántica de Seedream (MAE 0,0308 vs 0,0458, medido con GPT Image 2) [verificado 2026-07-18].
4. **¿Generación cotidiana, social, asset de UI, volumen, transparencia?** → `gpt-image-2.5-flare` en
   `medium`/`high`. Mismo costo que Sunburst para igual `quality × size`; los separa la latencia (en `max`, Flare
   46,0 s vs Sunburst 80,6 s) [verificado 2026-09-16]. Transparencia: soporte pleno en 2.5, preview en GPT Image 2.
   OpenAI recomienda 2.5 para integraciones nuevas [oficial].
5. **¿Necesitas Batch API (mitad de precio) o el contrato fija `gpt-image-2`?** → `gpt-image-2` (único con Batch;
   el CLI no usa Batch). Ojo: el default del CLI (`gpt-image-2 · high · 1536x1024` ≈ USD 0,165) cuesta lo mismo
   que 2.5 en `max`.
6. **¿Abrir muchos territorios barato o una serie relacionada?** → `seedream5-lite` (USD 0,035/imagen;
   `max_images` 1–6 vía `--input`).
7. **¿Materialidad, atmósfera, color, look development, fusión multirreferencia orientada a material, cambio
   regional sin máscara?** → `seedream5-pro` / `seedream5-pro-edit` (edit hasta 10 referencias).
8. **¿Separar una pieza aprobada en capas editables?** → `seedream5-pro-layerize` (hasta 16 capas PNG con alfa +
   `layers.json`, sin prompt). No regeneres.
9. **¿Resolución nativa sobre 2K?** → `seedream5-lite` (área hasta 4096² según schema; la ficha dice 3072²) o GPT
   Image (hasta 3840×2160; sobre 2560×1440 es experimental). 🔴 **Seedream 5 Pro en fal NO es 4K**: área máxima
   2048×2048 (la nota "Hasta 4K" del registro era incorrecta).
10. **¿Formato más extremo que 3:1?** → Seedream (aspecto 1/16–16). GPT Image tope 3:1.
11. **¿Texto multilingüe dentro de la imagen, sólo para concepto?** → Seedream 5 Pro lo declara [oficial]; OpenAI no
    declara nada para 2.5. Igual va a composición determinística al release.
12. **¿Continuidad con un carril `google-gemini-image` ya en producto?** → Nano Banana 2 por el runtime; no hay CLI y
    no cambies `GOOGLE_GEMINI_IMAGE_MODEL` para probar Pro (cambia todo el carril).

**Rankings: preséntalos con fecha y fuente, sin elegir uno como verdad.** OpenArt Arena imagen (2026-09-16):
Seedream 5 Pro #1, GPT Image 2 #2, Nano Banana Pro #3. Arena y Artificial Analysis (2026-09-07/16): Sunburst y
Flare #1/#2 en texto a imagen y en edición (Sunburst gana edición), Seedream 5 Pro entre #8 y #15. Los rankings
**se contradicen**; manda la prueba contra el brief.

### Costo de imagen: estímalo ANTES de gastar

- **GPT Image 2.5 SÍ es estimable** (corrige la regla anterior de "sólo midiendo"). Fórmula de la calculadora
  oficial de OpenAI, que reprodujo **exactamente** las mediciones del repo (196 / 1 756 / 7 024 tokens en
  `low`/`high`/`max` a 1024²) [oficial + verificado 2026-09-16]:

  ```text
  G = gpt-image-2:   low 16 · medium 48 · high 96
      gpt-image-2.5: low 16 · medium 24 · high 48 · xhigh 64 · max 96
  lado_corto   = redondeo(G / (lado_mayor_px / lado_menor_px))     # .5 redondea a par
  tokens_salida = ceil(G × lado_corto × (2 000 000 + ancho × alto) / 4 000 000)
  costo_salida  = tokens_salida × USD 30 / 1 000 000                # + texto e imágenes de entrada
  ```

  | Calidad (salida de imagen, USD) | 1024×1024 | 1536×1024 | 2048×2048 | 3840×2160 |
  |---|---:|---:|---:|---:|
  | 2.5 `low` (= GPT Image 2 `low`) | 0,0059 | 0,0047 | 0,0119 | 0,0111 |
  | 2.5 `medium` | 0,0132 | 0,0103 | 0,0268 | 0,0260 |
  | 2.5 `high` (= GPT Image 2 `medium`) | 0,0527 | 0,0412 | 0,1070 | 0,1001 |
  | 2.5 `xhigh` | 0,0937 | 0,0738 | 0,1903 | 0,1779 |
  | 2.5 `max` (= GPT Image 2 `high`) | 0,2107 | 0,1646 | 0,4282 | 0,4003 |

  Tabla derivada de la fórmula [inferencia sobre oficial]. `auto` no es estimable. Un tamaño no cuadrado mayor
  puede costar menos que uno cuadrado menor. Editar suma la imagen base como entrada (2,3× en `low`, ~1,04× en
  `max`) [verificado]. Sigue la regla: ninguna cifra entra a una propuesta sin re-medir.
- **Rate limits de 2.5 publicados, iguales a `gpt-image-2`** [oficial 2026-09-16]: Tier 1 100 000 TPM / 5 IPM ·
  T2 250 000 / 20 · T3 800 000 / 50 · T4 3 000 000 / 150 · T5 8 000 000 / 250.
- **Seedream en fal** [oficial fal, 2026-09-16]: Pro USD 0,0675 (área ≤ 1536²) · 0,135 (hasta 2048²) + 0,0045 por
  referencia adicional en edit · Lite USD 0,035 por imagen efectiva · Layerize USD 0,03375 por capa (≤ 1536²) o
  0,0675 por capa. fal no devuelve `usage`: mide con `pnpm ai:fal --balance` antes y después.

### Video: resumen (la elección vive en `motion-design-studio`)

Toda elección de video se hace con `motion-design-studio` → `workflows/engine-selection-by-fidelity-contract.md`
(contrato de fidelidad por toma). Lo mínimo que debes saber desde esta skill:

| Necesidad | Motor (`pnpm ai:fal --capability …`) |
|---|---|
| Explorar barato y rápido | `h3turbo-t2v/i2v` 480P · `flux3-*-draft` → `flux3-enhance` sólo del elegido · `seedance20-mini-*` 480p |
| Toma hero de máxima calidad | `seedance25-*` (hasta 30 s; su 1080p está sin verificar) · 4K → `seedance20-*` base |
| Toma larga (> 15 s) | `seedance25-*` (≤ 30) · `wan3-*` (≤ 30) · `flux3-*` (≤ 20) |
| Cámara precisa sobre imagen fija | `h3max-camera` |
| Principio y fin exactos / varios cuadros clave | `flux3-flf` · `wan3-i2v --end-image` · `seedance25-i2v --end-image` / `flux3-keyframes` (≤ 10) |
| Editar o extender un video | sin personas ni marcas: `seedance25-r2v --task editing` o `--task extension` · con personas: `flux3-edit` / `flux3-extend` (origen con audio) |
| Video basado en una web o documento | `wan3-r2v --thinking --web-url <url>` / `--file <doc>` + prompt con guion |

🔴 **fal cobra por escalón de resolución**: el precio del registro es el escalón **más bajo**. Wan 3.0 a 1080p
USD 0,20/s, Wan 3.0 Prime 0,28/s (más cara que base), H3 base a 2K 0,13/s (defaults del proveedor; sin
`--resolution` el CLI envía el escalón más barato y lo avisa); Flux 3
publicado ≠ registrado (0,17/s final, 0,06 draft, 0,41 extend, el doble) → confirma con `--balance`. Seedance sí
se estima con la fórmula de fal: `tokens = alto × ancho × segundos × 24 / 1024`; `costo = tokens × precio_por_1000
/ 1000` (calzó con lo medido dentro de ~5 %; la equivalencia de OpenArt subestima ~2×). Filtro de Seedance:
rechaza marcas y personas reales **después de cobrar**.

### Brechas conocidas de los CLIs (corregidas 2026-09-16, commit `17196ead1`; lo abierto al final)

- `pnpm ai:image` **ya valida en local** `--size` (2/2.5: `auto` o WxH múltiplos de 16, borde ≤ 3840, relación ≤ 3:1,
  área 655.360–8.294.400; 1.5/1/mini: `1024x1024`, `1536x1024`, `1024x1536` o `auto`) y `--background`; tiene
  `--format png|jpeg|webp` (sin flag lo deduce de la extensión de `--out`; `transparent` + `jpeg` se rechaza); avisa
  que `--count N` son **N pedidos pagados**; e imprime `$ costo estimado ≈ USD X (N × tokens × USD 30/1M; la
  entrada suma aparte)` antes de pedir. **No pide confirmación**: sólo informa; sin estimación con `auto` o modelos
  sin grilla.
- `pnpm ai:fal` **estima antes de encolar** (`$ costo estimado ≈ USD X · base`) y, sobre el tope (USD 1;
  `FAL_COST_CONFIRM_USD`; `--max-usd <n>`), se detiene y pide `--yes`; sin estimación posible avisa y no bloquea.
  En Seedance pasa `--duration`: con `auto` estima el máximo del contrato. En video, sin `--resolution` envía la
  resolución **más barata** y lo avisa: para entrega pásala explícita. Seedream Pro deriva el formato de la
  extensión de `--out` y corrige la extensión si los bytes no coinciden (ya no hace falta `--format png`);
  `--format` en Lite se rechaza; `--seed` sólo se acepta donde el OpenAPI lo declara (H3 de generación, Wan
  3.0/Prime, `seedance25-r2v`); más de 10 `--image` en Seedream edit se rechaza; LoRA con
  `--lora <path>[@escala][#weight_name]`; entrenadores con `--frames` (22–124, `% 17 == 5`) y `--split-threshold`
  (1–60), validados también por `--input`.
- **Sigue abierto:** `ai:image` ignora `--input-fidelity` con 2.5 o 2 en silencio, no hay `--moderation` y la salida
  por defecto es `public/images/generated` (usa `--out` hacia `ai-generations/` o scratchpad). `ai:fal`: `--size`/
  `--count` de imagen sin validar; número de capas de layerize y si la base se cobra: sin dato; la API de pricing
  devuelve la mitad del precio publicado de Flux 3 (sin dato por qué); tablas de escalones al 2026-09-16, pueden
  cambiar. Toda estimación es orientativa: `pnpm ai:fal --balance` antes y después.

## GPT Image 2.5 — Sunburst y Flare (delta de proveedor 2026-09-08)

OpenAI publicó `gpt-image-2.5-sunburst` y `gpt-image-2.5-flare` (snapshots `…-2026-09-08`). Contrato completo,
precios, ciclo de vida y contradicciones documentales: `OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`.
Cárgala antes de fijar modelo, tamaño, calidad o costo. Lo que esta skill necesita saber:

**Elección de modelo (la única diferencia de contrato entre ambos es el valor de `model`):**

| Pieza | Modelo | Razón |
|---|---|---|
| Edición donde la precisión manda; entregable final de campaña o producto | `gpt-image-2.5-sunburst` | OpenAI lo posiciona para "workflows where editing precision matters most" |
| Generación cotidiana, exploración, social, volumen | `gpt-image-2.5-flare` | el más rápido; el anuncio lo llama "the default choice for most applications" |
| Necesitas Batch API (mitad de precio) | `gpt-image-2` | 2.5 no tiene Batch. ⚠️ Corregido 2026-09-16: el costo de 2.5 **sí** es estimable antes de gastar y sus rate limits **sí** están publicados (ver §Elegir modelo) |

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

**Costo: ya está medido (2026-09-16) y además es estimable.** La ficha de 2.5 todavía dice que la calculadora no
lo estima, pero la calculadora de la guía oficial ya cubre 2.5 y su fórmula reproduce exactamente estas
mediciones (contradicción oficial vigente; fórmula en §Elegir modelo). La medición real existe:
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

`ai:image:rmbg` rellena **por defecto** los huecos internos que el matting deja transparentes y no son fondo
(glifos, emblemas); el fondo real encerrado se conserva. `--no-fill-holes` lo desactiva.

🔴 **Editar NO abarata — medido 2026-09-16, `flare · low · 1024x1024`:** el modelo devuelve la imagen
**completa** aunque la máscara acote qué cambia, así que el output se cobra **idéntico** a una generación
(196 tokens), y encima la imagen base entra como **1 024 tokens de input**. Editar costó **2,3× generar** en
`low`; el sobrecosto se diluye al subir calidad (~1,15× en `high`, ~1,04× en `max`) porque el output domina.
**La máscara es gratis**: con y sin máscara el `usage` fue idéntico. Corolario operativo: para recortar un
fondo de una imagen que ya existe, usa `pnpm ai:image:rmbg` (local, cero costo de proveedor), no un edit.
El CLI ahora imprime `usage` en cada corrida — úsalo, es la única fuente de costo real de 2.5.

- El cliente acepta hasta **16** `--image` por request (`MAX_OPENAI_IMAGE_INPUTS = 16`, < 50 MB c/u) y conserva su orden. Cada referencia debe declarar en el
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

### Recolor, inpainting y materialización con forma exacta (caso 2026-09-16)

- **Inpainting con máscara puede cambiar la geometría** aunque el prompt pida conservarla: al recolorear banderines,
  GPT Image 2.5 Sunburst devolvió menos banderines, más grandes y tiñó un objeto fuera de la zona. Comparar
  antes/después por forma, cantidad y posición; si cambian, descartar.
- **Cambio de color de un elemento ya aprobado → recolor determinístico** sobre el plate original: detectar el
  elemento (perfil de color/columnas), rellenar por semilla, apertura morfológica para excluir líneas finas y aplicar
  el color nuevo con la luminosidad del píxel original. Conserva textura, pliegues y luz.
- **Objetos 3D con forma de marca:** boceto con los glifos o siluetas reales en su posición exacta → `--image` con
  Sunburst para materializar → texto y logo compuestos después. El resultado no es vector exacto de la fuente:
  declararlo en la entrega.
- **Mascota pixel-art de partner a 3D con fidelidad:** reconstruir el sprite desde la fuente oficial (caso Clawd: arte
  de bloques del binario de Claude Code y color `rgb(215,119,87)` del mismo binario), no de memoria. La celda de
  terminal es 1:2: cada píxel mide 1 de ancho × 2 de alto; renderizarlo cuadrado aplana la figura. Sprite como
  imagen 1 del edit con «cada píxel = pila de 1×2 cubos» y material declarado; verificar silueta, ojos y extremidades
  contra el sprite antes de usarlo. Biblioteca completa (8 ángulos + 8 accesorios, recorte, QA, entrega y cómo
  aplicarlo a Nexa): [`references/mascot-3d-pose-library.md`](references/mascot-3d-pose-library.md).
- **Cambiar el fondo detrás de una persona o mascota: regenerar, no recortar.** Repintar un muro alrededor de un
  sujeto con matte + máscara deja bordes «mordidos» en pelo y deforma partes finas o sueltas (el «?» de Clawd).
  Acabado profesional = plate nativo con el set nuevo, guiado por un **boceto de composición** de formas planas
  (posición y escala de cada elemento) como imagen 1; si falta aire, alejar la cámara ≤ 10 % con outpaint cuyas
  uniones caigan sólo en muro, ventanas o escritorio. Alejar 25 % duplicó marcos de ventana («marco dentro de marco»).
- **Extender a otro formato (4:5 → 9:16) sin costuras:** colocar el plate aprobado en el lienzo nuevo, outpaint con
  máscara y re-pegar el núcleo. La máscara debe abrir también una franja de transición DENTRO del núcleo (zona sin
  objetos clave): si sólo abre el exterior, el modelo conserva el borde del lienzo y deja una línea. Fundir el núcleo
  dentro de esa franja repintada y verificar con perfil de luminancia por fila en las uniones.
- **Segundo color o variante de un asset 3D aprobado → editar el render aprobado, no regenerar.** Cambiar SÓLO
  material y fondo (en escenas, sólo material). La nave blanca generada desde cero salió plana y con cortes difusos
  y fue rechazada; la recoloreada desde cada render navy conservó geometría, cortes y cámara.
- **Ángulos extremos (gusano, picado, gran angular, sobrevuelo) necesitan guía de perspectiva como imagen 1.** Con
  la cámara sólo en texto el modelo devuelve casi frontal. Guía = silueta oficial extruida y proyectada con cámara
  real (`ai-generations/2026-09-17_efeonce-ship-3d/guias/proyectar.mjs`), «copiar cámara, no su aspecto plano»;
  base 3D aprobada como imagen 2 y logo como 3. La isométrica siguió frontal; una vista inferior pura de un logo
  plano sólo muestra su canto.
- **Recorte de objeto claro sobre fondo oscuro:** `pnpm ai:image:rmbg` deja OPACOS los huecos que muestran el fondo
  (cortes, ventanas): usar `pnpm ai:image:rmbg <in> <out> --key-background [umbral] [minPx]` (opt-in; 42/30 por
  defecto, 30/800 en fondo claro desenfocado o macro; no usar si el sujeto tiene zonas del color del fondo). Revisar
  siempre sobre fondo de contraste fuerte con zoom 100 %. Escenas claras sobre fondo claro y macros desenfocados no se recortan: se entregan como escena.
  Método completo: [isotipo propio en 3D con dos colores](references/mascot-3d-pose-library.md#isotipo-propio-en-3d-con-dos-colores-caso-nave-de-efeonce).
- **Logo completo de marca como objeto en una escena → kit Blender como píxeles exactos; el modelo nunca dibuja las
  letras.** Escala, cámara y luz salen del manifiesto. **Por defecto, pasada directa:** el render entra como imagen 1
  y aporta la **forma**; el prompt aporta la **intención** (material, montaje, escena, cámara, atmósfera). Aplica al
  logo grande en cuadro, al **cambio de material** (acero, aluminio, vidrio, neón, madera, latón) y a escenas de
  atmósfera fuerte (larga exposición, neón, contraluz). **Referencia elegida por luminancia:** render blanco para
  materiales claros, navy para oscuros o para el color de marca. **Nunca pegar el render como camino por defecto:**
  conserva el material y la luz del kit y se lee falso. El **halo enmascarado** (`--mask` que protege logo **y**
  escena, ~140 px editables) es la **excepción**: material exacto del kit + logo chico o detalle fino. QA letra por
  letra y composición determinística sólo como último recurso:
  [`references/logo-3d-reference-kit.md`](references/logo-3d-reference-kit.md).
- **Vestir a alguien con ropa de marca, o producir merch y credencial (lanyard, yoyo, portacarnet, carnet) → kit de
  referencia de prenda y merch, nunca describir la pieza en el prompt.** La vista se elige por el **ángulo de la toma** (de espaldas → vista de espalda) y se pasa junto con
  las referencias de rostro y cuerpo de la persona. El **texto de la prenda se compone determinísticamente** con los
  pesos del contrato de marca y entra como imagen 2; al modelo nunca se le pide la ortografía. Proporciones
  declaradas (emblema del pecho nunca se reduce; estampa de espalda al 38 % del ancho) + **contrato de realismo
  verbatim** en todos los prompts, o la prenda sale con aspecto de render. Si cambia el contrato se rehace la serie
  completa. Si el emblema va **bordado**, se espeja: pasar el isotipo oficial rasterizado como imagen 2 y revisar el
  pecho vista por vista al 100 %. Hoodie y polo ya existen (21 vistas cada uno, OneDrive `13- Branding/`), y **la
  prenda la elige el contexto de la escena**, no la costumbre; para una prenda nueva que se diseña desde cero,
  primero la prenda base aprobada y recién después las vistas. En **merch con arte impreso y piezas mecánicas**
  (lanyard con yoyo, portacarnet y carnet, 12 vistas en `13- Branding/Lanyard Efeonce/v01/`) valen las mismas
  reglas más tres propias: lo **plano se compone, no se genera**; la vista que debe salir **sin arte se genera sin
  referencias**; y la pieza se **nombra con precisión** (portacarnet de marco rígido ≠ portacredencial) o vuelve la
  genérica: [`references/garment-reference-kit.md`](references/garment-reference-kit.md).
- Casos: [Viva México y previa 18](../../../docs/operations/social/2026-09-16-viva-mexico-y-previa-18-production-method.md) ·
  [nave Efeonce 3D](../../../docs/operations/social/2026-09-17-efeonce-ship-3d-production-method.md).

- **Usar un kit de marca ya producido (logo 3D, nave, vestuario, credencial, gorra) en una imagen o un video:**
  [guía de uso de los kits](../../../docs/operations/social/EFEONCE_BRAND_KITS_USAGE_GUIDE_V1.md) — elección de la vista,
  contrato de referencias, QA al 100 % y las tres reglas propias del video (primer cuadro aprobado, la marca no se mueve
  dentro del plano generado, planos cortos).

## Provider Choice

- Use `openai-image` for higher prompt fidelity, complex composition, reference-guided edits, UI assets, icon sets, and transparent PNG batches.
- **OpenAI model targeting (delta 2026-09-08).** La frontera del proveedor es la familia **2.5**
  (`gpt-image-2.5-flare` por defecto, `gpt-image-2.5-sunburst` para precisión de edición). `gpt-image-2`
  **no** está deprecado y sigue siendo la elección correcta cuando necesitas Batch (2.5 no lo tiene). Corregido
  2026-09-16: el costo de 2.5 sí se estima antes de gastar y sus rate limits sí están publicados. Desde 2026-09-16 el helper
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
- **Carril Google: Nano Banana 2 vs Nano Banana Pro (revisión 2026-09-16).** El default de `google-gemini-image` es
  **Nano Banana 2** (`gemini-3.1-flash-image`, vía Vertex con `getGoogleGenAIClient`), sobreescribible con la env
  `GOOGLE_GEMINI_IMAGE_MODEL`; vive sólo en el generador del producto. **No hay CLI de Gemini Image**: `pnpm ai:image`
  habla sólo OpenAI. **Nano Banana Pro** (`gemini-3-pro-image`) está **disponible** en nuestro Vertex (`models.get`
  en location `global`, 2026-09-16: `gemini-3-pro-image` y `gemini-3-pro-image-preview` OK, `gemini-3.1-flash-image`
  OK, `gemini-3.1-pro-image` 404), pero **ninguna superficie lo usa**. No cambies la env global para probarlo:
  cambiaría todo el carril `google-gemini-image` del producto; lo correcto sería exponerlo como modelo elegible por
  pedido (no hecho, decisión del operador). Nano Banana Pro y Gemini Omni Flash van **directo por Google, nunca por
  fal** (decisión del operador), aunque fal ofrezca Omni Flash (`google/gemini-omni-flash/*`). Referencia externa: OpenArt Arena imagen (2026-09-16) ubica a Nano Banana Pro #3 y
  Nano Banana 2 #5.
- **Grok Imagine imagen v2.0 (xAI): evaluado, no conectado.** `xai/grok-imagine-image/v2.0/{text-to-image,edit}`
  en fal: `quality` low|medium, 1k/2k, 1–4 imágenes, aspectos amplios (incluye 19.5:9 y 20:9), devuelve
  `revised_prompt`; precio publicado "0,01 USD/units" con unidad no aclarada por fal. #4 en imagen en OpenArt Arena
  (2026-09-16), sobre Nano Banana 2. Conectarlo es decisión del operador.
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

Fal.ai is a programmatic media-generation aggregator — one API fronts many models: **video** (Seedance 2.5/2.0, Minimax H3, Flux 3, Kling v3, PixVerse, Veo, Grok Imagine, Runway, Luma Ray, Hailuo, Wan…; Gemini Omni does NOT run through fal — it goes direct via Google), **image** (Flux 2, krea — note: on fal, Flux 3 is a VIDEO model), **audio**, **3D**. Canonical client: `src/lib/ai/fal.ts` — `runFalModel({ model, input })` submits to the fal queue and polls to completion; model-agnostic (pass the fal slug, e.g. `bytedance/seedance-2.0/mini/image-to-video`). Secret resolves server-side via `FAL_API_KEY` / `FAL_API_KEY_SECRET_REF` — never hardcode the `<id>:<secret>` key.

- **Out-of-band, NOT runtime** (same rule as Higgsfield): generate here + upload via the canonical uploader; never wire fal into a product runtime flow (runtime image path stays `src/lib/ai/image-generator.ts`).
- **Video is the headline** — for video art direction / model choice use `motion-design-studio`; audio → `audio-studio`; model/aesthetic pick → `design-studio`. THIS skill covers still-image asset craft.
- **Provider pricing is volatile and internal to routing.** Verify the exact endpoint/model pricing at execution
  time and persist an evidence snapshot; never convert a vendor price directly into customer-facing Studio
  Credits or copy a point-in-time vendor price into a commercial offer.
- **Full model & capability catalog** (13 categories, verified slugs): `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`.

### CLI de fal: `pnpm ai:fal` (Seedream 5 + layerize, Seedance 2.5/2.0, Minimax H3, Flux 3, Wan 3.0)

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
  `--size`, `--count`, `--format jpeg|png` (sólo Seedream Pro), `--max-usd <n>`, `--yes`, `--out|--out-dir`,
  `--timeout`, `--json`. Video (`--duration`,
  `--resolution`, `--aspect`, `--bitrate`, `--task`, `--no-audio`, `--end-image`, `--audio`, `--video`,
  `--prompt-expansion`, `--no-prompt-expansion`, `--thinking`, `--web-url`, `--file`, `--lora <path>[@escala][#weight_name]`,
  `--camera-trajectory`, `--keyframe`, `--safety-tolerance`, `--draft-cache`), `--seed <n>` (entero ≥ 0; sólo en los
  endpoints que lo declaran: H3 de generación, Wan 3.0/Prime y `seedance25-r2v`; en el resto el CLI lo rechaza),
  entrenamiento (`--training-data`, `--steps`, `--rank`, `--learning-rate`, `--trigger`, `--frames`, `--split-threshold`) y la elección entre
  Seedance, H3, Flux 3 y Wan 3.0 (incluido video a video) viven en `motion-design-studio`
  (`workflows/engine-selection-by-fidelity-contract.md`). El CLI valida cada flag contra el contrato del endpoint
  **antes** de gastar: flags de video en una capacidad de imagen, o de entrenamiento fuera de un entrenador, fallan.
  `--task` quedó corregido: **sólo** Seedance 2.5 reference-to-video lo acepta (antes Seedance 2.0 lo rechazaba
  después de encolar; verificado en local (el CLI rechaza `--task` en `seedance20-r2v` sin encolar); `seedance25-r2v` con `--task reference|editing|extension` quedó verificado en real 2026-09-16.) `--list` agrupa IMAGE / VIDEO / TRAINING y marca `[NO OPERABLE POR COLA]`.
- 🔴 Todo `--capability`/`--model` sin `--list` **gasta dinero**. fal no devuelve `usage`: el CLI no reporta
  costo por corrida ni lo estima antes; no inventes precios. fal cobra **por escalón de resolución** y el precio
  del registro es el escalón más bajo: estima con la tabla por resolución de `motion-design-studio` y confirma con
  `--balance` antes y después. Si la capacidad figura SIN VERIFICAR, el CLI lo advierte antes de gastar.
- 🔴 **Bloqueo por saldo:** un 403 **`User is locked. Reason: Exhausted balance`** (o `TOP_UP`) ocurre antes de encolar
  (sin costo). El CLI ya hace failover a la otra cuenta; si **todas** están bloqueadas, recargar en
  `fal.ai/dashboard/billing` lo hace una persona (el operador), nunca el agente. No reintentes en loop.
- **Cuentas y saldo:** el CLI trabaja con dos cuentas de fal (`FAL_API_KEY`, `FAL_API_KEY_B`): usa la de más saldo y
  hace failover solo ante 403 `User is locked`. `pnpm ai:fal --balance` lista ambos saldos gratis; `--fal-account` fuerza
  una. Si todas están sin saldo, recarga una cuenta configurada (caso 2026-09-16: se recargó la B cuando el CLI sólo
  conocía la A). Un 422 de validación no prueba saldo.
- **Sin esperar:** `--detach` encola y termina (imprime `request_id`, cuenta y comandos); `--status --request-id <id>`
  consulta una vez sin costo. Webhooks de fal no se usan en el CLI (exigen URL pública).
- **Filtro de Seedance:** ByteDance rechaza tras encolar (y cobrar) referencias con marcas y material con personas reales.
  Para video a video con personas, Flux 3 o Wan 3.0. Costo: la fórmula de tokens de fal
  (`alto × ancho × segundos × 24 / 1024`) calzó con lo medido dentro de ~5 %; lo que subestimaba ~2× era la
  equivalencia de OpenArt (corregido 2026-09-16).
- **Pendientes:** LoRA de H3 (postergada por decisión del operador) y Recraft sin vía operativa (Higgsfield CLI sin sesión).
- **Retome (request_id):** el CLI imprime el `request_id` apenas fal encola. Si el polling local vence (HTTP 408)
  el trabajo **sigue corriendo y cobrando** en fal: no relances; usa el comando de retome que imprime el CLI
  (verificado: mismo archivo byte a byte; alcance de la verificación: el retome se probó en real con `h3turbo-t2v` y con un Seedance 2.5 r2v que superó la espera anterior; Seedream y Flux 3 usan el mismo código (`awaitFalRequest`) pero no tienen corrida propia de retome.) La cola se direcciona por APP (dos primeros segmentos del slug), no por
  slug completo. Timeouts por defecto: imagen 3 min, video 30 min (antes 15), entrenamiento 3 h.
- Minimax H3 (17 endpoints, 9 verificados 2026-09-16): Max Turbo / Max / base + variantes LoRA y 4 entrenadores
  (sin verificar). `h3max-director` es stream realtime: el CLI se niega a operarlo por cola. Detalle y precios en
  `motion-design-studio`.
- **Flux 3** (12 endpoints, los 12 verificados en real 2026-09-16; slugs `blackforestlabs/flux-3/*` **sin**
  `fal-ai/`): en fal es un modelo de **VIDEO**, no de imagen. Los Flux 2 de imagen (`fal-ai/flux-2-pro`,
  `flux-2-max`, `flux-2-flex`) son otros slugs y **no están conectados** al CLI: para ellos, `--model`.
  Modos: t2v, i2v, primer/último cuadro (`--image` + `--end-image`, ambos obligatorios), keyframes
  (`--keyframe <imagen>@<frame_index>`, repetible de 1 a 10; no acepta `--image`), `edit` y `extend` (origen por
  `--video`) y `flux3-enhance`; t2v, i2v, primer/último cuadro, keyframes y extend tienen además su draft barato. Flags propios: `--safety-tolerance 0-4`
  (default 2) y `--draft-cache <url>`: cada draft imprime su `draft_cache` y el comando listo, y sólo
  `flux3-enhance` lo acepta (y lo exige). `extend` exige pista de audio en el origen (el CLI lo revisa con
  `ffprobe` en archivos locales) y entrega sólo la continuación. Precios y elección en `motion-design-studio`.
- **Wan 3.0 / Wan 3.0 Prime** (6 endpoints `alibaba/wan-3.0/*` y `alibaba/wan-3.0-prime/*`, **sin** `fal-ai/`;
  conectados 2026-09-16): **video** t2v / i2v / r2v. Precio **por resolución**: base 480p 0,05 · 720p 0,10 ·
  **1080p 0,20 USD/s**; Prime 0,068 · 0,14 · **0,28** (Prime es más cara, no igual). Los 6 están **verificados en real** (2026-09-16;
  los 5 que había bloqueado el 403 de saldo se corrieron con la cuenta B). No hay edición ni imagen en Wan 3.0 (la edición de Wan es la
  2.7, no conectada). Flags propios: `--duration auto` (se envía `null`: duración inteligente; o entero 2–30),
  `--no-audio` (campo `audio`), `--no-prompt-expansion` (booleano; distinto del `--prompt-expansion <modo>` de H3),
  `--thinking`, y en r2v `--web-url <url pública>` / `--file <path|url>`, que **exigen `--thinking`**. Resolución
  default del proveedor **1080p**; sin `--resolution` el CLI envía 480p y lo avisa (para entrega pasa `720p`/`1080p`). La salida trae `actual_prompt` y `seed`. Elección y ejemplos en
  `motion-design-studio`.
  ```bash
  pnpm ai:fal --capability wan3-t2v --prompt "…" --resolution 480p --duration auto --seed 7 --out explora.mp4
  pnpm ai:fal --capability wan3-r2v --file brief.pdf --thinking --resolution 720p --out explicativo.mp4
  ```
- **Evaluados, no conectados (revisión 2026-09-16):** Kling 3 (`fal-ai/kling-video/{o3,v3}/…`, `fal-ai/kling-image/…`)
  y Grok Imagine (`xai/grok-imagine-video/…`, `xai/grok-imagine-image/…`). No están en el registro: no los corras con
  `--model` para una entrega sin decisión del operador. Detalle en `motion-design-studio` (video) y abajo (imagen).
- Seedance (validaciones del CLI corregidas 2026-09-16, leídas del OpenAPI): duración mínima **4 s** (el registro
  decía 1); `r2v` exige al menos una referencia visual (imagen o video) y valida los topes por versión (2.5: 30
  imágenes, 10 videos, 10 audios, 50 archivos; 2.0: 9, 3, 3, 12); `--task` valida el valor, `editing`/`extension`
  exigen `--video`, `editing` rechaza `--duration`/`--aspect` y `extension` rechaza `--aspect`.
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
  Seedance v1/v1.5 go **with** it (e.g. `fal-ai/bytedance/seedream/v4.5/text-to-image`). FLUX 2, Recraft,
  GPT Image, Topaz etc. keep `fal-ai/`; Flux 3 (`blackforestlabs/flux-3/*`) goes without it. With the wrong prefix the submit is accepted (200) but the **result
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
