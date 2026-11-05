# Generar y editar imágenes con GPT Image 2.5 y 2.6

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-11-05 por Claude
> **Ultima actualizacion:** 2026-11-05 por Claude — primera versión: `pnpm ai:image` acepta GPT Image 2.6 (Sunburst y Flare) junto a la 2.5; cómo elegir entre las dos, estimar sin gastar, generar raster, SVG y GIF, editar con referencias o con marcas (`--markup` o rayando la foto), cuándo pasar a `pnpm ai:inpaint image`, qué clave paga y cómo leer lo que imprime.
> **Modulo:** AI Tooling / Asset Generation
> **Comandos:** `pnpm ai:image` (su `--help` es el contrato), `pnpm ai:inpaint image` para editar una zona
> **Documentacion relacionada:** [editar una zona de una imagen](editar-una-zona-de-una-imagen.md), [alternar la clave de OpenAI](alternar-clave-openai.md), [generador visual de assets](../../documentation/ai-tooling/generador-visual-assets.md), [guía operativa para agentes](../../operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md)

## Para qué sirve

`pnpm ai:image` es el comando para pedirle imágenes a OpenAI desde el repo: generar desde cero, editar una imagen que
ya existe con un prompt, usar referencias, guiar la edición con marcas dibujadas y, desde el 2026-11-05, también
**vectores SVG** y **GIF animados cortos** con la familia **GPT Image 2.6**.

Hay dos familias vigentes, cada una con dos variantes:

| Id | Para qué |
|---|---|
| `gpt-image-2.5-flare` | Generar rápido y barato; explorar e iterar |
| `gpt-image-2.5-sunburst` | La pieza final y la edición más cuidada (canon de fotografía de marca) |
| `gpt-image-2.6-flare` | Lo nuevo de la 2.6 (SVG, GIF, marcas) con menor latencia |
| `gpt-image-2.6-sunburst` | Pieza final en calidad alta, a comparar contra 2.5 Sunburst |

Si no pasas `--model`, el comando usa `gpt-image-2` (no cambió). Para trabajo nuevo, nombra siempre el modelo.

## Antes de empezar

- **Elige el modelo con la tabla de abajo.** El detalle, las cifras y los precios están en la
  [guía de selección de modelos, §5.1](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md).
- **Decide quién paga.** Si eres un agente o un operador haciendo una pieza, una prueba o una iteración, agrega
  `--openai-key personal` a cada comando: paga el crédito de la cuenta personal mientras quede. Sin el flag paga la
  clave de la empresa. Nunca dejes el perfil fijo en `.env.local`. Detalle y qué hacer ante un 429 en
  [alternar la clave de OpenAI](alternar-clave-openai.md).
- **Guarda fuera de `public/`.** Sin `--out`, el archivo cae en `public/images/generated/`. Para exploraciones usa
  `--out ai-generations/<fecha>_<pieza>/<archivo>` o el scratchpad.
- **Si la pieza toca la marca Efeonce o una persona real**, carga primero la skill correspondiente (fotografía de marca,
  línea gráfica). El logo nunca lo dibuja el modelo: se compone el SVG oficial después.

### ¿2.5 o 2.6?

Medido el 2026-11-05 con corridas reales. La tarifa por token es la misma en las dos familias, pero la 2.6 **gasta
más tokens** en calidad baja e intermedia.

| Necesidad | Modelo | Por qué |
|---|---|---|
| Explorar o iterar en `low` o `medium` | **2.5 Flare** | La 2.6 cuesta unas **4,2 veces** más en `low` y **3,3 veces** más en `medium` |
| Pieza final en `high`, `xhigh` o `max` | **2.5 Sunburst o 2.6 Sunburst** | Cuestan lo mismo; la calidad relativa en nuestras piezas no está medida: compara las dos en la toma real |
| Vector SVG | **2.6 Flare** con `--format svg` | Sólo la 2.6 lo genera (Recraft vía Higgsfield es la alternativa) |
| GIF animado corto (loop) | **2.6 Flare** con `--format gif` | Sólo la 2.6. Para video de verdad, `motion-design-studio` |
| Edición guiada por marcas | **2.6 o 2.5** con `--markup`, o rayando la foto | Las dos verificadas; la capa de marcas no se cobra como imagen de entrada |
| Cambiar una zona y dejar el resto idéntico | `pnpm ai:inpaint image` con Flare | Recompone y verifica. Sunburst 2.5 y 2.6 con máscara devuelven un panel negro |
| Fotos de marca con personas reales | **2.5 Sunburst** | Es el canon; la identidad en 2.6 no tiene prueba todavía |
| Texto denso o diagramación | 2.6 con `--complexity high` (candidato, sin medir) o 2.5 Sunburst | OpenAI propone `complexity` alto para eso |
| Pedidos en lote a mitad de precio (Batch) | `gpt-image-2` | La 2.6 no tiene Batch |

`pnpm ai:image --help` trae esta misma tabla resumida.

## Paso a paso

### 1. Estima el costo sin gastar

Agrega `--estimate` a cualquier comando: imprime el costo y sale **sin llamar a la API**. Hazlo siempre antes de la
primera corrida de una pieza.

```bash
pnpm ai:image --model gpt-image-2.6-flare --quality low --size 1024x1024 --prompt "…" --estimate
```

Lo que imprime (real):

```text
  $ costo estimado ≈ USD 0.025 (1 × 824 tokens de salida × USD 30/1M, factor 2.6 medido sobre 2.5; la entrada suma aparte)
  ⚠ gpt-image-2.6-flare en low cuesta ~4.2× gpt-image-2.5-flare (≈ USD 0.006/imagen): para explorar, 2.5 rinde más.
  ↳ --estimate: no se llamó a la API.
```

- La estimación cuenta **sólo la salida**. Al editar, la imagen de entrada suma aparte.
- En la 2.6 la estimación usa los tokens de la 2.5 multiplicados por el factor medido (low 4,2 · medium 3,3 · high,
  xhigh y max 1). Es una medición nuestra, no una fórmula oficial.
- Con **GIF no hay estimación**: la hoja de cuadros no sigue la fórmula. Referencias medidas: 2 cuadros de 816² = 987
  tokens; 9 de 640² = 1.529; 6 de 640² = 710.
- Con **SVG** estima el raster de referencia y avisa que el modelo que escribe el vector se cobra aparte.

### 2. Genera una imagen (raster)

Para explorar, 2.5 Flare en `low` o `medium`:

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.5-flare --quality medium --size 1536x1024 \
  --prompt "…" --out ai-generations/2026-11-05_pieza/explora-01.png
```

- `--size`: `auto`, `1024x1024`, `1536x1024`, `1024x1536` o medidas propias con lados múltiplos de 16, relación hasta
  3:1, borde hasta 3840 y área entre 655.360 y 8.294.400 px. El comando lo valida antes de gastar.
- `--background transparent` sólo con PNG o WebP. El default es `opaque`.
- `--format png|jpeg|webp` o la extensión de `--out`. `--compression 0-100` sólo aplica a JPEG y WebP.
- `--count N` hace **N pedidos separados** y pagas N veces (el comando avisa).
- Con la 2.6 puedes sumar `--complexity low|medium|high` (cuánto planifica antes de dibujar). Si no lo pasas, OpenAI
  usa `high`. **Bajarlo no abarata**: mismos tokens, medido. Úsalo por calidad: bajo para cambios acotados, alto para
  texto denso o layout.

### 3. Produce la pieza final

En `high` o superior la 2.6 cuesta lo mismo que la 2.5. Si la pieza lo justifica, corre las dos con el mismo prompt y
elige mirando al 100 %:

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.5-sunburst --quality high --size 1536x1024 \
  --prompt-file prompt.txt --out ai-generations/2026-11-05_pieza/final-25.png
pnpm ai:image --openai-key personal --model gpt-image-2.6-sunburst --quality high --size 1536x1024 \
  --prompt-file prompt.txt --out ai-generations/2026-11-05_pieza/final-26.png
```

`xhigh` y `max` existen en las dos familias. Latencia medida con 2.6 Flare: `xhigh` unos 18 s, `max` unos 32 s.

### 4. Genera un vector SVG (sólo 2.6)

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.6-flare --format svg --quality low --size 1024x1024 \
  --prompt "Flat icon of …, two colors, no text" --out ai-generations/2026-11-05_iconos/icono.svg
```

- La extensión `.svg` de `--out` ya activa el formato; `--format svg` lo deja explícito.
- El vector lo escribe un modelo de texto: `--svg-model` (default `gpt-5.5`) con `--svg-effort`
  (`none|minimal|low|medium|high|xhigh|max`, default `low`).
- Sale **uno por pedido**, estático, sin scripts ni imágenes embebidas. Sirve para íconos y piezas simples.
- **Sólo al generar**: no se puede pedir SVG editando una imagen.
- `--background` sólo viaja si lo pasas explícito.
- Se cobra dos veces: el raster de referencia (línea `usage`) y el modelo autor (línea `svg_usage`, a la tarifa de
  ese modelo).

### 5. Genera un GIF animado corto (sólo 2.6)

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.6-flare --quality low --size 640x640 \
  --frames 6 --frame-ms 150 --prompt "… seamless loop" --out ai-generations/2026-11-05_loop/loop.gif
```

- `--size` es el tamaño de **cada cuadro**. `--frames` de 2 a 64 (default 9; avisa sobre 16) y `--frame-ms` de 20 a
  2000 (default 200).
- El loop no es un parámetro: pídelo en el prompt ("seamless loop").
- **Los cuadros se arman en una hoja interna que debe caber en 3840 px de borde y en unos 8,3 MP.** Por eso el
  tamaño máximo baja cuando pides más cuadros:

| Pedido | Resultado medido |
|---|---|
| 9 cuadros de 640² | Funciona |
| 6 cuadros de 640² | Funciona |
| 2 cuadros de 816² | Funciona |
| 2 o 4 cuadros de 1024² | Error 400: la hoja no cabe |
| 9 cuadros de 1024² | Error 400: supera el presupuesto de píxeles |

- El GIF también funcionó **editando** una foto (`--image`, 2 cuadros de 816²), aunque la guía de OpenAI dice que no
  se puede. No combina con `--mask` ni con `--markup`.

### 6. Edita una imagen con referencias

`--image` (repetible) convierte el pedido en una edición: el modelo parte de esas imágenes y el prompt describe sólo el
cambio.

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.5-sunburst --quality medium \
  --image base.png --image producto.png \
  --prompt "Image 1 is the scene. Image 2 is the product. Place the product from image 2 on the table in image 1. Keep everything else identical." \
  --out ai-generations/2026-11-05_pieza/edit-01.png
```

- Numera cada imagen y dale un rol en el prompt; pide un solo cambio por pedido y lista lo que se conserva.
- Hasta 16 imágenes de entrada. Editar **cuesta más** que generar (se suma la lectura de la imagen).
- El modelo redibuja la imagen entera: aunque le pidas «todo igual», cambia detalles fuera de lo pedido. Si el resto
  debe quedar idéntico, usa `pnpm ai:inpaint image` (paso 8).
- `--input-fidelity` no existe para 2, 2.5 ni 2.6: el comando lo rechaza. La preservación se pide en el prompt.
- Con 2.6, `--complexity low` es lo recomendado por OpenAI para ediciones enfocadas.

### 7. Edita con marcas (como el Markup de ChatGPT)

Hay dos formas, las dos verificadas el 2026-11-05 (una prueba cada una, en `low`).

**A. Capa de marcas aparte (`--markup`)** — 2.5 y 2.6:

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.6-flare --quality low --complexity low \
  --image base.png --markup marcas.png \
  --prompt "Follow the red annotations: … Do not render the annotations. Keep everything else identical." \
  --out ai-generations/2026-11-05_pieza/edit-marcas.png
```

Cómo dibujar `marcas.png`:

1. Abre la foto en tu editor (Figma, Photoshop, Affinity o similar) y crea una capa nueva encima.
2. Dibuja en esa capa con un color que no exista en la foto (rojo o magenta): óvalos alrededor de lo que cambia,
   flechas, un boceto a mano alzada del objeto nuevo y, si ayuda, una nota corta.
3. Oculta o borra la capa de la foto y exporta **sólo la capa de marcas** como PNG con fondo transparente, al
   **mismo tamaño exacto** que la foto. No la aplanes sobre la foto.
4. En el prompt, di qué significan las marcas y pide que no se dibujen ("Do not render the annotations").

Reglas: requiere `--image`; no se combina con `--mask`; el PNG debe tener canal alfa, medir lo mismo que la primera
imagen y no pasar de 16.777.216 px. El modelo no dibujó las anotaciones en las pruebas, y la capa no sumó tokens de
imagen de entrada (sólo se cobra la base).

**B. Rayando la foto (sin `--markup`)** — también funcionó con 2.5 Flare, 2.6 Flare y 2.6 Sunburst:

Pinta los trazos directo sobre una copia de la foto y pásala como `--image`. Por ejemplo, tachar en rojo un objeto
para borrarlo, o dibujar en rojo el contorno de algo que quieres que aparezca:

```bash
pnpm ai:image --openai-key personal --model gpt-image-2.6-flare --quality low \
  --image base-rayada.png \
  --prompt "Remove the objects scribbled over in red and the red scribbles. Keep everything else identical." \
  --out ai-generations/2026-11-05_pieza/sin-objeto.png
```

En las pruebas, tachar una libreta la borró y un boceto rojo de lámpara se convirtió en una lámpara real.

### 8. Edita solo una zona (deriva a `pnpm ai:inpaint image`)

Si el cambio es en una zona y **el resto tiene que quedar idéntico**, no uses `pnpm ai:image --mask`: ese camino no
recompone. Usa `pnpm ai:inpaint image`, que vuelve a pegar sólo la zona sobre la original y verifica que fuera de ella
no cambió ni un byte. Manual completo: [editar una zona de una imagen](editar-una-zona-de-una-imagen.md).

```bash
OPENAI_API_KEY_PROFILE=personal pnpm ai:inpaint image --image base.png --mask mask.png --prompt "…" \
  --model gpt-image-2.6-flare --quality low --run ai-generations/2026-11-05_pieza --dry-run
```

- El default es `gpt-image-2.5-flare`. Acepta también los dos 2.6.
- **Flare (2.5 y 2.6)** viaja con máscara (2.6 Flare: PASS medido). **Sunburst (2.5 y 2.6)** edita sin máscara, porque
  con ella devuelve un panel negro (en 2.6 también medido); el comando lo resuelve solo con `--provider-mask auto`.
- A los modelos 2.6 les manda `complexity: low` (no cambia el costo) y estima con el factor 2.6.
- `ai:inpaint` no tiene `--openai-key`: el perfil se pasa con `OPENAI_API_KEY_PROFILE=personal` delante del comando.
- Las marcas (`--markup`) viven en `pnpm ai:image`; `ai:inpaint` tiene su propio `--sketch`.

### 9. Lee lo que imprime

Al terminar cada imagen, el comando imprime el consumo:

```text
    usage: in <entrada> (img <tokens de imagen> · txt <tokens de texto>) · out <tokens de salida> · total <total>
    svg_usage: gpt-5.5 · in <n> · out <n> · reasoning <n> (tarifa de ese modelo)
```

- **`out`** es casi todo el costo: tokens de salida × la tarifa de salida de imagen (ver §5.1).
- **`img`** son los tokens de las imágenes que enviaste. En una generación desde cero es 0; si al editar sale 0, la
  imagen no viajó y fue una generación. La capa `--markup` no suma acá.
- **`svg_usage`** sólo aparece con SVG: es el modelo que escribió el vector y se cobra a su propia tarifa, aparte.
- También imprime qué clave pagó. Inclúyelo al reportar la pieza.

## Qué significan las señales

| Señal | Qué significa |
|---|---|
| `$ costo estimado ≈ USD X (…)` | Estimación de la salida; la entrada suma aparte. No se cobró nada todavía. |
| `↳ --estimate: no se llamó a la API.` | Corriste sólo la estimación. |
| `⚠ … en low cuesta ~4.2× …` / `en medium cuesta ~3.3× …` | Estás explorando con la 2.6 en una calidad donde la 2.5 rinde 3–4 veces más. |
| `$ costo: sin estimación … (la hoja de cuadros del GIF no sigue la fórmula …)` | GIF: no hay estimación previa; usa las referencias medidas del paso 5. |
| `… el SVG suma los tokens de gpt-5.5 a su tarifa` | El modelo autor del vector se cobra aparte del raster. |
| `usage: … · out N` | Consumo real de la corrida. |
| `svg_usage: …` | Consumo del modelo que escribió el SVG. |
| `FATAL: …` | Error antes de gastar o respuesta de error del proveedor. Lee el mensaje; no hay imagen. |

## Qué no hacer

- **No explores con la 2.6 en `low` o `medium`.** Cuesta 3 a 4 veces más que la 2.5 por la misma imagen de prueba.
- **No uses `--complexity` para ahorrar.** No cambia los tokens; sólo cambia cómo planifica el modelo.
- **No uses `pnpm ai:image --mask` cuando el resto debe quedar idéntico.** No recompone. Usa `pnpm ai:inpaint image`.
- **No mandes la capa de marcas como `--mask`** ni combines `--markup` con `--mask`: son cosas distintas y la API no
  deja juntarlas.
- **No aplanes las marcas sobre la foto si usas `--markup`.** Si quieres rayar la foto, usa la forma B (sin `--markup`).
- **No pidas un GIF grande con muchos cuadros.** Empieza en 640² o baja el número de cuadros.
- **No uses la 2.6 para fotos de marca con personas reales** hasta que exista una prueba de identidad.
- **No uses `gpt-image-1`** (apagado el 2026-10-23) ni `gpt-image-1.5` / `gpt-image-1-mini` desde el 2026-12-01.
- **No le pidas al modelo un logo.** Compón el SVG oficial después.
- **No dejes `OPENAI_API_KEY_PROFILE` en `.env.local`.**

## Problemas comunes

| Mensaje o síntoma | Causa | Qué hacer |
|---|---|---|
| `FATAL: "gpt-image-2.5-flare" no acepta complexity; sólo gpt-image-2.6-sunburst, gpt-image-2.6-flare.` | `--complexity` con un modelo 2.5 o anterior | Quita `--complexity` o cambia a un modelo 2.6. |
| `FATAL: "gpt-image-2.5-flare" no genera SVG; sólo gpt-image-2.6-sunburst, gpt-image-2.6-flare.` | SVG con un modelo que no lo genera | Usa `--model gpt-image-2.6-flare`. |
| `SVG exige svg.model, el modelo de texto que escribe el vector (p. ej. gpt-5.5).` / 400 `missing_required_parameter` "SVG generation requires 'svg.model'." | Se envió SVG sin modelo autor (el segundo es el error de OpenAI si llamas a la API directo) | El comando pone `gpt-5.5` por defecto; no pases `--svg-model` vacío. |
| `SVG sólo existe al generar: /v1/images/edits no devuelve SVG.` | Pediste SVG con `--image` | Genera el SVG desde cero, sin `--image`. |
| 400 `No supported sheet fits N GIF frames at size '…'` o `sheet … exceeds pixel budget` | La hoja de cuadros del GIF no cabe | Baja el tamaño del cuadro (640²) o el número de cuadros. |
| `--frames y --frame-ms sólo aplican con --format gif (o --out *.gif).` | Opciones de GIF sin formato GIF | Agrega `--format gif` o usa `--out *.gif`. |
| `El GIF no admite mask ni markup.` | GIF combinado con máscara o marcas | Quita `--mask` / `--markup`. |
| `FATAL: --markup requiere --image: las marcas se dibujan sobre la imagen base.` | `--markup` sin foto base | Agrega `--image base.png`. |
| `markup no se combina con mask (regla de OpenAI): usa una de las dos.` | `--markup` y `--mask` juntos | Elige una. Para zona exacta, `pnpm ai:inpaint image`. |
| `markup debe ser un PNG con canal alfa …` / `markup debe medir lo mismo que la primera imagen …` | La capa está aplanada, no es PNG o tiene otro tamaño | Exporta sólo la capa de marcas, PNG transparente, al tamaño exacto de la foto. |
| `FATAL: "gpt-image-1" se apagó el 2026-10-23 (deprecación de OpenAI). Usa gpt-image-2.5-flare o gpt-image-2.6-flare.` | Modelo apagado | Cambia de modelo. Lo mismo pasará con 1.5 y 1-mini desde el 2026-12-01. |
| `output_compression sólo aplica a jpeg y webp …` | `--compression` con PNG, GIF o SVG | Quítalo o cambia a JPEG/WebP. |
| 429 / `insufficient_quota` con `--openai-key personal` | Se acabó el crédito personal | Avisa al operador y quita el flag (paga la empresa). |
| La edición cambió cosas que pediste conservar | El modelo redibuja la imagen entera (2.6 también: deriva media 12–17/255 fuera de la zona, medida) | Pasa a `pnpm ai:inpaint image`, que recompone y verifica. |

## Referencias técnicas

- Contrato del comando: `pnpm ai:image --help` (gana sobre este manual si difieren).
- Guía canónica de selección de modelos y precios: [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md §5.1](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
- Guía operativa para agentes: [GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md](../../operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md)
- Spec: [GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md](../../architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md)
- Cliente canónico: `src/lib/ai/openai-image.ts` (tabla de capacidades por modelo, `assertOpenAIImageOptionsSupported`, `generateOpenAIImage`, `editOpenAIImage`)
- CLI: `scripts/ai/generate-image.ts`
- Pipeline de zona: `scripts/ai/inpaint/` (adaptador `adapters/openai.ts`)
- Evidencia de las pruebas del 2026-11-05: `ai-generations/2026-11-05_gpt-image-2-6-canary/` (incluye `results.json` y `cli/`)
