# Greenhouse AI Visual Asset Generator V1

## Architecture Decision 2026-10-06 — Nano Banana 2.1 en CLI local

- Status: Accepted — alcance local autorizado por el operador en esta conversación.
- Owner: AI tooling.
- Scope: `pnpm ai:nano`, `scripts/ai/nano-banana.ts`, `src/lib/ai/nano-banana-cli.ts`.
- Reversibility: two-way; retirar el comando y sus dos módulos.
- Confidence: alta para contrato local; evidencia por operación en el manual/auditoría.
- Validated as of: 2026-10-06.

### Context

El operador pidió Nano Banana 2.1 en nuestra CLI y revisar cobertura. `ai:image` habla OpenAI y el
helper Google del producto sólo ofrece generación básica. Google publica 2.1 con ID propio; cambiar
la env del producto para probarlo ampliaría el alcance del pedido.

### Decision

Añadir una CLI Google directa, ADC/resolver canónico, modelo exacto `gemini-nano-banana-2.1`, región
`global`, con `generateContent`, `streamGenerateContent` y `countTokens`. El contrato puro valida
controles y medios; sesiones locales preservan partes/firma del proveedor sin pensamiento privado.
Una llamada por invocación, sin fallback de modelo ni retries automáticos; salida/metadata privadas.

### Alternatives Considered

Cambiar el parser OpenAI o el default del runtime: descartados porque mezclan contratos y alcance.
Fal/Globe: descartados por la decisión Google directo y el alcance de tooling del operador.

### Consequences / Runtime Contract

Generación/edición/fusión, búsqueda, 1K–4K y thinking quedan expuestos. Batch API, Interactions remota
y máscaras PNG no quedan implementados. Coste visual nominal no es cota total; historial crece y
requiere una sesión nueva al llegar a su límite. [Manual y matriz](../manual-de-uso/ai-tooling/nano-banana-2-1-cli.md).
No cambia configuración/deploy/contrato del runtime ni disponibilidad de Globe.

### Revisit When

Cambien ID/precios/contrato; se necesiten Batch/Interactions; o se solicite migrar el runtime del producto.


> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.27
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-10-03 por Claude (1.27, TASK-1965 + TASK-1973: §Pipeline de inpainting reescrita como referencia técnica completa — flujo, mapa de módulos, contrato de verificación y detectores, códigos de salida, caché/tope/dry-run, guarda de marca, convenciones de máscara, flags y defaults de `pnpm ai:mask`, `pnpm ai:layers` y `pnpm ai:inpaint image|erase|expand|background|move|place|video`, campos de `manifest.json`/`layers.json`/`move.json`/`place.json`, adaptadores, hallazgos medidos, invariantes y pendientes)
> **Antes:** 2026-10-02 por Claude (1.26, TASK-1965: pipeline de inpainting `pnpm ai:mask` + `pnpm ai:inpaint image|video` — recompone y verifica delta 0; Sunburst con máscara devuelve un panel negro y edita sin máscara con corrección de color) · 2026-09-27 por Claude (1.25: **Plastilina en volumen, D24** — el volumen de un ícono de marca se genera editando su vector aprobado con GPT Image 2.5 Sunburst y se recorta por color; `pnpm ai:image:rmbg` rellena los calados y no se usa para esto; ver invariantes §AI Visual Asset Generator) · (1.24: **los íconos de la marca propia Efeonce no se generan sueltos** — la iconografía canónica Trazo/Plastilina vive en AXIS `v0.3.6`; un Plastilina nuevo sigue el método de AXIS con su referencia de estilo y su prompt; ver invariantes §AI Visual Asset Generator) · (1.23: la CLI `higgsfield` volvió a tener sesión —1.1.26, workspace `Private` fijado— y el primer SVG real de Recraft V4.1 sigue sin corrida; ver runbook Higgsfield §CLI) · (1.22: **la máscara tampoco sirve para mover material que ya está en la foto** — sobre la franja de primer plano desenfocado de una story, GPT Image 2.5 Sunburst llenó toda la zona transparente con un panel plano de borde recto y borró un objeto; ver la guía de selección de modelos §5.1 y el manual `editar-una-zona-de-una-imagen.md`) · (1.21: **la máscara no preserva píxeles** — GPT Image 2.5 redibuja la imagen entera aunque reciba `--mask` (delta máximo **221/255** en zona protegida con media 4,85, corrida «¿Claude o Codex?»); la preservación es un contrato de composición del agente —salida con el alfa invertido de la misma máscara sobre la base, delta máximo 0— y no del proveedor; el criterio de «zona protegida intacta» por diferencia media del halo queda corregido. Antes, 1.20: **cuando la pieza real ya existe, su foto es la fuente de construcción** — el paso de «diseñar la base según marca» sólo aplica si no hay pieza; existiendo, esa foto es la única fuente de forma y las variantes se piden como cambio de color o de aplicación, nunca como diseño nuevo descrito en palabras—, y **el calce de un accesorio puesto se declara** porque la referencia de producto se escala de más (se describe el ajuste, no el objeto), más declarar lo que la pieza **no** lleva; kit de la gorra de Efeonce. Antes, 1.19: **merch con arte impreso** — la vista que debe salir **sin** el arte se genera **sin referencias** (la referencia impone el arte, así que donde el arte no va, la referencia sobra), **contraste mínimo del texto de marca sobre sustrato oscuro impreso** (el gris de marca `#848484` da 2,98:1 sobre navy `#023c70` y no resuelve en serigrafía ni sublimado; en impresión sobre oscuro va gris claro `#C8CEDA` a 7,06:1 con «Growth» en blanco a 11,15:1, como excepción declarada y no como cambio del color de marca) y **las piezas planas se componen, no se generan** (el carnet CR80), más nombrar la pieza exacta en el prompt —portacarnet ≠ portacredencial—; kit del lanyard de Efeonce. Antes, 1.18: **emblema de marca sobre una prenda** — pasar el isotipo oficial rasterizado como referencia adicional y describir su orientación en el prompt, porque sin eso el emblema se **espeja** (6 de 21 vistas del polo piqué), y verificar **cada vista al 100 %** con recorte sobre el emblema, porque el espejado **no se ve en la hoja de contacto**; kit del polo piqué de Efeonce. Antes, 1.17: la misma frontera aplicada a una **prenda de marca** — el **texto y los emblemas** se componen determinísticamente desde el SVG oficial y el contrato de pesos de `src/config/efeonce-brand.ts` y entran como imagen 2, la **prenda la genera el modelo** desde una vista del kit de prenda; proporciones declaradas y medidas (emblema del pecho al tamaño del asset oficial, que no se reduce; estampa de espalda al 38 % del ancho de la espalda), **contrato de realismo obligatorio en el prompt** y rehacer la serie completa si el contrato cambia; kit del hoodie de Efeonce. Antes, 1.16: regla corregida al aplicar una forma exacta de marca con un modelo de imagen — el render entra como referencia de **forma** y la **intención** (material, montaje, escena, atmósfera) va en el prompt; la **pasada directa es el camino por defecto** y el halo enmascarado queda como **única excepción** (material exacto del kit + logo chico o detalle fino); criterios nuevos de cambio de material y de atmósfera fuerte, elección de la referencia por luminancia (blanco para materiales claros, navy para oscuros o color de marca) y caso de recepción en acero sobre travertino aprobado en una pasada, USD 0,14. Antes, 1.15: la aplicación del render 3D es **generativa en dos variantes** —A pasada directa para logo grande en cuadro; B pegar y repintar sólo un halo de ≈ 140 px con `--mask` protegiendo logo y escena, para detalle fino—, con umbrales medidos (4,4/255 protegido vs 39,6 halo; IoU 0,72 sin máscara de escena), composición determinística rechazada por el operador como default, y trampa de sharp `toColourspace('b-w')` al construir máscaras de 1 canal. Antes, 1.14: patrón forma exacta de marca = render 3D determinístico en Blender como imagen 1 del modelo, que sólo integra la escena; kit del logo completo de Efeonce por escala y cámara, QA letra por letra. Antes, 1.13: `pnpm ai:image:rmbg --key-background [umbral] [minPx]` cierra el gap de huecos opacos de objeto claro sobre fondo oscuro. Antes, 1.12: gap abierto del recorte de objeto claro sobre fondo oscuro —huecos opacos— con arreglo temporal de corrida; patrones recolorear desde el aprobado y guía de perspectiva. Antes, 1.11: `pnpm ai:image:rmbg` rellena por defecto los huecos internos del matting; `--no-fill-holes`. Antes, 1.10: carril Higgsfield API dentro de `pnpm ai:fal` — cliente canónico `src/lib/ai/higgsfield.ts`, 44 capacidades con JSON Schema real, precio exacto por API, secreto `greenhouse-higgsfield-api-key`; Recraft de la API: SVG sin confirmar. Antes, 1.9: brechas de `pnpm ai:image` y `pnpm ai:fal` corregidas en el commit `17196ead1` — estimación de costo previa, confirmación con tope en `ai:fal`, resolución barata por defecto, validaciones locales y `--format`. Antes: guía canónica de selección de modelos enlazada; GPT Image 2.5: costo estimable antes de gastar con la fórmula oficial, rate limits publicados, OpenAI recomienda 2.5 para integraciones nuevas, equivalencias de tokens con GPT Image 2; rankings externos contradictorios con fecha; correcciones de precio por resolución en fal. Antes: cliente fal con dos cuentas: selección por saldo, failover ante bloqueo por saldo, secreto `greenhouse-fal-api-key-b`, `--balance`, `--detach`/`--status`; verificación completa del registro: 47 de 55; costo real medido y filtro de contenido de Seedance; rotación de la clave B pendiente; antes, Wan 3.0 y Wan 3.0 Prime conectados a `pnpm ai:fal`: 6 endpoints; estado real de Nano Banana Pro en el carril Google; Kling 3 y Grok Imagine revisados sin conectar; antes, Flux 3 conectado a `pnpm ai:fal`: 12 endpoints de video verificados, draft → enhance, edit y extend; contrato real de Seedance video a video; antes, Minimax H3 conectado a `pnpm ai:fal`: kind `training`, retome por `request_id`, director no operable; antes, carril out-of-band `pnpm ai:fal`: Seedream 5 + layerize y Seedance 2.5/2.0; antes, TASK-1851 — familia GPT Image 2.5 transportada, carril Google migrado a Gemini Image)
> **Task:** TASK-278 — AI Visual Asset Generator

---

## Purpose

> **➡️ Qué modelo elegir, cuándo y cómo (imagen y video):** la guía canónica es
> [GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md). Cubre todos los
> modelos de `pnpm ai:image` y `pnpm ai:fal`. Este documento define el contrato y los carriles; la elección vive allá.

> **Carril Google migrado — 2026-09-16 (TASK-1851):** `imagen-4.0-generate-001` está **retirado**
> (discontinuación en Vertex el 2026-06-30, apagado del endpoint de Gemini API el 2026-08-17). El probe propio
> del 2026-09-16 contra el proyecto `efeonce-group` devolvió **HTTP 404 NOT_FOUND**. La migración **ya ocurrió**
> y fue de **provider**, no de string: el tipo `ImageGenerationProvider` pasó de `google-imagen` a
> `google-gemini-image`, y la API pasó de `generateImages` (predict) a `generateContent` con partes de
> contenido. Sustituir sólo el ID habría dejado el mismo retiro esperando a la vuelta de la esquina.
> Este helper es tooling Greenhouse, no el runtime de Efeonce Creative Studio.

Define el contrato, arquitectura y reglas del **AI Visual Asset Generator** — un módulo interno de toolchain
para generar assets visuales on-demand durante el desarrollo de interfaces. Los dos carriles vigentes son
**OpenAI GPT Image** (familia 2.5 y GPT Image 2) y **Google Gemini Image**.

No es un feature para usuarios finales. Es infraestructura de productividad del agente.

## Architecture

```
Agent (Claude) durante desarrollo de UI
    |
    v
[generateImage(prompt, options)]     o     [generateAnimation(prompt, options)]
    |                                            |
    v                                            v
[OpenAI GPT Image via Image API]      [Gemini via Vertex AI]
    o
[Gemini Image via generateContent]
    |                                            |
    v                                            v
PNG/WebP → public/images/generated/   SVG+CSS → public/animations/generated/
    |                                            |
    v                                            v
<img src="/images/generated/...">     <img src="/animations/generated/...">
    |                                            |
    v                                            v
git add + commit → asset servido por Vercel CDN
```

### Canales de generacion

| Canal | Motor | Modelo | Output | Uso |
|-------|-------|--------|--------|-----|
| Imagenes rasterizadas (default) | OpenAI GPT Image | `gpt-image-2` (configurable via `OPENAI_IMAGE_MODEL`) | PNG/WebP/JPEG | Carril por defecto desde TASK-1851. Assets de mayor fidelidad, composicion y adherencia a prompts |
| GPT Image 2.5 (Flare/Sunburst) | OpenAI GPT Image | `gpt-image-2.5-flare` · `gpt-image-2.5-sunburst` (+ snapshots `-2026-09-08`) — **transportado** | PNG/WebP/JPEG | Calidad `xhigh`/`max`, grilla de tamaños moderna y transparencia con soporte pleno |
| Imagenes transparentes | OpenAI GPT Image | familia 2.5 (soporte pleno) · `gpt-image-2` (capacidad provider en preview) | PNG/WebP con alfa | Helper/CLI conservan el modelo exacto y rechazan JPEG; aceptar el asset exige QA de alfa |
| Imagenes rasterizadas — carril Google | Gemini Image | `gemini-3.1-flash-image` = Nano Banana 2 (default del provider `google-gemini-image`; configurable via `GOOGLE_GEMINI_IMAGE_MODEL`) | PNG/WebP | Migrado de Imagen 4 por TASK-1851; usa `generateContent` y respeta el aspect ratio via `imageConfig`. Nano Banana Pro (`gemini-3-pro-image`) está disponible en Vertex pero no se usa (ver §Carril Google: estado de Nano Banana Pro) |
| Animaciones SVG | Gemini | Resuelto via `resolveNexaModel()` | SVG con CSS keyframes | Loading spinners, iconos animados, empty states, micro-interacciones |
| Produccion still hibrida out-of-band | Fal Seedream 5 Lite/Pro + OpenAI GPT Image 2 | Slugs verificados en el catalogo Fal y adapter OpenAI server-only | PNG/JPEG de trabajo; export gobernado posterior | Campanas multi-formato: exploracion/materialidad en Seedream, estructura/reparacion/adaptacion en GPT |
| Imagen y video via Higgsfield API (out-of-band, `pnpm ai:fal --capability hf-*`) | Higgsfield (`runHiggsfieldModel` + `estimateHiggsfieldCost` + `uploadHiggsfieldFile`) | Registro `src/lib/ai/higgsfield-capabilities.ts` (44) con contrato de entrada = JSON Schema del playground congelado en `higgsfield-schemas.json`: SOUL 2/SOUL/Cinema, Marketing Studio, Recraft 4.1 (SVG sin confirmar), Ideogram 4.0, Qwen Image 3, Z-Image Turbo, Grok Image 2.0; Seedance 2.5/2.0, Wan 3.0/Prime/2.7/2.6, Kling 3.0/Turbo/O3/Omni/2.6/2.5, MiniMax H3, Hailuo 2.3, LTX 2.5, PixVerse 6, Happy Horse, Grok Video 1.5 | Imágenes; video MP4 | Terminal, nunca runtime. Precio por API antes de encolar. Salida retenida ≥ 7 días en el proveedor. Detalle: guía de selección §5.8 |
| Imagen, capas y video via fal (out-of-band, CLI `pnpm ai:fal`) | fal.ai (`runFalModel` + `uploadFalFile`) | Registro `src/lib/ai/fal-capabilities.ts`: Seedream 5 Pro/Lite (texto a imagen, edit, **layerize**) y Seedance 2.5/2.0 (texto, imagen y referencias a video); Minimax H3 / H3 Max / H3 Max Turbo (video, camera-controls, LoRA y entrenamiento de LoRA); Flux 3 (video desde texto, imagen, primer/último cuadro o keyframes, borrador + mejora, edición y extensión de video); Wan 3.0 / Wan 3.0 Prime (texto, imagen y referencias a video; referencias pueden basarse en una web o un documento) | Imagenes; capas PNG con alfa + `layers.json`; video MP4; LoRA (`lora.*` + `config.*`) | Terminal, nunca runtime del producto. Hermano de `pnpm ai:image`, no su reemplazo. Detalle en `GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` §Carril operativo |

## Files

| File | Purpose |
|------|---------|
| `src/lib/ai/image-generator.ts` | Helper con `generateImage()` + `generateAnimation()` |
| `src/lib/ai/openai-image.ts` | Adapter server-only para OpenAI Image API |
| `src/lib/ai/fal.ts` | Cliente canonico fal.ai (`runFalModel`, `uploadFalFile`) |
| `src/lib/ai/fal-capabilities.ts` | Registro de capacidades fal que opera el CLI (slug literal, contrato de video, `verifiedAt`) |
| `scripts/ai/fal-image.ts` | CLI `pnpm ai:fal` (out-of-band; fal por defecto, Higgsfield con `--provider higgsfield` o `hf-*`) |
| `src/lib/ai/higgsfield.ts` | Cliente canonico Higgsfield (`runHiggsfieldModel`, `awaitHiggsfieldRequest`, `estimateHiggsfieldCost`, `cancelHiggsfieldRequest`, `uploadHiggsfieldFile`) |
| `src/lib/ai/higgsfield-capabilities.ts` · `higgsfield-schemas.json` | Registro de capacidades `hf-*` y snapshot de JSON Schema por endpoint (`pnpm ai:higgsfield:sync-schemas`) |
| `src/lib/ai/higgsfield-input-rules.ts` · `higgsfield-pricing.ts` | Mapeo flag → campo, validación local y cota por fórmula (Seedance/Wan 3.0) |
| `scripts/ai/higgsfield-lane.ts` | Carril Higgsfield del CLI |
| `src/app/api/internal/generate-image/route.ts` | Endpoint POST admin-only (imagen rasterizada) |
| `src/app/api/internal/generate-animation/route.ts` | Endpoint POST admin-only (SVG animado) |
| `scripts/generate-banners.mts` | Script batch para generar sets de banners |
| `.codex/skills/greenhouse-ai-image-generator/SKILL.md` | Skill Codex para direccion de arte, prompts, generacion y QA de assets IA |
| `.claude/skills/greenhouse-ai-image-generator/SKILL.md` | Skill Claude equivalente |
| `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md` | Guia compartida de prompt engineering, acabados profesionales y QA |
| `public/images/generated/` | Output de imagenes generadas |
| `public/animations/generated/` | Output de animaciones generadas |
| `public/images/banners/` | Banners pre-generados por categoria |
| `src/lib/person-360/resolve-banner.ts` | Resolver: role/department → banner category |

## API

### `generateImage(prompt, options)`

```typescript
import { generateImage } from '@/lib/ai/image-generator'

const result = await generateImage('tech banner blue gradient', {
  aspectRatio: '16:9',   // '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  format: 'png',         // 'webp' | 'png'
  provider: 'openai-image', // optional; default es openai-image (env GREENHOUSE_IMAGE_PROVIDER)
  quality: 'medium',     // optional for OpenAI
  filename: 'my-banner'  // optional
})
// result: { path, filename, format, sizeBytes, provider, model, requestedModel, modelFallbackReason }
```

### OpenAI advanced modes

`src/lib/ai/openai-image.ts` expone tres modos server-only para aprovechar el stack actual de OpenAI sin mezclarlo con UI runtime:

```typescript
import {
  generateOpenAIImage,
  editOpenAIImage,
  runOpenAIImageTool
} from '@/lib/ai/openai-image'

// 1. Text-to-image directo via Image API.
// El helper conserva la identidad GPT Image 2 y rechaza transparent + JPEG antes de red.
await generateOpenAIImage({
  prompt: 'Clean app icon, transparent background, no text',
  format: 'png',
  background: 'transparent',
  quality: 'high'
})

// 2. Edicion / referencia con una o varias imagenes, y mascara opcional.
await editOpenAIImage({
  prompt: 'Keep the product, replace only the background with a bright studio setup',
  image: { path: '/tmp/source.png' },
  mask: { path: '/tmp/mask.png' },
  format: 'png'
})

// 3. Responses API para iteraciones conversacionales/multi-turn con el image_generation tool.
await runOpenAIImageTool({
  prompt: 'Refine the previous image into a more realistic version',
  imageGenerationCallIds: ['igc_previous_call_id'],
  quality: 'high'
})
```

**El modo 2 también es alcanzable desde la terminal desde 2026-09-16:** `pnpm ai:image --image <base.png>
--mask <mask.png> --prompt "…" --out <out.png>`. La máscara es un PNG con las zonas a reemplazar en
**transparente**, del mismo formato y dimensiones que la primera imagen — el helper lo valida y falla antes de
gastar. `--mask` sin `--image` aborta antes de cualquier I/O: sin esa guarda el request saldría como generación
desde cero, ignorando la máscara en silencio. La superficie del proveedor no cambió (`POST /v1/images/edits`
siempre aceptó máscara); lo que cambió es que Greenhouse ahora la transporta desde el CLI.

**Delta 2026-09-17 — la máscara orienta, no preserva.** Medido con GPT Image 2.5
(`ai-generations/2026-09-17_claude-o-codex/`): el proveedor devuelve la imagen **entera redibujada** aunque reciba
`--mask`. En una pasada que sólo debía tocar una esquina, la zona protegida tuvo delta máximo **221/255** (la caja de
los ojos del sujeto, **147/255**) con una media de apenas **4,85**. Consecuencia de contrato: la preservación de la
zona protegida **no** es una garantía del proveedor sino un paso de composición del agente —salida del modelo con el
**alfa invertido de la misma máscara** sobre la base original, aceptación por **delta máximo 0** en la zona
protegida— y la diferencia media nunca es criterio de aceptación. La máscara conserva su valor: dice dónde trabajar y
da el contexto que hace calzar luz, color y grano. Receta: [manual, paso 5](../manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md#la-mascara-no-preserva-pixeles-el-recorte-lo-haces-tu).

OpenAI documenta PNG/WebP transparente nativo en `gpt-image-2` como preview. El helper preserva el modelo exacto,
rechaza `transparent + jpeg` antes de red y no usa `gpt-image-1.5` como fallback. La aceptación del asset verifica
el canal alfa desde bytes decodificados. Matriz completa:
`creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md`.

### GPT Image 2.5 — transportado, con contrato por capacidad

`src/lib/ai/openai-image.ts` transporta los cuatro identificadores de la familia: `gpt-image-2.5-flare`,
`gpt-image-2.5-sunburst` y sus snapshots `-2026-09-08`. Traen calidad `xhigh`/`max`, transparencia con soporte
pleno y hasta 16 referencias por edit; no tienen Batch. `gpt-image-2` **no** quedó deprecado y sigue siendo el
único de la familia con Batch (mitad de precio).

**Corrección 2026-09-16** (fuentes oficiales de OpenAI leídas ese día; reemplaza lo que este documento decía antes):

- **Rate limits de 2.5 publicados** en las fichas de Flare y Sunburst, **iguales a `gpt-image-2`**: Tier 1 100.000
  TPM / 5 IPM · T2 250.000 / 20 · T3 800.000 / 50 · T4 3.000.000 / 150 · T5 8.000.000 / 250. Ya no es cierto que
  «no tienen rate limits publicados».
- **OpenAI recomienda 2.5 para integraciones nuevas** («For new integrations, use one of the GPT Image 2.5
  models»); GPT Image 2 queda bajo «Earlier GPT Image models», sin deprecar. El default del CLI y del helper sigue
  siendo `gpt-image-2` (código); cambiarlo es decisión aparte.
- **Diferencia Sunburst vs Flare:** la única diferencia de API es `model`; mismas tarifas y mismo consumo para el
  mismo `quality × size`. Sunburst = «most capable», pensado para edición donde importa la precisión; Flare =
  «fastest», default propuesto para la mayoría de los usos. Latencia medida a 1024² (2026-09-16): `max` 46,0 s
  Flare vs 80,6 s Sunburst; `high` 18,7 s vs 29,1 s.

**El contrato se decide por capacidad declarada, no por literales de modelo.**
`OPENAI_IMAGE_MODEL_CAPABILITIES` es un `Record<OpenAIImageModel, …>` con `extendedSizeGrid`,
`premiumQualityTiers` e `inputFidelity`. Al ser un `Record`, el compilador obliga a declarar las capacidades de
todo modelo nuevo: agregar uno **no puede volver a degradar en silencio** por olvidar un literal en una rama.

- `quality` acepta `auto | low | medium | high | xhigh | max`. `xhigh` y `max` existen sólo en 2.5; pedirlos a
  un modelo anterior **lanza antes de la red** (`assertOpenAIImageQualitySupported`).
- `input_fidelity` **ya no viaja con modelos 2.5** — la guía de OpenAI los excluye explícitamente. Se sigue
  enviando con `gpt-image-1.5`, `gpt-image-1` y `gpt-image-1-mini`; `gpt-image-2` nunca lo envió.
  **Delta 2026-09-27:** pedirlo a un modelo que no lo acepta **lanza antes de la red**
  (`assertOpenAIImageInputFidelitySupported`, mismo patrón que la calidad) y el CLI valida `low | high`. Antes se
  descartaba en silencio y el flag llegó a un método canónico (el volumen de la iconografía) como si surtiera efecto.
  La lista de modelos que lo aceptan sale de la tabla de capacidades (`openAIImageModelsWith('inputFidelity')`),
  también en la ayuda del CLI.
- `resolveOpenAIImageSize()` pregunta por `extendedSizeGrid` en vez de ramificar por `model === 'gpt-image-2'`:
  la familia 2.5 resuelve a la grilla moderna (`16:9` → `2048x1152`).

**Las tres puertas de entrada fallan ruidoso:** un `OPENAI_IMAGE_MODEL` desconocido lanza y nombra los modelos
válidos; el CLI valida `--model` y `--quality` antes de cualquier I/O; y la combinación `model × quality` se
valida una sola vez al arrancar el CLI, no por pieza.

**Costo (corregido 2026-09-16):** el de una pieza 2.5 **sí se puede estimar antes de gastar**. La guía oficial de
OpenAI publica una calculadora que cubre 2.5, y su fórmula reproduce **exactamente** las 7 mediciones del repo
(196 / 1.756 / 7.024 tokens de salida en `low` / `high` / `max` a 1024²):

```text
lado_largo    = G[modelo][calidad]   # gpt-image-2: low 16 · medium 48 · high 96
                                     # gpt-image-2.5: low 16 · medium 24 · high 48 · xhigh 64 · max 96
lado_corto    = redondeo(G / (lado_mayor_px / lado_menor_px))   # .5 redondea a par
tokens_salida = ceil(lado_largo × lado_corto × (2.000.000 + ancho × alto) / 4.000.000)
```

Tarifa (Standard, las tres): imagen de salida USD 30 por 1M tokens; imagen de entrada 8; texto de entrada 5. La
ficha de 2.5 todavía dice que la calculadora no lo estima: **contradicción oficial vigente**; la calculadora y la
medición coinciden. `quality: auto` no es estimable. **Equivalencias en tokens:** 2.5 `high` = GPT Image 2 `medium` y
2.5 `max` = GPT Image 2 `high`; 2.5 `medium` y `xhigh` no tienen equivalente. Consecuencia: el default del CLI
(`gpt-image-2` · `high` · 1536×1024 ≈ USD 0,165 de salida) cuesta lo mismo que 2.5 en `max`. Costo de salida
derivado a 1024² (inferencia desde la fórmula): 2.5 `low` 0,0059 · `medium` 0,0132 · `high` 0,0527 · `xhigh` 0,0937 ·
`max` 0,2107. El `usage` de la respuesta real sigue siendo la confirmación. Hay línea base fechada del 2026-09-16 (7 piezas, `1024x1024`) en
`creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md` → §Línea base de consumo medido. Su hallazgo
central: **el costo por imagen lo fija `quality × size`, no el modelo** — Flare y Sunburst consumen idéntico
para el mismo `quality`, y lo que los separa es la latencia.

**Rankings externos (contradictorios, con fecha; ninguno es la verdad):** Arena (actualizado 2026-09-07) y
Artificial Analysis (leído 2026-09-16) ponen a 2.5 Sunburst y Flare #1/#2 en texto a imagen y en edición (Sunburst
gana edición en ambos) y a Seedream 5.0 Pro entre #8 y #15; OpenArt Arena v1.0 (2026-09-16) pone a Seedream 5.0 Pro
#1 y a GPT Image 2 #2 (sin listar 2.5). Los votos de 2.5 son pocos (≈ 3–7 mil) frente a GPT Image 2. Decidir con la
guía canónica y una prueba con el brief propio.

**Editar no abarata.** Medido el 2026-09-16 (`flare` · `low` · `1024x1024`): el modelo devuelve la imagen
completa aunque la máscara acote qué cambia, así que el `output` se cobra igual que una generación (196 tokens) y
la imagen base se suma como input (1.024 tokens) — **2,3× generar** en `low`, y la máscara en sí no cuesta nada.
El sobrecosto relativo se diluye al subir la calidad porque el output domina (~1,15× en `high`, ~1,04× en `max`).
🔴 **Para recortar el fondo de una imagen que ya existe, usar `pnpm ai:image:rmbg`** (matting local, cero costo de
proveedor). Tabla completa en la matriz → §Qué cuesta editar frente a generar.

**Relleno de huecos internos en `pnpm ai:image:rmbg` (desde 2026-09-17, activo por defecto).** El matting IMG.LY puede
dejar transparentes zonas internas del sujeto que parecen fondo (cuencas de ojos, visores, glifos). Tras el recorte,
cada componente semitransparente (alpha < 250) **no conectado al borde del lienzo** se rellena con el píxel original,
salvo que su color promedio ≈ la mediana del borde del original (tolerancia 18 por canal): ese es fondo real (el
espacio dentro del arco de unos audífonos) y queda transparente. También se considera fondo el mismo gris neutro en
sombra (luminancia entre −70 y +8 respecto del borde): caso sprocket de HubSpot apoyado en cenital, cuyo aro dejaba
ver el piso sombreado y se rellenaba. Un neutro más claro (glifos, brillos) o mucho más oscuro (cuencas) sigue siendo sujeto. Corre en un **proceso aparte**
(`scripts/ai/fill-alpha-holes-cli.ts`, lógica pura en `scripts/ai/fill-alpha-holes.ts`) porque
`@imgly/background-removal-node` trae su propio sharp/libvips anidado y dos libvips en un proceso advierten fallas
espurias. `--no-fill-holes` lo desactiva; la salida imprime `huecos internos rellenados=<px>/<componentes>`. Prueba:
`scripts/ai/fill-alpha-holes.test.ts`. Caso fuente: el `_` del emblema `>_` de Codex («saludo», biblioteca de poses 3D
del 2026-09-17) salió transparente y sobre navy se veía un rectángulo oscuro.

**Llave de fondo opt-in en `pnpm ai:image:rmbg` (`--key-background [umbral] [minPx]`, desde 2026-09-17; gap
cerrado).** Caso inverso al relleno: con un objeto claro sobre fondo oscuro, el matting deja **opacos** los huecos
pasantes que muestran el fondo (cortes de la órbita y ventanas de la nave de Efeonce blanca sobre navy; ventanas del
macro navy). `scripts/ai/key-background-holes.ts` toma como fondo la mediana del borde del original y pasa a alfa 0 cada
componente conexo (4 vecinos) aún visible cuyo color original está a menos de `umbral` (distancia RGB) del fondo y mide
≥ `minPx`; un borde de 2 px recibe alfa proporcional a la distancia y se descontamina el color, (C − (1 − a)·fondo)/a.
Corre en el mismo proceso hijo que el relleno (`fill-alpha-holes-cli.ts`), **después** del relleno (al revés, el borde
suave quedaría como hueco a rellenar). Defaults 42/30 (blanco sobre navy); fondo claro desenfocado o macro: 30/800. Es
**opt-in**: un sujeto con zonas del color del fondo las perdería. La salida imprime `huecos de fondo vaciados=<px>/<componentes>`.
Validación: sobre 4 ángulos de la nave blanca el alfa es idéntico (|Δα| medio 0) al de los finales aprobados producidos
con el arreglo de corrida `limpiar-huecos.mjs`, que queda reemplazado. Pruebas: `scripts/ai/key-background-holes.test.ts`
(hueco navy en anillo blanco se vacía; brillo blanco sobre objeto azul en fondo gris intacto; `minPx`). QA de
transparentes sobre un fondo de contraste fuerte con zoom al 100 %. Registro:
[bitácora](../operations/social/2026-09-17-efeonce-ship-3d-production-method.md).

**Patrones de generación verificados en el mismo caso** (modo edit de `pnpm ai:image`):

- **Recolorear desde el aprobado:** una variante de color se obtiene editando el render ya aprobado y cambiando sólo
  material y fondo; regenerarla desde cero salió plana y fue rechazada.
- **Guía de perspectiva:** para ángulos de cámara extremos, una proyección geométrica de la silueta oficial con cámara
  real entra como imagen 1 (copiar cámara, no aspecto); la cámara descrita sólo en texto volvió a frontal.

**Forma exacta de marca = render 3D determinístico como referencia de FORMA + la INTENCIÓN en el prompt (desde
2026-09-17).** Cuando la forma no admite variación (el logo completo de Efeonce: una palabra cuyas letras deben quedar
exactas), no la genera el modelo: se renderiza en Blender desde el SVG oficial con cámaras reales y ese render entra
como **imagen 1** de `pnpm ai:image`. Kit: OneDrive `5. Contenidos/13- Branding/Logo Efeonce 3D/`, por escala
(monumental, grande, mediana, pequeña), cámara y luz, con manifiesto por escala.

**El camino por defecto es la pasada directa.** La referencia fija **forma**: letras, órbita con sus cortes, ventanas,
proporciones y perspectiva. El prompt aporta la **intención**: material, montaje, escena, cámara y atmósfera. El modelo
resuelve material, luz, sombra montada y atmósfera mucho mejor que cualquier composición determinística nuestra, que el
operador rechazó como default («pierde sombras integradas, profundidad») y queda sólo como respaldo. Nunca pedirle
texto al modelo. Criterios que llevan a la pasada directa:

- **Logo grande en cuadro** (≳ un tercio del ancho).
- **Cambio de material** (acero, aluminio, vidrio, neón, madera, latón): la referencia entrega la forma y el prompt
  pide el material nuevo.
- **Escena con atmósfera fuerte** (larga exposición, neón, contraluz, lluvia).

**Referencia por luminancia:** render blanco para materiales claros (acero, aluminio, vidrio, blanco); navy para
materiales oscuros o para el color de marca. El color se decide por el fondo: sobre piedra clara o madera, metal o navy
con volumen; sobre fondos oscuros o nocturnos, blanco o metal claro.

Evidencia medida: avenida de Nueva York al anochecer con la escala monumental blanca, fiel al primer intento, USD 0,14.
Y **recepción de oficina premium 9:16 con larga exposición** (personas como estelas, arquitectura nítida), escala
mediana: referencia = render blanco frontal a altura de ojos con luz derecha; instrucción = «mismas letras, nave, órbita
con sus cortes, tres ventanas, proporciones y perspectiva; cambia SÓLO el material: letras volumétricas de acero
inoxidable cepillado, 1,2 m de ancho y 4 cm de fondo, cantos vivos, veta horizontal, montadas con pines ocultos sobre el
muro de travertino». Una pasada, USD 0,14 (`gpt-image-2.5-sunburst`, `xhigh`, 1152×2048), aprobada por el operador. En
esa misma pieza el halo enmascarado fue **rechazado** («se ve muy falso»): el objeto conserva el material y la luz del
kit y no pertenece a la escena; además el navy sobre travertino claro no tenía jerarquía.

**Única excepción — pegar y repintar el halo con máscara:** material exacto del kit **y** logo chico en cuadro o de
detalle fino. Ahí la pasada directa falló dos veces seguidas —encogió la órbita a un lazo y aclaró el navy— aun
exigiéndolo en el prompt. Flujo: plato de escena sin el objeto → base con el render pegado sin sombra → máscara que
protege **el interior del logo (erosión ≈ 8 px) y el resto de la escena**, dejando editable **sólo un halo de ≈ 140 px**
→ una pasada de `pnpm ai:image --image <base> --mask <mascara>` pidiendo sólo integración (sombra de contacto, reflejo,
rebotes, fundido con la profundidad de campo). Medido: diferencia media **4,4/255** en la zona protegida vs **39,6** en
el halo editable — prueba que la máscara orienta, no que lo protegido quedó intacto (ver delta 2026-09-17 en §modo 2:
recomponer lo protegido desde la base y exigir delta máximo 0). **Omitir la máscara de escena** hace que el modelo re-dibuje la escena completa conservando el objeto:
**IoU de silueta 0,72**. Artefacto conocido: brillo sucio donde el halo toca el borde del remate (bajar halo o erosión).

**Trampa al construir la máscara:** en sharp, `blur()`/`linear()` sobre un buffer raw de **1 canal devuelve 3 canales**;
sin `.toColourspace('b-w')` el índice se corre y la máscara sale **100 % transparente** (todo editable) sin error.
Contar los píxeles protegidos **antes** de gastar en el modelo.

**QA (las dos rutas):** superponer la silueta del render sobre el resultado y comparar letra por letra («e», «f», nave,
órbita con sus cortes, tres ventanas), color sin deriva y perspectiva coherente; una letra distinta = regenerar. Con
halo enmascarado, además medir la diferencia en la zona protegida y recomponerla desde la base (delta máximo 0). En una pieza, la firma sigue siendo el SVG oficial
compuesto. Registro:
[bitácora](../operations/social/2026-09-17-efeonce-logo-3d-reference-kit-production-method.md) ·
[`LEEME`](../../ai-generations/2026-09-17_efeonce-logo-3d/LEEME.md).

**Prenda de marca: el TEXTO se compone, la PRENDA se genera (desde 2026-09-17).** Misma frontera aplicada a ropa. La
prenda (caída, arrugas, capucha, puño, espalda) la genera el modelo desde una **vista de referencia** del kit de
prenda; el **texto y los emblemas** —logo completo + eslogan en la espalda— se **componen determinísticamente** desde
el SVG oficial y el contrato de pesos de `src/config/efeonce-brand.ts`, y entran como **imagen 2**: el modelo sólo los
apoya sobre la tela y los deforma con los pliegues. **Nunca se le pide el texto al modelo.** Las proporciones se
declaran y se miden (en el hoodie: emblema del pecho al tamaño del asset oficial, que **no se reduce**; estampa de
espalda al **38 %** del ancho de la espalda — al 55 % no se veía realista). **Contrato de realismo obligatorio en el
prompt** (lente de 100 mm, arrugas asimétricas, pelo de la tela, costuras levemente irregulares, tinta serigráfica mate
deformada por los pliegues; sin simetría perfecta ni brillo plástico): sin él la prenda sale con aspecto de render. Si
el contrato cambia a mitad de camino, **se rehace la serie completa**, porque una tanda vieja y una nueva juntas
parecen dos sesiones. Kit: OneDrive `5. Contenidos/13- Branding/Hoodie Efeonce/v01/`. Registro:
[bitácora del método](../operations/social/2026-09-17-hoodie-efeonce-garment-reference-kit.md) ·
[`LEEME`](../../ai-generations/2026-09-17_hoodie-efeonce/LEEME.md).

**Emblema de marca sobre una prenda: referencia adicional y QA al 100 %.** Cuando la prenda lleva un emblema —bordado
o estampado— pasar el **isotipo oficial** rasterizado (`public/branding/SVG/isotipo-full-efeonce.svg`) como referencia
adicional y describir su orientación en el prompt; sin eso el emblema **se espeja** (6 de 21 vistas en el polo piqué).
Verificar **cada vista al 100 %**, con recorte sobre el emblema: el espejado **no se ve en la hoja de contacto** y la
revisión en miniatura da falsos verdes. Kit: OneDrive `5. Contenidos/13- Branding/Polo Efeonce/v01/`. Registro:
[`LEEME`](../../ai-generations/2026-09-17_polo-efeonce/LEEME.md).

**Merch con arte impreso: tres reglas que la prenda no pedía (desde 2026-09-17).** Mismo contrato, aplicado a un objeto
que lleva arte de marca encima (lanyard, yoyo, portacarnet, carnet):

- **La vista que debe salir SIN el arte se genera sin referencias.** Pasar el arte empuja al modelo a imprimir el logo
  igual aunque el prompt pida lo contrario. El reverso liso del lanyard solo salió describiendo que no hay impresión y
  **sin imágenes de referencia**. Es el reverso exacto de la regla anterior: la referencia impone el arte, así que donde
  el arte no debe estar, la referencia sobra.
- **Contraste mínimo del texto de marca sobre sustrato oscuro impreso.** El gris de marca `#848484` da **2,98:1** sobre
  navy `#023c70` y no resuelve en serigrafía ni sublimado. En impresión sobre oscuro el eslogan va en **gris claro
  `#C8CEDA`** (7,06:1) con «Growth» en blanco (11,15:1). **Excepción declarada para sustratos oscuros impresos**, no un
  cambio del color de marca (`EFEONCE_SLOGAN_COLOR` sigue siendo `#848484` en pantalla y PDF).
- **Las piezas planas se componen, no se generan.** Una tarjeta, una etiqueta o cualquier cara plana —el carnet CR80 del
  kit— es el arte compuesto determinísticamente; pedírsela al modelo solo devuelve el riesgo de que reescriba el texto.
  Corolario de nomenclatura del mismo caso: nombrar la pieza exacta en el prompt (**portacarnet** de marco rígido con la
  cara expuesta ≠ **portacredencial**, la funda cerrada), porque el default del modelo es la pieza más común.

Kit: OneDrive `5. Contenidos/13- Branding/Lanyard Efeonce/v01/`. Registro:
[bitácora del método, §9](../operations/social/2026-09-17-hoodie-efeonce-garment-reference-kit.md) ·
[`LEEME`](../../ai-generations/2026-09-17_lanyard-efeonce/LEEME.md).

**Si la pieza real ya existe, su foto es la fuente de construcción (desde 2026-09-17).** El paso de «diseñar la base
según marca» sólo aplica cuando no hay pieza. Si ya existe —la gorra de Efeonce es el héroe visual de la landing
`/contacto` del sitio público—, esa foto entra como referencia y es la **única** fuente de forma; las variantes se
piden como **cambio de color o de aplicación** sobre ella, nunca como un diseño nuevo descrito en palabras. Corolario
del mismo caso: **el calce de un accesorio puesto se declara**, porque la referencia es una foto de producto y el
modelo la escala de más —la gorra salía de talla grande y dominaba la cara—; se describe el **ajuste** (talla adulta,
calce ceñido, perfil bajo, de la ceja a lo alto de la copa ≈ un tercio de la altura de la cabeza, visera corta y curva
del ancho de la frente), no el objeto. Y como en el reverso liso del lanyard, hay que **declarar lo que la pieza no
lleva** (la trasera de la gorra va sin bordado) o el modelo repite la marca ahí. Kit: OneDrive
`5. Contenidos/13- Branding/Gorra Efeonce/v01/`. Registro:
[bitácora del método, §8](../operations/social/2026-09-17-hoodie-efeonce-garment-reference-kit.md) ·
[`LEEME`](../../ai-generations/2026-09-17_gorra-efeonce/LEEME.md).

### `generateAnimation(prompt, options)`

```typescript
import { generateAnimation } from '@/lib/ai/image-generator'

const result = await generateAnimation('loading dots bouncing', {
  width: 120,             // optional viewBox width
  height: 120,            // optional viewBox height
  filename: 'loading'     // optional
})
// result: { path, filename, svgContent, sizeBytes }
```

### REST Endpoints

| Endpoint | Method | Auth | Production |
|----------|--------|------|------------|
| `/api/internal/generate-image` | POST | `requireAdminTenantContext` | Disabled (403) unless `ENABLE_ASSET_GENERATOR=true` |
| `/api/internal/generate-animation` | POST | `requireAdminTenantContext` | Disabled (403) unless `ENABLE_ASSET_GENERATOR=true` |

## Profile Banner System

### Pre-generated banners

7 banners generados con Imagen 4, uno por categoria contextual:

| Categoria | Archivo | Asignado a | Estetica |
|-----------|---------|------------|----------|
| `leadership` | `public/images/banners/leadership.png` | `efeonce_admin` | Navy-purple, constelacion con nodos dorados |
| `operations` | `public/images/banners/operations.png` | `efeonce_operations`, `efeonce_account`, dept Operations | Blue-teal, pipeline con formas geometricas |
| `creative` | `public/images/banners/creative.png` | dept Design, UX, Branding, Content | Magenta-coral, formas organicas fluidas |
| `technology` | `public/images/banners/technology.png` | dept Development, Engineering | Midnight-cyan, circuit board topology |
| `strategy` | `public/images/banners/strategy.png` | dept Strategy, Media, Analytics | Indigo-purple, ondas de analytics |
| `support` | `public/images/banners/support.png` | `hr_manager`, `finance_manager`, dept HR, Finance | Teal-green, cristales geometricos |
| `default` | `public/images/banners/default.png` | Cualquier otro | Navy-purple, mesh network universal |

### Banner Resolver

```typescript
import { resolveProfileBanner } from '@/lib/person-360/resolve-banner'

const bannerUrl = resolveProfileBanner(
  identity.activeRoleCodes,  // ['efeonce_admin']
  identity.departmentName    // 'Desarrollo'
)
// → '/images/banners/leadership.png' (role has priority over department)
```

Prioridad de resolucion:
1. **roleCodes** — primer match en el mapa role→category
2. **departmentName** — normalizado (lowercase, sin acentos), match en mapa department→category
3. **default** — fallback universal

### Integracion en MyProfileHeader

```tsx
<MyProfileHeader
  fullName="Julio Reyes"
  avatarUrl="/api/media/users/.../avatar"
  designation="Managing Director & GTM"
  department={null}
  joiningDate="7 abr 2026"
  bannerUrl="/images/banners/leadership.png"  // ← from resolver
/>
```

El header renderiza el banner como `background: url(...) center/cover` con fallback al gradiente CSS si `bannerUrl` es null.

## SVG Animation Contract

Las animaciones SVG generadas por Gemini siguen estas reglas (enforced via system prompt):

- Output: SVG valido con `<style>` embebido conteniendo CSS keyframes
- Colores: palette Greenhouse (Primary #7367F0, Success #6EC207, Warning #FF6500, Error #BB1954, Info #00BAD1)
- Accesibilidad: incluye `@media (prefers-reduced-motion: reduce)` que desactiva animaciones
- Sizing: `viewBox` responsive, sin width/height fijos en root
- Peso: max 10KB
- Tipografia: `DM Sans, system-ui, sans-serif`
- Sin JavaScript — solo CSS animations
- Loops seamless para animaciones ciclicas


## Pipeline de inpainting — `pnpm ai:mask`, `pnpm ai:layers` y `pnpm ai:inpaint` (TASK-1965, TASK-1973)

Herramienta de terminal, **out-of-band**: nunca la importa `src/app/**` ni un módulo runtime de `src/lib/**`, y no
crea `src/lib/media/**` (el ADR Media Foundry quedó reemplazado por Creative Studio). Vive en `scripts/ai/inpaint/**`.
El núcleo no importa `@/` para poder moverse solo (candidato: el taller de TASK-1925); sólo los adaptadores
(`adapters/openai.ts`, `adapters/fal.ts`, `adapters/layerize-fal.ts`, `adapters/video-fal.ts`) usan los clientes
canónicos `@/lib/ai/openai-image`, `@/lib/ai/fal`, `@/lib/ai/fal-capabilities` y `@/lib/ai/fal-pricing`. La edición
regional del producto es de Globe (TASK-1497/1572), en su repo.

Scripts de `package.json`: `ai:inpaint` (`scripts/ai/inpaint/cli.ts`) y `ai:layers` (`layers-cli.ts`) corren con
`tsx --require ./scripts/lib/server-only-shim.cjs`; `ai:mask` (`mask-cli.ts`) no lo necesita. Cada subcomando tiene
`--help`, que es el contrato de flags. Tasks: `docs/tasks/complete/TASK-1965-ai-inpaint-image-video-cli-pipeline.md`
y `docs/tasks/complete/TASK-1973-ai-inpaint-editing-techniques.md`.

### Principio y flujo

**El modelo no es la frontera de seguridad, el pipeline sí.** Ningún proveedor preserva lo que está fuera de la
máscara (GPT Image 2.5: hasta 179/255 en la zona protegida, medido 2026-09-17 y 2026-10-02), así que recomponer y
verificar es obligatorio y lo hace el pipeline, nunca el adaptador (el contrato `InpaintImageAdapter` sólo traduce
al proveedor y devuelve la salida CRUDA; ningún proveedor nuevo puede saltarse la garantía).

```
máscara canónica (1 canal, 255 = editable)
  → recorte con contexto (--crop auto: sólo si la caja con contexto ocupa < 25 % del área)
  → adaptador: convierte la máscara a la convención del proveedor y devuelve la salida CRUDA
  → corrección de color en un anillo de 14 px (--color-match auto: sólo si la máscara no viajó)
  → recomposición sobre la imagen ORIGINAL
  → verificación del ARCHIVO ESCRITO (delta máximo 0/255 fuera de la zona)
  → manifest.json
```

Las técnicas de TASK-1973 (`erase`, `expand`, `background`, `move`, `place`) no tienen pipeline propio: arman una
máscara y una imagen de entrada y delegan la generación en `runImageInpaint`. `move` y `place` hacen además pasos
determinísticos (hueco con clean plate, pegado del elemento recortado de la original) y los verifican con su propia
medición contra la original o el destino.

### Mapa de módulos

| Archivo | Responsabilidad |
|---|---|
| `raw.ts` | Lectura raw con número de canales exigido (`readRaw`). Trampa de sharp: `blur`/`resize` y el PNG de un plano de 1 canal devuelven 3 canales; las operaciones de 1 canal se cierran con `.toColourspace('b-w')` |
| `mask.ts` | Máscara canónica (1 canal, 255 = editable). Fuentes: rect, polígono, alfa, luminancia, sujeto (matting local de IMG.LY), máscara existente. Operaciones `invert` → `erode` → `dilate` → `feather` por distancia euclidiana; `feather` repone el núcleo en 255 (el blur lo dejaba en 253). Rechaza 0 % y 100 % editable. La conversión a la convención del proveedor vive sólo en `toProviderMaskPng` |
| `crop.ts` | Plan de recorte: caja de la zona + contexto (0,5 del lado mayor de la zona por defecto) al aspecto de un tamaño válido del proveedor; en `auto`, recorta sólo si ocupa < 25 % del área |
| `recompose.ts` | Recomposición con peso 0 = byte original (aritmética entera); `measureZones`/`verifyRecomposition` (zonas protegida, editable y costura); `matchColorInRing` (desplazamiento medio por canal en un anillo protegido de 14 px); `renderDiff` |
| `alignment.ts` | Detector de reencuadre por BORDES (desplazamiento y escala que mejor alinean gradientes en la zona protegida); la diferencia media no lo ve en superficies lisas (8,5/255 en el canario 2026-10-02). Guía de zona en magenta (`renderZoneGuide`) |
| `sketch.ts` | `--sketch` (overlay transparente o foto anotada) como imagen 2 de guía; sin `--mask`, máscara = caja del trazo + `--sketch-margin` (40 px); `growMaskToObject` hace crecer la máscara DERIVADA hasta el objeto dibujado; preámbulo con el rol numerado de cada imagen |
| `brand.ts` | Guarda de marca `assertBrandSafePrompt` |
| `run-io.ts` | Hash estable, carpeta de corrida (`<run>/inpaint/<12 hex>/`), JSON, hoja de contacto, `INPAINT_PIPELINE_VERSION` (hoy 1) |
| `pipeline-image.ts` | `runImageInpaint`: validación, recorte, estimación, caché, tope de costo, pedido, recomposición, verificación del archivo releído, detectores de sospecha, `manifest.json`, `exitCodeFor` |
| `pipeline-video.ts`, `video-mask.ts`, `ffmpeg.ts` | `runVideoInpaint`: máscara fija o por keyframes interpolados (rect o polígono), normalización de la salida del motor a resolución, fps y duración, alineación, recomposición cuadro a cuadro, verificación sobre la secuencia PNG, parpadeo, H.264 CRF 12 yuv420p con el audio del original |
| `layers.ts` | `LayersDocument`, selección de capas (`selectLayers`), máscara de capa en el tamaño de la original (`maskFromLayer`/`maskFromLayers`), `plateWithoutLayers`, `otherObjectsMask`, `bboxTag` |
| `adapters/layerize-fal.ts`, `layers-cli.ts` | `runLayerize` y `pnpm ai:layers` sobre Seedream 5 Pro Layerize |
| `techniques.ts` | Prompts y umbrales de borrado, `detectCastShadow`, `withCastShadow`, adaptador local `plate`, `measureErasure` |
| `erase.ts` | `pnpm ai:inpaint erase` |
| `move.ts` | `pnpm ai:inpaint move`; exporta `cutElement`, `pasteElement`, `integrationHalo` y `HARMONIZE_PROMPT` que reutiliza `place` |
| `place.ts` | `pnpm ai:inpaint place` (`RELIGHT_PROMPT` para `--finish element`) |
| `expand.ts`, `expand-run.ts` | Plan del lienzo (`planExpansion`), relleno previo en espejo o neutro, máscara del área nueva + franja de fundido; `EXPAND_DEFAULT_ADAPTER` |
| `background.ts` | Máscara = inverso del sujeto erosionado `--edge` px y difuminado |
| `adapters/types.ts`, `adapters/index.ts` | Contrato `InpaintImageAdapter` y registro de ids (`openai`, `fal:<capability>`) |
| `adapters/openai.ts`, `adapters/fal.ts`, `adapters/video-fal.ts` | Adaptadores de imagen OpenAI y fal, y motores de video fal |
| `cli.ts`, `mask-cli.ts` | Parseo de flags, textos de `--help` y códigos de salida |

### Contrato de garantía y verificación

- **Veredicto PASS = delta MÁXIMO 0** (en cualquier canal) en la zona protegida (máscara = 0). La media no es
  criterio. Se mide releyendo el archivo escrito, no el buffer en memoria, para que una conversión al guardar
  también quede medida.
- **La verificación prueba lo que NO se toca, no que el pedido se cumplió.** Por eso cada candidato lleva detectores
  de sospecha (no cambian el veredicto, cambian el código de salida):

| Detector | Regla | Constante |
|---|---|---|
| `suspectFlatPanel` | Más de la mitad de la zona totalmente editable volvió casi negra y plana (≤ 8/255 en todo canal) en la salida CRUDA | `FLAT_PANEL_THRESHOLD = 0.5` |
| `suspectMisaligned` | El detector de bordes encontró un desplazamiento o escala mejor que «quieto» | `alignment.ts`; aviso adicional si la deriva media de la zona protegida dentro del recorte supera `MISALIGNED_MEAN_DRIFT = 12` |
| Zona casi sin cambio | `editedMeanDelta` (núcleo + costura, ponderado por píxeles) < 12 | `LOW_EDIT_MEAN_DELTA = 12` |
| Residuo de borrado (`erase`) | Cambio medio en el núcleo de la zona < 18, o con capas `objectLikeness` > 0,5 (el resultado se parece más al objeto que al fondo limpio: el modelo dibujó otra cosa) | `ERASE_RESIDUE_THRESHOLD = 18`, `ERASE_OBJECT_LIKENESS_THRESHOLD = 0.5` |
| Costura (`background`) | Delta medio del borde del sujeto, reportado (no es veredicto): míralo al 100 % | — |
| Deriva de video | La deriva media de la zona protegida supera `--max-drift` (default 12): el comando ABORTA antes de recomponer (daría ghosting) | `--max-drift` |

- `move` y `place` comparan la original (o el destino) con el final: todo lo que no es hueco, elemento pegado ni halo
  (o zona de acabado) debe quedar en delta máximo 0.

### Códigos de salida

| Código | `image`, `erase`, `expand`, `background` | `move`, `place` | `video` |
|---|---|---|---|
| 0 | PASS y al menos un candidato no sospechoso; también `--dry-run` y una corrida reutilizada de caché que cumple lo mismo | PASS | PASS |
| 2 | FAIL: algún candidato cambió algo fuera de la zona. **No usar** | FAIL | FAIL |
| 3 | REVISAR: todos pasan, pero todos son sospechosos (panel plano, reencuadre o zona casi sin cambio; en `erase`, residuo en todos) | — | — |
| 1 | Error (`FATAL`) o manifiesto `failed` | Error | Error, incluido el aborto por deriva |

### Caché, tope de costo y dry-run

- **Caché por hash de entrada.** La clave es sha256 de un JSON estable con `INPAINT_PIPELINE_VERSION`, la imagen, la
  máscara, el tamaño, el prompt que viaja al proveedor, boceto, referencias, `adapter.id` + **`adapter.revision`**,
  modelo, calidad, semilla, `--provider-mask`, `--color-match`, guía, crecimiento de máscara, `--count`, recorte y
  `--zone-resolution`. Misma entrada = misma carpeta `<run>/inpaint/<12 hex>/`; si la corrida anterior quedó
  `completed` y sus finales existen, se reutiliza sin pagar. `--force` regenera. Subir `adapter.revision` invalida
  la caché cuando cambia cómo un adaptador arma el pedido.
- Otras carpetas: `<run>/layers/<id>/` (clave: imagen, prompt e `--image-size`), `<run>/move/<id>/`,
  `<run>/place/<id>/`, `<run>/erase-masks/`, `<run>/background-masks/`, `<run>/expand-inputs/`.
- `--run` por defecto: `ai-generations/<fecha>_inpaint` (`ai:inpaint`) y `ai-generations/<fecha>_layers` (`ai:layers`).
- **Tope de confirmación:** `--max-usd` > `AI_COST_CONFIRM_USD` > `FAL_COST_CONFIRM_USD` > USD 1. Si la estimación lo
  supera, el comando se detiene antes de gastar y exige `--yes`. Sin estimación posible no bloquea. En `ai:layers` el
  tope se compara contra la COTA (16 capas + base).
- **`--dry-run` es gratis:** escribe `mask-preview.png`, `provider-input.png`, `provider-mask.png`
  (`provider-sketch.png` si hay guía o boceto) y `manifest.json` con `status: "dry-run"` y la estimación; no llama al
  proveedor. En `ai:layers` sólo imprime la cota.
- **Estimación:** OpenAI con la fórmula oficial de tokens de salida (la entrada suma aparte); `fal:flux-pro-fill`
  USD 0,05 × megapíxeles redondeados hacia arriba; Seedream edit por área del catálogo; `plate` USD 0; `flux3-edit`
  USD 0,03 por segundo del origen. `--count N` son N pedidos pagados.

### Guarda de marca

`assertBrandSafePrompt` detiene el comando si el prompt del operador nombra logo, logotipo, isotipo, imagotipo,
wordmark, emblema, marca, brand/branding, Efeonce, Greenhouse o Nexa. Con capas (`erase`, `move`, `place`) también
revisa el nombre y la descripción de cada capa elegida. Las instrucciones internas de cada modo (`promptSuffix`) se
agregan **después** de la guarda: la guarda mira sólo lo que escribe el operador. `--allow-brand` se usa sólo cuando
la edición toca el contexto. Un logo o asset de marca nunca se genera, borra, mueve ni reconstruye con IA: se compone
el SVG oficial después (`docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`).

### Convenciones de máscara por proveedor

La máscara canónica es un PNG en escala de grises del mismo tamaño que la base: **blanco (255) = editable**, negro =
protegido, intermedio = costura. El operador nunca convierte; cada adaptador traduce con `toProviderMaskPng`. Para
leer una máscara ajena: `--convention white-editable` (default) | `alpha-transparent-editable`.

| Adaptador | Convención | ¿La máscara viaja? |
|---|---|---|
| `openai` | `alpha-transparent-editable` (transparente = editable) | Sí, salvo Sunburst con `--provider-mask auto` (default): edita sin máscara y el pipeline recompone |
| `fal:flux-pro-fill` | `white-editable` en `mask_url` | Siempre (no admite `--provider-mask` distinto de `auto`) |
| `fal:seedream5-pro-edit`, `fal:seedream5-lite-edit` | — | No: edita por instrucción; la máscara sólo recompone |
| `plate` (local) | — | No: el clean plate ya es la escena sin el objeto |
| Motores de video | — | No: el motor edita el clip entero; la máscara recompone cuadro a cuadro |

### CLIs — referencia de flags

#### `pnpm ai:mask`

| Flag | Default | Qué hace |
|---|---|---|
| `--base <img>` | — | Imagen base (define el tamaño) |
| `--rect x0,y0,x1,y1` | — | Rectángulo en fracciones (repetible) |
| `--polygon "x,y;x,y;…"` | — | Polígono en fracciones (repetible) |
| `--from-alpha <png>` + `--alpha-editable transparent\|opaque` | `transparent` | Alfa de una imagen |
| `--from-luma <img>` + `--luma-editable light\|dark` + `--threshold 0-255` | `light`, 127 | Luminancia |
| `--from-subject` + `--subject-editable subject\|background` | `subject` | Sujeto con matting local (gratis) |
| `--from-mask <png>` + `--convention` | `white-editable` | Máscara existente |
| `--from-layer <layers.json>` + `--layer <nombre\|#índice>` (repetible) | — | Capas de `pnpm ai:layers` |
| `--invert`, `--erode <px>`, `--dilate <px>`, `--feather <px>` | 0 | Operaciones, siempre en ese orden |
| `--out <png>` | — | Obligatorio salvo `--inspect` |
| `--preview <png>` | `<out>-preview.png` | Vista previa sobre la base |
| `--allow-empty`, `--allow-full` | apagados | Acepta 0 % o 100 % editable |
| `--inspect <png>` (+ `--convention`, `--base`) | — | Inspecciona sin escribir nada |

Las fuentes se unen entre sí; hace falta al menos una.

#### `pnpm ai:layers`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <img>` | — | Cualquier imagen de 512² a 6000² px |
| `--prompt <texto>` | sin prompt | Qué elementos separar |
| `--bbox x0,y0,x1,y1` (repetible) | — | Región en fracciones; viaja como `<bbox>` 0–1000 dentro del prompt |
| `--image-size auto\|auto_1K\|auto_1.5K\|auto_2K` | `auto` | Resolución de base y capas |
| `--run <dir>` | `ai-generations/<fecha>_layers` | Carpeta de la pieza |
| `--dry-run`, `--force`, `--max-usd <n>`, `--yes` | — | Cota sin llamar · repetir · tope sobre la cota |
| `--list <layers.json>` | — | Lista índice, nombre, caja y cobertura (gratis) |

#### `pnpm ai:inpaint image`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <img>` | — | Obligatorio |
| `--mask <png>` + `--convention` | `white-editable` | Zona; obligatoria si no hay `--sketch` |
| `--sketch <png>` + `--sketch-margin <px>` | 40 | Boceto como imagen 2; sin `--mask`, la máscara sale del trazo |
| `--grow-mask auto\|off` | `auto` | La máscara DERIVADA del boceto crece hasta el objeto dibujado; una `--mask` explícita nunca crece |
| `--reference <img>` (repetible) | — | Objeto a incorporar (imágenes siguientes a la guía) |
| `--prompt <texto>` \| `--prompt-file <txt>` | — | Obligatorio |
| `--adapter <id>` | `openai` | `openai`, `fal:flux-pro-fill`, `fal:seedream5-pro-edit`, `fal:seedream5-lite-edit` |
| `--model <id>` | default del adaptador (`gpt-image-2.5-flare`) | La CLI recuerda que `gpt-image-2.5-sunburst` es el más potente |
| `--quality <q>` | `medium` | OpenAI: `low`, `medium`, `high`, `xhigh`, `max` |
| `--seed <n>` | — | Sólo adaptadores que la acepten; cada candidato usa `seed + índice` |
| `--provider-mask auto\|on\|off` | `auto` | Si la máscara viaja (OpenAI) |
| `--guide auto\|off` | `auto` | Guía de zona en magenta cuando la máscara no viaja y no hay boceto |
| `--color-match auto\|on\|off` | `auto` | Corrección de color en anillo; `auto` sólo si la máscara no viajó |
| `--count <n>` | 1 | 1–8 candidatos pagados; con más de uno, `contact-sheet.png` |
| `--crop auto\|on\|off` | `auto` | Recorte con contexto |
| `--zone-resolution <px>` | — | Pasada de detalle: genera la zona recortada a ese lado largo (512–4096) y activa el recorte. **Reinterpreta, no escala** |
| `--run <dir>` | `ai-generations/<fecha>_inpaint` | Carpeta de la pieza |
| `--dry-run`, `--force`, `--max-usd <n>`, `--yes` | tope USD 1 | Ver §Caché, tope de costo y dry-run |
| `--allow-brand`, `--allow-full` | apagados | Guarda de marca · máscara 100 % editable |

`erase`, `expand`, `background`, `move` y `place` comparten el parser de `image`: un flag de `image` que la técnica
no usa se acepta y no tiene efecto. Abajo, sólo los flags que cada técnica usa.

#### `pnpm ai:inpaint erase`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <img>` | — | Obligatorio |
| `--mask <png>` | — | Zona explícita: **nunca se altera** |
| `--layers <layers.json>` + `--layer <sel>` (repetible) | — | Zona derivada de capas |
| `--grow <px>` | 16 | Agrandado de la zona derivada (nunca pisa otro objeto) |
| `--shadow auto\|off` | `auto` (sólo con capas) | Suma la sombra proyectada medida contra el clean plate |
| `--fill plate\|model` | `plate` con `--layers`; `model` con `--mask` | Relleno: clean plate local (USD 0) o un modelo |
| `--adapter`, `--model`, `--quality` | `openai` → `gpt-image-2.5-sunburst` (`ERASE_OPENAI_MODEL`) | Sólo con `--fill model` |
| `--prompt` | `ERASE_FILL_PROMPT` para un modelo de relleno con máscara (Flux Fill); `ERASE_DEFAULT_PROMPT` para editores por instrucción | Describe el fondo o pide quitar el objeto |
| `--count`, `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand` | — | Como en `image` |

Con `--fill plate` se fuerzan un solo candidato, recorte `off` y guía de zona apagada.

#### `pnpm ai:inpaint expand`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <img>` | — | Obligatorio |
| `--to 4:5\|9:16\|1:1\|1.91:1\|16:9\|3:4\|2:3\|3:2` | — | Formato destino (el lienzo crece en un solo eje); o `--canvas WxH` |
| `--scale <0,3–1>` | 1 | Achica la escena dentro del lienzo (la escena se re-muestrea) |
| `--anchor center\|left\|right\|top\|bottom` | `center` | Dónde se apoya la escena |
| `--blend <px>` | 24 | Franja de fundido sobre la escena (80–140 si el borde corta objetos) |
| `--prefill mirror\|neutral` | `mirror` | Relleno previo del área nueva (un sólido invita a inventar un panel) |
| `--prompt` | — | Obligatorio: qué hay alrededor; se le agrega `DEFAULT_EXPAND_PROMPT_SUFFIX` |
| `--adapter` | `fal:flux-pro-fill` (`EXPAND_DEFAULT_ADAPTER`); `openai` si `--model` empieza con `gpt-image` | Elegir OpenAI imprime un aviso |
| `--model`, `--quality`, `--provider-mask`, `--count`, `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand` | — | Como en `image`; el recorte se fuerza a `off` |

#### `pnpm ai:inpaint background`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <img>`, `--prompt` | — | Obligatorios (`--prompt` describe el fondo nuevo; se le agrega `BACKGROUND_PROMPT_SUFFIX`) |
| `--layers` + `--layer` | matting local si no se pasan | Sujeto desde capas |
| `--edge <px>` | 3 | Franja del borde del sujeto que el modelo rehace; su costura se reporta |
| `--adapter`, `--model`, `--quality`, `--provider-mask`, `--count`, `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand` | `openai` | Como en `image`; recorte `off` |

#### `pnpm ai:inpaint move`

| Flag | Default | Qué hace |
|---|---|---|
| `--image`, `--layers`, `--layer` | — | Obligatorios |
| `--dx <px>`, `--dy <px>` | 0 | Desplazamiento |
| `--scale <n>` | 1 | Mayor que 0,2 y hasta 3, alrededor del centro del elemento. Exige mover o escalar |
| `--shadow auto\|off` | `auto` | Borra también la sombra del elemento en su lugar original |
| `--harmonize auto\|off` | `auto` | Pasada SÓLO de sombra de contacto y reflejo en un halo (`HARMONIZE_PROMPT`); `off` = sin IA ni gasto |
| `--adapter`, `--model`, `--quality`, `--provider-mask` | `openai` | Modelo del halo |
| `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand` | — | Como en `image` |

#### `pnpm ai:inpaint place`

| Flag | Default | Qué hace |
|---|---|---|
| `--image <destino>`, `--from <origen>`, `--layers`, `--layer`, `--at x,y` | — | Obligatorios; `--at` = centro del elemento en fracciones 0–1 del destino |
| `--width <frac>` | mismo tamaño en píxeles | Ancho del elemento como fracción (0–1] del ancho del destino |
| `--finish halo\|element\|off` | `halo` | `halo`: sombra de contacto, reflejo y borde (`HARMONIZE_PROMPT`) · `element`: además relumina el elemento (`RELIGHT_PROMPT`; su forma puede variar) · `off`: sin IA ni gasto |
| `--prompt` | según `--finish` | Reemplaza el prompt del acabado |
| `--adapter`, `--model`, `--quality`, `--provider-mask`, `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand` | `openai` | Como en `image` |

#### `pnpm ai:inpaint video`

| Flag | Default | Qué hace |
|---|---|---|
| `--video <mp4>` | — | Obligatorio |
| `--mask <png>` (+ `--convention`) \| `--mask-keyframes <json>` | — | Uno de los dos: fija (cámara quieta) o por keyframes `{ "keyframes": [{ "t", "rect" \| "polygon" }], "dilate", "feather" }` |
| `--prompt` \| `--prompt-file` | — | Obligatorio |
| `--engine <id>` | `fal:flux3-edit` | `fal:flux3-edit`, `fal:seedance25-edit` |
| `--strategy edit-recompose\|first-frame` | `edit-recompose` | `first-frame` edita un cuadro con el pipeline de imagen y lo pasa de referencia (sólo motores que aceptan imágenes) |
| `--frame-time <s>` | 0 | Cuadro de referencia de `first-frame` |
| `--image-adapter`, `--image-model`, `--image-quality` | — | Para el cuadro de `first-frame` |
| `--max-drift <n>` | 12 | Deriva media aceptada de la zona protegida (0–255) |
| `--keep-frames` | apagado | Conserva las secuencias PNG |
| `--run`, `--dry-run`, `--force`, `--max-usd`/`--yes`, `--allow-brand`, `--allow-full` | — | Como en `image` |

Exige `ffmpeg` (`assertFfmpeg`).

### Artefactos

**Carpeta de una corrida de imagen** (`<run>/inpaint/<id>/`): `mask-preview.png`, `provider-input.png`,
`provider-mask.png`, `provider-sketch.png` (si hubo guía o boceto), y por candidato `candidate-N-raw.png` (salida
cruda del proveedor), `candidate-N.png` (final recompuesto), `candidate-N-diff.png` y `candidate-N-mask.png` (si la
máscara derivada creció); `contact-sheet.png` con más de un candidato; `manifest.json`. El manifiesto no guarda
secretos ni URLs firmadas.

**`manifest.json` (`kind: "ai-inpaint-image"`, `ImageInpaintManifest`):**

| Campo | Contenido |
|---|---|
| `pipelineVersion`, `runId` (12 hex), `key` (sha256), `status` (`dry-run` \| `completed` \| `failed`), `createdAt`, `error?` | Identidad y estado |
| `inputs` | `image`, `imageSha256`, `mask`, `maskSha256`, `maskConvention`, `width`, `height`, `sketch` (`path`, `sha256`, `form: overlay\|annotated`) y `references[]` (`path`, `sha256`) |
| `adapter` | `id`, `provider`, `sendsMask`, `verifiedAt` |
| `request` | `model`, `quality`, `seed`, `count`, `prompt` (del operador), `providerPrompt` (lo que viajó) |
| `mask` | `touchedFraction`, `editable`, `soft`, `protected` |
| `crop` | `mode` (`crop` \| `full`), `box`, `target`, `aspectError`, `reason` |
| `estimate` | `usd`, `basis` |
| `candidates[]` | `index`, `raw`, `final`, `diff`, `verdict`, `reason`, `editedMeanDelta`, `suspectFlatPanel`, `suspectMisaligned`, `maskGrownPixels`, `alignment` (`dx`, `dy`, `scale`, `stillError`, `bestError`, `misaligned`), `providerMaskSent`, `colorShift`, `protected`/`editable`/`seam`/`modelDriftInProtected` (`pixels`, `maxDelta`, `meanDelta`, `worst`), `outputUsd`, `providerModel`, `usage`, `meta` |

Extensiones que agregan las técnicas al mismo manifiesto: `erase` → `{ fill, layers, shadow: { pixels,
meanDarkening } | null, erasure: [{ changeInCore, corePixels, objectLikeness, residueSuspected }] }`; `expand` →
`{ source, sourceSha256, to, plan: { canvas, scene, scale }, fill, blend }`.

**`manifest.json` de video (`kind: "ai-inpaint-video"`):** `inputs` (`video`, `videoSha256`, `probe`, `mask`,
`maskFingerprintSha256`, `staticMask`), `engine` (`id`, `slug`, `verifiedAt`), `strategy`, `request` (`prompt`,
`frameTime`), `estimate`, `firstFrameRun?`, `alignment` (`sampledFrames`, `medianProtectedDrift`, `maxDrift`),
`frames` (`original`, `engine`, `reconciled: exact|padded-last|dropped-last`), `verification` (`framesChecked`,
`protectedMaxDelta`, `verdict`, `worstFrame`), `temporal` (`flickerIndex`, `editedMeanDelta`), `outputs` (`final`,
`engineRaw`, `contactSheet`).

**`layers.json` (`kind: "ai-layers"`, `version: 1`, `LayersDocument`)** junto a `00-base.png` y `NN-<slug>.png`:

| Campo | Contenido |
|---|---|
| `source` | `image`, `sha256`, `width`, `height` |
| `base` | `file` (`00-base.png`), `width`, `height` (puede no medir lo mismo que la fuente) |
| `layers[]` | `index`, `zIndex`, `name`, `description`, `file` (relativo a la carpeta), `width`, `height`, `box` (`left`, `top`, `right`, `bottom` en píxeles de la BASE, de `bounding_box.absolute`; `null` en la base), `alphaCoverage` (fracción con alfa > 127; `null` en la base) |
| `request` | `prompt`, `imageSize` |
| `cost` | `layerCount` (capas separadas, sin la base), `perLayerUsd`, `estimatedUsd` = capas + base, `note` |
| `providerMeta` | `requestId`, `account` (sin URLs) |

**`move.json` (`kind: "ai-inpaint-move"`)** en `<run>/move/<id>/`: `source`, `layers`, `dx`, `dy`, `scale`,
`harmonized`, `shadowPixels`, `final`, `untouched` (`pixels`, `maxDelta`, `meanDelta`, `worst`), `verdict`,
`harmonizeRun` (`runId`, `verdict`) | `null`. Junto a `composed.png` y `halo-mask.png`.

**`place.json` (`kind: "ai-inpaint-place"`)** en `<run>/place/<id>/`: `target`, `source`, `layers`, `box` (`left`,
`top`, `width`, `height` en el destino), `finish`, `finished`, `final`, `untouched`, `verdict`, `finishRun` (`runId`,
`verdict`) | `null`. Junto a `composed.png` y `finish-mask.png`.

### Adaptadores y endpoints

| Id | Proveedor / endpoint | Máscara | Default y notas | Verificado |
|---|---|---|---|---|
| `openai` | OpenAI `/v1/images/edits` vía `editOpenAIImage`; modelos `gpt-image-2.5-flare` (default, `medium`) y `gpt-image-2.5-sunburst` (el más potente) | Flare: sí (alfa). Sunburst: **no** — con máscara devolvió un panel negro plano 3 de 3; edita sin máscara + guía de zona en magenta + corrección de color en anillo de 14 px + detector de reencuadre | Sin semilla. Con o sin máscara redibuja toda la imagen (hasta 179/255 medido): recomponer no es opcional | 2026-10-02 (Flare) |
| `fal:flux-pro-fill` | `fal-ai/flux-pro/v1/fill` (FLUX.1 Fill), USD 0,05/MP | Sí, `mask_url` blanca | Relleno puro; sale al tamaño de la entrada; tamaño acotado a ~2 MP (máx. 1440², borde 2048). Default de `expand` | 2026-10-02 |
| `fal:seedream5-pro-edit` | `bytedance/seedream/v5/pro/edit` | No | Editor por instrucción, hasta 10 imágenes; tamaño 1024²–1536² | catálogo 2026-09-16; en este pipeline, canario de borrado 2026-10-03 |
| `fal:seedream5-lite-edit` | `bytedance/seedream/v5/lite/edit` | No | Editor por instrucción; dejó costura en la pared e ignoró `image_size` (2880×1920) | catálogo 2026-09-16; canario TASK-1965 2026-10-02 |
| `plate` (local) | Sin proveedor | — | Clean plate de Layerize (`plateWithoutLayers`), USD 0; sólo sobre la imagen completa (`--crop off`) | 2026-10-03 |
| Layerize (`ai:layers`) | `bytedance/seedream/v5/pro/layerize` (`seedream5-pro-layerize`) | — | USD 0,03375 por capa hasta 1536², 0,0675 por encima; **la base se cobra como una capa**; cota 16 + base; espera hasta 10 min | 2026-10-03 |
| `fal:flux3-edit` (video) | `blackforestlabs/flux-3/edit-video` | No | Default de `video`; MP4 < 50 MB y < 15 s; USD 0,03/s del origen; sin imágenes de referencia | 2026-10-02 |
| `fal:seedance25-edit` (video) | `seedance25-r2v` con `task: editing`, 720p | No | Hasta 30 s; acepta imagen de referencia (`first-frame`) | sin canario propio (contrato) |

Los adaptadores fal salen del catálogo `src/lib/ai/fal-capabilities.ts` (slug, campo y convención de `mask`,
semilla, precio): `pnpm ai:fal` deriva las capacidades con máscara a este comando.

### Hallazgos medidos y defaults elegidos por evidencia

Canarios: `ai-generations/2026-10-02_task-1965-canary/README.md` (≈ USD 0,40) y
`ai-generations/2026-10-03_task-1973-canary/README.md` (≈ USD 0,98). Foto de prueba: mesa de roble, taza, cuaderno y
ventana, 1536×1024.

| Técnica | Resultado | Costo (USD) |
|---|---|---|
| Editar una zona (TASK-1965) | Flare, Flux Fill, Sunburst sin máscara + guía, boceto + referencia con crecimiento de máscara y Seedream Lite: PASS, delta 0 | ≈ 0,40 en total |
| Separar en capas | 3 capas (mesa, taza, cuaderno); en otra corrida 4 + base (el saldo bajó 0,17 = 5 × 0,03375) | ≈ 0,10 · 0,17 |
| Borrar con clean plate | ✓ PASS, sombra incluida (10 219 px) | 0 |
| Borrar con Sunburst sin máscara + guía | ✓ PASS, taza y sombra fuera | 0,010 |
| Borrar con Seedream 5 Pro Edit | PASS, pero fantasma tenue del asa que el detector **no** ve | 0,068 |
| Borrar con Flare con máscara | ✗ código 3: dejó media taza y un canto de mesa desalineado | 0,013 |
| Borrar con Flux Fill | ✗ dibujó OTRA taza, dos veces (semejanza a objeto 1,46 vs 0,15 del borrado bueno) | 0,10 c/u |
| Expandir 1,91:1 | Flux ✓ sin costura · Sunburst `high` ✗ copió el espejo · Flare ✗ escala 0,88 | 0,10 · 0,036 · 0,009 |
| Expandir 9:16 | Flux ✓ (generado a 1088×1904 y escalado; inventó una banca) · Flare ✗ escala 0,90 | 0,15 · 0,014 |
| Mover | ✓ PASS, delta 0 fuera de lo tocado | 0,01 |
| Incorporar en otra imagen | ✓ PASS sin acabado y con halo | 0 · 0,01 |
| Cambiar fondo | ✓ PASS, costura media 10,6/255 | 0,01 |
| Pasada de detalle (`--zone-resolution 2048`) | ✓ PASS mecánico; Flare redibujó la taza (perdió el pie) | 0,022 |

Defaults que fijó la evidencia:

- **Editar una zona:** Flare `medium` con máscara (default). Para la pieza final, Sunburst **sin máscara** con guía de
  zona (`--provider-mask auto`). **Sunburst nunca con máscara.**
- **Borrar:** clean plate de Layerize cuando hay capas (`--fill plate`, USD 0); con `--mask`, Sunburst por instrucción
  (`ERASE_OPENAI_MODEL`). Los modelos que llenan una máscara (Flare con máscara, Flux Fill) rellenan la silueta con
  otro objeto.
- **Expandir:** Flux Fill (`EXPAND_DEFAULT_ADAPTER = 'fal:flux-pro-fill'`); GPT Image avisa (Flare reencuadra,
  Sunburst copia el espejo).
- **Capas:** el clean plate de un elemento es la base + las demás capas por `z_index`; la base sola deja pared donde
  había mesa (Layerize separa también las superficies). El nombre de la capa gana sobre la descripción al elegir
  (`--layer "mug"` coincidía con las tres capas por descripción).
- **Sombra proyectada:** se mide original contra plate (la capa de superficie viene sin sombras: la original 50–100
  niveles más oscura bajo la sombra, ±2 en el resto), crece desde el objeto, pertenece al objeto más cercano y nunca
  se toma encima de otro objeto (superficie = `z_index` menor que lo elegido Y sostiene al menos la mitad de su
  franja inferior).
- **Pasada de detalle:** `--zone-resolution` reinterpreta la zona; no es un upscale.

### Invariantes para agentes

- **NUNCA** importar `scripts/ai/inpaint/**` desde `src/app/**` ni desde un módulo runtime de `src/lib/**`: es una
  herramienta out-of-band. La edición regional del producto vive en Globe.
- **NUNCA** entregar un candidato con código 2, ni uno con código 3 sin mirarlo al 100 %: PASS prueba lo que no se
  tocó, no que la edición ocurrió.
- **NUNCA** recomponer o verificar dentro de un adaptador: el adaptador traduce y devuelve la salida cruda; un
  proveedor nuevo es un adaptador más en `adapters/index.ts` y sube su `revision` cuando cambia el pedido.
- **NUNCA** mandar máscara a `gpt-image-2.5-sunburst` (`--provider-mask on`): devuelve un panel negro plano.
- **NUNCA** usar los píxeles de una capa de Layerize como píxeles finales: las capas son contenido regenerado y sólo
  sirven de **máscara** y de **clean plate**; los píxeles que no se editan salen siempre de la imagen original (en
  `move` y `place`, el elemento se recorta de la ORIGINAL con el alfa de su capa).
- **NUNCA** usar la base de Layerize sola como clean plate: saca también las superficies. Usar `plateWithoutLayers`.
- **NUNCA** presupuestar Layerize sin la base: **la base se cobra como una capa**, y el número de capas varía entre
  corridas (presupuestar 16 + base como techo).
- **NUNCA** generar, borrar, mover ni reconstruir un logo o asset de marca con IA; `--allow-brand` sólo cuando la
  edición toca el contexto.
- **NUNCA** cerrar una máscara de 1 canal de sharp sin `.toColourspace('b-w')` antes de `.raw()`.
- **SIEMPRE** correr `--dry-run` antes de una corrida cara y respetar el tope; `--yes` sólo con gasto autorizado.
- **SIEMPRE** dejar las salidas en `ai-generations/`; los binarios se archivan con `pnpm ai-gen:archive`.

### Pendientes

| Pendiente | Estado | Condición de cierre |
|---|---|---|
| **BFL FLUX Tools** | No están en fal; API propia de BFL: `https://api.bfl.ai/v1/flux-tools/outpainting-v1` (hasta 4 MP, desde USD 0,10/MP) y `.../erase-v1` (desde USD 0,034 por imagen), más FLUX 3 Image. Requiere cuenta BFL del operador y el secreto `greenhouse-bfl-api-key` | Adaptador + canario comparativo de borrar y expandir contra plate, Sunburst y Flux Fill |
| **`foto:expandir` delegando en el núcleo (Slice 2)** | No se delegó: contrato distinto (CMP-004, Sunburst, `--reponer no`, redibuja). Movido a TASK-1925 | Delegador sin cambiar la interfaz ni las salidas aprobadas |
| **Video con máscara real: Wan VACE + SAM 2** | Esquemas leídos (`fal-ai/wan-vace-14b/inpainting`, `fal-ai/sam2/video`), sin conectar | Task aparte con canario |
| **`--batch`** | Sin implementar | Lote declarativo con la misma garantía por pieza |
| **Reiluminar (relight)** | Sin modelo dedicado conectado; lo cercano es `place --finish element`. Estudio de mercado en la guía de selección de modelos §10.3 | Canario de un candidato contra el híbrido actual |

Manuales: [editar una zona de una imagen](../manual-de-uso/ai-tooling/editar-una-zona-de-una-imagen.md) ·
[editar una zona de un video](../manual-de-uso/ai-tooling/editar-una-zona-de-un-video.md) ·
[expandir y separar en capas](../manual-de-uso/ai-tooling/expandir-y-separar-en-capas.md). Documentación funcional:
`docs/documentation/ai-tooling/generador-visual-assets.md`. Selección de modelo por técnica:
[GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md](GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md) §2.2 (árbol), §6.17 (receta) y §10.3 (relight).

## Security

- Endpoints deshabilitados en production por defecto (`NODE_ENV === 'production'` → 403)
- Override: `ENABLE_ASSET_GENERATOR=true` en env vars
- Auth: `requireAdminTenantContext` — solo efeonce_admin con route group admin
- OpenAI API key se resuelve solo server-side via `OPENAI_API_KEY` o `OPENAI_API_KEY_SECRET_REF`; nunca se hardcodea en repo ni se expone al cliente
- El default es `openai-image`; el carril Google se pide explícitamente via `GREENHOUSE_IMAGE_PROVIDER=google-gemini-image` u `options.provider`. Un `GREENHOUSE_IMAGE_PROVIDER` con valor desconocido **lanza** y nombra los providers válidos, en vez de caer al default en silencio
- Transparencia: el proveedor soporta `background='transparent'` en GPT Image 2 preview con PNG/WebP. El helper
  local conserva GPT Image 2, rechaza JPEG antes de red y exige verificar alfa real antes de aceptar el asset.
- Inputs de edicion/referencia se limitan a 10 imagenes y 50MB por archivo antes de llamar a OpenAI
- Los assets generados son archivos estaticos commiteados al repo — no hay generacion en runtime para usuarios

## Infraestructura reutilizada

| Componente | Source |
|------------|--------|
| GoogleGenAI client | `src/lib/ai/google-genai.ts` (singleton, Vertex AI) |
| OpenAI Image adapter | `src/lib/ai/openai-image.ts` (Image API, server-only) |
| Model resolution | `src/config/nexa-models.ts` (`resolveNexaModel()`) |
| GCP auth | `src/lib/google-credentials.ts` (WIF/SA key/ADC) |
| Secret resolution | `src/lib/secrets/secret-manager.ts` (`OPENAI_API_KEY_SECRET_REF` compatible) |
| Admin auth guard | `src/lib/tenant/authorization.ts` (`requireAdminTenantContext`) |

Zero dependencias nuevas.

## Related Docs

- `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md` — guía canónica: qué modelo elegir, cuándo y cómo (`pnpm ai:image` y `pnpm ai:fal`)
- `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` — contrato, slugs y precios por escalón de fal
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, animaciones, Lottie
- `docs/tasks/to-do/TASK-278-ai-visual-asset-generator.md` — task spec
- `src/hooks/useReducedMotion.ts` — hook para respetar prefers-reduced-motion
- `src/libs/Lottie.tsx` — wrapper Lottie existente (para JSON animations)

## Future

- Video generation via Veo: micro-videos para onboarding
- Batch generation: sets completos de assets por tema (todos los empty states)
- GCS upload: para assets grandes que no deben vivir en el repo
- Banner personalizado por persona: foto propia subida por el usuario

---

## Invariantes operativos para agentes — AI image + LLM providers

> **Relocados de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Espejo operativo (NUNCA/SIEMPRE) que un agente carga al tocar este dominio; el contrato técnico vive en su spec. Dedup = TASK-1160 Slice 4.

### AI Visual Asset Generator

- Skill canonica para pedir, promptear, generar y QA assets visuales con IA: `.claude/skills/greenhouse-ai-image-generator/SKILL.md` (Codex mirror: `.codex/skills/greenhouse-ai-image-generator/SKILL.md`). Usarla cuando el usuario pida iconos, UI elements, empty states, banners, assets transparentes, OpenAI/GPT Image/Imagen/Nano Banana o mejora de prompts para imagenes.
- La skill no solo opera el provider: debe actuar como direccion de arte, con brief visual, composicion, materiales/acabados, iluminacion, paleta, iteracion single-change y rubric de QA profesional. Guia compartida: `docs/operations/GREENHOUSE_AI_IMAGE_GENERATION_AGENT_SKILL_V1.md`.
- Entry point canonico para assets visuales generados por agentes: `src/lib/ai/image-generator.ts`.
- `generateImage()` soporta providers `openai-image` (default) y `google-gemini-image`; no llamar APIs de imagen desde scripts paralelos si el helper cubre el caso. El carril Google migró de Imagen a Gemini Image por TASK-1851: `imagen-4.0-generate-001` está retirado y responde 404.
- **CLI canonica de generacion `pnpm ai:image` (gpt-image-2, desde 2026-06-10):** wrapper operativo del fn canonico `generateOpenAIImage` (`src/lib/ai/openai-image.ts`) para generar imagenes desde la terminal — conceptos del `product-design-loop`, fixtures de mockup, batches de iconos/assets. **NO crear scripts de generacion ad-hoc** (`scripts/_gen-*.ts`): usar esta CLI. Self-contained (carga `.env.local` solo; resuelve `OPENAI_API_KEY_SECRET_REF` server-side, nunca imprime el secreto). Default `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated`. Timeout default **280s** (gpt-image-2 `high` supera los 125s del helper runtime `generateImage`, que NO pasa-through `timeoutMs` — por eso la CLI usa el fn de bajo nivel). Uso: `pnpm ai:image --prompt "<texto>" [--out <path>] [--size 1024x1024|1536x1024|1024x1536|2048x...] [--quality low|medium|high|xhigh|max|auto] [--background auto|opaque|transparent] [--format png|jpeg|webp] [--model gpt-image-2|gpt-image-2.5-flare|gpt-image-2.5-sunburst] [--count N] [--timeout ms] [--open]`; `--prompt-file <path>` (prompts largos); `--batch <json>` (`[{ filename, prompt }, …]`, varios). **Modo edit/inpainting:** `--image <path>` (repetible) edita una referencia en vez de generar desde cero, y `--mask <path>` (desde 2026-09-16) marca **qué zona** se reemplaza — PNG con las zonas a editar en **transparente**, mismo formato y mismas dimensiones que la primera `--image`; el cliente canónico lo valida y falla antes de gastar. **`--mask` sin `--image` aborta antes de cualquier I/O**: sin esa guarda el request saldría como generación desde cero ignorando la máscara en silencio. **La CLI imprime `usage` en cada corrida** (`usage: in N (img N · txt N) · out N · total N`), que confirma el costo real; desde 2026-09-16 el de 2.5 también se estima antes con la fórmula oficial (§GPT Image 2.5). **Brechas de la CLI corregidas el 2026-09-16 (commit `17196ead1`):** `--size` se valida en local contra la grilla del modelo (2/2.5: `auto` o WxH múltiplos de 16, borde ≤ 3840, relación ≤ 3:1, área 655.360–8.294.400; 1.5/1/mini: `1024x1024`, `1536x1024`, `1024x1536` o `auto`), `--background` se valida, `--format png|jpeg|webp` existe (sin flag se deduce de la extensión de `--out`; `transparent` + `jpeg` se rechaza), `--count N` avisa que son N pedidos pagados y la CLI imprime `$ costo estimado` con la fórmula oficial antes de pedir (sólo informa, no confirma). Sigue abierto: `--input-fidelity` con 2.5 o 2 se ignora en silencio. 🔴 **Editar no abarata** — el modelo devuelve la imagen completa aunque la máscara acote el cambio, así que el output se cobra igual que una generación y la imagen base se suma como input (2,3× generar en `low`); **para recortar el fondo de una imagen que ya existe, usar `pnpm ai:image:rmbg`** (matting local, cero costo de proveedor). La CLI **valida `--model` y `--quality` contra el allowlist antes de cualquier I/O**, y valida la combinación `model × quality` una sola vez al arrancar (no por pieza): `xhigh` y `max` sólo existen en la familia 2.5. Preserva el modelo exacto para transparencia, rechaza JPEG y no degrada a 1.5. **Sigue siendo raster** (PNG/WebP) — para vectores reales, Higgsfield + Recraft V4.1 (abajo). Para assets repo-bound que el runtime sirve, preferir el helper `generateImage()`; la CLI es para generacion operada por agente/operador. **Direccion de arte = invocar la skill `greenhouse-ai-image-generator`** (la CLI opera el modelo; la skill aporta brief/composicion/QA).
- `GREENHOUSE_IMAGE_PROVIDER` controla el default runtime, pero cada llamada puede pasar `provider`.
- OpenAI usa `src/lib/ai/openai-image.ts` y resuelve la key solo server-side con `OPENAI_API_KEY` / `OPENAI_API_KEY_SECRET_REF`; el secreto canonico es `greenhouse-openai-api-key` en GCP Secret Manager. Nunca hardcodear `sk-*` en repo, Vercel env directo, logs, tests ni docs.
- Para transparencia del proveedor, pedir `format: 'png' | 'webp'` y `background: 'transparent'`; el helper
  transporta ese contrato sin degradar a un modelo deprecated y rechaza JPEG antes de red. El soporte es pleno
  en la familia 2.5 y sigue en preview en `gpt-image-2`. La aceptación exige canal alfa y al menos un píxel no
  opaco, en cualquiera de los dos.
- Modos OpenAI disponibles: `generateOpenAIImage()` para text-to-image, `editOpenAIImage()` para imagenes de referencia/mascara, y `runOpenAIImageTool()` para Responses API multi-turn con `image_generation`.
- **`gpt-image-*` es RASTER** (PNG/WebP/JPEG) — **NO genera SVG**. Si se necesita vector, vectorizar el raster como paso aparte (no hay helper canonico de vectorizacion hoy) o aceptar un SVG real via upload (el uploader hoy acepta PNG/JPG/WebP, no SVG).
- **Vectores para implementacion de UI vía Higgsfield CLI + Recraft V4.1 (desde 2026-06-09):** la CLI `higgsfield` (binario en `~/.local/bin`, alias `hf`, cuenta `mkt@efeoncepro.com` plan Ultra, autenticada via `higgsfield auth login`) + el MCP Higgsfield exponen **Recraft V4.1** (`job_set_type: recraft_v4_1`) con `--model_type vector` → **salida vectorial real**, justo el hueco que `gpt-image` (raster-only) deja abierto. Es la herramienta para **producir assets vectoriales de UI/marca** (iconos, logos, ilustraciones de design-system, empty states) con **paleta controlada** (`--colors`, p.ej. pinear tonos AXIS) + `--background_color`, `--aspect_ratio`, `--resolution {1k,2k}`. Comando canonico: `higgsfield generate create recraft_v4_1 --prompt "…" --model_type vector --aspect_ratio 1:1 --resolution 2k --wait`. **Caveats duros:** (1) Higgsfield es **producción de assets out-of-band** (se generan acá y se SUBEN al portal vía el uploader canonico), **NO** el path runtime — el entrypoint runtime canonico sigue siendo `src/lib/ai/image-generator.ts` (OpenAI GPT Image / Gemini Image); NUNCA cablear Higgsfield a un flujo runtime del producto. (2) Las skills (`higgsfield-generate`, `-product-photoshoot`, `-soul-id`, `-marketplace-cards`) aportan el craft (modelo correcto por tarea, modos, art direction); usarlas. (3) Verificar el **formato del archivo entregado (SVG)** en el primer uso real antes de asumirlo. (4) Aplica el contrato visual Greenhouse igual (tokens AXIS, no inventar hex) + revisar el asset producido con las skills de diseño antes de integrarlo. **Estado 2026-09-24:** la CLI se actualizó a 1.1.26 y volvió a tener sesión (tras el login es obligatorio `higgsfield workspace set <id>`); el primer SVG real de Recraft V4.1 sigue sin corrida, así que el caveat (3) permanece abierto. Operación y trampas: runbook `HIGGSFIELD_PROVIDER_RUNBOOK_V1.md` §«CLI `higgsfield`».
- **Íconos de la marca propia Efeonce (desde 2026-09-26): NUNCA se generan sueltos ni se dibujan dentro de una pieza.** La iconografía canónica de la línea «La órbita» (dos voces: Trazo para lo que se mide, Plastilina para lo que se crea; 30 glifos aprobados) vive en AXIS: tokens `efeonceGraphicLine.icons` (`@efeoncepro/axis-tokens` 0.3.6) y `@efeoncepro/axis-graphic-line/icons` (0.4.0: `ICON_CATALOG`, `resolveIcon`, `auditIconGroup`, `skewedOrbitHeroSvg`). Un ícono que ya existe se toma del catálogo (Lab `axis.efeonce.org/references/iconography/`), nunca se regenera. Un **Plastilina nuevo** sigue el método de AXIS: se genera sólo la forma (nunca el color) con `pnpm ai:image --image` sobre la referencia de estilo `docs/agent-composition/iconography/plastilina-style-reference.png` del repo AXIS y su prompt canónico `plastilina-prompt.txt` (se cambia sólo `{{OBJETOS}}`), se vectoriza con `pnpm icons:vectorize`, se verifica con `pnpm icons:check` y entra al set sólo con la aprobación del operador; la esfera se compone después y la del modelo nunca se conserva. Un **Trazo nuevo** se dibuja a mano en la grilla, no con un modelo. No aplica a íconos de UI de Greenhouse ni a trabajo de clientes. Canon: [manual de la línea §14](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#14-iconografía-trazo-y-plastilina) + guía `docs/agent-composition/iconography.md` del repo AXIS.
- **Plastilina en volumen (D24, desde 2026-09-27): el volumen de un ícono de marca se genera desde su vector aprobado y se recorta por color, nunca con matting.** Referencia = el ícono plano en respuesta a 760 px sobre `#001a33` (`pnpm icons:volume -- refs` en AXIS) → `pnpm ai:image --model gpt-image-2.5-sunburst --quality high --size 1024x1024 --image <ref.png> --prompt-file <volume-prompt.txt> --out <crudo.png>` (sin `--input-fidelity`: la familia 2.5 no acepta `input_fidelity` —capacidad `inputFidelity: false` en `src/lib/ai/openai-image.ts`— y el CLI lo ignora en silencio; la fidelidad la da el prompt) con el prompt canónico de AXIS (no se reescribe; se agrega una línea que nombre el detalle que falla) → alfa por **color** contra el fondo liso (`pnpm icons:volume -- key`). **NUNCA** `pnpm ai:image:rmbg` para esto: el matting rellena los calados (3 966 px en el bombillo) y deja semitransparentes las piezas sueltas. Un volumen que ya existe se toma de `@efeoncepro/axis-brand-assets` (`volumeIconUrl(glyph)`), nunca se regenera. Canon: [manual de la línea §14.1](../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#141-plastilina-en-volumen-d24-2026-09-27).
- **OpenAI requiere `OPENAI_API_KEY_SECRET_REF=greenhouse-openai-api-key` en CADA entorno** (local `.env.local`, Vercel staging/prod, workers). Sin ese ref el resolver no sabe de que secret sacar la key y todo flujo OpenAI devuelve "not configured". Runtime Rollout Completion Gate: confirmar la env var en Vercel antes de declarar operativo un flujo OpenAI en deployado.
- **Generacion de logo de organizacion con IA (TASK-999, desde 2026-06-09):** command server-only `generateOrganizationLogoDraft` (`src/lib/account-360/organization-logo-generation.ts`) → `POST /api/organizations/[id]/brand-assets/logo/generate`. Usa `gpt-image-2` fondo opaco, persiste como `organization_logo_draft` y reusa `attachOrganizationLogoAsset` (gate `organization.brand_asset` + fail-fast `is_operating_entity` ANTES de la llamada paga). **Excepcion canonizada al default de la skill** `greenhouse-ai-image-generator` ("nunca reproducir un trademark"): por decision explicita del operador, el prompt **recrea el logo real** del cliente desde el conocimiento del modelo (es aproximacion; el logo exacto va por upload/URL). NUNCA generar logos de operating-entity (Efeonce/legal). Fuente: ADR `GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md` Delta 2026-06-09.
- Fuente canonica: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

### Fal.ai — agregador de generación media (imagen/video/audio) — desde 2026-07-06

**Qué es:** Fal.ai es un **agregador de generación media por API** con más de 1.000 Model APIs para modelos
no-Google y utilidades. En el policy vigente, Gemini, Veo, Omni, Lyria, TTS/STT y Translation de Google se
consumen directamente por Google Cloud/Vertex, nunca por Fal. Fal ofrece Model Search API
(`GET https://api.fal.ai/v1/models`) con estado, OpenAPI y `enterprise_status`; un resultado de búsqueda no es
una allowlist. Queue: submit → status/result o webhook → cancel/recovery; el adapter Studio productivo es
separado de este helper Greenhouse.

**Cliente canónico:** `src/lib/ai/fal.ts` (scaffold 2026-07-06, hermano de `openai-image.ts`/`anthropic.ts`/`perplexity.ts`). Expone `isFalConfigured()` y `runFalModel({ model, input, pollTimeoutMs?, pollIntervalMs? })` — **model-agnostic** (pasas el slug fal, ej. `bytedance/seedance-2.0/mini/image-to-video`, + el input de ese modelo), hace **submit+poll a COMPLETED** y **NO lanza en HTTP-not-ok** (devuelve `ok:false` con `errorDetail` saneado, espejo de `runPerplexitySearch`).

- **NUNCA** instanciar un fetch/SDK paralelo a fal dentro de un módulo de dominio — extender `runFalModel`. Un consumer nuevo (image-generator provider `fal`, un futuro módulo de video/Media Foundry) compone encima del cliente, no lo duplica.
- **El secreto se resuelve solo server-side** vía `FAL_API_KEY` (env) o `FAL_API_KEY_SECRET_REF` (GCP Secret Manager). **NUNCA** hardcodear la key (shape `<id>:<secret>`) en repo, Vercel env directo, logs, tests ni docs. Secret canónico: `greenhouse-fal-api-key` (cuenta A); desde 2026-09-16 también `FAL_API_KEY_B` / `FAL_API_KEY_B_SECRET_REF` → `greenhouse-fal-api-key-b` (cuenta B, ver delta de dos cuentas).
- **Estado 2026-07-06: OPERATIVO — key persistida + generación real verificada end-to-end.** El secret `greenhouse-fal-api-key` existe en GCP Secret Manager (project `efeonce-group`, v1, round-trip 69 chars sin newline) y `FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key` está en `.env.local`. Verificación (Runtime Rollout Completion Gate): `runFalModel({ model: 'fal-ai/flux/schnell', … })` → `ok:true`, HTTP 200, `secretSource=secret_manager`, imagen real generada. (Antes del top-up daba 403 `Exhausted balance`; se resolvió al reflejarse los créditos comprados.) **Vercel NO tiene el ref** (out-of-band local; si se wirea a runtime cloud, agregar el ref en Vercel + `secretAccessor` a `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`). Key temporal, rotación pendiente por el operador (agregar nueva versión al mismo secret al rotar). Cliente aún NO wireado a ningún consumer.
- **Gotcha de queue URLs (bug real atrapado por el test e2e 2026-07-06):** para modelos con sub-path (`fal-ai/flux/schnell`), fal devuelve `status_url`/`response_url` apuntando al **app padre** (`fal-ai/flux/requests/...`), NO al slug completo. Reconstruir las polling URLs desde el slug da **HTTP 405**. `runFalModel` usa las URLs del submit response; **NUNCA** reconstruirlas a mano desde `model`.
- **Producción out-of-band, NO runtime** (misma regla que Higgsfield): generar acá + **subir el asset por el uploader canónico**; **NUNCA** cablear fal a un flujo runtime del producto — el entrypoint runtime de imagen sigue siendo `src/lib/ai/image-generator.ts` (OpenAI GPT Image / Gemini Image).
- **Dirección de arte por dominio:** video → skill `motion-design-studio`; audio → `audio-studio`; elección de modelo/estética → `design-studio`; still images de UI/marca → `greenhouse-ai-image-generator`. El cliente opera el modelo; las skills aportan brief/composición/QA.
- **Pricing público por-segundo en la página del modelo** (verificar en `fal.ai/models` antes de correr — es volátil): ej. Seedance 2.0 Standard ~US$0.3024/s a 720p (10s ≈US$3.02), Fast ~US$0.2419/s a 720p, Mini 480p ~US$0.0721/s (~US$0.36 los 5s). Audio incluido sin costo extra. El costo es lineal en duración, pero **fal cobra por escalón de resolución** y el precio que devuelve su API de pricing (el del registro) es el escalón más bajo: Wan 3.0 a 1080p (default del proveedor) cuesta 0,20/s, no 0,05; Wan 3.0 Prime 0,28/s (más cara que base); H3 base a 2K (default del proveedor) 0,13/s; Flux 3 publicado 0,17/s final, 0,06 draft y 0,41 extend (el doble de lo registrado). Seedance se presupuesta con `tokens = alto × ancho × segundos × 24 / 1024`. Tabla completa: catálogo §Precios por escalón de resolución.
- **CLI `pnpm ai:fal` (desde 2026-09-16):** carril de terminal sobre `runFalModel`, hermano de `pnpm ai:image` (fal tiene esquema de input por endpoint, no el contrato OpenAI). Resuelve capacidades del registro `src/lib/ai/fal-capabilities.ts` (`--capability`, ver `--list`) o cualquier slug con `--model` + `--input '<json>'`; sube archivos locales con `uploadFalFile`; valida duración/resolución/aspecto/bitrate/task de video **antes** de encolar; advierte ante capacidades con `verifiedAt: null`; no reporta costo real porque fal no devuelve `usage` (desde el commit `17196ead1` sí estima antes de encolar y pide `--yes` sobre el tope; ver delta de brechas corregidas). Contrato, capacidades y estado de verificación: catálogo §Carril operativo. Gemini Omni no pasa por fal.
- **Delta 2026-09-16 — Higgsfield API como segundo proveedor de `pnpm ai:fal`:** cliente canónico `src/lib/ai/higgsfield.ts` (hermano de `fal.ts`; **NUNCA** un fetch paralelo a `api.higgsfield.ai` en un dominio). Auth `Authorization: Key <id>:<secret>` (no Bearer); secreto `greenhouse-higgsfield-api-key` (`efeonce-group`, `secretAccessor` a `greenhouse-portal@` y `julio.reyes@`, igual que fal) vía `HIGGSFIELD_API_KEY_SECRET_REF`. Contrato: POST al endpoint → `request_id`/`status_url`/`cancel_url`; estados terminales `completed`/`failed`/`nsfw`/`canceled` (los tres últimos no cobran); **el POST de generación nunca se reintenta** (sin clave de idempotencia); el GET de estado sí, con espera creciente de 2 a 10 s. `POST /estimate/<endpoint>` valida y cotiza sin cobrar; 33 capacidades devuelven monto y 11 (Seedance 2.0/2.5, Wan 3.0) sólo fórmula, que `higgsfield-pricing.ts` convierte en cota antes de descuento. Errores del proveedor: tope de concurrencia = **400** (no 429), créditos insuficientes = **403 `not_enough_credits`**. El contrato de entrada NO se transcribe: `pnpm ai:higgsfield:sync-schemas` congela el JSON Schema del playground de la consola (43 endpoints; SOUL Cinema transcrito de su documentación). **Recraft por la API:** `output_format: svg` da 400; `model_type: vector|utility_vector` existe en la app de Higgsfield; la API no lo documenta y su estimación ignora campos desconocidos, así que **si la API entrega SVG está sin confirmar** hasta una generación real. Veo 3.1 y Sora 2 dan `model_not_found`, Nano Banana Pro `model_disabled`. Estado 2026-09-16: barrido `--estimate` 44/44 OK; **0 generaciones reales** (cuenta de API sin créditos). **2026-09-17:** con créditos cargados, `hf-zimage-turbo` completó la primera generación real (USD 0,015, request `52df8c09-…`); las 43 restantes siguen sin verificar en salida. Tests: `higgsfield.test.ts`, `higgsfield-input-rules.test.ts`.
- **Delta 2026-09-16 — Minimax H3 conectado:** 17 endpoints en el registro (9 verificados contra el API real, 7 sin verificar, 1 no operable). El registro suma el `kind: 'training'` (entrenadores de LoRA de H3, cobro por step, timeout por defecto 3 h) junto a `image` y `video`. `h3max-director` es un stream realtime, no un trabajo de cola: declara `unsupportedReason` y el CLI se niega a correrlo. Cambios transversales del CLI: imprime el `request_id` apenas fal encola; ante un timeout local (HTTP 408) el trabajo **sigue corriendo y cobrando** en fal y se retoma con `pnpm ai:fal --capability <id> --request-id <id>` sin reenviar ni volver a cobrar; la cola se direcciona por app (dos primeros segmentos del slug); `--task` sólo se acepta en Seedance 2.5 reference-to-video. Detalle: catálogo §Minimax H3.
- **Delta 2026-09-16 — Flux 3 conectado y contrato de Seedance video a video:** el registro suma 12 capacidades `flux3-*` (slugs `blackforestlabs/flux-3/…`, sin prefijo `fal-ai/`), todas verificadas con corridas reales. En fal, Flux 3 es un modelo de **video**, no de imagen. Agrega al CLI `--keyframe <imagen>@<frame_index>`, `--safety-tolerance` y `--draft-cache` (los drafts devuelven `draft_cache` y el CLI imprime el comando de `flux3-enhance`). `flux3-extend` exige pista de audio en el origen (el CLI lo revisa con `ffprobe` en archivos locales) y entrega sólo la continuación. Seedance: no hay endpoint video-to-video; el video a video vive en reference-to-video (`--task editing|extension` sólo en 2.5, con `--video` obligatorio; en 2.0 el video sólo guía); la duración mínima corregida es 4 s; se exige una imagen o video de referencia y se validan los topes. `seedance25-r2v` sigue sin corrida real (verificado después el mismo día, ver delta de verificación completa). Registro al conectar: 49 capacidades, 29 verificadas. Detalle: catálogo §Flux 3 y §Seedance video a video.
- **Delta 2026-09-16 — Wan 3.0 conectado; Kling 3 y Grok Imagine revisados sin conectar:** el registro suma 6 capacidades `wan3-*` y `wan3prime-*` (slugs `alibaba/wan-3.0{,-prime}/{text,image,reference}-to-video`, sin prefijo `fal-ai/`; USD 0,05/s ambas líneas según la API de pricing — **corregido el mismo día:** ese es el escalón de 480p; a 1080p base 0,20/s y Prime 0,28/s, ver catálogo §Precios por escalón de resolución). **Sólo `wan3-t2v` está verificado en real** (480p, `--duration auto` → 5,04 s, `--seed` respetado, `--no-prompt-expansion` → `actual_prompt: null`, video con audio); los otros 5 fallaron antes de encolar con 403 `Exhausted balance`. Cambios del CLI: `--duration auto` se envía como `null` en Wan 3.0 (el contrato de duración suma `autoValue`), el audio va por el campo `audio` (`audioField`), `--no-prompt-expansion`, `--thinking`, `--seed <n>` (general) y, sólo en referencias a video, `--web-url` / `--file` (ambos exigen `--thinking`). Referencias: hasta 10 imágenes, 5 videos y 5 audios. El default de resolución es **1080p**. Kling 3 (O3 y V3) y Grok Imagine (video v1.5, video base con edit/extend, imagen v2.0) se revisaron contra OpenAPI y pricing, sin conectar. Registro al conectar: 55 capacidades, 30 verificadas (ver delta siguiente: hoy 47). Contexto: ranking OpenArt Arena leído 2026-09-16 (Wan 3.0 segundo en video). Detalle: catálogo §Wan 3.0 y §Candidatos evaluados, no conectados.
- **~~Bloqueo operativo 2026-09-16 — saldo de fal agotado~~ (superado el mismo día):** la cuenta A quedó en saldo negativo (−3,86 USD) y fal respondía 403 `User is locked. Reason: Exhausted balance` antes de encolar. La recarga (USD 50) se hizo en otra cuenta (B) que el cliente no conocía; se resolvió con el delta siguiente. Recargar saldo sigue siendo tarea de una persona con acceso a la facturación de fal, nunca de un agente.
- **Delta 2026-09-16 — cliente fal con dos cuentas y failover:** `src/lib/ai/fal.ts` resuelve varias cuentas en orden declarado (`FAL_ACCOUNT_ENV_VARS`): `FAL_API_KEY` (secreto `greenhouse-fal-api-key`, cuenta A) y `FAL_API_KEY_B` (secreto `greenhouse-fal-api-key-b`, cuenta B, con los mismos `secretAccessor`: `greenhouse-portal@efeonce-group` y `julio.reyes@efeonce.org`). Local: `FAL_API_KEY_SECRET_REF` y `FAL_API_KEY_B_SECRET_REF` en `.env.local` (no están en `.env.example`). Sumar una cuenta = agregar su nombre a `FAL_ACCOUNT_ENV_VARS` + su `*_SECRET_REF`.
  - **Selección por proceso:** primero las cuentas con saldo positivo (mayor a menor), luego las demás en orden declarado. **Failover** sólo ante 403 `User is locked` (`Exhausted balance` o `TOP_UP`) al encolar o subir archivo: ese bloqueo ocurre antes de encolar y no cobra. Cualquier otro error no cambia de cuenta. `--fal-account` fuerza una cuenta sin failover.
  - **Un request vive en la cuenta que lo creó:** `--request-id` y `--status` lo buscan en esa cuenta. Cada corrida imprime `cuenta <NOMBRE>`, nunca la clave.
  - **API del cliente:** nuevas `FAL_ACCOUNT_ENV_VARS`, `FalAccountName`, `isFalBalanceLock`, `getFalAccountBalances`, `getFalRequestStatus`; `runFalModel({ account?, detach? })` y `awaitFalRequest({ account? })`; `FalModelResult.account` y `FalUploadResult.account`. Se eliminó `getFalBalance`. Tests: `src/lib/ai/fal.test.ts` (10).
  - **`pnpm ai:fal --balance`:** saldo USD de cada cuenta (`GET rest.alpha.fal.ai/billing/user_balance`, clave normal, sin costo). Si todas están bloqueadas, el CLI lo dice con sus saldos. Con la cuenta bloqueada, un POST vacío igual devuelve 422: validar un slug no prueba saldo. Saldos al cierre del 2026-09-16: A −3,86 · B 42,29.
  - **`--detach` / `--status` en vez de webhooks:** `--detach` encola, imprime `request_id`, cuenta y los comandos de estado y resultado, y termina; `--status --request-id <id>` consulta una vez (IN_QUEUE / IN_PROGRESS / COMPLETED + posición), sin costo. Verificado en real. Los webhooks de fal no se usan en el CLI (exigen URL pública); para producción desde el runtime, el camino sería un receptor sobre `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` con verificación de firma (no implementado). Espera por defecto: imagen 3 min · video 30 min (antes 15) · entrenamiento 3 h.
  - **Descartado consumo de otros runtimes:** la cuenta A usa la misma clave que Globe (`globe-fal-api-key`), pero no hubo llamadas a dominios fal desde ningún servidor en 7 días.
  - **⚠️ Pendiente de seguridad:** la clave B se compartió en una conversación. El operador debe rotarla en fal y publicar nueva versión: `printf %s "$VALOR" | gcloud secrets versions add greenhouse-fal-api-key-b --data-file=-`.
- **Delta 2026-09-16 — verificación completa del registro (cuenta B): 47 de 55.** Verificadas en real: Wan 3.0 y 3.0 Prime (las 6), Seedance 2.0 base i2v/r2v, Seedance 2.0 fast/mini/us (9) y Seedance 2.5 r2v en `reference`, `editing` y `extension`. Sin verificar: 3 variantes LoRA de H3 + 4 entrenadores (postergado por decisión del operador). No operable: `h3max-director`. **Costo real:** USD 7,71 por 17 corridas, incluidas 3 rechazadas por filtro que se cobraron; Seedance costó ~2× lo estimado con la equivalencia de tokens de OpenArt, que no sirve para presupuestar; **la fórmula de fal sí sirve** (`tokens = alto × ancho × segundos × 24 / 1024`, calza con lo medido dentro de ~5 %). **Filtro de Seedance (ByteDance):** rechaza después de encolar (422 `content_policy_violation`, `partner_validation_failed`) referencias con marcas (isotipo de Efeonce) o personas reales; para video a video con personas o marcas, usar Flux 3 edit/extend o Wan 3.0. *Corrección 2026-10-04:* fueron dos rechazos puntuales (isotipo y video de barista), no un filtro sistemático: las mascotas 3D de partner pasaron (2026-09-22) y el operador ha producido en fal videos con Seedance con personas y marcas reales sin problema [operador, 2026-10-04]; qué dispara el rechazo no está medido. Seedance sigue siendo candidato con personas y marcas, presupuestando el posible rechazo cobrado (prueba corta y a baja resolución antes del final) y con Flux 3 / Wan 3.0 como alternativa si rechaza (guía de selección v1.15). Detalle: catálogo §"Cuentas, saldo y operación del CLI (2026-09-16)".
- **Delta 2026-09-16 — brechas de `pnpm ai:fal` corregidas (commit `17196ead1`):** estimación de costo antes de encolar (`src/lib/ai/fal-pricing.ts`: Seedance por tokens con precio de la API de pricing, H3/Wan/Flux 3 por escalón publicado en `FAL_PRICING_RULES`, Seedream por área y referencia extra, layerize por capa sin total, entrenadores con mínimo de 100 steps); sobre el tope (USD 1, `FAL_COST_CONFIRM_USD` o `--max-usd`) exige `--yes`, y sin estimación posible avisa sin bloquear. En video, sin `--resolution` envía la resolución más barata del endpoint y lo avisa (antes heredaba Wan 1080p y H3 base 2K). Reglas puras en `src/lib/ai/fal-input-rules.ts`: formato real de Seedream Pro derivado de `--out` + detección por bytes con corrección de extensión, `--format` rechazado en Lite, `--seed` sólo en los 19 endpoints de `FAL_SEED_CAPABILITY_IDS`, tope de 10 `--image` en Seedream edit, `--lora <path>[@escala][#weight_name]`, `--frames` (`% 17 == 5`) y `--split-threshold` (1–60) validados también por `--input`. Siguen abiertos: `--size`/`--count` de imagen sin validar, número de capas de layerize, la mitad de precio que devuelve la API para Flux 3 y la vigencia de las tablas de escalones. Detalle: catálogo §Estimación de costo y validaciones del CLI.
- **Catálogo completo de modelos y capacidades:** `GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` — las 13 categorías (imagen, edición, upscale, bg-removal, video t2v/i2v/v2v, TTS, música/SFX, STT/voice, 3D, LLM, training) con slugs verificados 2026-07-06.

#### Carril Google: estado de Nano Banana Pro — revisión 2026-09-16

- **Qué usa hoy el producto:** el provider `google-gemini-image` de `src/lib/ai/image-generator.ts` llama por Vertex (`getGoogleGenAIClient`) a `gemini-3.1-flash-image` = **Nano Banana 2**, como default que la env `GOOGLE_GEMINI_IMAGE_MODEL` puede sobrescribir. El provider por defecto de `generateImage()` sigue siendo `openai-image`.
- **No hay CLI de Gemini Image:** `pnpm ai:image` habla sólo OpenAI. Nano Banana 2 sólo se alcanza por el helper del producto.
- **Nano Banana Pro no está conectado en ninguna superficie.** Disponibilidad medida el 2026-09-16 con `models.get` contra nuestro proyecto Vertex (location `global`): `gemini-3-pro-image` OK, `gemini-3-pro-image-preview` OK, `gemini-3.1-flash-image` OK, `gemini-3.1-pro-image` 404 (no existe).
- **No cambiar la env global para probarlo:** `GOOGLE_GEMINI_IMAGE_MODEL` gobierna todo el carril `google-gemini-image`; cambiarla a `gemini-3-pro-image` cambiaría el modelo de todos los consumidores de ese provider. Lo correcto, si se decide usarlo, es exponerlo como modelo elegible por pedido. No está hecho: queda a decisión del operador.
- **Nunca por fal:** aunque fal lista `fal-ai/nano-banana-pro` (y Gemini Omni Flash), la decisión del operador del 2026-09-16 es operar Nano Banana Pro y Omni Flash directo por Google (más barato, misma calidad).

#### Produccion still hibrida Seedream 5 + GPT Image 2 — desde 2026-07-18

- Es un **workflow operativo out-of-band**, no un provider nuevo del runtime de Greenhouse. No cambia `generateImage()` ni habilita generacion para usuarios.
- La topologia canonica es estrella: un anchor aprobado alimenta derivados por mensaje/formato. Nunca usar una pieza derivada como origen de la siguiente por conveniencia.
- Seedream 5 Lite (`bytedance/seedream/v5/lite/{text-to-image|edit}`, sin prefijo `fal-ai/`) se usa para divergencia; Seedream 5 Pro (`bytedance/seedream/v5/pro/{text-to-image|edit}`) para materialidad, atmosfera y desarrollo; GPT Image 2 para estructura, reparacion localizada y adaptacion. Texto/logo/legal quedan en composicion determinista.
- El relevo entre motores usa el contrato `.codex/skills/design-studio/templates/model-handoff-contract.yaml`, con referencia, regiones editables, invariantes, safe zones, criterio de aceptacion y executor destino.
- Un archivo local que deba entrar a Fal se transfiere con `uploadFalFile` (storage de fal: initiate → `PUT` → `file_url`; `pnpm ai:fal` lo hace solo). No hacer un objeto GCS publico, no ensanchar IAM y no guardar la URL efimera en provenance.
- El metodo, endpoints, schemas, pricing verificado, formatos, benchmark y anti-patrones viven en `.codex/skills/greenhouse-ai-image-generator/references/seedream-5-gpt-image-2-hybrid-production.md` y `.codex/skills/design-studio/modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md`.

### AI providers — texto/LLM (Gemini, Anthropic, OpenAI) — desde 2026-06-05

Los providers de IA conviven en `src/lib/ai/`. **NUNCA** crear un cliente/SDK paralelo dentro de un módulo de dominio: extender el cliente canónico de `src/lib/ai/`.

- **Gemini / Vertex** (path de texto canónico): `src/lib/ai/google-genai.ts` (`getGoogleGenAIClient`, `@google/genai` vía Vertex/ADC) + `src/lib/ai/greenhouse-agent.ts`. Modelos en `src/config/nexa-models.ts` (shape de id `provider/model@version`, ej. `google/gemini-2.5-flash@default`). Lo usa Nexa + el AI Observer (`src/lib/reliability/ai/runner.ts`).
- **OpenAI** (imágenes): `src/lib/ai/openai-image.ts`, secret `greenhouse-openai-api-key` (`OPENAI_API_KEY_SECRET_REF`).
- **Anthropic / Claude** (drafting de documentos HR/legal — Workforce Contracting Studio, TASK-1019): secret canónico **`greenhouse-anthropic-api-key`** en GCP Secret Manager (project `efeonce-group`, creado 2026-06-05), ref `ANTHROPIC_API_KEY_SECRET_REF=greenhouse-anthropic-api-key`. El cliente canónico **debe vivir en `src/lib/ai/anthropic.ts`** (lo crea TASK-1019 Slice 3, consumido por `src/lib/workforce/contracting/` detrás del flag `WORKFORCE_CONTRACTING_AI_ENABLED=false`). Modelos Anthropic se agregan al shape `anthropic/claude-*@default`. **NUNCA** hardcodear `sk-ant-*` en repo, Vercel env directo, logs, tests ni docs; resolver server-side vía `resolveSecretByRef`. NO instanciar el SDK Anthropic dentro de un módulo de dominio.

**⚠️ Reglas duras (canonical secret resolution, arch-architect verdict 2026-05-10)**:

- **NUNCA** componer `projects/{id}/secrets/{name}/versions/{ver}` inline en TS/JS. Toda resolución pasa por `resolveSecret()` / `resolveSecretByRef()` / `getCachedResolvedSecret()` en `src/lib/secrets/secret-manager.ts`. Inline composition es la causa raíz del bug class detectado en run 25634673015 (path inválido `<name>:latest/versions/latest` por doble suffix).
- **NUNCA** duplicar `normalizeSecretRef` ni `normalizeSecretRefValue` en scripts. `scripts/` puede importar directo del canónico — el archivo canónico NO tiene `import 'server-only'`, sin shim. Mirror duplicado se desincroniza inevitablemente (caso real: `scripts/pg-doctor.ts` consolidado a canónico 2026-05-10 después de detectar bug por mirror divergente).
- **SIEMPRE** soportar tres formas de `*_SECRET_REF` en consumers (el normalizador canónico las acepta):
  - `<name>` (bare, default `latest`)
  - `<name>:<version>` (shorthand Vercel display + gcloud convention)
  - `projects/.../versions/<version>` (full path)
- **PREFERIR** la forma bare `<name>` en workflows YAML committeados. La shorthand `<name>:latest` es para humanos copiando del UI Vercel/gcloud — no para configuración estática (defense-in-depth: no normalizar garbage si no hace falta).

**⚠️ Reglas duras V2 (TASK-870 — normalizer hardening + active drift detection 2026-05-12)**:

- **NUNCA** registrar un env var `*_SECRET_REF` desde shell usando `echo "valor" | vercel env add` ni equivalentes que appendean newline. Usar siempre `printf %s "<valor>" | vercel env add <NAME> production --force` para escritura atómica sin newline trailing (`--force` overwrite es atomic; rm+add tiene gap-window).
- **NUNCA** duplicar la lógica `stripEnvVarContamination` ni `SECRET_REF_SHAPE` regex en scripts/consumers. Toda higiene de env var values pasa por `normalizeSecretValue` / `normalizeSecretRefValue` en `src/lib/secrets/secret-manager.ts`. Para auditores externos, usar el predicate `isCanonicalSecretRefShape(value)` exportado del mismo módulo.
- **NUNCA** loggear el VALOR sanitizado de un `*_SECRET_REF` rechazado por shape validation (puede contener PII, tokens, leak info). Solo length + first/last char class si se requiere observability local. El reliability signal `secrets.env_ref_format_drift` reporta NOMBRES de env vars afectadas, no valores.
- **NUNCA** swallow Sentry capture en code paths donde `resolveSecretByRef` retornó null. Diferenciar:
  - `resolveSecretByRef` → null = **ref env var corrupto o secret no existe**. Degradar silente a fallback (PAT / cache / unconfigured). NO capturar a Sentry — el reliability signal `secrets.env_ref_format_drift` ya cubre detección upstream.
  - Secret resuelto pero CONTENIDO inválido (e.g. PEM sin `-----BEGIN`) = **falla real de configuración del secret content**. Throw + `captureWithDomain('<domain>', ...)` legítimo, requiere intervención humana.
- **SIEMPRE** que emerja un consumer nuevo de `resolveSecretByRef`, aplicar el patrón canónico de TASK-870: validar return value, diferenciar "ref corruption" (silent degrade) de "content corruption" (Sentry alert). Patrón fuente: `src/lib/release/github-app-token-resolver.ts` (líneas 174-195).
- **Reliability signal canónico** `secrets.env_ref_format_drift` (kind=drift, severity=error si count>0, subsystem `cloud`, steady=0). Detecta env vars `*_SECRET_REF` cuyo valor falla `isCanonicalSecretRefShape` post-strip. Cuando alerta: re-set la env var ofensora con `printf %s "<clean-value>" | vercel env add <NAME> production --force` + redeploy.
- **Bug class canonizada (2026-05-12)**: `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` quedó persistida en Vercel production como `"greenhouse-github-app-private-key\n"` (bytes hex `... 6b 65 79 5c 6e 22`). El normalizer legacy NO stripaba quotes envolventes (solo `\n`/`\r` literales + `.trim()`) → resource name resultante con quotes embebidos → GCP NOT_FOUND silencioso → `resolveGithubAppInstallationToken` lanzaba "is not valid PEM" + `captureWithDomain` cada ~3min → preflight check `sentry_critical_issues` bloqueaba production release orchestrator. Fix V2: `stripEnvVarContamination` single-source-of-truth + `SECRET_REF_SHAPE` regex en boundary + signal `secrets.env_ref_format_drift` upstream + resolver `github-app-token` diferencia ref/content corruption.
