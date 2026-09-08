# OpenAI GPT Image — Provider Capability Matrix V1

> **Tipo:** investigación de proveedor y contrato de integración
> **Estado:** Accepted como evidencia de proveedor; no autoriza rollout
> **Validado:** 2026-09-08 (familia 2.5, ciclo de vida, precios, tamaños, streaming, provenance).
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

- **Delta 2026-09-08 — la familia 2.5 es la frontera.** OpenAI publicó `gpt-image-2.5-sunburst` y
  `gpt-image-2.5-flare` (snapshots `…-2026-09-08`) para Image API y para el tool `image_generation` de
  Responses API. Traen los niveles de calidad nuevos `xhigh` y `max` y **usan las mismas tarifas por token
  que GPT Image 2**.
- **`gpt-image-2` NO está deprecado** y sigue siendo el reemplazo recomendado en toda la tabla de
  deprecations. Conserva **Batch**, que 2.5 no soporta, y es el único de la familia con tabla oficial de
  costo por imagen y con rate limits publicados. No retirarlo por la llegada de 2.5.
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
- El helper Greenhouse **todavía no transporta la familia 2.5** y falla de dos formas silenciosas distintas.
  Ver §Mapeo contra Greenhouse y Globe antes de intentar usarla.

## Familia y ciclo de vida

Deprecations verificadas el 2026-09-08 contra `https://developers.openai.com/api/docs/deprecations`.

| Identidad API | Snapshot/semántica | Estado oficial al corte | Retiro anunciado | Uso nuevo |
|---|---|---|---|---|
| `gpt-image-2.5-sunburst` | alias + `gpt-image-2.5-sunburst-2026-09-08` | activo; "our most capable model for image generation and editing" | no anunciado | Sí |
| `gpt-image-2.5-flare` | alias + `gpt-image-2.5-flare-2026-09-08` | activo; "our fastest model for high-quality, everyday image generation" | no anunciado | Sí |
| `gpt-image-2` | alias + `gpt-image-2-2026-04-21` | activo; recomendado en toda la tabla de deprecations; único con Batch | no anunciado | Sí |
| `gpt-image-1.5` | `gpt-image-1.5-2025-12-16` | deprecated | 2026-12-01 | No |
| `gpt-image-1` | sin snapshot fechado distinto en la ficha | deprecated | **2026-10-23** | No |
| `gpt-image-1-mini` | alias del modelo económico de la generación 1 | deprecated | 2026-12-01 | No |
| `chatgpt-image-latest` | alias del modelo anteriormente usado por ChatGPT | deprecated; no recomendado para API | 2026-12-01 | No |

Los modelos DALL·E no pertenecen a la familia GPT Image. Sus snapshots fueron retirados del API el
2026-05-12; no son una alternativa vigente para una integración nueva.

> **Trampa documental vigente:** el schema de `/v1/images/generations` todavía declara `dall-e-2` como
> **default de `model`**, pese a que ese modelo se apagó el 2026-05-12. **NUNCA omitir `model` en un request.**

### Cómo elegir entre 2.5 y GPT Image 2

| Situación | Modelo | Razón documentada |
|---|---|---|
| Edición donde la precisión manda | `gpt-image-2.5-sunburst` | OpenAI lo posiciona para "workflows where editing precision matters most" |
| Generación cotidiana de alta calidad | `gpt-image-2.5-flare` | OpenAI lo posiciona como el más rápido de la familia |
| Requiere Batch API | `gpt-image-2` | 2.5 marca `v1/batch → Not supported` y no tiene fila batch en pricing |
| Requiere presupuesto por imagen estimable antes de gastar | `gpt-image-2` | Es el único con calculadora oficial; 2.5 sólo se mide con `usage` real |
| Requiere rate limits conocidos para dimensionar | `gpt-image-2` | 2.5 no publica tabla de rate limits |

## Superficies API

| Superficie | Selección | Generación | Edición/referencias | Máscara | Streaming | Identidad exacta | 2.5 |
|---|---|---:|---:|---:|---:|---:|---:|
| `POST /v1/images/generations` | GPT Image directo | Sí | No | No | Sí, `partial_images: 0..3` | Sí | Sí |
| `POST /v1/images/edits` | GPT Image directo | No | Sí, hasta 16 imágenes | Sí | Sí, `partial_images: 0..3` | Sí | Sí |
| Responses API + `image_generation` | modelo principal GPT-5+; el tool admite `model` explícito | Sí | Sí, multi-turn | Sí, `input_image_mask` | Sí | Sí dentro del tool | Sí |
| Batch API | endpoint Images embebido | Sí | Sí | Sí, según endpoint | resultado diferido, no SSE | Sí en el body del request | **No** |

Las fichas de modelo marcan `Streaming: Not supported`, mientras la guía y el API reference documentan streaming
de Image API y Responses API. Para la integración se toma el contrato específico del endpoint como autoridad y se
registra esta contradicción documental; el streaming sigue sin estar probado en Globe.

Las fichas de 2.5 marcan además `Responses v1/responses → Not supported` mientras su propio cuerpo dice que se
puede seleccionar "as the model of the Responses API image generation tool". Lectura adoptada: no es modelo
top-level de `/v1/responses`; sí es `model` dentro del tool `image_generation`.

**Requisito de acceso:** la guía advierte que puede exigirse completar la **API Organization Verification**
desde la consola de desarrollador antes de usar modelos GPT Image.

## Contrato de salida — familia 2.5 y GPT Image 2

### Fondo y transparencia

`background` acepta `transparent | opaque | auto`.

- En **2.5 el soporte es pleno**: la referencia declara verbatim que `gpt-image-2.5-sunburst` y
  `gpt-image-2.5-flare`, incluidos sus snapshots `2026-09-08`, soportan `opaque` y `transparent`.
- En **`gpt-image-2` la capacidad sigue en preview** para el alias y `gpt-image-2-2026-04-21`.
- `output_format` debe ser `png` o `webp`; `jpeg` es inválido porque no preserva alfa.
- No debe confundirse un checkerboard renderizado con transparencia real.
- Se debe validar que el archivo tenga canal alfa **y al menos un píxel no opaco**.
- El output debe revisarse sobre fondos claros y oscuros para detectar halos y residuos.

`background: "auto"` puede resolver a transparente u opaco. La respuesta del Image API expone el valor resuelto
como `background: "transparent" | "opaque"`; debe conservarse en provenance/readback, no inferirse del prompt.

### Calidad

`quality`: `low | medium | high | xhigh | max | auto`. Default documentado: **`auto`**.

- `xhigh` y `max` **existen sólo en la familia 2.5**. Los modelos anteriores llegan hasta `high`.
- OpenAI **no documenta qué significa cada nivel** ni su consumo de tokens. La única guía cualitativa es usar
  `low` para drafts y comparar niveles altos para encontrar el balance detalle/latencia/costo.
- El enum del endpoint también acepta `standard` y `hd`, que son valores heredados de DALL·E, no de GPT Image.

### Formato, compresión y tamaño

- Formatos: PNG por defecto, JPEG y WebP. `jpeg` es más rápido que `png`.
- `output_compression: 0..100`, default **100**; aplica sólo a JPEG y WebP; no debe enviarse con PNG.
- Tamaños recomendados: `1024x1024`, `1536x1024`, `1024x1536`. Default `auto`.
- Tamaños custom `WIDTHxHEIGHT` con **todas** estas reglas simultáneas:
  - ambos ejes múltiplos de **16**;
  - ratio entre **1:3 y 3:1**;
  - **ningún borde excede 3840 px** (la referencia fija el máximo soportado en `3840x2160`);
  - total de píxeles entre **655.360 y 8.294.400**.
- Resoluciones **superiores a `2560x1440` son experimentales** según la guía vigente.
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
- Un output aceptado exige revisar deriva fuera de la región, identidad, texto/logos y geometría protegida.
- **Los formatos aceptados como imagen de entrada del endpoint de edits NO están documentados.** La tabla
  PNG/JPEG/WEBP/GIF de "Image input requirements" pertenece a la guía de visión de Responses/Chat y **no debe
  extrapolarse** a `/v1/images/edits`.

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
  `image_generation_call`.
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
(`greenhouse-ai-image-generator`: nunca reproducir un trademark) **no se relaja** por la llegada de 2.5.

## Precios oficiales al 2026-09-08

Los valores son USD y evidencia temporal, no precios de cliente ni Studio Credits.

### Tarifas por 1M tokens — Standard

| Modelo | Image in | Image cached | Image out | Text in | Text cached | Batch |
|---|---:|---:|---:|---:|---:|---|
| `gpt-image-2.5-sunburst` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** |
| `gpt-image-2.5-flare` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | **no** |
| `gpt-image-2` | $8.00 | $2.00 | $30.00 | $5.00 | $1.25 | sí (mitad) |
| `gpt-image-1.5` | $8.00 | $2.00 | $32.00 | $5.00 | $1.25 | sí |
| `gpt-image-1` | $10.00 | $2.50 | $40.00 | $5.00 | $1.25 | sí |
| `gpt-image-1-mini` | $2.50 | $0.25 | $8.00 | $2.00 | $0.20 | sí |

El texto de salida no se factura: estos modelos emiten imágenes, no texto.

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

### Costo por imagen — modelos con calculadora oficial (NO aplica a 2.5)

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
`gpt-image-2`**. No hay equivalente publicado para GPT Image 2 ni para 2.5.

## Rate limits

| Modelo | Tabla publicada |
|---|---|
| `gpt-image-2` | Sí — Tier 1: 100.000 TPM / 5 IPM · T2: 250.000 / 20 · T3: 800.000 / 50 · T4: 3.000.000 / 150 · T5: 8.000.000 / 250 |
| `gpt-image-2.5-flare` | **No publicada** |
| `gpt-image-2.5-sunburst` | **No publicada** |

`IPM` = images per minute. Las fichas de 2.5 terminan en "Snapshots" y no incluyen sección de rate limits.
**Asumir los números de `gpt-image-2` para 2.5 sería inferencia, no documentación.** El límite real se lee en la
sección de límites de la cuenta.

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
- ZDR estaba declarado compatible para `gpt-image-2`, 1.5, 1 y 1-mini al 2026-08-21. **Para la familia 2.5 no se
  revalidó la elegibilidad ZDR**; leerla antes de comprometerla con un cliente. Los inputs de imagen se escanean
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

La verificación de provenance complementa, pero no reemplaza, el lineage interno.

## Mapeo contra Greenhouse y Globe

| Capa | Estado observado | Consecuencia |
|---|---|---|
| OpenAI | familia 2.5 activa con transparencia plena y `xhigh`/`max` | provider-supported desde 2026-09-08 |
| Greenhouse helper | **NO conoce la familia 2.5** | ver las dos trampas silenciosas abajo |
| Greenhouse helper | conserva GPT Image 2 y rechaza JPEG transparente antes de red | implementado local; aceptar el asset sigue exigiendo QA alfa |
| Greenhouse CLI | conserva el modelo exacto y no activa fallback a 1.5 | canary local facturable aprobado 2026-08-21: `gpt-image-2`, PNG 1024×1024, `quality=low`, `background=transparent`, canal alfa y 470.164 píxeles totalmente transparentes; no demuestra el runtime Globe |
| Greenhouse helper singular | fija `n=1` y rechaza `numberOfImages != 1` | evita pagar outputs que el contrato singular descartaría |
| Greenhouse Responses helper | rechaza `partialImages > 0` mientras no exista parser SSE | no promete parciales desde un camino no streaming |
| Globe `ImageOutputShapeV1` | `backgroundMode` aditivo, default canónico por ruta | implementado local; snapshots legacy leen `auto` |
| Globe OpenAI adapter | compila `transparent` sólo para GPT Image 2 y mantiene PNG | implementado local; 1.5 falla antes de red |
| Globe result driver | decodifica bytes y exige alfa + píxel no opaco | implementado local; canary/runtime pendiente |
| Globe ruta `ref/still/openai-v2` | generación prompt-only con `auto` / `opaque` / `transparent`; edit deferred | implementado local; promoción/canary pendientes |
| Globe familia 2.5 | **sin ruta, sin binding, sin readiness** | Globe está `hibernated` desde 2026-09-02; no hay promoción posible hoy |

### 🔴 Las dos trampas silenciosas del helper Greenhouse con 2.5

Verificado leyendo `src/lib/ai/openai-image.ts` el 2026-09-08. La familia 2.5 no está en el tipo
`OpenAIImageModel` ni en el set `OPENAI_IMAGE_MODELS`, y el resultado **no es un error legible**:

1. **Por env var → degradación de modelo, en silencio.** `OPENAI_IMAGE_MODEL=gpt-image-2.5-flare` no pasa el
   allowlist de `getOpenAIImageModel()`, que devuelve el default `gpt-image-2` sin advertir. Se cree estar
   generando con 2.5 y se paga GPT Image 2.
2. **Por flag CLI → degradación de resolución y parámetro prohibido, en silencio.** `pnpm ai:image --model
   gpt-image-2.5-flare` castea el valor sin validarlo, así que el modelo **sí viaja** al API; pero
   `resolveOpenAIImageSize()` ramifica por `model === 'gpt-image-2'` y manda todo lo demás a la rama legacy:
   el default por aspect ratio cae de `2048x1152` a `1536x1024`, y un `--size` moderno explícito se resuelve a
   `auto`. Además `editOpenAIImage()` inyecta `input_fidelity` para todo modelo `!== 'gpt-image-2'`, un
   parámetro cuyo comportamiento en 2.5 no está documentado.

**Reglas duras mientras el helper no se actualice:**

- **NUNCA** setear `OPENAI_IMAGE_MODEL` a un id de la familia 2.5: no genera con 2.5, genera con GPT Image 2.
- **NUNCA** documentar ni recomendar `pnpm ai:image --model gpt-image-2.5-*` como camino disponible: el modelo
  llega, pero la resolución se degrada y `input_fidelity` se inyecta sin contrato.
- Habilitar 2.5 exige, en el mismo cambio: extender el tipo y el allowlist, extender `OpenAIImageQuality` con
  `xhigh`/`max` gated a 2.5, mover 2.5 a la rama moderna de `resolveOpenAIImageSize`, dejar de inyectar
  `input_fidelity` sin evidencia, y **un canary facturable con readback de `usage` real** — porque el costo por
  imagen de 2.5 no se puede estimar antes de gastarlo.

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
    escrita para `gpt-image-2`.

Cuando fuentes oficiales discrepan, se conserva la contradicción y se valida el endpoint concreto con un probe
controlado antes de cambiar el contrato.

## Fuentes oficiales

Familia 2.5, ciclo de vida, precios, tamaños, streaming y provenance consultadas el **2026-09-08**; el resto
conserva la consulta del 2026-08-21. Agregar `.md` a cualquiera de estas URLs devuelve el Markdown crudo.

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
