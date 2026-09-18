# Greenhouse — Guía de selección de modelos de IA para medios V1

> **Tipo de documento:** Referencia técnica agent-facing
> **Version:** 1.3
> **Creado:** 2026-09-16 por Claude
> **Ultima actualizacion:** 2026-09-17 por Claude — v1.3: la máscara de 2.5 orienta pero no preserva: la «deriva fuera de zona 2,4/255» es una media; el 2026-09-17 la zona protegida llegó a delta máximo 221/255 (media 4,85) y se recompone desde la base. v1.2: carril **Higgsfield API** dentro de `pnpm ai:fal` (§5.8): 44 capacidades con esquema real y precio exacto por API; Recraft de Higgsfield API: SVG **sin confirmar**. v1.1: brechas de los CLIs corregidas (commit `17196ead1`): estimación de costo previa con confirmación en `ai:fal`, resolución barata por defecto, formato real, `--seed` y tope de referencias validados, flags de LoRA/entrenador; `ai:image` valida `--size`/`--background`, agrega `--format` y estima costo
> **Alcance:** todos los modelos de imagen y video disponibles en `pnpm ai:image` (OpenAI) y `pnpm ai:fal` (55 capacidades de fal + 44 de Higgsfield API), más los carriles fuera de esos CLIs y los candidatos evaluados que NO están conectados.
> **Documentación relacionada (no se duplica acá):**
> [Catálogo de modelos fal](GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md) ·
> [Generador de assets visuales](GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md) ·
> [Manual del CLI fal](../manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md) ·
> [Selección de motor por contrato de fidelidad](../../.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md)
> **Código fuente de verdad:** `src/lib/ai/fal-capabilities.ts` (registro), `src/lib/ai/higgsfield-capabilities.ts` + `higgsfield-schemas.json` (registro Higgsfield), `scripts/ai/higgsfield-lane.ts` (carril Higgsfield), `scripts/ai/fal-image.ts` (CLI `ai:fal`), `src/lib/ai/openai-image.ts` + `scripts/ai/generate-image.ts` (CLI `ai:image`), `src/lib/ai/fal.ts` (cuentas).

---

## 0. Cómo usar esta guía

Sigue siempre este orden. No saltes al comando sin pasar por el árbol.

1. **Árbol de decisión** (§2 imagen, §3 video): parte de lo que necesitas ("toma larga", "editar con personas", "capas editables") y llegas a un modelo con su alternativa y lo que debes evitar.
2. **Matriz comparativa** (§4): confirma que el modelo elegido cumple entrada, salida máxima real, duración, audio y precio **a la resolución que vas a pedir**.
3. **Ficha del modelo** (§5): lee "cuándo NO", las trampas y cómo estimar el costo antes de gastar.
4. **Receta** (§6) si tu caso está listado; **presupuesto** (§7) antes de cualquier lote.
5. **Comando**: copia el de la ficha o receta. Todo `--capability` y todo `ai:image` **gasta dinero**; `--list`, `--balance` y `--status` son gratis.

Reglas que mandan sobre cualquier tabla de esta guía:

- **Fidelidad por toma, no precio por clip.** El motor se elige por el contrato de fidelidad de la toma (qué debe quedar idéntico, qué puede interpretar el modelo); los defectos editoriales (crop, texto, grade, foley, mezcla) se arreglan en post, no regenerando. Canon: [engine-selection-by-fidelity-contract.md](../../.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md). [decisión]
- **Ningún ranking reemplaza la prueba con tu propio brief** (§9). [decisión]
- **Copy final, logotipo y texto legal se componen fuera del modelo.** Todo texto generado dentro de la imagen o el video es concept-only. El logotipo de Efeonce es `efe[isotipo]nce` completo; no confundirlo con el isotipo solo ni duplicarlo. [decisión]
- **Salidas fuera del repo público:** usa `--out`/`--out-dir` hacia `ai-generations/` o el scratchpad; nunca `public/` ni `.captures/`. Ambos CLIs, sin `--out`, escriben en `public/images/generated` [contrato]. [decisión]
- **`pnpm ai:fal` es out-of-band**: NUNCA es runtime del producto. El runtime de imagen del producto es `generateImage` (`src/lib/ai/image-generator.ts`) con providers `openai-image` (default) y `google-gemini-image`. [contrato]

---

## 1. Leyenda de evidencia

Cada dato de esta guía lleva una etiqueta. Si un dato no la tiene, trátalo como no confiable.

| Etiqueta | Significa | Cómo se obtuvo |
|---|---|---|
| **[verificado]** | Corrida real hecha por Greenhouse, con fecha | Registro `verifiedAt`, catálogo fal, evidencia en `ai-generations/` |
| **[contrato]** | Lo que declara el registro del repo, el código del CLI o el OpenAPI de cola del proveedor | `src/lib/ai/fal-capabilities.ts`, `scripts/ai/*.ts`, `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>` (leído 2026-09-16) |
| **[oficial]** | Publicado por el fabricante o por fal como hosting oficial, con URL (§12) | Leído 2026-09-16 salvo otra fecha indicada |
| **[tercero]** | Ranking, benchmark, revendedor o prensa, con URL y fecha (§12) | No es verdad del proveedor |
| **[decisión]** | Decisión del operador de Efeonce o regla interna vigente | Memoria del operador, skills y docs de arquitectura |
| **[cálculo]** | Aritmética propia sobre una fórmula o tarifa [oficial] o [contrato]; **no medida** | Se indica la fórmula usada |
| **[sin dato]** | No se encontró; no se infiere ni se rellena | — |

Precios en USD, con fecha de lectura 2026-09-16 y **escalón de resolución explícito**. Cuando el precio del registro y el publicado no coinciden, se muestran ambos.

---

## 2. Árbol de decisión — IMAGEN

Formato: *si necesitas X → usa Y · por qué · alternativa · qué evitar*.

### 2.1 Primero, el carril

| Si necesitas | Carril | Por qué |
|---|---|---|
| Un raster final para marca, UI, pieza editorial o edición con máscara | `pnpm ai:image` (OpenAI) | Máscara real, transparencia plena en 2.5, #1–#2 en Arena/AA [tercero] |
| Materialidad, atmósfera, look development, lotes baratos, capas editables | `pnpm ai:fal` (Seedream 5) | Rango de aspecto 1/16–16, Lite a USD 0,035, único con layerize [oficial] |
| Modelos propios de Higgsfield (SOUL 2, Marketing Studio) o familias que fal no expone (Ideogram 4.0, Qwen Image 3, Z-Image, PixVerse 6, LTX 2.5, Happy Horse, Kling 3.0/Omni/O3, Grok Imagine) | `pnpm ai:fal --capability hf-*` (Higgsfield API) | Precio exacto por API antes de encolar [contrato]; **ninguna generación real verificada: la cuenta de API no tiene créditos** (§5.8) |
| Vectores reales (SVG) | Recraft V4.1 vía Higgsfield CLI | GPT Image y Seedream son raster [contrato]; **hoy sin sesión** (§8). El Recraft de la **API** de Higgsfield (`hf-recraft41`): SVG **sin confirmar** (§5.8) |
| Nano Banana 2 / Pro | Google directo (Vertex) | [decisión] nunca por fal; no hay CLI (§10) |

### 2.2 Árbol

| Si necesitas | Usa | Por qué | Alternativa | Evita |
|---|---|---|---|---|
| **Pieza final con edición precisa o inpainting con máscara** | GPT Image 2.5 **Sunburst** `xhigh`/`max` + `--mask` | #1 edición en Arena (1520) y AA (1164) [tercero]; máscara PNG con alfa [oficial]; deriva media fuera de zona 2,4/255 con máscara [verificado 2026-09-16]; la media esconde picos: delta máximo 221/255 en zona protegida [verificado 2026-09-17], así que lo protegido se recompone desde la base ([paso 5](../manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md#la-mascara-no-preserva-pixeles-el-recorte-lo-haces-tu)) | 2.5 Flare (mismo costo, más rápido) | Seedream Pro Edit cuando la zona protegida debe quedar intacta: sin máscara en fal, MAE protegido 0,0458 vs 0,0308 de GPT Image 2 con máscara [verificado 2026-07-18] |
| **Generación cotidiana de calidad, rápida** | GPT Image 2.5 **Flare** `medium`/`high` | Mismo costo que Sunburst; en `high` 18,7 s vs 29,1 s, en `max` 46,0 s vs 80,6 s a 1024² [verificado 2026-09-16] | Sunburst si la pieza es de edición | Dejar el default del CLI (`gpt-image-2` `high` 1536×1024 ≈ USD 0,165): cuesta lo mismo que 2.5 `max` [cálculo] |
| **Máxima calidad OpenAI sin importar latencia** | 2.5 Sunburst `max` | `max` ≈ tokens de GPT Image 2 `high` [cálculo sobre fórmula oficial] | 2.5 Flare `max` (#1 AA texto a imagen, 1189) [tercero] | `xhigh`/`max` con `gpt-image-2`: el CLI lo rechaza antes de la red [contrato] |
| **Mínimo costo por pieza en OpenAI** | 2.5 `low` (≈ 0,006 a 1024²) o `medium` (≈ 0,013) | [cálculo] fórmula oficial | Seedream Lite (0,035 por imagen) si buscas divergencia | Esperar calidad final en `low` |
| **Descuento Batch 50 %** | GPT Image 2 por la Batch API | Único modelo con Batch [oficial] | — | Creer que `pnpm ai:image --batch` usa la Batch API: lee un JSON de prompts y llama la API normal, sin descuento [contrato] |
| **Fondo transparente nativo** | 2.5 Flare/Sunburst `--background transparent` | Soporte pleno en 2.5; sin costo extra [oficial] [verificado 2026-09-16] | GPT Image 2 (transparencia en preview) [oficial]; recorte local gratis con `pnpm ai:image:rmbg` [contrato] | Seedream Pro/Lite en fal: transparencia no expuesta [contrato] |
| **Divergencia barata de territorios / series relacionadas** | Seedream 5 **Lite** (`seedream5-lite`, `max_images` vía `--input`) | USD 0,035 por imagen efectiva [oficial]; series relacionadas [contrato] | 2.5 `medium` | Seedream Pro para explorar (0,0675–0,135) |
| **Materialidad, atmósfera, desarrollo de look** | Seedream 5 **Pro** (`seedream5-pro`) | Mayor riqueza de color, material y luz [verificado 2026-07-18]; realismo y textura declarados [oficial] | GPT Image 2.5 si hay texto o layout | Pedirle más de 2048² de área (§5.2) |
| **Fusión de varias referencias orientada a material** | `seedream5-pro-edit` (hasta 10 refs) | Retuvo mejor carácter [verificado 2026-07-18] | `seedream5-lite-edit` | Pasar más de 10 `--image`: fal usa las **últimas** 10 sin aviso [oficial] |
| **Separar una pieza en capas editables** | `seedream5-pro-layerize` | Base + hasta 16 capas PNG con alfa, nombre, z_index y bounding box [oficial]; 8 capas limpias [verificado 2026-09-16] | Ninguna conectada | Esperar que reconstruya fielmente texto pequeño: [sin dato] |
| **Resolución nativa mayor a 2K** | GPT Image 2/2.5 hasta 3840×2160 (experimental > 2560×1440) o Seedream Lite (`auto_3K`/`auto_4K`) | [oficial]; área Lite hasta 4096² según schema, ficha dice 3072² [oficial, drift] | — | Seedream **Pro** en fal: tope 2048² de área [contrato] |
| **Formatos extremos (más de 3:1)** | Seedream Pro (aspecto 1/16–16) | [oficial] | GPT Image 2 resolvió 3:1 en un pase [verificado 2026-07-18] | GPT Image más allá de 3:1: tope 1:3–3:1 [oficial] |
| **Texto multilingüe dentro de la imagen (concepto)** | Seedream 5 Pro | Texto denso multilingüe declarado, 16 idiomas de prompt incluido español [oficial] | GPT Image 2 escribió bien una frase corta en español [verificado 2026-07-18] | Entregar ese texto como final; OpenAI no declara nada multilingüe para 2.5 [oficial, ausencia] |
| **Infografía o layout denso (concepto)** | GPT Image 2.5 o Seedream Pro | 2.5 "improves infographic accuracy and layout" [oficial]; Pro "dense text into professional layouts" [oficial] | — | Confiar en datos o cifras dentro de la imagen |
| **Vectores (SVG)** | Recraft V4.1 vía Higgsfield **CLI** | Único vector real [contrato] | Recraft por fal: no conectado (§10) | Vectorizar un raster de GPT/Seedream y llamarlo vector; dar por hecho que `hf-recraft41` (API) entrega SVG: sin confirmar (§5.8) |
| **Campaña híbrida** | Seedream ↔ GPT Image 2/2.5 → video | Flujo canónico [decisión], ver §6.16 | — | Mezclar anclas de distintas campañas |

---

## 3. Árbol de decisión — VIDEO

Todo el video vive en `pnpm ai:fal`, salvo Gemini Omni Flash (Google directo, sin CLI) [decisión].

| Si necesitas | Usa | Por qué | Alternativa | Evita |
|---|---|---|---|---|
| **Explorar movimiento o actuación, barato y rápido** | `h3turbo-t2v`/`-i2v` a 480P, 5 s | Latencia medida 2,7–8 s [verificado 2026-09-16]; la H3 más barata [contrato] | `flux3-*-draft` (+ `flux3-enhance` sólo del elegido); `seedance20-mini-*` 480p | Asumir paridad de calidad Turbo = Max: [sin dato]; y usar el precio del registro sin medir (§5.5) |
| **Toma hero de máxima calidad** | `seedance25-*` (hasta 30 s) | #1 OpenArt video (1125) y lidera adherencia, estética, física y consistencia [tercero] | Wan 3.0 (#1 AA texto a video con audio) [tercero]; H3 Max (#1 AA imagen a video con audio) [tercero] | Seedance con **personas reales o marcas** en las referencias: rechazo tras encolar, **cobrado** [verificado 2026-09-16]; y 1080p de 2.5 sin probar nitidez (§5.3) |
| **Toma larga (más de 15 s)** | `seedance25-*` (≤ 30 s) o `wan3-*` (2–30 s) | [contrato] | Flux 3 (≤ 20 s) | Seedance 2.0 / H3 (≤ 15 s) [contrato]; y creer que 30 s de Wan son un solo plano: puede cortar entre encuadres [tercero] |
| **4K** | `seedance20-*` base `--resolution 4k` | Único endpoint conectado que entregó 3840×2160 [verificado 2026-09-16] | `h3-*` base 4K (reescalado desde 768P, no nativo) [contrato] | Seedance 2.0 fast/mini/us (techo 720p); Seedance 2.5, Flux 3 y Wan (techo 1080p) [contrato] |
| **Control de cámara preciso sobre una imagen fija** | `h3max-camera` | Escena congelada, sólo se mueve la cámara, trayectoria de hasta 12 keyframes [contrato] [verificado 2026-09-16] | Describir el movimiento en el prompt de cualquier i2v | Pedir acción del sujeto: el modelo congela la escena [oficial] |
| **Controlar principio y fin exactos** | `flux3-flf` (ambos cuadros obligatorios) | Contrato explícito primer + último [contrato] | `wan3-i2v`, `seedance25-i2v`, `seedance20-i2v`, `h3*-i2v` con `--end-image` | `flux3-flf --duration auto` (no acepta auto) [contrato] |
| **Pasar por varios cuadros clave** | `flux3-keyframes` (1–10, `--keyframe img@frame`) | Único con keyframes [contrato] [verificado 2026-09-16] | Encadenar varios flf | Índices fuera del largo del clip (24 fps × segundos) |
| **Editar un video existente, sin personas ni marcas** | `seedance25-r2v --task editing` | Cambió un viñedo a nieve conservando encuadre [verificado 2026-09-16] | `flux3-edit` | Pasar `--duration`/`--aspect` (el CLI los rechaza: el proveedor fuerza auto) [contrato] |
| **Editar un video con personas o marcas** | `flux3-edit` | USD 0,03/s, conserva movimiento y encuadre [contrato] [verificado]; sin filtro tipo Seedance observado [verificado] | Wan 3.0 r2v usando el video como referencia (no es edición) | Seedance (filtro ByteDance, cobrado) [verificado] |
| **Extender un video** | `seedance25-r2v --task extension` (sin personas/marcas) | Continuó el movimiento y reveló los Andes [verificado 2026-09-16] | `flux3-extend` (origen **con audio**; entrega sólo la continuación) | `flux3-extend` sobre un clip sin pista de audio: 422 tras encolar [verificado]; el CLI lo revisa con ffprobe [contrato] |
| **Muchas referencias multimodales** | `seedance25-r2v` (30 img · 10 video · 10 audio) | Mayor cupo [contrato] | `wan3-r2v` (10/5/5) · `h3*-r2v` (9/3/3) · `seedance20-r2v` (9/3/3, video sólo guía) | Enviar sólo audio: exige al menos una imagen o video [contrato] |
| **Video basado en una página web o un documento** | `wan3-r2v --thinking --web-url` / `--file` | Único con esa entrada [contrato]; `--web-url` verificado sobre efeoncepro.com [verificado 2026-09-16] | Escribir el guion a mano y usar t2v | Esperar un teaser narrativo sin prompt con guion: salió animación de la portada [verificado]; `--file` sin corrida real [sin dato] |
| **Consistencia de personaje/producto entre tomas** | Referencias (r2v) en Seedance 2.5 / Wan 3.0 / H3 | Único camino operativo hoy [contrato] | LoRA de H3 (postergada [decisión]); Higgsfield Soul ID (otro carril, skill motion-design-studio) | Seedance con rostros reales (filtro) [verificado] |
| **Sólo mover la cámara con la escena quieta** | `h3max-camera` | [contrato] | — | — |
| **Diálogo con lip sync** | Seedance 2.x (diálogo entre comillas) o Flux 3 | Declarado [oficial] | Wan 3.0 (declarado, lip sync débil según terceros) [tercero] | Prometer diálogo en español sin probarlo (fal dice "inglés principal" para Flux 3) [oficial] |
| **Video con residencia de procesamiento en EE. UU.** | `seedance20-us-*` | "US hosted version" [oficial]; +20 % por token y techo 720p [contrato] | — | Elegirla por calidad: no hay diferencia declarada [oficial] |
| **Prompt exacto, sin reinterpretación** | `wan3-* --no-prompt-expansion` o H3 base `--prompt-expansion disabled` | [contrato] | — | H3 Max/Turbo: expansión obligatoria (el CLI envía `balanced`) [contrato] |
| **Video sin audio** | `--no-audio` en Seedance, Flux 3 y Wan | [contrato] | Quitar la pista en post | H3: **no tiene toggle y siempre entrega audio** [contrato] |
| **Stream en tiempo real dirigido** | Ninguno operable | `h3max-director` exige cliente realtime AsyncAPI, no cola [contrato] [oficial] | — | Intentarlo con el CLI (se detiene) [contrato] |

**Audio generado = provisional.** Seedance, Wan, Flux 3 y H3 generan audio; si la pieza tiene diseño sonoro, reemplázalo en post. [decisión]

---

## 4. Matrices comparativas

### 4.1 Imagen

| Modelo / id | Carril / CLI | Entradas | Salida máx. real | Transparencia | Controles especiales | Precio (escalón) | Latencia medida | Estado | Ranking (§9) |
|---|---|---|---|---|---|---|---|---|---|
| GPT Image 2.5 Sunburst `gpt-image-2.5-sunburst` (+ `-2026-09-08`) | OpenAI · `ai:image` | Prompt ≤ 32.000 car.; hasta 16 imágenes < 50 MB; máscara PNG alfa [oficial] | 3840×2160 (borde ≤ 3840, área ≤ 8.294.400; > 2560×1440 experimental) [oficial] | Plena [oficial] | Calidad `low…max`; `--mask`; `n` vía `--count` = N pedidos (el CLI lo avisa) [contrato] | Por tokens de salida: 1024² `high` ≈ 0,053 · `max` ≈ 0,211 [cálculo] | 1024²: low 11,6 s · high 29,1 s · max 80,6 s [verificado 2026-09-16] | Conectado, en uso | Arena T2I #1, edit #1; AA T2I #2, edit #1 [tercero] |
| GPT Image 2.5 Flare `gpt-image-2.5-flare` (+ snapshot) | OpenAI · `ai:image` | Igual que Sunburst [oficial] | Igual [oficial] | Plena [oficial] | Igual; única diferencia de API es `model` [oficial] | Idéntico a Sunburst [verificado 2026-09-16] | 1024²: low 13,3 s · high 18,7 s · max 46,0 s [verificado 2026-09-16] | Conectado | Arena T2I #2, edit #2; AA T2I #1, edit #2 [tercero] |
| GPT Image 2 `gpt-image-2` (+ `-2026-04-21`) | OpenAI · `ai:image` (**default del CLI**) | Igual; `input_fidelity` se omite [oficial] | Igual [oficial] | Preview [oficial] | Calidad `low/medium/high/auto`; único con Batch API [oficial] | 1536×1024 `high` ≈ 0,165; `medium` ≈ 0,041 [oficial] | `medium` 34–58 s por job [verificado 2026-07-18]; `high` puede superar 125 s [contrato] | Conectado; "Earlier GPT Image models" [oficial] | Arena T2I #3; OpenArt #2 [tercero] |
| Seedream 5.0 Pro `seedream5-pro` | fal · `ai:fal` | Prompt (recomendado ≤ 600 palabras inglés [oficial]) | Área 1024²–2048² (`auto_1K`, `auto_2K`, WxH); aspecto 1/16–16 [contrato] | No expuesta en fal [contrato] | `--format jpeg|png` (default **jpeg**); `--count` 1–6; sin seed [contrato] | 0,0675 (≤ 1536²) · 0,135 (1536²–2048²) [oficial, "tentative"] | 56,8 s [verificado 2026-09-16] | Verificada 2026-09-16 | OpenArt #1; Arena T2I #10; AA T2I #15 [tercero] |
| Seedream 5.0 Pro Edit `seedream5-pro-edit` | fal · `ai:fal` | Prompt + hasta 10 `--image` (≤ 30 MB) [oficial] | Igual que Pro [contrato] | No [contrato] | Sin máscara; edición sólo por lenguaje [contrato] | 0,0675/0,135 por salida + 0,0045 por referencia adicional (la primera gratis) [oficial] | 116,2 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena edit #8; AA edit #9 [tercero] |
| Seedream 5.0 Pro Layerize `seedream5-pro-layerize` | fal · `ai:fal` | 1 imagen png/jpeg 512²–6000², ≤ 30 MB; prompt opcional con `<bbox>` [contrato] | Base + hasta 16 capas PNG con alfa + `layers.json` [contrato] | Sí, por capa [verificado] | `image_size` `auto|auto_1K|auto_1.5K|auto_2K`; `enhance_prompt_mode` vía `--input` [contrato] | 0,03375/capa (área < 1536²) · 0,0675/capa (> 1536²) [oficial]; si la base cuenta como capa [sin dato] | 83,2 s [verificado 2026-09-16] | Verificada 2026-09-16 | — |
| Seedream 5.0 Lite `seedream5-lite` | fal · `ai:fal` | Prompt | Área 2560×1440–4096² según schema; ficha dice 3072² [oficial, drift] | No [contrato] | `max_images` 1–6 vía `--input`; PNG; devuelve seed [contrato] | 0,035 por imagen efectiva [oficial] | 43,8 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena T2I #37; AA T2I #43 [tercero] |
| Seedream 5.0 Lite Edit `seedream5-lite-edit` | fal · `ai:fal` | Prompt + hasta 10 refs en fal [contrato] | Igual que Lite [contrato] | No | `max_images` vía `--input` [contrato] | 0,035 por imagen [oficial] | 53,5 s [verificado 2026-09-16] | Verificada 2026-09-16 | Arena edit #26; AA edit #20 [tercero] |

### 4.2 Video

Precio: **registro** = lo que guarda `fal-capabilities.ts` (escalón más bajo de la API de pricing de fal) · **publicado** = página del modelo o fabricante por resolución. Si difieren, manda el publicado hasta medir con `--balance` (§7).

| Familia · ids | Entradas | Salida máx. real | Duración | fps | Audio | Referencias | Controles especiales | Precio registro → publicado por escalón | Latencia | Estado | Ranking (§9) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Seedance 2.5** · `seedance25-t2v`, `-i2v`, `-r2v` | Texto · imagen (+ `--end-image`) · refs [contrato] | 1080p en OpenAPI, **no verificado**; la tabla de la ficha lista sólo 480p/720p [oficial, contradicción] | 4–30 s o `auto` [contrato] | 24 [oficial] | Sí, `--no-audio` [contrato] | 30 img · 10 video (1,8–30,2 s c/u, ≤ 30,2 s total) · 10 audio [contrato] | `--task reference|editing|extension` (único), `--bitrate`, `--aspect` [contrato] | 0,0214/1.000 tokens → 480p ≈ 0,2205/s · 720p ≈ 0,4730/s · 1080p ≈ 1,164/s; con videos de referencia 720p ≈ 0,2838/s, 480p ≈ 0,1323/s [oficial] | r2v reference > 15 min [verificado] | Verificadas 2026-09-16 (a 480p) | OpenArt #1 [tercero] |
| **Seedance 2.0 base** · `seedance20-t2v`, `-i2v`, `-r2v` | Igual [contrato] | **4K 3840×2160** [verificado 2026-09-16]; nativo o reescalado [sin dato] | 4–15 s o `auto` | 24 | Sí, `--no-audio` | 9 img · 3 video (2–15 s total, 480p–720p) · 3 audio; **video sólo guía**, sin `--task` [contrato] | `--bitrate`, multi-shot dentro de la generación [oficial] | 0,014/1.000 tokens → 720p 0,3024/s [oficial]; 480p ≈ 0,141/s · 1080p ≈ 0,685/s · 4K ≈ 2,72/s [cálculo] | "menos de 2 minutos" [oficial] | Verificadas 2026-09-16 | OpenArt #3; AA I2V con audio #2 (720p) [tercero] |
| **Seedance 2.0 fast** · `seedance20-fast-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | `--bitrate`; "Output quality: Same" que base según fal [oficial] | 0,0112/1.000 tokens → 480p ≈ 0,1125/s · 720p 0,2419/s [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **Seedance 2.0 mini** · `seedance20-mini-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | **Sin** `--bitrate` [contrato] | 0,007/1.000 tokens → 480p ≈ 0,0721/s · 720p ≈ 0,1547/s [oficial] | [sin dato] | Verificadas 2026-09-16 | OpenArt #4 [tercero] |
| **Seedance 2.0 us** · `seedance20-us-*` | Igual | 720p [contrato] | 4–15 s | 24 | Sí | 9/3/3 [contrato] | Hospedada en EE. UU. [oficial] | 0,0168/1.000 tokens → 480p 0,1731/s · 720p 0,37/s [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **H3 base** · `h3-t2v`, `-i2v`, `-r2v` | Texto · imagen (+ `--end-image`, sin `--aspect`) · refs [contrato] | 480P/768P nativos; **2K y 4K reescalados desde 768P** [contrato] | 5–15 s enteros [contrato] | 24 [oficial] | **Siempre, sin toggle**; estéreo 48 kHz [contrato] [oficial] | 9 img · 3 video · 3 audio [contrato] | `--prompt-expansion disabled|fast|balanced|quality` (opcional); resolución en MAYÚSCULAS [contrato] | 0,05/s → 480P 0,05 · 768P 0,06 · **2K 0,13** · 4K 0,16 [oficial] | [sin dato] | Verificadas 2026-09-16 | OpenArt #7; AA T2V con audio #4 [tercero] |
| **H3 Max** · `h3max-t2v`, `-i2v`, `-r2v` | Igual | 480P/768P nativos; 1080P refinado desde 768P [contrato] | 5–15 s | 24 | Siempre | 9/3/3 [contrato] | Expansión **obligatoria** (`balanced` por defecto del CLI) [contrato]; post-entrenado por fal, no por MiniMax [oficial] | 0,025/s → 480P 0,025 · 768P 0,04 · 1080P 0,08 (rotulados "50% off": promo o lista [sin dato]) [oficial] | 5 s en < 3 s declarado [oficial] | Verificadas 2026-09-16 | AA I2V con audio **#1**, T2V con audio #3 [tercero] |
| **H3 Max camera** · `h3max-camera` | 1 imagen; prompt opcional [contrato] | 1080P [contrato] | 5–15 s | 24 | Siempre | — | `--camera-trajectory` ≤ 12 keyframes `{distance, elevation −90..90, azimuth, time 0..1}`; unidades de distance/azimuth [sin dato] [contrato] | 0,025/s registro; escalones publicados [sin dato] | [sin dato] | Verificada 2026-09-16 | — |
| **H3 Max Turbo** · `h3turbo-t2v`, `-i2v` | Texto · imagen [contrato] | 1080P [contrato] | 5–15 s | 24 | Siempre | — | Expansión obligatoria [contrato] | 0,0125/s registro → 768P 0,02 (promo 0,01) · 1080P 0,04 (promo 0,02); 480P no listado [oficial]; **registro no calza: medir** | 2,7–8 s [verificado 2026-09-16] | Verificadas 2026-09-16 | Sin presencia [tercero] |
| **H3 LoRA** · `h3-t2v-lora`, `h3-i2v-lora`, `h3-r2v-lora` | Igual que base + `--lora path@escala` (≤ 3, escala 0–4) [contrato] | 2K/4K reescalados [contrato] | 5–15 s | 24 | Siempre | 9/3/3 (r2v) | `--lora path@escala#weight_name` [contrato] | 0,0625/s registro; escalones [sin dato] | [sin dato] | **SIN VERIFICAR** | — |
| **H3 entrenadores** · `h3-train-t2v`, `-i2v`, `-flf2v`, `-ref2va` | `.zip` de clips (`--training-data`) [contrato] | `lora_file` .safetensors + `config_file` [oficial] | — | — | Entrena video+audio (`t2va`) [oficial] | — | `--steps` (1–15000 contrato; página 1–6000 [contradicción]), `--rank 8…128`, `--learning-rate`, `--trigger` [contrato] | t2v 0,005/step · i2v/flf2v 0,01 · ref2va 0,015; **mínimo 100 steps** [oficial] | Espera CLI hasta 3 h [contrato] | **SIN VERIFICAR** | — |
| **H3 Max Director** · `h3max-director` | Prompt, primer/último cuadro, audio objetivo [oficial] | [sin dato] | Sesión hasta 15 min [oficial] | — | — | — | Stream realtime | 0,08/s lista · 0,02/s promo · 1080p 2× · mínimo USD 1,20 [oficial] | Realtime | **NO OPERABLE** por cola | — |
| **Flux 3** final · `flux3-t2v`, `-i2v`, `-flf`, `-keyframes` | Texto · imagen · primer+último (ambos obligatorios) · 1–10 keyframes [contrato] | 720p/1080p en fal (BFL directo hasta 3840×2176) [oficial] | `auto` o 5–20 s (flf y keyframes sin `auto`) [contrato] | 24 [verificado] | Sí, `--no-audio` [contrato] | — | `--safety-tolerance 0–4` (default 2) [contrato] | 0,085/s registro → **720p 0,17 · 1080p 0,29** [oficial BFL y fal] | 40 s–4 min [verificado] | Verificadas 2026-09-16 | OpenArt #6; ausente en AA [tercero] |
| **Flux 3 draft** · `flux3-t2v-draft`, `-i2v-draft`, `-flf-draft`, `-keyframes-draft` | Igual, sin `--resolution` [contrato] | Borrador 1280×704 [verificado] | Igual | 24 | Sí | — | Devuelve `draft_cache` [contrato] | 0,03/s registro → **0,06/s** publicado [oficial] | [sin dato] | Verificadas 2026-09-16 | — |
| **Flux 3 enhance** · `flux3-enhance` | `--draft-cache <url>` (sin prompt, duración, resolución ni aspect) [contrato] | 1920×1088 [verificado] | Hereda | 24 | Hereda | — | "sin reinterpretar", misma semilla y movimiento [oficial] | 0,085/s registro; publicado [sin dato] (riesgo 2×, ver §7) | [sin dato] | Verificada 2026-09-16 | — |
| **Flux 3 edit** · `flux3-edit` | `--video` (MP4/MOV/WebM/M4V/GIF, < 15 s) [contrato] [oficial] | 720p [oficial] | Hereda | 24 | Conserva audio [sin dato] | — | Re-render por prompt conservando movimiento y encuadre [contrato] | 0,03/s registro = 0,03/s publicado (720p) [oficial] | ~5 min [oficial] | Verificada 2026-09-16 | — |
| **Flux 3 extend** · `flux3-extend`, `flux3-extend-draft` | `--video` **con pista de audio**, < 50 MB [contrato] | 720p/1080p [contrato] | `--duration` = segundos **nuevos** (5–20 o `auto`; `auto` entregó 15 s) [contrato] [verificado] | 24 | Sí | — | Usa hasta 4 s de video+audio como contexto; entrega **sólo la continuación** [oficial] [verificado] | extend 0,205/s registro → **720p 0,41 · 1080p 0,53** [oficial]; extend-draft 0,06/s registro, publicado [sin dato] | [sin dato] | Verificadas 2026-09-16 | — |
| **Wan 3.0** · `wan3-t2v`, `-i2v`, `-r2v` | Texto · imagen (prompt opcional, `--end-image`) · refs; web/documento en r2v [contrato] | 1080p (default del proveedor; el CLI envía 480p si omites `--resolution`) [contrato] | 2–30 s o `auto` (se envía `null`; verificado → 5,04 s) [contrato] [verificado] | **30** [oficial] | Sí, `--no-audio` [contrato] | 10 img · 5 video (≤ 15 s total, ≥ 16 fps) · 5 audio [contrato] | `--thinking`, `--web-url`, `--file` (r2v), `--no-prompt-expansion`, `--seed` [contrato] | 0,05/s registro → 480p 0,05 · 720p 0,10 · **1080p 0,20** [oficial] | Sin expansión ahorra 20–60 s [contrato]; típica 1–5 min [tercero] | Verificadas 2026-09-16 (`--file` sin corrida) | OpenArt #2; AA T2V con y sin audio **#1** [tercero] |
| **Wan 3.0 Prime** · `wan3prime-t2v`, `-i2v`, `-r2v` | Igual que base [contrato] | 1080p [contrato] | Igual | 30 | Igual | Igual | Igual; "versión acelerada" [oficial] | 0,05/s registro → 480p 0,068 · 720p 0,14 · **1080p 0,28** (más cara que base) [oficial] | Más rápida [oficial]; "hasta 7×" [tercero]; sin medir | Verificadas 2026-09-16 | No figura [tercero] |

---

## 5. Fichas por familia

Cada ficha: qué es · cuándo SÍ · cuándo NO · capacidades y límites · contenido · precio y estimación · comando · trampas · estado · fuentes.

### 5.1 OpenAI GPT Image 2.5 Sunburst / Flare y GPT Image 2 (`pnpm ai:image`)

**Qué es.** Sunburst: "most capable model for image generation and editing", posicionado donde la precisión de edición importa más. Flare: "fastest model for high-quality, everyday image generation", propuesto como opción por defecto. GPT Image 2: generación anterior, no deprecada, bajo "Earlier GPT Image models". Para integraciones nuevas OpenAI recomienda 2.5 [oficial]. Entre Sunburst y Flare la única diferencia de API es `model` y cuestan igual [oficial] [verificado 2026-09-16].

| id | Uso interno recomendado |
|---|---|
| `gpt-image-2.5-sunburst` / `gpt-image-2.5-sunburst-2026-09-08` | Pieza final con edición precisa, inpainting con máscara, multi-turno |
| `gpt-image-2.5-flare` / `gpt-image-2.5-flare-2026-09-08` | Generación cotidiana, iteración rápida, transparente |
| `gpt-image-2` / `gpt-image-2-2026-04-21` | Default del CLI y del runtime; único con Batch API; evitar como elección nueva salvo Batch |

**Cuándo SÍ.** Raster final de marca/UI/editorial; edición localizada con máscara; transparencia nativa; tamaños grandes hasta 3840×2160; layouts e infografías de concepto.
**Cuándo NO.** Vectores (raster siempre) [contrato]; formatos más allá de 3:1 [oficial]; texto final dentro de la imagen ("can still struggle with precise text placement and clarity") [oficial]; consistencia estricta de personaje o marca entre piezas (limitación vigente en la guía) [oficial]; deepfakes de personas reales (violan la política) [oficial].

**Capacidades y límites.**

| Aspecto | 2.5 (Sunburst/Flare) | GPT Image 2 |
|---|---|---|
| Prompt | ≤ 32.000 caracteres [oficial] | igual |
| Imágenes de entrada | ≤ 16, < 50 MB c/u [oficial] [contrato] | igual |
| Formatos de entrada en edits | [sin dato] | [sin dato] |
| Máscara | PNG con alfa, mismas dimensiones y formato que la primera imagen; transparente = editable; guía, no matte exacto [oficial]; el CLI la valida con `sharp` antes de gastar [contrato] | igual |
| `input_fidelity` | No existe [oficial]; el CLI lo ignora en silencio [contrato] | Se omite [oficial] |
| Tamaños | recomendados `1024x1024`, `1536x1024`, `1024x1536`, `auto`; custom múltiplos de 16, ratio 1:3–3:1, borde ≤ 3840, área 655.360–8.294.400, > 2560×1440 experimental [oficial] | igual + populares 2048×2048, 2048×1152, 3840×2160, 2160×3840 [oficial] |
| Calidad | `low`, `medium`, `high`, `xhigh`, `max`, `auto` [oficial] | `low`, `medium`, `high`, `auto` [oficial] |
| Transparencia | Plena, PNG/WebP [oficial] | Preview [oficial] |
| Formato | PNG/JPEG/WebP en API [oficial]; el CLI acepta `--format png|jpeg|webp` o lo deduce de la extensión de `--out` (png si no hay pista); `transparent` + `jpeg` se rechaza [contrato] | igual |
| Batch API | No [oficial] | Sí, mitad de precio [oficial] |
| Provenance | C2PA + SynthID [oficial] | C2PA; SynthID [sin dato] |
| Rate limits | T1 100.000 TPM/5 IPM · T2 250.000/20 · T3 800.000/50 · T4 3.000.000/150 · T5 8.000.000/250 [oficial] | igual [oficial] |
| ZDR | [sin dato] | [sin dato] |
| Tope de `n` por request | [sin dato]; el helper lo fija en 1 [contrato] | igual |

**Políticas de contenido.** Moderación de entrada y salida; error `moderation_blocked` con `moderation_details`: no reintentes sin cambiar el prompt [oficial]. `moderation` `auto|low` existe en API [oficial] pero el CLI no tiene flag [contrato]. System card 2.5: la mejora en "unsafe presented" no es estadísticamente significativa y "Abuse" empeora vs 2.0 [oficial]. Puede exigirse API Organization Verification [oficial]. Política específica de marcas para 2.5: no publicada [oficial, ausencia]. Regla interna: nunca reproducir un trademark, salvo logos de cliente bajo TASK-999 [decisión].

**Precio y estimación antes de gastar.**
Tarifas por 1M tokens (Standard), iguales para las tres: imagen entrada 8,00 · imagen en caché 2,00 · **imagen salida 30,00** · texto entrada 5,00 · texto en caché 1,25. Batch sólo `gpt-image-2`: imagen 4,00/1,00/15,00; texto 2,50/0,625 [oficial, pricing 2026-09-16].

Fórmula oficial de tokens de salida (calculadora de la guía de OpenAI, cubre 2.5 aunque la ficha de 2.5 todavía diga que no: **contradicción oficial vigente**; la fórmula reproduce exactamente las 7 mediciones del repo: 196 / 1.756 / 7.024 tokens en `low` / `high` / `max` a 1024²) [oficial] [verificado 2026-09-16]:

```text
G (lado largo en celdas):
  gpt-image-2   → low 16 · medium 48 · high 96
  gpt-image-2.5 → low 16 · medium 24 · high 48 · xhigh 64 · max 96
lado_corto     = redondeo(G / (lado_mayor_px / lado_menor_px))     # .5 redondea a par
tokens_salida  = ceil(G × lado_corto × (2.000.000 + ancho × alto) / 4.000.000)
costo_salida   = tokens_salida × 30 / 1.000.000
costo_total    = costo_salida + tokens_imagen_entrada × 8 / 1.000.000 + tokens_texto × 5 / 1.000.000
```

Equivalencias: 2.5 `high` = GPT Image 2 `medium`; 2.5 `max` = GPT Image 2 `high` en tokens [cálculo]. `auto` no es estimable [oficial].

Costo de salida por imagen (USD) [cálculo sobre la fórmula; coincide con la tabla oficial de GPT Image 2]:

| Calidad | 1024×1024 | 1536×1024 / 1024×1536 | 2048×1152 | 2048×2048 | 3840×2160 |
|---|---:|---:|---:|---:|---:|
| 2.5 `low` / GPT Image 2 `low` | 0,0059 | 0,0047 | 0,0047 | 0,0119 | 0,0111 |
| 2.5 `medium` | 0,0132 | 0,0103 | 0,0110 | 0,0268 | 0,0260 |
| 2.5 `high` = GPT Image 2 `medium` | 0,0527 | 0,0412 | 0,0424 | 0,1070 | 0,1001 |
| 2.5 `xhigh` | 0,0937 | 0,0738 | 0,0753 | 0,1903 | 0,1779 |
| 2.5 `max` = GPT Image 2 `high` | 0,2107 | 0,1646 | 0,1695 | 0,4282 | 0,4003 |

- Un tamaño no cuadrado mayor puede costar menos que uno menor (2048×1152 `low` = 157 tokens < 1024² = 196) [oficial] [cálculo].
- **Editar no abarata:** la imagen base suma ~1.024 tokens de entrada a 1024²; editar = 2,3× generar en `low`, ~1,15× en `high`, ~1,04× en `max`; la máscara no cambia el `usage` [verificado 2026-09-16, Flare `low`].
- Transparente no cuesta extra [verificado 2026-09-16].
- `partial_images` suma 100 tokens de salida cada una [oficial]; el helper no lo permite [contrato].
- El CLI imprime `usage` (tokens de entrada imagen/texto, salida, total) por pieza [contrato]: úsalo para validar tu estimación después.
- `--count N` = **N pedidos pagados** secuenciales; el CLI lo avisa (`⚠ --count N: son N pedidos separados…`) [contrato].
- **Estimación del CLI (desde 2026-09-16, commit `17196ead1`):** antes de pedir, `ai:image` imprime `$ costo estimado ≈ USD X (N × tokens × USD 30/1M; la entrada suma aparte)` con esta misma fórmula. No estima con `--size auto` ni con modelos sin grilla publicada, y **no pide confirmación**: sólo informa [contrato].

**Comandos.**

```bash
# Generación cotidiana (Flare, high, horizontal)
pnpm ai:image --prompt "<descripción>" --model gpt-image-2.5-flare --quality high --size 1536x1024 --out ai-generations/2026-09-16_mi-pieza/kv.png

# Pieza final con edición precisa (Sunburst, xhigh)
pnpm ai:image --image base.png --prompt "<qué cambia + qué debe quedar idéntico>" --model gpt-image-2.5-sunburst --quality xhigh --out ai-generations/2026-09-16_mi-pieza/kv-final.png

# Inpainting con máscara (PNG con alfa, mismas dimensiones y formato que la primera --image)
pnpm ai:image --image base.png --mask mask.png --prompt "<qué va en la zona transparente>" --model gpt-image-2.5-sunburst --quality high --out ai-generations/2026-09-16_mi-pieza/inpaint.png

# Fondo transparente
pnpm ai:image --prompt "<objeto aislado>" --model gpt-image-2.5-flare --quality high --size 1024x1024 --background transparent --out ai-generations/2026-09-16_mi-pieza/icono.png

# Lote desde JSON [{ "filename": "a.png", "prompt": "<texto>" }] (API normal, sin descuento Batch)
pnpm ai:image --batch conceptos.json --model gpt-image-2.5-flare --quality medium --out-dir ai-generations/2026-09-16_lote

# Recorte de fondo local de una imagen existente (sin costo)
pnpm ai:image:rmbg
```

Flags reales de `ai:image` [contrato]: `--prompt`, `--prompt-file`, `--batch`, `--image` (repetible), `--mask`, `--input-fidelity`, `--out`, `--out-dir`, `--concept`, `--task`, `--size`, `--quality`, `--background`, `--format`, `--model`, `--count`, `--timeout` (default 280000 ms), `--open`, `--help`. Defaults: `gpt-image-2` · `1536x1024` · `high` · `opaque` · `public/images/generated`.

**Trampas.** Ver §8.1: `--count` = N pedidos pagados; `--input-fidelity` ignorado; sin `--moderation`; default de salida en `public/`. Ya no son trampas (commit `17196ead1`): `--size` se valida en local (2/2.5: `auto` o WxH múltiplos de 16, borde ≤ 3840, relación ≤ 3:1, área 655.360–8.294.400; 1.5/1/mini: sólo `1024x1024`, `1536x1024`, `1024x1536` o `auto`), `--background` se valida y existe `--format`. Deprecaciones de modelos anteriores que el CLI aún acepta: `gpt-image-1` retira 2026-10-23; `gpt-image-1.5` y `gpt-image-1-mini` 2026-12-01 [oficial].

**Estado.** Conectados. Línea base de consumo 2.5 medida 2026-09-16 (7 piezas 1024²) [verificado]; canary transparente GPT Image 2 2026-08-21 [verificado].
**Fuentes.** O1–O8 (§12).

---

### 5.2 Seedream 5.0 Pro, Pro Edit, Pro Layerize, Lite, Lite Edit (`pnpm ai:fal`)

**Qué es.** Seedream 5.0 Pro (ByteDance Seed, lanzado 2026-07-08): generación de alta precisión con control de posición y elementos; mejoras declaradas en infografías/texto denso, edición de precisión, realismo de retrato y multilingüe nativo [oficial]. Seedream 5.0 Lite: generación rápida de calidad para publicidad creativa [oficial fal]; fecha de lanzamiento [sin dato] (terceros en conflicto).

| id | slug | Uso |
|---|---|---|
| `seedream5-pro` | `bytedance/seedream/v5/pro/text-to-image` | Materialidad, atmósfera, desarrollo de look |
| `seedream5-pro-edit` | `bytedance/seedream/v5/pro/edit` | Edición semántica regional y fusión de hasta 10 referencias |
| `seedream5-pro-layerize` | `bytedance/seedream/v5/pro/layerize` | Descomposición en capas editables |
| `seedream5-lite` | `bytedance/seedream/v5/lite/text-to-image` | Divergencia barata, lotes, series |
| `seedream5-lite-edit` | `bytedance/seedream/v5/lite/edit` | Edición barata por referencia |

**Cuándo SÍ.** Look development, materialidad y luz; exploración masiva barata (Lite); fusión multirreferencia; formatos extremos (aspecto 1/16–16); separar una pieza en capas (único); texto multilingüe de concepto.
**Cuándo NO.** Proteger píxeles fuera de una zona (sin máscara en fal) [contrato] [verificado]; transparencia (no expuesta en fal) [contrato]; reproducibilidad (sin seed de entrada) [contrato]; resolución mayor a 2048² con **Pro** [contrato]; vectores.

**Capacidades y límites.**

| Aspecto | Pro T2I | Pro Edit | Pro Layerize | Lite T2I | Lite Edit |
|---|---|---|---|---|---|
| Prompt | requerido | requerido | **opcional**; acepta `<bbox>l t r b</bbox>` 0–1000 | requerido | requerido |
| Referencias | — | hasta 10 (más → el CLI lo rechaza en local) | 1 imagen png/jpeg 512²–6000², ≤ 30 MB, aspecto 1/16–16 | — | hasta 10 en fal |
| Tamaño | enum `square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, auto_1K, auto_2K` o WxH; área 1024²–2048²; default `auto_2K` | igual | `auto`, `auto_1K`, `auto_1.5K`, `auto_2K` | enum + `auto_2K/3K/4K`; área 2560×1440–4096² (ficha: 3072²); reescala solo si no cumple | igual que Lite |
| Formato | **jpeg (default)** \| png | igual | capas PNG con alfa | PNG | PNG |
| Imágenes por pedido | `num_images` 1–6 (`--count`) | igual | base + ≤ 16 capas con `name`, `description`, `z_index`, `bounding_box` | `num_images` 1–6 × `max_images` 1–6 | igual |
| Seed | ni entrada ni salida | igual | — | devuelve seed; sin entrada | igual |
| Máscara / transparencia | No | No | Alfa por capa | No | No |
| Marca de agua | fal no la expone; si la aplica [sin dato] | — | — | — | — |

Todo [contrato] (OpenAPI de fal 2026-09-16), salvo la ficha de Lite [oficial]. ModelArk (ByteDance directo) documenta capacidades de Pro que fal **no expone**: fondo transparente en imagen a imagen, edición por `<point>`/`<bbox>` y trazos, 1.5K al precio de 1K [oficial]; si fal respeta `<point>`/`<bbox>` en Pro Edit vía prompt [sin dato].

**Políticas de contenido.** Safety checker activo por defecto; apagarlo exige autorización de cuenta [oficial]. Filtro de marcas y personas reales en Seedream **imagen**: [sin dato] (el filtro medido es de Seedance video). Licencia: Lite "Commercial use permitted under partner agreement" [oficial]; Pro [sin dato].

**Precio y estimación** [oficial, fichas fal 2026-09-16]:

| Endpoint | Precio | Estimar |
|---|---|---|
| Pro T2I | 0,0675 por imagen con área ≤ 1536² · 0,135 entre 1536² y 2048² ("tentative pricing") | `imágenes × tarifa del área`; `auto_2K` cae en el escalón alto [cálculo] |
| Pro Edit | igual por salida + 0,0045 por referencia adicional (la primera gratis) | `salidas × tarifa + (refs − 1) × 0,0045` |
| Pro Layerize | 0,03375 por capa (área < 1536²) · 0,0675 por capa (> 1536²) | 8 capas a 2K ≈ 0,54 [cálculo]; si la base cuenta como capa [sin dato] |
| Lite T2I / Edit | 0,035 por imagen | `num_images × max_images efectivas × 0,035` |

fal no devuelve `usage` y el CLI no reporta costo [contrato]. Referencia directa ModelArk: Pro ≈ 0,045/0,09 [tercero, sin fecha verificada] → fal ≈ 1,5× [cálculo].

**Comandos.**

```bash
# Look development (Pro); la extensión .png pide PNG (Pro entrega JPEG por defecto)
pnpm ai:fal --capability seedream5-pro --prompt "<materialidad, luz, atmósfera>" --size 2048x1152 --out ai-generations/2026-09-16_mi-pieza/look.png

# Exploración barata: 4 imágenes Lite
pnpm ai:fal --capability seedream5-lite --prompt "<territorio>" --size auto_2K --count 4 --out-dir ai-generations/2026-09-16_mi-pieza/lite

# Serie relacionada (max_images por --input)
pnpm ai:fal --capability seedream5-lite --prompt "<serie de 4 piezas coherentes>" --input '{"max_images":4}' --out-dir ai-generations/2026-09-16_mi-pieza/serie

# Edición con referencias (la primera es el ancla)
pnpm ai:fal --capability seedream5-pro-edit --image ancla.png --image material.png --prompt "<qué cambia; conserva todo lo demás>" --out ai-generations/2026-09-16_mi-pieza/edit.png

# Capas editables
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ai-generations/2026-09-16_mi-pieza/capas

# Capas con escalón y modo rápido
pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --size auto_2K --input '{"enhance_prompt_mode":"fast"}' --out-dir ai-generations/2026-09-16_mi-pieza/capas
```

**Trampas.** Pro cobra 0,0045 por cada `--image` adicional en edit; `--size`/`--count` no validados contra el contrato de imagen; sin flags para `max_images`, `enhance_prompt_mode` ni `enable_safety_checker` (usar `--input`) [contrato]. Slug sin prefijo `fal-ai/`: con prefijo equivocado responde 200 y el resultado da 404 [verificado]. Resuelto en el CLI el 2026-09-16 (commit `17196ead1`): Pro deriva `output_format` de la extensión de `--out` (`.png` → png, `.jpg`/`.jpeg` → jpeg, otra → error local) y, al descargar, detecta el formato por los bytes y corrige la extensión con aviso; `--format` en Lite se rechaza (Lite entrega PNG); `--seed` se rechaza en todo Seedream; más de 10 `--image` se rechaza en local [contrato]. El registro dice "Hasta 4K según el proveedor" para Pro era **incorrecta**: el tope es 2048²; la nota del registro se corrigió el 2026-09-16 [contrato].

**Estado.** Las 5 verificadas 2026-09-16 (una corrida cada una); laboratorio híbrido 2026-07-18 [verificado].
**Fuentes.** B1–B9 (§12).

---

### 5.3 Seedance 2.5 (`seedance25-t2v`, `seedance25-i2v`, `seedance25-r2v`)

**Qué es.** Sucesor de Seedance 2.0 con arquitectura conjunta audio-video, 30 s en una pasada y hasta 50 referencias multimodales [oficial fal]. Presentado 2026-06-23, lanzado 2026-07-31 en Jimeng/Doubao [tercero]; llegada a fal [sin dato]. "~20 % mejor adherencia" según ByteDance [oficial].

**Cuándo SÍ.** Toma hero realista sostenida; tomas de 15 a 30 s; muchas referencias (30/10/10); **editar** (`--task editing`) o **extender** (`--task extension`) un video sin personas ni marcas; diálogo con lip sync (entre comillas) [oficial].
**Cuándo NO.** Personas reales o marcas/logotipos en referencias o en el video de origen (filtro ByteDance, rechazo **cobrado**) [verificado]; 4K (techo 1080p, no verificado) [contrato]; multi-shot con cortes (se vende como toma continua) [oficial]; texto fino, geometría exacta de producto, objetos pequeños persistentes [tercero]; prompts que acumulan cámara + caminata + gestos + luz + dos hablantes (el lip sync pierde prioridad) [tercero].

**Capacidades y límites** [contrato salvo indicación].
- Duración 4–30 s o `auto` (texto). Resolución 480p/720p/1080p. Aspecto `auto, 21:9, 16:9, 4:3, 1:1, 3:4, 9:16`. `--bitrate`. Audio apagable (`--no-audio`). 24 fps [oficial].
- i2v: `--image` + `--end-image` opcional.
- r2v: hasta 30 imágenes; 10 videos (cada uno 1,8–30,2 s, ≤ 200 MB, 300–6000 px por lado, 24–60 fps; suma ≤ 30,2 s); 10 audios (1,8–30,2 s, ≤ 15 MB; suma ≤ 30,2 s); 50 archivos. Referencia visual obligatoria. Se citan como `@Image1`, `@Video1`, `@Audio1`.
- `--task reference` (default, el video guía) · `editing` (fuerza duración y aspecto a auto; el CLI rechaza `--duration`/`--aspect`) · `extension` (fuerza aspecto a auto; el CLI rechaza `--aspect`). `editing`/`extension` exigen `--video`.
- `seed` sólo existe en 2.5 r2v ("puede variar levemente") [contrato].
- **1080p: contradicción.** El OpenAPI lo ofrece y fal lo cobra (~1,164/s), pero la tabla de resoluciones de la ficha lista sólo 480p/720p [oficial]; prensa dice 4K nativo 10 bits [tercero]; otros terceros dicen tope nativo 720p y 1080p reescalado [tercero]. Nuestras corridas fueron a 480p [verificado]. **1080p de 2.5: sin verificar.** Prueba 5 s a 1080p y revisa nitidez antes de usarlo como hero.
- Capacidades anunciadas que fal **no** expone: referencias de modelos 3D blancos, edición local de zonas, video largo beta hasta 3 min, color 10 bits [tercero].

**Contenido.** Filtros de rostros, marcas de agua C2PA y detección de personajes con copyright [tercero]. Rechazo medido con `422 content_policy_violation` / `partner_validation_failed` **después de encolar, cobrado**: isotipo Efeonce ("potential copyright violation") y video de barista ("likenesses of real people") [verificado 2026-09-16]. Uso comercial "Commercial use", estado Partner [oficial]; derechos de ByteDance sobre la salida [sin dato].

**Precio y estimación.**

```text
tokens = alto × ancho × segundos × 24 / 1024          [oficial fal]
costo  = tokens × 0,0214 / 1000                        [contrato, 2.5]
```

La fórmula calza con lo medido dentro de ~5 % [verificado 2026-09-16, ver §5.4]. **No uses la equivalencia de OpenArt** (54.000 tokens por 5 s a 720p): subestima ~2×. Precio por segundo publicado: 480p ≈ 0,2205 · 720p ≈ 0,4730 · 1080p ≈ 1,164; con videos de referencia en r2v el precio baja (720p ≈ 0,2838/s; 480p ≈ 0,1323/s) y **la duración del video de entrada cuenta para el cobro** [oficial]. `auto`: el largo lo decide el modelo, así que el costo no es estimable con exactitud [cálculo].

**Comandos.**

```bash
# Hero desde imagen, 720p vertical
pnpm ai:fal --capability seedance25-i2v --image plate.png --prompt "<movimiento de cámara y acción>" --duration 8 --resolution 720p --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/sd25-hero.mp4

# Desde texto, toma larga
pnpm ai:fal --capability seedance25-t2v --prompt "<escena continua>" --duration 20 --resolution 720p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd25-larga.mp4

# Referencias multimodales
pnpm ai:fal --capability seedance25-r2v --image personaje.png --image producto.png --audio musica.mp3 --prompt "@Image1 sostiene @Image2 al ritmo de @Audio1" --duration 10 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd25-r2v.mp4

# Editar un clip (sin --duration ni --aspect)
pnpm ai:fal --capability seedance25-r2v --task editing --video clip.mp4 --prompt "Cambia @Video1 a <nuevo estilo>, conserva la acción" --out ai-generations/2026-09-16_mi-pieza/sd25-edit.mp4

# Extender un clip (sin --aspect)
pnpm ai:fal --capability seedance25-r2v --task extension --video clip.mp4 --prompt "Continúa @Video1: <qué pasa después>" --duration 8 --out ai-generations/2026-09-16_mi-pieza/sd25-extension.mp4
```

**Trampas.** Rechazo de contenido cobrado; r2v reference > 15 min de latencia (usa `--detach`) [verificado]; `--seed` sólo lo acepta `seedance25-r2v`; en t2v/i2v (y en 2.0) el CLI lo rechaza en local desde 2026-09-16 [contrato]. Con `--duration auto` o sin `--duration`, la estimación previa usa el máximo del contrato (30 s en 2.5): pasa `--duration` para que no te pida `--yes` de más [contrato].
**Estado.** Las 3 verificadas 2026-09-16 (480p); `editing` y `extension` verificadas [verificado].
**Fuentes.** V1, V2, V32–V38, R1 (§12).

---

### 5.4 Seedance 2.0 base, fast, mini, us

**Qué es.** 2.0 (febrero 2026 [tercero]; API en fal 2026-04-09 [oficial]). **base**: "renders finales de producción"; **fast**: menor latencia y costo, "Output quality: Same" según fal [oficial]; **mini**: versión más rápida y barata (2026-06-15 [tercero]); **us**: "US hosted version" [oficial].

| Variante | ids | Techo | Bitrate | Precio por 1.000 tokens [contrato] | Cuándo |
|---|---|---|---|---|---|
| base | `seedance20-t2v`, `-i2v`, `-r2v` | **4K** [verificado] | Sí | 0,014 | Única ruta 4K conectada |
| fast | `seedance20-fast-t2v`, `-i2v`, `-r2v` | 720p | Sí | 0,0112 | Final 720p más barato que base, misma calidad declarada |
| mini | `seedance20-mini-t2v`, `-i2v`, `-r2v` | 720p | **No** | 0,007 | Exploración Seedance más barata (OpenArt 1033 vs 1044 base) [tercero] |
| us | `seedance20-us-t2v`, `-i2v`, `-r2v` | 720p | Sí | 0,0168 (+20 %) | **Sólo** si un cliente exige procesamiento en EE. UU. [oficial] |

**Cuándo SÍ.** 4K (base); multi-shot con cortes dentro de una generación de hasta 15 s [oficial]; transición primer/último cuadro; exploración barata con look Seedance (mini).
**Cuándo NO.** Más de 15 s; editar o extender (r2v 2.0 **no** tiene `--task`: el video sólo guía) [contrato]; personas reales o marcas (mismo filtro: ByteDance no acepta rostros humanos realistas como origen y bloquea copyright en todos sus canales empresariales) [tercero] [verificado]; `us` por calidad.

**Capacidades y límites** [contrato]. Duración 4–15 s o `auto`. Resolución base 480p/720p/1080p/4k; fast/mini/us 480p/720p. Aspecto como 2.5. r2v: 9 imágenes, 3 videos (suma 2–15 s, < 50 MB, ~480p–720p), 3 audios (suma ≤ 15 s), 12 archivos; referencia visual obligatoria. `--end-image` en i2v. 24 fps. Lip sync en 8+ idiomas [tercero]. La ficha de fal de 2.0 dice "hasta 720p", desactualizada frente al OpenAPI y la corrida 4K [oficial] [verificado]; si el 4K es nativo o reescalado [sin dato]. Términos de residencia de `us` [sin dato].

**Precio y estimación.** Misma fórmula de tokens que 2.5 con la tarifa de la variante. Validación [verificado 2026-09-16, gasto real cuenta B]:
- 3 × `seedance20-fast` 864×496 × 4,13 s → **1,39 calculado vs 1,37 medido**.
- 3 × `mini` 4 s 480p → 0,82 calculado vs 0,85 medido.
- Tanda 2.0 base i2v + r2v (4,06 s) + 2 Wan 480p de 2 s → 1,33 calculado vs 1,37 medido.

Por segundo: base 720p 0,3024 [oficial], 480p ≈ 0,141, 1080p ≈ 0,685, **4K ≈ 2,72** [cálculo: 3840×2160×24/1024 = 194.400 tokens/s]; fast 480p ≈ 0,1125, 720p 0,2419; mini 480p ≈ 0,0721, 720p ≈ 0,1547; us 480p 0,1731, 720p 0,37 [oficial].

**Comandos.**

```bash
# 4K (base)
pnpm ai:fal --capability seedance20-i2v --image plate-4k.png --prompt "<movimiento>" --duration 5 --resolution 4k --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd20-4k.mp4

# Exploración barata (mini, 480p)
pnpm ai:fal --capability seedance20-mini-t2v --prompt "<escena>" --duration 4 --resolution 480p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/sd20-mini.mp4

# Final 720p económico (fast)
pnpm ai:fal --capability seedance20-fast-i2v --image plate.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd20-fast.mp4

# Referencias (el video sólo guía)
pnpm ai:fal --capability seedance20-r2v --image personaje.png --video movimiento.mp4 --prompt "@Image1 se mueve como @Video1" --duration 8 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/sd20-r2v.mp4
```

**Trampas.** `--bitrate` en mini lo rechaza el CLI [contrato]; `--task` en 2.0 lo rechaza el CLI [contrato]; filtro de contenido cobrado [verificado].
**Estado.** Las 12 verificadas 2026-09-16 [contrato].
**Fuentes.** V3–V6, V34, V39, V43–V46 (§12).

---

### 5.5 Minimax H3 (Hailuo 3.0): base, Max, Max Turbo, camera-controls, LoRA, entrenadores, Director

**Qué es.** H3 base: modelo omni-modal de MiniMax lanzado 2026-07-31, video con audio estéreo nativo, multi-shot nativo; fortalezas oficiales: seguimiento de instrucciones, **texto y marca precisos**, transferencia de movimiento; debilidad oficial: "el detalle visual aún puede mejorar" [oficial]. **H3 Max**: post-entrenamiento hecho por **fal Research** (no por MiniMax), publicado 2026-08-27; fal afirma #1 en su evaluación humana y 5 s en < 3 s [oficial]. **H3 Max Turbo**: descrito por fal con el mismo texto que Max; diferencia técnica [sin dato] [oficial].

| Variante | ids | Resolución [contrato] | Expansión de prompt [contrato] | Registro [contrato] → publicado [oficial] |
|---|---|---|---|---|
| base | `h3-t2v`, `h3-i2v`, `h3-r2v` | 480P/768P nativos · 2K/4K **reescalados desde 768P** | Opcional: `disabled|fast|balanced|quality` | 0,05/s → 480P 0,05 · 768P 0,06 · **2K 0,13** (default del proveedor; el CLI envía 480P si omites `--resolution`) · 4K 0,16 |
| Max | `h3max-t2v`, `h3max-i2v`, `h3max-r2v` | 480P/768P nativos · 1080P refinado desde 768P | **Obligatoria** `disabled|balanced|quality` (CLI envía `balanced`) | 0,025/s → 480P 0,025 · 768P 0,04 (default del proveedor) · 1080P 0,08 ("50% off": promo o lista [sin dato]) |
| camera | `h3max-camera` | 480P/768P/1080P | Obligatoria | 0,025/s; escalones [sin dato] |
| Max Turbo | `h3turbo-t2v`, `h3turbo-i2v` | 480P/768P/1080P | Obligatoria | 0,0125/s → 768P 0,02 (promo 0,01) · 1080P 0,04 (promo 0,02); 480P no listado → **medir** |
| LoRA | `h3-t2v-lora`, `h3-i2v-lora`, `h3-r2v-lora` | como base | Opcional | 0,0625/s; escalones [sin dato] |
| Director | `h3max-director` | [sin dato] | — | 0,08/s lista · 0,02 promo · 1080p 2× · mínimo 1,20 por sesión |

**Cuándo SÍ.** Exploración masiva y rápida (Turbo, 2,7–8 s [verificado]); imagen a video con audio (H3 Max #1 en AA [tercero]); control de cámara real sobre una escena congelada (`h3max-camera`); texto o marca dentro del video de concepto (declarado [oficial]); precio bajo por segundo a baja resolución.
**Cuándo NO.** 4K "real" (reescalado) [contrato]; necesitas silencio (sin toggle de audio) [contrato]; prompt literal en Max/Turbo (expansión obligatoria) [contrato]; lip sync en rostros no humanos, timing fino de audio (terceros reportan desincronía y parpadeo) [tercero]; reutilizar salidas como dataset de entrenamiento sin revisar licencia (ver contenido).

**Capacidades y límites** [contrato].
- Duración entera 5–15 s. Resolución en **MAYÚSCULAS** (`480P`, `768P`, `2K`, `4K`, `1080P`).
- i2v **sin** `--aspect` (encuadre del medio de entrada); `--end-image` opcional.
- r2v: 9 imágenes, 3 videos, 3 audios; aspecto `adaptive` + ratios.
- camera: `--camera-trajectory` JSON con ≤ 12 keyframes `{distance, elevation, azimuth, time}`; `elevation` −90..90, `time` 0..1 (el CLI valida ambos); unidades de `distance` y rango de `azimuth` [sin dato]; prompt opcional; guía oficial: empezar y terminar en el encuadre original, luz y focal sin cambios [oficial].
- Audio 48 kHz estéreo, 24 fps [oficial].
- LoRA: `--lora <path|url|repo HF>[@<escala 0–4>][#<weight_name>]`, hasta 3; `weight_name` elige el archivo de pesos dentro de un repo de Hugging Face [contrato].
- Entrenadores (`h3-train-t2v`, `h3-train-i2v`, `h3-train-flf2v`, `h3-train-ref2va`): `--training-data` zip, `--steps` (default 2000; contrato 1–15000, página 1–6000: **contradicción**, [sin dato] cuál rige), `--rank 8|16|32|64|128` (default 32), `--learning-rate` (default 2e-4), `--trigger`. Condicionamiento: i2v primer cuadro 0.5; flf2v primero 0.2 · último 0.2 · ambos 0.4; ref2va referencia 0.9 y puede retomar desde una LoRA [contrato]. Datos oficiales del entrenador t2v: mínimo 10 clips recomendados, 20–50 rinden mejor; **captions obligatorias** (`.txt` con el mismo nombre por clip, o `trigger_phrase` de respaldo); **clips de menos de 73 cuadros (~3 s) se descartan en silencio** salvo `auto_scale_input`; entrena video+audio (`t2va`) [oficial]. `--frames <n>` → `number_of_frames` (22–124 y `% 17 == 5`: 22, 39, 56, 73, 90, 107, 124) y `--split-threshold <s>` → `split_input_duration_threshold` (1–60 s, default 30); el CLI valida ambas reglas también si llegan por `--input`, y avisa si pides menos de 100 steps (mínimo facturable) [contrato]. Con `split_input_into_scenes`, ref2va descarta los sidecars de referencia de clips partidos [contrato]. Diferencias reales entre entrenadores más allá del condicionamiento [sin dato].
- Director: stream realtime (AsyncAPI) con prompt, primer y último cuadro y audio objetivo; **no operable por cola**, el CLI se detiene [oficial] [contrato].

**Contenido y licencia.** `enable_safety_checker` default true, sin flag [contrato]. fal rotula H3 "Commercial use" [oficial]. Pesos abiertos H3-Base bajo licencia comunitaria propia: reportan obligación de mostrar "MiniMax H3", autorización sobre USD 20 M de ingresos, **prohibición de usar H3 o sus salidas para entrenar otro modelo** y exclusión territorial (UE, Reino Unido, Corea, EE. UU.) para despliegue local [tercero]; si alcanza a salidas de la API de fal [sin dato]. H3 Max es de fal, relevante para derechos [oficial].

**Precio y estimación.**
- Video: `segundos × tarifa publicada del escalón pedido`. Usa la **publicada**, no la del registro: H3 base a 2K cuesta 2,6× el registro [oficial]. Para Turbo, ninguna cifra calza con el registro: mide con `--balance` antes y después de una corrida aislada.
- Entrenamiento: `max(steps, 100) × tarifa` → t2v 0,005 · i2v/flf2v 0,01 · ref2va 0,015. Piso: t2v **0,50**, i2v/flf2v 1,00, ref2va 1,50; 2000 steps = 10 / 20 / 20 / 30 [oficial] [cálculo]. **El plan anterior "10 steps ≈ USD 0,40" es falso** (corrección 2026-09-16).
- Director: mínimo 1,20 por sesión [oficial].

**Comandos.**

```bash
# Exploración Turbo 480P, 5 s
pnpm ai:fal --capability h3turbo-t2v --prompt "<escena y acción>" --duration 5 --resolution 480P --aspect 9:16 --out ai-generations/2026-09-16_mi-pieza/h3-turbo.mp4

# Max desde imagen con último cuadro (sin --aspect)
pnpm ai:fal --capability h3max-i2v --image inicio.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3max-i2v.mp4

# Max con referencias
pnpm ai:fal --capability h3max-r2v --image personaje.png --image producto.png --prompt "<cómo aparecen juntos>" --aspect adaptive --duration 6 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3max-r2v.mp4

# Base con prompt literal y 4K (reescalado desde 768P)
pnpm ai:fal --capability h3-t2v --prompt "<texto exacto>" --prompt-expansion disabled --duration 5 --resolution 4K --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/h3-4k.mp4

# Control de cámara (órbita de 60°)
pnpm ai:fal --capability h3max-camera --image escena.png --camera-trajectory '[{"distance":1,"elevation":10,"azimuth":0,"time":0},{"distance":1,"elevation":10,"azimuth":60,"time":1}]' --duration 5 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3-camara.mp4

# LoRA (SIN VERIFICAR; postergada)
pnpm ai:fal --capability h3-t2v-lora --prompt "<frase disparadora> <escena>" --lora https://<url-de-la-lora>@1 --duration 5 --resolution 768P --out ai-generations/2026-09-16_mi-pieza/h3-lora.mp4

# Entrenamiento (SIN VERIFICAR; postergado; piso de cobro 100 steps)
pnpm ai:fal --capability h3-train-t2v --training-data dataset.zip --steps 100 --rank 32 --trigger "tronl0g0" --detach
```

**Trampas.** Resolución en minúsculas → rechazo local [contrato]; audio siempre presente [contrato]; precios del registro subestiman [oficial]; clips cortos descartados en silencio [oficial]. Sin `--resolution`, el CLI ya no hereda el 2K del proveedor en H3 base: envía el escalón más barato y lo avisa; para entrega pasa `--resolution` explícito [contrato].
**Estado.** 9 verificadas 2026-09-16 (base ×3, Max ×3, camera ×1, Turbo ×2); LoRA ×3 y entrenadores ×4 **sin verificar** por [decisión] del operador; Director no operable [contrato].
**Fuentes.** V7–V14, V47–V53 (§12).

---

### 5.6 Flux 3 (Black Forest Labs) — en fal es VIDEO

**Qué es.** Primer modelo de video público de BFL: modelo de flujo multimodal (imagen, video, audio). Anunciado 2026-07-23; disponible vía API 2026-08-04; BFL lo llama "preview" [oficial] [tercero]. Flux 3 **Image** no está en fal ni en el registro [contrato].

| Grupo | ids |
|---|---|
| Final | `flux3-t2v`, `flux3-i2v`, `flux3-flf`, `flux3-keyframes` |
| Borrador | `flux3-t2v-draft`, `flux3-i2v-draft`, `flux3-flf-draft`, `flux3-keyframes-draft` |
| Mejora de borrador | `flux3-enhance` |
| Edición | `flux3-edit` |
| Extensión | `flux3-extend`, `flux3-extend-draft` |

**Cuándo SÍ.** Primer y último cuadro exactos (`flf`); pasar por 1–10 cuadros clave (`keyframes`, único); flujo borrador → final sin reinterpretar; editar un video **con personas** barato (`edit`, 0,03/s); extender con audio de contexto; tomas que dependen de un impacto, salpicadura o caída (causa-efecto físico, sonido en el cuadro del evento) [oficial] [tercero]; texto y tipografía dentro de la escena (declarado) [oficial]; varias escenas con cortes duros en una generación [oficial].
**Cuándo NO.** 4K por fal (tope 1080p; BFL directo llega a 3840×2176, no conectado) [oficial]; coordinación de grupos o varias acciones simultáneas (BFL recomienda partir en pedidos) [oficial]; tomas realistas sostenidas donde Seedance 2.5 rinde mejor [tercero]; escenas quietas si necesitas sonido (pueden salir casi mudas) [oficial]; extend sobre un clip sin audio [verificado].

**Capacidades y límites.**
- t2v/i2v: `auto` o 5–20 s; flf y keyframes: 5–20 s sin `auto`; 720p/1080p; aspecto `auto, 21:9, 2:1, 16:9, 4:3, 1:1, 3:4, 9:16`; `--no-audio`; `--safety-tolerance 0–4` (0 = más estricto, default 2) [contrato].
- flf: `--image` (primero) y `--end-image` (último) **obligatorios** [contrato].
- keyframes: `--keyframe <imagen>@<frame_index>` de 1 a 10, índice entero ≥ 0; probado `@0` y `@96` en 5 s a 24 fps [contrato] [verificado]. BFL directo usa timestamp en segundos; fal usa `frame_index` [oficial].
- draft: sin `--resolution`; devuelve `draft_cache` y el CLI imprime el comando `flux3-enhance` listo [contrato]; borrador 1280×704 → mejora 1920×1088 [verificado]. `flux3-enhance` no acepta prompt, duración, resolución ni aspecto [contrato]. Validez del `draft_cache` [sin dato] (relevante si pasan horas).
- edit (FAST Edit): `--video` MP4/MOV/WebM/M4V/GIF, < 15 s; salida 720p; ~5 min; sin duración/resolución/aspecto [contrato] [oficial]. Tipos de edición más allá de reemplazo de objeto/estilo/luz [sin dato]; si conserva el audio [sin dato].
- extend: `--video` con **pista de audio** (< 50 MB, < 15 s); usa hasta 4 s de video y audio como contexto; `--duration` = segundos nuevos (`auto` entregó 15 s); entrega **sólo la continuación**, une en post [oficial] [contrato] [verificado]. Enviar más de 4 s de origen no aporta contexto adicional (se deduce del límite oficial de 4 s).
- 24 fps; audio con diálogo y lip sync; idiomas declarados por BFL incluyen español, pero fal dice "inglés principal": **contradicción**, prueba español antes de prometer diálogo [oficial].

**Contenido y derechos.** Evaluación externa de riesgos NCII/CSAM antes del lanzamiento [oficial]. Política explícita sobre personas reales, marcas o menores [sin dato]; edit/extend con personas funcionaron sin filtro tipo Seedance [verificado]. BFL no reclama propiedad sobre la salida; si la entrada contiene material de terceros, explotarla puede requerir derechos que BFL no otorga [oficial]. fal: uso comercial permitido [oficial].

**Precio y estimación — RIESGO ALTO.**

| Endpoint | Registro [contrato] | Publicado [oficial] |
|---|---|---|
| final (t2v, i2v, flf, keyframes) | 0,085/s | **720p 0,17/s · 1080p 0,29/s** (BFL directo: qhd 0,40, uhd 0,80) |
| draft | 0,03/s | **0,06/s** |
| enhance | 0,085/s | [sin dato] |
| edit | 0,03/s | 0,03/s (720p) — coincide |
| extend | 0,205/s | **720p 0,41/s · 1080p 0,53/s** |
| extend-draft | 0,06/s | [sin dato] |

Las dos fuentes oficiales (BFL y fal) dan exactamente el **doble** del registro en final, draft y extend; la causa [sin dato]. Estima con el **publicado** y confirma con `--balance` antes y después de una corrida aislada (§7). Draft ≈ 1/3 del render completo según BFL [oficial].

**Comandos.**

```bash
# Borrador barato
pnpm ai:fal --capability flux3-t2v-draft --prompt "<escena y acción>" --duration 5 --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/flux3-draft.mp4

# Mejora del borrador elegido (copia el draft_cache que imprime el CLI)
pnpm ai:fal --capability flux3-enhance --draft-cache "<url-draft-cache>" --out ai-generations/2026-09-16_mi-pieza/flux3-final.mp4

# Primer y último cuadro
pnpm ai:fal --capability flux3-flf --image inicio.png --end-image final.png --prompt "<transición>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-flf.mp4

# Keyframes (24 fps: 96 = segundo 4)
pnpm ai:fal --capability flux3-keyframes --keyframe inicio.png@0 --keyframe clave.png@48 --keyframe cierre.png@96 --prompt "<qué pasa entre cuadros>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-kf.mp4

# Editar un video con personas
pnpm ai:fal --capability flux3-edit --video clip.mp4 --prompt "<qué cambia: estilo, luz, material>" --out ai-generations/2026-09-16_mi-pieza/flux3-edit.mp4

# Extender (origen con audio; sale sólo la continuación)
pnpm ai:fal --capability flux3-extend --video clip-con-audio.mp4 --prompt "<cómo sigue la acción>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/flux3-continuacion.mp4
```

**Trampas.** Extend sin audio → 422 tras encolar (el CLI lo revisa con ffprobe cuando el video es local; con URL remota o sin ffprobe no puede saberlo) [verificado] [contrato]; `--image` en edit/extend lo rechaza el CLI [contrato]; precios del registro a la mitad [oficial].
**Estado.** Las 12 verificadas 2026-09-16; latencias 40 s–4 min [verificado].
**Fuentes.** V21–V27, V35, V44, V54–V57 (§12).

---

### 5.7 Wan 3.0 y Wan 3.0 Prime (Alibaba)

**Qué es.** Wan 3.0: beta 2026-08-06, blog 2026-08-13, lanzamiento oficial 2026-08-24 [oficial] [tercero]. Prime: "versión **acelerada** de Wan, generación significativamente más rápida manteniendo calidad alta" (2026-08-27) [oficial] [tercero]. Calidad Prime vs base: **sin medir**; ningún benchmark la compara [tercero].

| Variante | ids | Publicado por escalón [oficial fal] |
|---|---|---|
| base | `wan3-t2v`, `wan3-i2v`, `wan3-r2v` | 480p 0,05/s · 720p 0,10/s · **1080p 0,20/s** |
| Prime | `wan3prime-t2v`, `wan3prime-i2v`, `wan3prime-r2v` | 480p 0,068/s · 720p 0,14/s · **1080p 0,28/s** |

El registro guarda 0,05/s para ambas y el manual dice "mismo precio": **incorrecto en fal**; Prime es ~36–40 % más cara. En Alibaba directo Prime 720P = 0,127199/s [oficial]; Picsart dice que Prime cuesta 1/3 de créditos [tercero, 2026-08-31]: el precio depende del canal.

**Cuándo SÍ.** Toma larga hasta 30 s; video a partir de una **página web** o **documento** (único); consistencia por referencias (10/5/5) incluyendo replicar movimiento de cámara [oficial]; material con personas o marcas donde Seedance rechaza (sin filtro medido); texto a video con audio (#1 AA [tercero]); rostros humanos diversos con microexpresiones (declarado) [oficial]. Prime sólo si la latencia manda.
**Cuándo NO.** Texto preciso en pantalla y textura de audio ("todavía no donde queremos") [oficial]; lip sync, manos o multitudes, prompts surrealistas o con varios sujetos [tercero]; un solo plano continuo de 30 s (puede cortar entre encuadres) [tercero]; edición, extensión o multi-shot controlado de Wan 3.0 (Alibaba los ofrece, **fal no los expone**) [oficial]; asumir que omitir `--resolution` da calidad final (el CLI envía 480p, el escalón más barato).

**Capacidades y límites** [contrato salvo indicación].
- Duración entera 2–30 s o `auto` (se envía `null`; el modelo eligió 5,04 s [verificado]). Resolución 480p/720p/1080p; default del proveedor 1080p, pero sin `--resolution` el CLI envía 480p y lo avisa. Aspecto `adaptive, 16:9, 4:3, 1:1, 3:4, 9:16`. **30 fps** [oficial].
- t2v: prompt obligatorio. i2v: `--image` = primer cuadro, `--end-image` opcional, **prompt opcional**. r2v: 10 imágenes (≤ 20 MB c/u), 5 videos (total ≤ 15 s, ≥ 16 fps, ≤ 100 MB c/u), 5 audios (total ≤ 15 s, ≤ 15 MB c/u), máximo 20 materiales; prompt opcional; se citan por posición ("the subject in Image 1 … like Video 1") [contrato] [oficial].
- Audio por campo `audio` (`--no-audio`) con diálogo, BGM y efectos [oficial].
- `--no-prompt-expansion` ahorra 20–60 s y puede bajar calidad; `--seed`.
- `--thinking`; sólo en r2v, `--web-url <url pública sin login>` y `--file <documento local o URL>` exigen `--thinking`; 1 documento (hasta 100 MB y 50 páginas según blog) [contrato] [oficial].
- `enable_safety_checker` modera entrada y salida; sin autorización de cuenta siempre revisa [contrato]. Política explícita sobre personas reales, marcas o menores [sin dato]. URL de video en Alibaba directo válida 24 h [oficial]. Pesos: repositorio Apache 2.0 **sin checkpoint** al 2026-09-01 [tercero]; derechos sobre salidas de la API [sin dato]; fal "Commercial use" [oficial].

**Precio y estimación.** `segundos × tarifa del escalón`. 30 s a 1080p base = **6,00** (cifra oficial de Alibaba); Prime 1080p 30 s = 8,40 [cálculo]. Con `--duration auto` el largo lo decide el modelo: presupuesta el máximo (30 s) si no tienes margen [cálculo]. Descuento API de 30 % entre 24-ago y 23-sep en algunas plataformas [tercero]; si aplica en fal [sin dato]. Nuestras corridas de Wan fueron a 480p, coherentes con 0,05/s [verificado].

**Comandos.**

```bash
# Explorar a 480p, largo automático
pnpm ai:fal --capability wan3-t2v --prompt "<escena y acción>" --duration auto --resolution 480p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/wan3-t2v.mp4

# Primer y último cuadro, 720p
pnpm ai:fal --capability wan3-i2v --image inicio.png --end-image final.png --prompt "<transición>" --duration 6 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-i2v.mp4

# Referencias (imagen + video de movimiento)
pnpm ai:fal --capability wan3-r2v --image personaje.png --image producto.png --video movimiento.mp4 --prompt "the subject in Image 1 holds the product in Image 2 and moves like Video 1" --duration 8 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-r2v.mp4

# Desde una página web pública (prompt con guion)
pnpm ai:fal --capability wan3-r2v --thinking --web-url https://efeoncepro.com --prompt "<guion: plano 1, plano 2, cierre>" --duration 15 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-web.mp4

# Desde un documento (sin corrida real)
pnpm ai:fal --capability wan3-r2v --thinking --file brief.pdf --prompt "<qué pieza quieres a partir del documento>" --duration 15 --resolution 720p --out ai-generations/2026-09-16_mi-pieza/wan3-doc.mp4

# Prompt literal, semilla fija, sin audio
pnpm ai:fal --capability wan3-t2v --prompt "<texto exacto>" --no-prompt-expansion --seed 7 --no-audio --duration 5 --resolution 480p --out ai-generations/2026-09-16_mi-pieza/wan3-exacto.mp4

# Prime (misma sintaxis, más cara y más rápida)
pnpm ai:fal --capability wan3prime-t2v --prompt "<escena>" --duration 5 --resolution 720p --aspect 16:9 --out ai-generations/2026-09-16_mi-pieza/wan3prime.mp4
```

**Trampas.** Omitir `--resolution` = 480p (el CLI elige el escalón barato; para entrega pásalo explícito); creer que Prime cuesta igual; `--web-url`/`--file` fuera de r2v o sin `--thinking` los rechaza el CLI [contrato]; `--web-url` sin guion anima la portada en vez de narrar [verificado].
**Estado.** Las 6 verificadas 2026-09-16 según el registro (`--web-url` con Prime r2v verificado); `--file` **sin corrida real**. El manual del CLI aún dice que i2v, r2v y Prime no tienen corrida: desactualizado frente al registro.
**Fuentes.** V17–V20, V28, V29, V31, V58–V64, R1 (§12).

---

### 5.8 Higgsfield API (`pnpm ai:fal --capability hf-*`)

**Qué es.** Segundo proveedor de `pnpm ai:fal`, con el mismo diseño que fal (cola asíncrona, clave `id:secret` en `Authorization: Key`). Cliente canónico `src/lib/ai/higgsfield.ts`; secreto `greenhouse-higgsfield-api-key` en Secret Manager (`efeonce-group`), leído vía `HIGGSFIELD_API_KEY_SECRET_REF`. `--capability hf-*` elige el proveedor sola; `--provider higgsfield --model <endpoint>` abre cualquier otro endpoint [contrato].

**Catálogo.** 44 capacidades (`pnpm ai:fal --list --provider higgsfield`): SOUL 2 / SOUL / SOUL Cinema, Marketing Studio, Recraft 4.1 (+Pro; SVG sin confirmar), Ideogram 4.0, Qwen Image 3, Z-Image Turbo, Grok Imagine Image 2.0; Seedance 2.5 (t2v, i2v, r2v, editar, extender) y 2.0; Wan 3.0 (t2v, i2v, r2v), Wan 3.0 Prime, 2.7 y 2.6; Kling 3.0 std/pro/4K/Turbo, Kling O3 y Omni primer-último cuadro, Kling 2.6 Pro, 2.5 Turbo; MiniMax H3 (sólo 2K), Hailuo 2.3, LTX 2.5 Fast/Pro, PixVerse 6, Happy Horse 1.0/1.1, Grok Imagine Video 1.5 [contrato].

**Contrato de entrada.** No se transcribe a mano: `pnpm ai:higgsfield:sync-schemas` congela en `src/lib/ai/higgsfield-schemas.json` el JSON Schema que el playground de la consola publica por endpoint (43 al 2026-09-16; SOUL Cinema transcrito de su documentación). La CLI mapea los flags genéricos al campo real de cada endpoint (`--image` → `image_url`/`first_frame_url`/`image_urls`; `--end-image` → `end_image_url`/`last_image_url`/`last_frame_url`; `--no-audio` → `generate_audio:false` o `sound:"off"`; `--count` → `batch_size`) y valida todo el cuerpo en local antes de pedir precio. Lo propio de cada endpoint (`style_id`, `multi_prompt`, `camera_movement`, `rendering_speed`, `colors`, `preset_id`) va por `--input` [contrato].

**Precio.** Lo da la API de estimación (`POST /estimate/<endpoint>`), que valida el cuerpo y **no cobra**. Monto exacto con descuento vigente en 33 capacidades; Seedance 2.0/2.5 y Wan 3.0 sólo devuelven fórmula y la CLI la aplica como **cota antes de descuento** (si falta la duración de un video remoto de entrada, exige `--yes`). Tope y `--yes` como en fal. `--estimate` imprime precio y cuerpo sin encolar [contrato].

| Barrido `--estimate` 2026-09-16 (cuerpo mínimo, resolución más barata) | USD |
|---|---|
| SOUL 2 · SOUL Cinema (720p) | 0,004 |
| Z-Image Turbo (1k) · Recraft 4.1 · Qwen Image 3 (1k) | 0,015 · 0,035 · 0,040 |
| Ideogram 4.0 · Grok Image 2.0 (1k) · SOUL | 0,060 · 0,060 · 0,094 |
| Marketing Studio (1k) · Recraft 4.1 Pro | 0,189 · 0,210 |
| PixVerse 6 5 s 360p · Kling 2.5 Turbo i2v | 0,175 · 0,179 |
| Hailuo 2.3 · Wan 3.0 Prime 5 s 480p · Grok Video 1.5 5 s 480p | 0,280 · 0,340 · 0,410 |
| Kling 3.0 Turbo 720p · Kling Omni/O3 · Wan 2.7/2.6 720p | 0,476 · 0,476 · 0,500 |
| Kling 3.0 std · LTX 2.5 Fast 6 s · H3 2K · Kling 2.6 Pro · Happy Horse | 0,536 · 0,540 · 0,553 · 0,595 · 0,595 |
| Kling 3.0 Pro · LTX 2.5 Pro 6 s · Kling 3.0 4K | 0,714 · 0,720 · 1,785 |
| Seedance 2.5 5 s 480p (cota por fórmula) · Wan 3.0 5 s 480p (fórmula) | ≈ 1,075 · 0,25 |

**Diferencias con fal que importan.** Salida retenida ≥ 7 días en el proveedor (la CLI siempre descarga; un `--detach` hay que recuperarlo dentro de esa ventana). Tope de concurrencia por cuenta que responde `400`, no `429`. `--cancel` sólo mientras siga en cola. Sin API de saldo documentada: `--balance` remite a la consola. La cuenta de API tiene créditos propios, distintos de la suscripción de la app [contrato].

**Cuándo SÍ.** Modelos que fal no expone (SOUL, Marketing Studio, Ideogram 4.0, Qwen Image 3, Z-Image, LTX 2.5, PixVerse 6, Happy Horse, Kling Omni/O3); comparar precio exacto antes de gastar [contrato].

**Cuándo NO.** Contar con SVG todavía (ver Vectores abajo); Veo 3.1, Sora 2 y Nano Banana Pro (la API responde `model_not_found`/`model_disabled` a la cuenta) [verificado 2026-09-16]; Nano Banana y Gemini Omni siempre directo por Google [decisión].

**Vectores (Recraft).** La API rechaza `output_format: svg` (400: sólo `jpg`/`png`/`webp`) [verificado 2026-09-16]. La app de Higgsfield ofrece Recraft V4.1 con `model_type` `vector` y `utility_vector` (logos, íconos, ilustración tipo SVG) [verificado con el conector de la app 2026-09-16]. La API no documenta `model_type` y su estimación acepta cualquier campo (`foo`, `model_type: "banana"` → 200), así que no prueba nada: **si `--input '{"model_type":"vector"}'` entrega SVG por la API está sin confirmar** hasta una generación real (USD 0,035). La CLI deja pasar ese campo para poder probarlo.

**Estado.** Las 44 capacidades pasaron el barrido `--estimate` (acceso + esquema + precio) [verificado 2026-09-16]. **Ninguna generación real verificada:** el primer intento respondió `403 not_enough_credits`. Hasta recargar créditos en console.higgsfield.ai/billing y correr una generación por familia, trátalas como SIN VERIFICAR en salida.

```bash
# Precio y cuerpo sin encolar
pnpm ai:fal --capability hf-kling3-std-t2v --prompt "<texto>" --duration 5 --estimate

# Imagen SOUL 2 vertical
pnpm ai:fal --capability hf-soul2 --prompt "<texto>" --aspect 3:4 --out retrato.jpg

# Marketing Studio con referencias de producto (campos propios por --input)
pnpm ai:fal --capability hf-marketing-studio --prompt "<brief>" --image producto.png --resolution 2k --out pieza.png

# Video largo desacoplado, estado, cancelación y retome
pnpm ai:fal --capability hf-seedance25-i2v --image hero.png --duration 10 --resolution 720p --detach --yes
pnpm ai:fal --provider higgsfield --request-id <id> --status
pnpm ai:fal --provider higgsfield --request-id <id> --cancel
pnpm ai:fal --capability hf-seedance25-i2v --request-id <id> --out clip.mp4

# Refrescar esquemas del proveedor
pnpm ai:higgsfield:sync-schemas
```

**Fuentes.** docs.higgsfield.ai (requests, polling, errors, webhooks, billing, rate limits, file uploads, SDK), console.higgsfield.ai (catálogo y JSON Schema por playground), barrido `--estimate` con la cuenta de Efeonce (2026-09-16).

---

## 6. Recetas por caso de uso

Costos: [cálculo] con tarifa **publicada** del escalón indicado, salvo que se diga otra cosa. Confírmalos con §7.

### 6.1 Explorar barato → final

1. Imagen: 8 × `seedream5-lite` (0,035) = **0,28**; elige ancla.
2. Video: 5 × `h3turbo-i2v` 5 s 480P desde el ancla (registro 0,0125/s → 0,31; si rige 768P promo/lista 0,50–1,00) → **medir**.
3. Final sólo de la toma aprobada: `seedance25-i2v` 8 s 720p ≈ **3,78**, o `flux3-*-draft` → `flux3-enhance`.

```bash
pnpm ai:fal --capability seedream5-lite --prompt "<territorio>" --count 4 --size auto_2K --out-dir ai-generations/2026-09-16_explorar/lite
pnpm ai:fal --capability h3turbo-i2v --image ai-generations/2026-09-16_explorar/lite/ancla.png --prompt "<acción>" --duration 5 --resolution 480P --out ai-generations/2026-09-16_explorar/turbo-01.mp4
pnpm ai:fal --capability seedance25-i2v --image ai-generations/2026-09-16_explorar/lite/ancla.png --prompt "<acción aprobada>" --duration 8 --resolution 720p --detach
```

### 6.2 Hero

- **Imagen hero:** `gpt-image-2.5-sunburst` `xhigh` 1536×1024 ≈ **0,074** por pieza (+ entrada si editas).
- **Video hero:** `seedance25-i2v` 10 s → 720p **4,73** · 1080p **11,64** (1080p sin verificar: prueba 5 s = 5,82 primero). Alternativas por fidelidad: `wan3-i2v` 10 s 1080p **2,00**; `h3max-i2v` 10 s 1080P **0,80** (refinado desde 768P).

### 6.3 Toma larga (> 15 s)

- `seedance25-t2v` 25 s 720p ≈ **11,83**; 480p ≈ 5,51.
- `wan3-t2v` 25 s 720p **2,50**; 1080p **5,00**.
- `flux3-t2v` 20 s 720p **3,40** (publicado).
- Nunca Seedance 2.0 ni H3 (tope 15 s) [contrato].

### 6.4 4K

- `seedance20-i2v --resolution 4k` 5 s ≈ **13,61** [cálculo: 194.400 tokens/s × 5 × 0,014/1000]; 10 s ≈ 27,22. Única 4K verificada.
- `h3-i2v --resolution 4K` 10 s **1,60** (reescalado desde 768P, no nativo).
- Alternativa: generar 1080p y reescalar en post; decide por contrato de fidelidad.

### 6.5 Control de cámara

`h3max-camera` 5 s 768P: registro 0,025/s → **0,125**; escalones [sin dato] → mide con `--balance`. Si el sujeto debe actuar, no sirve: usa i2v describiendo la cámara.

### 6.6 Inicio y fin exactos

- `flux3-flf` 5 s 720p **0,85** (publicado; registro 0,425).
- `wan3-i2v --end-image` 5 s 720p **0,50**.
- `seedance25-i2v --end-image` 5 s 720p **2,37**.
- `h3max-i2v --end-image` 6 s 768P **0,24**.

### 6.7 Keyframes

`flux3-keyframes-draft` 5 s **0,30** (publicado 0,06/s) → `flux3-enhance` del elegido (registro 0,425 por 5 s; publicado [sin dato]). Directo final 5 s 720p **0,85**.

### 6.8 Editar video

- **Sin personas ni marcas:** `seedance25-r2v --task editing`, costo = tokens de la salida + duración del video de entrada que cuenta para el cobro [oficial]; clip de 5 s a 720p con referencia de video ≈ 1,42 [cálculo con 0,2838/s; confírmalo con `--balance`].
- **Con personas o marcas:** `flux3-edit` 10 s **0,30** (720p).

### 6.9 Extender

- `seedance25-r2v --task extension --duration 8` 720p ≈ **3,78** (sin personas ni marcas; sin `--aspect`).
- `flux3-extend --duration 5` 720p **2,05** publicado (origen con audio; une origen + continuación en post). Borrador: `flux3-extend-draft` 5 s 0,30 registro (publicado [sin dato]).

### 6.10 Referencias multimodales

- `seedance25-r2v` 10 s 720p con videos de referencia ≈ **2,84**; sin videos ≈ 4,73.
- `wan3-r2v` 10 s 720p **1,00**.
- `h3max-r2v` 10 s 768P **0,40**.
- Siempre al menos una imagen o video; cita por `@Image1`/`@Video1` (Seedance) o por posición (Wan).

### 6.11 Video desde web o documento

`wan3-r2v --thinking --web-url` 15 s 720p **1,50**; con `--file` igual precio [cálculo], sin corrida real. Escribe el guion en el prompt.

### 6.12 Consistencia de personaje o producto

1. Hoy: referencias r2v con la misma hoja de personaje/producto en cada toma (`seedance25-r2v` si no hay rostros reales; `wan3-r2v` o `h3max-r2v` si los hay).
2. Futuro: LoRA de H3 (postergada [decisión]; verificación mínima: entrenamiento t2v 100 steps **0,50** + inferencia).
3. Otro carril: Higgsfield Soul ID (skill motion-design-studio). Kling elements: expuestos como campo `elements` en `hf-kling3-*` (Higgsfield API) vía `--input`, **sin corrida real**.

### 6.13 Capas editables

`seedream5-pro-layerize` sobre un KV 2K con 8 capas ≈ **0,54** (0,0675 × 8); bajo 1536² ≈ 0,27. Entrega `NN-<nombre>.png` + `layers.json`.

### 6.14 Vectores

Recraft V4.1 vía Higgsfield CLI: **sin sesión** (`Not authenticated`) hasta que una persona haga `higgsfield auth login` en navegador [contrato]. Sin vía operativa hoy. No sustituir con vectorización de raster. **API de Higgsfield:** `model_type: vector|utility_vector` existe en la app de Higgsfield; la API no lo documenta y su estimación ignora campos desconocidos, así que **si la API entrega SVG está sin confirmar** hasta una generación real (§5.8).

### 6.15 Texto en imagen

Concepto: `seedream5-pro` (texto denso multilingüe declarado) o `gpt-image-2.5-*` `high` (≈ 0,041 a 1536×1024). Final: compón el texto fuera del modelo (§0). En video, H3 y Flux 3 declaran texto preciso [oficial] y Wan admite debilidad [oficial]: igual se compone en post.

### 6.16 Campaña híbrida (imagen → video)

1. Divergencia: 12 × `seedream5-lite` = **0,42**.
2. Look/material del ancla: 2 × `seedream5-pro` 2K = **0,27**.
3. Final con precisión y layout: 3 × `gpt-image-2.5-sunburst` `xhigh` 1536×1024 = **0,22** (+ entrada por edición).
4. Adaptaciones de formato extremo: `seedream5-pro-edit` con el ancla = 0,135 + 0,0045 por referencia adicional.
5. Video: exploración `h3turbo-i2v` y final en el motor que pida el contrato de fidelidad de cada toma.
Canon del flujo híbrido: skill `greenhouse-ai-image-generator`, referencia `seedream-5-gpt-image-2-hybrid-production.md` [decisión].

---

## 7. Presupuesto y control de gasto

### 7.1 Costo de un clip de 10 s por resolución (USD)

[oficial] = tarifa publicada × 10 · [cálculo] = fórmula de tokens o aritmética · (registro) = sólo tarifa del registro, sin escalón publicado.

| Modelo | 480p / 480P | 720p / 768P | 1080p / 1080P / 2K | 4K |
|---|---:|---:|---:|---:|
| Seedance 2.5 | 2,21 [oficial] | 4,73 [oficial] | 11,64 [oficial, 1080p sin verificar] | — |
| Seedance 2.0 base | 1,41 [cálculo] | 3,02 [oficial] | 6,85 [cálculo] | 27,22 [cálculo] |
| Seedance 2.0 fast | 1,13 [cálculo] | 2,42 [oficial] | — | — |
| Seedance 2.0 mini | 0,72 [oficial] | 1,55 [oficial] | — | — |
| Seedance 2.0 us | 1,73 [oficial] | 3,70 [oficial] | — | — |
| H3 base | 0,50 [oficial] | 0,60 (768P) [oficial] | 1,30 (2K) [oficial] | 1,60 [oficial, reescalado] |
| H3 Max | 0,25 [oficial] | 0,40 (768P) [oficial] | 0,80 (1080P) [oficial] | — |
| H3 Max Turbo | 0,125 (registro; 480P no publicado) | 0,20 lista / 0,10 promo [oficial] | 0,40 lista / 0,20 promo [oficial] | — |
| H3 camera | 0,25 (registro) | [sin dato] | [sin dato] | — |
| H3 LoRA | 0,625 (registro) | [sin dato] | [sin dato] | [sin dato] |
| Flux 3 final | — | 1,70 [oficial] (registro 0,85) | 2,90 [oficial] | — |
| Flux 3 draft | 0,60 [oficial] (registro 0,30) sin resolución | | | |
| Flux 3 edit | — | 0,30 [oficial] | — | — |
| Flux 3 extend (10 s nuevos) | — | 4,10 [oficial] (registro 2,05) | 5,30 [oficial] | — |
| Wan 3.0 | 0,50 [oficial] | 1,00 [oficial] | 2,00 [oficial, default] | — |
| Wan 3.0 Prime | 0,68 [oficial] | 1,40 [oficial] | 2,80 [oficial] | — |

**Spot de 30 s ≈ 120 s generados** [cálculo]: todo Turbo 480P ≈ 1,50 (registro, medir) · todo Wan 480p 6,00 / 1080p 24,00 · todo Seedance 2.5 720p ≈ 56,76 · mixto (100 s de exploración Turbo 480P + 30 s finales Seedance 2.5 720p) ≈ 15,44.

### 7.2 Estrategia explorar → final

1. Explora en el motor más barato que conserve lo que quieres juzgar (movimiento: Turbo 480P / Flux 3 draft / Seedance mini 480p; look: Seedream Lite; layout: GPT Image 2.5 `medium`).
2. Genera en el motor final **sólo** la toma aprobada, a la resolución de entrega.
3. Arregla defectos editoriales en post; no regeneres por crop, texto, grade o mezcla [decisión].
4. Para la toma final pasa `--resolution` explícito. Sin ese flag, el CLI envía la resolución **más barata** del endpoint y lo avisa (`· sin --resolution: uso 480p…`); antes del 2026-09-16 se heredaban los defaults caros del proveedor (Wan 1080p ≈ 0,20/s, H3 base 2K ≈ 0,13/s) [contrato] [oficial].

### 7.3 Reglas de gasto

- **Mide con `--balance` antes y después** de la primera corrida aislada en toda familia con precio incierto: Flux 3 (final, draft, enhance, extend, extend-draft), H3 Max Turbo, H3 Max (promo vs lista), H3 camera, H3 LoRA, Wan Prime, Seedance 2.5 1080p. Una corrida por familia, sola, sin otros trabajos en la cuenta.

  ```bash
  pnpm ai:fal --balance
  pnpm ai:fal --capability flux3-t2v --prompt "<escena de prueba>" --duration 5 --resolution 720p --out ai-generations/2026-09-16_medicion/flux3-720p.mp4
  pnpm ai:fal --balance
  ```

- **Seedance**: estima con la fórmula de tokens de fal (§5.3); nunca con la equivalencia de OpenArt.
- **OpenAI**: estima con la fórmula oficial (§5.1) y valida con el `usage` que imprime el CLI.
- **Dos cuentas fal** [contrato]: `FAL_API_KEY` (cuenta A) y `FAL_API_KEY_B` (cuenta B), secretos `greenhouse-fal-api-key` y `greenhouse-fal-api-key-b`. Sin `--fal-account`, el CLI usa la de más saldo y, si fal la bloquea por saldo (403, antes de encolar, no cobra), pasa sola a la otra. Forzar: `--fal-account FAL_API_KEY_B`.
- **`--detach` / `--status` / `--request-id`** [contrato]: `--detach` encola, imprime `request_id` y cuenta, y termina; `--status` consulta una vez sin esperar ni descargar (no cobra); `--request-id` retoma y descarga **sin volver a pagar**. Un timeout local **no** detiene el trabajo en fal: sigue corriendo y se cobra; retómalo. Esperas por defecto: imagen 3 min · video 30 min · entrenamiento 3 h.

  ```bash
  pnpm ai:fal --capability seedance25-r2v --image ref.png --prompt "@Image1 <acción>" --duration 10 --resolution 720p --detach
  pnpm ai:fal --capability seedance25-r2v --request-id <request_id> --status
  pnpm ai:fal --capability seedance25-r2v --request-id <request_id> --out ai-generations/2026-09-16_mi-pieza/sd25.mp4
  ```

- **Rechazos cobrados**: Seedance cobra aunque el filtro rechace después de encolar [verificado]. Revisa personas y marcas **antes**.
- **Estimación y confirmación en `ai:fal`** (desde 2026-09-16, commit `17196ead1`) [contrato]: antes de encolar el CLI imprime `$ costo estimado ≈ USD X · <base del cálculo>`.
  - Seedance: fórmula de tokens (área × segundos × 24 / 1024 × precio por 1.000 tokens de la API de pricing). Con `--duration auto` o sin `--duration` usa el máximo del contrato como cota superior (2.5 a 480p ≈ USD 6,45): pasa `--duration`.
  - H3 base/Max/Turbo, Wan 3.0/Prime y Flux 3 (final, draft, extend, edit): precio publicado por escalón de resolución; donde no hay escalón publicado (camera-controls, LoRA, enhance, extend draft, Turbo 480P) usa el precio de la API. Extend cobra los segundos nuevos de `--duration`; edit mide con `ffprobe` la duración del video de origen local.
  - Seedream: por imagen según área (+ 0,0045 por referencia extra en Pro edit). Layerize: precio por capa, sin total (el número de capas lo decide el modelo).
  - Entrenadores H3: `steps × precio` con mínimo facturable de 100 steps.
  - **Tope:** si la estimación supera USD 1 (o `FAL_COST_CONFIRM_USD`, o `--max-usd <n>` para esa corrida), el CLI se detiene **antes de encolar** y pide `--yes`. Sin estimación posible (slug fuera del registro con `--model`, datos faltantes) avisa y no bloquea.
  - La estimación es orientativa: las tablas de escalones son de las páginas de fal y fabricantes al 2026-09-16. La medida real sigue siendo `--balance` antes y después. Las subidas de archivos locales ocurren antes de la estimación (subir no cobra).

  ```bash
  pnpm ai:fal --capability wan3-t2v --prompt "<escena>" --duration 10 --resolution 1080p --out ai-generations/2026-09-16_mi-pieza/wan3.mp4
  # → $ costo estimado ≈ USD 2.00 · … supera el tope de USD 1.00 → repite con --yes
  pnpm ai:fal --capability wan3-t2v --prompt "<escena>" --duration 10 --resolution 1080p --yes --out ai-generations/2026-09-16_mi-pieza/wan3.mp4
  ```

---

## 8. Brechas, fallas conocidas y pendientes

### 8.1 `pnpm ai:image` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| Sin `--output-compression` | No controlas la compresión de JPEG/WebP | Recomprime en post |
| `--count N` = N pedidos pagados secuenciales | Multiplica costo y tiempo (el CLI lo avisa y la estimación ya multiplica por N) | Cuenta `N × costo` |
| Estimación sólo informativa | No hay tope ni `--yes` en `ai:image`; sin estimación con `--size auto` o modelos sin grilla | Revisa la línea `$ costo estimado` antes de dejarlo correr |
| `--input-fidelity` con 2.5 o GPT Image 2 se ignora en silencio | Crees controlar algo que no viaja | No lo uses |
| Sin `--moderation` | No puedes usar `moderation=low` | — |
| `--batch` no usa la Batch API | Sin descuento 50 % | Batch sólo vía API directa con `gpt-image-2` |
| Default de salida `public/images/generated` | Riesgo de commitear assets | Siempre `--out`/`--out-dir` |

**Resuelto el 2026-09-16 (commit `17196ead1`):** `--format png|jpeg|webp` (o deducido de la extensión de `--out`); `--size` validado en local contra la grilla del modelo; `--background` validado; aviso de `--count N`; estimación previa con la fórmula oficial de tokens. Sigue [sin dato] si OpenAI rechaza un tamaño inválido antes de cobrar (ahora el CLI corta antes).

### 8.2 `pnpm ai:fal` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| `--size`/`--count` sin validar en imagen | Lite reescala solo | Usa el enum |
| Sin flags para `max_images`, `enhance_prompt_mode`, `enable_safety_checker` | Sólo vía `--input` | `--input '{"campo":valor}'` |
| `--seed` forzado por `--input` en un endpoint que no lo declara | Efecto [sin dato] | No lo fuerces |
| Layerize: número de capas y si la base se cobra | [sin dato]; la estimación muestra precio por capa sin total | Presupuesta 16 capas como techo |
| Flux 3: la API de pricing devuelve la mitad del precio publicado | Causa [sin dato]; la estimación usa el publicado | Mide con `--balance` |
| Estimación orientativa | Tablas de escalones al 2026-09-16, pueden cambiar; las subidas locales ocurren antes de estimar (no cobran) | `--balance` antes y después |
| Registro con precio del escalón más bajo | Subestima Wan, H3 base/Max/Turbo y Flux 3 | Usa el publicado (§4.2) |
| Nota del registro "Hasta 4K" en `seedream5-pro` | Corregida el 2026-09-16 (tope 2048²; también notas de precio de Wan, Flux 3 y H3) | Resuelto |
| Default de salida `public/images/generated` | Riesgo de commitear | Siempre `--out`/`--out-dir` |

**Resuelto el 2026-09-16 (commit `17196ead1`)** [contrato]: formato real de Seedream Pro derivado de `--out` + detección por bytes con corrección de extensión; `--format` rechazado en Lite; `--seed` aceptado sólo en los 19 endpoints que lo declaran (H3 de generación, Wan 3.0/Prime, `seedance25-r2v`); tope de 10 `--image` en Seedream edit validado; `--lora …#weight_name`, `--frames` y `--split-threshold` con validación (también por `--input`); estimación de costo con confirmación `--yes` sobre el tope; resolución más barata por defecto en video.

### 8.3 Higgsfield API dentro de `pnpm ai:fal` [contrato]

| Brecha | Efecto | Mitigación |
|---|---|---|
| Cuenta de API sin créditos (`403 not_enough_credits`) | Ninguna generación real verificada | Recargar en console.higgsfield.ai/billing y verificar una generación por familia (anotar `verifiedAt`) |
| Sin API de saldo documentada | `--balance` no muestra monto | Consola del proveedor |
| Seedance/Wan 3.0: la estimación devuelve fórmula | La CLI calcula una cota antes de descuento | Si falta la duración de un video remoto de entrada, pide `--yes` |
| Validador local = subconjunto de JSON Schema | Lo no cubierto lo rechaza la estimación (sin cobrar) | Mensaje del proveedor en inglés en ese caso |
| Snapshot de esquemas puede quedar viejo | Enum o rango desactualizado | `pnpm ai:higgsfield:sync-schemas` |
| Salida retenida ≥ 7 días | Un `--detach` olvidado pierde el archivo | Recuperar con `--request-id` dentro de la ventana |

### 8.4 Pendientes

| Pendiente | Estado | Condición de cierre |
|---|---|---|
| **LoRA H3 y entrenadores** | Postergados [decisión]. Costos corregidos: piso 100 steps → t2v ≥ 0,50, i2v/flf2v ≥ 1,00, ref2va ≥ 1,50; captions por clip obligatorias; clips < 73 cuadros descartados | Verificar entrenamiento t2v de 100 steps + 1–3 inferencias `h3-t2v-lora` y anotar `verifiedAt` |
| **Recraft V4.1 vía Higgsfield** | Sin sesión (`Not authenticated`) | Persona hace `higgsfield auth login` en navegador con mkt@efeoncepro.com |
| **Rotación de la clave B de fal** | Pendiente [contrato] | Rotar `greenhouse-fal-api-key-b` con verificación del consumer |
| ~~Estimación de costo en `ai:fal`~~ | **Cerrado 2026-09-16** (commit `17196ead1`): estimación + confirmación con tope + resolución barata por defecto | — |
| **Nano Banana Pro sin superficie** | `gemini-3-pro-image` disponible en Vertex (models.get OK 2026-09-16) pero ninguna superficie lo usa; decisión pendiente del operador de exponerlo | Decisión del operador |
| Medición real de precios | Flux 3 (todos), H3 Turbo/Max/camera, Wan Prime, Seedance 2.5 1080p | Corrida aislada con `--balance` (§7.3) |
| Calidad y latencia Wan base vs Prime | Sin medir | Misma toma en ambos, comparar |
| `wan3-r2v --file` | Sin corrida real | Una corrida con documento |
| Nitidez de Seedance 2.5 a 1080p | Sin verificar | 5 s a 1080p revisado cuadro a cuadro |

---

## 9. Rankings externos

**Ningún ranking es la verdad.** Metodologías, versiones, calidades y fechas difieren; los votos de GPT Image 2.5 son pocos (≈ 3–7 mil) frente a GPT Image 2; las cifras de Arena y AA se leyeron con un resumidor y conviene revalidarlas a mano antes de citarlas externamente [tercero]. Decide con tu brief y el contrato de fidelidad.

### 9.1 Imagen

| Modelo | OpenArt Arena imagen v1.0 (2026-09-16) | Arena texto a imagen (act. 2026-09-07) | Arena edición (act. 2026-09-07) | Artificial Analysis T2I (leído 2026-09-16) | Artificial Analysis edición (leído 2026-09-16) |
|---|---|---|---|---|---|
| GPT Image 2.5 Sunburst | no listado | #1 · 1421±13 · 3.149 votos | #1 · 1520±9 · 6.704 | #2 (max) · 1183 | #1 (max) · 1164 |
| GPT Image 2.5 Flare | no listado | #2 · 1399±13 · 2.856 | #2 · 1491±9 · 5.676 | #1 (max) · 1189 | #2 (max) · 1140 |
| GPT Image 2 | #2 · 1047 | #3 (medium) · 1381±4 · 78.731 | #3 (medium) · 1461±3 · 235.928 | #3 (high) · 1173 | #5 (high) · 1113 |
| Seedream 5.0 Pro | **#1 · 1051** | #10 · 1257±4 · 62.443 | #8 · 1394±4 · 179.966 | #15 · 1082 | #9 · 1099 |
| Seedream 5.0 Lite | no listado | #37 · 1138±3 | #26 · 1294±3 | #43 · 1000 | #20 · 1049 |
| Nano Banana Pro (no en CLIs) | #3 · 1008 | — | — | — | — |

OpenArt completo (2026-09-16): 1 Seedream 5.0 Pro · 2 GPT Image 2 · 3 Nano Banana Pro · 4 Grok Imagine 2.0 · 5 Nano Banana 2 · 6 Qwen Image 3.0 · 7 Flux.2 Pro.

**Contradicción:** OpenArt pone a Seedream 5.0 Pro #1; Arena lo pone #10/#8 y AA #15/#9, con GPT Image 2.5 #1/#2 en ambos. No se elige uno como verdad.

### 9.2 Video

| Modelo | OpenArt Arena video v1.0 (2026-09-16) | AA texto a video con audio (2026-09-16) | AA texto a video sin audio | AA imagen a video con audio | AA imagen a video sin audio |
|---|---|---|---|---|---|
| Seedance 2.5 | **#1 · 1125** | no incluido | no incluido | no incluido | no incluido |
| Wan 3.0 | #2 · 1047 | **#1 · 1240** | **#1 · 1335** | #6 · 1178 | #2 · 1360 |
| Seedance 2.0 | #3 · 1044 | #5 · 1220 (720p) | — | #2 · 1197 (720p) | #4 · 1342 |
| Seedance 2.0 Mini | #4 · 1033 | — | — | — | — |
| Gemini Omni Flash (no en CLIs) | #5 · 1029 | #2 · 1237 | #2 · 1325 | #5 · 1181 | **#1 · 1365** |
| Flux 3 Video | #6 · 1003 | no incluido | no incluido | no incluido | no incluido |
| MiniMax H3 | #7 · 1000 (ancla) | #4 · 1225 | #3 | #3 · 1190 | #3 · 1351 |
| H3 Max (post-entrenado por fal) | — | #3 · 1231 | — | **#1 · 1206** | — |
| Kling 3.0 Omni (vía Higgsfield API, sin corrida real) | #8 · 979 | — | — | — | — |

OpenArt 9–11: HappyHorse 1.1 · Grok Imagine 1.5 · PixVerse V6. Subcategoría Video Editing de OpenArt: #1 Wan 3.0, pero **en fal Wan 3.0 no tiene endpoint de edición** (la edición Wan conectable es 2.7, no conectada). Sub-puntajes OpenArt de Seedance 2.5: adherencia 1053, estética 1096, física y movimiento 1104, consistencia 1195. fal afirma que H3 Max es #1 en su propia evaluación humana contra 12 modelos (autodeclarado) [oficial]; BFL declara Elo 1135 de Flux 3 en texto a video (autodeclarado) [oficial].

**Contradicción:** OpenArt pone a H3 última de los conectados y a Seedance 2.5 #1; AA pone a H3 Max #1 en imagen a video con audio y a Wan 3.0 #1 en texto a video, y no incluye Seedance 2.5 ni Flux 3. No hay ganador universal.

---

## 10. Carriles fuera de los CLIs y candidatos NO conectados

### 10.1 Disponibles fuera de `ai:image` / `ai:fal`

| Carril | Motor | Estado | Regla |
|---|---|---|---|
| Google directo (Vertex, location `global`), runtime `generateImage` provider `google-gemini-image` | **Nano Banana 2** = `gemini-3.1-flash-image` (default del provider; sobrescribible con `GOOGLE_GEMINI_IMAGE_MODEL`) | En runtime del producto; **sin CLI** [contrato] | Cambiar la env cambia todo el carril del producto [contrato] |
| Google directo (Vertex) | **Nano Banana Pro** = `gemini-3-pro-image` | Disponible (models.get OK 2026-09-16) pero **ninguna superficie lo usa**; `gemini-3.1-pro-image` responde 404 [verificado] | Siempre directo por Google, nunca por fal [decisión]; exponerlo es decisión pendiente |
| Google directo | **Gemini Omni Flash** (video) | Sin CLI en el repo [contrato] | Siempre directo por Google (más barato, misma calidad), nunca por fal [decisión]. Rankings: OpenArt #5; AA #1 imagen a video sin audio [tercero] |
| Higgsfield CLI `~/.local/bin/higgsfield` (cuenta mkt@efeoncepro.com), out-of-band | **Recraft V4.1** vectores reales (SVG) | `Not authenticated` al 2026-09-16 [verificado] | Requiere `higgsfield auth login` por una persona. Distinto del carril Higgsfield **API** de `ai:fal` (§5.8) |

### 10.2 Evaluados y NO conectados (no usar como si existieran)

Precios de la API de pricing de fal (2026-09-16), escalón más bajo, **no verificados**.

| Candidato | Qué ofrece | Precio fal | Por qué importa |
|---|---|---|---|
| **Kling 3** (O3 standard/pro/4K; V3; imagen o3) | Multi-prompt multi-toma, `shot_type`, *elements* con voz para consistencia, video a video edit/reference; V3 negative_prompt, cfg_scale, motion-control con video de movimiento, turbo; imagen hasta 4K con series coherentes 2–9 | O3 standard/pro 0,14/s · 4K 0,42/s; V3 turbo 0,112–0,14/s; motion-control 0,126–0,168/s; imagen 0,028/img | Consistencia de personaje por *elements*; 4K. OpenArt video #8 [tercero] |
| **Grok Imagine** (video v1.5, video base, imagen v2.0) | v1.5 1–15 s hasta 1080p, r2v 1–7 imágenes; base con edit-video y extend-video 2–10 s; imagen `quality low|medium` 1k/2k | v1.5 0,01/s (el más barato); base 0,05/s; imagen "0,01 USD/unidad" (unidad [sin dato]) | Exploración ultrabarata; OpenArt video #10, imagen 2.0 #4 [tercero] |
| **Recraft vía fal** (23 endpoints) | text-to-vector V4.1, pro, vectorize, upscale crisp, estilos propios `recraft/v4/style/*` | text-to-vector 0,08 · pro 0,30 · vectorize 0,01 · upscale crisp 0,004 · create-style 0,005 | Vía alternativa a Higgsfield para SVG |
| **Qwen Image 3** | Imagen, edición, *layered* | [sin dato] | Capas; OpenArt imagen #6 [tercero] |
| **Wan 2.7** | Edición de video | [sin dato] | Edición Wan (3.0 no la expone en fal) |
| **HappyHorse 1.1**, **PixVerse V6** | Video | Conectados vía Higgsfield API (`hf-happyhorse11-t2v`, `hf-pixverse6-t2v`), sin corrida real | OpenArt video #9 y #11 [tercero] |
| **Flux.2 Pro** | Imagen | [sin dato] | OpenArt imagen #7 [tercero] |
| **Flux 3 directo en BFL** | qhd/uhd hasta 3840×2176, keyframes por timestamp, i2v con 1–10 imágenes | qhd 0,40/s · uhd 0,80/s [oficial] | 4K de Flux 3 |
| **Wan 3.0 directo en Alibaba** | Edición (incluye cambiar diálogo), extensión adelante/atrás, multi-shot 4–6 s por plano | Prime 720P 0,127199/s [oficial] | Funciones que fal no expone |

Conectar cualquiera exige: slug + contrato en `fal-capabilities.ts`, corrida real, y actualizar esta guía (§11). Mientras tanto, `pnpm ai:fal --model <slug> --input '<json>'` corre un slug fuera del registro **sin validación** [contrato]: úsalo sólo para evaluar, no para producción.

---

## 11. Regla de mantenimiento

Al **conectar**, **verificar** o **medir** un modelo (precio real, latencia, resolución nativa, rechazo de contenido), actualiza **en el mismo commit**:

1. `src/lib/ai/fal-capabilities.ts` (contrato, `verifiedAt`, precio, notas) o `src/lib/ai/openai-image.ts` según el carril.
2. `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` (o `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` para OpenAI/Gemini).
3. **Esta guía**: árbol (§2/§3), matriz (§4), ficha (§5), tabla de costo (§7.1), brechas/pendientes (§8) y, si cambió un ranking, §9 con fecha.
4. `docs/manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md` si cambian comandos o flags.

Reglas: sube la versión de este documento (menor si agregas/corriges datos; mayor si cambias estructura); cada dato nuevo con etiqueta de evidencia y fecha; nunca borres una contradicción resuelta sin dejar la evidencia que la resolvió; rankings siempre con fecha y fuente.

---

## 12. Fuentes

Leídas el 2026-09-16 salvo otra fecha indicada.

**Repo (contrato y verificación)**
- `src/lib/ai/fal-capabilities.ts` · `src/lib/ai/fal.ts` · `scripts/ai/fal-image.ts` · `src/lib/ai/openai-image.ts` · `scripts/ai/generate-image.ts` · `src/lib/ai/image-generator.ts`
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` · `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` · `docs/manual-de-uso/ai-tooling/operar-cli-fal-seedream-seedance.md`
- `.claude/skills/motion-design-studio/workflows/engine-selection-by-fidelity-contract.md` · `.claude/skills/greenhouse-ai-image-generator/SKILL.md` · `.claude/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md`
- OpenAPI de cola de fal: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<slug>`

**OpenAI [oficial]**
- O1 https://developers.openai.com/api/docs/guides/image-generation
- O2 https://developers.openai.com/_astro/GptImageTokenCalculator.react.yz8GdjDh.js (fórmula de tokens; el hash puede cambiar)
- O3 https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- O4 https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- O5 https://developers.openai.com/api/docs/models/gpt-image-2
- O6 https://developers.openai.com/api/docs/pricing
- O7 https://developers.openai.com/api/docs/changelog (Sep 8, 2026) · https://developers.openai.com/api/docs/deprecations
- O8 https://openai.com/index/introducing-chatgpt-images-2-5/ · https://deploymentsafety.openai.com/chatgpt-images-2-5

**ByteDance Seedream / fal [oficial]**
- B1 https://seed.bytedance.com/en/blog/beyond-generation-it-understands-design-introducing-seedream-5-0-pro
- B2 https://docs.byteplus.com/en/docs/ModelArk/2582774
- B3 https://docs.byteplus.com/en/docs/ModelArk/1541523
- B4 https://fal.ai/models/bytedance/seedream/v5/pro/text-to-image
- B5 https://fal.ai/models/bytedance/seedream/v5/pro/edit
- B6 https://fal.ai/models/bytedance/seedream/v5/pro/layerize
- B7 https://fal.ai/models/bytedance/seedream/v5/lite/text-to-image
- B8 https://fal.ai/models/bytedance/seedream/v5/lite/edit
- B9 [tercero] https://openrouter.ai/bytedance-seed/seedream-5-0-pro · https://www.atlascloud.ai/blog/ai-updates/seedream-5-0-pro-price (sin fecha verificada)

**Video**
- V1 https://fal.ai/models/bytedance/seedance-2.5/reference-to-video
- V2 https://fal.ai/models/bytedance/seedance-2.5/text-to-video
- V3 https://fal.ai/models/bytedance/seedance-2.0/us/text-to-video
- V4 https://fal.ai/models/bytedance/seedance-2.0/mini/text-to-video
- V5 https://fal.ai/seedance-2.0
- V6 https://fal.ai/models/bytedance/seedance-2.0/fast/image-to-video
- V7 https://www.minimax.io/blog/minimax-h3
- V8 https://blog.fal.ai/introducing-h3-max-by-fal/
- V9 https://fal.ai/models/minimax/h3/text-to-video
- V10 https://fal.ai/models/minimax/h3-max/text-to-video
- V11 https://fal.ai/models/minimax/h3-max-turbo/text-to-video
- V12 https://fal.ai/models/minimax/h3-max/director
- V13 https://fal.ai/models/minimax/h3/t2v/trainer
- V14 https://fal.ai/models/minimax/h3-max/camera-controls
- V17 https://fal.ai/models/alibaba/wan-3.0/text-to-video
- V18 https://fal.ai/models/alibaba/wan-3.0-prime/text-to-video
- V19 https://www.alibabacloud.com/blog/wan3-0-30-second-ai-video-generation-from-any-input_603452 (2026-08-13)
- V20 https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-guide · https://www.alibabacloud.com/help/en/model-studio/wan3-0-video-prime
- V21 https://bfl.ai/blog/flux-3-video
- V22 https://docs.bfl.ml/flux_3/flux3_overview
- V23 https://fal.ai/models/blackforestlabs/flux-3/text-to-video
- V24 https://fal.ai/models/blackforestlabs/flux-3/text-to-video/draft
- V25 https://fal.ai/models/blackforestlabs/flux-3/extend-video
- V26 https://fal.ai/models/blackforestlabs/flux-3/edit-video
- V27 https://fal.ai/flux-3
- V57 https://bfl.ai/legal/developer-terms-of-service · https://bfl.ai/legal/flux-api-service-terms

**Rankings y terceros [tercero]**
- R1 https://openart.ai/arena/leaderboard (2026-09-16)
- R2 https://arena.ai/leaderboard/text-to-image (act. 2026-09-07)
- R3 https://arena.ai/leaderboard/image-edit (act. 2026-09-07)
- R4 https://artificialanalysis.ai/image/leaderboard/text-to-image (leído 2026-09-16)
- R5 https://artificialanalysis.ai/image/leaderboard/editing (leído 2026-09-16)
- V28 https://artificialanalysis.ai/video/leaderboard/text-to-video (leído 2026-09-16)
- V29 https://artificialanalysis.ai/video/leaderboard/image-to-video (leído 2026-09-16)
- V31 https://picsart.com/blog/wan-3-0-vs-wan-3-0-prime/ (2026-08-31)
- V32 https://thenextweb.com/news/bytedance-seedance-2-5-ai-video-4k-30-seconds
- V33 https://technode.com/2026/07/31/bytedance-launches-seedance-2-5-video-generation-model/
- V34 https://en.wikipedia.org/wiki/Seedance_2.0
- V35 https://www.mindstudio.ai/blog/seedance-2-5-vs-wan-3-flux-3-miniax-h3 (2026-08-12)
- V36 https://www.seedance.tv/blog/seedance-2-5-review-2026
- V37 https://www.seedance.tv/blog/seedance-2-5-lip-sync-issues
- V38 https://www.mindstudio.ai/blog/seedance-2-5-review-guide
- V39 https://natlawreview.com/press-releases/seedance-20-api-now-live-fal
- V40 https://aiseedance25.app/seedance-2-5-1080p · https://apiframe.ai/guides/seedance-2-5-guide
- V43 https://the-decoder.com/bytedance-rolls-out-seedance-2-0-to-100-countries-but-keeps-the-us-off-the-list/
- V44 https://www.orcarouter.ai/blog/flux-3-video-vs-bytedance-seedance-2
- V45 https://www.mindstudio.ai/blog/seedance-2-0-content-restrictions-workarounds
- V46 https://phemex.com/news/article/bytedance-relaunches-seedance-20-globally-with-restrictions-on-realface-uploads-68605
- V47 https://huggingface.co/blog/ResterChed/minimax-h3-hailuo-3-0
- V48 https://www.atlascloud.ai/blog/tips/minimax-h3-commercial-use-license
- V49 https://pollo.ai/hub/minimax-h3-review · https://www.atlascloud.ai/blog/tips/minimax-h3-chinese-dialogue-accuracy
- V50 https://www.deeplearning.ai/the-batch/minimaxs-state-of-the-art-video-model-is-only-minimally-open
- V51 https://www.techtimes.com/articles/322904/20260804/minimax-h3-open-weights-exclude-us-eu-uk-korea-local-deployment.htm
- V53 https://www.prnewswire.com/news-releases/fal-launches-h3-max-a-new-post-trained-video-model-with-frontier-quality-and-faster-than-real-time-generation-302866462.html
- V54 https://www.marktechpost.com/2026/07/26/black-forest-labs-releases-flux-3-a-multimodal-flow-model-for-image-video-audio-and-robot-action-prediction/
- V55 https://datanorth.ai/news/black-forest-labs-releases-flux-3
- V56 https://morphic.com/resources/compare/seedance-2-5-vs-flux-3 · https://www.digitalapplied.com/blog/flux-3-vs-seedance-2-5-gemini-omni-video-field-2026
- V58 https://technode.com/2026/08/24/alibaba-launches-wan3-0-video-model-with-30-second-generation-and-document-input/
- V59 https://openrouter.ai/alibaba/wan-3.0-prime
- V60 https://wavespeed.ai/blog/ai-comparisons/wan-3-0-prime-vs-standard/ · https://www.atlascloud.ai/blog/tips/wan-3.0-prime
- V61 https://help.aliyun.com/en/model-studio/wan3-video-generation-api-reference
- V62 https://www.atlascloud.ai/blog/tips/wan-3.0-multi-shot-consistency · https://www.buildfastwithai.com/blogs/wan-3-0-review-accuracy-price-is-it-worth-it-2026
- V63 https://www.atlascloud.ai/blog/tips/is-wan-3.0-open-source
- V64 https://github.com/AlibabaCloud-Official/Wan3.0
