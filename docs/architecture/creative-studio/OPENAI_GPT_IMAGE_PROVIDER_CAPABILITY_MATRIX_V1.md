# OpenAI GPT Image — Provider Capability Matrix V1

> **Tipo:** investigación de proveedor y contrato de integración
> **Estado:** Accepted como evidencia de proveedor; no autoriza rollout
> **Versión:** 1.2 — 2026-11-05 (tarde): Greenhouse transporta la familia 2.6 en `pnpm ai:image` y
> `pnpm ai:inpaint`; consumo de `xhigh`/`max`, GIF en edits, `markup` y máscara medidos.
> **Versión anterior:** 1.1 — 2026-11-05: familia GPT Image 2.6 (Sunburst y Flare) y deprecaciones vigentes.
> **Validado:** 2026-11-05 (familia 2.6: identidad, endpoints, parámetros nuevos, consumo medido, system card,
> deprecaciones) con canario propio en `ai-generations/2026-11-05_gpt-image-2-6-canary/` (`results.json` y
> `cli/`). El contrato [contrato] de 2.6 se leyó del árbol de trabajo del 2026-11-05 en
> `src/lib/ai/openai-image.ts`, `scripts/ai/generate-image.ts` y `scripts/ai/inpaint/adapters/openai.ts`.
> Etiquetas de esta revalidación: [oficial] doc/blog OpenAI · [verificado 2026-11-05] corrida real nuestra ·
> [tercero] · [inferido] · [sin dato] · [contrato] lo que hace hoy nuestro código.
> **Validado antes:** 2026-09-08 (familia 2.5, ciclo de vida, precios, tamaños, streaming, provenance).
> El contrato transportado por el helper, la máscara del CLI y las líneas base de consumo medido — generar y
> editar — se validaron el 2026-09-16.
> Las secciones de transparencia GPT Image 2 y el mapeo Globe conservan su validación del 2026-08-21.
> **Owner:** Greenhouse AI Image Generator + Globe Model Fleet
> **Revalidación:** antes de implementar, cambiar precios, promover una ruta o usar una capacidad en preview

## Propósito y frontera de autoridad

Esta matriz consolida la documentación oficial vigente de OpenAI para la familia GPT Image y la traduce a los
contratos de Greenhouse y Efeonce Globe. No es un catálogo runtime ni demuestra disponibilidad.

```text
OpenAI documenta la capacidad
  != el helper Greenhouse la transporta
  != Globe la declara en OutputShapeV1
  != el adapter la envía
  != el output fue verificado
  != la ruta está promovida/disponible
```

La disponibilidad de Globe se lee en `globe.producer.fleet.list`. El código y los canaries viven en
`efeonce-globe`; esta matriz registra evidencia, gaps y criterios de implementación.

**Cómo revalidar sin intermediarios:** toda página de `developers.openai.com` sirve Markdown crudo agregando
`.md` a la URL (`https://developers.openai.com/api/docs/guides/image-generation.md`, HTTP 200, `text/markdown`),
y `https://developers.openai.com/api/docs/llms.txt` es el índice completo. Leer el `.md` en vez de dejar que un
resumidor procese el HTML: en la revalidación del 2026-09-08 el resumidor omitió la tabla de costos y negó
falsamente la existencia de `input_fidelity`.

## Resultado ejecutivo

- **Delta 2026-11-05 — llegó la familia 2.6; producción sigue en 2.5.** OpenAI publicó el 2026-11-04
  `gpt-image-2.6-sunburst` ("Image generation and editing for detailed visual work") y `gpt-image-2.6-flare`
  ("Image generation and editing for fast iteration") [oficial]. Sin id plano `gpt-image-2.6`, sin tier mini y
  **sin snapshot fechado**: el snapshot es el propio id, con `shutdown_date: null` [oficial] [verificado
  2026-11-05: `GET /v1/models/<id>` = 200]. Lo nuevo de verdad: `complexity`, **SVG nativo**, **GIF animado** y
  `markup` (este último también en 2.5). Ver §Novedades de 2.6.
- 🔴 **2.6 cobra la misma tarifa por token que 2.5 pero gasta muchos más tokens de salida en `low` y `medium`**
  [verificado 2026-11-05]: a 1024², `low` 824 tokens (2.5: 196, **4,2×**) y `medium` 1.449 (2.5: 439, **3,3×**);
  en `high`, `xhigh` y `max` empata (1.758 vs 1.756; 3.122 y 7.024 en ambas familias). **Sólo `low` y `medium`
  cuestan más.** La fórmula de grilla de 2.5 no reproduce 2.6 sin un factor. Ver §Precios.
- **Desde el 2026-11-05 (tarde) Greenhouse transporta 2.6** [contrato]: `gpt-image-2.6-sunburst` y
  `gpt-image-2.6-flare` están en `OpenAIImageModel` y en `OPENAI_IMAGE_MODEL_CAPABILITIES`; `pnpm ai:image` acepta
  `--model gpt-image-2.6-*` con `--complexity`, `--format svg|gif`, `--markup` y `--estimate`, y `pnpm ai:inpaint`
  acepta 2.6. **El default del CLI y del runtime sigue siendo `gpt-image-2`.** Globe sigue sin ruta de 2.6. Ver
  §Mapeo contra Greenhouse y Globe.
- **Endpoints de 2.6:** sólo `v1/images/generations` y `v1/images/edits` según la ficha, que marca Batch,
  Responses y Chat Completions como "not supported" [oficial]. 🔴 Contradicción medida: el tool `image_generation`
  de Responses con `tool.model: "gpt-image-2.6-flare"` **respondió 200 y generó** [verificado 2026-11-05]. No
  tratarlo como garantizado.
- **Deprecaciones vigentes (no causadas por 2.6):** `gpt-image-1` apagado el **2026-10-23**; `gpt-image-1.5`,
  `gpt-image-1-mini` y `chatgpt-image-latest` se apagan el 2026-12-01; **el reemplazo recomendado hoy es 2.5**
  [oficial]. `gpt-image-2` sigue sin fecha de retiro.
- **Delta 2026-09-08 — la familia 2.5 es la frontera.** OpenAI publicó `gpt-image-2.5-sunburst` y
  `gpt-image-2.5-flare` (snapshots `…-2026-09-08`) para Image API y para el tool `image_generation` de
  Responses API. Traen los niveles de calidad nuevos `xhigh` y `max` y **usan las mismas tarifas por token
  que GPT Image 2**.
- **`gpt-image-2` NO está deprecado** y sigue siendo el reemplazo recomendado en toda la tabla de
  deprecations. Conserva **Batch**, que 2.5 no soporta, y es el único de la familia con tabla oficial de
  costo por imagen y con rate limits publicados. No retirarlo por la llegada de 2.5.
  🔴 *Contradicción con la revalidación del 2026-11-05:* la tabla de deprecations hoy nombra a **2.5** como
  reemplazo recomendado, no a `gpt-image-2` [oficial]. Sobre Batch, ver §Superficies API (estado de 2.5 sin
  resolver). La afirmación de que 2.5 no es estimable ni tiene rate limits publicados contradice lo que registró
  `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` el 2026-09-16; ver §Contradicciones.
- **No existe forma documentada de estimar el costo por imagen de 2.5.** OpenAI lo declara explícito: tarifas
  iguales no implican costo por imagen igual. La única fuente es `usage` en la respuesta real. Ver §Precios.
- La única diferencia de contrato entre Flare y Sunburst es el valor de `model`. Mismo precio, mismos quality
  levels, mismos endpoints, misma feature (`inpainting`), mismas modalidades. La elección es de posicionamiento
  declarado por OpenAI, no de superficie API.
- `background: "transparent"` es **soporte pleno** en la familia 2.5 (la referencia lo declara por modelo y
  snapshot), frente al estado **preview** que conserva `gpt-image-2`. El output debe ser PNG o WebP.
- Los modelos GPT image devuelven **siempre base64**; `response_format: "url"` no está soportado.
- Image API permite elegir el modelo exacto. Responses API elige un modelo principal compatible y la herramienta
  `image_generation` administra su propia selección GPT Image; para 2.5 sí se puede fijar `model` **dentro del
  tool**, pero no como modelo top-level de `/v1/responses`.
- El helper Greenhouse **ya transporta la familia 2.5** y decide el contrato por capacidad declarada, no por
  literales de modelo. Ver §Mapeo contra Greenhouse y Globe para el contrato exacto.
- **Consumo medido, no estimado.** El costo por imagen de 2.5 sigue sin ser estimable desde la documentación,
  pero existe una línea base propia con `usage` de respuestas reales: mismo consumo entre Flare y Sunburst para
  el mismo `quality`, y la diferencia entre modelos es de latencia. Ver §Precios.
- **Editar no abarata.** Medido el 2026-09-16: un edit devuelve la imagen completa aunque la máscara acote qué
  cambia, así que el `output` se cobra igual que una generación y la imagen base se suma como input — en `low`,
  **2,3× generar**. La máscara en sí es gratis. Ver §Qué cuesta editar frente a generar.

## Familia y ciclo de vida

Deprecations revalidadas el **2026-11-05** contra `https://developers.openai.com/api/docs/deprecations` (la
validación anterior fue el 2026-09-08).

| Identidad API | Snapshot/semántica | Estado oficial al corte | Retiro anunciado | Uso nuevo |
|---|---|---|---|---|
| `gpt-image-2.6-sunburst` | **sin snapshot fechado**: el snapshot es el id; `shutdown_date: null` [oficial] [verificado 2026-11-05] | activo desde 2026-11-04; "Image generation and editing for detailed visual work" | no anunciado | Sí, por elección explícita: Greenhouse lo transporta desde 2026-11-05 [contrato]; no es default |
| `gpt-image-2.6-flare` | **sin snapshot fechado**: el snapshot es el id; `shutdown_date: null` [oficial] [verificado 2026-11-05] | activo desde 2026-11-04; "Image generation and editing for fast iteration" | no anunciado | Sí, por elección explícita: Greenhouse lo transporta desde 2026-11-05 [contrato]; no es default |
| `gpt-image-2.5-sunburst` | alias + `gpt-image-2.5-sunburst-2026-09-08` | activo; "our most capable model for image generation and editing" (texto del 2026-09-08); **default de `/v1/images/edits`** [oficial 2026-11-05] | no anunciado | Sí |
| `gpt-image-2.5-flare` | alias + `gpt-image-2.5-flare-2026-09-08` | activo; "our fastest model for high-quality, everyday image generation" (texto del 2026-09-08) | no anunciado | Sí |
| `gpt-image-2` | alias + `gpt-image-2-2026-04-21` | activo; sin fecha de retiro. Al 2026-09-08 era el reemplazo recomendado de toda la tabla; al 2026-11-05 lo es **2.5** [oficial] | no anunciado | Sí |
| `gpt-image-1.5` | `gpt-image-1.5-2025-12-16` | deprecated; reemplazo recomendado 2.5 | 2026-12-01 | No |
| `gpt-image-1` | sin snapshot fechado distinto en la ficha | **apagado el 2026-10-23** | ya ocurrió | No; el helper lo corta antes de la red (`assertOpenAIImageModelAvailable`) [contrato] |
| `gpt-image-1-mini` | alias del modelo económico de la generación 1 | deprecated; reemplazo recomendado 2.5 | 2026-12-01 | No |
| `chatgpt-image-latest` | alias del modelo anteriormente usado por ChatGPT | deprecated; no recomendado para API; reemplazo recomendado 2.5 | 2026-12-01 | No |

Las deprecaciones vigentes **no las causó 2.6**: estaban anunciadas antes del 2026-11-04 [oficial]. 2.6 no trae
tier mini [oficial], y la tabla recomienda 2.5 como reemplazo de todos los modelos deprecados, no 2.6.

Los modelos DALL·E no pertenecen a la familia GPT Image. Sus snapshots fueron retirados del API el
2026-05-12; no son una alternativa vigente para una integración nueva.

> **Trampa documental vigente:** el schema de `/v1/images/generations` todavía declara `dall-e-2` como
> **default de `model`**, pese a que ese modelo se apagó el 2026-05-12. **NUNCA omitir `model` en un request.**

### Cómo elegir entre 2.6, 2.5 y GPT Image 2

| Situación | Modelo | Razón documentada |
|---|---|---|
| Edición donde la precisión manda | `gpt-image-2.5-sunburst` | OpenAI lo posiciona para "workflows where editing precision matters most" |
| Generación cotidiana de alta calidad | `gpt-image-2.5-flare` | OpenAI lo posiciona como el más rápido de la familia |
| Requiere Batch API | `gpt-image-2` | 2.5 marca `v1/batch → Not supported` y no tiene fila batch en pricing |
| Requiere presupuesto por imagen estimable antes de gastar | `gpt-image-2` | Es el único con calculadora oficial; 2.5 sólo se mide con `usage` real |
| Requiere rate limits conocidos para dimensionar | `gpt-image-2` | 2.5 no publica tabla de rate limits (ver §Contradicciones: el generador registró lo contrario el 2026-09-16) |
| Requiere SVG nativo o GIF animado del proveedor | `gpt-image-2.6-flare` | Sólo 2.6 acepta `output_format: "svg" \| "gif"` [oficial]. Greenhouse lo transporta: `pnpm ai:image --format svg\|gif` [contrato] |
| Explorar barato en `low`/`medium` | 2.5 | 2.6 gasta 4,2× (`low`) y 3,3× (`medium`) más tokens de salida con la misma tarifa [verificado 2026-11-05] |
| Pieza final raster en `high`/`xhigh`/`max` | 2.5 Sunburst o 2.6 Sunburst | Mismo consumo de tokens [verificado 2026-11-05]; la calidad relativa en nuestras piezas no está medida [sin dato] |
| Edición guiada por marcas (`markup` o trazos sobre la foto) | 2.5 o 2.6 | Ambos verificados el 2026-11-05; `markup` no suma tokens de imagen de entrada |
| Editar una zona con máscara | Flare (2.5 o 2.6) | Sunburst 2.5 y 2.6 con la máscara del pipeline devuelven un panel negro [verificado: 3 de 3 en 2.5, 1 de 1 en 2.6] |

La tabla operativa completa «¿2.5 o 2.6?», con los comandos verificados, vive en
`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.6 y en `pnpm ai:image --help`.

## Superficies API

| Superficie | Selección | Generación | Edición/referencias | Máscara | Streaming | Identidad exacta | 2.5 | 2.6 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `POST /v1/images/generations` | GPT Image directo | Sí | No | No | Sí, `partial_images: 0..3` | Sí | Sí | Sí [oficial] [verificado 2026-11-05] |
| `POST /v1/images/edits` | GPT Image directo | No | Sí, hasta 16 imágenes | Sí | Sí, `partial_images: 0..3` | Sí | Sí | Sí [oficial] [verificado 2026-11-05: Flare multipart] |
| Responses API + `image_generation` | modelo principal GPT-5+; el tool admite `model` explícito | Sí | Sí, multi-turn | Sí, `input_image_mask` | Sí | Sí dentro del tool | Sí | 🔴 ficha: "not supported" [oficial]; **200 con `tool.model: "gpt-image-2.6-flare"`** [verificado 2026-11-05] |
| Chat Completions | — | — | — | — | — | — | — | "not supported" [oficial] |
| Batch API | endpoint Images embebido | Sí | Sí | Sí, según endpoint | resultado diferido, no SSE | Sí en el body del request | **No** (🔴 ver nota) | **No**: no está en la tabla de Batch; sin descuento Batch [oficial] |

**2.6 en Responses — contradicción medida, no garantía.** La ficha de 2.6 marca Responses como "not supported" y
el guide del tool `image_generation` todavía lista sólo 2.5, 2, 1.5 y 1-mini [oficial]. Aun así, una llamada con
mainline `gpt-5.5` y `tool.model: "gpt-image-2.6-flare"` respondió 200, generó (action `generate`) y devolvió
`revised_prompt` [verificado 2026-11-05]. Lectura adoptada: funciona hoy, pero no está documentado y puede dejar de
funcionar sin aviso. No construir un contrato sobre esto.

🔴 **Batch de 2.5 — sin resolver.** Esta matriz registra desde el 2026-09-08 que 2.5 no soporta Batch, y el
generador repite ese estado. En la revalidación del 2026-11-05 un informe reportó a 2.5 dentro de la tabla de
Batch [oficial según ese informe], mientras la guía sigue afirmando "Batch sólo gpt-image-2". No se leyó la tabla
de Batch directamente en esta pasada: **leerla antes de usar Batch con 2.5.** Para 2.6 no hay ambigüedad: no está.

**Otros proveedores con 2.6 al 2026-11-05:** Azure OpenAI / Foundry **no** tiene 2.6 (sólo 2.5) [oficial
Microsoft]. fal.ai lo expone como `openai/gpt-image-2.6/{flare,sunburst}/{text-to-image,edit}` con "Reasoning
Effort" [tercero]. OpenRouter como `openai/gpt-image-2.6-sunburst|flare`, sin SVG, GIF ni markup [tercero].
Higgsfield tiene una página "GPT Image 2.6" en créditos [tercero]. Replicate, Adobe y Figma: [sin dato]. En
ChatGPT y Codex el producto se llama «ChatGPT Images 2.6», disponible en todos los planes [tercero citando a
OpenAI].

La columna **Máscara** describe la superficie del proveedor, no lo que Greenhouse transporta. `/v1/images/edits`
acepta máscara desde siempre; lo que cambió el **2026-09-16** es que el CLI `pnpm ai:image` la expone con
`--mask`, así que el inpainting ya es alcanzable desde la terminal y no sólo llamando `editOpenAIImage()`.
Ver §Mapeo contra Greenhouse y Globe.

Las fichas de modelo marcan `Streaming: Not supported`, mientras la guía y el API reference documentan streaming
de Image API y Responses API. Para la integración se toma el contrato específico del endpoint como autoridad y se
registra esta contradicción documental; el streaming sigue sin estar probado en Globe.

Las fichas de 2.5 marcan además `Responses v1/responses → Not supported` mientras su propio cuerpo dice que se
puede seleccionar "as the model of the Responses API image generation tool". Lectura adoptada: no es modelo
top-level de `/v1/responses`; sí es `model` dentro del tool `image_generation`.

**Requisito de acceso:** la guía advierte que puede exigirse completar la **API Organization Verification**
desde la consola de desarrollador antes de usar modelos GPT Image.

## Contrato de salida — familias 2.6, 2.5 y GPT Image 2

Lo que sigue se documentó para 2.5 y GPT Image 2. Para 2.6, cada punto lleva su etiqueta: lo heredado está
[oficial] salvo donde se indica, y lo nuevo vive en §Novedades de 2.6.

### Fondo y transparencia

`background` acepta `transparent | opaque | auto`.

- En **2.5 el soporte es pleno**: la referencia declara verbatim que `gpt-image-2.5-sunburst` y
  `gpt-image-2.5-flare`, incluidos sus snapshots `2026-09-08`, soportan `opaque` y `transparent`.
- En **`gpt-image-2` la capacidad sigue en preview** para el alias y `gpt-image-2-2026-04-21`.
- En **2.6** `background: transparent | opaque | auto` con PNG/WebP está documentado [oficial] y se verificó con
  Sunburst 2.6: PNG con alfa 0..254 a 2048×1152 [verificado 2026-11-05]. Con `output_format: "svg"` la respuesta
  reportó `background: transparent` [verificado 2026-11-05].
- `output_format` debe ser `png` o `webp`; `jpeg` es inválido porque no preserva alfa.
- No debe confundirse un checkerboard renderizado con transparencia real.
- Se debe validar que el archivo tenga canal alfa **y al menos un píxel no opaco**.
- El output debe revisarse sobre fondos claros y oscuros para detectar halos y residuos.

`background: "auto"` puede resolver a transparente u opaco. La respuesta del Image API expone el valor resuelto
como `background: "transparent" | "opaque"`; debe conservarse en provenance/readback, no inferirse del prompt.

### Calidad

`quality`: `low | medium | high | xhigh | max | auto`. Default documentado: **`auto`**.

- `xhigh` y `max` **existen sólo en las familias 2.5 y 2.6** [oficial]. Los modelos anteriores llegan hasta
  `high`.
- En 2.6 `quality` se combina con un control nuevo, `complexity`, que no es lo mismo: ver §Novedades de 2.6.
- OpenAI **no documenta qué significa cada nivel** ni su consumo de tokens. La única guía cualitativa es usar
  `low` para drafts y comparar niveles altos para encontrar el balance detalle/latencia/costo.
- El enum del endpoint también acepta `standard` y `hd`, que son valores heredados de DALL·E, no de GPT Image.

### Formato, compresión y tamaño

- Formatos: PNG por defecto, JPEG y WebP. `jpeg` es más rápido que `png`. **2.6 agrega `gif` y `svg`** [oficial],
  cada uno con restricciones propias (§Novedades de 2.6). El GIF también salió por `edits` [verificado
  2026-11-05], aunque la guía lo declara sólo para `generations`.
- `output_compression: 0..100`, default **100**; aplica sólo a JPEG y WebP; no debe enviarse con PNG.
- Tamaños recomendados: `1024x1024`, `1536x1024`, `1024x1536`. Default `auto`.
- Tamaños custom `WIDTHxHEIGHT` con **todas** estas reglas simultáneas:
  - ambos ejes múltiplos de **16**;
  - ratio entre **1:3 y 3:1**;
  - **ningún borde excede 3840 px** (la referencia fija el máximo soportado en `3840x2160`);
  - total de píxeles entre **655.360 y 8.294.400**.
- Resoluciones **superiores a `2560x1440` son experimentales** según la guía vigente.
- Las reglas de tamaño custom están documentadas para 2.5; para 2.6 se verificaron Sunburst 2.6 a `2048x1152` y a
  `1536x1024` (200 ambos) [verificado 2026-11-05]. En GIF el `size` es el de cada cuadro y el área mínima **no**
  aplica al cuadro: `640x640` (409.600 px, bajo 655.360) respondió 200 [verificado 2026-11-05]. El resto de la
  grilla en 2.6: [sin dato].
- `prompt` admite hasta **32.000 caracteres** en modelos GPT image.

> Delta respecto a la validación del 2026-08-21: el borde experimental que la doc declara hoy es `2560x1440`,
> no `3.686.400` píxeles, y la contradicción `< 3840` / `<= 3840` quedó resuelta a favor de `<= 3840`.

### Edición, referencias y máscaras

- `/v1/images/edits` acepta hasta **16 imágenes** por request en modelos GPT image. El orden y el rol semántico
  deben preservarse en el contrato.
- Dos transportes documentados: JSON con `images: [{ image_url | file_id }]`, o multipart con `image[]`.
- La imagen a editar y la máscara deben tener **el mismo formato y tamaño**, y pesar **menos de 50MB**.
- La máscara **debe tener canal alfa**. Una máscara en blanco y negro sin alfa no sirve; hay que convertirla.
  Se provee exactamente uno de `image_url` o `file_id`.
- La máscara guía al modelo, pero no es una garantía pixel-perfect. Con múltiples referencias se aplica a la
  primera imagen.
- `input_fidelity` (`high | low`) **existe sólo en `/v1/images/edits`**, nunca en `/generations`.
  - Para `gpt-image-2` la doc indica omitirlo: procesa todas las referencias en alta fidelidad y el API no
    permite cambiarlo.
  - **Para 2.5 la guía lo excluye explícitamente.** `input_fidelity` sobrevive en el enum del schema, pero en
    la guía vigente aparece únicamente dentro de la sección colapsada "Earlier GPT Image models", precedida
    de la frase verbatim *"The details below apply to earlier models, **not Sunburst or Flare**"*.
  - **NUNCA enviar `input_fidelity` con un modelo 2.5.** La preservación de identidad en 2.5 se pide **por
    prompt** (lista de invariantes repetida en cada turno), no por parámetro.
  - **Para 2.6: [sin dato].** No se encontró mención ni se probó. Mientras no se mida, no enviarlo. El helper ya
    lo impide: 2.6 declara `inputFidelity: false` [contrato].
- Edits en 2.6: hasta 16 imágenes (URL, base64 o `file_id`) y `mask` con alfa que guía, no matte exacto
  [oficial]. Medido con Flare 2.6 `low` 1024², `complexity: "low"`, multipart: 200, 1.024 tokens de imagen de
  entrada + 30 de texto, **962 de salida** — más que generar (824) — en ~11 s [verificado 2026-11-05].
- 🔴 **Máscara en 2.6** [verificado 2026-11-05, 1 de 1 cada caso]:
  - **Sunburst 2.6 con la máscara del pipeline `ai:inpaint`** (RGB negro bajo el alfa) → **panel negro**, el mismo
    defecto que en 2.5 (allí 3 de 3). Lo detectó el propio pipeline (veredicto REVISAR).
  - Sunburst 2.6 con una máscara que conserva el RGB de la foto bajo el alfa, en llamada directa → sin panel.
  - **Flare 2.6 por el pipeline → PASS, sin panel.**
  - Regla vigente: **Sunburst (2.5 y 2.6) edita sin máscara; Flare edita con máscara.**
- Ambos modelos 2.6 **redibujan la imagen entera**: deriva media de 12–17/255 fuera de la zona editada
  [verificado 2026-11-05]. Recomponer sobre la original sigue siendo obligatorio.
- Un output aceptado exige revisar deriva fuera de la región, identidad, texto/logos y geometría protegida.
- **Los formatos aceptados como imagen de entrada del endpoint de edits NO están documentados.** La tabla
  PNG/JPEG/WEBP/GIF de "Image input requirements" pertenece a la guía de visión de Responses/Chat y **no debe
  extrapolarse** a `/v1/images/edits`.
- **La máscara acota el resultado, no el gasto.** Medido el 2026-09-16: el `usage` de un edit con máscara y uno
  sin máscara fue **idéntico**, y su `output` fue el mismo que el de una generación desde cero — el modelo
  devuelve la imagen completa aunque la máscara limite qué cambia. Lo que encarece un edit es la imagen base,
  que se paga como tokens de entrada. Ver §Qué cuesta editar frente a generar.

### Respuesta y medición

```json
{
  "created": 1778000000,
  "background": "transparent | opaque",
  "output_format": "png | webp | jpeg",
  "quality": "low | medium | high | xhigh | max",
  "size": "WIDTHxHEIGHT",
  "data": [{ "b64_json": "…" }],
  "usage": {
    "input_tokens": 0,
    "input_tokens_details": { "image_tokens": 0, "text_tokens": 0 },
    "output_tokens": 0,
    "output_tokens_details": { "image_tokens": 0, "text_tokens": 0 },
    "total_tokens": 0
  }
}
```

- **Siempre base64.** `url` está marcado como no soportado para modelos GPT image, y `response_format` tampoco
  existe en el schema de `/edits`.
- `revised_prompt` en el objeto `Image` es `dall-e-3` only. En Responses API sí llega a nivel de
  `image_generation_call`. En 2.6 tampoco llega por Images API; sí llegó por Responses [verificado 2026-11-05].
- **2.6 agrega `svg_usage`** cuando `output_format: "svg"`: el consumo del modelo autor del vector, aparte del
  `usage` del raster de referencia [oficial] [verificado 2026-11-05]. El helper lo devuelve como `svgUsage` y el
  CLI lo imprime [contrato]. Ver §Novedades de 2.6.
- `safety_identifier` (≤ 128 caracteres) reemplaza a `user` [oficial].
- ⚠️ El schema describe `usage` como "For `gpt-image-1` only" — string obsoleto: la guía de 2.5 instruye
  explícitamente usar `usage` para medir consumo. **Parsear `usage` de forma defensiva** (presente pero opcional).

### Streaming y costos adicionales

`partial_images` admite de 0 a 3 previews, en **generations y en edits**. Con `0` llega una sola imagen en un
evento; con `>0` el resultado final puede llegar antes de completar el número pedido. Cada imagen parcial añade
**100 image-output tokens**.

Eventos SSE: `image_generation.partial_image` / `image_generation.completed` para generations, y
`image_edit.partial_image` / `image_edit.completed` para edits. En Responses API el evento es
`response.image_generation_call.partial_image` y ahí la guía declara el rango como `1..3`, no `0..3`.

Esta función necesita contrato de eventos, lifecycle y costo; no debe activarse por un cambio de UI aislado.

### Novedades de 2.6 — `complexity`, SVG, GIF y `markup`

Esta sección describe la superficie del **proveedor**. Desde el 2026-11-05 (tarde) Greenhouse transporta
`complexity`, SVG, GIF y `markup` en el helper, en `pnpm ai:image` y (`complexity`) en `pnpm ai:inpaint`
[contrato]; ver §Mapeo contra Greenhouse y Globe.

**`complexity: low | medium | high`** (default `high` si se omite) [oficial]. Es un "planning effort" separado
de `quality` y sin cargo propio; el system card lo llama "configurable reasoning effort". Según OpenAI, el nivel
bajo sirve para ediciones acotadas y el alto para texto denso o layout, a costa de más latencia y con riesgo de
que *"introduce unwanted changes"*.

- Medido con Flare `low` 1024², `complexity: "low"` contra omitido: **mismos 824 tokens de salida y misma
  latencia (~8 s)** [verificado 2026-11-05]. Con Sunburst `low` 1536×1024, `complexity: "medium"` dio 664 tokens,
  igual a la predicción sin él [verificado 2026-11-05]. **No abarata.** Su efecto en calidad: [sin dato].

**SVG nativo — `output_format: "svg"`** [oficial]:

- Sólo en `generations` y con `n: 1`. No acepta stream, imágenes parciales, `output_compression` ni
  `prompt_rewriter`. No existe en `edits`.
- El resultado es estático: sin scripts, sin recursos externos, sin rasters incrustados. OpenAI primero renderiza
  un raster de referencia, cuyo detalle controla `quality`.
- 🔴 **Exige `svg.model`.** Sin él responde 400 `missing_required_parameter` (*"SVG generation requires
  'svg.model'."*) [verificado 2026-11-05]. Con `svg: { model: "gpt-5.5", reasoning: { effort: "low" } }` → 200,
  SVG limpio de 589 bytes (4 `<path>`, `<title>`, `<desc>`, `viewBox` 1024) y `background` reportado
  `transparent` [verificado 2026-11-05].
- `svg.reasoning.effort`: `none | minimal | low | medium | high | xhigh | max` [oficial].
- **Se cobra dos veces:** el `usage` del raster de referencia (824 tokens a USD 30/1M en `low` 1024²) más
  `svg_usage`, el consumo del modelo autor a la tarifa de ese modelo (con gpt-5.5: 1.559 de entrada, 204 de
  salida, 0 de razonamiento) [oficial] [verificado 2026-11-05].

**GIF animado — `output_format: "gif"`** (`generations` según la guía [oficial]; también `edits` [verificado]):

- `frame_count` default 9; 🔴 el rango se contradice: la guía dice 2–64 y la referencia 2–16.
- `frame_duration_ms` default 200, mínimo 20, múltiplo de 10; la guía da un máximo de 2000.
- `size` es el tamaño **de cada cuadro**. Sin stream, parciales, máscara ni `output_compression`. No hay
  parámetro de loop: se describe en el prompt.
- La referencia dice que requiere acceso a un preview. **Nuestra organización sí lo tiene:** Flare `low`
  816×816, 2 cuadros → 200; GIF 816×816 de 2 páginas, delay 200 ms, loop 0 (infinito), 987 tokens de salida
  [verificado 2026-11-05].
- 🔴 **Los cuadros se componen en una hoja interna con límite de borde y de presupuesto de píxeles**
  [verificado 2026-11-05]:

  | Cuadros × tamaño | Resultado | Tokens de salida |
  |---|---|---:|
  | 2 × 1024² | 400 *"No supported sheet fits 2 GIF frames at size '1024x1024'. Invalid size '4096x2048'…"* | — |
  | 4 × 1024² | 400 (hoja 4096x2048) | — |
  | 9 × 1024² | 400 *"sheet 3072x3072 exceeds pixel budget"* | — |
  | 2 × 816² | 200 | 987 |
  | 6 × 640² (vía CLI) | 200 | 710 |
  | 9 × 640² | 200 | 1.529 |

  Lectura práctica: **640² admite hasta 9 cuadros**; 1024² no cabe ni con 2. El límite exacto por número de
  cuadros: [sin dato] fuera de estos puntos.
- 🔴 **GIF también funciona en `edits`:** 2 cuadros a 816² sobre una foto → 200 [verificado 2026-11-05]. Contradice
  la guía, que lo declara "not supported on edits". Tratarlo como no garantizado.

**`markup`** — nuevo para 2.5 **y** 2.6, sólo en `edits` [oficial]:

- PNG transparente con anotaciones, del mismo tamaño que la primera imagen y **sin aplanar** con ella; las demás
  imágenes del request quedan como referencia.
- ≤ 16.777.216 px y ≤ 50 MB. No se combina con `mask` ni con `prompt_rewriter`. Sin cargo extra.
- **Funciona en 2.5 Flare y en 2.6 Flare y Sunburst** [verificado 2026-11-05]: con un óvalo más texto y con un
  boceto a mano alzada, el modelo siguió las marcas y **no dibujó las anotaciones**. La capa `markup` **no suma
  tokens de imagen de entrada**: sólo se cobra la imagen base. Resuelve la contradicción entre la referencia
  (*"Supports GPT Image 2.5"*) y el changelog (2.5 y 2.6) a favor del changelog.
- **Rayar la imagen sin `markup` también funciona** [verificado 2026-11-05, 1 de 1 cada caso, `low`]: tachar en
  rojo una libreta pintada sobre la foto y pedir *"remove the objects scribbled over in red"* la borró (Flare 2.6 y
  Flare 2.5); un boceto rojo de lámpara pintado sobre la foto se convirtió en una lámpara real (Sunburst 2.6).

**`prompt_rewriter`** aparece sólo en las notas de exclusión de SVG, GIF y `markup`, sin definición [sin dato].

**Parámetros heredados de 2.5 que 2.6 documenta igual** [oficial]: `prompt` ≤ 32.000 caracteres; `n` 1–10;
`output_compression` 0–100 (JPEG/WebP); `moderation: auto | low`; `partial_images` 0–3 con `stream` (cada parcial
suma 100 tokens de salida); `safety_identifier` ≤ 128 en lugar de `user`.

## Qué afirma OpenAI sobre 2.6

- **System card** ([`chatgpt-images-2-6`](https://deploymentsafety.openai.com/chatgpt-images-2-6)): mejora en
  *"editing consistency, detail preservation, and responses to sketches and image annotations"* [oficial].
- **Guía de prompting oficial** ([`image-prompting`](https://developers.openai.com/api/docs/guides/image-prompting))
  [oficial]: Sunburst es la *"base model for workflows that need more detail or precise edits"*. Recomienda escribir
  por secciones rotuladas (escena, sujeto, detalles, restricciones); poner el texto entre comillas con su posición
  y tipografía, deletrear las marcas y pedir "no extra text", usando `medium`/`high` para texto chico; revisar
  etiquetas y relaciones factuales en infografías; pedir el fotorrealismo explícito; para personajes, una
  referencia reutilizable más los rasgos repetidos y *"Do not redesign the character"*; numerar cada imagen de
  entrada con su rol; editar con "change only X" más la lista de lo que se conserva, un cambio por turno.
- **Fallas que la propia guía declara** [oficial]: las ediciones repetidas cambian detalles; el prompt no
  garantiza el píxel exacto (componer sobre la original); *"A drawn checkerboard is not transparency"*; números
  inventados en charts; *"A higher setting doesn't guarantee a better result"*.
- **Latencia:** OpenAI dice *"50% faster than before"* y Flare `low` *"as little as six seconds"* [tercero / oficial
  en el foro de la comunidad]. 🔴 En nuestra única corrida, **Sunburst 2.6 `medium` fue más lento que 2.5**: 24,4 s
  contra 15,7 s con el mismo prompt [verificado 2026-11-05]. Ver §Precios para las latencias medidas.
- **Sólo en ChatGPT, sin API:** imágenes de referencia guardadas (uno mismo, mascotas, personajes) y edición de
  GIF por cuadro [tercero]. Web grounding: [sin dato].
- **Rankings externos (preliminares, no son la verdad):** Arena el 2026-11-04, configuración Medium — texto a
  imagen Sunburst 2.6 #2 con 1409 y Flare 2.6 #4 con 1384; edición de imagen única Sunburst 1476 y Flare 1462;
  multi-imagen Flare 1439 [tercero]. Design Arena pone a Sunburst 2.6 #1 [tercero]. Artificial Analysis no tenía
  fila de 2.6 al 2026-11-05 [tercero]. El 2026-09-07 Arena tenía a 2.5 Sunburst #1 con 1421 (texto a imagen) y 1520
  (edición): con estos números preliminares 2.6 no lo supera [inferido; comparar con cautela].
- **Problemas de los primeros días** [tercero]: SDK y docs con retraso (openai-python 3.46.0, del 2026-11-05,
  agrega `complexity`, GIF y SVG; 3.42.0, del 2026-10-31, agrega `markup`); una regresión reportada en Responses +
  `gpt-image-2` con *"Complexity 'low' is not supported"*; proxies que descartan `complexity`.

## Qué afirma OpenAI sobre 2.5 — y qué NO afirma

Distinguir ambas listas importa porque lo segundo es lo que **no se le puede prometer a un cliente**.

### Afirmado (anuncio 2026-09-08 + system card)

- Iluminación más natural y texturas más ricas; detalle más nítido.
- Mejor preservación del **sujeto de fotos de referencia**: *"Image subjects look more recognizable… distinctive
  features are more likely to carry through"*. Lenguaje **probabilístico**, no garantía.
- Edición de precisión: *"better at editing only what you've asked for, while keeping the rest of the details
  the same"*, incluso con sujetos y fondos complejos.
- Consistencia multi-turno: cada edición se apoya en la anterior *"without degrading image quality over time"*.
- Mejor comprensión de instrucciones visuales complejas; layouts más complejos **incluyendo fondos
  transparentes**; contenido más exacto cuando la imagen incluye información del mundo real.
- El system card agrega: *"improves infographic accuracy and layout"*.
- Latencia hasta **50% menor** que Images 2.0. El anuncio posiciona a Flare como *"the default choice for most
  applications, delivering higher-quality images than GPT-Image-2 at 50% lower latency"*.

### 🔴 NO afirmado — no inventarlo en una propuesta ni en un brief

- **Tipografía / renderizado de texto.** El anuncio **no** declara mejora de texto dentro de la imagen. Lo más
  cercano es la exactitud de infografías. Y la doc de API mantiene la limitación vigente (ver abajo).
- **Texto multilingüe.** Cero menciones de idiomas o scripts no latinos en anuncio, help center o system card.
- **Fondo transparente como feature nueva.** Es un parámetro preexistente; 2.5 sólo lo menciona dentro de
  "layouts más complejos".
- **Benchmarks de calidad de imagen.** No hay ELO, win-rate ni evals de fidelidad publicados. El único número
  comparativo del anuncio es la latencia.
- **Preservación de identidad garantizada.** El lenguaje es "more likely", nunca "preserves".
- **Ventana de contexto, resolución nativa o arquitectura del modelo.**

## Limitaciones declaradas por OpenAI

Vigentes en la guía de API al 2026-09-08 — **no fueron retiradas por 2.5**:

| Limitación | Texto oficial |
|---|---|
| Latencia | *"Complex prompts may take up to **2 minutes** to process."* |
| Renderizado de texto | *"Although significantly improved, the model **can still struggle with precise text placement and clarity**."* |
| Consistencia | *"the model may occasionally struggle to maintain visual consistency for **recurring characters or brand elements** across multiple generations."* |
| Control de composición | *"the model may have difficulty **placing elements precisely in structured or layout-sensitive compositions**."* |

El help center agrega que en la edición por selección *"**highlights are not always precise, and edits may
extend beyond the area you selected**"*.

Al 2026-11-05 no se revalidó si esta tabla sigue en la guía; la guía de prompting de 2.6 declara sus propias
fallas (§Qué afirma OpenAI sobre 2.6) y ninguna de ellas cierra estas cuatro.

**Consecuencia para Greenhouse:** ninguna de las cuatro limitaciones se cerró. Un entregable con texto pequeño,
un sistema de personaje recurrente o un layout con jerarquía fija **sigue exigiendo QA humano por pieza**; 2.5
no convierte eso en un paso automatizable.

## System card y evaluación de seguridad

Fuente: `https://deploymentsafety.openai.com/chatgpt-images-2-5` (2026-09-08).

Stack de seguridad de 4 capas: rechazos upstream por política, bloqueo de input con monitor multimodal, análisis
combinado de imagen de entrada + prompt para detectar ediciones maliciosas, y bloqueo de output antes de mostrar.

Evals sobre un **set adversarial** (diseñado para producir salidas violatorias; **no representa tráfico real**):

| Modelo | Safe generation ↑ | Unsafe blocked ↑ | Unsafe presented ↓ |
|---|---:|---:|---:|
| GPT Image 2.5 Sunburst | 77,0% | 21,9% | 1,09% |
| GPT Image 2.5 Flare | 79,4% | 19,2% | 1,41% |
| ChatGPT Images 2.0 (baseline) | 75,2% | 23,1% | 1,64% |

🔴 **Leer esta tabla con cuidado, el propio documento lo advierte:** la mejora en "unsafe presented" **no alcanza
significancia estadística** (*"No unsafe-shown difference meets this threshold"*). Y por política, la categoría
**Abuse empeora respecto al baseline** (Sunburst 2,86% / Flare 3,27% vs 2,45% en 2.0). Extremism queda en 0,00%
en ambos. **No usar esta tabla como argumento comercial de "2.5 es más seguro"** — la evidencia publicada no lo
sostiene con significancia.

Realismo y deepfakes, verbatim del system card:

> *"ChatGPT Images 2.5 allows for **heightened realism that could, absent safeguards, allow more convincing
> deepfakes**, including political, sexual, or otherwise sensitive imagery of real people, places or events.
> Such images violate our usage policies."*

Preparedness Framework: ni Sunburst ni Flare cruzan los umbrales Bio High ni Cyber High; aun así se aplican por
precaución mitigaciones de nivel High en riesgo biológico (bloqueo en vivo de input/output + revisión offline con
posible suspensión de cuentas).

**Marcas y trademarks:** OpenAI **no publica política específica** para 2.5. Lo único que existe es práctica de
prompting (constraints tipo "no trademarks / no logos / non-infringing logo"). El default de Greenhouse
(`greenhouse-ai-image-generator`: nunca reproducir un trademark) **no se relaja** por la llegada de 2.5 ni de 2.6
(para 2.6 tampoco se encontró política específica de marcas [sin dato]).

### System card de 2.6

Fuente: `https://deploymentsafety.openai.com/chatgpt-images-2-6` [oficial]. Evaluación sobre **3.077 prompts
adversariales**.

| Métrica | Sunburst | Flare | Significancia |
|---|---:|---:|---|
| Unsafe-not-blocked ↓ | 1,92 % → **1,72 %** | 1,49 % → **2,14 %** | Flare: no significativo; Sunburst: [sin dato] |
| Safe generation ↑ | [sin dato] | 78,36 % → **75,04 %** | Flare: **significativo** (empeora) |

🔴 **Leer con cuidado.** El valor de la izquierda es la referencia que usa el system card de 2.6, y **no coincide**
con los números del system card de 2.5 (Sunburst 1,09 % / Flare 1,41 % de *unsafe presented*, Flare 79,4 % de
*safe generation*). O es otro set, otra corrida o una métrica nombrada distinto [inferido]: **no comparar tablas
entre system cards**. Lo único que el documento sostiene con significancia es que **Flare 2.6 genera menos
respuestas seguras que su referencia**. No usar esta tabla como argumento comercial de que 2.6 es más seguro.

## Precios oficiales al 2026-09-08 y al 2026-11-05

Los valores son USD y evidencia temporal, no precios de cliente ni Studio Credits.

### Tarifas por 1M tokens — Standard

| Modelo | Image in | Image cached | Image out | Text in | Text cached | Batch |
|---|---:|---:|---:|---:|---:|---|
| `gpt-image-2.6-sunburst` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** |
| `gpt-image-2.6-flare` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** |
| `gpt-image-2.5-sunburst` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** (🔴 ver §Superficies API) |
| `gpt-image-2.5-flare` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** (🔴 ver §Superficies API) |
| `gpt-image-2` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | sí (mitad) |
| `gpt-image-1.5` | $8.00 | $2.00 | $32.00 | $5.00 | $1.25 | sí |
| `gpt-image-1` | $10.00 | $2.50 | $40.00 | $5.00 | $1.25 | sí |
| `gpt-image-1-mini` | $2.50 | $0.25 | $8.00 | $2.00 | $0.20 | sí |

El texto de salida no se factura: estos modelos emiten imágenes, no texto. Las tarifas de 2.6 son idénticas a
las de 2.5 y `gpt-image-2` [oficial 2026-11-05]; **lo que cambia es cuántos tokens gasta** (ver §GPT Image 2.6:
misma tarifa, muchos más tokens). La excepción es el SVG de 2.6, que suma el consumo de un segundo modelo
(`svg_usage`) a la tarifa de ese modelo.

### 🔴 GPT Image 2.6: misma tarifa, muchos más tokens en `low` y `medium` — evidencia fechada, NO contrato

`usage` real del **2026-11-05**, clave personal, 1024×1024 salvo donde se indica. Evidencia completa:
`ai-generations/2026-11-05_gpt-image-2-6-canary/` (`results.json` y `cli/`).

| 1024×1024 | 2.5 (tokens de salida) | 2.6 (tokens medidos) | Ratio | USD de salida 2.6 |
|---|---:|---:|---:|---:|
| `low` | 196 (fórmula; medido 2026-09-16) | 824 (Flare, 2 corridas) | 4,2× | 0,0247 |
| `medium` | 439 (Sunburst 2.5, medido 2026-11-05) | 1.449 (Flare y Sunburst) | 3,3× | 0,0435 |
| `high` | 1.756 (fórmula y medido) | 1.758 (Flare) | 1,0× | 0,0527 |
| `xhigh` | 3.122 (fórmula) | 3.122 (Flare) | 1,0× | 0,0937 |
| `max` | 7.024 (fórmula y medido) | 7.024 (Flare) | 1,0× | 0,2107 |

**Sólo `low` y `medium` cuestan más en 2.6.** En `high`, `xhigh` y `max` gasta lo mismo que 2.5 [verificado
2026-11-05]. *Corrección:* la versión 1.1 de esta matriz anotaba 3.124 como tokens de 2.5 en `xhigh`; la fórmula
oficial da 3.122 (`ceil(64 × 64 × 3.048.576 / 4.000.000)`), que es también lo medido en 2.6.

Otros puntos medidos [verificado 2026-11-05]:

- **2048×1152 `low`, Sunburst 2.6:** 660 tokens (2.5 por fórmula: 157 → 4,2×).
- **1536×1024 `low`, Sunburst 2.6:** 664 tokens, exactamente lo que predijo el factor 4,2 sobre 2.5.
- **Flare y Sunburst 2.6 gastan lo mismo** para el mismo `quality` (`medium`: 1.449 ambos), igual que en 2.5.
- **`complexity: "low"` no cambia el gasto:** 824 tokens con y sin él (Flare `low`).
- **Editar en 2.6 cuesta más salida que generar:** Flare `low` 1024², 1.024 tokens de imagen de entrada + 30 de
  texto y **962 de salida**, contra 824 al generar.
- **GIF:** Flare `low` 816×816, 2 cuadros → 987 tokens de salida; 640², 6 cuadros (vía CLI) → 710; 640², 9 cuadros
  → 1.529. **La hoja de cuadros no sigue la fórmula de grilla:** no hay estimación de GIF.
- **`markup`:** la capa de anotaciones no suma tokens de imagen de entrada; sólo se paga la imagen base.
- **SVG:** el raster de referencia (824 tokens en `low` 1024²) más `svg_usage` del modelo autor (gpt-5.5: 1.559
  de entrada, 204 de salida, 0 de razonamiento) a la tarifa de gpt-5.5.

**Hipótesis, no fórmula** [inferido, con 7 puntos]: tokens 2.6 = ceil(tokens 2.5 × k), con k = 4,2 en `low`, 3,3 en
`medium` y 1,0 en `high`, `xhigh` y `max`. Un usuario del foro estimó los mismos 4,2× y 3,3× [tercero]. **La fórmula
de grilla de 2.5 NO reproduce 2.6 sin ese factor.** El factor se sostiene en tres tamaños de `low` (1024², 1536×1024
y 2048×1152); `medium` se midió sólo a 1024².

**Consecuencias:**

1. **Explorar con 2.6 en `low` o `medium` cuesta 4,2× / 3,3× más que con 2.5**; en `high`, `xhigh` y `max` cuesta lo
   mismo. El borrador barato sigue siendo 2.5.
2. 🔴 **Ningún estimador que reutilice la grilla de 2.5 sin factor sirve para 2.6: lo subestima.** El estimador del
   helper ya lo resuelve [contrato]: `estimateOpenAIImageOutputTokens` calcula 2.6 como la grilla de 2.5 por
   `GPT_IMAGE_2_6_TOKEN_FACTOR` (`low` 4,2 · `medium` 3,3 · `high`/`xhigh`/`max` 1), devuelve `null` para GIF y, en
   SVG, estima sólo el raster de referencia. `pnpm ai:image --estimate` imprime el costo y sale sin llamar a la API,
   y avisa cuando 2.6 en `low`/`medium` cuesta N× su gemelo 2.5. `pnpm ai:inpaint` estima con el mismo factor.
3. **El factor es una hipótesis medida, no una tarifa.** Comparar cada estimación con el `usage` real que imprime
   el CLI y revalidar el factor si se desvía.

**Latencias medidas (una corrida cada una)** [verificado 2026-11-05]: Flare `low` ~8 s · Flare `medium` 8,7 s ·
Flare `high` 12 s · Sunburst 2.6 `medium` 24,4 s (2.5 Sunburst `medium`, mismo prompt: 15,7 s) · Sunburst 2.6
`low` 2048×1152 15,3 s · edit Flare `low` 11 s · Flare `xhigh` 18 s · Flare `max` 32 s. OpenAI dice
*"50% faster than before"* [tercero / oficial en el foro]; en nuestra única corrida Sunburst 2.6 `medium` fue
**más lento** que 2.5.

🔴 **Esta tabla es evidencia fechada, no una tarifa estable ni un contrato.** Una corrida por punto, una sola
organización, primer día del modelo. Volver a medir antes de presupuestar.

### 🔴 El costo por imagen de 2.5 NO es estimable desde la documentación

Cita verbatim de ambas fichas de modelo 2.5:

> "Token rates match GPT Image 2. **The GPT Image 2 calculator does not estimate GPT Image 2.5 token
> consumption.**"

Y de la guía:

> "**Equal token rates don't mean equal cost per image: token consumption can differ by model and quality
> setting.**"

**Consecuencia dura para Greenhouse y Globe:** cualquier estimador, reserva de créditos o presupuesto previo al
gasto que hoy derive el costo de una imagen desde una tabla `quality × size` **es inválido para 2.5**. La única
vía documentada es leer `usage` de la respuesta real y persistirlo. Cualquier cifra de costo por imagen de 2.5
publicada en prensa o blogs de terceros **no es verificable contra doc oficial** y no debe entrar a un contrato.

> 🔴 **Contradicción entre documentos, sin resolver en esta pasada (2026-11-05).** Esta sección es del
> 2026-09-08. El 2026-09-16, `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.5 registró lo contrario: que
> la guía oficial publica una calculadora que cubre 2.5 y que su fórmula de grilla reproduce exactamente las 7
> mediciones del repo (196 / 1.756 / 7.024). Las cifras de 2.5 de la tabla de 2.6 de arriba usan esa fórmula. No
> se releyó la calculadora hoy. Lo que sí está medido: **esa fórmula no reproduce 2.6**.

### Línea base de consumo medido — evidencia fechada, NO contrato

Como la documentación no permite estimar, la única vía es medir. Esta tabla es el `usage` real de 7 piezas
generadas el **2026-09-16**, todas `1024x1024` PNG, contra el snapshot **`…-2026-09-08`**.

| Pieza | Input tokens | Output tokens | Total | Latencia |
|---|---:|---:|---:|---:|
| `flare` · `low` | 49 | 196 | 245 | 13,3 s |
| `flare` · `high` | 49 | 1.756 | 1.805 | 18,7 s |
| `flare` · `max` | 49 | 7.024 | 7.073 | 46,0 s |
| `sunburst` · `low` | 49 | 196 | 245 | 11,6 s |
| `sunburst` · `high` | 49 | 1.756 | 1.805 | 29,1 s |
| `sunburst` · `max` | 49 | 7.024 | 7.073 | 80,6 s |
| `flare` · `high` · `background: transparent` | 52 | 1.756 | 1.808 | 21,0 s |

Costo derivado del total: **USD 0,593** por las 7 piezas, aplicando las tarifas de la tabla anterior
(output de imagen USD 30,00/1M; texto de entrada USD 5,00/1M — la tarifa de 8,00 es para IMAGEN de entrada, que en una generación pura no aplica).

**Lo que la medición muestra:**

1. **El modelo no fija el costo; lo fija `quality × size`.** El consumo es **idéntico** entre Flare y Sunburst
   para el mismo `quality`. Elegir Sunburst sobre Flare no encarece la pieza.
2. **Lo que separa a los modelos es la latencia, y la brecha crece con la calidad.** En `max`, 46,0 s contra
   80,6 s — **1,75x**. En `low` la diferencia es marginal.
3. **`background: transparent` no tuvo costo adicional.** Los 3 tokens de input extra vienen del prompt más
   largo, no de la transparencia.
4. **Ninguna de las 7 corridas degradó:** todas resolvieron exactamente el `quality`, `size` y `background`
   pedidos.

🔴 **Esta tabla es evidencia fechada, no una tarifa estable ni un contrato.** El consumo por nivel de calidad
puede cambiar sin aviso del lado de OpenAI, y sólo cubre `1024x1024`. **Releerla y volver a medir antes de
presupuestar**, y nunca extrapolarla linealmente a otros tamaños. Evidencia completa (README, manifest, `usage`
crudo por corrida y el canary reproducible): `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`.

### Qué cuesta editar frente a generar — evidencia fechada, NO contrato

Medición del **2026-09-16** con `gpt-image-2.5-flare`, `quality=low`, `1024x1024`, leyendo `usage` real. Los dos
edits comparten prompt e imagen base y sólo se diferencian en la máscara; la fila "Generar" es el control, con la
misma calidad y el mismo tamaño pero sin imagen base.

| Caso | Input (img / txt) | Output | Total | USD derivado |
|---|---:|---:|---:|---:|
| Generar | 37 (0 / 37) | 196 | 233 | 0,0061 |
| Editar **con** máscara | 1.056 (1.024 / 32) | 196 | 1.252 | 0,0142 |
| Editar **sin** máscara | 1.056 (1.024 / 32) | 196 | 1.252 | 0,0142 |

Tarifas aplicadas: image in USD 8,00/1M · text in USD 5,00/1M · image out USD 30,00/1M.

**Lo que la medición muestra — y es contraintuitivo:**

1. **Editar NO abarata.** El modelo devuelve la imagen **completa** aunque la máscara acote qué cambia, así que
   el `output` se cobra idéntico a una generación (196 tokens en los tres casos). La máscara controla el
   resultado, no el gasto.
2. **La imagen base se paga como entrada:** 1.024 tokens de imagen por una imagen de `1024x1024`. En `low`,
   editar costó **2,3× generar**.
3. **La máscara es gratis.** El `usage` fue idéntico con y sin ella. Lo que se cobra es la imagen base.
4. **El sobrecosto relativo se diluye al subir la calidad**, porque el output domina: ~2,3× en `low`, ~1,15× en
   `high` y ~1,04× en `max`, derivado de los outputs ya publicados arriba (196 / 1.756 / 7.024).
5. 🔴 **Corolario operativo: para recortar el fondo de una imagen que ya existe, usar `pnpm ai:image:rmbg`**
   (matting local, cero costo de proveedor). Pedirle el recorte al modelo cuesta como una imagen nueva.
6. **El inpainting hizo lo que se le pidió:** puso el objeto y preservó el resto — diferencia media fuera de la
   zona de 2,4/255 con máscara y 2,8/255 sin ella.

El `input` de la fila "Generar" difiere de la tabla anterior porque el prompt es otro; el `output`, que es lo que
fija el costo de la pieza, es el mismo 196.

🔴 **Esta tabla es evidencia fechada, no una tarifa estable ni un contrato.** Cubre un solo `quality` y un solo
tamaño, y el consumo puede cambiar sin aviso del lado de OpenAI. **Volver a medir antes de presupuestar.**
Evidencia completa y reproducible: `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/` (§"Qué cuesta
EDITAR frente a generar" del README y bloque `editBaseline` de `manifest.json`).

### Costo por imagen — modelos con calculadora oficial (NO aplica a 2.5 ni a 2.6)

| Modelo | Quality | 1024×1024 | 1024×1536 | 1536×1024 |
|---|---|---:|---:|---:|
| GPT Image 2 | Low | $0.006 | $0.005 | $0.005 |
| GPT Image 2 | Medium | $0.053 | $0.041 | $0.041 |
| GPT Image 2 | High | $0.211 | $0.165 | $0.165 |
| GPT Image 1.5 | Low | $0.009 | $0.013 | $0.013 |
| GPT Image 1.5 | Medium | $0.034 | $0.050 | $0.050 |
| GPT Image 1.5 | High | $0.133 | $0.200 | $0.200 |
| GPT Image 1 | Low | $0.011 | $0.016 | $0.016 |
| GPT Image 1 | Medium | $0.042 | $0.063 | $0.063 |
| GPT Image 1 | High | $0.167 | $0.250 | $0.250 |
| GPT Image 1 Mini | Low | $0.005 | $0.006 | $0.006 |
| GPT Image 1 Mini | Medium | $0.011 | $0.015 | $0.015 |
| GPT Image 1 Mini | High | $0.036 | $0.052 | $0.052 |

El costo total suma prompt de texto, referencias de imagen en edits y output de imagen. Una referencia puede
elevar el input por la alta fidelidad automática. **No extrapolar linealmente por área:** OpenAI advierte que una
resolución no cuadrada mayor puede producir menos output tokens que otra menor con la misma calidad.

La tabla de tokens por imagen (272/1056/4160 para 1024² en low/medium/high) cubre **sólo modelos anteriores a
`gpt-image-2`**. No hay equivalente publicado para GPT Image 2 ni para 2.5 (al 2026-09-08; ver la contradicción
anotada arriba) ni para 2.6 [sin dato].

## Rate limits

| Modelo | Tabla publicada |
|---|---|
| `gpt-image-2` | Sí — Tier 1: 100.000 TPM / 5 IPM · T2: 250.000 / 20 · T3: 800.000 / 50 · T4: 3.000.000 / 150 · T5: 8.000.000 / 250 |
| `gpt-image-2.5-flare` | **No publicada** |
| `gpt-image-2.5-sunburst` | **No publicada** |
| `gpt-image-2.6-flare` | [sin dato] |
| `gpt-image-2.6-sunburst` | [sin dato] |

`IPM` = images per minute. Las fichas de 2.5 terminan en "Snapshots" y no incluyen sección de rate limits.
**Asumir los números de `gpt-image-2` para 2.5 sería inferencia, no documentación.** El límite real se lee en la
sección de límites de la cuenta. Lo mismo vale para 2.6: no asumir los de 2.5 ni los de `gpt-image-2`.

> 🔴 **Contradicción entre documentos:** el 2026-09-16 `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` registró que
> las fichas de 2.5 **sí publican** rate limits, iguales a `gpt-image-2`. Esta tabla conserva el estado del
> 2026-09-08 y no se revalidó para 2.5 en esta pasada.

## Seguridad, datos y provenance

- Los prompts y outputs pasan por moderación. `moderation` acepta `auto` (default) y `low`
  ("less restrictive filtering"); no es un bypass de políticas.
- El discriminador estable de error es **`error.code`**, no el mensaje. Con
  `error.type = "image_generation_user_error"` y `error.code = "moderation_blocked"` puede venir
  `moderation_details` con `moderation_stage` (`input | output | unknown`) y `categories`
  (labels gruesos: `harassment`, `self-harm`, `sexual`, `violence`).
- **No reintentar automáticamente** `image_generation_user_error` ni `moderation_blocked` sin modificar el
  prompt o las imágenes. Para `429`/`5xx`, leer estado/idempotencia antes de repetir un submit billable.
- Para el usuario final, mantener el mensaje genérico; el detalle de categorías es telemetría interna.
- OpenAI indica que los datos API no se usan para entrenamiento salvo opt-in explícito.
- Por defecto, `/v1/images/generations` y `/v1/images/edits` pueden conservar abuse-monitoring logs hasta 30 días,
  no mantienen application state y son elegibles para ZDR con aprobación y limitaciones.
- ZDR estaba declarado compatible para `gpt-image-2`, 1.5, 1 y 1-mini al 2026-08-21. **Para las familias 2.5 y 2.6
  no se revalidó la elegibilidad ZDR** [sin dato]; leerla antes de comprometerla con un cliente. Los inputs de imagen se escanean
  para CSAM; un posible positivo puede retenerse para revisión manual incluso bajo ZDR/MAM/Eyes Off.
- Image storage/data residency regional requiere leer la tabla vigente y, en varias regiones, aprobación enhanced
  ZDR/MAM. No asumir residencia desde la ubicación de Globe.

### Content provenance — qué prueba y qué no

El Content Provenance API (`POST /v1/content_provenance_checks`, multipart con campo `file`, respuesta síncrona
con `results[].{type, outcome, validation_state}`) verifica dos señales:

| Señal | Aplica a | Qué es |
|---|---|---|
| C2PA Content Credentials | imágenes | metadata firmada con issuer y detalle de uso de IA |
| SynthID | imágenes y audio | watermark embebido en el propio medio |

Herramienta web equivalente: `openai.com/verify`.

**Límites que la propia doc declara:** editar, convertir o compartir un archivo **puede remover su metadata**;
el watermark SynthID es parte del medio y **puede sobrevivir algunas transformaciones**. Un `not_detected` no
demuestra que la imagen sea humana: puede tener la metadata removida, venir de un modelo legacy, o de la IA de
otra compañía — la herramienta **no detecta contenido generado por modelos de terceros**.

**La familia 2.5 SÍ emite ambas señales.** El anuncio declara verbatim: *"We continue to use **C2PA metadata
and invisible watermarking** to help identify images made with our tools"*, y el system card precisa que el
watermark es **SynthID de Google DeepMind**, aplicado *"through ChatGPT, Codex, and the OpenAI API"*, como capa
complementaria a C2PA (OpenAI participa del **C2PA Conformance Program**). El help center confirma la cobertura
por modalidad: **imágenes = C2PA + SynthID**, audio = sólo SynthID, texto = todavía no.

**Salvedades que la propia doc pone, y que NO se le pueden ocultar a un cliente:**

- *"Coverage can vary by product, model, export path, file type, and when the content was created."*
- Los signals *"are not a guarantee that content is accurate, unedited, legally owned, or presented in the
  correct context"*.
- La metadata C2PA *"can sometimes be removed by platforms, editing tools, or file conversions"*. El derivado
  que Greenhouse/Globe genera al recomprimir o convertir **puede perder el C2PA**; SynthID sobrevive más, pero
  tampoco es garantía.
- Existe además una **marca de agua visible** opcional, pedida por prompt (*"Include a visible OpenAI watermark
  in the image"*), distinta de las señales embebidas.

**La familia 2.6 también emite ambas señales:** su system card declara **C2PA + SynthID** en ChatGPT, Codex y la
API [oficial]. No se corrió el Content Provenance API sobre un output de 2.6 [sin dato]; tampoco se sabe si un
SVG o un GIF de 2.6 conservan las señales [sin dato]. Las salvedades de arriba aplican igual.

La verificación de provenance complementa, pero no reemplaza, el lineage interno.

## Mapeo contra Greenhouse y Globe

| Capa | Estado observado | Consecuencia |
|---|---|---|
| OpenAI | familia 2.5 activa con transparencia plena y `xhigh`/`max` | provider-supported desde 2026-09-08 |
| Greenhouse helper | **transporta las familias 2.5 y 2.6**, con contrato decidido por capacidad declarada | 2.6 desde el 2026-11-05 (tarde); ver §Familia 2.6 en Greenhouse y §El contrato transportado abajo |
| Greenhouse helper | conserva el modelo exacto y rechaza JPEG transparente antes de red | implementado local; aceptar el asset sigue exigiendo QA alfa |
| Greenhouse CLI | valida `--model` y `--quality` contra el allowlist antes de cualquier I/O | canary local facturable aprobado 2026-08-21: `gpt-image-2`, PNG 1024×1024, `quality=low`, `background=transparent`, canal alfa y 470.164 píxeles totalmente transparentes; no demuestra el runtime Globe |
| Greenhouse CLI | **expone máscara: `--mask <path>` (inpainting)** desde 2026-09-16 | conecta el soporte de máscara que `editOpenAIImage()` ya tenía y el CLI no ofrecía; `--mask` sin `--image` **aborta antes de cualquier I/O** — sin esa guarda el request habría salido como generación desde cero, ignorando la máscara en silencio |
| Greenhouse CLI | **imprime `usage` en cada corrida** (`usage: in N (img N · txt N) · out N · total N`) | para 2.5 el `usage` real es la única fuente documentada de costo; el instrumento que gasta ahora lo muestra |
| Greenhouse helper | línea base de `usage` real de la familia 2.5 | medida 2026-09-16 sobre 7 piezas (generación) y sobre el par editar/generar; ver §Línea base de consumo medido y §Qué cuesta editar frente a generar |
| Greenhouse helper singular | fija `n=1` y rechaza `numberOfImages != 1` | evita pagar outputs que el contrato singular descartaría |
| Greenhouse Responses helper | rechaza `partialImages > 0` mientras no exista parser SSE | no promete parciales desde un camino no streaming |
| Globe `ImageOutputShapeV1` | `backgroundMode` aditivo, default canónico por ruta | implementado local; snapshots legacy leen `auto` |
| Globe OpenAI adapter | compila `transparent` sólo para GPT Image 2 y mantiene PNG | implementado local; 1.5 falla antes de red |
| Globe result driver | decodifica bytes y exige alfa + píxel no opaco | implementado local; canary/runtime pendiente |
| Globe ruta `ref/still/openai-v2` | generación prompt-only con `auto` / `opaque` / `transparent`; edit deferred | implementado local; promoción/canary pendientes |
| Globe familia 2.5 | **sin ruta, sin binding, sin readiness** | Globe está `hibernated` desde 2026-09-02; no hay promoción posible hoy |
| Globe familia 2.6 | **sin ruta, sin binding, sin readiness** | ninguna ruta de Globe declara 2.6; mismo estado de hibernación |

### Familia 2.6 en Greenhouse — transportada por el CLI y `ai:inpaint` (2026-11-05, tarde) [contrato]

Leído del árbol de trabajo del 2026-11-05 en `src/lib/ai/openai-image.ts`, `scripts/ai/generate-image.ts` y
`scripts/ai/inpaint/adapters/openai.ts`. Reemplaza el inventario de la mañana, que la daba por no transportada.

| Pieza | Estado | Consecuencia |
|---|---|---|
| Union `OpenAIImageModel` | incluye `gpt-image-2.6-sunburst`, `gpt-image-2.6-flare` y el snapshot `gpt-image-2-2026-04-21`; conserva `gpt-image-1`, 1.5 y 1-mini | `pnpm ai:image --model gpt-image-2.6-*` pasa la validación del allowlist |
| `OPENAI_IMAGE_MODEL_CAPABILITIES` | además de `extendedSizeGrid`, `premiumQualityTiers` e `inputFidelity`, declara `complexity`, `svgOutput`, `gifOutput` (los tres sólo 2.6), `markup` (2.5 y 2.6), `tokenFamily` y `shutdownDate` | el `Record` obliga a declarar cada capacidad de todo modelo nuevo |
| Ciclo de vida | `assertOpenAIImageModelAvailable` corta antes de la red un modelo apagado: `gpt-image-1` desde el 2026-10-23; 1.5 y 1-mini desde el 2026-12-01 | un modelo deprecado falla con mensaje, no con un 4xx pagado |
| Validación de opciones | **una sola función**, `assertOpenAIImageOptionsSupported`, que usan el helper, el CLI y `ai:inpaint` | `complexity` sólo 2.6; SVG sólo al generar, exige `svg.model`; GIF sin `mask` ni `markup`; `markup` sólo al editar, nunca con `mask`; `output_compression` sólo JPEG/WebP; JPEG transparente rechazado |
| Estimación de costo | grilla de 2.5 × `GPT_IMAGE_2_6_TOKEN_FACTOR` (`low` 4,2 · `medium` 3,3 · resto 1); GIF → `null`; SVG estima el raster de referencia | el modelo autor del SVG se cobra aparte y el CLI lo avisa |
| `generateOpenAIImage` / `editOpenAIImage` | aceptan `complexity`, `outputCompression`, `moderation`, `svg {model, reasoningEffort}`, `gif {frameCount, frameDurationMs}` y `markup` (sólo edits; valida PNG con alfa, mismo tamaño que la base y ≤ 16.777.216 px); devuelven `svgUsage` | todas las novedades de 2.6 son alcanzables desde el helper |
| `runOpenAIImageTool` (Responses) | acepta `imageModel` (`tool.model`) | 2.6 por Responses no está garantizado (§Superficies API) y **no tiene flag de CLI** |
| `pnpm ai:image` | flags nuevos: `--model gpt-image-2.6-flare\|gpt-image-2.6-sunburst`, `--complexity low\|medium\|high` (sólo 2.6), `--format png\|jpeg\|webp\|gif\|svg` (o la extensión `.gif`/`.svg` de `--out`), `--svg-model` (default `gpt-5.5`), `--svg-effort` (default `low`), `--frames` (2–64; avisa sobre 16), `--frame-ms` (20–2000), `--markup <png>` (exige `--image`; no con `--mask`), `--compression 0-100`, `--moderation auto\|low` y `--estimate` | en SVG y GIF `--background` sólo viaja si se pasa explícito; imprime `svg_usage`; `--help` trae la tabla «¿2.5 o 2.6?» |
| Default del helper, del CLI y del runtime | `gpt-image-2` | **sin cambio**: 2.6 se usa sólo eligiéndolo |
| `pnpm ai:inpaint`, adaptador `openai` | acepta 2.6; default `gpt-image-2.5-flare` `medium` sin cambio; `isSunburst` = `/^gpt-image-2\.(5\|6)-sunburst/`; a los modelos con `complexity` les envía `complexity: low`; estima con el factor 2.6 | Sunburst 2.5 **y** 2.6 editan sin máscara; Flare 2.6 viaja con máscara |
| No expuesto | Batch API (2.6 no lo tiene en OpenAI), `partial_images`/`stream` (el helper rechaza `partialImages > 0` sin parser SSE), flag de CLI para Responses, `n > 1` (`--count N` son N pedidos separados y se pagan N veces) y `safety_identifier` | sin cambio |
| `scripts/foto/*.mjs` y `scripts/ai/inpaint/erase.ts` | siguen fijando `gpt-image-2.5-sunburst` | sin cambio de modelo posible sin editar código |
| `pnpm models:inventory` / `pnpm models:freshness` | no cuentan los ids de OpenAI [inventario de la mañana, no revalidado] | la llegada de 2.6 no aparece en esos reportes |

**Decisión vigente** [decisión propuesta, con evidencia]: 2.6 es ejecutable desde `pnpm ai:image` y
`pnpm ai:inpaint`, pero **no es default**. Explorar e iterar en `low`/`medium` sigue en 2.5 Flare (2.6 cuesta
4,2×/3,3× más); la pieza final en `high`/`xhigh`/`max` puede hacerse con 2.5 o 2.6 Sunburst al mismo costo,
comparando en la toma; SVG y GIF exigen 2.6 Flare. La identidad de personas (fotografía de marca) sigue con 2.5
Sunburst hasta un canario de identidad con 2.6 [sin dato]. La tabla completa vive en
`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §GPT Image 2.6.

### El contrato transportado de la familia 2.5

Verificado leyendo `src/lib/ai/openai-image.ts`. Los cuatro identificadores viven en el tipo `OpenAIImageModel`
y en el allowlist: `gpt-image-2.5-flare`, `gpt-image-2.5-flare-2026-09-08`, `gpt-image-2.5-sunburst` y
`gpt-image-2.5-sunburst-2026-09-08`. La familia 2.6 se sumó el 2026-11-05 con el mismo mecanismo (§Familia 2.6
en Greenhouse).

**El contrato se decide por capacidad declarada, no por literales de modelo.**
`OPENAI_IMAGE_MODEL_CAPABILITIES` es un `Record<OpenAIImageModel, …>` con las capacidades por modelo (las tres
originales —`extendedSizeGrid`, `premiumQualityTiers`, `inputFidelity`— más las del 2026-11-05) y ser un
`Record` es la defensa: el compilador
obliga a declarar las capacidades de todo modelo nuevo, así que agregar uno **no puede volver a degradar en
silencio** por olvidar un literal en una rama. Esa era exactamente la forma de la falla anterior.

| Capacidad | Qué gobierna | Familia 2.6 | Familia 2.5 | `gpt-image-2` | 1.5 / 1 / 1-mini |
|---|---|---|---|---|---|
| `extendedSizeGrid` | grilla moderna (`2048x1152`, `2048x2048`, …) en vez de la legacy de tres tamaños | sí | sí | sí | no |
| `premiumQualityTiers` | escalones `xhigh` y `max` | sí | sí | no | no |
| `inputFidelity` | envío de `input_fidelity` en `/v1/images/edits` | **no** | **no** | no | sí |
| `complexity` | envío de `complexity` | sí | no | no | no |
| `svgOutput` / `gifOutput` | `output_format: "svg"` / `"gif"` | sí | no | no | no |
| `markup` | capa de anotaciones en `/v1/images/edits` | sí | sí | no | no |
| `tokenFamily` | grilla de estimación de tokens | `gpt-image-2.6` (2.5 × factor) | `gpt-image-2.5` | `gpt-image-2` | `null` |
| `shutdownDate` | corte antes de la red | `null` | `null` | `null` | 2026-12-01 (`gpt-image-1`: 2026-10-23) |

Consecuencias verificadas en el código:

- **`quality` acepta `auto | low | medium | high | xhigh | max`.** `xhigh` y `max` existen sólo en 2.5 y 2.6;
  pedirlos a un modelo anterior **lanza antes de la red** (`assertOpenAIImageQualitySupported`), en vez de
  gastar un request que el proveedor rechaza.
- **`input_fidelity` ya no viaja con modelos 2.5.** `editOpenAIImage()` lo envía sólo cuando el modelo declara
  la capacidad, así que sigue enviándose con `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini`, y nunca con
  2.5. `gpt-image-2` tampoco lo envía, igual que antes.
- **`resolveOpenAIImageSize()` dejó de ramificar por `model === 'gpt-image-2'`** y pregunta por
  `extendedSizeGrid`. La familia 2.5 resuelve a la grilla moderna: `16:9` → `2048x1152`.

**Las tres puertas de entrada fallan ruidoso:**

1. **Env var.** Un `OPENAI_IMAGE_MODEL` desconocido **lanza** y nombra los modelos válidos, en vez de devolver
   el default en silencio. La falla aparece al arranque del consumer, que es donde se quiere descubrir una env
   mal escrita.
2. **CLI.** `pnpm ai:image` valida `--model` y `--quality` contra el allowlist **antes de cualquier I/O**.
3. **Combinación.** El par `model × quality` se valida una sola vez al arrancar el CLI, no por pieza: con
   `--count 5`, validarlo dentro del loop repetiría el mismo error cinco veces y ya habría creado directorios
   de salida.

**Reglas duras vigentes:**

- **NUNCA** enviar `input_fidelity` con un modelo 2.5. La preservación de identidad en 2.5 se pide **por
  prompt** (lista de invariantes repetida en cada turno). El helper ya lo impide; la regla aplica a cualquier
  camino que hable con el API sin pasar por él.
- **NUNCA** agregar un modelo nuevo al tipo sin declarar sus capacidades en el `Record`. El compilador lo
  exige; sortearlo con un cast reabre el bug class.
- **NUNCA** presupuestar una pieza 2.5 desde la calculadora de GPT Image 2. Medir con `usage` real — hay línea
  base fechada en §Precios.

### Contrato local implementado para transparencia en Globe

La implementación mantiene `backgroundMode` dentro de `OutputShapeV1`/constraints, no como control creativo:

```text
backgroundMode: opaque | transparent | auto
```

La ruta declara compatibilidad por modelo, la mapea al provider request, retiene el valor resuelto y valida bytes,
canal alfa y píxel no opaco. El runtime de Globe mantiene PNG; WebP no se anuncia todavía. La promoción requiere
canary propio sobre fondo claro/oscuro y no hereda evidencia del PNG histórico con fondo no especificado.

## Contradicciones y preguntas abiertas

1. Las fichas de modelo dicen que streaming no está soportado; la guía y endpoints sí lo documentan.
2. Las fichas de 2.5 marcan `Responses → Not supported`, pero su cuerpo dice que se selecciona como modelo del
   tool `image_generation` de Responses API.
3. El párrafo introductorio del endpoint de edits omite GPT Image 2, pero el enum y los ejemplos lo incluyen.
4. `partial_images` se documenta `0..3` en Image API y `1..3` en el tool de Responses API.
5. `usage` está anotado como "gpt-image-1 only" en el schema, mientras la guía de 2.5 lo instruye como la única
   fuente de verdad de consumo.
6. El schema de `/generations` sigue declarando `dall-e-2` como default de `model`, con ese modelo ya apagado.
7. `input_fidelity` sigue en el enum del schema de edits para 2.5, pero la guía lo ubica bajo "Earlier GPT
   Image models" y declara que esa sección no aplica a Sunburst ni Flare. Enum y prosa se contradicen.
8. La transparencia de GPT Image 2 sigue en preview mientras la de 2.5 se declara soportada; no hay nota de
   migración entre ambos estados.
9. No se revalidó la elegibilidad ZDR de la familia 2.5.
10. OpenAI no publicó guía de prompting específica de 2.5: la vigente en el cookbook está fechada 2026-04-21 y
    escrita para `gpt-image-2`. *Delta 2026-11-05:* existe una guía de prompting oficial en
    `api/docs/guides/image-prompting` con contenido de 2.6 (§Qué afirma OpenAI sobre 2.6).

**Agregadas el 2026-11-05 (familia 2.6):**

11. La ficha de 2.6 marca Responses "not supported" y el guide del tool lista sólo 2.5/2/1.5/1-mini, pero
    `tool.model: "gpt-image-2.6-flare"` respondió 200 y generó [verificado 2026-11-05].
12. `frame_count` del GIF: la guía dice 2–64 y la referencia 2–16.
13. `markup`: la referencia dice "Supports GPT Image 2.5"; el changelog dice 2.5 y 2.6. **Resuelta a favor del
    changelog:** funcionó en Flare 2.6 y Sunburst 2.6 [verificado 2026-11-05].
14. GIF: la referencia dice que requiere acceso a un preview; nuestra organización generó sin pedir nada, tanto en
    `generations` como en `edits` [verificado 2026-11-05]. Queda abierto si es acceso general o de nuestra cuenta.
15. Batch de 2.5: esta matriz y el generador dicen «no»; un informe de esta revalidación lo ubica en la tabla de
    Batch; la guía dice "Batch sólo gpt-image-2". Sin leer la tabla directamente.
16. **Entre documentos del repo:** esta matriz dice que el costo de 2.5 no es estimable, que no tiene rate limits
    publicados y que no hay tabla de tokens para 2.5; `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` registró el
    2026-09-16 que la calculadora oficial cubre 2.5 (fórmula que reproduce las 7 mediciones) y que los rate limits
    de 2.5 están publicados e iguales a `gpt-image-2`. No se revalidó en esta pasada.
17. La tabla de deprecations del 2026-09-08 recomendaba `gpt-image-2` como reemplazo; la del 2026-11-05
    recomienda 2.5.
18. Los valores de referencia del system card de 2.6 (Sunburst 1,92 %, Flare 1,49 %, Flare 78,36 %) no
    coinciden con los del system card de 2.5 (1,09 %, 1,41 %, 79,4 %).
19. OpenAI dice que 2.6 es *"50% faster than before"*; en nuestra única corrida Sunburst 2.6 `medium` tardó
    24,4 s contra 15,7 s de 2.5 con el mismo prompt.
20. La guía declara el GIF "not supported on edits", pero 2 cuadros a 816² sobre una foto respondieron 200
    [verificado 2026-11-05].
21. **Entre versiones de esta matriz:** la 1.1 anotaba 3.124 tokens de 2.5 en `xhigh` a 1024²; la fórmula oficial
    da 3.122 y es lo medido en 2.6. Corregido en §Precios.

**Preguntas abiertas de 2.6 (sin medir):**

- Si el factor ceil(2.5 × k) se sostiene en `medium`, `high`, `xhigh` y `max` fuera de 1024² (en `low` se sostuvo
  en tres tamaños).
- Tamaño máximo de cuadro de GIF según el número de cuadros fuera de los seis puntos medidos (§Novedades de 2.6).
- Si `input_fidelity` existe o se ignora en 2.6 (el helper no lo envía).
- Por qué Sunburst 2.6 devuelve un panel negro con la máscara del pipeline (RGB negro bajo el alfa) y no con una
  máscara que conserva el RGB de la foto: 1 de 1 cada caso; no alcanza para cambiar el pipeline.
- Preservación de identidad de personas con 2.6 frente a 2.5 Sunburst.
- Calidad relativa de 2.5 y 2.6 Sunburst en piezas finales `high`/`xhigh`/`max`, que cuestan lo mismo.
- Efecto de `complexity` en la calidad (en costo y latencia no cambió nada en `low`).
- Rate limits y elegibilidad ZDR de 2.6; si SVG y GIF conservan C2PA/SynthID.
- Definición de `prompt_rewriter`.

Cuando fuentes oficiales discrepan, se conserva la contradicción y se valida el endpoint concreto con un probe
controlado antes de cambiar el contrato.

## Fuentes oficiales

Familia 2.6, deprecaciones y precios consultados el **2026-11-05** (canarios de `xhigh`/`max`, GIF, `markup` y
máscara de la tarde del mismo día); familia 2.5, tamaños, streaming y provenance
el **2026-09-08**; el resto conserva la consulta del 2026-08-21. Agregar `.md` a cualquiera de estas URLs devuelve
el Markdown crudo.

- Fichas de `gpt-image-2.6-sunburst` y `gpt-image-2.6-flare` bajo `developers.openai.com/api/docs/models/` (ruta
  por el mismo patrón que las fichas de abajo) y `GET /v1/models/<id>` = 200 [verificado 2026-11-05]
- [Image prompting guide](https://developers.openai.com/api/docs/guides/image-prompting) — guía oficial con 2.6
- [ChatGPT Images 2.6 System Card](https://deploymentsafety.openai.com/chatgpt-images-2-6)
- Changelog del 2026-11-04: *"Released GPT-Image-2.6 Sunburst and GPT-Image-2.6 Flare for image generation and
  editing."* (enlace abajo)
- Evidencia propia: `ai-generations/2026-11-05_gpt-image-2-6-canary/` (`results.json` y `cli/`)

- [Image generation guide](https://developers.openai.com/api/docs/guides/image-generation)
- [Images API reference](https://developers.openai.com/api/reference/resources/images)
- [GPT Image 2.5 Flare](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare)
- [GPT Image 2.5 Sunburst](https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst)
- [GPT Image 2](https://developers.openai.com/api/docs/models/gpt-image-2)
- [GPT Image 1.5](https://developers.openai.com/api/docs/models/gpt-image-1.5)
- [GPT Image 1](https://developers.openai.com/api/docs/models/gpt-image-1)
- [GPT Image 1 Mini](https://developers.openai.com/api/docs/models/gpt-image-1-mini)
- [chatgpt-image-latest](https://developers.openai.com/api/docs/models/chatgpt-image-latest)
- [Pricing — image generation](https://developers.openai.com/api/docs/pricing)
- [Image cost calculator](https://developers.openai.com/api/docs/guides/image-cost-calculator)
- [Deprecations](https://developers.openai.com/api/docs/deprecations)
- [Changelog](https://developers.openai.com/api/docs/changelog)
- [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [Image generation tool (Responses API)](https://developers.openai.com/api/docs/guides/tools-image-generation)
- [Data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Content provenance](https://developers.openai.com/api/docs/guides/content-provenance)
- [Índice completo para agentes](https://developers.openai.com/api/docs/llms.txt)

Producto, seguridad y prompting (fuera de `developers.openai.com`; `openai.com` y `help.openai.com` responden
**403 a fetch programático** — se leyeron con navegador real):

- [Introducing ChatGPT Images 2.5](https://openai.com/index/introducing-chatgpt-images-2-5/) — anuncio
- [ChatGPT Images 2.5 System Card](https://deploymentsafety.openai.com/chatgpt-images-2-5) — fetchable
- [Images in ChatGPT — help center](https://help.openai.com/en/articles/11084440-images-in-chatgpt)
- [Provenance signals: Content Credentials y SynthID — help center](https://help.openai.com/en/articles/8912793-provenance-signals-content-credentials-synthid-in-openai-generated-content)
- [GPT Image Generation Models Prompting Guide — cookbook](https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide)
  ⚠️ fechada **2026-04-21 y escrita para `gpt-image-2`**. Al 2026-09-08 **no existe guía de prompting de 2.5**
  ni receta nueva en el cookbook ni post en el developer blog. Citarla como guía de la familia GPT Image, nunca
  como guía de 2.5.
