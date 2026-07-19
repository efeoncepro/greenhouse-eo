# Greenhouse AI Visual Asset Generator V1

> **Tipo de documento:** Spec de arquitectura
> **Version:** 1.1
> **Creado:** 2026-04-07 por Claude (TASK-278)
> **Ultima actualizacion:** 2026-07-18
> **Task:** TASK-278 — AI Visual Asset Generator

---

## Purpose

Define el contrato, arquitectura y reglas del **AI Visual Asset Generator** — un modulo interno de toolchain que permite al agente AI generar assets visuales on-demand durante el desarrollo de interfaces: imagenes rasterizadas (banners, ilustraciones, fondos) via **Imagen 4** o **OpenAI GPT Image** y animaciones SVG con CSS keyframes via **Gemini**.

No es un feature para usuarios finales. Es infraestructura de productividad del agente.

## Architecture

```
Agent (Claude) durante desarrollo de UI
    |
    v
[generateImage(prompt, options)]     o     [generateAnimation(prompt, options)]
    |                                            |
    v                                            v
[Imagen 4 via Vertex AI]              [Gemini via Vertex AI]
    o
[OpenAI GPT Image via Image API]
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
| Imagenes rasterizadas default | Imagen 4 | `imagen-4.0-generate-001` (configurable via `IMAGEN_MODEL`) | PNG/WebP | Banners, ilustraciones, fondos, thumbnails |
| Imagenes rasterizadas opt-in | OpenAI GPT Image | `gpt-image-2` (configurable via `OPENAI_IMAGE_MODEL`) | PNG/WebP/JPEG | Assets de mayor fidelidad, composicion y adherencia a prompts |
| Imagenes PNG transparentes | OpenAI GPT Image | `gpt-image-1.5` fallback automatico cuando `background='transparent'` | PNG transparente | Batches de assets recortables, stickers, overlays, iconografia raster |
| Animaciones SVG | Gemini | Resuelto via `resolveNexaModel()` | SVG con CSS keyframes | Loading spinners, iconos animados, empty states, micro-interacciones |
| Produccion still hibrida out-of-band | Fal Seedream 5 Lite/Pro + OpenAI GPT Image 2 | Slugs verificados en el catalogo Fal y adapter OpenAI server-only | PNG/JPEG de trabajo; export gobernado posterior | Campanas multi-formato: exploracion/materialidad en Seedream, estructura/reparacion/adaptacion en GPT |

## Files

| File | Purpose |
|------|---------|
| `src/lib/ai/image-generator.ts` | Helper con `generateImage()` + `generateAnimation()` |
| `src/lib/ai/openai-image.ts` | Adapter server-only para OpenAI Image API |
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
  provider: 'openai-image', // optional; default env/default is google-imagen
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

Para batches grandes de PNG transparente, usar `generateOpenAIImage()` / `editOpenAIImage()` con `background: 'transparent'`. El helper detecta que `gpt-image-2` no soporta transparencia y usa automaticamente `gpt-image-1.5`, dejando `requestedModel` y `modelFallbackReason` en el resultado. Si un flujo prefiere fallar en vez de degradar modelo, pasar `transparentBackgroundStrategy: 'throw'`.

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
- Provider OpenAI es opt-in via `GREENHOUSE_IMAGE_PROVIDER=openai-image` o `options.provider='openai-image'`; el default conserva Imagen para no romper flujos existentes
- PNG transparente: `gpt-image-2` no soporta `background='transparent'`; el helper aplica fallback seguro a `gpt-image-1.5` por default y registra el motivo
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

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` — stack UI, animaciones, Lottie
- `docs/tasks/to-do/TASK-278-ai-visual-asset-generator.md` — task spec
- `src/hooks/useReducedMotion.ts` — hook para respetar prefers-reduced-motion
- `src/libs/Lottie.tsx` — wrapper Lottie existente (para JSON animations)

## Future

- Image editing / inpainting: modificar imagenes existentes con mascaras
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
- `generateImage()` soporta providers `google-imagen` y `openai-image`; no llamar APIs de imagen desde scripts paralelos si el helper cubre el caso.
- **CLI canonica de generacion `pnpm ai:image` (gpt-image-2, desde 2026-06-10):** wrapper operativo del fn canonico `generateOpenAIImage` (`src/lib/ai/openai-image.ts`) para generar imagenes desde la terminal — conceptos del `product-design-loop`, fixtures de mockup, batches de iconos/assets. **NO crear scripts de generacion ad-hoc** (`scripts/_gen-*.ts`): usar esta CLI. Self-contained (carga `.env.local` solo; resuelve `OPENAI_API_KEY_SECRET_REF` server-side, nunca imprime el secreto). Default `gpt-image-2 · 1536x1024 · quality high · opaque · out-dir public/images/generated`. Timeout default **280s** (gpt-image-2 `high` supera los 125s del helper runtime `generateImage`, que NO pasa-through `timeoutMs` — por eso la CLI usa el fn de bajo nivel). Uso: `pnpm ai:image --prompt "<texto>" [--out <path>] [--size 1024x1024|1536x1024|1024x1536|2048x...] [--quality low|medium|high|auto] [--background opaque|transparent] [--model gpt-image-2] [--count N] [--timeout ms] [--open]`; `--prompt-file <path>` (prompts largos); `--batch <json>` (`[{ filename, prompt }, …]`, varios). `--background transparent` cae a `gpt-image-1.5` (gpt-image-2 no soporta alpha). **Sigue siendo raster** (PNG/WebP) — para vectores reales, Higgsfield + Recraft V4.1 (abajo). Para assets repo-bound que el runtime sirve, preferir el helper `generateImage()`; la CLI es para generacion operada por agente/operador. **Direccion de arte = invocar la skill `greenhouse-ai-image-generator`** (la CLI opera el modelo; la skill aporta brief/composicion/QA).
- `GREENHOUSE_IMAGE_PROVIDER` controla el default runtime, pero cada llamada puede pasar `provider`.
- OpenAI usa `src/lib/ai/openai-image.ts` y resuelve la key solo server-side con `OPENAI_API_KEY` / `OPENAI_API_KEY_SECRET_REF`; el secreto canonico es `greenhouse-openai-api-key` en GCP Secret Manager. Nunca hardcodear `sk-*` en repo, Vercel env directo, logs, tests ni docs.
- Para PNG transparente, pedir `format: 'png'` + `background: 'transparent'`; `gpt-image-2` no soporta transparencia y el helper aplica fallback seguro a `gpt-image-1.5`, dejando `requestedModel` y `modelFallbackReason`.
- Modos OpenAI disponibles: `generateOpenAIImage()` para text-to-image, `editOpenAIImage()` para imagenes de referencia/mascara, y `runOpenAIImageTool()` para Responses API multi-turn con `image_generation`.
- **`gpt-image-*` es RASTER** (PNG/WebP/JPEG) — **NO genera SVG**. Si se necesita vector, vectorizar el raster como paso aparte (no hay helper canonico de vectorizacion hoy) o aceptar un SVG real via upload (el uploader hoy acepta PNG/JPG/WebP, no SVG).
- **Vectores para implementacion de UI vía Higgsfield CLI + Recraft V4.1 (desde 2026-06-09):** la CLI `higgsfield` (binario en `~/.local/bin`, alias `hf`, cuenta `mkt@efeoncepro.com` plan Ultra, autenticada via `higgsfield auth login`) + el MCP Higgsfield exponen **Recraft V4.1** (`job_set_type: recraft_v4_1`) con `--model_type vector` → **salida vectorial real**, justo el hueco que `gpt-image` (raster-only) deja abierto. Es la herramienta para **producir assets vectoriales de UI/marca** (iconos, logos, ilustraciones de design-system, empty states) con **paleta controlada** (`--colors`, p.ej. pinear tonos AXIS) + `--background_color`, `--aspect_ratio`, `--resolution {1k,2k}`. Comando canonico: `higgsfield generate create recraft_v4_1 --prompt "…" --model_type vector --aspect_ratio 1:1 --resolution 2k --wait`. **Caveats duros:** (1) Higgsfield es **producción de assets out-of-band** (se generan acá y se SUBEN al portal vía el uploader canonico), **NO** el path runtime — el entrypoint runtime canonico sigue siendo `src/lib/ai/image-generator.ts` (OpenAI/Imagen); NUNCA cablear Higgsfield a un flujo runtime del producto. (2) Las skills (`higgsfield-generate`, `-product-photoshoot`, `-soul-id`, `-marketplace-cards`) aportan el craft (modelo correcto por tarea, modos, art direction); usarlas. (3) Verificar el **formato del archivo entregado (SVG)** en el primer uso real antes de asumirlo. (4) Aplica el contrato visual Greenhouse igual (tokens AXIS, no inventar hex) + revisar el asset producido con las skills de diseño antes de integrarlo.
- **OpenAI requiere `OPENAI_API_KEY_SECRET_REF=greenhouse-openai-api-key` en CADA entorno** (local `.env.local`, Vercel staging/prod, workers). Sin ese ref el resolver no sabe de que secret sacar la key y todo flujo OpenAI devuelve "not configured". Runtime Rollout Completion Gate: confirmar la env var en Vercel antes de declarar operativo un flujo OpenAI en deployado.
- **Generacion de logo de organizacion con IA (TASK-999, desde 2026-06-09):** command server-only `generateOrganizationLogoDraft` (`src/lib/account-360/organization-logo-generation.ts`) → `POST /api/organizations/[id]/brand-assets/logo/generate`. Usa `gpt-image-2` fondo opaco, persiste como `organization_logo_draft` y reusa `attachOrganizationLogoAsset` (gate `organization.brand_asset` + fail-fast `is_operating_entity` ANTES de la llamada paga). **Excepcion canonizada al default de la skill** `greenhouse-ai-image-generator` ("nunca reproducir un trademark"): por decision explicita del operador, el prompt **recrea el logo real** del cliente desde el conocimiento del modelo (es aproximacion; el logo exacto va por upload/URL). NUNCA generar logos de operating-entity (Efeonce/legal). Fuente: ADR `GREENHOUSE_ORGANIZATION_BRAND_ASSET_DECISION_V1.md` Delta 2026-06-09.
- Fuente canonica: `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md`.

### Fal.ai — agregador de generación media (imagen/video/audio) — desde 2026-07-06

**Qué es:** Fal.ai es un **agregador de generación media por API** — una sola API frontea muchos modelos: **video** (Seedance 2.0 std/fast/mini + reference, Kling v3 pro/standard, PixVerse V6, Grok Imagine, Google Gemini Omni Flash; y las familias establecidas Veo, Runway, Luma Ray, Minimax Hailuo, Alibaba Wan, Hunyuan, LTX, Vidu, Pika), **imagen** (flux, krea), **audio** y **3D**. Patrón de queue: submit → poll status → fetch result. Auth `Authorization: Key <key_id>:<key_secret>`. No hay endpoint de "listar modelos": el catálogo vive en `https://fal.ai/models` (verificar el slug exacto en la página del modelo antes de llamar).

**Cliente canónico:** `src/lib/ai/fal.ts` (scaffold 2026-07-06, hermano de `openai-image.ts`/`anthropic.ts`/`perplexity.ts`). Expone `isFalConfigured()` y `runFalModel({ model, input, pollTimeoutMs?, pollIntervalMs? })` — **model-agnostic** (pasás el slug fal, ej. `bytedance/seedance-2.0/mini/image-to-video`, + el input de ese modelo), hace **submit+poll a COMPLETED** y **NO lanza en HTTP-not-ok** (devuelve `ok:false` con `errorDetail` saneado, espejo de `runPerplexitySearch`).

- **NUNCA** instanciar un fetch/SDK paralelo a fal dentro de un módulo de dominio — extender `runFalModel`. Un consumer nuevo (image-generator provider `fal`, un futuro módulo de video/Media Foundry) compone encima del cliente, no lo duplica.
- **El secreto se resuelve solo server-side** vía `FAL_API_KEY` (env) o `FAL_API_KEY_SECRET_REF` (GCP Secret Manager). **NUNCA** hardcodear la key (shape `<id>:<secret>`) en repo, Vercel env directo, logs, tests ni docs. Secret canónico: `greenhouse-fal-api-key`.
- **Estado 2026-07-06: OPERATIVO — key persistida + generación real verificada end-to-end.** El secret `greenhouse-fal-api-key` existe en GCP Secret Manager (project `efeonce-group`, v1, round-trip 69 chars sin newline) y `FAL_API_KEY_SECRET_REF=greenhouse-fal-api-key` está en `.env.local`. Verificación (Runtime Rollout Completion Gate): `runFalModel({ model: 'fal-ai/flux/schnell', … })` → `ok:true`, HTTP 200, `secretSource=secret_manager`, imagen real generada. (Antes del top-up daba 403 `Exhausted balance`; se resolvió al reflejarse los créditos comprados.) **Vercel NO tiene el ref** (out-of-band local; si se wirea a runtime cloud, agregar el ref en Vercel + `secretAccessor` a `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`). Key temporal, rotación pendiente por el operador (agregar nueva versión al mismo secret al rotar). Cliente aún NO wireado a ningún consumer.
- **Gotcha de queue URLs (bug real atrapado por el test e2e 2026-07-06):** para modelos con sub-path (`fal-ai/flux/schnell`), fal devuelve `status_url`/`response_url` apuntando al **app padre** (`fal-ai/flux/requests/...`), NO al slug completo. Reconstruir las polling URLs desde el slug da **HTTP 405**. `runFalModel` usa las URLs del submit response; **NUNCA** reconstruirlas a mano desde `model`.
- **Producción out-of-band, NO runtime** (misma regla que Higgsfield): generar acá + **subir el asset por el uploader canónico**; **NUNCA** cablear fal a un flujo runtime del producto — el entrypoint runtime de imagen sigue siendo `src/lib/ai/image-generator.ts` (OpenAI/Imagen).
- **Dirección de arte por dominio:** video → skill `motion-design-studio`; audio → `audio-studio`; elección de modelo/estética → `design-studio`; still images de UI/marca → `greenhouse-ai-image-generator`. El cliente opera el modelo; las skills aportan brief/composición/QA.
- **Pricing público por-segundo en la página del modelo** (verificar en `fal.ai/models` antes de correr — es volátil): ej. Seedance 2.0 Standard ~US$0.3024/s (10s ≈US$3.02, hasta 1080p), Fast ~US$0.2419/s (hasta 720p), Mini 480p ~US$0.0721/s (~US$0.36 los 5s). Audio incluido sin costo extra. El costo es lineal (`$/s × duración`); resolución y duración lo suben proporcionalmente.
- **Catálogo completo de modelos y capacidades:** `GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md` — las 13 categorías (imagen, edición, upscale, bg-removal, video t2v/i2v/v2v, TTS, música/SFX, STT/voice, 3D, LLM, training) con slugs verificados 2026-07-06.

#### Produccion still hibrida Seedream 5 + GPT Image 2 — desde 2026-07-18

- Es un **workflow operativo out-of-band**, no un provider nuevo del runtime de Greenhouse. No cambia `generateImage()` ni habilita generacion para usuarios.
- La topologia canonica es estrella: un anchor aprobado alimenta derivados por mensaje/formato. Nunca usar una pieza derivada como origen de la siguiente por conveniencia.
- Seedream 5 Lite (`fal-ai/bytedance/seedream/v5/lite/{text-to-image|edit}`) se usa para divergencia; Seedream 5 Pro (`fal-ai/bytedance/seedream/v5/pro/{text-to-image|edit}`) para materialidad, atmosfera y desarrollo; GPT Image 2 para estructura, reparacion localizada y adaptacion. Texto/logo/legal quedan en composicion determinista.
- El relevo entre motores usa el contrato `.codex/skills/design-studio/templates/model-handoff-contract.yaml`, con referencia, regiones editables, invariantes, safe zones, criterio de aceptacion y executor destino.
- Un archivo local que deba entrar a Fal se transfiere mediante upload temporal `fal-cdn-v3` con expiracion corta. No hacer un objeto GCS publico, no ensanchar IAM y no guardar la URL efimera en provenance.
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
