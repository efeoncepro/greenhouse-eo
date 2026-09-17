# Greenhouse AI Visual Asset Generator V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.11
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-09-17 por Claude (1.11: `pnpm ai:image:rmbg` rellena por defecto los huecos internos del matting; `--no-fill-holes`. Antes, 1.10: carril Higgsfield API dentro de `pnpm ai:fal` — cliente canónico `src/lib/ai/higgsfield.ts`, 44 capacidades con JSON Schema real, precio exacto por API, secreto `greenhouse-higgsfield-api-key`; Recraft de la API: SVG sin confirmar. Antes, 1.9: brechas de `pnpm ai:image` y `pnpm ai:fal` corregidas en el commit `17196ead1` — estimación de costo previa, confirmación con tope en `ai:fal`, resolución barata por defecto, validaciones locales y `--format`. Antes: guía canónica de selección de modelos enlazada; GPT Image 2.5: costo estimable antes de gastar con la fórmula oficial, rate limits publicados, OpenAI recomienda 2.5 para integraciones nuevas, equivalencias de tokens con GPT Image 2; rankings externos contradictorios con fecha; correcciones de precio por resolución en fal. Antes: cliente fal con dos cuentas: selección por saldo, failover ante bloqueo por saldo, secreto `greenhouse-fal-api-key-b`, `--balance`, `--detach`/`--status`; verificación completa del registro: 47 de 55; costo real medido y filtro de contenido de Seedance; rotación de la clave B pendiente; antes, Wan 3.0 y Wan 3.0 Prime conectados a `pnpm ai:fal`: 6 endpoints; estado real de Nano Banana Pro en el carril Google; Kling 3 y Grok Imagine revisados sin conectar; antes, Flux 3 conectado a `pnpm ai:fal`: 12 endpoints de video verificados, draft → enhance, edit y extend; contrato real de Seedance video a video; antes, Minimax H3 conectado a `pnpm ai:fal`: kind `training`, retome por `request_id`, director no operable; antes, carril out-of-band `pnpm ai:fal`: Seedream 5 + layerize y Seedance 2.5/2.0; antes, TASK-1851 — familia GPT Image 2.5 transportada, carril Google migrado a Gemini Image)
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
espacio dentro del arco de unos audífonos) y queda transparente. Corre en un **proceso aparte**
(`scripts/ai/fill-alpha-holes-cli.ts`, lógica pura en `scripts/ai/fill-alpha-holes.ts`) porque
`@imgly/background-removal-node` trae su propio sharp/libvips anidado y dos libvips en un proceso advierten fallas
espurias. `--no-fill-holes` lo desactiva; la salida imprime `huecos internos rellenados=<px>/<componentes>`. Prueba:
`scripts/ai/fill-alpha-holes.test.ts`. Caso fuente: el `_` del emblema `>_` de Codex («saludo», biblioteca de poses 3D
del 2026-09-17) salió transparente y sobre navy se veía un rectángulo oscuro.

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
- **Vectores para implementacion de UI vía Higgsfield CLI + Recraft V4.1 (desde 2026-06-09):** la CLI `higgsfield` (binario en `~/.local/bin`, alias `hf`, cuenta `mkt@efeoncepro.com` plan Ultra, autenticada via `higgsfield auth login`) + el MCP Higgsfield exponen **Recraft V4.1** (`job_set_type: recraft_v4_1`) con `--model_type vector` → **salida vectorial real**, justo el hueco que `gpt-image` (raster-only) deja abierto. Es la herramienta para **producir assets vectoriales de UI/marca** (iconos, logos, ilustraciones de design-system, empty states) con **paleta controlada** (`--colors`, p.ej. pinear tonos AXIS) + `--background_color`, `--aspect_ratio`, `--resolution {1k,2k}`. Comando canonico: `higgsfield generate create recraft_v4_1 --prompt "…" --model_type vector --aspect_ratio 1:1 --resolution 2k --wait`. **Caveats duros:** (1) Higgsfield es **producción de assets out-of-band** (se generan acá y se SUBEN al portal vía el uploader canonico), **NO** el path runtime — el entrypoint runtime canonico sigue siendo `src/lib/ai/image-generator.ts` (OpenAI GPT Image / Gemini Image); NUNCA cablear Higgsfield a un flujo runtime del producto. (2) Las skills (`higgsfield-generate`, `-product-photoshoot`, `-soul-id`, `-marketplace-cards`) aportan el craft (modelo correcto por tarea, modos, art direction); usarlas. (3) Verificar el **formato del archivo entregado (SVG)** en el primer uso real antes de asumirlo. (4) Aplica el contrato visual Greenhouse igual (tokens AXIS, no inventar hex) + revisar el asset producido con las skills de diseño antes de integrarlo.
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
- **Delta 2026-09-16 — Higgsfield API como segundo proveedor de `pnpm ai:fal`:** cliente canónico `src/lib/ai/higgsfield.ts` (hermano de `fal.ts`; **NUNCA** un fetch paralelo a `api.higgsfield.ai` en un dominio). Auth `Authorization: Key <id>:<secret>` (no Bearer); secreto `greenhouse-higgsfield-api-key` (`efeonce-group`, `secretAccessor` a `greenhouse-portal@` y `julio.reyes@`, igual que fal) vía `HIGGSFIELD_API_KEY_SECRET_REF`. Contrato: POST al endpoint → `request_id`/`status_url`/`cancel_url`; estados terminales `completed`/`failed`/`nsfw`/`canceled` (los tres últimos no cobran); **el POST de generación nunca se reintenta** (sin clave de idempotencia); el GET de estado sí, con espera creciente de 2 a 10 s. `POST /estimate/<endpoint>` valida y cotiza sin cobrar; 33 capacidades devuelven monto y 11 (Seedance 2.0/2.5, Wan 3.0) sólo fórmula, que `higgsfield-pricing.ts` convierte en cota antes de descuento. Errores del proveedor: tope de concurrencia = **400** (no 429), créditos insuficientes = **403 `not_enough_credits`**. El contrato de entrada NO se transcribe: `pnpm ai:higgsfield:sync-schemas` congela el JSON Schema del playground de la consola (43 endpoints; SOUL Cinema transcrito de su documentación). **Recraft por la API:** `output_format: svg` da 400; `model_type: vector|utility_vector` existe en la app de Higgsfield; la API no lo documenta y su estimación ignora campos desconocidos, así que **si la API entrega SVG está sin confirmar** hasta una generación real. Veo 3.1 y Sora 2 dan `model_not_found`, Nano Banana Pro `model_disabled`. Estado 2026-09-16: barrido `--estimate` 44/44 OK; **0 generaciones reales** (cuenta de API sin créditos). Tests: `higgsfield.test.ts`, `higgsfield-input-rules.test.ts`.
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
- **Delta 2026-09-16 — verificación completa del registro (cuenta B): 47 de 55.** Verificadas en real: Wan 3.0 y 3.0 Prime (las 6), Seedance 2.0 base i2v/r2v, Seedance 2.0 fast/mini/us (9) y Seedance 2.5 r2v en `reference`, `editing` y `extension`. Sin verificar: 3 variantes LoRA de H3 + 4 entrenadores (postergado por decisión del operador). No operable: `h3max-director`. **Costo real:** USD 7,71 por 17 corridas, incluidas 3 rechazadas por filtro que se cobraron; Seedance costó ~2× lo estimado con la equivalencia de tokens de OpenArt, que no sirve para presupuestar; **la fórmula de fal sí sirve** (`tokens = alto × ancho × segundos × 24 / 1024`, calza con lo medido dentro de ~5 %). **Filtro de Seedance (ByteDance):** rechaza después de encolar (422 `content_policy_violation`, `partner_validation_failed`) referencias con marcas (isotipo de Efeonce) o personas reales; para video a video con personas o marcas, usar Flux 3 edit/extend o Wan 3.0. Detalle: catálogo §"Cuentas, saldo y operación del CLI (2026-09-16)".
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
